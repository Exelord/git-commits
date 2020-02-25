import * as vscode from 'vscode';
import { Commit } from './git-manager';
import { Repository, Remote } from './ext/git';
import { createHash } from 'crypto';

export class CommitNode extends vscode.TreeItem {
	private avatarCache = new Map();

	constructor(private commit: Commit, private repository: Repository) {
		super(commit.subject, vscode.TreeItemCollapsibleState.Collapsed);
			
		this.id = commit.hash;
		this.description = commit.timePassed;

		if (commit.email) {
			this.tooltip = commit.email;
			this.iconPath = this.avatarUrl(commit.email);
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