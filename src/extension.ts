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
		
		vscode.commands.registerCommand('gitCommits.diff', async (file: CommitFile) => {
			return gitManager.compareCommitFileAgainstPrevious(file);
		}),

		vscode.commands.registerCommand('gitCommits.revertFile', async (item: FileNode) => {
			const result = await vscode.window.showInformationMessage("Are you sure you want to revert these file's changes?", { modal: true }, {title: 'Revert changes'});

			if (result) {
				return gitManager.revertFile(item.file, item.file.commit);
			}
		}),
		
		vscode.commands.registerCommand('gitCommits.copyCommitHash', async (item: CommitNode) => {
			return vscode.env.clipboard.writeText(item.commit.hash);
		}),

		vscode.commands.registerCommand('gitCommits.copyFilePath', async (item: FileNode) => {
			return vscode.env.clipboard.writeText(item.file.relPath);
		}),

		vscode.commands.registerCommand('gitCommits.openFile', async (item: FileNode) => {
			const states = {
				deleted: item.file.commit.parentHash,
				added: item.file.commit.hash,
				modified: item.file.commit.hash,
				renamed: item.file.commit.hash,
			};

			const hash = states[item.file.action];
			await vscode.commands.executeCommand('vscode.open', gitManager.getCommitFileUri(hash, item.file.relPath));
		})
	);
}

export function deactivate() {}
