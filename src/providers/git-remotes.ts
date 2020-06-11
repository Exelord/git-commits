import * as vscode from 'vscode';
import { BaseProvider } from './base';
import { RemoteNode } from '../nodes/remote';

export class GitRemotesProvider extends BaseProvider {
	async getChildren(_remoteNode?: RemoteNode): Promise<vscode.TreeItem[]> {
		const { manager } = this;
		if (!manager) { return []; }

		const remotes = await manager.getRemotes();
		
		return remotes.map((remote) => new RemoteNode(remote, manager));
	}
}