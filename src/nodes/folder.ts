import * as vscode from "vscode";
import { BaseNode } from "./base";

export type FolderNodeOptions = {
  parentId?: string;
};

export class FolderNode extends BaseNode {
  constructor(
    name: string,
    private children: BaseNode[],
    options: FolderNodeOptions = {}
  ) {
    super(name, vscode.TreeItemCollapsibleState.Expanded);

    this.id = [options.parentId || "", name].join("->");
    this.contextValue = "folderNode";
    this.resourceUri = vscode.Uri.parse(name);
  }

  async getChildren(_options?: any): Promise<vscode.TreeItem[]> {
    return this.children;
  }
}
