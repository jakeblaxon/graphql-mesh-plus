import {
  loadFromModuleExportExpression,
  loadFromModuleExportExpressionSync,
} from "@graphql-mesh/utils";
import { MeshPlugin } from "./types";

export class PluginLoader {
  constructor(private pluginMap: Map<string, string | MeshPlugin<any>>) {}

  async loadPlugin(name: string): Promise<MeshPlugin<any>> {
    let plugin = this.pluginMap.get(name) || name;
    if (typeof plugin === "string") {
      plugin = (await this.loadModule(name)) as MeshPlugin<any>;
    }
    if (!plugin) {
      throw new Error("Could not load mesh plugin " + name);
    }
    return plugin;
  }

  loadModule(path: string) {
    return loadFromModuleExportExpression(path);
  }

  loadModuleSync(path: string) {
    return loadFromModuleExportExpressionSync(path);
  }
}
