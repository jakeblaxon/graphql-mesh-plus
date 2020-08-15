import { isAbsolute, join } from "path";
import { MeshPlugin, MeshConfig, PluginLoader } from "../types";

export class DefaultPluginLoader implements PluginLoader {
  private pluginMap = new Map<string, string | MeshPlugin>();

  constructor(config: MeshConfig["plugins"]) {
    (config || []).forEach((pluginConfig) => {
      const pluginName = Object.keys(pluginConfig)[0];
      const pluginPath = Object.values(pluginConfig)[0];
      this.pluginMap.set(pluginName, pluginPath);
    });
  }

  async getPlugin(name: string): Promise<MeshPlugin> {
    let plugin = this.pluginMap.get(name) || name;
    if (typeof plugin === "string") {
      try {
        plugin = (await loadFromModuleExportExpression(plugin)) as MeshPlugin;
      } catch (e1) {
        try {
          plugin = await getGraphqlMeshPlugin(plugin as string);
        } catch (e2) {
          throw new Error(`Could not load mesh plugin ${name} from file or graphql-mesh package.`);
        }
      }
    }
    if (!plugin) {
      throw new Error("Could not load mesh plugin " + name);
    }
    this.pluginMap.set(name, plugin);
    return plugin;
  }
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

////////////////////////////////////////////////////////////////

import InMemoryLRUCache from "@graphql-mesh/cache-inmemory-lru";
import { wrapSchema } from "@graphql-tools/wrap";
import { PluginAction } from "../types";

const dummyHooks = {
  on(a: any, b: any) {},
  emit(a: any) {},
};

async function getGraphqlMeshPlugin(name: string): Promise<MeshPlugin> {
  let module: any;
  try {
    module = await loadFromModuleExportExpression("@graphql-mesh/" + name);
  } catch (e) {
    module = await loadFromModuleExportExpression("@graphql-mesh/transform-" + name);
  }
  return async (options: any) => {
    if (options.action === PluginAction.Handle) {
      return module
        .getMeshSource({
          name: options.sourceName,
          cache: new InMemoryLRUCache(),
          config: options.config,
          hooks: dummyHooks,
        })
        .then((result: any) =>
          wrapSchema({
            schema: result.schema,
            executor: result.executor,
            subscriber: result.subscriber,
          })
        );
    }
    if (options.action === PluginAction.Transform) {
      return wrapSchema(options.schema, [
        new module({
          ...(options as any),
          apiName: options.sourceName,
          cache: new InMemoryLRUCache(),
          hooks: dummyHooks,
        }),
      ]);
    }
    if (options.action === PluginAction.Merge) {
      return module({
        rawSources: options.sources.map((source: any) => ({
          name: source.name,
          schema: source.schema,
        })) as any,
        cache: undefined as any,
        hooks: dummyHooks,
        transforms: [],
      });
    }
  };
}
