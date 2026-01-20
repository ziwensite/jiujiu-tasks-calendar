import { __awaiter } from "tslib";
import { FileView, MarkdownView, TFolder } from "obsidian";
// Get Templater plugin instance
export function getTemplaterPlugin(app) {
    var _a, _b;
    const plugin = (_b = (_a = app.plugins) === null || _a === void 0 ? void 0 : _a.plugins) === null || _b === void 0 ? void 0 : _b["templater-obsidian"];
    if (!plugin)
        return null;
    return plugin;
}
// Check if Templater trigger on create is enabled
export function isTemplaterTriggerOnCreateEnabled(app) {
    var _a, _b;
    return !!((_b = (_a = getTemplaterPlugin(app)) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.trigger_on_file_creation);
}
// Wait for Templater trigger on create to complete
export function waitForTemplaterTriggerOnCreateToComplete(app, file) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (file.extension !== "md")
            return;
        if (!isTemplaterTriggerOnCreateEnabled(app))
            return;
        const plugin = getTemplaterPlugin(app);
        const pendingFiles = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.templater) === null || _a === void 0 ? void 0 : _a.files_with_pending_templates;
        if (!(pendingFiles instanceof Set)) {
            return;
        }
        const timeoutMs = 5000;
        const appearTimeoutMs = 2500;
        const start = Date.now();
        while (Date.now() - start < appearTimeoutMs) {
            if (pendingFiles.has(file.path))
                break;
            yield new Promise((r) => setTimeout(r, 50));
        }
        while (Date.now() - start < timeoutMs) {
            if (!pendingFiles.has(file.path))
                break;
            yield new Promise((r) => setTimeout(r, 50));
        }
    });
}
// Overwrite Templater commands once
export function overwriteTemplaterOnce(app, file) {
    return __awaiter(this, void 0, void 0, function* () {
        if (file.extension !== "md")
            return;
        const plugin = getTemplaterPlugin(app);
        const templater = plugin === null || plugin === void 0 ? void 0 : plugin.templater;
        const overwrite = templater === null || templater === void 0 ? void 0 : templater.overwrite_file_commands;
        if (!plugin || !templater || typeof overwrite !== "function")
            return;
        try {
            yield overwrite.call(templater, file);
        }
        catch (err) {
            console.error(`Templater failed on ${file.path}:`, err);
        }
    });
}
// Parse template with Templater
export function templaterParseTemplate(app, templateContent, targetFile) {
    return __awaiter(this, void 0, void 0, function* () {
        if (targetFile.extension !== "md")
            return templateContent;
        const plugin = getTemplaterPlugin(app);
        const templater = plugin === null || plugin === void 0 ? void 0 : plugin.templater;
        const parseTemplate = templater === null || templater === void 0 ? void 0 : templater.parse_template;
        if (!plugin || !templater || typeof parseTemplate !== "function")
            return templateContent;
        return yield parseTemplate.call(templater, { target_file: targetFile, run_mode: 4 }, templateContent);
    });
}
// Jump to next Templater cursor if possible
export function jumpToNextTemplaterCursorIfPossible(app, file) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (file.extension !== "md")
            return;
        if (((_a = app.workspace.getActiveFile()) === null || _a === void 0 ? void 0 : _a.path) !== file.path)
            return;
        const plugin = getTemplaterPlugin(app);
        const autoJumpEnabled = !!((_b = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _b === void 0 ? void 0 : _b.auto_jump_to_cursor);
        const editorHandler = plugin === null || plugin === void 0 ? void 0 : plugin.editor_handler;
        const jump = editorHandler === null || editorHandler === void 0 ? void 0 : editorHandler.jump_to_next_cursor_location;
        if (!autoJumpEnabled)
            return;
        if (typeof jump === "function") {
            try {
                yield jump.call(editorHandler, file, true);
                return;
            }
            catch (err) {
                console.error(`Failed to jump to next Templater cursor:`, err);
            }
        }
        try {
            (_d = (_c = app.commands).executeCommandById) === null || _d === void 0 ? void 0 : _d.call(_c, "templater-obsidian:jump-to-next-cursor-location");
        }
        catch (_e) {
            // no-op
        }
    });
}
// Append to current line
export function appendToCurrentLine(toAppend, app) {
    try {
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            console.error(`unable to append '${toAppend}' to current line.`);
            return;
        }
        activeView.editor.replaceSelection(toAppend);
    }
    catch (_a) {
        console.error(`unable to append '${toAppend}' to current line.`);
    }
}
// Insert on new line
export function insertOnNewLine(toInsert, direction, app) {
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
        }
        else {
            const currentLine = editor.getLine(lineNumber);
            editor.replaceRange("\n" + toInsert, { line: lineNumber, ch: currentLine.length });
            editor.setCursor({ line: lineNumber + 1, ch: toInsert.length });
        }
    }
    catch (_a) {
        console.error(`unable to insert '${toInsert}' on new line ${direction}.`);
    }
}
// Insert on new line above
export function insertOnNewLineAbove(toInsert, app) {
    insertOnNewLine(toInsert, "above", app);
}
// Insert on new line below
export function insertOnNewLineBelow(toInsert, app) {
    insertOnNewLine(toInsert, "below", app);
}
// Insert link with placement
export function insertLinkWithPlacement(app, text, mode = "replaceSelection", options = {}) {
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
        anchor: Object.assign({}, sel.anchor),
        head: Object.assign({}, sel.head),
    }));
    const asIndex = ({ line, ch }) => editor.posToOffset({ line, ch });
    const ordered = selections.sort((a, b) => asIndex(b.head) - asIndex(a.head));
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
export function insertFileLinkToActiveView(app, file, linkOptions) {
    var _a;
    if (!(linkOptions === null || linkOptions === void 0 ? void 0 : linkOptions.enabled))
        return false;
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
    const sourcePath = (_a = activeFile === null || activeFile === void 0 ? void 0 : activeFile.path) !== null && _a !== void 0 ? _a : "";
    const baseLink = app.fileManager.generateMarkdownLink(file, sourcePath);
    const linkText = baseLink;
    insertLinkWithPlacement(app, linkText, linkOptions.placement, { requireActiveView: false });
    return true;
}
// Open file with options
export function openFile(app_1, fileOrPath_1) {
    return __awaiter(this, arguments, void 0, function* (app, fileOrPath, options = {}) {
        var _a;
        const { location = "tab", direction = "vertical", mode, focus = true, eState, } = options;
        const file = typeof fileOrPath === "string"
            ? app.vault.getAbstractFileByPath(fileOrPath)
            : fileOrPath;
        if (!file)
            throw new Error(`File not found: ${String(fileOrPath)}`);
        let leaf;
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
        if (!leaf)
            throw new Error("Could not obtain a workspace leaf.");
        yield leaf.openFile(file);
        if (mode && mode !== "default" && !(typeof mode === "object" && mode.mode === "default")) {
            const vs = leaf.getViewState();
            const next = Object.assign({}, ((_a = vs.state) !== null && _a !== void 0 ? _a : {}));
            if (mode === "preview" || (typeof mode === "object" && mode.mode === "preview")) {
                next.mode = "preview";
                delete next.source;
            }
            else if (mode === "source") {
                next.mode = "source";
                next.source = true;
            }
            else if (mode === "live" || mode === "live-preview") {
                next.mode = "source";
                next.source = false;
            }
            else if (typeof mode === "object" && mode.mode === "source") {
                next.mode = "source";
                next.source = mode.source;
            }
            yield leaf.setViewState(Object.assign(Object.assign({}, vs), { state: Object.assign(Object.assign({}, next), eState) }));
        }
        if (focus) {
            app.workspace.setActiveLeaf(leaf, { focus: true });
        }
        return leaf;
    });
}
// Open existing file tab
export function openExistingFileTab(app, file, focus = true) {
    let leaf = undefined;
    app.workspace.iterateRootLeaves((m_leaf) => {
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
export function isFolder(app, path) {
    const abstractItem = app.vault.getAbstractFileByPath(path);
    return !!abstractItem && abstractItem instanceof TFolder;
}
// Get markdown files in folder
export function getMarkdownFilesInFolder(app, folderPath) {
    return app.vault
        .getMarkdownFiles()
        .filter((f) => f.path.startsWith(folderPath));
}
// Get markdown files with tag
export function getMarkdownFilesWithTag(app, tag) {
    const targetTag = tag.replace(/^\#/, "");
    return app.vault.getMarkdownFiles().filter((f) => {
        const fileCache = app.metadataCache.getFileCache(f);
        if (!fileCache)
            return false;
        const tagsInFile = [];
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
                }
                else if (Array.isArray(value)) {
                    tagsInFile.push(...value);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbGl0eU9ic2lkaWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXRpbGl0eU9ic2lkaWFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBUyxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUE2QmxFLGdDQUFnQztBQUNoQyxNQUFNLFVBQVUsa0JBQWtCLENBQUMsR0FBUTs7SUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBQSxNQUFDLEdBQVcsQ0FBQyxPQUFPLDBDQUFFLE9BQU8sMENBQUcsb0JBQW9CLENBQUMsQ0FBQztJQUNyRSxJQUFJLENBQUMsTUFBTTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ3pCLE9BQU8sTUFBd0MsQ0FBQztBQUNqRCxDQUFDO0FBRUQsa0RBQWtEO0FBQ2xELE1BQU0sVUFBVSxpQ0FBaUMsQ0FBQyxHQUFROztJQUN6RCxPQUFPLENBQUMsQ0FBQyxDQUFBLE1BQUEsTUFBQSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsMENBQUUsUUFBUSwwQ0FBRSx3QkFBd0IsQ0FBQSxDQUFDO0FBQ3RFLENBQUM7QUFFRCxtREFBbUQ7QUFDbkQsTUFBTSxVQUFnQix5Q0FBeUMsQ0FDOUQsR0FBUSxFQUNSLElBQVc7OztRQUVYLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJO1lBQUUsT0FBTztRQUNwQyxJQUFJLENBQUMsaUNBQWlDLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTztRQUVwRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxNQUFNLFlBQVksR0FBRyxNQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxTQUFTLDBDQUFFLDRCQUE0QixDQUFDO1FBQ3JFLElBQUksQ0FBQyxDQUFDLFlBQVksWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQztRQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFekIsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLGVBQWUsRUFBRSxDQUFDO1lBQzdDLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUFFLE1BQU07WUFDdkMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsU0FBUyxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFBRSxNQUFNO1lBQ3hDLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDO0lBQ0YsQ0FBQztDQUFBO0FBRUQsb0NBQW9DO0FBQ3BDLE1BQU0sVUFBZ0Isc0JBQXNCLENBQzNDLEdBQVEsRUFDUixJQUFXOztRQUVYLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJO1lBQUUsT0FBTztRQUVwQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxNQUFNLFNBQVMsR0FBRyxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsU0FBUyxDQUFDO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSx1QkFBdUIsQ0FBQztRQUNyRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsU0FBUyxJQUFJLE9BQU8sU0FBUyxLQUFLLFVBQVU7WUFBRSxPQUFPO1FBRXJFLElBQUksQ0FBQztZQUNKLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsQ0FBQztJQUNGLENBQUM7Q0FBQTtBQUVELGdDQUFnQztBQUNoQyxNQUFNLFVBQWdCLHNCQUFzQixDQUMzQyxHQUFRLEVBQ1IsZUFBdUIsRUFDdkIsVUFBaUI7O1FBRWpCLElBQUksVUFBVSxDQUFDLFNBQVMsS0FBSyxJQUFJO1lBQUUsT0FBTyxlQUFlLENBQUM7UUFFMUQsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsTUFBTSxTQUFTLEdBQUcsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFNBQVMsQ0FBQztRQUNwQyxNQUFNLGFBQWEsR0FBRyxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsY0FBYyxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxTQUFTLElBQUksT0FBTyxhQUFhLEtBQUssVUFBVTtZQUMvRCxPQUFPLGVBQWUsQ0FBQztRQUV4QixPQUFPLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FDOUIsU0FBUyxFQUNULEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQ3hDLGVBQWUsQ0FDZixDQUFDO0lBQ0gsQ0FBQztDQUFBO0FBRUQsNENBQTRDO0FBQzVDLE1BQU0sVUFBZ0IsbUNBQW1DLENBQ3hELEdBQVEsRUFDUixJQUFXOzs7UUFFWCxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssSUFBSTtZQUFFLE9BQU87UUFDcEMsSUFBSSxDQUFBLE1BQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsMENBQUUsSUFBSSxNQUFLLElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTztRQUU5RCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsQ0FBQSxNQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxRQUFRLDBDQUFFLG1CQUFtQixDQUFBLENBQUM7UUFDaEUsTUFBTSxhQUFhLEdBQUcsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLGNBQWMsQ0FBQztRQUM3QyxNQUFNLElBQUksR0FBRyxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsNEJBQTRCLENBQUM7UUFFekQsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFPO1FBRTdCLElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxPQUFPO1lBQ1IsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNoRSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE1BQUEsTUFBRSxHQUFXLENBQUMsUUFFWixFQUFDLGtCQUFrQixtREFBRyxpREFBaUQsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFBQyxXQUFNLENBQUM7WUFDUixRQUFRO1FBQ1QsQ0FBQztJQUNGLENBQUM7Q0FBQTtBQUVELHlCQUF5QjtBQUN6QixNQUFNLFVBQVUsbUJBQW1CLENBQUMsUUFBZ0IsRUFBRSxHQUFRO0lBQzdELElBQUksQ0FBQztRQUNKLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLFFBQVEsb0JBQW9CLENBQUMsQ0FBQztZQUNqRSxPQUFPO1FBQ1IsQ0FBQztRQUVELFVBQVUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUFDLFdBQU0sQ0FBQztRQUNSLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLFFBQVEsb0JBQW9CLENBQUMsQ0FBQztJQUNsRSxDQUFDO0FBQ0YsQ0FBQztBQUVELHFCQUFxQjtBQUNyQixNQUFNLFVBQVUsZUFBZSxDQUFDLFFBQWdCLEVBQUUsU0FBNEIsRUFBRSxHQUFRO0lBQ3ZGLElBQUksQ0FBQztRQUNKLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLFFBQVEsaUJBQWlCLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFDMUUsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRS9CLElBQUksU0FBUyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzNCLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDbEUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMvQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksR0FBRyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNuRixNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7SUFDRixDQUFDO0lBQUMsV0FBTSxDQUFDO1FBQ1IsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsUUFBUSxpQkFBaUIsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUMzRSxDQUFDO0FBQ0YsQ0FBQztBQUVELDJCQUEyQjtBQUMzQixNQUFNLFVBQVUsb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxHQUFRO0lBQzlELGVBQWUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCwyQkFBMkI7QUFDM0IsTUFBTSxVQUFVLG9CQUFvQixDQUFDLFFBQWdCLEVBQUUsR0FBUTtJQUM5RCxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBRUQsNkJBQTZCO0FBQzdCLE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsR0FBUSxFQUNSLElBQVksRUFDWixPQUFzQixrQkFBa0IsRUFDeEMsVUFBNEMsRUFBRTtJQUU5QyxNQUFNLEVBQUUsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDO0lBQzdDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsTUFBTSxPQUFPLEdBQUcsa0VBQWtFLENBQUM7UUFDbkYsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsT0FBTztJQUNSLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBRTNCLElBQUksSUFBSSxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDakMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlCLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTTtTQUN2QixjQUFjLEVBQUU7U0FDaEIsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsTUFBTSxvQkFBTyxHQUFHLENBQUMsTUFBTSxDQUFFO1FBQ3pCLElBQUksb0JBQU8sR0FBRyxDQUFDLElBQUksQ0FBRTtLQUNyQixDQUFDLENBQUMsQ0FBQztJQUVMLE1BQU0sT0FBTyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFpQyxFQUFFLEVBQUUsQ0FDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRWxDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQzlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUMzQyxDQUFDO0lBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMzQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFN0UsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssZ0JBQWdCO2dCQUNwQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDaEMsTUFBTTtZQUNQLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sTUFBTSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2xDLE1BQU07WUFDUCxDQUFDO1lBQ0QsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNoQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztnQkFDekMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDdkMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELGtDQUFrQztBQUNsQyxNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLEdBQVEsRUFDUixJQUFXLEVBQ1gsV0FBOEI7O0lBRTlCLElBQUksQ0FBQyxDQUFBLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxPQUFPLENBQUE7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUV4QyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ2pELElBQUksQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzdELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLElBQUksV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1FBQ3JGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFBLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxJQUFJLG1DQUFJLEVBQUUsQ0FBQztJQUMxQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN4RSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFFMUIsdUJBQXVCLENBQ3RCLEdBQUcsRUFDSCxRQUFRLEVBQ1IsV0FBVyxDQUFDLFNBQVMsRUFDckIsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsQ0FDNUIsQ0FBQztJQUVGLE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELHlCQUF5QjtBQUN6QixNQUFNLFVBQWdCLFFBQVE7eURBQzdCLEdBQVEsRUFDUixVQUEwQixFQUMxQixVQUEyQixFQUFFOztRQUU3QixNQUFNLEVBQ0wsUUFBUSxHQUFHLEtBQUssRUFDaEIsU0FBUyxHQUFHLFVBQVUsRUFDdEIsSUFBSSxFQUNKLEtBQUssR0FBRyxJQUFJLEVBQ1osTUFBTSxHQUNOLEdBQUcsT0FBTyxDQUFDO1FBRVosTUFBTSxJQUFJLEdBQUcsT0FBTyxVQUFVLEtBQUssUUFBUTtZQUMxQyxDQUFDLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQWtCO1lBQy9ELENBQUMsQ0FBQyxVQUFVLENBQUM7UUFFZCxJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFcEUsSUFBSSxJQUEwQixDQUFDO1FBQy9CLFFBQVEsUUFBUSxFQUFFLENBQUM7WUFDbEIsS0FBSyxPQUFPO2dCQUNYLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDcEMsTUFBTTtZQUNQLEtBQUssS0FBSztnQkFDVCxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU07WUFDUCxLQUFLLE9BQU87Z0JBQ1gsSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDakQsTUFBTTtZQUNQLEtBQUssUUFBUTtnQkFDWixJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU07WUFDUCxLQUFLLGNBQWM7Z0JBQ2xCLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkMsTUFBTTtZQUNQLEtBQUssZUFBZTtnQkFDbkIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4QyxNQUFNO1lBQ1A7Z0JBQ0MsSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztRQUVqRSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFMUIsSUFBSSxJQUFJLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxRixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDL0IsTUFBTSxJQUFJLHFCQUFRLENBQUMsTUFBQSxFQUFFLENBQUMsS0FBSyxtQ0FBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO1lBRXJDLElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pGLElBQUksQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO2dCQUN0QixPQUFRLElBQVksQ0FBQyxNQUFNLENBQUM7WUFDN0IsQ0FBQztpQkFBTSxJQUFJLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7Z0JBQ3BCLElBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQzdCLENBQUM7aUJBQU0sSUFBSSxJQUFJLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDdkQsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7Z0JBQ3BCLElBQVksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBQzlCLENBQUM7aUJBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7Z0JBQ3BCLElBQVksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNwQyxDQUFDO1lBRUQsTUFBTSxJQUFJLENBQUMsWUFBWSxpQ0FBTSxFQUFFLEtBQUUsS0FBSyxrQ0FBTyxJQUFJLEdBQUssTUFBTSxLQUFLLENBQUM7UUFDbkUsQ0FBQztRQUVELElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQUE7QUFFRCx5QkFBeUI7QUFDekIsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxHQUFRLEVBQ1IsSUFBVyxFQUNYLEtBQUssR0FBRyxJQUFJO0lBRVosSUFBSSxJQUFJLEdBQThCLFNBQVMsQ0FBQztJQUVoRCxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsTUFBcUIsRUFBRSxFQUFFO1FBQ3pELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDekIsSUFBSSxJQUFJLFlBQVksUUFBUSxFQUFFLENBQUM7WUFDOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2xDLElBQUksR0FBRyxNQUFNLENBQUM7b0JBQ2QsT0FBTztnQkFDUixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUNILElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsNEJBQTRCO0FBQzVCLE1BQU0sVUFBVSxRQUFRLENBQUMsR0FBUSxFQUFFLElBQVk7SUFDOUMsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzRCxPQUFPLENBQUMsQ0FBQyxZQUFZLElBQUksWUFBWSxZQUFZLE9BQU8sQ0FBQztBQUMxRCxDQUFDO0FBRUQsK0JBQStCO0FBQy9CLE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxHQUFRLEVBQUUsVUFBa0I7SUFDcEUsT0FBTyxHQUFHLENBQUMsS0FBSztTQUNkLGdCQUFnQixFQUFFO1NBQ2xCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNoRCxDQUFDO0FBRUQsOEJBQThCO0FBQzlCLE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxHQUFRLEVBQUUsR0FBVztJQUM1RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztJQUV6QyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFRLEVBQUUsRUFBRTtRQUN2RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBRTdCLE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztRQUVoQyx5QkFBeUI7UUFDekIsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0IsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQztZQUMxQyxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtnQkFDMUQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN2QyxPQUFPLFlBQVksS0FBSyxNQUFNLElBQUksWUFBWSxLQUFLLEtBQUssQ0FBQztZQUMxRCxDQUFDLENBQUMsQ0FBQztZQUVILFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFO2dCQUNqQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUMvQixVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQy9ELENBQUM7cUJBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFpQixDQUFDLENBQUM7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxvQkFBb0I7UUFDcEIsSUFBSSxTQUFTLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckQsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHAsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IEZpbGVWaWV3LCBNYXJrZG93blZpZXcsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSB7IExpbmtQbGFjZW1lbnQgfSBmcm9tIFwiLi90eXBlcy9saW5rUGxhY2VtZW50XCI7XG5pbXBvcnQgdHlwZSB7IEFwcGVuZExpbmtPcHRpb25zIH0gZnJvbSBcIi4vdHlwZXMvbGlua1BsYWNlbWVudFwiO1xuaW1wb3J0IHR5cGUgeyBPcGVuTG9jYXRpb24sIEZpbGVWaWV3TW9kZTIsIE9wZW5GaWxlT3B0aW9ucyB9IGZyb20gXCIuL3R5cGVzL2ZpbGVPcGVuaW5nXCI7XG5cbi8vIFRlbXBsYXRlciBpbnRlZ3JhdGlvbiB0eXBlc1xuZXhwb3J0IHR5cGUgVGVtcGxhdGVyUGx1Z2luTGlrZSA9IHtcblx0c2V0dGluZ3M/OiB7XG5cdFx0dHJpZ2dlcl9vbl9maWxlX2NyZWF0aW9uPzogYm9vbGVhbjtcblx0XHRhdXRvX2p1bXBfdG9fY3Vyc29yPzogYm9vbGVhbjtcblx0fTtcblx0dGVtcGxhdGVyPzoge1xuXHRcdG92ZXJ3cml0ZV9maWxlX2NvbW1hbmRzPzogKGY6IFRGaWxlKSA9PiBQcm9taXNlPHZvaWQ+O1xuXHRcdHBhcnNlX3RlbXBsYXRlPzogKFxuXHRcdFx0b3B0OiB7IHRhcmdldF9maWxlOiBURmlsZTsgcnVuX21vZGU6IG51bWJlciB9LFxuXHRcdFx0Y29udGVudDogc3RyaW5nLFxuXHRcdCkgPT4gUHJvbWlzZTxzdHJpbmc+O1xuXHRcdGZpbGVzX3dpdGhfcGVuZGluZ190ZW1wbGF0ZXM/OiBTZXQ8c3RyaW5nPjtcblx0XHRmdW5jdGlvbnNfZ2VuZXJhdG9yPzogeyB0ZWFyZG93bj86ICgpID0+IFByb21pc2U8dm9pZD4gfTtcblx0fTtcblx0ZWRpdG9yX2hhbmRsZXI/OiB7XG5cdFx0cGx1Z2luPzogdW5rbm93bjtcblx0XHRqdW1wX3RvX25leHRfY3Vyc29yX2xvY2F0aW9uPzogKFxuXHRcdFx0ZmlsZT86IFRGaWxlIHwgbnVsbCxcblx0XHRcdGF1dG9fanVtcD86IGJvb2xlYW4sXG5cdFx0KSA9PiBQcm9taXNlPHZvaWQ+O1xuXHR9O1xufTtcblxuLy8gR2V0IFRlbXBsYXRlciBwbHVnaW4gaW5zdGFuY2VcbmV4cG9ydCBmdW5jdGlvbiBnZXRUZW1wbGF0ZXJQbHVnaW4oYXBwOiBBcHApOiBUZW1wbGF0ZXJQbHVnaW5MaWtlIHwgbnVsbCB7XG5cdGNvbnN0IHBsdWdpbiA9IChhcHAgYXMgYW55KS5wbHVnaW5zPy5wbHVnaW5zPy5bXCJ0ZW1wbGF0ZXItb2JzaWRpYW5cIl07XG5cdGlmICghcGx1Z2luKSByZXR1cm4gbnVsbDtcblx0cmV0dXJuIHBsdWdpbiBhcyB1bmtub3duIGFzIFRlbXBsYXRlclBsdWdpbkxpa2U7XG59XG5cbi8vIENoZWNrIGlmIFRlbXBsYXRlciB0cmlnZ2VyIG9uIGNyZWF0ZSBpcyBlbmFibGVkXG5leHBvcnQgZnVuY3Rpb24gaXNUZW1wbGF0ZXJUcmlnZ2VyT25DcmVhdGVFbmFibGVkKGFwcDogQXBwKTogYm9vbGVhbiB7XG5cdHJldHVybiAhIWdldFRlbXBsYXRlclBsdWdpbihhcHApPy5zZXR0aW5ncz8udHJpZ2dlcl9vbl9maWxlX2NyZWF0aW9uO1xufVxuXG4vLyBXYWl0IGZvciBUZW1wbGF0ZXIgdHJpZ2dlciBvbiBjcmVhdGUgdG8gY29tcGxldGVcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yVGVtcGxhdGVyVHJpZ2dlck9uQ3JlYXRlVG9Db21wbGV0ZShcblx0YXBwOiBBcHAsXG5cdGZpbGU6IFRGaWxlLFxuKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChmaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSByZXR1cm47XG5cdGlmICghaXNUZW1wbGF0ZXJUcmlnZ2VyT25DcmVhdGVFbmFibGVkKGFwcCkpIHJldHVybjtcblxuXHRjb25zdCBwbHVnaW4gPSBnZXRUZW1wbGF0ZXJQbHVnaW4oYXBwKTtcblx0Y29uc3QgcGVuZGluZ0ZpbGVzID0gcGx1Z2luPy50ZW1wbGF0ZXI/LmZpbGVzX3dpdGhfcGVuZGluZ190ZW1wbGF0ZXM7XG5cdGlmICghKHBlbmRpbmdGaWxlcyBpbnN0YW5jZW9mIFNldCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCB0aW1lb3V0TXMgPSA1MDAwO1xuXHRjb25zdCBhcHBlYXJUaW1lb3V0TXMgPSAyNTAwO1xuXHRjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG5cblx0d2hpbGUgKERhdGUubm93KCkgLSBzdGFydCA8IGFwcGVhclRpbWVvdXRNcykge1xuXHRcdGlmIChwZW5kaW5nRmlsZXMuaGFzKGZpbGUucGF0aCkpIGJyZWFrO1xuXHRcdGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwKSk7XG5cdH1cblxuXHR3aGlsZSAoRGF0ZS5ub3coKSAtIHN0YXJ0IDwgdGltZW91dE1zKSB7XG5cdFx0aWYgKCFwZW5kaW5nRmlsZXMuaGFzKGZpbGUucGF0aCkpIGJyZWFrO1xuXHRcdGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDUwKSk7XG5cdH1cbn1cblxuLy8gT3ZlcndyaXRlIFRlbXBsYXRlciBjb21tYW5kcyBvbmNlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gb3ZlcndyaXRlVGVtcGxhdGVyT25jZShcblx0YXBwOiBBcHAsXG5cdGZpbGU6IFRGaWxlLFxuKTogUHJvbWlzZTx2b2lkPiB7XG5cdGlmIChmaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSByZXR1cm47XG5cblx0Y29uc3QgcGx1Z2luID0gZ2V0VGVtcGxhdGVyUGx1Z2luKGFwcCk7XG5cdGNvbnN0IHRlbXBsYXRlciA9IHBsdWdpbj8udGVtcGxhdGVyO1xuXHRjb25zdCBvdmVyd3JpdGUgPSB0ZW1wbGF0ZXI/Lm92ZXJ3cml0ZV9maWxlX2NvbW1hbmRzO1xuXHRpZiAoIXBsdWdpbiB8fCAhdGVtcGxhdGVyIHx8IHR5cGVvZiBvdmVyd3JpdGUgIT09IFwiZnVuY3Rpb25cIikgcmV0dXJuO1xuXG5cdHRyeSB7XG5cdFx0YXdhaXQgb3ZlcndyaXRlLmNhbGwodGVtcGxhdGVyLCBmaWxlKTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Y29uc29sZS5lcnJvcihgVGVtcGxhdGVyIGZhaWxlZCBvbiAke2ZpbGUucGF0aH06YCwgZXJyKTtcblx0fVxufVxuXG4vLyBQYXJzZSB0ZW1wbGF0ZSB3aXRoIFRlbXBsYXRlclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlbXBsYXRlclBhcnNlVGVtcGxhdGUoXG5cdGFwcDogQXBwLFxuXHR0ZW1wbGF0ZUNvbnRlbnQ6IHN0cmluZyxcblx0dGFyZ2V0RmlsZTogVEZpbGUsXG4pIHtcblx0aWYgKHRhcmdldEZpbGUuZXh0ZW5zaW9uICE9PSBcIm1kXCIpIHJldHVybiB0ZW1wbGF0ZUNvbnRlbnQ7XG5cblx0Y29uc3QgcGx1Z2luID0gZ2V0VGVtcGxhdGVyUGx1Z2luKGFwcCk7XG5cdGNvbnN0IHRlbXBsYXRlciA9IHBsdWdpbj8udGVtcGxhdGVyO1xuXHRjb25zdCBwYXJzZVRlbXBsYXRlID0gdGVtcGxhdGVyPy5wYXJzZV90ZW1wbGF0ZTtcblx0aWYgKCFwbHVnaW4gfHwgIXRlbXBsYXRlciB8fCB0eXBlb2YgcGFyc2VUZW1wbGF0ZSAhPT0gXCJmdW5jdGlvblwiKVxuXHRcdHJldHVybiB0ZW1wbGF0ZUNvbnRlbnQ7XG5cblx0cmV0dXJuIGF3YWl0IHBhcnNlVGVtcGxhdGUuY2FsbChcblx0XHR0ZW1wbGF0ZXIsXG5cdFx0eyB0YXJnZXRfZmlsZTogdGFyZ2V0RmlsZSwgcnVuX21vZGU6IDQgfSxcblx0XHR0ZW1wbGF0ZUNvbnRlbnQsXG5cdCk7XG59XG5cbi8vIEp1bXAgdG8gbmV4dCBUZW1wbGF0ZXIgY3Vyc29yIGlmIHBvc3NpYmxlXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24ganVtcFRvTmV4dFRlbXBsYXRlckN1cnNvcklmUG9zc2libGUoXG5cdGFwcDogQXBwLFxuXHRmaWxlOiBURmlsZSxcbik6IFByb21pc2U8dm9pZD4ge1xuXHRpZiAoZmlsZS5leHRlbnNpb24gIT09IFwibWRcIikgcmV0dXJuO1xuXHRpZiAoYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk/LnBhdGggIT09IGZpbGUucGF0aCkgcmV0dXJuO1xuXG5cdGNvbnN0IHBsdWdpbiA9IGdldFRlbXBsYXRlclBsdWdpbihhcHApO1xuXHRjb25zdCBhdXRvSnVtcEVuYWJsZWQgPSAhIXBsdWdpbj8uc2V0dGluZ3M/LmF1dG9fanVtcF90b19jdXJzb3I7XG5cdGNvbnN0IGVkaXRvckhhbmRsZXIgPSBwbHVnaW4/LmVkaXRvcl9oYW5kbGVyO1xuXHRjb25zdCBqdW1wID0gZWRpdG9ySGFuZGxlcj8uanVtcF90b19uZXh0X2N1cnNvcl9sb2NhdGlvbjtcblxuXHRpZiAoIWF1dG9KdW1wRW5hYmxlZCkgcmV0dXJuO1xuXG5cdGlmICh0eXBlb2YganVtcCA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGF3YWl0IGp1bXAuY2FsbChlZGl0b3JIYW5kbGVyLCBmaWxlLCB0cnVlKTtcblx0XHRcdHJldHVybjtcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBqdW1wIHRvIG5leHQgVGVtcGxhdGVyIGN1cnNvcjpgLCBlcnIpO1xuXHRcdH1cblx0fVxuXG5cdHRyeSB7XG5cdFx0KChhcHAgYXMgYW55KS5jb21tYW5kcyBhcyB1bmtub3duIGFzIHtcblx0XHRcdGV4ZWN1dGVDb21tYW5kQnlJZD86IChjb21tYW5kSWQ6IHN0cmluZykgPT4gYm9vbGVhbjtcblx0XHR9KS5leGVjdXRlQ29tbWFuZEJ5SWQ/LihcInRlbXBsYXRlci1vYnNpZGlhbjpqdW1wLXRvLW5leHQtY3Vyc29yLWxvY2F0aW9uXCIpO1xuXHR9IGNhdGNoIHtcblx0XHQvLyBuby1vcFxuXHR9XG59XG5cbi8vIEFwcGVuZCB0byBjdXJyZW50IGxpbmVcbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRUb0N1cnJlbnRMaW5lKHRvQXBwZW5kOiBzdHJpbmcsIGFwcDogQXBwKSB7XG5cdHRyeSB7XG5cdFx0Y29uc3QgYWN0aXZlVmlldyA9IGFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuXG5cdFx0aWYgKCFhY3RpdmVWaWV3KSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKGB1bmFibGUgdG8gYXBwZW5kICcke3RvQXBwZW5kfScgdG8gY3VycmVudCBsaW5lLmApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGFjdGl2ZVZpZXcuZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24odG9BcHBlbmQpO1xuXHR9IGNhdGNoIHtcblx0XHRjb25zb2xlLmVycm9yKGB1bmFibGUgdG8gYXBwZW5kICcke3RvQXBwZW5kfScgdG8gY3VycmVudCBsaW5lLmApO1xuXHR9XG59XG5cbi8vIEluc2VydCBvbiBuZXcgbGluZVxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9uTmV3TGluZSh0b0luc2VydDogc3RyaW5nLCBkaXJlY3Rpb246IFwiYWJvdmVcIiB8IFwiYmVsb3dcIiwgYXBwOiBBcHApIHtcblx0dHJ5IHtcblx0XHRjb25zdCBhY3RpdmVWaWV3ID0gYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG5cblx0XHRpZiAoIWFjdGl2ZVZpZXcpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYHVuYWJsZSB0byBpbnNlcnQgJyR7dG9JbnNlcnR9JyBvbiBuZXcgbGluZSAke2RpcmVjdGlvbn0uYCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgZWRpdG9yID0gYWN0aXZlVmlldy5lZGl0b3I7XG5cdFx0Y29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuXHRcdGNvbnN0IGxpbmVOdW1iZXIgPSBjdXJzb3IubGluZTtcblxuXHRcdGlmIChkaXJlY3Rpb24gPT09IFwiYWJvdmVcIikge1xuXHRcdFx0ZWRpdG9yLnJlcGxhY2VSYW5nZSh0b0luc2VydCArIFwiXFxuXCIsIHsgbGluZTogbGluZU51bWJlciwgY2g6IDAgfSk7XG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogbGluZU51bWJlciwgY2g6IHRvSW5zZXJ0Lmxlbmd0aCB9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgY3VycmVudExpbmUgPSBlZGl0b3IuZ2V0TGluZShsaW5lTnVtYmVyKTtcblx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2UoXCJcXG5cIiArIHRvSW5zZXJ0LCB7IGxpbmU6IGxpbmVOdW1iZXIsIGNoOiBjdXJyZW50TGluZS5sZW5ndGggfSk7XG5cdFx0XHRlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogbGluZU51bWJlciArIDEsIGNoOiB0b0luc2VydC5sZW5ndGggfSk7XG5cdFx0fVxuXHR9IGNhdGNoIHtcblx0XHRjb25zb2xlLmVycm9yKGB1bmFibGUgdG8gaW5zZXJ0ICcke3RvSW5zZXJ0fScgb24gbmV3IGxpbmUgJHtkaXJlY3Rpb259LmApO1xuXHR9XG59XG5cbi8vIEluc2VydCBvbiBuZXcgbGluZSBhYm92ZVxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9uTmV3TGluZUFib3ZlKHRvSW5zZXJ0OiBzdHJpbmcsIGFwcDogQXBwKSB7XG5cdGluc2VydE9uTmV3TGluZSh0b0luc2VydCwgXCJhYm92ZVwiLCBhcHApO1xufVxuXG4vLyBJbnNlcnQgb24gbmV3IGxpbmUgYmVsb3dcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPbk5ld0xpbmVCZWxvdyh0b0luc2VydDogc3RyaW5nLCBhcHA6IEFwcCkge1xuXHRpbnNlcnRPbk5ld0xpbmUodG9JbnNlcnQsIFwiYmVsb3dcIiwgYXBwKTtcbn1cblxuLy8gSW5zZXJ0IGxpbmsgd2l0aCBwbGFjZW1lbnRcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRMaW5rV2l0aFBsYWNlbWVudChcblx0YXBwOiBBcHAsXG5cdHRleHQ6IHN0cmluZyxcblx0bW9kZTogTGlua1BsYWNlbWVudCA9IFwicmVwbGFjZVNlbGVjdGlvblwiLFxuXHRvcHRpb25zOiB7IHJlcXVpcmVBY3RpdmVWaWV3PzogYm9vbGVhbjsgfSA9IHt9LFxuKSB7XG5cdGNvbnN0IHsgcmVxdWlyZUFjdGl2ZVZpZXcgPSB0cnVlIH0gPSBvcHRpb25zO1xuXHRjb25zdCB2aWV3ID0gYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG5cdGlmICghdmlldykge1xuXHRcdGNvbnN0IG1lc3NhZ2UgPSBcIkNhbm5vdCBhcHBlbmQgbGluayBiZWNhdXNlIG5vIGFjdGl2ZSBNYXJrZG93biB2aWV3IGlzIGF2YWlsYWJsZS5cIjtcblx0XHRpZiAocmVxdWlyZUFjdGl2ZVZpZXcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcblx0XHR9XG5cdFx0Y29uc29sZS5sb2cobWVzc2FnZSk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgZWRpdG9yID0gdmlldy5lZGl0b3I7XG5cblx0aWYgKG1vZGUgPT09IFwicmVwbGFjZVNlbGVjdGlvblwiKSB7XG5cdFx0ZWRpdG9yLnJlcGxhY2VTZWxlY3Rpb24odGV4dCk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3Qgc2VsZWN0aW9ucyA9IGVkaXRvclxuXHRcdC5saXN0U2VsZWN0aW9ucygpXG5cdFx0Lm1hcCgoc2VsKSA9PiAoe1xuXHRcdFx0YW5jaG9yOiB7IC4uLnNlbC5hbmNob3IgfSxcblx0XHRcdGhlYWQ6IHsgLi4uc2VsLmhlYWQgfSxcblx0XHR9KSk7XG5cblx0Y29uc3QgYXNJbmRleCA9ICh7IGxpbmUsIGNoIH06IHsgbGluZTogbnVtYmVyOyBjaDogbnVtYmVyOyB9KSA9PlxuXHRcdGVkaXRvci5wb3NUb09mZnNldCh7IGxpbmUsIGNoIH0pO1xuXG5cdGNvbnN0IG9yZGVyZWQgPSBzZWxlY3Rpb25zLnNvcnQoXG5cdFx0KGEsIGIpID0+IGFzSW5kZXgoYi5oZWFkKSAtIGFzSW5kZXgoYS5oZWFkKSxcblx0KTtcblxuXHRmb3IgKGNvbnN0IHNlbCBvZiBvcmRlcmVkKSB7XG5cdFx0Y29uc3QgaGVhZCA9IGFzSW5kZXgoc2VsLmFuY2hvcikgPiBhc0luZGV4KHNlbC5oZWFkKSA/IHNlbC5hbmNob3IgOiBzZWwuaGVhZDtcblxuXHRcdHN3aXRjaCAobW9kZSkge1xuXHRcdFx0Y2FzZSBcImFmdGVyU2VsZWN0aW9uXCI6XG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2UodGV4dCwgaGVhZCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBcImVuZE9mTGluZVwiOiB7XG5cdFx0XHRcdGNvbnN0IGxpbmVTdHIgPSBlZGl0b3IuZ2V0TGluZShoZWFkLmxpbmUpO1xuXHRcdFx0XHRjb25zdCBlb2xQb3MgPSB7IGxpbmU6IGhlYWQubGluZSwgY2g6IGxpbmVTdHIubGVuZ3RoIH07XG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2UodGV4dCwgZW9sUG9zKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRjYXNlIFwibmV3TGluZVwiOiB7XG5cdFx0XHRcdGNvbnN0IGxpbmVTdHIgPSBlZGl0b3IuZ2V0TGluZShoZWFkLmxpbmUpO1xuXHRcdFx0XHRjb25zdCBlb2xQb3MgPSB7IGxpbmU6IGhlYWQubGluZSwgY2g6IGxpbmVTdHIubGVuZ3RoIH07XG5cdFx0XHRcdGNvbnN0IGlzTGluZUVtcHR5ID0gbGluZVN0ci5sZW5ndGggPT09IDA7XG5cdFx0XHRcdGNvbnN0IHByZWZpeCA9IGlzTGluZUVtcHR5ID8gXCJcIiA6IFwiXFxuXCI7XG5cdFx0XHRcdGVkaXRvci5yZXBsYWNlUmFuZ2UocHJlZml4ICsgdGV4dCwgZW9sUG9zKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cbi8vIEluc2VydCBmaWxlIGxpbmsgdG8gYWN0aXZlIHZpZXdcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRGaWxlTGlua1RvQWN0aXZlVmlldyhcblx0YXBwOiBBcHAsXG5cdGZpbGU6IFRGaWxlLFxuXHRsaW5rT3B0aW9uczogQXBwZW5kTGlua09wdGlvbnMsXG4pOiBib29sZWFuIHtcblx0aWYgKCFsaW5rT3B0aW9ucz8uZW5hYmxlZCkgcmV0dXJuIGZhbHNlO1xuXG5cdGNvbnN0IGFjdGl2ZUZpbGUgPSBhcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcblx0aWYgKCFhY3RpdmVGaWxlICYmIGxpbmtPcHRpb25zLnJlcXVpcmVBY3RpdmVGaWxlKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFwiQXBwZW5kIGxpbmsgaXMgZW5hYmxlZCBidXQgdGhlcmUncyBubyBhY3RpdmUgZmlsZSB0byBpbnNlcnQgaW50by5cIik7XG5cdH1cblxuXHRjb25zdCB2aWV3ID0gYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG5cdGlmICghdmlldykge1xuXHRcdGlmIChsaW5rT3B0aW9ucy5yZXF1aXJlQWN0aXZlRmlsZSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGFwcGVuZCBsaW5rIGJlY2F1c2Ugbm8gYWN0aXZlIE1hcmtkb3duIHZpZXcgaXMgYXZhaWxhYmxlLlwiKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0Y29uc3Qgc291cmNlUGF0aCA9IGFjdGl2ZUZpbGU/LnBhdGggPz8gXCJcIjtcblx0Y29uc3QgYmFzZUxpbmsgPSBhcHAuZmlsZU1hbmFnZXIuZ2VuZXJhdGVNYXJrZG93bkxpbmsoZmlsZSwgc291cmNlUGF0aCk7XG5cdGNvbnN0IGxpbmtUZXh0ID0gYmFzZUxpbms7XG5cblx0aW5zZXJ0TGlua1dpdGhQbGFjZW1lbnQoXG5cdFx0YXBwLFxuXHRcdGxpbmtUZXh0LFxuXHRcdGxpbmtPcHRpb25zLnBsYWNlbWVudCxcblx0XHR7IHJlcXVpcmVBY3RpdmVWaWV3OiBmYWxzZSB9LFxuXHQpO1xuXG5cdHJldHVybiB0cnVlO1xufVxuXG4vLyBPcGVuIGZpbGUgd2l0aCBvcHRpb25zXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gb3BlbkZpbGUoXG5cdGFwcDogQXBwLFxuXHRmaWxlT3JQYXRoOiBURmlsZSB8IHN0cmluZyxcblx0b3B0aW9uczogT3BlbkZpbGVPcHRpb25zID0ge31cbik6IFByb21pc2U8V29ya3NwYWNlTGVhZj4ge1xuXHRjb25zdCB7XG5cdFx0bG9jYXRpb24gPSBcInRhYlwiLFxuXHRcdGRpcmVjdGlvbiA9IFwidmVydGljYWxcIixcblx0XHRtb2RlLFxuXHRcdGZvY3VzID0gdHJ1ZSxcblx0XHRlU3RhdGUsXG5cdH0gPSBvcHRpb25zO1xuXG5cdGNvbnN0IGZpbGUgPSB0eXBlb2YgZmlsZU9yUGF0aCA9PT0gXCJzdHJpbmdcIlxuXHRcdD8gKGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZU9yUGF0aCkgYXMgVEZpbGUgfCBudWxsKVxuXHRcdDogZmlsZU9yUGF0aDtcblxuXHRpZiAoIWZpbGUpIHRocm93IG5ldyBFcnJvcihgRmlsZSBub3QgZm91bmQ6ICR7U3RyaW5nKGZpbGVPclBhdGgpfWApO1xuXG5cdGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbDtcblx0c3dpdGNoIChsb2NhdGlvbikge1xuXHRcdGNhc2UgXCJyZXVzZVwiOlxuXHRcdFx0bGVhZiA9IGFwcC53b3Jrc3BhY2UuZ2V0TGVhZihmYWxzZSk7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFwidGFiXCI6XG5cdFx0XHRsZWFmID0gYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBcInNwbGl0XCI6XG5cdFx0XHRsZWFmID0gYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwic3BsaXRcIiwgZGlyZWN0aW9uKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgXCJ3aW5kb3dcIjpcblx0XHRcdGxlYWYgPSBhcHAud29ya3NwYWNlLmdldExlYWYoXCJ3aW5kb3dcIik7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIFwibGVmdC1zaWRlYmFyXCI6XG5cdFx0XHRsZWFmID0gYXBwLndvcmtzcGFjZS5nZXRMZWZ0TGVhZih0cnVlKTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgXCJyaWdodC1zaWRlYmFyXCI6XG5cdFx0XHRsZWFmID0gYXBwLndvcmtzcGFjZS5nZXRSaWdodExlYWYodHJ1ZSk7XG5cdFx0XHRicmVhaztcblx0XHRkZWZhdWx0OlxuXHRcdFx0bGVhZiA9IGFwcC53b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcblx0fVxuXHRpZiAoIWxlYWYpIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBvYnRhaW4gYSB3b3Jrc3BhY2UgbGVhZi5cIik7XG5cblx0YXdhaXQgbGVhZi5vcGVuRmlsZShmaWxlKTtcblxuXHRpZiAobW9kZSAmJiBtb2RlICE9PSBcImRlZmF1bHRcIiAmJiAhKHR5cGVvZiBtb2RlID09PSBcIm9iamVjdFwiICYmIG1vZGUubW9kZSA9PT0gXCJkZWZhdWx0XCIpKSB7XG5cdFx0Y29uc3QgdnMgPSBsZWFmLmdldFZpZXdTdGF0ZSgpO1xuXHRcdGNvbnN0IG5leHQgPSB7IC4uLih2cy5zdGF0ZSA/PyB7fSkgfTtcblxuXHRcdGlmIChtb2RlID09PSBcInByZXZpZXdcIiB8fCAodHlwZW9mIG1vZGUgPT09IFwib2JqZWN0XCIgJiYgbW9kZS5tb2RlID09PSBcInByZXZpZXdcIikpIHtcblx0XHRcdG5leHQubW9kZSA9IFwicHJldmlld1wiO1xuXHRcdFx0ZGVsZXRlIChuZXh0IGFzIGFueSkuc291cmNlO1xuXHRcdH0gZWxzZSBpZiAobW9kZSA9PT0gXCJzb3VyY2VcIikge1xuXHRcdFx0bmV4dC5tb2RlID0gXCJzb3VyY2VcIjtcblx0XHRcdChuZXh0IGFzIGFueSkuc291cmNlID0gdHJ1ZTtcblx0XHR9IGVsc2UgaWYgKG1vZGUgPT09IFwibGl2ZVwiIHx8IG1vZGUgPT09IFwibGl2ZS1wcmV2aWV3XCIpIHtcblx0XHRcdG5leHQubW9kZSA9IFwic291cmNlXCI7XG5cdFx0XHQobmV4dCBhcyBhbnkpLnNvdXJjZSA9IGZhbHNlO1xuXHRcdH0gZWxzZSBpZiAodHlwZW9mIG1vZGUgPT09IFwib2JqZWN0XCIgJiYgbW9kZS5tb2RlID09PSBcInNvdXJjZVwiKSB7XG5cdFx0XHRuZXh0Lm1vZGUgPSBcInNvdXJjZVwiO1xuXHRcdFx0KG5leHQgYXMgYW55KS5zb3VyY2UgPSBtb2RlLnNvdXJjZTtcblx0XHR9XG5cblx0XHRhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IC4uLnZzLCBzdGF0ZTogeyAuLi5uZXh0LCAuLi5lU3RhdGUgfSB9KTtcblx0fVxuXG5cdGlmIChmb2N1cykge1xuXHRcdGFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB7IGZvY3VzOiB0cnVlIH0pO1xuXHR9XG5cblx0cmV0dXJuIGxlYWY7XG59XG5cbi8vIE9wZW4gZXhpc3RpbmcgZmlsZSB0YWJcbmV4cG9ydCBmdW5jdGlvbiBvcGVuRXhpc3RpbmdGaWxlVGFiKFxuXHRhcHA6IEFwcCxcblx0ZmlsZTogVEZpbGUsXG5cdGZvY3VzID0gdHJ1ZSxcbik6IFdvcmtzcGFjZUxlYWYgfCBudWxsIHtcblx0bGV0IGxlYWY6IFdvcmtzcGFjZUxlYWYgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cblx0YXBwLndvcmtzcGFjZS5pdGVyYXRlUm9vdExlYXZlcygobV9sZWFmOiBXb3Jrc3BhY2VMZWFmKSA9PiB7XG5cdFx0Y29uc3QgdmlldyA9IG1fbGVhZi52aWV3O1xuXHRcdGlmICh2aWV3IGluc3RhbmNlb2YgRmlsZVZpZXcpIHtcblx0XHRcdGlmICh2aWV3LmZpbGUpIHtcblx0XHRcdFx0aWYgKGZpbGUucGF0aCA9PT0gdmlldy5maWxlLnBhdGgpIHtcblx0XHRcdFx0XHRsZWFmID0gbV9sZWFmO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cdGlmIChsZWFmICE9PSB1bmRlZmluZWQpIHtcblx0XHRpZiAoZm9jdXMpIHtcblx0XHRcdGFwcC53b3Jrc3BhY2Uuc2V0QWN0aXZlTGVhZihsZWFmLCB7IGZvY3VzOiB0cnVlIH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gbGVhZjtcblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuLy8gQ2hlY2sgaWYgcGF0aCBpcyBhIGZvbGRlclxuZXhwb3J0IGZ1bmN0aW9uIGlzRm9sZGVyKGFwcDogQXBwLCBwYXRoOiBzdHJpbmcpOiBib29sZWFuIHtcblx0Y29uc3QgYWJzdHJhY3RJdGVtID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcblx0cmV0dXJuICEhYWJzdHJhY3RJdGVtICYmIGFic3RyYWN0SXRlbSBpbnN0YW5jZW9mIFRGb2xkZXI7XG59XG5cbi8vIEdldCBtYXJrZG93biBmaWxlcyBpbiBmb2xkZXJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNYXJrZG93bkZpbGVzSW5Gb2xkZXIoYXBwOiBBcHAsIGZvbGRlclBhdGg6IHN0cmluZyk6IFRGaWxlW10ge1xuXHRyZXR1cm4gYXBwLnZhdWx0XG5cdFx0LmdldE1hcmtkb3duRmlsZXMoKVxuXHRcdC5maWx0ZXIoKGYpID0+IGYucGF0aC5zdGFydHNXaXRoKGZvbGRlclBhdGgpKTtcbn1cblxuLy8gR2V0IG1hcmtkb3duIGZpbGVzIHdpdGggdGFnXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWFya2Rvd25GaWxlc1dpdGhUYWcoYXBwOiBBcHAsIHRhZzogc3RyaW5nKTogVEZpbGVbXSB7XG5cdGNvbnN0IHRhcmdldFRhZyA9IHRhZy5yZXBsYWNlKC9eXFwjLywgXCJcIik7XG5cblx0cmV0dXJuIGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZmlsdGVyKChmOiBURmlsZSkgPT4ge1xuXHRcdGNvbnN0IGZpbGVDYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKTtcblx0XHRpZiAoIWZpbGVDYWNoZSkgcmV0dXJuIGZhbHNlO1xuXG5cdFx0Y29uc3QgdGFnc0luRmlsZTogc3RyaW5nW10gPSBbXTtcblx0XHRcblx0XHQvLyBDaGVjayBmcm9udG1hdHRlciB0YWdzXG5cdFx0aWYgKGZpbGVDYWNoZS5mcm9udG1hdHRlcikge1xuXHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXI7XG5cdFx0XHRjb25zdCBmcm9udE1hdHRlclZhbHVlcyA9IE9iamVjdC5lbnRyaWVzKGZyb250bWF0dGVyKTtcblx0XHRcdGNvbnN0IHRhZ1BhaXJzID0gZnJvbnRNYXR0ZXJWYWx1ZXMuZmlsdGVyKChba2V5LCB2YWx1ZV0pID0+IHtcblx0XHRcdFx0Y29uc3QgbG93ZXJjYXNlS2V5ID0ga2V5LnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdHJldHVybiBsb3dlcmNhc2VLZXkgPT09IFwidGFnc1wiIHx8IGxvd2VyY2FzZUtleSA9PT0gXCJ0YWdcIjtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHR0YWdQYWlycy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcblx0XHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdHRhZ3NJbkZpbGUucHVzaCguLi52YWx1ZS5zcGxpdCgvLHxcXHMrLykubWFwKCh2KSA9PiB2LnRyaW0oKSkpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0XHRcdFx0dGFnc0luRmlsZS5wdXNoKC4uLnZhbHVlIGFzIHN0cmluZ1tdKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgaW5saW5lIHRhZ3Ncblx0XHRpZiAoZmlsZUNhY2hlLnRhZ3MgJiYgQXJyYXkuaXNBcnJheShmaWxlQ2FjaGUudGFncykpIHtcblx0XHRcdHRhZ3NJbkZpbGUucHVzaCguLi5maWxlQ2FjaGUudGFncy5tYXAoKHYpID0+IHYudGFnLnJlcGxhY2UoL15cXCMvLCBcIlwiKSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0YWdzSW5GaWxlLmluY2x1ZGVzKHRhcmdldFRhZyk7XG5cdH0pO1xufVxuIl19