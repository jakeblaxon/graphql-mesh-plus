import { GraphQLSchema } from "graphql";
import { PluginLoader } from "./plugin-loader";

export type MeshPlugin<T> = (
  options: T & {
    config?: any;
    info?: any;
  }
) => Promise<Mesh> | Mesh;

export type Mesh = {
  schema: GraphQLSchema;
  contextBuilder?: MeshContextBuilder;
};

export type GetMeshOptions = {
  config: MeshConfig;
  pluginLoader?: PluginLoader;
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
