import { ChangeNode } from './nodes/change';
import { CommitNode } from './nodes/commit';
import * as vscode from 'vscode';
import { GitCommitsProvider } from './providers/git-commits';
import { GitStashesProvider } from './providers/git-stashes';
import { GitRemotesProvider } from './providers/git-remotes';
import { GitExtension, Status } from './ext/git.d';

import * as childProcess from 'child_process';
import * as fs from 'fs';
import { RemoteNode } from './nodes/remote';
import { changeDecorator, worktreeDecorator } from "./decoration";
import { GitWorktreesProvider } from "./providers/git-worktrees";
import { WorktreeNode } from "./nodes/worktree";

export function activate(context: vscode.ExtensionContext) {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");

  if (!gitExtension || !gitExtension.isActive) {
    return;
  }

  const gitApi = gitExtension.exports.getAPI(1);
  const gitCommitsProvider = new GitCommitsProvider(gitApi);
  const gitStashesProvider = new GitStashesProvider(gitApi);
  const gitRemotesProvider = new GitRemotesProvider(gitApi);
  const gitWorktreesProvider = new GitWorktreesProvider(gitApi);

  context.subscriptions.push(
    vscode.window.createTreeView("gitCommits.commits", {
      treeDataProvider: gitCommitsProvider,
      showCollapseAll: true,
    }),

    vscode.window.createTreeView("gitCommits.stashes", {
      treeDataProvider: gitStashesProvider,
      showCollapseAll: true,
    }),

    vscode.window.createTreeView("gitCommits.remotes", {
      treeDataProvider: gitRemotesProvider,
      showCollapseAll: false,
    }),

    vscode.window.createTreeView("gitCommits.worktrees", {
      treeDataProvider: gitWorktreesProvider,
      showCollapseAll: false,
    }),

    vscode.commands.registerCommand(
      "gitCommits.undoCommit",
      async (item: CommitNode) => {
        await vscode.commands.executeCommand("git.undoCommit", item);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.copyCommitHash",
      async (item: CommitNode) => {
        await vscode.env.clipboard.writeText(item.commit.hash);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.commits.viewAsTree",
      async () => {
        await vscode.commands.executeCommand(
          "setContext",
          "gitCommits.commits.settings.viewAsTree",
          true
        );
        gitCommitsProvider.setView(true);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.commits.viewAsList",
      async () => {
        await vscode.commands.executeCommand(
          "setContext",
          "gitCommits.commits.settings.viewAsTree",
          false
        );
        gitCommitsProvider.setView(false);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.diffChange",
      async (item: ChangeNode) => {
        await item.manager.diffChange(item.change);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.diffChangeWithHead",
      async (item: ChangeNode) => {
        await item.manager.diffChangeWithHead(item.change);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.reversedDiffChangeWithHead",
      async (item: ChangeNode) => {
        await item.manager.diffChangeWithHead(item.change, true);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.copyFilePath",
      async (item: ChangeNode) => {
        await vscode.env.clipboard.writeText(item.relPath);
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.openCurrentFile",
      async (item: ChangeNode) => {
        const fileExist = fs.existsSync(item.change.uri.fsPath);
        if (!fileExist) {
          return vscode.window.showErrorMessage(
            "This file does not exist anymore"
          );
        }
        await vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.file(item.change.uri.fsPath),
          { preview: true, viewColumn: vscode.ViewColumn.Active }
        );
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.previewFile",
      async (item: ChangeNode) => {
        await vscode.commands.executeCommand("vscode.open", item.change.uri, {
          preview: true,
          viewColumn: vscode.ViewColumn.Active,
        });
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.revertChange",
      async (item: ChangeNode) => {
        const result = await vscode.window.showInformationMessage(
          "Are you sure you want to revert these changes?",
          { modal: true },
          { title: "Revert changes" }
        );
        if (!result) {
          return false;
        }

        let command;

        if (item.change.status === Status.INDEX_ADDED) {
          const fileExist = fs.existsSync(item.change.uri.fsPath);

          if (fileExist) {
            command = `rm '${item.relPath}' && git add '${item.relPath}'`;
          } else {
            await vscode.window.showInformationMessage(
              "This change is already reverted"
            );
          }
        } else {
          command = `git checkout ${item.change.commit.parentHash} -- '${item.originalRelPath}'`;
        }

        if (command) {
          childProcess.execSync(command, {
            cwd: item.change.commit.repository.rootUri.fsPath,
          });
          await vscode.window.showInformationMessage(
            "Change has been reverted"
          );
        }
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.revertCommit",
      async (item: CommitNode) => {
        const result = await vscode.window.showInformationMessage(
          "Are you sure you want to revert this commit?",
          { modal: true },
          { title: "Revert commit" }
        );
        if (!result) {
          return false;
        }

        await item.manager.revertCommit(item.commit);
        await vscode.commands.executeCommand("git.undoCommit", item);
      }
    ),

    vscode.commands.registerCommand("gitCommits.stash", async () => {
      await vscode.commands.executeCommand("git.stash");
    }),

    vscode.commands.registerCommand(
      "gitCommits.stashIncludeUntracked",
      async () => {
        await vscode.commands.executeCommand("git.stashIncludeUntracked");
      }
    ),

    vscode.commands.registerCommand("gitCommits.stashPopLatest", async () => {
      const result = await vscode.window.showInformationMessage(
        "Are you sure you want to apply and remove the stash item?",
        { modal: true },
        { title: "Pop stash item" }
      );
      if (!result) {
        return false;
      }
      await vscode.commands.executeCommand("git.stashPopLatest");
    }),

    vscode.commands.registerCommand("gitCommits.stashApplyLatest", async () => {
      const result = await vscode.window.showInformationMessage(
        "Are you sure you want to apply the stash item?",
        { modal: true },
        { title: "Apply stash item" }
      );
      if (!result) {
        return false;
      }
      await vscode.commands.executeCommand("git.stashApplyLatest");
    }),

    vscode.commands.registerCommand(
      "gitCommits.stashPop",
      async (item: CommitNode) => {
        const result = await vscode.window.showInformationMessage(
          "Are you sure you want to apply and remove the stash item?",
          { modal: true },
          { title: "Pop stash item" }
        );
        if (!result) {
          return false;
        }
        await item.commit.repository.repository.popStash(item.commit.index);
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.stashApply",
      async (item: CommitNode) => {
        const result = await vscode.window.showInformationMessage(
          "Are you sure you want to apply the stash item?",
          { modal: true },
          { title: "Apply stash item" }
        );
        if (!result) {
          return false;
        }
        await item.commit.repository.repository.applyStash(item.commit.index);
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.stashDrop",
      async (item: CommitNode) => {
        const result = await vscode.window.showInformationMessage(
          "Are you sure you want to remove the stash item?",
          { modal: true },
          { title: "Remove stash item" }
        );
        if (!result) {
          return false;
        }
        await item.commit.repository.repository.dropStash(item.commit.index);
      }
    ),
    vscode.commands.registerCommand("gitCommits.addRemote", async () => {
      await vscode.commands.executeCommand("git.addRemote");
    }),
    vscode.commands.registerCommand(
      "gitCommits.removeRemote",
      async (item: RemoteNode) => {
        const remoteName = item.remote.name;

        const result = await vscode.window.showInformationMessage(
          `Are you sure you want to remove "${remoteName}" remote?`,
          { modal: true },
          { title: "Remove" }
        );
        if (!result) {
          return false;
        }

        await item.manager.repository.removeRemote(remoteName);
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.pullFromRemote",
      async (item: RemoteNode) => {
        const remoteName = item.remote.name;
        await item.manager.repository.repository.pullFrom(
          false,
          remoteName,
          item.manager.repository.state.HEAD?.name
        );
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.moveWorktree",
      async (item: WorktreeNode) => {
        const result = await vscode.window.showInputBox({
          prompt: "Enter new path for worktree",
          value: item.worktree.uri.fsPath,
        });
        if (!result) {
          return false;
        }
        await item.move(result);
        gitWorktreesProvider.refresh();
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.lockWorktree",
      async (item: WorktreeNode) => {
        await item.lock();
        gitWorktreesProvider.refresh();
      }
    ),
    vscode.commands.registerCommand(
      "gitCommits.unlockWorktree",
      async (item: WorktreeNode) => {
        await item.unlock();
        gitWorktreesProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "gitCommits.openWorktree",
      async (item: WorktreeNode) => {
        return vscode.commands.executeCommand(
          "vscode.openFolder",
          item.worktree.uri,
          true
        );
      }
    ),

    vscode.commands.registerCommand("gitCommits.addWorktree", async () => {
      const result = await vscode.window.showInputBox({
        prompt: "Enter path for new worktree",
        value: gitWorktreesProvider.manager?.repository.rootUri.fsPath,
      });
      if (!result) {
        return false;
      }
      await gitWorktreesProvider.manager?.addWorktree(result);
      gitWorktreesProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "gitCommits.removeWorktree",
      async (item: WorktreeNode) => {
        const result = await vscode.window.showInformationMessage(
          `Are you sure you want to remove "${item.label}" worktree?`,
          { modal: true },
          { title: "Remove" }
        );
        if (!result) {
          return false;
        }
        await item.remove();
        gitWorktreesProvider.refresh();
      }
    ),
    vscode.window.registerFileDecorationProvider(changeDecorator),
    vscode.window.registerFileDecorationProvider(worktreeDecorator)
  );
}

export function deactivate() {}
