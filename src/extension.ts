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
		vscode.commands.executeCommand('editor.fold');
	});
}

function insert(position: vscode.Position, text: string) {
	vscode.window.activeTextEditor?.edit(textEditorEdit => {
		textEditorEdit.insert(position, text);
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

const REGION_START_RE = /\/\/#region/;
const REGION_END_RE = /\/\/#endregion/;
const REGION_ACTIVE_RE = /\/\/\s*__\d+__active/;
const BLOCK_START_RE = /\/\/\s*__\d+__/;
const BLOCK_END_RE = /\/\/#endblock/;

export function isRegionStart(line = '') {
	return REGION_START_RE.test(line);
}

export function isRegionEnd(line = '') {
	return REGION_END_RE.test(line);
}

export function isActiveBlock(line = '') {
	return REGION_ACTIVE_RE.test(line);
}

export function isBlockStart(line = '') {
	return BLOCK_START_RE.test(line);
}

export function isBlockEnd(line = '') {
	return BLOCK_END_RE.test(line);
}

// FIXME: Right now this only checks if the cursor is on the start of a region.
// It should check if the cursor is contained with in the parallel blocks.
// Can iterate though lines above or below to see where/if it runs into a #region or #endblock
export function isParallelRegion(selection: vscode.Selection) {
	if (selection.start.line === selection.end.line) {
		const line = vscode.window.activeTextEditor?.document.lineAt(selection.start.line).text;
		return isRegionStart(line);
	}
	return false;
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

function deactivateBlockString(str: string) {
	return str.replace('active', '');
}

function arrayInsert(arr: any[], index: number, ...items: any[]) {
	return [
		...arr.slice(0, index),
		...items,
		...arr.slice(index)
	];
}

function parseBlocks(lines: string[]) {
	
	let activeLineBlock = -1;
	let endRegion = 0;
	let endBlock = 0;
	const blocks = [];
	let currentBlock: string[] | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line && isBlockStart(line)) {
			if (currentBlock) {
				blocks.push(currentBlock);
			}

			if (isActiveBlock(line)) {
				activeLineBlock = blocks.length;
			}

			currentBlock = [];			
		}

		if (line && isRegionEnd(line)) {
			blocks.push(currentBlock);
			currentBlock = [];
		}

		if (currentBlock) {
			currentBlock.push(line);
		}

		if (line && isBlockEnd(line)) {
			blocks.push(currentBlock);
		}
	}

	return { activeLineBlock, blocks };
}

/**
 * Turns the blocks array into a string.
 * @param blocks string[][]
 */
function joinBlocks(blocks: any) {
	return blocks.reduce((acc: string, block: string[], i: number) => {
		if (i > 0) {
			return acc + '\n' + block.join('\n');
		} else {
			return acc + block.join('\n');
		}
	}, '');
}

function getText(lineNumber: number) {
	return vscode.window.activeTextEditor?.document.lineAt(lineNumber).text || '';
}

/**
 * Returns the information about the parallel region if it exists, null otherwise.
 * @param selection 
 */
function getRegion(selection: vscode.Selection) {
	const lineCount = vscode.window.activeTextEditor?.document.lineCount || 0;
	let regionStart: number | undefined;
	let blockEnd: number | undefined;
	// Get region start
	for (let i = selection.start.line; i >= 0; i--) {
		const text = getText(i);
		if (isRegionStart(text)) {
			regionStart = i;
			break;
		} else if (i !== selection.start.line && isBlockEnd(text)) {
			return null;
		}
	}

	for (let i = selection.end.line; i < lineCount; i++) {
		const text = getText(i);
		if (isBlockEnd(text)) {
			blockEnd = i;
			break;
		} else if (i !== regionStart && isRegionStart(text)) {
			return null;
		}
	}

	if (!isDefined(regionStart) || !isDefined(blockEnd)) {
		return null;
	}

	if (typeof regionStart === 'number' && typeof blockEnd === 'number') {
		const lines = [];
		for (let i = regionStart; i <= blockEnd; i++) {
			const text = getText(i);
			lines.push(text);
		}

		const { activeLineBlock, blocks } = parseBlocks(lines);

		return {
			regionStart,
			blockEnd,
			lines,
			activeLineBlock,
			blocks
		};
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "parallel-blocks" is now active!');

	let newBlock = vscode.commands.registerCommand(
		'parallel-blocks.newBlock',  
		() => {
			const environment = getCurrentEnvironment();
			if (vscode.window.activeTextEditor) {
				const selection = vscode.window.activeTextEditor.selection;

				const region = getRegion(selection);
				console.log(region);

				// Add a block to an existing region.
				// if (isParallelRegion(selection)) {
				if (region) {
					console.log('Adding new block');
					// Adding a new block here.
					// Need to get the region after the last block.
					const indentation = generateIndentation(vscode.window.activeTextEditor?.document.lineAt(selection.start.line).text);
					
					const { blocks, activeLineBlock } = region;

					// Deactive the currently active section.
					if (activeLineBlock > -1) {
						// Remove active from the block declaration line
						const blockToDeactivate = blocks[activeLineBlock] || [];
						blockToDeactivate[0] = deactivateBlockString(blockToDeactivate[0]);
						// add the previously active text below the now deactivated line.

						if (blocks[blocks.length-1]?.length) {
							const activeLines = blocks[blocks.length - 1] || [];
							for (let i = 1; i < activeLines.length - 1; i++) {
								const line = `${COMMENT} ${activeLines[i]}`;
								blockToDeactivate?.push(line);
							}
						}

						const block = [];
						block.push(`${indentation}${COMMENT} __${blocks.length}__active`);

						const newBlocks = arrayInsert(blocks, blocks.length - 1, block);

						const snippet = joinBlocks(newBlocks) + '\n';
						replaceSelection(new vscode.Selection(
							new vscode.Position(region.regionStart + 1, 0),
							new vscode.Position(region.blockEnd, 0)
						), snippet);
					}
				} else {
					// Create a new region.
					const region = generateRegion(selection);
					if (region) {
						replaceSelection(vscode.window.activeTextEditor?.selection, region);
					}
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
