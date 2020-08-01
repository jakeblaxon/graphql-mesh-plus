import { HandlerPlugin, getMesh } from "@jakeblaxon-graphql-mesh/runtime";

const handler: HandlerPlugin = (options) => {
  return getMesh({
    config: { mesh: options.config },
    pluginLoader: options.loader,
  });
};

export default handler;
