import * as vscode from 'vscode';
import { GitExtension, Repository } from './ext/git';
import { CommitNode } from './commit-node';
import { log } from './git';

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
			this._selectedRepository = repository;
			this._observeRepositoryState(repository);
			this.refresh();
		}
	}

	constructor() {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');

		if (gitExtension && gitExtension.isActive) {
			const git = gitExtension.exports.getAPI(1);

			git.repositories.forEach((repository) => {
				if (repository.ui.selected) {
					this.selectedRepository = repository;
				}
				
				repository.ui.onDidChange(() => this.selectedRepository = repository);
			})
			
			git.onDidOpenRepository((repository) => {
				this.selectedRepository = repository;
				repository.ui.onDidChange(() => this.selectedRepository = repository);
			})
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: CommitNode): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: CommitNode): Promise<vscode.TreeItem[]> {
		const repository = this.selectedRepository;
	
		if (!repository) return [];
		
		if (element) {
			return element.getChildren(); 
		} else {
			const logs = await log(repository);
			
			return logs.map((log) => new CommitNode(log, repository));
		}
	}

	_observeRepositoryState(repository: Repository) {
		if (this._stateObserver) this._stateObserver.dispose();
		
		this._stateObserver = repository.state.onDidChange(() => {
			this.refresh();
		});
	}
}