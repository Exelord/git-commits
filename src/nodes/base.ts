import * as vscode from 'vscode';

export class BaseNode extends vscode.TreeItem {
	async getChildren(): Promise<vscode.TreeItem[]> {
		return [];
	}
}