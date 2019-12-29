import * as vscode from 'vscode';
import { CommitNode } from './commit-node';

export class PathNode extends vscode.TreeItem {
	path: string;

	constructor(path: string, parent: CommitNode) {
		super(path);
		
		const parts = path.split('/');

		this.path = path;
		this.label = parts.pop();
		this.description = parts.join('/');
		this.resourceUri = vscode.Uri.file(path);
		this.iconPath = vscode.ThemeIcon.File;
	}
}