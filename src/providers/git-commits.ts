import * as vscode from 'vscode';
import { Repository } from '../ext/git.d';
import { CommitNode } from '../nodes/commit';
import { BaseProvider } from './base';
import { GitManager } from '../git-manager';

export class GitCommitsProvider extends BaseProvider {
  emptyMessage = "No commits could be found.";

  private currentHead?: string;

  get childrenOptions() {
    return { showMergeChildren: true };
  }

  onStateChange(repository: Repository) {
    const headCommit = this.getHeadCommit(repository);

    if (this.currentHead === headCommit) {
      return;
    }

    this.currentHead = headCommit;
    super.onStateChange(repository);
  }

  onRepositoryChange(repository: Repository) {
    this.currentHead = this.getHeadCommit(repository);
  }

  async getTreeItems(manager: GitManager): Promise<vscode.TreeItem[]> {
    const commits = await manager.fetchCommits(30);
    return commits.map((commit) => new CommitNode(commit, manager));
  }

  private getHeadCommit(repository: Repository) {
    return repository.state.HEAD && repository.state.HEAD.commit;
  }
}