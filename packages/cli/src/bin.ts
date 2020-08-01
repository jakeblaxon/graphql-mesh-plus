import { loadConfig, loadMesh } from "@jakeblaxon-graphql-mesh/runtime";
import * as yargs from "yargs";
import { createLogger, format, transports } from "winston";
import { serveMesh } from "./commands/serve";

const logger = createLogger({
  level: "info",
  format: format.prettyPrint(),
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

export async function graphqlMesh() {
  return yargs.command<{ port: string | number }>(
    "serve",
    "Serves a GraphiQLApolloServer interface to test your Mesh API",
    (builder) => {
      builder.option("port", {
        required: false,
      });
    },
    async ({ port }) => {
      try {
        const meshConfig = await loadConfig();
        const { schema, contextBuilder } = await loadMesh(meshConfig);
        await serveMesh(logger, schema, contextBuilder, port);
      } catch (e) {
        logger.error("Unable to serve mesh: ", e);
      }
    }
  ).argv;
}

graphqlMesh()
  .then(() => {})
  .catch((e) => {
    logger.error(e);
  });
