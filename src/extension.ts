import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';

export function activate(context: vscode.ExtensionContext) {
	const gitCommitsProvider = new GitCommitsProvider();
	
	vscode.window.createTreeView('gitCommits', {
		treeDataProvider: gitCommitsProvider
	});

	vscode.commands.registerCommand('gitCommits.refresh', () => gitCommitsProvider.refresh());
}

export function deactivate() {}
