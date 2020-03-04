import { FileNode } from './file-node';
import { CommitNode } from './commit-node';
import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';

export function activate(context: vscode.ExtensionContext) {
	const gitCommitsProvider = new GitCommitsProvider();

	context.subscriptions.push(
		vscode.window.createTreeView('gitCommits', { 
      treeDataProvider: gitCommitsProvider, 
      showCollapseAll: true 
		}),
		
		vscode.commands.registerCommand('gitCommits.copyCommitHash', async (item: CommitNode) => {
			return vscode.env.clipboard.writeText(item.commit.hash);
		}),
		
		vscode.commands.registerCommand('gitCommits.diffFile', async (item: FileNode) => {
			return item.manager.compareCommitFileAgainstPrevious(item.file);
		}),

		vscode.commands.registerCommand('gitCommits.revertFile', async (item: FileNode) => {
			const result = await vscode.window.showInformationMessage("Are you sure you want to revert these file's changes?", { modal: true }, {title: 'Revert changes'});

			if (result) {
				return item.manager.revertFile(item.file, item.file.commit);
			}
		}),

		vscode.commands.registerCommand('gitCommits.copyFilePath', async (item: FileNode) => {
			return vscode.env.clipboard.writeText(item.file.relPath);
		}),

		vscode.commands.registerCommand('gitCommits.openFile', async (item: FileNode) => {
			const hash = item.file.action === 'deleted' ? item.file.commit.parentHash : item.file.commit.hash;

			return vscode.commands.executeCommand('vscode.open', item.manager.getCommitFileUri(hash, item.file.relPath));
		})
	);
}

export function deactivate() {}
