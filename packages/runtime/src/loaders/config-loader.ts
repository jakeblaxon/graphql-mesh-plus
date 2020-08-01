import { cosmiconfig, defaultLoaders } from "cosmiconfig";

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
  return { config: results?.config };
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
