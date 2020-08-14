import { GraphQLSchema } from "graphql";

export interface PluginLoader {
  loadPlugin(name: string): MeshPlugin | Promise<MeshPlugin>;
}

export type MeshPlugin = HandlerPlugin | TransformPlugin | MergerPlugin;

export type HandlerPlugin = Plugin<{
  action: PluginAction.Handle;
  sourceName: string;
}>;
export type TransformPlugin = Plugin<{
  action: PluginAction.Transform;
  sourceName: string;
  schema: GraphQLSchema;
}>;
export type MergerPlugin = Plugin<{
  action: PluginAction.Merge;
  sources: { name: string; schema: GraphQLSchema }[];
}>;

type Plugin<T = {}> = (
  options: {
    loader: PluginLoader;
    config: any;
  } & T
) => GraphQLSchema | Promise<GraphQLSchema>;

export enum PluginAction {
  Handle = "Handle",
  Transform = "Transform",
  Merge = "Merge",
}

////////////////////////////////

export type MeshConfig = {
  mesh: SourceConfig;
  plugins?: Record<string, string>[];
};

export type SourceConfig = HandlerSourceConfig | MergerSourceConfig;

export type HandlerSourceConfig = {
  name: string;
  handler: PluginConfig;
  transforms?: PluginConfig[];
};

export type MergerSourceConfig = {
  name: string;
  sources: SourceConfig[];
  merger?: PluginConfig;
  transforms?: PluginConfig[];
};

export type PluginConfig = string | Record<string, any>;
