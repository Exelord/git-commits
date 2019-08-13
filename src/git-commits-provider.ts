import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';

export class GitCommitsProvider implements vscode.TreeDataProvider<Commit> {
	private _onDidChangeTreeData: vscode.EventEmitter<Commit | undefined> = new vscode.EventEmitter<Commit | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Commit | undefined> = this._onDidChangeTreeData.event;
	
	private stateObserver?: vscode.Disposable;
	private didLog = true;
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

	_observeRepositoryState(repository: Repository) {
		if (this.stateObserver) this.stateObserver.dispose();
		
		this.stateObserver = repository.state.onDidChange(() => {
			if (this.didLog) {
				this.didLog = false;
			} else {
				this.refresh();
			}
		});
	}

	refresh(): void {
		this.didLog = true;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Commit): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: Commit): Promise<Commit[]> {
		if (!this.selectedRepository) return [];

		const logs = await this.selectedRepository.log();
		
		return logs.map((log) => new Commit(log.message, log.hash, log.authorEmail));
	}
}

export class Commit extends vscode.TreeItem {
	constructor(message: string, hash: string, email?: string) {
		super(message);

		if (email) {
			this.tooltip = email;
			this.iconPath = vscode.Uri.parse(`https://avatars.githubusercontent.com/u/e?email=${email}&s=20`)
		}
	}
}