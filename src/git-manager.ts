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

export interface DiffSide {
  label: string;
  uri: vscode.Uri;
}

export class GitManager {
  constructor(readonly gitApi: API, readonly repository: GitRepository) {}

  async fetchStashes(): Promise<Commit[]> {
    return this.getCommits('stash list');
  }

  async fetchCommits(maxEntries: number): Promise<Commit[]> {
    const gitCommits = await this.repository.log({ maxEntries }).catch((error: Error) => {
      if (error.message.endsWith('does not have any commits yet')) { return []; }
      throw error;
    }) as GitCommit[];

    return this.convertToCommits(gitCommits);
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
    const leftSide = { uri: change.originalUri, label: change.commit.parentShortHash };
    const rightSide = { uri: change.uri, label: change.commit.shortHash };

    await this.diff(leftSide, rightSide);
  }

  async diffChangeWithHead(change: Change, reversed = false): Promise<void> {
    const leftSide = {  uri: change.uri, label: change.commit.shortHash };
    const rightSide = { uri: this.gitApi.toGitUri(vscode.Uri.file(change.uri.fsPath), 'HEAD'), label: 'current' };

    await (reversed ? this.diff(rightSide, leftSide) : this.diff(leftSide, rightSide));
  }

  private async diff(leftSide: DiffSide, rightSide: DiffSide) {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const title = `${nodePath.basename(leftSide.uri.fsPath)} (${leftSide.label}) ⟷ ${nodePath.basename(rightSide.uri.fsPath)} (${rightSide.label})`;

    await vscode.commands.executeCommand("vscode.diff", leftSide.uri, rightSide.uri, title, options);
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

  private async getCommits(command: string) {
    const output = await this.executeGitCommand(`${command} --pretty=format:'{%n  "hash": "%H",%n  "parents": "%P",%n  "message": "%s",%n  "authorName": "%aN",%n  "authorDate": "%aD",%n  "authorEmail": "%aE"%n},'`);
    const commits = JSON.parse(`[${output.slice(0, -1)}]` || '[]');

    const gitCommits = commits.map((commit: any) => {
      commit.authorDate = new Date(commit.authorDate);
      commit.parents = commit.parents.split(' ');

      return commit as GitCommit;
    });

    return this.convertToCommits(gitCommits);
  }

  private convertToCommits(commits: GitCommit[]): Commit[] {
    return commits.map((commit: any, index: number) => {
      commit.index = index;
      commit.parentHash = commit.parents.shift() || commit.hash;
      commit.shortHash = commit.hash.substr(0, 7);
      commit.parentShortHash = commit.parentHash.substr(0, 7);
      commit.repository = this.repository;

      return commit as Commit;
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