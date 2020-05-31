// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const COMMENT = '//';

function isDefined(el: any) {
	return el !== undefined && el !== null;
}

function getCurrentEnvironment() {
	const currentLine = Number(vscode.window.activeTextEditor?.selection.active.line);
	const currentLineString = isDefined(currentLine) ? vscode.window.activeTextEditor?.document.lineAt(currentLine).text : null;
	const currentLanguageId = vscode.window.activeTextEditor?.document.languageId;
	const currentInsertSpacesStatus = vscode.window.activeTextEditor?.options.insertSpaces;
	const currentTabSize = vscode.window.activeTextEditor?.options.tabSize;

	return {
		currentLine,
		currentLineString,
		currentLanguageId,
		currentInsertSpacesStatus,
		currentTabSize
	};
}

function replaceSelection(selection: vscode.Selection, text: string) {
	const lines = new vscode.Selection(
		new vscode.Position(selection.start.line, 0),
		new vscode.Position(selection.end.line + 1, 0)
	);
	vscode.window.activeTextEditor?.edit(textEditorEdit => {
		textEditorEdit.replace(lines, text);
	});
}

function repeat(text: string, times: number) {
	let result = '';
	for (let i = 0; i < times; i++) {
		result += text;
	}
	return result;
}

function getIndentation(line: string) {
	let tabs = 0;
	let spaces = 0;

	for (let i = 0; i < line.length; i++) {
		switch (line[i]) {
			case '\t':
				tabs++;
				break;
			
			case ' ':
				spaces++;
				break;
			
			default:
				return { tabs, spaces };
		}
	}

	return { tabs, spaces };
}

function computeTabs(tabs: number) {
	const currentInsertSpacesStatus = vscode.window.activeTextEditor?.options.insertSpaces;
	const currentTabSize = Number(vscode.window.activeTextEditor?.options.tabSize);

	if (currentInsertSpacesStatus) {
		return repeat(' ', currentTabSize * tabs);
	} else {
		return repeat('\t', tabs);
	}
}

function generateIndentation(line: string) {
	const linesFirstSpacing = getIndentation(line);
	return repeat(' ', linesFirstSpacing.spaces) + computeTabs(linesFirstSpacing.tabs);
}

function generateBlockString(lines: string[], n: number, active = false) {
	const indentation = generateIndentation(lines[0]);
	let block = '';
	if (active) {
		block = `${indentation}${COMMENT} __${n}__active\n`;
	} else {
		block = `${indentation}${COMMENT} __${n}__\n`;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const indent = generateIndentation(line);
			block += `${indent}${COMMENT} ${line.trim()}\n`;
		}
	}

	return block;
}

/**
 * A region will have at least two blocks. Otherwise the is no need for the extension.
 * When the region is added the current code will be save and a new block will be added with the same code.
 * @param selection 
 */
function generateRegion(selection: vscode.Selection) {
	const lines = [];
	if (vscode.window.activeTextEditor) {
		const indentation = generateIndentation(vscode.window.activeTextEditor?.document.lineAt(selection.start.line).text);
		for (let n = selection.start.line; n <= selection.end.line; n++) {
			const line = vscode.window.activeTextEditor?.document.lineAt(n).text;
			lines.push(line);
		}
		let section = `${indentation}${COMMENT}#region\n`;

		section += generateBlockString(lines, 1);
		section += generateBlockString(lines, 2, true);

		section += `${indentation}${COMMENT}#endregion\n`;

		for (let i = 0; i < lines.length; i++) {
			section += lines[i] + '\n';
		}

		section += `${indentation}${COMMENT}#endblock\n`;

		return section;
	}
	return null;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "parallel-blocks" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let newBlock = vscode.commands.registerCommand(
		'parallel-blocks.newBlock',  
		() => {
			const environment = getCurrentEnvironment();
			if (vscode.window.activeTextEditor) {
				const region = generateRegion(vscode.window.activeTextEditor?.selection);
				if (region) {
					replaceSelection(vscode.window.activeTextEditor?.selection, region);
					vscode.commands.executeCommand('editor.fold');
				}
			}
		}
	);

	let nextBlock = vscode.commands.registerCommand(
		'parallel-blocks.nextBlock',
		() => {}
	);

	let prevBlock = vscode.commands.registerCommand(
		'parallel-blocks.prevBlock',
		() => {}
	);

	context.subscriptions.push(newBlock);
	context.subscriptions.push(nextBlock);
	context.subscriptions.push(prevBlock);
}

// this method is called when your extension is deactivated
export function deactivate() {}
