import * as vscode from 'vscode';
import { Repository, API } from '../ext/git.d';
import { GitManager } from '../git-manager';
import { BaseNode } from '../nodes/base';
import { TextNode } from '../nodes/text';

export class BaseProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;
	
	protected _stateObserver?: vscode.Disposable;
	protected manager?: GitManager;

	emptyMessage?: string;

	constructor(public gitApi: API) {
		this.trackRepositories();
	}

	get childrenOptions(): any {
		return undefined;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	async getTreeItems(_manager: GitManager): Promise<vscode.TreeItem[]> {
		return [];
	}

	async getChildren(childNode?: BaseNode): Promise<vscode.TreeItem[]> {
		if (childNode) {
			return childNode.getChildren(this.childrenOptions);
		}
		
		const { manager } = this;
		if (!manager) { return []; }

		const children = await this.getTreeItems(manager);

		if (children.length < 1 && this.emptyMessage) {
			return [new TextNode(this.emptyMessage)];
		}

		return children;
	}

	protected onRepositoryChange(_repository: Repository) {};

	protected onStateChange(_repository: Repository) {
		this.refresh();
	};

	private onSelectedRepository(repository: Repository) {
		this.manager = new GitManager(this.gitApi, repository);
		this.onRepositoryChange(repository);
		this.observeRepositoryState(repository);
		this.refresh();
	}

	private observeRepositoryState(repository: Repository) {
		if (this._stateObserver) { this._stateObserver.dispose(); }
		
		this._stateObserver = repository.state.onDidChange(() => this.onStateChange(repository));
	}

	private trackRepositories() {
		this.gitApi.repositories.forEach((repository) => {
			if (repository.ui.selected) { this.onSelectedRepository(repository); }
			
			repository.ui.onDidChange(() => {
				if (repository.ui.selected) { this.onSelectedRepository(repository); }
			});
		});
		
		this.gitApi.onDidOpenRepository((repository) => {
			if (repository.ui.selected) { this.onSelectedRepository(repository); }

			repository.ui.onDidChange(() => {
				if (repository.ui.selected) { this.onSelectedRepository(repository); }
			});
		});
	}
}