import { Repository as GitRepository, Commit as GitCommit, API, Change as GitChange } from './ext/git.d';
import * as vscode from "vscode";
import * as nodePath from 'path';
import * as childProcess from 'child_process';

export interface Commit extends GitCommit {
  index?: number;
  shortHash: string;
  parentHash: string;
  parentShortHash: string;
  repository: GitRepository;
}

export interface Change extends GitChange {
  commit: Commit;
  uri: vscode.Uri;
  renameUri: vscode.Uri;
  originalUri: vscode.Uri;
}

export class GitManager {
  constructor(readonly gitApi: API, readonly repository: GitRepository) {}

  async fetchStashes(): Promise<Commit[]> {
    const output = await this.executeGitCommand(`stash list --pretty=format:'{%n  "hash": "%H",%n  "parents": "%P",%n  "message": "%s",%n  "authorName": "%aN",%n  "authorDate": "%aD",%n  "authorEmail": "%aE"%n},'`);
    const commits = JSON.parse(`[${output.slice(0, -1)}]` || '[]');

    return commits.map((commit: any, index: number) => {
      commit.index = index;
      commit.authorDate = new Date(commit.authorDate);
      commit.parents = commit.parents.split(' ');
      commit.parentHash = commit.parents.shift() || commit.hash;
      commit.shortHash = commit.hash.substr(0, 7);
      commit.parentShortHash = commit.parentHash.substr(0, 7);
      commit.repository = this.repository;

      return commit as GitCommit;
    });
  }

  async fetchCommits(maxEntries: number): Promise<Commit[]> {
    const commits = await this.repository.log({ maxEntries }).catch((error: Error) => {
      if (error.message.endsWith('does not have any commits yet')) { return []; }
      throw error;
    }) as Commit[];

    return commits.map((commit) => {
      commit.parentHash = commit.parents.shift() || commit.hash;
      commit.shortHash = commit.hash.substr(0, 7);
      commit.parentShortHash = commit.parentHash.substr(0, 7);
      commit.repository = this.repository;

      return commit;
    });
  }

  async commitChanges(commit: Commit): Promise<Change[]> {
    const gitChanges = await this.repository.diffBetween(commit.parentHash, commit.hash);
    
    const changes = gitChanges.map((gitChange) => {
      const change = gitChange as Change;
      
      change.commit = commit;
      change.uri = this.gitApi.toGitUri(vscode.Uri.file(change.uri.fsPath), commit.hash);
      change.originalUri = this.gitApi.toGitUri(vscode.Uri.file(change.originalUri.fsPath), commit.parentHash);
      change.renameUri = this.gitApi.toGitUri(vscode.Uri.file(change.renameUri.fsPath), commit.parentHash);

      return change;
    });
    
    return this.sortChanges(changes);
  }

  async diffChange(change: Change): Promise<void> {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const leftSideBaseName = nodePath.basename(change.originalUri.fsPath);
    const rightSideBaseName = nodePath.basename(change.uri.fsPath);
    const title = `${leftSideBaseName} (${change.commit.parentShortHash}) ⟷ ${rightSideBaseName} (${change.commit.shortHash})`;

    await vscode.commands.executeCommand("vscode.diff", change.originalUri, change.uri, title, options);
  }

  async diffChangeWithHead(change: Change): Promise<void> {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const fileName = nodePath.basename(change.uri.fsPath);
    const title = `${fileName} (${change.commit.shortHash}) ⟷ ${fileName} (current)`;

    await vscode.commands.executeCommand("vscode.diff", change.uri, vscode.Uri.file(change.uri.fsPath), title, options);
  }

  private sortChanges(files: Change[]): Change[] {
    return files.sort((a, b) => {
      const aParts = a.uri.fsPath.split("/");
      const bParts = b.uri.fsPath.split("/");

      if (aParts.length < bParts.length) { return 1; }
      if (aParts.length > bParts.length) { return -1; }
    
      return aParts.find((aPart, index) => aPart < bParts[index]) ? -1 : 1;
    });
  }

  private async executeGitCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      childProcess.exec(`git ${command}`, { cwd: this.repository.rootUri.fsPath }, (error, stdout) => {
        if (error) { return reject(error); }
        return resolve(stdout);
      });
    });
  }
}