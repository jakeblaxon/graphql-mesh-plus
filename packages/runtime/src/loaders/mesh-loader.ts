import { stitchSchemas } from "@graphql-tools/stitch";
import { PluginLoader } from "./plugin-loader";
import {
  Mesh,
  MergerPlugin,
  PluginConfig,
  TransformPlugin,
  HandlerPlugin,
  PluginKind,
  MeshOrSchema,
  MeshContextBuilder,
  MeshConfig,
} from "../types";
import { isSchema } from "graphql";

export function getMesh(
  config: MeshConfig,
  pluginLoader?: PluginLoader
): Promise<Mesh> {
  const meshLoader = new MeshLoader(config, pluginLoader);
  return meshLoader.loadMesh();
}
class MeshLoader {
  private pluginLoader: PluginLoader;

  constructor(private config: MeshConfig, pluginLoader?: PluginLoader) {
    const pluginMap = new Map<string, string>();
    (config.plugins || []).forEach((pluginConfig) => {
      const pluginName = Object.keys(pluginConfig)[0];
      const pluginPath = Object.values(pluginConfig)[0];
      pluginMap.set(pluginName, pluginPath);
    });
    this.pluginLoader = pluginLoader || new PluginLoader(pluginMap);
  }

  async loadMesh() {
    const meshSources = await Promise.all(
      this.config.mesh.sources.map(
        async (sourceConfig) => await this.getSourceMesh(sourceConfig)
      )
    );
    const mergedMesh = await this.getMergedMesh(meshSources);
    return this.applyTransforms(mergedMesh);
  }

  async getSourceMesh(sourceConfig: MeshConfig["mesh"]["sources"][0]) {
    const [handler, handlerConfig] = await this.loadPlugin(
      sourceConfig.handler
    );
    const handlerMesh = await (handler as HandlerPlugin)({
      kind: PluginKind.Handler,
      config: handlerConfig,
      loader: this.pluginLoader,
      contextNamespace: Symbol(sourceConfig.name),
    });
    return this.applyTransforms(
      MeshUtil.convertToMesh(handlerMesh, { name: sourceConfig.name })
    );
  }

  async getMergedMesh(meshes: Mesh[]) {
    const defaultMerger: MergerPlugin = (options) => ({
      schema: stitchSchemas({
        subschemas: options.schemas,
      }),
    });
    const mergerConfig = this.config.mesh.merger;
    const [merger, config] = mergerConfig
      ? await this.loadPlugin(mergerConfig)
      : [defaultMerger, null];
    const mergedMesh = await (merger as MergerPlugin)({
      kind: PluginKind.Merger,
      schemas: meshes.map((mesh) => mesh.schema),
      meshes,
      config,
      loader: this.pluginLoader,
      contextNamespace: Symbol(
        "merge-" + meshes.map((mesh) => mesh.name).join("-")
      ),
    });
    return MeshUtil.combineMeshes(MeshUtil.convertToMesh(mergedMesh), meshes);
  }

  async applyTransforms(mesh: Mesh) {
    const transforms = this.config.mesh.transforms;
    return (transforms || []).reduce<Promise<Mesh>>(
      async (currentMeshPromise, transformConfig) => {
        const currentMesh = await currentMeshPromise;
        const [transform, config] = await this.loadPlugin(transformConfig);
        const newMesh = await (transform as TransformPlugin)({
          kind: PluginKind.Transform,
          schema: currentMesh.schema,
          config,
          loader: this.pluginLoader,
          contextNamespace: Symbol(mesh.name),
        });
        return MeshUtil.combineMeshes(MeshUtil.convertToMesh(newMesh), [
          currentMesh,
        ]);
      },
      Promise.resolve(mesh)
    );
  }

  async loadPlugin(pluginConfig: string | PluginConfig) {
    const pluginName =
      typeof pluginConfig === "string"
        ? pluginConfig
        : Object.keys(pluginConfig)[0];
    const config =
      typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
    const plugin = await this.pluginLoader.loadPlugin(pluginName);
    return [plugin, config];
  }
}

class MeshUtil {
  static convertToMesh(
    meshOrSchema: MeshOrSchema,
    props?: Omit<Mesh, "schema">
  ): Mesh {
    return isSchema(meshOrSchema)
      ? { schema: meshOrSchema, ...props }
      : { ...meshOrSchema, ...props };
  }

  static combineMeshes(newMesh: Mesh, oldMeshes: Mesh[]): Mesh {
    return {
      ...newMesh,
      contextBuilder: MeshUtil.combineContextBuilders(
        newMesh.contextBuilder,
        ...oldMeshes.map((mesh) => mesh.contextBuilder)
      ),
    };
  }

  static combineContextBuilders(
    ...contextBuilders: (MeshContextBuilder | undefined)[]
  ): MeshContextBuilder | undefined {
    return contextBuilders.reduce(
      (accum, contextBuilder) => {
        return contextBuilder
          ? async (initalContext?: any) => ({
              ...(await accum?.(initalContext)),
              ...(await contextBuilder(initalContext)),
            })
          : accum;
      },
      (i) => i
    );
  }
}
