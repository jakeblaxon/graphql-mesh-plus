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
    let plugin = this.pluginMap.get(name);
    if (typeof plugin === "string") {
      try {
        plugin = (await loadFromModuleExportExpression(plugin)) as MeshPlugin;
      } catch (e1) {
        try {
          plugin = await getGraphqlMeshPlugin(plugin as string);
        } catch (e2) {
          throw new Error(`Could not find mesh plugin ${name}.`);
        }
      }
    } else if (!plugin) {
      try {
        plugin = await getGraphqlMeshPlugin(name);
      } catch (e) {
        throw new Error(`Could not find mesh plugin ${name}.`);
      }
    }
    if (!plugin) {
      throw new Error(`Could not find mesh plugin ${name}.`);
    }
    this.pluginMap.set(name, plugin);
    return plugin;
  }
}

export async function loadFromModuleExportExpression(expression: string, defaultExportName?: string) {
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

import { wrapSchema } from "@graphql-tools/wrap";
import { PluginAction } from "../types";

const dummyHooks = {
  on(a: any, b: any) {},
  emit(a: any) {},
};

async function getGraphqlMeshPlugin(name: string): Promise<MeshPlugin> {
  name = convertToParamCase(name);
  let modules: any = {};
  try {
    modules[PluginAction.Handle] = await loadFromModuleExportExpression("@graphql-mesh/" + name);
  } catch (e) {}
  try {
    modules[PluginAction.Transform] = await loadFromModuleExportExpression("@graphql-mesh/transform-" + name);
  } catch (e) {}
  try {
    modules[PluginAction.Merge] = await loadFromModuleExportExpression("@graphql-mesh/merger-" + name);
  } catch (e) {}

  return async (options: any) => {
    if (options.action === PluginAction.Handle) {
      if (!modules[PluginAction.Handle]) {
        throw new Error(`Could not find mesh plugin ${name}.`);
      }
      return modules[PluginAction.Handle]
        .getMeshSource({
          name: options.sourceName,
          config: options.config,
          hooks: dummyHooks,
          cache: undefined,
        })
        .then((result: any) =>
          wrapSchema({
            schema: result.schema,
            executor: result.executor,
            subscriber: result.subscriber,
          })
        );
    } else if (options.action === PluginAction.Transform) {
      if (!modules[PluginAction.Transform]) {
        throw new Error(`Could not find mesh plugin ${name}.`);
      }
      return wrapSchema(options.schema, [
        new modules[PluginAction.Transform]({
          config: options.config,
          apiName: options.sourceName,
          hooks: dummyHooks,
          cache: undefined,
        }),
      ]);
    } else if (options.action === PluginAction.Merge) {
      if (!modules[PluginAction.Merge]) {
        throw new Error(`Could not find mesh plugin ${name}.`);
      }
      return modules[PluginAction.Merge]({
        rawSources: options.sources,
        hooks: dummyHooks,
        cache: undefined,
        transforms: [],
      });
    }
  };
}

function convertToParamCase(name: string) {
  return name
    .split(/(?=[A-Z])/)
    .map((subName) => subName.toLowerCase())
    .join("-");
}
