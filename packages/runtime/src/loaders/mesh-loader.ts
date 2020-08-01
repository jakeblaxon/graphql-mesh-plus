import { isSchema } from "graphql";
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

export function loadMesh(
  config: MeshConfig,
  pluginLoader?: PluginLoader
): Promise<Mesh> {
  const meshLoader = new MeshLoader(config, pluginLoader);
  return meshLoader.loadMesh();
}
class MeshLoader {
  private pluginLoader: PluginLoader;
  private defaultMerger: MergerPlugin = (options) => ({
    schema: stitchSchemas({
      subschemas: options.schemas,
    }),
  });

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
    const sources = await Promise.all(
      this.config.mesh.sources.map(
        async (sourceConfig) => await this.getSource(sourceConfig)
      )
    );
    const mergedMesh = await this.getMergedMesh(sources);
    return this.applyTransforms(mergedMesh);
  }

  async getSource(sourceConfig: MeshConfig["mesh"]["sources"][0]) {
    const [handler, handlerConfig] = await this.loadPlugin(
      sourceConfig.handler
    );
    const handlerMesh = await (handler as HandlerPlugin)({
      kind: PluginKind.Handler,
      name: sourceConfig.name,
      config: handlerConfig,
      loader: this.pluginLoader,
      contextNamespace: Symbol(sourceConfig.name),
    });
    const transformedMesh = await this.applyTransforms(
      MeshUtil.convertToMesh(handlerMesh),
      sourceConfig.name
    );
    return {
      name: sourceConfig.name,
      mesh: transformedMesh,
    };
  }

  async getMergedMesh(sources: { name?: string; mesh: Mesh }[]) {
    const mergerConfig = this.config.mesh.merger;
    const [merger, config] = mergerConfig
      ? await this.loadPlugin(mergerConfig)
      : [this.defaultMerger, null];
    const mergedMesh = await (merger as MergerPlugin)({
      kind: PluginKind.Merger,
      schemas: sources.map((source) => source.mesh.schema),
      sources: sources.map((source) => ({
        name: source.name,
        schema: source.mesh.schema,
      })),
      config,
      loader: this.pluginLoader,
      contextNamespace: Symbol(
        "merge-" + sources.map((source) => source.name).join("-")
      ),
    });
    return MeshUtil.combineMeshes(
      MeshUtil.convertToMesh(mergedMesh),
      sources.map((source) => source.mesh)
    );
  }

  async applyTransforms(mesh: Mesh, name?: string) {
    const transforms = this.config.mesh.transforms;
    return (transforms || []).reduce<Promise<Mesh>>(
      async (currentMeshPromise, transformConfig) => {
        const currentMesh = await currentMeshPromise;
        const [transform, config] = await this.loadPlugin(transformConfig);
        const newMesh = await (transform as TransformPlugin)({
          kind: PluginKind.Transform,
          name,
          schema: currentMesh.schema,
          config,
          loader: this.pluginLoader,
          contextNamespace: Symbol(name),
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
  static convertToMesh(meshOrSchema: MeshOrSchema): Mesh {
    return isSchema(meshOrSchema) ? { schema: meshOrSchema } : meshOrSchema;
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
