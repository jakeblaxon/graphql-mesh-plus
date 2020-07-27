import { stitchSchemas } from "@graphql-tools/stitch";
import { GetMeshOptions, MeshPluginFn } from "./types";

export const MESH_CONTEXT_SYMBOL = Symbol("isMeshContext");

export async function getMesh(
  options: GetMeshOptions
): Promise<ReturnType<MeshPluginFn>> {
  const schemas = await Promise.all(
    options.sources.map(async (source) => {
      let schema = (
        await source.handler.pluginFn({ config: source.handler.config })
      ).schema;
      await (source.transforms || []).forEach(
        async (transform) =>
          (schema = (
            await transform.pluginFn({
              params: { schema },
              config: transform.config,
            })
          ).schema)
      );
      return schema;
    })
  );

  let unifiedSchema = options.merger
    ? (
        await options.merger.pluginFn({
          params: { schemas: schemas },
          config: options.merger.config,
        })
      ).schema
    : stitchSchemas({ subschemas: schemas });

  await (options.transforms || []).forEach(
    async (transform) =>
      (unifiedSchema = (
        await transform.pluginFn({
          params: { schema: unifiedSchema },
          config: transform.config,
        })
      ).schema)
  );

  return {
    schema: unifiedSchema,
    contextBuilder: (initialContext) => ({...initialContext})
      // buildMeshContext(options.sources, initialContext),
  };
}
