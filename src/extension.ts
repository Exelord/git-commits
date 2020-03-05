import { ChangeNode } from './change-node';
import { CommitNode } from './commit-node';
import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';
import { GitExtension, Status } from './ext/git';

export function activate(context: vscode.ExtensionContext) {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');

	if (!gitExtension || !gitExtension.isActive) { return; }

	const gitApi = gitExtension.exports.getAPI(1);
	const gitCommitsProvider = new GitCommitsProvider(gitApi);

	context.subscriptions.push(
		vscode.window.createTreeView('gitCommits', { 
      treeDataProvider: gitCommitsProvider, 
      showCollapseAll: true 
		}),
		
		vscode.commands.registerCommand('gitCommits.copyCommitHash', async (item: CommitNode) => {
			await vscode.env.clipboard.writeText(item.commit.hash);
		}),
		
		vscode.commands.registerCommand('gitCommits.diffChange', async (item: ChangeNode) => {
			await item.manager.diffChange(item.change);
		}),

		vscode.commands.registerCommand('gitCommits.copyFilePath', async (item: ChangeNode) => {
			await vscode.env.clipboard.writeText(item.relPath);
		}),

		vscode.commands.registerCommand('gitCommits.openFile', async (item: ChangeNode) => {
			const uri = item.change.status === Status.DELETED ? item.change.originalUri : item.change.uri;
			await vscode.commands.executeCommand('vscode.open', uri);
		})
	);
}

export function deactivate() {}
