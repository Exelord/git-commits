import * as vscode from 'vscode';
import { GitManager } from '../git-manager';
import { BaseProvider } from './base';
import { CommitNode } from '../nodes/commit';
import { ChangeNode } from '../nodes/change';

export class GitStashesProvider extends BaseProvider {
	async getChildren(commitNode?: CommitNode): Promise<vscode.TreeItem[]> {
		if (commitNode) {
			const changes = await commitNode.manager.commitChanges(commitNode.commit);
			return changes.map((change) => new ChangeNode(change, commitNode.manager));
		} else {
			if (!this.manager) { return []; }
			const commits = await this.manager.fetchStashes();
			return commits.map((commit) => new CommitNode(commit, this.manager as GitManager));
		}
	}
}