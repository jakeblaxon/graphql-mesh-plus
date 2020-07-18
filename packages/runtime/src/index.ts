import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { YamlConfig } from '@graphql-mesh/types';
import {
  ConfigProcessOptions,
  MeshResolvedSource,
  ResolvedTransform,
} from "@graphql-mesh/runtime";
import {
  getHandler,
  getPackage,
  resolveAdditionalResolvers,
  resolveCache,
  resolveMerger,
  resolveAdditionalTypeDefs,
} from './utils';

export async function processConfig(config: YamlConfig.Config, options?: ConfigProcessOptions) {
  const { dir = process.cwd(), ignoreAdditionalResolvers = false } = options || {};
  await Promise.all(config.require?.map(mod => import(mod)) || []);

  const [sources, transforms, additionalTypeDefs, additionalResolvers, cache, merger] = await Promise.all([
    Promise.all(
      config.sources.map<Promise<MeshResolvedSource>>(async source => {
        const handlerName = Object.keys(source.handler)[0];
        const handlerConfig = source.handler[handlerName];
        const [handlerLibrary, transforms] = await Promise.all([
          getHandler(handlerName),
          Promise.all(
            (source.transforms || []).map(async t => {
              const transformName: keyof YamlConfig.Transform = Object.keys(t)[0];
              const transformConfig = t[transformName];
              const transformLibrary = await getPackage<ResolvedTransform['transformLibrary']>(
                transformName,
                'transform'
              );

              return {
                config: transformConfig,
                transformLibrary,
              };
            })
          ),
        ]);

        return {
          name: source.name,
          handlerConfig,
          handlerLibrary,
          transforms,
        };
      })
    ),
    Promise.all(
      config.transforms?.map(async t => {
        const transformName = Object.keys(t)[0] as keyof YamlConfig.Transform;
        const transformConfig = t[transformName];
        const TransformLibrary = await getPackage<ResolvedTransform['transformLibrary']>(transformName, 'transform');
        return {
          config: transformConfig,
          transformLibrary: TransformLibrary,
        };
      }) || []
    ),
    resolveAdditionalTypeDefs(dir, config.additionalTypeDefs),
    resolveAdditionalResolvers(dir, ignoreAdditionalResolvers ? [] : config.additionalResolvers || []),
    resolveCache(config.cache),
    resolveMerger(config.merger),
  ]);

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    merger,
    mergerType: config.merger,
  };
}

function customLoader(ext: 'json' | 'yaml' | 'js') {
  function loader(filepath: string, content: string) {
    if (typeof process !== 'undefined' && 'env' in process) {
      content = content.replace(/\$\{(.*?)\}/g, (_, variable) => {
        let varName = variable;
        let defaultValue = '';

        if (variable.includes(':')) {
          const spl = variable.split(':');
          varName = spl.shift();
          defaultValue = spl.join(':');
        }

        return process.env[varName] || defaultValue;
      });
    }

    if (ext === 'json') {
      return defaultLoaders['.json'](filepath, content);
    }

    if (ext === 'yaml') {
      return defaultLoaders['.yaml'](filepath, content);
    }

    if (ext === 'js') {
      return defaultLoaders['.js'](filepath, content);
    }
  }

  return loader;
}

export async function findAndParseConfig(options?: { configName?: string } & ConfigProcessOptions) {
  const { configName = 'mesh', dir = process.cwd(), ignoreAdditionalResolvers = false } = options || {};
  const explorer = cosmiconfig(configName, {
    loaders: {
      '.json': customLoader('json'),
      '.yaml': customLoader('yaml'),
      '.yml': customLoader('yaml'),
      '.js': customLoader('js'),
      noExt: customLoader('yaml'),
    },
  });
  const results = await explorer.search(dir);
  const config = results?.config;
  return processConfig(config, { dir, ignoreAdditionalResolvers });
}
