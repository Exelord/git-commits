import * as md5 from 'md5';
import * as vscode from 'vscode';
import { GitExtension, Repository } from './git';

export class GitCommitsProvider implements vscode.TreeDataProvider<Commit> {
	private _onDidChangeTreeData: vscode.EventEmitter<Commit | undefined> = new vscode.EventEmitter<Commit | undefined>();
	readonly onDidChangeTreeData: vscode.Event<Commit | undefined> = this._onDidChangeTreeData.event;
	
	private observer?: vscode.Disposable;
	private wasRefresh = true;

	_observeRepositoryState(repository: Repository) {
		this.observer = repository.state.onDidChange(() => {
			if (this.wasRefresh) {
				this.wasRefresh = false;
			} else {
				console.log('refresh!');
				this.refresh();
			}
		});
	}

	refresh(): void {
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
			
			if (git.repositories.length === 1) {
				const repository = git.repositories[0];

				if (!this.observer) {
					this._observeRepositoryState(repository);
				}

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
			this.iconPath = vscode.Uri.parse(`https://www.gravatar.com/avatar/${md5(email)}?s=20`);
		}
	}
}