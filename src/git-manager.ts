import { Repository as GitRepository, Commit as GitCommit, API, Change as GitChange, Remote } from './ext/git.d';
import * as vscode from "vscode";
import * as nodePath from 'path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { parseGitCommits } from './ext/git';

const asyncExecFile = promisify(execFile);

const COMMIT_FORMAT = '%H%n%aN%n%aE%n%at%n%ct%n%P%n%B';

export interface Commit extends GitCommit {
  index?: number;
  shortHash: string;
  parentHash: string;
  parentShortHash: string;
  repository: GitRepository;
}

export interface Worktree {
  uri: vscode.Uri;
  hash: string;
  shortHash: string;
  branch: string;
  isOrigin: boolean;
  isLocked: boolean;
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

export interface IExecutionResult<T extends string | Buffer> {
  exitCode: number;
  stdout: T;
  stderr: string;
}

export class GitManager {
  constructor(readonly gitApi: API, readonly repository: GitRepository) {}

  async fetchStashes(): Promise<Commit[]> {
    return this.getCommits("stash", ["list"]);
  }

  async fetchCommits(maxEntries: number): Promise<Commit[]> {
    return this.getCommits("log", [`-n${maxEntries}`, "--first-parent"]);
  }

  async fetchMergeCommits(hash: string): Promise<Commit[]> {
    const commits = await this.getCommits("log", [`${hash}~...${hash}`]);
    return commits.filter((commit) => commit.hash !== hash);
  }

  async fetchRemotes(): Promise<Remote[]> {
    return this.repository.state.remotes;
  }

  async fetchWorktrees(): Promise<Worktree[]> {
    return this.getWorktrees();
  }

  async fetchCommitChanges(commit: Commit): Promise<Change[]> {
    const gitChanges = await this.repository.diffBetween(
      commit.parentHash,
      commit.hash
    );

    const changes = gitChanges.map((gitChange) => {
      const change = gitChange as Change;

      change.commit = commit;
      change.uri = this.gitApi.toGitUri(
        vscode.Uri.file(change.uri.fsPath),
        commit.hash
      );
      change.originalUri = this.gitApi.toGitUri(
        vscode.Uri.file(change.originalUri.fsPath),
        commit.parentHash
      );
      change.renameUri = this.gitApi.toGitUri(
        vscode.Uri.file(change.renameUri.fsPath),
        commit.parentHash
      );

      return change;
    });

    return this.sortChanges(changes);
  }

  async revertCommit(commit: Commit): Promise<void> {
    await this.executeGitCommand(["revert", commit.hash]);
  }

  async diffChange(change: Change): Promise<void> {
    const leftSide = {
      uri: change.originalUri,
      label: change.commit.parentShortHash,
    };
    const rightSide = { uri: change.uri, label: change.commit.shortHash };

    await this.diff(leftSide, rightSide);
  }

  async diffChangeWithHead(change: Change, reversed = false): Promise<void> {
    const leftSide = { uri: change.uri, label: change.commit.shortHash };
    const rightSide = {
      uri: this.gitApi.toGitUri(vscode.Uri.file(change.uri.fsPath), "HEAD"),
      label: "current",
    };

    await (reversed
      ? this.diff(rightSide, leftSide)
      : this.diff(leftSide, rightSide));
  }

  private async diff(leftSide: DiffSide, rightSide: DiffSide) {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const title = `${nodePath.basename(leftSide.uri.path)} (${
      leftSide.label
    }) ⟷ ${nodePath.basename(rightSide.uri.path)} (${rightSide.label})`;

    await vscode.commands.executeCommand(
      "vscode.diff",
      leftSide.uri,
      rightSide.uri,
      title,
      options
    );
  }

  private sortChanges(files: Change[]): Change[] {
    return files.sort((a, b) => {
      const aParts = a.uri.path.split("/");
      const bParts = b.uri.path.split("/");

      if (aParts.length < bParts.length) {
        return 1;
      }
      if (aParts.length > bParts.length) {
        return -1;
      }

      return aParts.find((aPart, index) => aPart < bParts[index]) ? -1 : 1;
    });
  }

  private convertToCommits(commits: GitCommit[]): Commit[] {
    return commits.map((commit: any, index: number) => {
      commit.message = commit.message.split("\n")[0].trim();
      commit.index = index;
      commit.parentHash = commit.parents.shift() || commit.hash;
      commit.shortHash = commit.hash.substr(0, 7);
      commit.parentShortHash = commit.parentHash.substr(0, 7);
      commit.repository = this.repository;

      return commit as Commit;
    });
  }

  private async getWorktrees(): Promise<Worktree[]> {
    const args = ["worktree", "list", "--porcelain"];

    let result;

    try {
      result = await this.executeGitCommand(args);
    } catch (error) {
      return [];
    }

    return (result.stdout as string)
      .split("\n\n")
      .filter(Boolean)
      .flatMap((item, index) => {
        const raw = item.split("\n").reduce<any>((p, c) => {
          const [k, v] = c.split(" ");
          p[k] = v || true;
          return p;
        }, {});

        return {
          isLocked: raw.locked || false,
          isOrigin: index === 0,
          uri: vscode.Uri.file(raw.worktree),
          branch: raw.branch.split("/").pop(),
          hash: raw.HEAD,
          shortHash: raw.HEAD.slice(0, 7),
        };
      });
  }

  private async getCommits(
    command: string,
    customArgs: string[] = []
  ): Promise<Commit[]> {
    const args = [
      command,
      ...customArgs,
      `--format=${COMMIT_FORMAT}`,
      "-z",
      "--",
    ];

    let result;

    try {
      result = await this.executeGitCommand(args);
    } catch (error) {
      return [];
    }

    return this.convertToCommits(parseGitCommits(result.stdout));
  }

  private async executeGitCommand(
    args: string[]
  ): Promise<IExecutionResult<string> | any> {
    return asyncExecFile(this.gitApi.git.path, args, {
      cwd: this.repository.rootUri.fsPath,
    });
  }
}