import { GraphQLSchema } from "graphql";

export type Mesh = {
  schema: GraphQLSchema;
  contextBuilder?: MeshContextBuilder;
};

export type MeshPlugin<T> = {
  applyPlugin: MeshPluginFn<T>;
  config?: any;
};

export type MeshPluginFn<T> = (
  options: T & {
    config?: any;
    info?: any;
  }
) => Promise<Mesh> | Mesh;

export type GetMeshOptions = {
  sources: {
    name?: string;
    handler: HandlerPlugin;
    transforms?: TransformPlugin[];
  }[];
  merger?: MergerPlugin;
  transforms?: TransformPlugin[];
};

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

export type HandlerPlugin = MeshPlugin<{}>;
export type TransformPlugin = MeshPlugin<{ schema: GraphQLSchema }>;
export type MergerPlugin = MeshPlugin<{ schemas: GraphQLSchema[] }>;
