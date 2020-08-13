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
} from "../types";

export async function loadMesh(options?: {
  config?: MeshConfig;
  configName?: string;
  dir?: string;
  pluginLoader?: PluginLoader;
}): Promise<GraphQLSchema> {
  const config =
    options?.config ||
    (await loadConfig({ configName: options?.configName, dir: options?.dir }));
  const pluginLoader =
    options?.pluginLoader || new PluginLoader(buildPluginMap(config.plugins));

  async function getMesh(): Promise<GraphQLSchema> {
    const sources = await Promise.all(
      config.mesh.sources.map(
        async (sourceConfig) => await getSource(sourceConfig)
      )
    );
    const mergedSchema = await getMergedSchema(sources);
    return await applyTransforms(mergedSchema, config.mesh.transforms, "");
  }

  async function getSource(sourceConfig: MeshConfig["mesh"]["sources"][0]) {
    const [handler, handlerConfig] = await loadPluginFromConfig(
      sourceConfig.handler
    );
    const handlerSchema = await (handler as HandlerPlugin)({
      action: PluginAction.Handle,
      sourceName: sourceConfig.name,
      config: handlerConfig,
      loader: pluginLoader,
    });
    const transformedSchema = await applyTransforms(
      handlerSchema,
      sourceConfig.transforms,
      sourceConfig.name
    );
    return {
      name: sourceConfig.name,
      schema: transformedSchema,
    };
  }

  async function getMergedSchema(
    sources: { name: string; schema: GraphQLSchema }[]
  ) {
    const mergerConfig = config.mesh.merger;
    const [merger, mergerCustomConfig] = mergerConfig
      ? await loadPluginFromConfig(mergerConfig)
      : [defaultMerger, null];
    const mergedSchema = await (merger as MergerPlugin)({
      action: PluginAction.Merge,
      sources: sources.map((source) => ({
        name: source.name,
        schema: source.schema,
      })),
      config: mergerCustomConfig,
      loader: pluginLoader,
    });
    return mergedSchema;
  }

  async function applyTransforms(
    schema: GraphQLSchema,
    transforms: MeshConfig["mesh"]["sources"][0]["transforms"] | undefined,
    sourceName: string
  ) {
    return (transforms || []).reduce<Promise<GraphQLSchema>>(
      async (currentSchemaPromise, transformConfig) => {
        const currentSchema = await currentSchemaPromise;
        const [transform, config] = await loadPluginFromConfig(transformConfig);
        const newSchema = await (transform as TransformPlugin)({
          action: PluginAction.Transform,
          sourceName,
          schema: currentSchema,
          config,
          loader: pluginLoader,
        });
        return newSchema;
      },
      Promise.resolve(schema)
    );
  }

  async function loadPluginFromConfig(pluginConfig: PluginConfig) {
    const pluginName =
      typeof pluginConfig === "string"
        ? pluginConfig
        : Object.keys(pluginConfig)[0];
    const config =
      typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
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

  return getMesh();
}
