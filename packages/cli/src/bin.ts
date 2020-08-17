import { getMesh } from "@graphql-mesh-plus/core";
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
  return yargs.command<{ port: string | number; path: string }>(
    "serve",
    "Serves a GraphiQLApolloServer interface to test your Mesh API",
    (builder) => {
      builder.option("port", {
        required: false,
      });
      builder.option("path", {
        required: false,
      });
    },
    async ({ port, path }) => {
      try {
        const schema = await getMesh({ path });
        await serveMesh(logger, schema, port);
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
