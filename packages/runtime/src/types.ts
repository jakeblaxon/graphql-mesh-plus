import { GraphQLSchema } from "graphql";
import { PluginLoader } from "./loaders/plugin-loader";

export type MeshPlugin<T> = (
  options: {
    action: PluginAction;
    loader: PluginLoader;
    config: any;
  } & T
) => GraphQLSchema | Promise<GraphQLSchema>;

export type HandlerPlugin = MeshPlugin<{
  action: PluginAction.Handle;
  sourceName?: string;
}>;
export type TransformPlugin = MeshPlugin<{
  action: PluginAction.Transform;
  sourceName: string;
  schema: GraphQLSchema;
}>;
export type MergerPlugin = MeshPlugin<{
  action: PluginAction.Merge;
  sources: { name: string; schema: GraphQLSchema }[];
}>;

export enum PluginAction {
  "Handle",
  "Transform",
  "Merge",
}

export type PluginConfig = string | Record<string, any>;

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

export type SourceConfig = HandlerSourceConfig | MergerSourceConfig;

export type MeshConfig = {
  mesh: SourceConfig;
  plugins?: Record<string, string>[];
};
