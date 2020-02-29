import { exec } from "child_process";
import * as vscode from "vscode";
import * as nodePath from 'path';

export interface Commit {
  hash: string;
  shortHash: string;
  parentHash: string;
  parentShortHash: string;
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

export class GitManager {
  constructor(public workspaceFolder: string) {}

  async executeGitCommand(command: string): Promise<string> {
    return this.executeCommand(`git -C ${this.workspaceFolder} ${command}`);
  }

  async fetchCommits(limit: number): Promise<Commit[]> {
    const result = await this.executeGitCommand(
      `log -${limit} --pretty=format:'{ #@Xhash#@X: #@X%H#@X, #@XshortHash#@X: #@X%h#@X, #@Xauthor#@X: #@X%an#@X, #@Xemail#@X: #@X%ae#@X, #@XtimePassed#@X: #@X%cr#@X, #@Xsubject#@X: #@X%s#@X, #@Xdate#@X: #@X%cI#@X, #@XparentHash#@X: #@X%P#@X, #@XparentShortHash#@X: #@X%p#@X }'`
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
        if (error) { reject(error); }
        if (stderr) { reject(stderr); }
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