import { execute, subscribe } from "graphql";
import { withPostGraphileContext, Plugin } from "postgraphile";
import { getPostGraphileBuilder } from "postgraphile-core";
import { Pool } from "pg";
import { loadFromModuleExportExpression } from "@graphql-mesh/utils";
import { wrapSchema } from "@graphql-tools/wrap";

export default async (options: any) => {
  const { config } = options;
  const pgPool = new Pool({
    ...(config?.pool
      ? {
          ...config?.pool,
        }
      : {
          connectionString: config.connectionString,
        }),
  });

  const appendPlugins = await Promise.all<Plugin>(
    (config.appendPlugins || []).map((pluginName: string) => loadFromModuleExportExpression(pluginName))
  );
  const skipPlugins = await Promise.all<Plugin>(
    (config.skipPlugins || []).map((pluginName: string) => loadFromModuleExportExpression(pluginName))
  );
  const buildOptions =
    typeof config.options === "string" ? await loadFromModuleExportExpression(config.options) : config.options;

  const builder = await getPostGraphileBuilder(pgPool, config.schemaName || "public", {
    dynamicJson: true,
    subscriptions: true,
    live: true,
    appendPlugins,
    skipPlugins,
    ...buildOptions,
  });

  const graphileSchema = builder.buildSchema();

  return wrapSchema({
    schema: graphileSchema,
    executor({ document, variables, context: meshContext }) {
      return withPostGraphileContext(
        {
          pgPool,
        },
        async (postgraphileContext) => {
          // Execute your GraphQL query in this function with the provided
          // `context` object, which should NOT be used outside of this
          // function.
          return execute({
            schema: graphileSchema, // The schema from `createPostGraphileSchema`
            document,
            contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
            variableValues: variables,
          });
        }
      ) as any;
    },
    subscriber({ document, variables, context: meshContext }) {
      return withPostGraphileContext(
        {
          pgPool,
        },
        async (postgraphileContext) => {
          // Execute your GraphQL query in this function with the provided
          // `context` object, which should NOT be used outside of this
          // function.
          return subscribe({
            schema: graphileSchema, // The schema from `createPostGraphileSchema`
            document,
            contextValue: { ...postgraphileContext, ...meshContext }, // You can add more to context if you like
            variableValues: variables,
          }) as any;
        }
      ) as any;
    },
  });
};
