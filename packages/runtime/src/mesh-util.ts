import { Mesh, MeshContextBuilder } from "./types";

export function combineMeshes(newMesh: Mesh, oldMeshes: Mesh[]): Mesh {
  return {
    ...newMesh,
    contextBuilder: combineContextBuilders(
      newMesh.contextBuilder,
      ...oldMeshes.map((mesh) => mesh.contextBuilder)
    ),
  };
}

export function combineContextBuilders(
  ...contextBuilders: (MeshContextBuilder | undefined)[]
): MeshContextBuilder | undefined {
  return contextBuilders.reduce(
    (accum, contextBuilder) => {
      return contextBuilder
        ? async (initalContext?: any) => ({
            ...(await accum?.(initalContext)),
            ...(await contextBuilder(initalContext)),
          })
        : accum;
    },
    (i) => i
  );
}
