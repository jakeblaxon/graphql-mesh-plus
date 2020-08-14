import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import { MeshPlugin, PluginLoader, MeshConfig } from "../types";

export class DefaultPluginLoader implements PluginLoader {
  constructor(private config: MeshConfig["plugins"]) {}

  loadPlugin(name: string) {
    let plugin = Object.values(this.config?.find((entry) => entry.name === name) || {})[0] || name;
    return loadFromModuleExportExpression(plugin) as Promise<MeshPlugin>;
  }
}

export function combinePluginLoaders(...loaders: (PluginLoader | undefined)[]): PluginLoader {
  const pluginMap = new Map<string, MeshPlugin>();
  return {
    async loadPlugin(name: string) {
      const cachedValue = pluginMap.get(name);
      if (cachedValue) {
        return cachedValue;
      }
      for (const loader of loaders) {
        if (loader) {
          try {
            const plugin = await loader.loadPlugin(name);
            pluginMap.set(name, plugin);
            return plugin;
          } catch (e) {}
        }
      }
      throw new Error("Could not load mesh plugin " + name);
    },
  };
}
