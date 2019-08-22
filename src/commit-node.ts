import * as vscode from 'vscode';
import { Commit } from './git';
import { DateTime } from 'luxon';
import { Repository, Remote } from './ext/git';
import * as md5 from 'md5';

export class CommitNode extends vscode.TreeItem {
	private repository: Repository;

	constructor(commit: Commit, repository: Repository) {
		super(commit.subject);
		
		this.repository = repository;
		this.description = DateTime.fromRFC2822(commit.date).toRelative({ locale: vscode.env.language }) || '';

		if (commit.authorEmail) {
			this.tooltip = commit.authorEmail;
			this.iconPath = vscode.Uri.parse(this.avatarUrl(commit.authorEmail))
		}
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