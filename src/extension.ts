import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';
import { GitManager } from "./git-manager";
import * as tempdir from "temp-dir";
import { join } from 'path';
import { removeSync } from 'fs-extra';

export function activate(context: vscode.ExtensionContext) {
	const gitManager = new GitManager('');
	const gitCommitsProvider = new GitCommitsProvider(gitManager);

	context.subscriptions.push(
		vscode.window.createTreeView('gitCommits', { treeDataProvider: gitCommitsProvider }),
		vscode.commands.registerCommand('gitCommits.diff', gitManager.compareCommitFileAgainstPrevious)
	);
}

export function deactivate() {
	removeSync(join(tempdir, 'vscode.git-commits'));
}