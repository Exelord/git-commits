import * as vscode from 'vscode';

export class BaseNode extends vscode.TreeItem {
	async getChildren(_options?: any): Promise<vscode.TreeItem[]> {
		return [];
	}
}