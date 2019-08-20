import * as vscode from 'vscode';
import { Commit } from './git';
import { DateTime } from 'luxon';

export class CommitNode extends vscode.TreeItem {
	constructor(commit: Commit) {
		super(commit.subject);

		this.description = DateTime.fromRFC2822(commit.date).toRelative({ locale: vscode.env.language }) || '';

		if (commit.authorEmail) {
			this.tooltip = commit.authorEmail;
			this.iconPath = vscode.Uri.parse(this.avatarUrl(commit.authorEmail))
		}
	}

	private avatarUrl(email: string) {
		const match = email.match(/^(\d+)\+[^@]+@users.noreply.github.com$/);

		if (match) {
			return `https://avatars.githubusercontent.com/u/${match[1]}?s=20`;
		} else {
			return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=20`;
		}
	}
}