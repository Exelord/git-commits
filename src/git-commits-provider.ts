import * as vscode from 'vscode';
import { Repository, API } from './ext/git.d';
import { CommitNode } from './commit-node';
import { GitManager } from './git-manager';
import { ChangeNode } from './change-node';

export class GitCommitsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<CommitNode | undefined> = new vscode.EventEmitter<CommitNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<CommitNode | undefined> = this._onDidChangeTreeData.event;
	
	protected _stateObserver?: vscode.Disposable;
	protected currentState?: string;
	protected manager?: GitManager;

	constructor(public gitApi: API) {
		gitApi.repositories.forEach((repository) => {
			if (repository.ui.selected) { this.setupManager(repository); }
			
			repository.ui.onDidChange(() => this.setupManager(repository));
		});
		
		gitApi.onDidOpenRepository((repository) => {
			this.setupManager(repository);
			repository.ui.onDidChange(() => this.setupManager(repository));
		});
	}

	setupManager(repository: Repository | undefined) {
		if (repository && repository.ui.selected) {
			this.manager = new GitManager(this.gitApi, repository);
			this.currentState = this.getHeadCommit(repository);
			this.observeRepositoryState(repository);
			this.refresh();
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: CommitNode): vscode.TreeItem {
		return element;
	}

	async getChildren(commitNode?: CommitNode): Promise<vscode.TreeItem[]> {
		if (commitNode) {
			const changes = await commitNode.manager.commitChanges(commitNode.commit);
			return changes.map((change) => new ChangeNode(change, commitNode.manager));
		} else {
			if (!this.manager) { return []; }
			const commits = await this.fetchCommits(this.manager);
			return commits.map((commit) => new CommitNode(commit, this.manager as GitManager));
		}
	}

	protected async fetchCommits(manager: GitManager) {
		return manager.fetchCommits(20);
	}

	protected observeRepositoryState(repository: Repository) {
		if (this._stateObserver) { this._stateObserver.dispose(); }
		
		this._stateObserver = repository.state.onDidChange(() => {
			const headCommit = this.getHeadCommit(repository);

			if (this.currentState !== headCommit) {
				this.currentState = headCommit;
				this.refresh();
			}
		});
	}

	private getHeadCommit(repository: Repository) {
		return repository.state.HEAD && repository.state.HEAD.commit;
	}
}