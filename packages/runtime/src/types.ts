import { GraphQLSchema } from "graphql";
import { IEventEmitter } from 'tsee';
import { MeshContextBuilder, PluginLoader } from ".";

export type MeshPlugin<T> = (
  options: T & {
    kind: PluginKind;
    config: any;
    loader: PluginLoader;
    contextBuilder: MeshContextBuilder;
    hooks: Hooks;
  }
) => GraphQLSchema | Promise<GraphQLSchema>;

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

export type Hooks = IEventEmitter<{
  schemaReady: (schema: GraphQLSchema) => void;
  destroy: () => void;
}>;

export type Mesh = {
  schema: GraphQLSchema;
  contextBuilder: MeshContextBuilder;
  hooks: Hooks;
  destroy: () => void;
};

export type MeshContext = Record<string, any>;
export type MeshContextFn = (
  initialContext?: any
) => MeshContext | Promise<MeshContext>;

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

export type PluginConfig = Record<string, any>;
