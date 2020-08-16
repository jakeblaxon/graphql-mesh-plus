import { GraphQLSchema } from "graphql";
import { MeshConfig, PluginLoader } from "./types";
import { loadConfig } from "./loaders/config-loader";
import { DefaultPluginLoader } from "./loaders/plugin-loader";
import { loadSource } from "./loaders/source-loader";

export * from "./loaders/source-loader";
export * from "./loaders/config-loader";
export * from "./loaders/plugin-loader";
export * from "./types";

export async function getMesh(options?: {
  path?: string;
  config?: MeshConfig;
  pluginLoader?: PluginLoader;
}): Promise<GraphQLSchema> {
  const config = options?.config || (await loadConfig({ path: options?.path }));
  const pluginLoader = options?.pluginLoader || new DefaultPluginLoader(config.plugins);
  return loadSource(config.mesh, pluginLoader);
}
