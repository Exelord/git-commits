import { exec } from "child_process";
import * as vscode from "vscode";
import { join, basename } from 'path';

export interface Commit {
  hash: string;
  shortHash: string;
  date: string;
  body: string;
  email: string;
  author: string;
  subject: string;
  timePassed: string;
}

type CommitFileStatus = "added" | "modified" | "deleted" | "renamed";

export interface CommitFile {
  relPath: string;
  action: CommitFileStatus;
  uri: vscode.Uri;
}

const commitFileActionMap: { [symbol: string]: CommitFileStatus } = {
  A: "added",
  M: "modified",
  D: "deleted",
  R: "renamed"
};

export class GitManager {
  private _commitFileCache: { [key: string]: vscode.Uri } = {};

  constructor(private _workspaceFolder: string) {}

  async executeGitCommand(command: string): Promise<string> {
    return this.executeCommand(`git -C ${this._workspaceFolder} ${command}`);
  }

  async executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this._workspaceFolder }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        }
        if (stderr) {
          reject(stderr);
        }
        resolve(stdout);
      });
    });
  }

  async fetchCommits(limit: number): Promise<Commit[]> {
    const result = await this.executeGitCommand(
      `log -${limit} --pretty=format:'{ #@Xhash#@X: #@X%H#@X, #@XshortHash#@X: #@X%h#@X, #@Xauthor#@X: #@X%an#@X, #@Xemail#@X: #@X%ae#@X, #@XtimePassed#@X: #@X%cr#@X, #@Xsubject#@X: #@X%s#@X, #@Xdate#@X: #@X%cI#@X }'`
    );
    return result.split("\n").map(line =>
      JSON.parse(
        line
          .replace(/[\\]/g, "\\\\")
          .replace(/[\"]/g, '\\"')
          .replace(/[\/]/g, "\\/")
          .replace(/[\b]/g, "\\b")
          .replace(/[\f]/g, "\\f")
          .replace(/[\n]/g, "\\n")
          .replace(/[\r]/g, "\\r")
          .replace(/[\t]/g, "\\t")
          .replace(/#@X/g, '"')
      )
    );
  }

  async fetchCommitFiles(commitHash: string): Promise<CommitFile[]> {
    const result = await this.executeGitCommand(`diff-tree --no-commit-id --name-status -r ${commitHash}`);
    const files = result
      .slice(0, result.length - 1)
      .split("\n")
      .map(line => {
        const c = line.split("\t");
        if (!c.length) { return; }

        return {
          relPath: c[1],
          action: commitFileActionMap[c[0]],
          uri: vscode.Uri.file(join(this._workspaceFolder, c[1]))
        };
      }).filter(Boolean) as [CommitFile];
    
    return this.sortFiles(files);
  }

  getCommitFileUri(hash: string, { relPath }: CommitFile): vscode.Uri {
    return this.toGitUri(vscode.Uri.file(join(this._workspaceFolder, relPath)), hash);
  }

  async compareCommitFileAgainstPrevious(commit: Commit, file: CommitFile): Promise<void> {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const baseName = basename(file.relPath);
    const title = `${baseName} (${commit.shortHash}) ⟷ ${baseName} (${commit.shortHash})`;
    const prevCommit = await this.getCommitFileUri(commit.hash + "~1", file);
    const currCommit = await this.getCommitFileUri(commit.hash, file);

    vscode.commands.executeCommand("vscode.diff", prevCommit, currCommit, title, options);
  }

  async revertFile(file: CommitFile, commit: Commit): Promise<void> {
    const states = {
      deleted: () => this.executeGitCommand(`checkout ${commit.hash}~1 -- ${file.relPath}`),
      added: () => this.executeCommand(`rm ${file.relPath} && git add ${file.relPath}`),
      modified: () => this.executeGitCommand(`checkout ${commit.hash}~1 -- ${file.relPath}`),
      renamed: () => this.executeGitCommand(`checkout ${commit.hash}~1 -- ${file.relPath}`)
    };

    await states[file.action]();
  }

  updateWorkspaceFolder(folderPath: string): void {
    this._workspaceFolder = folderPath;
  }

  toGitUri(uri: vscode.Uri, ref: string): vscode.Uri {
    const params = {
      path: uri.fsPath,
      ref
    };
  
    const path = uri.path;
  
    return uri.with({
      scheme: 'git',
      path,
      query: JSON.stringify(params)
    });
  }

  private sortFiles(files: CommitFile[]): CommitFile[] {
    return files.sort((a, b) => {
      const aParts = a.relPath.split("/");
      const bParts = b.relPath.split("/");

      if (aParts.length < bParts.length) { return 1; }
      if (aParts.length > bParts.length) { return -1; }
    
      return aParts.find((aPart, index) => {
        return aPart < bParts[index];
      }) ? -1 : 1;
    });
  }
}