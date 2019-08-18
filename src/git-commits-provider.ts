import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';

export class GitCommitsProvider implements vscode.TreeDataProvider<Commit> {
	private _onDidChangeTreeData: vscode.EventEmitter<Commit | undefined> = new vscode.EventEmitter<Commit | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Commit | undefined> = this._onDidChangeTreeData.event;
	
	private logRefresh = true;
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
				this.selectedRepository = repository;
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

	getTreeItem(element: Commit): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: Commit): Promise<Commit[]> {
		if (!this.selectedRepository) return [];
		
		this.logRefresh = true;
		const logs = await this.selectedRepository.log();
		
		return logs.map((log) => new Commit(log.message, log.hash, log.authorEmail));
	}

	_observeRepositoryState(repository: Repository) {
		if (this._stateObserver) this._stateObserver.dispose();
		
		this._stateObserver = repository.state.onDidChange(() => {
			if (this.logRefresh) {
				this.logRefresh = false;
			} else {
				this.refresh();
			}
		});
	}
}

export class Commit extends vscode.TreeItem {
	constructor(message: string, hash: string, email?: string) {
		super(message);

		if (email) {
			this.tooltip = email;
			this.iconPath = vscode.Uri.parse(this.avatarUrl(email))
		}
	}

	private avatarUrl(email: string) {
		const match = email.match(/^(\d+)\+[^@]+@users.noreply.github.com$/);

		if (match) {
			return `https://avatars.githubusercontent.com/u/${match[1]}?s=20`;
		} else {
			return `https://avatars.githubusercontent.com/u/e?email=${encodeURIComponent(email)}&s=20`;
		}
	}
}