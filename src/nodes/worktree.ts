import * as vscode from "vscode";
import { GitManager, Worktree } from "../git-manager";
import { BaseNode } from "./base";
import { worktreeDecorator } from "../decoration";
import { FileDecoration } from "vscode";

export class WorktreeNode extends BaseNode {
  readonly decoration = new FileDecoration();

  constructor(public worktree: Worktree, public manager: GitManager) {
    super(worktree.uri.path.split("/").pop() as string);

    this.description = [worktree.branch, `(${worktree.shortHash})`]
      .filter(Boolean)
      .join(" ");

    this.contextValue = this.worktree.isOrigin
      ? "worktreeNodeOrigin"
      : this.worktree.isLocked
      ? "worktreeNodeLocked"
      : "worktreeNodeUnlocked";

    this.tooltip = [
      `Path: ${worktree.uri.path}`,
      `Branch: ${worktree.branch}`,
      `Hash: ${worktree.hash}`,
    ]
      .filter(Boolean)
      .join("\n");

    this.iconPath = new vscode.ThemeIcon(
      worktree.isOrigin ? "repo" : "repo-clone"
    );
    this.resourceUri = worktree.uri;

    this.command = {
      title: "Open Worktree",
      command: "gitCommits.openWorktree",
      arguments: [this],
    };

    worktreeDecorator.set(
      this.worktree.uri,
      new FileDecoration(this.worktree.isLocked ? "🔒" : "")
    );
  }

  async lock() {
    await this.manager.lockWorktree(this.worktree);
  }

  async unlock() {
    await this.manager.unlockWorktree(this.worktree);
  }

  async move(path: string) {
    await this.manager.moveWorktree(this.worktree, path);
  }

  async remove() {
    await this.manager.removeWorktree(this.worktree);
  }
}
