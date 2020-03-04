import * as vscode from 'vscode';
import { CommitFile, GitManager } from './git-manager';

const statuses = {
	"added": "💚",
	"modified": "💛",
	"deleted": "💔",
	"renamed": "💙"
};

export class FileNode extends vscode.TreeItem {
	constructor(public file: CommitFile, public manager: GitManager) {
		super(file.relPath);

		const parts = file.relPath.split('/');

		this.id = file.commit.hash + file.relPath;
		this.label = [statuses[file.action], parts.pop()].filter(Boolean).join(' ');
		this.description = parts.join('/');
		this.resourceUri = file.uri;
		this.tooltip = `${file.relPath} • ${file.action}`;
		this.contextValue = 'fileNode';
		this.command = {
			title: "diff",
			command: "gitCommits.diffFile",
			arguments: [this]
		};
	}
}