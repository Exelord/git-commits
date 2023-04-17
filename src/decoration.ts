import {
  Event,
  EventEmitter,
  FileDecoration,
  FileDecorationProvider,
  Uri,
} from "vscode";

export class DecorationProvider implements FileDecorationProvider {
  private decorations = new Map<string, FileDecoration>();

  private _onDidChangeFileDecorations: EventEmitter<Uri | undefined> =
    new EventEmitter<Uri | undefined>();
  readonly onDidChangeFileDecorations: Event<Uri | undefined> =
    this._onDidChangeFileDecorations.event;

  set(uri: Uri, decoration?: FileDecoration) {
    if (!decoration) {
      this.decorations.delete(uri.toString());
    } else {
      this.decorations.set(uri.toString(), decoration);
    }

    this._onDidChangeFileDecorations.fire(uri);
  }

  provideFileDecoration(uri: Uri): FileDecoration | undefined {
    return this.decorations.get(uri.toString());
  }
}

export const worktreeDecorator = new DecorationProvider();
export const changeDecorator = new DecorationProvider();
