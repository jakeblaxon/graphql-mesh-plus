import { stitchSchemas } from "@graphql-tools/stitch";
import { PluginLoader } from "./plugin-loader";
import { combineMeshes } from "./mesh-util";
import {
  GetMeshOptions,
  Mesh,
  MergerPlugin,
  MeshConfig,
  PluginConfig,
} from "./types";

export async function getMesh(options: GetMeshOptions): Promise<Mesh> {
  const pluginMap = new Map<string, string>();
  (options.config.plugins || []).forEach((pluginConfig) => {
    const pluginName = Object.keys(pluginConfig)[0];
    const pluginPath = Object.values(pluginConfig)[0];
    pluginMap.set(pluginName, pluginPath);
  });
  const pluginLoader = options.pluginLoader || new PluginLoader(pluginMap);

  const meshSources = await Promise.all(
    options.config.mesh.sources.map(
      async (sourceConfig) => await getSourceMesh(sourceConfig, pluginLoader)
    )
  );
  const mergedMesh = await getMergedMesh(
    meshSources,
    pluginLoader,
    options.config.mesh.merger
  );
  return applyTransforms(
    mergedMesh,
    pluginLoader,
    options.config.mesh.transforms
  );
}

export async function getSourceMesh(
  sourceConfig: GetMeshOptions["config"]["mesh"]["sources"][0],
  pluginLoader: PluginLoader
) {
  const [handler, handlerConfig] = await loadPlugin(
    sourceConfig.handler,
    pluginLoader
  );
  const handlerMesh = await handler({
    config: handlerConfig,
    loader: pluginLoader,
  });
  return applyTransforms(handlerMesh, pluginLoader, sourceConfig.transforms, {
    sourceName: sourceConfig.name,
  });
}

export async function getMergedMesh(
  meshes: Mesh[],
  pluginLoader: PluginLoader,
  mergerConfig?: MeshConfig["mesh"]["merger"],
  info?: any
) {
  const defaultMerger: MergerPlugin = (options: any) => ({
    schema: stitchSchemas({
      subschemas: options.params.schemas,
    }),
  });
  const [merger, config] = mergerConfig
    ? await loadPlugin(mergerConfig, pluginLoader)
    : [defaultMerger, null];
  const mergedMesh = await merger({
    schemas: meshes.map((mesh) => mesh.schema),
    config,
    loader: pluginLoader,
    info: { ...info, meshes },
  });
  return combineMeshes(mergedMesh, meshes);
}

export async function applyTransforms(
  mesh: Mesh,
  pluginLoader: PluginLoader,
  transforms?: MeshConfig["mesh"]["transforms"],
  info?: any
) {
  return (transforms || []).reduce<Promise<Mesh>>(
    async (currentMeshPromise, transformConfig) => {
      const currentMesh = await currentMeshPromise;
      const [transform, config] = await loadPlugin(
        transformConfig,
        pluginLoader
      );
      const newMesh = await transform({
        schema: currentMesh.schema,
        config,
        loader: pluginLoader,
        info,
      });
      return combineMeshes(newMesh, [currentMesh]);
    },
    Promise.resolve(mesh)
  );
}

export async function loadPlugin(
  pluginConfig: string | PluginConfig,
  pluginLoader: PluginLoader
) {
  const pluginName =
    typeof pluginConfig === "string"
      ? pluginConfig
      : Object.keys(pluginConfig)[0];
  const config =
    typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
  const plugin = await pluginLoader.loadPlugin(pluginName);
  return [plugin, config];
}
