import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import {
  MeshConfig,
  PluginConfig,
  MeshSource,
  MeshHandler,
  MeshTransform,
  MeshMerger,
  MeshPlugin,
  GetMeshOptions,
} from "./types";

export async function findAndParseConfig(options?: {
  configName?: string;
  dir?: string;
}) {
  const { configName = "mesh", dir = process.cwd() } = options || {};
  const explorer = cosmiconfig(configName, {
    loaders: {
      ".json": envVarLoader(".json"),
      ".yaml": envVarLoader(".yaml"),
      ".yml": envVarLoader(".yaml"),
      ".js": envVarLoader(".js"),
      noExt: envVarLoader(".yaml"),
    },
  });
  const results = await explorer.search(dir);
  const config = results?.config;
  return processConfig(config);
}

function envVarLoader(ext: ".json" | ".yaml" | ".js") {
  return (filepath: string, content: string) => {
    if (typeof process !== "undefined" && "env" in process) {
      content = content.replace(/\$\{(.*?)\}/g, (_, variable) => {
        let varName = variable;
        let defaultValue = "";
        if (variable.includes(":")) {
          const spl = variable.split(":");
          varName = spl.shift();
          defaultValue = spl.join(":");
        }
        return process.env[varName] || defaultValue;
      });
    }
    return defaultLoaders[ext](filepath, content);
  };
}

export async function processConfig(
  config: MeshConfig
): Promise<GetMeshOptions> {
  const [sources, merger, transforms] = await Promise.all([
    Promise.all(config.sources.map((sourceConfig) => loadSource(sourceConfig))),
    loadMerger(config.merger),
    loadTransforms(config.transforms),
  ]);
  return {
    sources,
    merger,
    transforms,
  };
}

async function loadSource(
  sourceConfig: MeshConfig["sources"][0]
): Promise<MeshSource> {
  const [handler, transforms] = await Promise.all([
    loadHandler(sourceConfig.handler),
    loadTransforms(sourceConfig.transforms),
  ]);
  return {
    handler,
    transforms,
  };
}

function loadHandler(
  handlerConfig: MeshConfig["sources"][0]["handler"]
): Promise<MeshHandler> {
  return loadPlugin(handlerConfig);
}

async function loadMerger(
  mergerConfig: MeshConfig["merger"]
): Promise<MeshMerger | undefined> {
  return mergerConfig ? loadPlugin(mergerConfig) : undefined;
}

async function loadTransforms(
  transformConfigs: MeshConfig["transforms"]
): Promise<MeshTransform[] | undefined> {
  return transformConfigs
    ? Promise.all(
        transformConfigs.map((transformConfig) =>
          loadPlugin<MeshTransform>(transformConfig)
        )
      )
    : undefined;
}

async function loadPlugin<T>(pluginConfig: PluginConfig) {
  const modulePath =
    typeof pluginConfig === "string"
      ? pluginConfig
      : pluginConfig.path || pluginConfig.name || "";
  const moduleConfig =
    typeof pluginConfig === "string"
      ? undefined
      : {
          name: pluginConfig.name,
          config: pluginConfig.config,
        };
  const module: MeshPlugin<T> = await loadFromModuleExportExpression(
    modulePath
  );
  return module(moduleConfig || {});
}
