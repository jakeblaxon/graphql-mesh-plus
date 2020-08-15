import { GraphQLSchema } from "graphql";
import { MeshConfig, PluginLoader } from "./types";
import { loadConfig } from "./loaders/config-loader";
import { DefaultPluginLoader } from "./loaders/plugin-loader";
import { loadSource } from "./loaders/source-loader";

export * from "./loaders/source-loader";
export * from "./loaders/config-loader";
export * from "./loaders/plugin-loader";
export * from "./types";

export async function loadMesh(options?: {
  config?: MeshConfig;
  configName?: string;
  dir?: string;
  pluginLoader?: PluginLoader;
}): Promise<GraphQLSchema> {
  const config = options?.config || (await loadConfig({ configName: options?.configName, dir: options?.dir }));
  const pluginLoader = options?.pluginLoader || new DefaultPluginLoader(config.plugins);
  return loadSource(config.mesh, pluginLoader);
}
