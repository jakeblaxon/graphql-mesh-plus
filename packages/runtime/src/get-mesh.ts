import { stitchSchemas } from "@graphql-tools/stitch";
import { GetMeshOptions, MeshPlugin, MeshContextBuilder, Mesh } from "./types";

export async function getMesh(options: GetMeshOptions): Promise<Mesh> {
  const meshSources = await Promise.all(
    options.sources.map((source) => getSourceMesh(source))
  );
  const mergedMesh = await getMergedMesh(meshSources, options.merger);
  return applyTransforms(mergedMesh, options.transforms);
}

async function getSourceMesh(source: GetMeshOptions["sources"][0]) {
  const mesh = await source.handler.applyPlugin({
    config: source.handler.config,
  });
  return applyTransforms(mesh, source.transforms, { sourceName: source.name });
}

async function getMergedMesh(
  meshes: Mesh[],
  merger?: GetMeshOptions["merger"],
  info?: any
) {
  const defaultMerger: MeshPlugin = {
    applyPlugin: (options: any) => ({
      schema: stitchSchemas({
        subschemas: options.params.schemas,
      }),
    }),
  };
  merger = merger || defaultMerger;
  const mergedMesh = await merger.applyPlugin({
    schemas: meshes.map((mesh) => mesh.schema),
    config: merger.config,
    info: { ...info, meshes },
  });
  return combineMeshes(mergedMesh, meshes);
}

async function applyTransforms(
  mesh: Mesh,
  transforms?: MeshPlugin[],
  info?: any
) {
  return (transforms || []).reduce(async (currentMeshPromise, transform) => {
    const currentMesh = await currentMeshPromise;
    const newMesh = await transform.applyPlugin({
      schema: currentMesh.schema,
      config: transform.config,
      info,
    });
    return combineMeshes(newMesh, [currentMesh]);
  }, Promise.resolve(mesh));
}

function combineMeshes(newMesh: Mesh, oldMeshes: Mesh[]) {
  return {
    ...newMesh,
    contextBuilder: combineContextBuilders(
      newMesh.contextBuilder,
      ...oldMeshes.map((mesh) => mesh.contextBuilder)
    ),
  };
}

function combineContextBuilders(
  ...contextBuilders: (MeshContextBuilder | undefined)[]
): MeshContextBuilder | undefined {
  return contextBuilders.reduce((accum, contextBuilder) => {
    return contextBuilder
      ? async (initalContext?: any) => ({
          ...(await accum?.(initalContext)),
          ...(await contextBuilder(initalContext)),
        })
      : accum;
  }, i => i);
}
