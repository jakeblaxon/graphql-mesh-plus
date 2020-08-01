import { GraphQLSchema } from "graphql";
import { PluginLoader } from "./loaders/plugin-loader";

export type MeshPlugin<T> = (
  options: T & {
    kind: PluginKind;
    config: any;
    loader: PluginLoader;
    contextNamespace: Symbol;
  }
) => Promise<MeshOrSchema> | MeshOrSchema;

export type HandlerPlugin = MeshPlugin<{
  kind: PluginKind.Handler;
  name?: string;
}>;
export type TransformPlugin = MeshPlugin<{
  kind: PluginKind.Transform;
  name?: string;
  schema: GraphQLSchema;
}>;
export type MergerPlugin = MeshPlugin<{
  kind: PluginKind.Merger;
  schemas: GraphQLSchema[];
  sources: { name?: string; schema: GraphQLSchema }[];
}>;

export enum PluginKind {
  Handler,
  Transform,
  Merger,
}

export type Mesh = {
  schema: GraphQLSchema;
  name?: string;
  contextBuilder?: MeshContextBuilder;
};

export type MeshOrSchema = Mesh | GraphQLSchema;

export type MeshConfig = {
  plugins?: Record<string, string>[];
  mesh: {
    sources: {
      name?: string;
      handler: PluginConfig | string;
      transforms?: (PluginConfig | string)[];
    }[];
    merger?: PluginConfig | string;
    transforms?: (PluginConfig | string)[];
  };
};

export type PluginName = string;
export type PluginCustomConfig = any;
export type PluginConfig = Record<PluginName, PluginCustomConfig>;

export type MeshContext = Record<string, any>;
export type MeshContextBuilder = (
  initialContext?: any
) => Promise<MeshContext> | MeshContext;
