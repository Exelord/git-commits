import * as vscode from 'vscode';
import { GitExtension, Repository } from './ext/git';
import { CommitNode } from './commit-node';
import { GitManager } from './git-manager';
import { FileNode } from './file-node';

export class GitCommitsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<CommitNode | undefined> = new vscode.EventEmitter<CommitNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<CommitNode | undefined> = this._onDidChangeTreeData.event;
	
	private _stateObserver?: vscode.Disposable;
	private currentState?: string;
	private manager?: GitManager;

	constructor() {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');

		if (gitExtension && gitExtension.isActive) {
			const git = gitExtension.exports.getAPI(1);

			git.repositories.forEach((repository) => {
				if (repository.ui.selected) { this.setupManager(repository); }
				
				repository.ui.onDidChange(() => this.setupManager(repository));
			});
			
			git.onDidOpenRepository((repository) => {
				this.setupManager(repository);
				repository.ui.onDidChange(() => this.setupManager(repository));
			});
		}
	}

	setupManager(repository: Repository | undefined) {
		if (repository && repository.ui.selected) {
			this.manager = new GitManager(repository);
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
			const files = await commitNode.manager.fetchCommitFiles(commitNode.commit);
			return files.map((file) => new FileNode(file, commitNode.manager));
		} else {
			if (!this.manager) { return []; }
			const commits = await this.manager.fetchCommits(20);
			return commits.map((commit) => new CommitNode(commit, this.manager as GitManager));
		}
	}

	private observeRepositoryState(repository: Repository) {
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