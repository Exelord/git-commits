import * as vscode from 'vscode';
import { BaseProvider } from './base';
import { RemoteNode } from '../nodes/remote';
import { GitManager } from '../git-manager';

export class GitRemotesProvider extends BaseProvider {
	async getTreeItems(manager: GitManager): Promise<vscode.TreeItem[]> {
		const remotes = await manager.fetchRemotes();
		return remotes.map((remote) => new RemoteNode(remote, manager));
	}
}