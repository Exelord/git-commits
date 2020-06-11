import * as vscode from 'vscode';
import { Remote } from '../ext/git.d';
import { GitManager } from '../git-manager';

export class RemoteNode extends vscode.TreeItem {
	constructor(public remote: Remote, public manager: GitManager) {
		super(remote.name);
		
		this.contextValue = 'remoteNode';
		this.description = remote.fetchUrl;

		const showPushUrl = remote.pushUrl && remote.pushUrl !== remote.fetchUrl;
		
		this.tooltip = [
			`Name: ${remote.name}`,
			`ReadOnly: ${remote.isReadOnly}`,
			`FetchUrl: ${remote.fetchUrl}`,
			showPushUrl ? `PushUrl: ${remote.pushUrl}` : undefined
		].filter(Boolean).join('\n');

		this.iconPath = new vscode.ThemeIcon('remote');
	}
}