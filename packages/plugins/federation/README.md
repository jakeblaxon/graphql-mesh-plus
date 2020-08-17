# Federation

This plugin is a handler, transform, and merger.

## Handler

When used as a handler, this plugin will build a federated schema from external typedefs and resolvers.

> ### Config API Reference
>
> - `typedefs` (`string`, required): the file path containing the schema typeDefs.
> - `resolvers` (`string`, required): the file path containing the schema's exported resolvers object (e.g. `./my-schema#resolvers`).

## Transform

When used as a transform, this plugin will add federation definitions to an existing schema. It behaves identically to the standard `@graphql-mesh/transform-federation` plugin. See the [docs](https://graphql-mesh.com/docs/transforms/federation) for the config api reference.

## Merger

When used as a merger, this plugin will merge federated schemas together using the Apollo Gateway. It behaves identically to the standard `@graphql-mesh/merger-federation` plugin. It does not take any configs.
