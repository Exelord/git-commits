import * as vscode from 'vscode';
import { GitManager, Change } from './git-manager';
import { Status } from './ext/git';

const statuses = {
	[Status.INDEX_ADDED]: { letter: "💚", name: 'Added' },
	[Status.MODIFIED]: { letter: "💛", name: 'Modified' },
	[Status.DELETED]: { letter: "💔", name: 'Deleted' },
	[Status.INDEX_RENAMED]: { letter: "💙", name: 'Renamed' }
};

export class ChangeNode extends vscode.TreeItem {
	relPath: string;
	originalRelPath: string;

	constructor(public change: Change, public manager: GitManager) {
		super(change.uri.fsPath);
		
		this.relPath = change.uri.fsPath.replace(`${change.commit.repository.rootUri.fsPath}/`, '');
		this.originalRelPath = change.originalUri.fsPath.replace(`${change.commit.repository.rootUri.fsPath}/`, '');

		const status = statuses[change.status];
		const parts = this.relPath.split('/');
		
		this.id = change.commit.hash + this.relPath;
		this.label = [status.letter, parts.pop()].filter(Boolean).join(' ');
		this.description = parts.join('/');
		this.resourceUri = change.uri;
		this.tooltip = `${this.relPath} • ${status.name}`;
		this.contextValue = 'changeNode';
		this.command = {
			title: "diff",
			command: "gitCommits.diffChange",
			arguments: [this]
		};
	}
}