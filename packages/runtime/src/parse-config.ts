import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import {
  MeshConfig,
  PluginConfig,
  MeshPlugin,
  GetMeshOptions,
  MeshPluginFn,
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
  const pluginPaths = (config.plugins || []).reduce(
    (accum, plugin) =>
      accum.set(Object.keys(plugin)[0], Object.values(plugin)[0]),
    new Map()
  );
  const [sources, merger, transforms] = await Promise.all([
    Promise.all(
      config.mesh.sources.map((sourceConfig) => loadSource(sourceConfig))
    ),
    loadMerger(config.mesh.merger),
    loadTransforms(config.mesh.transforms),
  ]);

  async function loadSource(sourceConfig: MeshConfig["mesh"]["sources"][0]) {
    const [handler, transforms] = await Promise.all([
      loadHandler(sourceConfig.handler),
      loadTransforms(sourceConfig.transforms),
    ]);
    return {
      name: sourceConfig.name,
      handler,
      transforms,
    };
  }

  function loadHandler(
    handlerConfig: MeshConfig["mesh"]["sources"][0]["handler"]
  ) {
    return loadPlugin(handlerConfig);
  }

  async function loadMerger(mergerConfig: MeshConfig["mesh"]["merger"]) {
    return mergerConfig ? loadPlugin(mergerConfig) : undefined;
  }

  async function loadTransforms(
    transformConfigs: MeshConfig["mesh"]["transforms"]
  ) {
    return transformConfigs
      ? Promise.all(
          transformConfigs.map((transformConfig) => loadPlugin(transformConfig))
        )
      : undefined;
  }

  async function loadPlugin(
    pluginConfig: PluginConfig | string
  ): Promise<MeshPlugin> {
    const name =
      typeof pluginConfig === "string"
        ? pluginConfig
        : Object.keys(pluginConfig)[0];
    const config =
      typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
    const functionPath = pluginPaths.get(name) || name;
    const applyPlugin: MeshPluginFn = await loadFromModuleExportExpression(
      functionPath
    );
    return {
      applyPlugin,
      config,
    };
  }

  return {
    sources,
    merger,
    transforms,
  };
}
