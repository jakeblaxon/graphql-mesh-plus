import { isAbsolute, join } from "path";
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

async function loadFromModuleExportExpression(expression: string, defaultExportName?: string) {
  const [modulePath, exportName = defaultExportName] = expression.split("#");
  const mod = await tryImport(modulePath);
  if (exportName === "default" || !exportName) {
    return mod.default || mod;
  } else {
    return mod[exportName] || (mod.default && mod.default[exportName]);
  }
}

async function tryImport(modulePath: string) {
  try {
    return await import(modulePath);
  } catch (e1) {
    if (!isAbsolute(modulePath)) {
      try {
        const absoluteModulePath = isAbsolute(modulePath) ? modulePath : join(process.cwd(), modulePath);
        return await import(absoluteModulePath);
      } catch (e2) {
        if (e2.message.includes("Cannot find module")) {
          throw e1;
        } else {
          throw e2;
        }
      }
    }
    throw e1;
  }
}
