import { Repository as GitRepository, Commit as GitCommit } from './ext/git.d';
import { exec } from "child_process";
import * as vscode from "vscode";
import * as nodePath from 'path';

export interface Commit extends GitCommit {
  shortHash: string;
  parentHash: string;
  parentShortHash: string;
}

type CommitFileStatus = "added" | "modified" | "deleted" | "renamed";

export interface CommitFile {
  relPath: string;
  relatedRelPath: string;
  commit: Commit;
  action: CommitFileStatus;
  uri: vscode.Uri;
}

const commitFileActionMap: { [symbol: string]: CommitFileStatus } = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed"
};

class CommandError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'CommandError';
  }
}

export class GitManager {
  constructor(readonly repository: GitRepository) {}

  get workspaceFolder() {
    return this.repository.rootUri.fsPath;
  }

  async executeGitCommand(command: string): Promise<string> {
    return this.executeCommand(`git -C "${this.workspaceFolder}" ${command}`);
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

      return commit;
    });
  }

  async fetchCommitFiles(commit: Commit): Promise<CommitFile[]> {
    const results = await this.executeGitCommand(`diff --name-status ${commit.hash}~ ${commit.hash}`);
    const changedFiles = results.trim().split('\n').filter(Boolean).map((result) => result.split('\t'));
    
    const commitFiles = changedFiles.map(([actionId, relatedRelPath, relPath]) => {
      relPath = relPath || relatedRelPath;

      return {
        relPath,
        commit,
        relatedRelPath: relatedRelPath,
        action: commitFileActionMap[actionId] || commitFileActionMap['R'],
        uri: this.getCommitFileUri(commit.hash, relPath)
      } as CommitFile;
    });
    
    return this.sortFiles(commitFiles);
  }

  async compareCommitFileAgainstPrevious(file: CommitFile): Promise<void> {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const leftSideBaseName = nodePath.basename(file.relatedRelPath);
    const rightSideBaseName = nodePath.basename(file.relPath);
    const title = `${leftSideBaseName} (${file.commit.parentShortHash}) ⟷ ${rightSideBaseName} (${file.commit.shortHash})`;
    const prevCommitUri = await this.getCommitFileUri(file.commit.parentHash, file.relatedRelPath);

    vscode.commands.executeCommand("vscode.diff", prevCommitUri, file.uri, title, options);
  }

  async revertFile(file: CommitFile, commit: Commit): Promise<void> {
    const states = {
      deleted: () => this.executeGitCommand(`checkout ${commit.parentHash} -- ${file.relPath}`),
      added: () => this.executeCommand(`rm ${file.relPath} && git add ${file.relPath}`),
      modified: () => this.executeGitCommand(`checkout ${commit.parentHash} -- ${file.relPath}`),
      renamed: () => this.executeGitCommand(`checkout ${commit.parentHash} -- ${file.relPath}`)
    };

    await states[file.action]();
  }

  getCommitFileUri(hash: string, relPath: string): vscode.Uri {
    return this.toGitUri(vscode.Uri.file(nodePath.join(this.workspaceFolder, relPath)), hash);
  }

  private toGitUri(uri: vscode.Uri, ref: string): vscode.Uri {
    const { path, fsPath } = uri;

    return uri.with({
      path,
      scheme: 'git',
      query: JSON.stringify({ ref, path: fsPath })
    });
  }

  private async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.workspaceFolder }, (error, stdout, stderr) => {
        if (error) {
          if (error.message.startsWith('Command failed:')) {
            return reject(new CommandError(stderr));
          }

          return reject(error);
        }

        if (stderr) { return reject(new CommandError(stderr)); }
        resolve(stdout);
      });
    });
  }

  private sortFiles(files: CommitFile[]): CommitFile[] {
    return files.sort((a, b) => {
      const aParts = a.relPath.split("/");
      const bParts = b.relPath.split("/");

      if (aParts.length < bParts.length) { return 1; }
      if (aParts.length > bParts.length) { return -1; }
    
      return aParts.find((aPart, index) => aPart < bParts[index]) ? -1 : 1;
    });
  }
}