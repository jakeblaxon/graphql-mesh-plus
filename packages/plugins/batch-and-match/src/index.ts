import { GraphQLFieldResolver } from "graphql";
import { createBatchDelegateFn } from "@graphql-tools/batch-delegate";
import { stitchSchemas } from "@graphql-tools/stitch";
import traverse from "traverse";
import { TransformPlugin } from "@graphql-mesh-plus/core";
import {
  applyMapping,
  mapEntitiesToRoots,
  addRequirdFieldsToRequest,
  returnTypeIsList,
  getParentSelectionSetFromJsonPaths,
} from "./util";

interface Config {
  queryName: string;
  argsMapping: any;
  keyMapping?: any;
}

const transform: TransformPlugin = async (options) => {
  function createBatchAndMatchResolver(config: Config): GraphQLFieldResolver<any, any, any> {
    const { queryName, argsMapping, keyMapping } = config;
    let returnsList: boolean;
    const transforms = keyMapping ? [addRequirdFieldsToRequest(queryName, keyMapping)] : [];

    const batchAndMatchFn = createBatchDelegateFn(
      (keys) => applyMapping(argsMapping, { roots: keys }),
      (options) => options,
      {},
      (results, keys) => (keyMapping ? mapEntitiesToRoots(results, keys, keyMapping, returnsList) : results)
    );

    return (parent, args, context, info) => {
      returnsList = returnsList ?? returnTypeIsList(info.returnType);
      return batchAndMatchFn({
        key: parent,
        schema: options.schema,
        operation: "query",
        fieldName: queryName,
        context,
        info,
        transforms,
      });
    };
  }

  function createBatchAndMatchResolverObject(config: Config) {
    const selectionSet = getParentSelectionSetFromJsonPaths([config.keyMapping, config.argsMapping]);
    return {
      selectionSet,
      resolve: createBatchAndMatchResolver(config),
    };
  }

  function createBatchAndMatchResolvers(config: Record<string, Record<string, Config>>) {
    return traverse(config).map(function () {
      if (this.level === 2) {
        this.update(
          createBatchAndMatchResolverObject({
            queryName: this.node.queryName,
            argsMapping: this.node.argsMapping,
            keyMapping: this.node.keyMapping,
          })
        );
      }
    });
  }

  return stitchSchemas({
    subschemas: [options.schema],
    typeDefs: options.config.typeDefs,
    resolvers: createBatchAndMatchResolvers(options.config.resolvers),
  });
};

export default transform;
