import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import { MeshPlugin } from "../types";
import { defaultPlugins } from "../plugins/default-plugins";

export class PluginLoader {
  constructor(private pluginMap: Map<string, string | MeshPlugin<any>>) {
    this.pluginMap = pluginMap || new Map();
    defaultPlugins.forEach((pluginEntry) =>
      this.pluginMap.set(pluginEntry.name, pluginMap.get(pluginEntry.name) || pluginEntry.plugin)
    );
  }

  async loadPlugin(name: string): Promise<MeshPlugin<any>> {
    let plugin = this.pluginMap.get(name) || name;
    if (typeof plugin === "string") {
      plugin = (await loadFromModuleExportExpression(plugin)) as MeshPlugin<any>;
    }
    if (!plugin) {
      throw new Error("Could not load mesh plugin " + name);
    }
    this.pluginMap.set(name, plugin);
    return plugin;
  }
}
