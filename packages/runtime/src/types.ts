import { GraphQLSchema } from "graphql";

export type Mesh = {
  schema: GraphQLSchema;
  contextBuilder?: MeshContextBuilder;
};

export type MeshPlugin = {
  applyPlugin: MeshPluginFn;
  config?: any;
};

export type MeshPluginFn = (options: {
  schema?: any;
  schemas?: any;
  config?: any;
  info?: any;
}) => Promise<Mesh> | Mesh;

export type GetMeshOptions = {
  sources: {
    name?: string;
    handler: MeshPlugin;
    transforms?: MeshPlugin[];
  }[];
  merger?: MeshPlugin;
  transforms?: MeshPlugin[];
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
