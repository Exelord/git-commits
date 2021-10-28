import * as vscode from 'vscode';
import { Commit, GitManager } from '../git-manager';
import { Remote } from '../ext/git.d';
import { selectUnit } from '@formatjs/intl-utils';
import { ChangeNode } from './change';
import { BaseNode } from './base';
import { getAvatarUrl } from '../utils/avatars';

export class CommitNode extends BaseNode {
	private isMergeCommit: boolean;

	constructor(public commit: Commit, public manager: GitManager) {
		super(commit.message, vscode.TreeItemCollapsibleState.Collapsed);
			
		this.id = commit.hash;
		this.description = this.relativeTime;
		this.contextValue = 'commitNode';
		this.isMergeCommit = this.commit.parents.length > 0;

		this.tooltip = [
      `${commit.authorName} (${commit.authorEmail}) -- ${commit.shortHash}`,
      "",
      this.relativeTime,
      commit.authorDate,
      "",
      commit.message,
    ].join("\n");

		if (commit.authorEmail) {
			this.iconPath = vscode.Uri.parse(getAvatarUrl(commit.authorEmail, this.remoteHost));
		}
	}

	get relativeTime() {
		const { value, unit } = selectUnit((this.commit.authorDate || new Date()).getTime());
		return new (Intl as any).RelativeTimeFormat(vscode.env.language, { style: 'long' }).format(value, unit);
	}

	async getChildren(options: { showMergeChildren?: boolean } = {}) {
		if (options.showMergeChildren && this.isMergeCommit) {
			const commits = await this.manager.fetchMergeCommits(this.commit.hash);
			return commits.map((commit) => new CommitNode(commit, this.manager));
		}
		
		const changes = await this.manager.fetchCommitChanges(this.commit);
		return changes.map((change) => new ChangeNode(change, this.manager));
	}

	private get remoteHost(): string | undefined {
		const remotes = this.manager.repository.state.remotes;
		const remote = remotes.find((remote: Remote) => remote.name === 'origin') || remotes[0];
		const remoteUrl = remote ? remote.fetchUrl || '' : '';
		const regexp = new RegExp(/(\/\/|@)(?<host>[a-z][a-z0-9+\-]+)/);
    const match = regexp.exec(remoteUrl);

    if (match && match.groups && match.groups.host) {
      return match.groups.host;
    }
	}
}