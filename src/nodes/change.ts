import { GitManager, Change } from '../git-manager';
import { Status } from '../ext/git.d';
import { BaseNode } from './base';
import { changeDecorator } from "../decoration";
import { FileDecoration } from "vscode";

export type ChangeNodeOptions = {
  parentId?: string;
};

const statuses = {
  [Status.INDEX_ADDED]: { letter: "💚", name: "Added" },
  [Status.MODIFIED]: { letter: "💛", name: "Modified" },
  [Status.DELETED]: { letter: "💔", name: "Deleted" },
  [Status.INDEX_RENAMED]: { letter: "💙", name: "Renamed" },
};

export class ChangeNode extends BaseNode {
  relPath: string;
  originalRelPath: string;

  constructor(
    public change: Change,
    public manager: GitManager,
    options: ChangeNodeOptions = {}
  ) {
    super(change.uri.path);

    this.relPath = change.uri.path.replace(
      `${change.commit.repository.rootUri.path}/`,
      ""
    );
    this.originalRelPath = change.originalUri.path.replace(
      `${change.commit.repository.rootUri.path}/`,
      ""
    );

    const status = statuses[change.status];
    const parts = this.relPath.split("/");

    changeDecorator.set(
      change.uri,
      new FileDecoration(status.letter, status.name)
    );

    this.id = [options.parentId || "", this.relPath].join("->");
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