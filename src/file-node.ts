import * as vscode from 'vscode';
import { CommitNode } from './commit-node';
import { CommitFile } from './git-manager';

export class FileNode extends vscode.TreeItem {
	constructor(public file: CommitFile, public commitNode: CommitNode) {
		super(file.relPath);

		const statuses = {
			"added": "💚",
			"modified": "💛",
			"deleted": "💔",
			"renamed": "💙"
		};

		const parts = file.relPath.split('/');

		this.id = commitNode.id + file.relPath;
		this.label = [statuses[file.action], parts.pop()].filter(Boolean).join(' ');
		this.description = parts.join('/');
		this.resourceUri = vscode.Uri.file(file.relPath);
		this.tooltip = `${file.relPath}\n\n${file.action}`;
		this.contextValue = 'fileNode';
		this.command = {
			title: "diff",
			command: "gitCommits.diff",
			arguments: [commitNode.commit, file]
		};
	}
}