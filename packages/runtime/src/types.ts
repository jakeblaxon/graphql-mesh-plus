import { Transform } from "@graphql-tools/utils";
import { GraphQLSchema } from "graphql";

export type MeshPlugin<T> = (options: { name?: string; config?: any }) => T;

export type PluginConfig =
  | {
      name?: string;
      path?: string;
      config?: any;
    }
  | string;

export type MeshConfig = {
  sources: {
    name: string;
    handler: PluginConfig;
    transforms?: PluginConfig[];
  }[];
  merger?: PluginConfig;
  transforms?: PluginConfig[];
};

export type MeshContext = Record<string, any>;

export type MeshContextBuilder = (
  initialContextValue?: any
) => Promise<MeshContext> | MeshContext;

export type MeshTransform = {
  transform: Transform;
};

export type MeshHandler = {
  schema: GraphQLSchema;
  contextBuilder?: MeshContextBuilder;
};

export type MeshSource = {
  name?: string;
  handler: MeshHandler;
  transforms?: MeshTransform[];
};

export type MeshMerger = {
  merge: (schemas: GraphQLSchema[]) => Promise<GraphQLSchema> | GraphQLSchema;
};

export type GetMeshOptions = {
  sources: MeshSource[];
  merger?: MeshMerger;
  transforms?: MeshTransform[];
};
