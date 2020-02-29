import * as vscode from 'vscode';
import { CommitNode } from './commit-node';
import { CommitFile } from './git-manager';

export class FileNode extends vscode.TreeItem {
	constructor(public file: CommitFile) {
		super(file.relPath);

		const statuses = {
			"added": "💚",
			"modified": "💛",
			"deleted": "💔",
			"renamed": "💙"
		};

		const parts = file.relPath.split('/');

		this.id = file.commit.hash + file.relPath;
		this.label = [statuses[file.action], parts.pop()].filter(Boolean).join(' ');
		this.description = parts.join('/');
		this.resourceUri = file.uri;
		this.tooltip = `${file.relPath}\n\n${file.action}`;
		this.contextValue = 'fileNode';
		this.command = {
			title: "diff",
			command: "gitCommits.diff",
			arguments: [file]
		};
	}
}