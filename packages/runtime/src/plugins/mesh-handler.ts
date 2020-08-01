import { HandlerPlugin, loadMesh } from "..";

export const meshHandler: HandlerPlugin = (options) => {
  return loadMesh({ mesh: options.config }, options.loader);
};
