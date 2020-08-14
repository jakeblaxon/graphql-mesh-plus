import { PluginLoader, PluginAction } from "../types";
import { loadFromModuleExportExpression } from "..";
import InMemoryLRUCache from "@graphql-mesh/cache-inmemory-lru";
import { wrapSchema } from "@graphql-tools/wrap";

const dummyHooks = {
  on(a: any, b: any) {},
  emit(a: any) {},
};

export const graphqlMesgPluginLoader: PluginLoader = {
  loadPlugin(name) {
    let module: any;
    try {
      module = loadFromModuleExportExpression("@graphql-mesh/" + name);
    } catch (e) {
      module = loadFromModuleExportExpression("@graphql-mesh/transform-" + name);
    }
    return async (options: any) => {
      if (options.action === PluginAction.Handle) {
        return module
          .getMeshSource({
            name: options.sourceName,
            cache: new InMemoryLRUCache(),
            config: options.config,
            hooks: dummyHooks,
          })
          .then((result: any) =>
            wrapSchema({
              schema: result.schema,
              executor: result.executor,
              subscriber: result.subscriber,
            })
          );
      }
      if (options.action === PluginAction.Transform) {
        return wrapSchema(options.schema, [
          new module({
            ...(options as any),
            apiName: options.sourceName,
            cache: new InMemoryLRUCache(),
            hooks: dummyHooks,
          }),
        ]);
      }
      if (options.action === PluginAction.Merge) {
        return module({
          rawSources: options.sources.map((source: any) => ({
            name: source.name,
            schema: source.schema,
          })) as any,
          cache: undefined as any,
          hooks: dummyHooks,
          transforms: [],
        });
      }
    };
  },
};
