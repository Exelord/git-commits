import * as vscode from 'vscode';
import { Commit } from './git';
import { DateTime } from 'luxon';
import { Repository, Remote } from './ext/git';
import * as md5 from 'md5';
import { diff } from './git';
import { PathNode } from './path-node';

export class CommitNode extends vscode.TreeItem {
	repository: Repository;
	commit: Commit;

	constructor(commit: Commit, repository: Repository) {
		super(commit.subject, vscode.TreeItemCollapsibleState.Collapsed);
		
		this.commit = commit;
		this.repository = repository;
		this.description = DateTime.fromRFC2822(commit.date).toRelative({ locale: vscode.env.language }) || '';

		if (commit.authorEmail) {
			this.tooltip = commit.authorEmail;
			this.iconPath = vscode.Uri.parse(this.avatarUrl(commit.authorEmail))
		}
	}

	async getChildren(): Promise<vscode.TreeItem[]> {
		const files = await diff(this.repository, this.commit);
		
		return files.sort((a, b) => {
			const aParts = a.split("/");
			const bParts = b.split("/");
		
			if (aParts.length < bParts.length) return 1;
			return aParts.find((aPart, index) => aPart > bParts[index]) ? -1 : 1;
		}).map((path) => new PathNode(path, this));
	}

	private get remoteHost(): string | undefined {
		const remotes = this.repository._repository.remotes;
		const remote = remotes.find((remote: Remote) => remote.name === 'origin') || remotes[0];
		const remoteUrl = remote ? remote.fetchUrl : '';
		const regexp = new RegExp(/@(?<host>\S+)\.\w+[:|\/]/);
		const match = regexp.exec(remoteUrl);
		
		if (match && match.groups) {
			return match.groups.host;
		};
	}

	private avatarUrl(email: string) {
		if (this.remoteHost === 'github') {
			return this.githubAvatarUrl(email);
		}

		return this.gravatarUrl(email);
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
		return `https://www.gravatar.com/avatar/${md5(email)}?s=20`;
	}
}