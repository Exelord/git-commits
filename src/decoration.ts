import { FileDecoration, FileDecorationProvider, Uri } from "vscode";

export const decorations = new Map<string, FileDecoration>();

export class ChangeDecorationProvider implements FileDecorationProvider {
  provideFileDecoration(uri: Uri): FileDecoration | undefined {
    return decorations.get(uri.toString());
  }
}
