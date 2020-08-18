const { loadFromModuleExportExpression } = require("@graphql-mesh/utils");
const { buildFederatedSchema } = require("@apollo/federation");

exports.federationHandler = async (options) =>
  buildFederatedSchema([
    {
      typeDefs: await loadFromModuleExportExpression(options.config.typeDefs),
      resolvers: await loadFromModuleExportExpression(options.config.resolvers),
    },
  ]);
