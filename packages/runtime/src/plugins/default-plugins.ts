import { stitchSchemas } from "@graphql-tools/stitch";
import { MergerPlugin } from "../types";

export const defaultMerger: MergerPlugin = (options) =>
  stitchSchemas({
    subschemas: options.sources.map((source) => source.schema),
  });

export const defaultPlugins = [{ name: "stitching", plugin: defaultMerger }];
