import type { App, WorkspaceLeaf } from "obsidian";
import { FileView, MarkdownView, TFile, TFolder } from "obsidian";
import type { LinkPlacement } from "./types/linkPlacement";
import type { AppendLinkOptions } from "./types/linkPlacement";
import type { OpenLocation, FileViewMode2, OpenFileOptions } from "./types/fileOpening";

// Templater integration types
export type TemplaterPluginLike = {
	settings?: {
		trigger_on_file_creation?: boolean;
		auto_jump_to_cursor?: boolean;
	};
	templater?: {
		overwrite_file_commands?: (f: TFile) => Promise<void>;
		parse_template?: (
			opt: { target_file: TFile; run_mode: number },
			content: string,
		) => Promise<string>;
		files_with_pending_templates?: Set<string>;
		functions_generator?: { teardown?: () => Promise<void> };
	};
	editor_handler?: {
		plugin?: unknown;
		jump_to_next_cursor_location?: (
			file?: TFile | null,
			auto_jump?: boolean,
		) => Promise<void>;
	};
};

// Get Templater plugin instance
export function getTemplaterPlugin(app: App): TemplaterPluginLike | null {
	const plugin = (app as any).plugins?.plugins?.["templater-obsidian"];
	if (!plugin) return null;
	return plugin as unknown as TemplaterPluginLike;
}

// Check if Templater trigger on create is enabled
export function isTemplaterTriggerOnCreateEnabled(app: App): boolean {
	return !!getTemplaterPlugin(app)?.settings?.trigger_on_file_creation;
}

// Wait for Templater trigger on create to complete
export async function waitForTemplaterTriggerOnCreateToComplete(
	app: App,
	file: TFile,
): Promise<void> {
	if (file.extension !== "md") return;
	if (!isTemplaterTriggerOnCreateEnabled(app)) return;

	const plugin = getTemplaterPlugin(app);
	const pendingFiles = plugin?.templater?.files_with_pending_templates;
	if (!(pendingFiles instanceof Set)) {
		return;
	}

	const timeoutMs = 5000;
	const appearTimeoutMs = 2500;
	const start = Date.now();

	while (Date.now() - start < appearTimeoutMs) {
		if (pendingFiles.has(file.path)) break;
		await new Promise((r) => setTimeout(r, 50));
	}

	while (Date.now() - start < timeoutMs) {
		if (!pendingFiles.has(file.path)) break;
		await new Promise((r) => setTimeout(r, 50));
	}
}

// Overwrite Templater commands once
export async function overwriteTemplaterOnce(
	app: App,
	file: TFile,
): Promise<void> {
	if (file.extension !== "md") return;

	const plugin = getTemplaterPlugin(app);
	const templater = plugin?.templater;
	const overwrite = templater?.overwrite_file_commands;
	if (!plugin || !templater || typeof overwrite !== "function") return;

	try {
		await overwrite.call(templater, file);
	} catch (err) {
		console.error(`Templater failed on ${file.path}:`, err);
	}
}

// Parse template with Templater
export async function templaterParseTemplate(
	app: App,
	templateContent: string,
	targetFile: TFile,
) {
	if (targetFile.extension !== "md") return templateContent;

	const plugin = getTemplaterPlugin(app);
	const templater = plugin?.templater;
	const parseTemplate = templater?.parse_template;
	if (!plugin || !templater || typeof parseTemplate !== "function")
		return templateContent;

	return await parseTemplate.call(
		templater,
		{ target_file: targetFile, run_mode: 4 },
		templateContent,
	);
}

// Jump to next Templater cursor if possible
export async function jumpToNextTemplaterCursorIfPossible(
	app: App,
	file: TFile,
): Promise<void> {
	if (file.extension !== "md") return;
	if (app.workspace.getActiveFile()?.path !== file.path) return;

	const plugin = getTemplaterPlugin(app);
	const autoJumpEnabled = !!plugin?.settings?.auto_jump_to_cursor;
	const editorHandler = plugin?.editor_handler;
	const jump = editorHandler?.jump_to_next_cursor_location;

	if (!autoJumpEnabled) return;

	if (typeof jump === "function") {
		try {
			await jump.call(editorHandler, file, true);
			return;
		} catch (err) {
			console.error(`Failed to jump to next Templater cursor:`, err);
		}
	}

	try {
		((app as any).commands as unknown as {
			executeCommandById?: (commandId: string) => boolean;
		}).executeCommandById?.("templater-obsidian:jump-to-next-cursor-location");
	} catch {
		// no-op
	}
}

// Append to current line
export function appendToCurrentLine(toAppend: string, app: App) {
	try {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);

		if (!activeView) {
			console.error(`unable to append '${toAppend}' to current line.`);
			return;
		}

		activeView.editor.replaceSelection(toAppend);
	} catch {
		console.error(`unable to append '${toAppend}' to current line.`);
	}
}

// Insert on new line
export function insertOnNewLine(toInsert: string, direction: "above" | "below", app: App) {
	try {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);

		if (!activeView) {
			console.error(`unable to insert '${toInsert}' on new line ${direction}.`);
			return;
		}

		const editor = activeView.editor;
		const cursor = editor.getCursor();
		const lineNumber = cursor.line;

		if (direction === "above") {
			editor.replaceRange(toInsert + "\n", { line: lineNumber, ch: 0 });
			editor.setCursor({ line: lineNumber, ch: toInsert.length });
		} else {
			const currentLine = editor.getLine(lineNumber);
			editor.replaceRange("\n" + toInsert, { line: lineNumber, ch: currentLine.length });
			editor.setCursor({ line: lineNumber + 1, ch: toInsert.length });
		}
	} catch {
		console.error(`unable to insert '${toInsert}' on new line ${direction}.`);
	}
}

// Insert on new line above
export function insertOnNewLineAbove(toInsert: string, app: App) {
	insertOnNewLine(toInsert, "above", app);
}

// Insert on new line below
export function insertOnNewLineBelow(toInsert: string, app: App) {
	insertOnNewLine(toInsert, "below", app);
}

// Insert link with placement
export function insertLinkWithPlacement(
	app: App,
	text: string,
	mode: LinkPlacement = "replaceSelection",
	options: { requireActiveView?: boolean; } = {},
) {
	const { requireActiveView = true } = options;
	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		const message = "Cannot append link because no active Markdown view is available.";
		if (requireActiveView) {
			throw new Error(message);
		}
		console.log(message);
		return;
	}

	const editor = view.editor;

	if (mode === "replaceSelection") {
		editor.replaceSelection(text);
		return;
	}

	const selections = editor
		.listSelections()
		.map((sel) => ({
			anchor: { ...sel.anchor },
			head: { ...sel.head },
		}));

	const asIndex = ({ line, ch }: { line: number; ch: number; }) =>
		editor.posToOffset({ line, ch });

	const ordered = selections.sort(
		(a, b) => asIndex(b.head) - asIndex(a.head),
	);

	for (const sel of ordered) {
		const head = asIndex(sel.anchor) > asIndex(sel.head) ? sel.anchor : sel.head;

		switch (mode) {
			case "afterSelection":
				editor.replaceRange(text, head);
				break;
			case "endOfLine": {
				const lineStr = editor.getLine(head.line);
				const eolPos = { line: head.line, ch: lineStr.length };
				editor.replaceRange(text, eolPos);
				break;
			}
			case "newLine": {
				const lineStr = editor.getLine(head.line);
				const eolPos = { line: head.line, ch: lineStr.length };
				const isLineEmpty = lineStr.length === 0;
				const prefix = isLineEmpty ? "" : "\n";
				editor.replaceRange(prefix + text, eolPos);
				break;
			}
		}
	}
}

// Insert file link to active view
export function insertFileLinkToActiveView(
	app: App,
	file: TFile,
	linkOptions: AppendLinkOptions,
): boolean {
	if (!linkOptions?.enabled) return false;

	const activeFile = app.workspace.getActiveFile();
	if (!activeFile && linkOptions.requireActiveFile) {
		throw new Error("Append link is enabled but there's no active file to insert into.");
	}

	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		if (linkOptions.requireActiveFile) {
			throw new Error("Cannot append link because no active Markdown view is available.");
		}
		return false;
	}

	const sourcePath = activeFile?.path ?? "";
	const baseLink = app.fileManager.generateMarkdownLink(file, sourcePath);
	const linkText = baseLink;

	insertLinkWithPlacement(
		app,
		linkText,
		linkOptions.placement,
		{ requireActiveView: false },
	);

	return true;
}

// Open file with options
export async function openFile(
	app: App,
	fileOrPath: TFile | string,
	options: OpenFileOptions = {}
): Promise<WorkspaceLeaf> {
	const {
		location = "tab",
		direction = "vertical",
		mode,
		focus = true,
		eState,
	} = options;

	const file = typeof fileOrPath === "string"
		? (app.vault.getAbstractFileByPath(fileOrPath) as TFile | null)
		: fileOrPath;

	if (!file) throw new Error(`File not found: ${String(fileOrPath)}`);

	let leaf: WorkspaceLeaf | null;
	switch (location) {
		case "reuse":
			leaf = app.workspace.getLeaf(false);
			break;
		case "tab":
			leaf = app.workspace.getLeaf("tab");
			break;
		case "split":
			leaf = app.workspace.getLeaf("split", direction);
			break;
		case "window":
			leaf = app.workspace.getLeaf("window");
			break;
		case "left-sidebar":
			leaf = app.workspace.getLeftLeaf(true);
			break;
		case "right-sidebar":
			leaf = app.workspace.getRightLeaf(true);
			break;
		default:
			leaf = app.workspace.getLeaf("tab");
	}
	if (!leaf) throw new Error("Could not obtain a workspace leaf.");

	await leaf.openFile(file);

	if (mode && mode !== "default" && !(typeof mode === "object" && mode.mode === "default")) {
		const vs = leaf.getViewState();
		const next = { ...(vs.state ?? {}) };

		if (mode === "preview" || (typeof mode === "object" && mode.mode === "preview")) {
			next.mode = "preview";
			delete (next as any).source;
		} else if (mode === "source") {
			next.mode = "source";
			(next as any).source = true;
		} else if (mode === "live" || mode === "live-preview") {
			next.mode = "source";
			(next as any).source = false;
		} else if (typeof mode === "object" && mode.mode === "source") {
			next.mode = "source";
			(next as any).source = mode.source;
		}

		await leaf.setViewState({ ...vs, state: { ...next, ...eState } });
	}

	if (focus) {
		app.workspace.setActiveLeaf(leaf, { focus: true });
	}

	return leaf;
}

// Open existing file tab
export function openExistingFileTab(
	app: App,
	file: TFile,
	focus = true,
): WorkspaceLeaf | null {
	let leaf: WorkspaceLeaf | undefined = undefined;

	app.workspace.iterateRootLeaves((m_leaf: WorkspaceLeaf) => {
		const view = m_leaf.view;
		if (view instanceof FileView) {
			if (view.file) {
				if (file.path === view.file.path) {
					leaf = m_leaf;
					return;
				}
			}
		}
	});
	if (leaf !== undefined) {
		if (focus) {
			app.workspace.setActiveLeaf(leaf, { focus: true });
		}
		return leaf;
	}
	return null;
}

// Check if path is a folder
export function isFolder(app: App, path: string): boolean {
	const abstractItem = app.vault.getAbstractFileByPath(path);
	return !!abstractItem && abstractItem instanceof TFolder;
}

// Get markdown files in folder
export function getMarkdownFilesInFolder(app: App, folderPath: string): TFile[] {
	return app.vault
		.getMarkdownFiles()
		.filter((f) => f.path.startsWith(folderPath));
}

// Get markdown files with tag
export function getMarkdownFilesWithTag(app: App, tag: string): TFile[] {
	const targetTag = tag.replace(/^\#/, "");

	return app.vault.getMarkdownFiles().filter((f: TFile) => {
		const fileCache = app.metadataCache.getFileCache(f);
		if (!fileCache) return false;

		const tagsInFile: string[] = [];
		
		// Check frontmatter tags
		if (fileCache.frontmatter) {
			const frontmatter = fileCache.frontmatter;
			const frontMatterValues = Object.entries(frontmatter);
			const tagPairs = frontMatterValues.filter(([key, value]) => {
				const lowercaseKey = key.toLowerCase();
				return lowercaseKey === "tags" || lowercaseKey === "tag";
			});
			
			tagPairs.forEach(([key, value]) => {
				if (typeof value === "string") {
					tagsInFile.push(...value.split(/,|\s+/).map((v) => v.trim()));
				} else if (Array.isArray(value)) {
					tagsInFile.push(...value as string[]);
				}
			});
		}

		// Check inline tags
		if (fileCache.tags && Array.isArray(fileCache.tags)) {
			tagsInFile.push(...fileCache.tags.map((v) => v.tag.replace(/^\#/, "")));
		}

		return tagsInFile.includes(targetTag);
	});
}
