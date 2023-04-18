import * as vscode from 'vscode';
import { Repository, API } from '../ext/git.d';
import { GitManager } from '../git-manager';
import { BaseNode } from '../nodes/base';
import { TextNode } from '../nodes/text';

export class BaseProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> =
    this._onDidChangeTreeData.event;

  protected _stateObserver?: vscode.Disposable;

  private trackedRepositoriesDisposers = new Map<
    Repository,
    vscode.Disposable
  >();

  manager?: GitManager;
  emptyMessage?: string;

  constructor(public gitApi: API) {
    this.trackRepositories();

    if (!this.manager && this.gitApi.repositories[0]) {
      this.selectRepository(this.gitApi.repositories[0]);
    }
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

    if (!manager) {
      return [new TextNode("No active repository could be found.")];
    }

    const children = await this.getTreeItems(manager);
    if (children.length < 1 && this.emptyMessage) {
      return [new TextNode(this.emptyMessage)];
    }

    return children;
  }

  protected onRepositoryChange(_repository: Repository) {}

  protected onStateChange(_repository: Repository) {
    this.refresh();
  }

  private selectRepository(repository: Repository) {
    this.manager = new GitManager(this.gitApi, repository);
    this.onRepositoryChange(repository);
    this.observeRepositoryState(repository);
    this.refresh();
  }

  private observeRepositoryState(repository: Repository) {
    if (this._stateObserver) {
      this._stateObserver.dispose();
    }

    this._stateObserver = repository.state.onDidChange(() =>
      this.onStateChange(repository)
    );
  }

  private trackRepositories() {
    this.gitApi.repositories.forEach((repository) =>
      this.trackRepository(repository)
    );
    this.gitApi.onDidOpenRepository((repository) =>
      this.trackRepository(repository)
    );
    this.gitApi.onDidCloseRepository((repository) =>
      this.untrackRepository(repository)
    );
  }

  private trackRepository(repository: Repository) {
    if (this.trackedRepositoriesDisposers.has(repository)) {
      return;
    }

    const disposer = repository.ui.onDidChange(() => {
      if (repository.ui.selected) {
        this.selectRepository(repository);
      }
    });

    this.trackedRepositoriesDisposers.set(repository, disposer);

    if (repository.ui.selected) {
      this.selectRepository(repository);
    }
  }

  private untrackRepository(repository: Repository) {
    const disposer = this.trackedRepositoriesDisposers.get(repository);

    if (disposer) {
      disposer.dispose();
      this.trackedRepositoriesDisposers.delete(repository);
    }

    if (repository.ui.selected) {
      const firstRepository = this.gitApi.repositories[0];
      if (firstRepository) {
        this.selectRepository(firstRepository);
      }
    }
  }
}