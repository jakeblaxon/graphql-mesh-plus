import federationMerger from "@graphql-mesh/merger-federation";
import FederationTransform from "@graphql-mesh/transform-federation";
import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import { wrapSchema } from "@graphql-tools/wrap";
import { buildFederatedSchema } from "@apollo/federation";
import { loadTypedefs } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { CodeFileLoader } from "@graphql-tools/code-file-loader";
import { PluginAction, MergerPlugin, TransformPlugin, HandlerPlugin } from "graphql-mesh-plus";

export const handler: HandlerPlugin = async (options) =>
  buildFederatedSchema({
    typeDefs: (
      await loadTypedefs(options.config.typeDefs, {
        loaders: [new GraphQLFileLoader(), new CodeFileLoader()],
      })
    ).map((source) => source.document) as any,
    resolvers: await loadFromModuleExportExpression(options.config.resolvers),
  });

export const transform: TransformPlugin = (options) =>
  wrapSchema(options.schema, [new FederationTransform({ config: options.config } as any)]);

export const merger: MergerPlugin = (options) =>
  federationMerger({
    rawSources: options.sources.map((source) => ({
      name: source.name,
      schema: source.schema,
    })) as any,
    cache: undefined as any,
    hooks: { on: (a: any, b: any) => undefined } as any,
    transforms: [],
  });

export default (options: any) => {
  switch (options.action) {
    case PluginAction.Handle:
      return handler(options);
    case PluginAction.Transform:
      return transform(options);
    case PluginAction.Merge:
      return merger(options);
  }
};
