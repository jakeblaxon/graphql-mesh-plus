import { Logger } from "winston";
import { GraphQLSchema } from "graphql";
import { MeshContextBuilder } from "@jakeblaxon-graphql-mesh/runtime";
import { ApolloServer } from "apollo-server";

export function serveMesh(
  logger: Logger,
  schema: GraphQLSchema,
  contextBuilder: MeshContextBuilder | undefined,
  port: string | number = 4000
): Promise<void> {
  const server = new ApolloServer({
    logger,
    schema,
    context: contextBuilder,
  });

  return server.listen({ port }).then(({ url }) => {
    logger.info(`Server ready at ${url}`);
  });
}
