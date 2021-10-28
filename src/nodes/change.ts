import { GitManager, Change } from '../git-manager';
import { Status } from '../ext/git.d';
import { BaseNode } from './base';
import { decorations } from "../decoration";
import { FileDecoration } from "vscode";

const statuses = {
  [Status.INDEX_ADDED]: { letter: "💚", name: "Added" },
  [Status.MODIFIED]: { letter: "💛", name: "Modified" },
  [Status.DELETED]: { letter: "💔", name: "Deleted" },
  [Status.INDEX_RENAMED]: { letter: "💙", name: "Renamed" },
};

export class ChangeNode extends BaseNode {
  relPath: string;
  originalRelPath: string;

  constructor(public change: Change, public manager: GitManager) {
    super(change.uri.fsPath);

    this.relPath = change.uri.fsPath.replace(
      `${change.commit.repository.rootUri.fsPath}/`,
      ""
    );
    this.originalRelPath = change.originalUri.fsPath.replace(
      `${change.commit.repository.rootUri.fsPath}/`,
      ""
    );

    const status = statuses[change.status];
    const parts = this.relPath.split("/");

    decorations.set(
      change.uri.toString(),
      new FileDecoration(status.letter, status.name)
    );

    this.id = change.commit.hash + this.relPath;
    this.label = parts.pop();
    this.description = parts.join("/");
    this.resourceUri = change.uri;
    this.tooltip = this.relPath;
    this.contextValue = "changeNode";
    this.command = {
      title: "diff",
      command: "gitCommits.diffChange",
      arguments: [this],
    };
  }
}