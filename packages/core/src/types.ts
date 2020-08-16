import { GraphQLSchema } from "graphql";

export type PluginLoader = {
  getPlugin: (name: string) => MeshPlugin | Promise<MeshPlugin>;
};

export type MeshPlugin = HandlerPlugin | TransformPlugin | MergerPlugin;

export type HandlerPlugin = (options: HandlerOptions) => GraphQLSchema | Promise<GraphQLSchema>;
export type TransformPlugin = (options: TransformOptions) => GraphQLSchema | Promise<GraphQLSchema>;
export type MergerPlugin = (options: MergerOptions) => GraphQLSchema | Promise<GraphQLSchema>;

export type HandlerOptions = {
  action: PluginAction.Handle;
  sourceName: string;
  loader: PluginLoader;
  config: any;
};

export type TransformOptions = {
  action: PluginAction.Transform;
  sourceName: string;
  schema: GraphQLSchema;
  loader: PluginLoader;
  config: any;
};

export type MergerOptions = {
  action: PluginAction.Merge;
  sources: { name: string; schema: GraphQLSchema }[];
  loader: PluginLoader;
  config: any;
};

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
