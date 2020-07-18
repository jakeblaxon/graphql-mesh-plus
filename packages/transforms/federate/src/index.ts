import { GraphQLSchema, printSchema } from "graphql";
import { FilterRootFields, wrapSchema } from "@graphql-tools/wrap";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { getResolversFromSchema } from "@graphql-tools/utils";
import { buildFederatedSchema } from "@apollo/federation";
import { MeshTransform, MeshTransformOptions } from "@graphql-mesh/types";
import { loadFromModuleExportExpressionSync } from "@graphql-mesh/utils";

export default class FederateTransform implements MeshTransform {
  private typeDefsExtensions: string;
  private resolversExtensions: any;

  constructor(options: MeshTransformOptions<any>) {
    this.typeDefsExtensions = options.config?.typeDefsExtensions;
    const resolversPath = options.config?.resolversExtensions;
    if (resolversPath) {
      const [path, mod] = resolversPath.split("#");
      this.resolversExtensions = loadFromModuleExportExpressionSync(path, mod);
    }
  }

  transformSchema(schema: GraphQLSchema) {
    return generateFederatedSchema(
      schema,
      this.typeDefsExtensions,
      this.resolversExtensions
    );
  }
}

const filterOutSubscriptions = (schema: GraphQLSchema) => {
  // remove all subscriptions because they are not yet supported by federation.
  return wrapSchema(schema, [
    new FilterRootFields((operation) => operation !== "Subscription"),
  ]);
};

const getPrintedSchemaWithoutDescriptions = (schema: GraphQLSchema) => {
  // remove all descriptions between triple quotations (""")
  // because it causes problems with re-parsing.
  return printSchema(schema).replace(/"""(.*?(\s)*?(\n)?)*?"""/g, "");
};

export const generateFederatedSchema = (
  baseSchema: GraphQLSchema,
  typeDefsExtensions: string,
  resolversExtensions: any
) => {
  const filteredSchema = filterOutSubscriptions(baseSchema);
  const typeDefs = [getPrintedSchemaWithoutDescriptions(filteredSchema)];
  if (typeDefsExtensions) {
    typeDefs.push(typeDefsExtensions);
  }
  return buildFederatedSchema([
    {
      typeDefs: mergeTypeDefs(typeDefs),
      resolvers: mergeResolvers([
        getResolversFromSchema(filteredSchema),
        resolversExtensions,
      ]),
    },
  ]);
};
