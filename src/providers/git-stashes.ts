import * as vscode from 'vscode';
import { GitManager } from '../git-manager';
import { BaseProvider } from './base';
import { CommitNode } from '../nodes/commit';

export class GitStashesProvider extends BaseProvider {
	emptyMessage = 'No stashes could be found.';

	async getTreeItems(manager: GitManager): Promise<vscode.TreeItem[]> {
		const commits = await manager.fetchStashes();
		return commits.map((commit) => new CommitNode(commit, manager));
	}
}