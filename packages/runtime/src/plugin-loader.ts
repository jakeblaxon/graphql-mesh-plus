import {
  loadFromModuleExportExpression,
  loadFromModuleExportExpressionSync,
} from "@graphql-mesh/utils";
import { MeshPlugin } from "./types";

export class PluginLoader {
  constructor(private pluginMap: Map<string, string | MeshPlugin<any>>) {
    this.pluginMap = pluginMap || new Map();
  }

  async loadPlugin(name: string): Promise<MeshPlugin<any>> {
    let plugin = this.pluginMap.get(name) || name;
    if (typeof plugin === "string") {
      plugin = (await this.loadModule(plugin)) as MeshPlugin<any>;
    }
    if (!plugin) {
      throw new Error("Could not load mesh plugin " + name);
    }
    this.pluginMap.set(name, plugin);
    return plugin;
  }

  loadModule(path: string) {
    return loadFromModuleExportExpression(path);
  }

  loadModuleSync(path: string) {
    return loadFromModuleExportExpressionSync(path);
  }
}
