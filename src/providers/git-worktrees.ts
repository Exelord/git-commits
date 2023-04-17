import * as vscode from "vscode";
import { BaseProvider } from "./base";
import { WorktreeNode } from "../nodes/worktree";
import { GitManager } from "../git-manager";

export class GitWorktreesProvider extends BaseProvider {
  emptyMessage = "No worktrees could be found.";

  async getTreeItems(manager: GitManager): Promise<vscode.TreeItem[]> {
    const worktrees = await manager.fetchWorktrees();
    return worktrees.map((worktree) => new WorktreeNode(worktree, manager));
  }
}
