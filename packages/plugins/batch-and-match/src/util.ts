import { WrapQuery } from "@graphql-tools/wrap";
import { Kind, GraphQLOutputType } from "graphql";
import { JSONPath } from "jsonpath-plus";
import hashObject from "object-hash";
import traverse from "traverse";
import _ from "lodash";
import "lodash.product";

export function returnTypeIsList(returnType: GraphQLOutputType) {
  return returnType.toString().startsWith("[");
}

export function addRequirdFieldsToRequest(parentFieldName: string, keyMapping: any) {
  return new WrapQuery(
    // Modify the specified field's selection set
    [parentFieldName],
    (selectionSet) => {
      const result = { ...selectionSet, kind: "SelectionSet" } as any;
      const leafPaths: string[][] = [];
      traverse(keyMapping).map(function () {
        if (this.isLeaf) leafPaths.push(this.path);
      });
      leafPaths.forEach((path) => {
        let currentNode = { selectionSet: result } as any;
        path.forEach((subPath) => {
          const preExistingNode = currentNode.selectionSet?.selections?.find((sel: any) => sel.name.value === subPath);
          if (preExistingNode) {
            currentNode = preExistingNode;
          } else {
            const newField = {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: subPath,
              },
            };
            currentNode.selectionSet = currentNode.selectionSet || {
              kind: "SelectionSet",
            };
            currentNode.selectionSet.selections = currentNode.selectionSet.selections || [];
            currentNode.selectionSet.selections.push(newField);
            currentNode = newField;
          }
        });
      });
      return result;
    },
    (result) => result
  );
}

export function getParentSelectionSetFromJsonPaths(obj: object) {
  let selectionSetObj = traverse(obj)
    .reduce(function (accum) {
      if (this.isLeaf && isJsonPathString(this.node)) accum.push(this.node);
      return accum;
    }, [])
    .map((jsonPath: string) => jsonPath.replace(/(\$\.\.?)|(\[.*?\])/g, ""))
    .reduce((accum: any, jsonPath: string) => _.set(accum, jsonPath, null), {});
  selectionSetObj = _.merge(selectionSetObj.root, selectionSetObj.roots);
  return traverse(selectionSetObj).map(function () {
    this.after(function () {
      if (this.isLeaf) {
        this.update(this.key);
      } else {
        this.update((this.isRoot ? "" : this.key) + "{" + _.values(this.node).join(" ") + "}");
      }
    });
  });
}

/////////////////////////////////////////////////////////////////////////////

export function mapEntitiesToRoots(entities: any, roots: any, keyMapping: any, isList: boolean) {
  const entitiesByHash = _.transform(entities, (result: any, entity: any) => {
    extractCombinatorialSubsets(keyMapping, entity)
      .map((subset: any) => hash(subset))
      .forEach((hash: string) => (result[hash] || (result[hash] = [])).push(entity));
  });
  return roots
    .map((root: any) => entitiesByHash[hash(applyMapping(keyMapping, { root }))])
    .map((group: any[]) => (isList ? group ?? [] : group?.[0] ?? null));
}

export function hash(obj: object | null) {
  return hashObject(obj, { unorderedArrays: true });
}

export function extractCombinatorialSubsets(subsetMapping: any, obj: object | null) {
  if (subsetMapping == null) return [];
  const leafPaths = new Set(getLeafPaths(subsetMapping));
  const mappedObj = extractSubset(subsetMapping, obj);
  const combinatorialSubsets = traverse(mappedObj).map(function () {
    const path = this.path.filter((p) => isNaN(Number(p))).join(".");
    if (Array.isArray(this.node)) {
      this.after(function () {
        this.update(this.node.flat());
      });
    } else if (this.isLeaf || leafPaths.has(path)) {
      this.block();
      this.update([this.node]);
    } else if (typeof this.node === "object") {
      this.after(function () {
        const [objKeys, objValues] = _.unzip(_.entries(this.node));
        const possibleSubsets = (_ as any).product(...objValues).map((prod: any) => _.fromPairs(_.zip(objKeys, prod)));
        this.update(possibleSubsets);
      });
    }
  });
  return combinatorialSubsets ?? null;
}

function getLeafPaths(obj: object | null) {
  return traverse(obj).reduce(function (acc) {
    if (this.isLeaf) acc.push(this.path.join("."));
    return acc;
  }, []);
}

export function extractSubset(mapping: any, obj: object | null) {
  if (mapping == null) return null;
  const leafPaths = getLeafPaths(mapping);
  return traverse(obj).map(function () {
    const path = this.path.filter((p) => isNaN(Number(p))).join(".");
    if (leafPaths.every((leafPath: string) => !leafPath.startsWith(path) && !path.startsWith(leafPath))) this.remove();
  });
}

export function applyMapping(mapping: any, obj: object | null) {
  return (
    traverse(mapping).map(function () {
      if (this.isLeaf && isJsonPathString(this.node)) {
        const [jsonPath, transform] = this.node.split(" | ");
        let result = JSONPath({ path: jsonPath, json: obj, wrap: false });
        if (transform) {
          const transformFn = new Function("$", "return " + transform);
          result = Array.isArray(result) ? result.map(($) => transformFn($)) : transformFn(result);
        }
        this.update(result);
      }
    }) ?? null
  );
}

export function isJsonPathString(node: any) {
  return typeof node === "string" && node.match(/(\$\.)?root(s)?(\[|\.)/g);
}
