import { GraphQLSchema } from "graphql";
import { wrapSchema } from "@graphql-tools/wrap";
import { stitchSchemas } from "@graphql-tools/stitch";
import { GetMeshOptions, MeshSource } from "./types";

export const MESH_CONTEXT_SYMBOL = Symbol("isMeshContext");

export async function getMesh(
  options: GetMeshOptions
): Promise<{
  schema: GraphQLSchema;
  contextBuilder: (initialContextValue?: any) => Promise<Record<string, any>>;
}> {
  const schemas = options.sources.map((source) =>
    source.transforms
      ? wrapSchema(
          source.handler.schema,
          source.transforms.map((meshTransform) => meshTransform.transform)
        )
      : source.handler.schema
  );
  const unifiedSchema = options.merger
    ? await options.merger.merge(schemas)
    : stitchSchemas({ subschemas: schemas });
  const finalSchema = options.transforms
    ? wrapSchema(
        unifiedSchema,
        options.transforms.map((meshTransform) => meshTransform.transform)
      )
    : unifiedSchema;
  return {
    schema: finalSchema,
    contextBuilder: (initialContext) =>
      buildMeshContext(options.sources, initialContext),
  };
}

async function buildMeshContext(
  sources: MeshSource[],
  initialContextValue?: object
) {
  const context = {
    ...initialContextValue,
    [MESH_CONTEXT_SYMBOL]: true,
  };
  await Promise.all(
    sources.map(async (source) => {
      const contextBuilder = source.handler.contextBuilder;
      if (contextBuilder) {
        const sourceContext = await contextBuilder(context);
        if (sourceContext) {
          Object.assign(context, sourceContext);
        }
      }
    })
  );
  return context;
}
