import * as vscode from 'vscode';
import { Repository } from '../ext/git.d';
import { CommitNode } from '../nodes/commit';
import { GitManager } from '../git-manager';
import { ChangeNode } from '../nodes/change';
import { BaseProvider } from './base';

export class GitCommitsProvider extends BaseProvider {
	private currentHead?: string;

	onStateChange(repository: Repository) {
		const headCommit = this.getHeadCommit(repository);

		if (this.currentHead !== headCommit) {
			this.currentHead = headCommit;
			this.refresh();
		}
	}

	onRepositoryChange(repository: Repository) {
		this.currentHead = this.getHeadCommit(repository);
	}

	async getChildren(commitNode?: CommitNode): Promise<vscode.TreeItem[]> {
		if (commitNode) {
			const changes = await commitNode.manager.commitChanges(commitNode.commit);
			return changes.map((change) => new ChangeNode(change, commitNode.manager));
		} else {
			if (!this.manager) { return []; }
			const commits = await this.manager.fetchCommits(20);
			return commits.map((commit) => new CommitNode(commit, this.manager as GitManager));
		}
	}

	private getHeadCommit(repository: Repository) {
		return repository.state.HEAD && repository.state.HEAD.commit;
	}
}