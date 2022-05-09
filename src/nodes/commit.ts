import * as vscode from 'vscode';
import { Commit, GitManager } from "../git-manager";
import { Remote } from "../ext/git.d";
import { ChangeNode } from "./change";
import { BaseNode } from "./base";
import { getAvatarUrl } from "../utils/avatars";
import { buildTree } from "../utils/build-tree";
import { selectUnit } from "../utils/date";

export type CommitNodeOptions = {
  viewAsTree?: boolean;
  parentId?: string;
};

export class CommitNode extends BaseNode {
  private isMergeCommit: boolean;

  constructor(
    public commit: Commit,
    public manager: GitManager,
    private options: CommitNodeOptions = {}
  ) {
    super(commit.message, vscode.TreeItemCollapsibleState.Collapsed);

    this.id = [options.parentId || "", commit.hash].join("->");
    this.isMergeCommit = this.commit.parents.length > 0;
    this.description = this.relativeTime;
    this.contextValue = "commitNode";

    this.tooltip = [
      `${commit.authorName} (${commit.authorEmail}) -- ${commit.shortHash}`,
      "",
      this.relativeTime,
      commit.authorDate,
      "",
      commit.message,
    ].join("\n");

    if (commit.authorEmail) {
      this.iconPath = vscode.Uri.parse(
        getAvatarUrl(commit.authorEmail, this.remoteHost)
      );
    }
  }

  get relativeTime() {
    const { value, unit } = selectUnit(this.commit.authorDate || new Date());
    return new Intl.RelativeTimeFormat(vscode.env.language, {
      style: "long",
    }).format(value, unit);
  }

  async getChildren(
    options: { showMergeChildren?: boolean } = {}
  ): Promise<vscode.TreeItem[]> {
    if (options.showMergeChildren && this.isMergeCommit) {
      const commits = await this.manager.fetchMergeCommits(this.commit.hash);
      return commits.map(
        (commit) =>
          new CommitNode(commit, this.manager, {
            viewAsTree: this.options.viewAsTree,
            parentId: this.id,
          })
      );
    }

    const changes = await this.manager.fetchCommitChanges(this.commit);
    const changeNodes = changes.map(
      (change) => new ChangeNode(change, this.manager, { parentId: this.id })
    );

    if (this.options.viewAsTree) {
      return buildTree(
        changeNodes,
        this.manager.repository.rootUri.path,
        this.id
      );
    }

    return changeNodes;
  }

  private get remoteHost(): string | undefined {
    const remotes = this.manager.repository.state.remotes;
    const remote =
      remotes.find((remote: Remote) => remote.name === "origin") || remotes[0];
    const remoteUrl = remote ? remote.fetchUrl || "" : "";
    const regexp = new RegExp(/(\/\/|@)(?<host>[a-z][a-z0-9+\-]+)/);
    const match = regexp.exec(remoteUrl);

    if (match && match.groups && match.groups.host) {
      return match.groups.host;
    }
  }
}