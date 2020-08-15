import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { MeshConfig } from "../types";

export async function loadConfig(options?: { path?: string; configName?: string; dir?: string }) {
  const configName = options?.configName || "mesh";
  const explorer = cosmiconfig(configName, {
    loaders: {
      ".json": envVarLoader(".json"),
      ".yaml": envVarLoader(".yaml"),
      ".yml": envVarLoader(".yaml"),
      ".js": envVarLoader(".js"),
      ".config": envVarLoader(".yaml"),
      noExt: envVarLoader(".yaml"),
    },
    searchPlaces: [
      `.${configName}`,
      `.${configName}.json`,
      `.${configName}.yaml`,
      `.${configName}.yml`,
      `.${configName}.js`,
      `.${configName}rc`,
      `.${configName}rc.json`,
      `.${configName}rc.yaml`,
      `.${configName}rc.yml`,
      `.${configName}rc.js`,
      `.${configName}.config`,
      `.${configName}.config.json`,
      `.${configName}.config.yaml`,
      `.${configName}.config.yml`,
      `.${configName}.config.js`,
    ],
  });
  const results = options?.path ? await explorer.load(options.path) : await explorer.search(options?.dir);
  return results?.config as MeshConfig;
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
