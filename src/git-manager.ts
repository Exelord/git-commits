import { exec } from "child_process";
import { createHash } from "crypto";
import { existsSync, writeFileSync } from "fs";
import { join, basename } from "path";
import * as tempdir from "temp-dir";
import * as vscode from "vscode";
import { ensureDirSync } from "fs-extra";

export interface Commit {
  hash: string;
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
    return new Promise((resolve, reject) => {
      exec(`git -C ${this._workspaceFolder} ${command}`, (error, stdout, stderr) => {
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
      `log -${limit} --pretty=format:'{ #@Xhash#@X: #@X%h#@X, #@Xauthor#@X: #@X%an#@X, #@Xemail#@X: #@X%ae#@X, #@XtimePassed#@X: #@X%cr#@X, #@Xsubject#@X: #@X%s#@X }'`
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
        return {
          relPath: c[1],
          action: commitFileActionMap[c[0]],
          uri: vscode.Uri.file(join(this._workspaceFolder, c[1]))
        };
      });
    
    return this.sortFiles(files);
  }

  async getCommitFileUri(hash: string, { relPath }: CommitFile): Promise<vscode.Uri> {
    const key = createHash("md5")
      .update(hash + relPath)
      .digest("hex");
    if (!this._commitFileCache[key]) {
      const tmpDirPath = join(tempdir, 'vscode.git-commits', key);
      const tmpPath = join(tmpDirPath, basename(relPath));
      
      ensureDirSync(tmpDirPath);
      
      if (!existsSync(tmpPath)) {
        const result = await this.executeGitCommand(`show ${hash}:${relPath}`);
        writeFileSync(tmpPath, result, { mode: 0o444 });
      }
      
      this._commitFileCache[key] = vscode.Uri.file(tmpPath);
    }
    return this._commitFileCache[key];
  }

  compareCommitFileAgainstPrevious = async (hash: string, commitFile: CommitFile): Promise<void> => {
    const options = { preview: true, viewColumn: vscode.ViewColumn.Active };
    const title = `${basename(commitFile.relPath)} (git) (read-only)`;

    try {
      switch (commitFile.action) {
        case "deleted":
          const deletedCommit = await this.getCommitFileUri(hash + "~1", commitFile);
          vscode.commands.executeCommand("vscode.open", deletedCommit, options, title);
          break;
        case "added":
          const addedCommit = await this.getCommitFileUri(hash, commitFile);
          vscode.commands.executeCommand("vscode.open", addedCommit, options, title);
          break;
        default:
          const prevCommit = await this.getCommitFileUri(hash + "~1", commitFile);
          const currCommit = await this.getCommitFileUri(hash, commitFile);
          vscode.commands.executeCommand("vscode.diff", prevCommit, currCommit, title, options);
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }

  updateWorkspaceFolder(folderPath: string): void {
    this._workspaceFolder = folderPath;
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