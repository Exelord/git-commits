import * as vscode from 'vscode';
import { Commit, GitManager } from '../git-manager';
import { Remote } from '../ext/git.d';
import { createHash } from 'crypto';
import { selectUnit } from '@formatjs/intl-utils';
import { ChangeNode } from './change';
import { BaseNode } from './base';

export class CommitNode extends BaseNode {
	private avatarCache = new Map();

	constructor(public commit: Commit, public manager: GitManager) {
		super(commit.message, vscode.TreeItemCollapsibleState.Collapsed);
			
		this.id = commit.hash;
		this.description = this.relativeTime;
		this.contextValue = 'commitNode';

		this.tooltip = [
			`${commit.authorName} (${commit.authorEmail}) -- ${commit.shortHash}`,
			'',
			commit.authorDate,
			'',
			commit.message
		].join('\n');

		if (commit.authorEmail) {
			this.iconPath = this.avatarUrl(commit.authorEmail);
		}
	}

	get relativeTime() {
		const { value, unit } = selectUnit((this.commit.authorDate || new Date()).getTime());
		return new (Intl as any).RelativeTimeFormat(vscode.env.language, { style: 'long' }).format(value, unit);
	}

	async getChildren() {
		const changes = await this.manager.commitChanges(this.commit);
		return changes.map((change) => new ChangeNode(change, this.manager));
	}

	private get remoteHost(): string | undefined {
		const remotes = this.manager.repository.state.remotes;
		const remote = remotes.find((remote: Remote) => remote.name === 'origin') || remotes[0];
		const remoteUrl = remote ? remote.fetchUrl || '' : '';
		const regexp = new RegExp(/@(?<host>\S+)\.\w+[:|\/]/);
		const match = regexp.exec(remoteUrl);
		
		if (match && match.groups) {
			return match.groups.host;
		}
	}

	private avatarUrl(email: string): vscode.Uri {
		if (this.avatarCache.has(email)) { return this.avatarCache.get(email); }

		const avatarUri = vscode.Uri.parse(this.remoteHost === 'github' ? this.githubAvatarUrl(email) : this.gravatarUrl(email));
		this.avatarCache.set(email, avatarUri);

		return avatarUri;
	}

	private githubAvatarUrl(email: string) {
		const match = email.match(/^(\d+)\+[^@]+@users.noreply.github.com$/);

		if (match) {
			return `https://avatars.githubusercontent.com/u/${match[1]}?s=20`;
		} else {
			return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=20`;
		}
	}

	private gravatarUrl(email: string) {
		const hash = createHash("md5").update(email).digest("hex");
		return `https://www.gravatar.com/avatar/${hash}?s=20`;
	}
}