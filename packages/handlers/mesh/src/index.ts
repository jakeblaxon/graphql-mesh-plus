import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { getMesh } from '@graphql-mesh/runtime';
import { processConfig } from '@jakeblaxon-graphql-mesh/runtime';

const handler: MeshHandlerLibrary<any> = {
  async getMeshSource({ name, cache, config, hooks }) {
    const meshConfig = await processConfig(config);
    // @ts-ignore
    return await getMesh({
      ...meshConfig,
      cache: meshConfig.cache || cache,
      hooks,
    });
  },
};

export default handler;
