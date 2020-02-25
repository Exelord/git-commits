import * as vscode from 'vscode';
import { GitExtension, Repository } from './ext/git';
import { CommitNode } from './commit-node';
import { GitManager } from './git-manager';
import { FileNode } from './file-node';

export class GitCommitsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<CommitNode | undefined> = new vscode.EventEmitter<CommitNode | undefined>();
	readonly onDidChangeTreeData: vscode.Event<CommitNode | undefined> = this._onDidChangeTreeData.event;
	
	private _stateObserver?: vscode.Disposable;
	private _selectedRepository?: Repository;
	
	get selectedRepository(): Repository | undefined {
		return this._selectedRepository;
	}

	set selectedRepository(repository: Repository | undefined) {
		if (repository && repository.ui.selected) {
			this.gitManager.updateWorkspaceFolder(repository.rootUri.fsPath);
			this._selectedRepository = repository;
			this._observeRepositoryState(repository);
			this.refresh();
		}
	}

	constructor(private gitManager: GitManager) {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');

		if (gitExtension && gitExtension.isActive) {
			const git = gitExtension.exports.getAPI(1);

			git.repositories.forEach((repository) => {
				if (repository.ui.selected) { this.selectedRepository = repository; }
				
				repository.ui.onDidChange(() => this.selectedRepository = repository);
			});
			
			git.onDidOpenRepository((repository) => {
				this.selectedRepository = repository;
				repository.ui.onDidChange(() => this.selectedRepository = repository);
			});
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: CommitNode): vscode.TreeItem {
		return element;
	}

	async getChildren(commit?: CommitNode): Promise<vscode.TreeItem[]> {
		const repository = this.selectedRepository;
	
		if (!repository) { return []; }
		
		if (commit) {
			const files = await this.gitManager.fetchCommitFiles(commit.id || '');
			return files.map((file) => new FileNode(file, commit));
		} else {
			const commits = await this.gitManager.fetchCommits(15);
			
			return commits.map((commit) => new CommitNode(commit, repository));
		}
	}

	_observeRepositoryState(repository: Repository) {
		if (this._stateObserver) { this._stateObserver.dispose(); }
		
		this._stateObserver = repository.state.onDidChange(() => {
			this.refresh();
		});
	}
}