import { GraphQLSchema } from "graphql";
import { PluginLoader } from "./plugin-loader";
import { defaultMerger } from "../default-plugins";
import {
  Mesh,
  MergerPlugin,
  PluginConfig,
  TransformPlugin,
  HandlerPlugin,
  PluginKind,
  MeshConfig,
  MeshContextFn,
} from "../types";

export function loadMesh(
  config: MeshConfig,
  options?: {
    pluginLoader?: PluginLoader;
    contextBuilder?: MeshContextBuilder;
  }
): Promise<Mesh> {
  return new MeshLoader(config, options).loadMesh();
}
class MeshLoader {
  private pluginLoader: PluginLoader;
  private contextBuilder: MeshContextBuilder;

  constructor(
    private config: MeshConfig,
    options?: {
      pluginLoader?: PluginLoader;
      contextBuilder?: MeshContextBuilder;
    }
  ) {
    const pluginMap = new Map<string, string>();
    (config.plugins || []).forEach((pluginConfig) => {
      const pluginName = Object.keys(pluginConfig)[0];
      const pluginPath = Object.values(pluginConfig)[0];
      pluginMap.set(pluginName, pluginPath);
    });
    this.pluginLoader = options?.pluginLoader || new PluginLoader(pluginMap);
    this.contextBuilder = options?.contextBuilder || new MeshContextBuilder();
  }

  async loadMesh() {
    const sources = await Promise.all(
      this.config.mesh.sources.map(
        async (sourceConfig) => await this.getSource(sourceConfig)
      )
    );
    const mergedSchema = await this.getMergedSchema(sources);
    const transformedSchema = await this.applyTransforms(
      mergedSchema,
      this.config.mesh.transforms
    );
    return {
      schema: transformedSchema,
      contextBuilder: this.contextBuilder,
    };
  }

  async getSource(sourceConfig: MeshConfig["mesh"]["sources"][0]) {
    const [handler, handlerConfig] = await this.loadPlugin(
      sourceConfig.handler
    );
    const handlerSchema = await (handler as HandlerPlugin)({
      kind: PluginKind.Handler,
      name: sourceConfig.name,
      config: handlerConfig,
      loader: this.pluginLoader,
      contextBuilder: this.contextBuilder,
    });
    const transformedSchema = await this.applyTransforms(
      handlerSchema,
      sourceConfig.transforms,
      sourceConfig.name
    );
    return {
      name: sourceConfig.name,
      schema: transformedSchema,
    };
  }

  async getMergedSchema(sources: { name?: string; schema: GraphQLSchema }[]) {
    const mergerConfig = this.config.mesh.merger;
    const [merger, config] = mergerConfig
      ? await this.loadPlugin(mergerConfig)
      : [defaultMerger, null];
    const mergedSchema = await (merger as MergerPlugin)({
      kind: PluginKind.Merger,
      schemas: sources.map((source) => source.schema),
      sources: sources.map((source) => ({
        name: source.name,
        schema: source.schema,
      })),
      config,
      loader: this.pluginLoader,
      contextBuilder: this.contextBuilder,
    });
    return mergedSchema;
  }

  async applyTransforms(
    schema: GraphQLSchema,
    transforms?: MeshConfig["mesh"]["sources"][0]["transforms"],
    name?: string
  ) {
    return (transforms || []).reduce<Promise<GraphQLSchema>>(
      async (currentSchemaPromise, transformConfig) => {
        const currentSchema = await currentSchemaPromise;
        const [transform, config] = await this.loadPlugin(transformConfig);
        const newSchema = await (transform as TransformPlugin)({
          kind: PluginKind.Transform,
          name,
          schema: currentSchema,
          config,
          loader: this.pluginLoader,
          contextBuilder: this.contextBuilder,
        });
        return newSchema;
      },
      Promise.resolve(schema)
    );
  }

  async loadPlugin(pluginConfig: string | PluginConfig) {
    const pluginName =
      typeof pluginConfig === "string"
        ? pluginConfig
        : Object.keys(pluginConfig)[0];
    const config =
      typeof pluginConfig === "string" ? null : Object.values(pluginConfig)[0];
    const plugin = await this.pluginLoader.loadPlugin(pluginName);
    return [plugin, config];
  }
}

export class MeshContextBuilder {
  private contextFunctions: MeshContextFn[] = [];

  addContextFn(contextFn: MeshContextFn) {
    this.contextFunctions.push(contextFn);
  }

  buildContextFn() {
    return this.contextFunctions.reduce(
      (accum, contextFn) => (initialContext) => ({
        ...accum(initialContext),
        ...contextFn(initialContext),
      }),
      (i) => i
    );
  }
}
