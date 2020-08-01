import { stitchSchemas } from "@graphql-tools/stitch";
import { HandlerPlugin, loadMesh } from ".";
import { MergerPlugin } from "./types";

export const defaultMerger: MergerPlugin = (options) =>
  stitchSchemas({
    subschemas: options.schemas,
  });

export const meshHandler: HandlerPlugin = (options) => {
  return loadMesh({ mesh: options.config }, options.loader);
};
