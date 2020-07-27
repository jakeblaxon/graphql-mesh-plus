import { GraphQLSchema } from "graphql";

export type MeshPluginFn = (options: {
  params?: any;
  config?: any;
  meta?: any;
}) => Promise<MeshPluginFnReturnType> | MeshPluginFnReturnType;

export type MeshPluginFnReturnType = {
  schema: GraphQLSchema;
  contextBuilder?: MeshContextBuilder;
}

export type MeshPlugin = {
  pluginFn: MeshPluginFn;
  config: any;
};

export type MeshConfig = {
  paths: Record<string, string>[];
  mesh: {
    sources: {
      name: string;
      handler: PluginConfig | string;
      transforms?: (PluginConfig | string)[];
    }[];
    merger?: PluginConfig | string;
    transforms?: (PluginConfig | string)[];
  };
};

export type GetMeshOptions = {
  sources: {
    handler: MeshPlugin;
    transforms?: MeshPlugin[];
  }[];
  merger?: MeshPlugin;
  transforms?: MeshPlugin[];
};

export type PluginName = string;
export type PluginCustomConfig = any;
export type PluginConfig = Record<PluginName, PluginCustomConfig>;

export type MeshContext = Record<string, any>;
export type MeshContextBuilder = (
  initialContextValue?: any
) => Promise<MeshContext> | MeshContext;
