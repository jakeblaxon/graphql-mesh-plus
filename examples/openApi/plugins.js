const openApiHandler = require("@graphql-mesh/openapi");
const InMemoryLRUCache = require("@graphql-mesh/cache-inmemory-lru");
const { wrapSchema } = require("@graphql-tools/wrap");

exports.openApi = (options) =>
  openApiHandler
    .getMeshSource({
      name: options.sourceName,
      config: options.config,
      cache: new InMemoryLRUCache(),
    })
    .then((result) =>
      wrapSchema({
        schema: result.schema,
        executor: result.executor,
        subscriber: result.subscriber,
      })
    );
