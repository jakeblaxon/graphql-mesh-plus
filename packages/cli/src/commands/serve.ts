import { Logger } from "winston";
import { GraphQLSchema } from "graphql";
import { ApolloServer } from "apollo-server";

export function serveMesh(logger: Logger, schema: GraphQLSchema, port: string | number = 4000): Promise<void> {
  return new ApolloServer({
    logger,
    schema,
  })
    .listen({ port })
    .then(({ url }) => {
      logger.info(`graphql-mesh-plus server ready at ${url}`);
    });
}
