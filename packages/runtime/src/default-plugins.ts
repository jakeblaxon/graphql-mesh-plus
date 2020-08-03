import { stitchSchemas } from "@graphql-tools/stitch";
import { EventEmitter } from "events";
import { HandlerPlugin, loadMesh } from ".";
import { MergerPlugin, Hooks } from "./types";

export const defaultMerger: MergerPlugin = (options) =>
  stitchSchemas({
    subschemas: options.schemas,
  });

export const meshHandler: HandlerPlugin = async (options) => {
  const hooks = new EventEmitter() as Hooks;
  hooks.setMaxListeners(Infinity);
  options.hooks.on("destroy", () => hooks.emit("destroy"));
  return (
    await loadMesh(
      { mesh: options.config },
      {
        pluginLoader: options.loader,
        contextBuilder: options.contextBuilder,
        hooks,
      }
    )
  ).schema;
};
