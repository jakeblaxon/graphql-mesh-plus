import { stitchSchemas } from "@graphql-tools/stitch";
import { HandlerPlugin, MergerPlugin, loadMesh } from "..";

export const defaultMerger: MergerPlugin = (options) =>
  stitchSchemas({
    subschemas: options.sources.map((source) => source.schema),
  });

export const meshHandler: HandlerPlugin = async (options) => {
  return await loadMesh({
    config: { mesh: options.config },
    pluginLoader: options.loader,
  });
};

export const defaultPlugins = [
  { name: "stitching", plugin: defaultMerger },
  { name: "mesh", plugin: meshHandler },
];
