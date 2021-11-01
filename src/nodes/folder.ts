import * as vscode from "vscode";
import { BaseNode } from "./base";

export class FolderNode extends BaseNode {
  constructor(name: string, private children: BaseNode[]) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "folderNode";
    this.resourceUri = vscode.Uri.parse(name);
  }

  async getChildren(_options?: any): Promise<vscode.TreeItem[]> {
    return this.children;
  }
}
