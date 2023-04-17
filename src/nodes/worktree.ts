import * as vscode from "vscode";
import { GitManager, Worktree } from "../git-manager";
import { BaseNode } from "./base";
import { worktreeDecorator } from "../decoration";
import { FileDecoration } from "vscode";

export class WorktreeNode extends BaseNode {
  readonly decoration = new FileDecoration();

  constructor(public worktree: Worktree, public manager: GitManager) {
    super(worktree.uri.path.split("/").pop() as string);

    this.contextValue = "worktreeNode";

    this.description = `${worktree.branch} (${worktree.shortHash})`;

    this.tooltip = [
      `Path: ${worktree.uri.path}`,
      `Branch: ${worktree.branch}`,
      `Hash: ${worktree.hash}`,
    ]
      .filter(Boolean)
      .join("\n");

    this.iconPath = new vscode.ThemeIcon("file-submodule");
    this.resourceUri = worktree.uri;

    worktreeDecorator.set(
      worktree.uri,
      new FileDecoration(worktree.isLocked ? "🔒" : "")
    );

    this.command = {
      title: "Open Worktree",
      command: "gitCommits.openWorktree",
      arguments: [this],
    };
  }
}
