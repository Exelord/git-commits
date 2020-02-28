import { FileNode } from './file-node';
import { CommitNode } from './commit-node';
import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';
import { GitManager, Commit, CommitFile } from "./git-manager";

export function activate(context: vscode.ExtensionContext) {
	const gitManager = new GitManager('');
	const gitCommitsProvider = new GitCommitsProvider(gitManager);

	context.subscriptions.push(
		vscode.window.createTreeView('gitCommits', { 
      treeDataProvider: gitCommitsProvider, 
      showCollapseAll: true 
    }),
		
		vscode.commands.registerCommand('gitCommits.diff', async (commit: Commit, file: CommitFile) => {
			return gitManager.compareCommitFileAgainstPrevious(commit, file);
		}),
		
		vscode.commands.registerCommand('gitCommits.copyCommitHash', (item: CommitNode) => {
			return vscode.env.clipboard.writeText(item.commit.hash);
		}),

		vscode.commands.registerCommand('gitCommits.copyFilePath', (item: FileNode) => {
			return vscode.env.clipboard.writeText(item.file.relPath);
		}),
	);
}

export function deactivate() {}
