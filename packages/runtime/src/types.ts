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

export type MeshConfig = {
  plugins?: Record<string, string>[];
  mesh: {
    sources: {
      name: string;
      handler: PluginConfig;
      transforms?: PluginConfig[];
    }[];
    merger?: PluginConfig;
    transforms?: PluginConfig[];
  };
};

export type PluginConfig = string | Record<string, any>;
