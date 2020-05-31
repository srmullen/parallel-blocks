# How to build a VSCode extension.

- Running into issues with `registerTextEditorCommand`. This seems like the method that should be used when wanting to deal with the text of a file. This is wrong. Just need to use `registerCommand`.

- VS Code cannot access the DOM. Does that mean the extension will not be able to add windows?

- Will probably need to take advantage the the [Programmatic Languate Features](https://code.visualstudio.com/api/language-extensions/overview#programmatic-language-features). Maybe [Workbench Extensions](https://code.visualstudio.com/api/extension-capabilities/extending-workbench)

- Use `vscode.window.activeTextEditor?.selection` to get cursor position and highlighted code.

- Have region generation and folding working. Now need to add new block.