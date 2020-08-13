import { GraphQLSchema } from "graphql";
import { loadConfig } from "./config-loader";
import { PluginLoader } from "./plugin-loader";
import { defaultMerger } from "../plugins/default-plugins";
import {
  MergerPlugin,
  PluginConfig,
  TransformPlugin,
  HandlerPlugin,
  PluginAction,
  MeshConfig,
  SourceConfig,
  MergerSourceConfig,
  HandlerSourceConfig,
} from "../types";

export async function loadMesh(options?: {
  config?: MeshConfig;
  configName?: string;
  dir?: string;
  pluginLoader?: PluginLoader;
}): Promise<GraphQLSchema> {
  const config = options?.config || (await loadConfig({ configName: options?.configName, dir: options?.dir }));
  const pluginLoader = options?.pluginLoader || new PluginLoader(buildPluginMap(config.plugins));
  return loadSource(config.mesh, pluginLoader);
}

export async function loadSource(config: SourceConfig, pluginLoader: PluginLoader): Promise<GraphQLSchema> {
  const schema = isHandlerSourceConfig(config)
    ? await loadHandler(config, pluginLoader)
    : await loadMerger(config, pluginLoader);
  return applyTransforms(schema, config, pluginLoader);
}

async function loadHandler(config: HandlerSourceConfig, pluginLoader: PluginLoader) {
  const [handler, handlerConfig] = await loadPluginFromConfig(config.handler, pluginLoader);
  return (handler as HandlerPlugin)({
    action: PluginAction.Handle,
    sourceName: config.name,
    config: handlerConfig,
    loader: pluginLoader,
  });
}

async function loadMerger(config: MergerSourceConfig, pluginLoader: PluginLoader) {
  const sources = await Promise.all(
    config.sources.map(async (sourceConfig) => ({
      name: sourceConfig.name,
      schema: await loadSource(sourceConfig, pluginLoader),
    }))
  );
  const mergerConfig = config.merger;
  const [merger, mergerConfigOptions] = mergerConfig
    ? await loadPluginFromConfig(mergerConfig, pluginLoader)
    : [defaultMerger, null];
  return (merger as MergerPlugin)({
    action: PluginAction.Merge,
    sources: sources.map((source) => ({
      name: source.name,
      schema: source.schema,
    })),
    config: mergerConfigOptions,
    loader: pluginLoader,
  });
}

async function applyTransforms(startingSchema: GraphQLSchema, config: SourceConfig, pluginLoader: PluginLoader) {
  return (config.transforms || []).reduce<Promise<GraphQLSchema>>(async (currentSchemaPromise, transformConfig) => {
    const currentSchema = await currentSchemaPromise;
    const [transform, config] = await loadPluginFromConfig(transformConfig, pluginLoader);
    const newSchema = await (transform as TransformPlugin)({
      action: PluginAction.Transform,
      sourceName: config.name,
      schema: currentSchema,
      loader: pluginLoader,
      config,
    });
    return newSchema;
  }, Promise.resolve(startingSchema));
}

async function loadPluginFromConfig(pluginConfig: PluginConfig, pluginLoader: PluginLoader) {
  const pluginName = typeof pluginConfig === "string" ? pluginConfig : Object.keys(pluginConfig)[0];
  const config = typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
  const plugin = await pluginLoader.loadPlugin(pluginName);
  return [plugin, config];
}

function buildPluginMap(pluginsConfig: MeshConfig["plugins"]) {
  const pluginMap = new Map<string, string>();
  (pluginsConfig || []).forEach((pluginConfig) => {
    const pluginName = Object.keys(pluginConfig)[0];
    const pluginPath = Object.values(pluginConfig)[0];
    pluginMap.set(pluginName, pluginPath);
  });
  return pluginMap;
}

function isHandlerSourceConfig(config: SourceConfig): config is HandlerSourceConfig {
  return !!(config as HandlerSourceConfig).handler;
}
