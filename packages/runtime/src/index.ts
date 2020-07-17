import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { processConfig } from "@graphql-mesh/runtime";

// add support for environment variables
function customLoader(ext: "json" | "yaml" | "js") {
  function loader(filepath: string, content: string) {
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

    if (ext === "json") {
      return defaultLoaders[".json"](filepath, content);
    }

    if (ext === "yaml") {
      return defaultLoaders[".yaml"](filepath, content);
    }

    if (ext === "js") {
      return defaultLoaders[".js"](filepath, content);
    }
  }

  return loader;
}

export async function findAndParseConfig() {
  const configName = "mesh";
  const dir = process.cwd();
  const ignoreAdditionalResolvers = false;
  const explorer = cosmiconfig(configName, {
    loaders: {
      ".json": customLoader("json"),
      ".yaml": customLoader("yaml"),
      ".yml": customLoader("yaml"),
      ".js": customLoader("js"),
      noExt: customLoader("yaml"),
    },
  });
  const results = await explorer.search(dir);
  const config = results?.config;
  return processConfig(config, { dir, ignoreAdditionalResolvers });
}
