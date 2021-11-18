import { BaseNode } from "../nodes/base";
import { FolderNode } from "../nodes/folder";

export const FILES = Symbol("files");

export function buildTree(
  nodes: BaseNode[],
  rootPath: string,
  parentId?: string
) {
  const structure = new Map();

  nodes.forEach((node) => {
    const names = node.resourceUri?.path.replace(rootPath, "").split("/");

    if (!names) {
      return;
    }

    names.shift();
    names.pop();

    const parentFolder = names.reduce((parent, current) => {
      if (!parent.has(current)) {
        parent.set(current, new Map());
      }

      return parent.get(current);
    }, structure);

    if (!parentFolder.has(FILES)) {
      parentFolder.set(FILES, new Set());
    }

    parentFolder.get(FILES).add(node);
  });

  return makeTree(structure, parentId);
}

function makeTree(map: Map<any, any>, parentId?: string) {
  const tree: any[] = [];

  [...map.keys()].forEach((k) => {
    const v = map.get(k);

    if (!v) {
      return;
    }

    if (k === FILES) {
      tree.push(...v);
    } else {
      tree.push(
        new FolderNode(k, makeTree(v, [parentId || "", k].join("->")), {
          parentId,
        })
      );
    }
  });

  return tree;
}
