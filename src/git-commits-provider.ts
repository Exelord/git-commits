import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';

export class GitCommitsProvider implements vscode.TreeDataProvider<Commit> {
	private _onDidChangeTreeData: vscode.EventEmitter<Commit | undefined> = new vscode.EventEmitter<Commit | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Commit | undefined> = this._onDidChangeTreeData.event;
	
	private repoObserver?: vscode.Disposable;
	private stateObserver?: vscode.Disposable;
	private wasRefresh = true;

	_observeSelectedRepository(repository: Repository) {
		return this.repoObserver = repository.ui.onDidChange((a) => {
			if (this.repoObserver) this.repoObserver.dispose();
			this.refresh()
		});
	};

	_observeRepositoryState(repository: Repository) {
		if (this.stateObserver) this.stateObserver.dispose();
		
		this.stateObserver = repository.state.onDidChange(() => {
			if (this.wasRefresh) {
				this.wasRefresh = false;
			} else {
				this.refresh();
			}
		});
	}

	refresh(): void {
		console.log('refresh');
		
		this.wasRefresh = true;
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Commit): vscode.TreeItem {
		return element;
	}

	getChildren(element?: Commit): Thenable<Commit[]> {
		const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');

		if (gitExtension && gitExtension.isActive) {
			const git = gitExtension.exports.getAPI(1);
			
			git.repositories.forEach((repo) => this._observeSelectedRepository(repo));
			
			const repository = git.repositories.find(r => r.ui.selected);
			
			if (repository) {
				this._observeSelectedRepository(repository)
				this._observeRepositoryState(repository);

				return repository.log().then((logs) => {
					return logs.map((log) => new Commit(log.message, log.hash, log.authorEmail));
				});
			}
		}

		return Promise.resolve([]);
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