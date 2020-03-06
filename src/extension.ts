import { ChangeNode } from './change-node';
import { CommitNode } from './commit-node';
import * as vscode from 'vscode';
import { GitCommitsProvider } from './git-commits-provider';
import { GitExtension, Status } from './ext/git';

import * as childProcess from 'child_process';
import * as fs from 'fs';

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
			const fileExist = fs.existsSync(item.change.uri.fsPath);
			if (!fileExist) { return vscode.window.showErrorMessage('This files does not exist anymore'); }
			await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(item.change.uri.fsPath));
		}),

		vscode.commands.registerCommand('gitCommits.revertChange', async (item: ChangeNode) => {
			const result = await vscode.window.showInformationMessage("Are you sure you want to revert these changes?", { modal: true }, { title: 'Revert changes' });

			
			if (result) {
				let command;

				if (item.change.status === Status.INDEX_ADDED) {
					const fileExist = fs.existsSync(item.change.uri.fsPath);
					
					if (fileExist) {
						command = `rm '${item.relPath}' && git add '${item.relPath}'`;	
					} else {
						await vscode.window.showInformationMessage('This change is already reverted');
					}
				} else {
					command = `git checkout ${item.change.commit.parentHash} -- '${item.originalRelPath}'`;
				}

				if (command) {
					childProcess.execSync(command, { cwd: item.change.commit.repository.rootUri.fsPath });
					await vscode.window.showInformationMessage('Change has been reverted');
				}
			}
		})
	);
}

export function deactivate() {}
