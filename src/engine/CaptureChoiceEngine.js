import { __awaiter } from "tslib";
import { Notice, TFile } from "obsidian";
import { normalizeAppendLinkOptions } from "../types/linkPlacement";
import { getCaptureAction } from "./captureAction";
import { CaptureChoiceFormatter } from "../formatters/captureChoiceFormatter";
import { appendToCurrentLine, getMarkdownFilesInFolder, getMarkdownFilesWithTag, insertFileLinkToActiveView, insertOnNewLineAbove, insertOnNewLineBelow, isTemplaterTriggerOnCreateEnabled, jumpToNextTemplaterCursorIfPossible, isFolder, openExistingFileTab, openFile, overwriteTemplaterOnce, templaterParseTemplate, waitForTemplaterTriggerOnCreateToComplete } from "../utilityObsidian";
const DEFAULT_NOTICE_DURATION = 4000;
export class CaptureChoiceEngine {
    constructor(app, plugin, choice, choiceExecutor) {
        this.choiceExecutor = choiceExecutor;
        this.capturePropertyVars = new Map();
        this.choice = choice;
        this.plugin = plugin;
        this.formatter = new CaptureChoiceFormatter(app, plugin, choiceExecutor);
        // Set input method if provided
        if (choice.inputMethod) {
            this.formatter.setInputMethod(choice.inputMethod);
        }
        // Set choice so formatters can use it for target date
        this.formatter.setChoice(choice);
    }
    showSuccessNotice(file, { wasNewFile, action }) {
        const fileName = `'${file.basename}'`;
        if (wasNewFile) {
            new Notice(`Created and captured to ${fileName}`, DEFAULT_NOTICE_DURATION);
            return;
        }
        let msg = "";
        switch (action) {
            case "currentLine":
                msg = `Captured to current line in ${fileName}`;
                break;
            case "prepend":
            case "activeFileTop":
                msg = `Captured to top of ${fileName}`;
                break;
            case "append":
                msg = `Captured to ${fileName}`;
                break;
            case "insertAfter": {
                const heading = this.choice.insertAfter.after;
                msg = heading
                    ? `Captured to ${fileName} under '${heading}'`
                    : `Captured to ${fileName}`;
                break;
            }
        }
        new Notice(msg, DEFAULT_NOTICE_DURATION);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                // Reset any pending structured values before starting a new capture run
                this.capturePropertyVars.clear();
                const linkOptions = normalizeAppendLinkOptions(this.choice.appendLink);
                this.formatter.setLinkToCurrentFileBehavior(linkOptions.enabled && !linkOptions.requireActiveFile
                    ? "optional"
                    : "required");
                const useSelectionAsCaptureValue = (_a = this.choice.useSelectionAsCaptureValue) !== null && _a !== void 0 ? _a : true;
                this.formatter.setUseSelectionAsCaptureValue(useSelectionAsCaptureValue);
                const filePath = yield this.getFormattedPathToCaptureTo(this.choice.captureToActiveFile);
                const content = this.getCaptureContent();
                let getFileAndAddContentFn;
                const fileAlreadyExists = yield this.fileExists(filePath);
                if (fileAlreadyExists) {
                    getFileAndAddContentFn = this.onFileExists.bind(this);
                }
                else if ((_c = (_b = this.choice) === null || _b === void 0 ? void 0 : _b.createFileIfItDoesntExist) === null || _c === void 0 ? void 0 : _c.enabled) {
                    getFileAndAddContentFn = ((path, capture, _options) => this.onCreateFileIfItDoesntExist(path, capture, linkOptions));
                }
                else {
                    console.warn(`The file ${filePath} does not exist and "Create file if it doesn't exist" is disabled.`);
                    return;
                }
                const { file, newFileContent, captureContent } = yield getFileAndAddContentFn(filePath, content);
                const action = getCaptureAction(this.choice);
                const isEditorInsertionAction = action === "currentLine" ||
                    action === "newLineAbove" ||
                    action === "newLineBelow";
                // Handle capture to active file with special actions
                if (isEditorInsertionAction) {
                    // Parse Templater syntax in the capture content
                    const content = yield templaterParseTemplate(this.plugin.app, captureContent, file);
                    switch (action) {
                        case "currentLine":
                            appendToCurrentLine(content, this.plugin.app);
                            break;
                        case "newLineAbove":
                            insertOnNewLineAbove(content, this.plugin.app);
                            break;
                        case "newLineBelow":
                            insertOnNewLineBelow(content, this.plugin.app);
                            break;
                    }
                }
                else {
                    yield this.plugin.app.vault.modify(file, newFileContent);
                    if (((_d = this.choice.templater) === null || _d === void 0 ? void 0 : _d.afterCapture) === "wholeFile") {
                        yield overwriteTemplaterOnce(this.plugin.app, file);
                    }
                    yield this.applyCapturePropertyVars(file);
                }
                // Show success notification
                this.showSuccessNotice(file, {
                    wasNewFile: !fileAlreadyExists,
                    action,
                });
                if (linkOptions.enabled) {
                    insertFileLinkToActiveView(this.plugin.app, file, linkOptions);
                }
                if (this.choice.openFile && file) {
                    const fileOpening = this.choice.fileOpening;
                    const focus = (_e = fileOpening.focus) !== null && _e !== void 0 ? _e : true;
                    const openExistingTab = openExistingFileTab(this.plugin.app, file, focus);
                    if (!openExistingTab) {
                        yield openFile(this.plugin.app, file, fileOpening);
                    }
                    yield jumpToNextTemplaterCursorIfPossible(this.plugin.app, file);
                }
            }
            catch (err) {
                console.error(`Error running capture choice "${this.choice.name}":`, err);
                new Notice(`Error running capture choice: ${err.message}`, DEFAULT_NOTICE_DURATION);
            }
        });
    }
    getCaptureContent() {
        let content;
        if (!this.choice.format.enabled)
            content = "{{VALUE}}";
        else
            content = this.choice.format.format;
        if (this.choice.task)
            content = `- [ ] ${content}\n`;
        return content;
    }
    getFormattedPathToCaptureTo(shouldCaptureToActiveFile) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shouldCaptureToActiveFile) {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                if (!activeFile) {
                    throw new Error("Cannot capture to active file - no active file.");
                }
                return activeFile.path;
            }
            const captureTo = this.choice.captureTo;
            const formattedCaptureTo = yield this.formatFilePath(captureTo);
            // Removing the trailing slash from the capture to path
            const folderPath = formattedCaptureTo.replace(/^\/$|\/\.md$|^\.md$/, "");
            // Empty string means we suggest to capture anywhere in the vault
            const captureAnywhereInVault = folderPath === "";
            const shouldCaptureToFolder = captureAnywhereInVault || isFolder(this.plugin.app, folderPath);
            const shouldCaptureWithTag = formattedCaptureTo.startsWith("#");
            if (shouldCaptureToFolder) {
                return this.selectFileInFolder(folderPath, captureAnywhereInVault);
            }
            if (shouldCaptureWithTag) {
                const tag = formattedCaptureTo.replace(/\.md$/, "");
                return this.selectFileWithTag(tag);
            }
            return formattedCaptureTo;
        });
    }
    selectFileInFolder(folderPath, captureAnywhereInVault) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPathSlash = folderPath.endsWith("/") || captureAnywhereInVault
                ? folderPath
                : `${folderPath}/`;
            const filesInFolder = getMarkdownFilesInFolder(this.plugin.app, folderPathSlash);
            if (filesInFolder.length === 0) {
                throw new Error(`Folder ${folderPathSlash} is empty.`);
            }
            // For simplicity, just return the first file in the folder
            // In a full implementation, you would show a file picker
            return filesInFolder.length > 0 ? filesInFolder[0].path : '';
        });
    }
    selectFileWithTag(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const tagWithHash = tag.startsWith("#") ? tag : `#${tag}`;
            const filesWithTag = getMarkdownFilesWithTag(this.plugin.app, tagWithHash);
            if (filesWithTag.length === 0) {
                throw new Error(`No files with tag ${tag}.`);
            }
            // For simplicity, just return the first file with the tag
            // In a full implementation, you would show a file picker
            return filesWithTag.length > 0 ? filesWithTag[0].path : '';
        });
    }
    onFileExists(filePath, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.getFileByPath(filePath);
            if (!file)
                throw new Error("File not found");
            // Set the title to the existing file's basename
            this.formatter.setTitle(file.basename);
            // Set the choice so formatters can use it for title
            this.formatter.setChoice(this.choice);
            // Set the destination file so formatters can generate proper relative links
            this.formatter.setDestinationFile(file);
            // First format pass...
            const formatted = yield this.formatter.formatContentOnly(content);
            this.mergeCapturePropertyVars(this.formatter.getAndClearTemplatePropertyVars());
            const fileContent = yield this.plugin.app.vault.read(file);
            // Second format pass, with the file content...
            const formattedFileContent = yield this.formatter.formatContentWithFile(formatted, this.choice, fileContent, file);
            this.mergeCapturePropertyVars(this.formatter.getAndClearTemplatePropertyVars());
            return { file, newFileContent: formattedFileContent, captureContent: formatted };
        });
    }
    onCreateFileIfItDoesntExist(filePath, captureContent, linkOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Extract filename without extension from the full path
            const fileBasename = ((_a = filePath.split("/").pop()) === null || _a === void 0 ? void 0 : _a.replace(/\.md$/, "")) || "";
            this.formatter.setTitle(fileBasename);
            // Set the choice so formatters can use it for title
            this.formatter.setChoice(this.choice);
            // Set the destination path so formatters can generate proper relative links
            this.formatter.setDestinationSourcePath(filePath);
            // First formatting pass: resolve placeholders and prompt for user input
            const formattedCaptureContent = yield this.formatter.formatContentOnly(captureContent);
            this.mergeCapturePropertyVars(this.formatter.getAndClearTemplatePropertyVars());
            let fileContent = "";
            if (this.choice.createFileIfItDoesntExist.createWithTemplate) {
                // 获取模板路径
                let templatePath = this.choice.createFileIfItDoesntExist.template;
                if (templatePath) {
                    try {
                        // 先格式化模板路径，替换其中的变量
                        templatePath = yield this.formatter.formatFileName(templatePath, this.choice.name);
                        console.log(`Formatted template path: ${templatePath}`);
                        // 确保模板路径有 .md 扩展名
                        if (!templatePath.endsWith('.md')) {
                            templatePath += '.md';
                            console.log(`Added .md extension to template path: ${templatePath}`);
                        }
                        // 尝试读取模板文件内容
                        const templateFile = this.plugin.app.vault.getAbstractFileByPath(templatePath);
                        if (templateFile && templateFile instanceof TFile) {
                            fileContent = yield this.plugin.app.vault.read(templateFile);
                            console.log(`Template file read successfully: ${templatePath}`);
                        }
                        else {
                            console.warn(`Template file not found: ${templatePath}`);
                            fileContent = "";
                        }
                    }
                    catch (error) {
                        console.error(`Error reading template file: ${templatePath}`, error);
                        fileContent = "";
                    }
                }
            }
            // Create the new file with the (optional) template content
            const file = yield this.plugin.app.vault.create(filePath, fileContent);
            // Process Templater commands in the template if a template was used
            if (this.choice.createFileIfItDoesntExist.createWithTemplate &&
                fileContent) {
                yield overwriteTemplaterOnce(this.plugin.app, file);
            }
            else if (isTemplaterTriggerOnCreateEnabled(this.plugin.app)) {
                yield waitForTemplaterTriggerOnCreateToComplete(this.plugin.app, file);
            }
            // Read the file fresh from disk
            const updatedFileContent = yield this.plugin.app.vault.read(file);
            // Second formatting pass: embed the already-resolved capture content into the newly created file
            const newFileContent = yield this.formatter.formatContentWithFile(formattedCaptureContent, this.choice, updatedFileContent, file);
            this.mergeCapturePropertyVars(this.formatter.getAndClearTemplatePropertyVars());
            return { file, newFileContent, captureContent: formattedCaptureContent };
        });
    }
    formatFilePath(captureTo) {
        return __awaiter(this, void 0, void 0, function* () {
            const formattedCaptureTo = yield this.formatter.formatFileName(captureTo, this.choice.name);
            return this.normalizeMarkdownFilePath("", formattedCaptureTo);
        });
    }
    normalizeMarkdownFilePath(basePath, fileName) {
        if (!fileName.endsWith(".md")) {
            fileName += ".md";
        }
        return basePath ? `${basePath}/${fileName}` : fileName;
    }
    fileExists(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = this.plugin.app.vault.getAbstractFileByPath(path);
            return file !== null;
        });
    }
    getFileByPath(path) {
        const file = this.plugin.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            throw new Error(`File not found: ${path}`);
        }
        return file;
    }
    mergeCapturePropertyVars(vars) {
        if (!vars || vars.size === 0) {
            return;
        }
        for (const [key, value] of vars) {
            this.capturePropertyVars.set(key, value);
        }
    }
    applyCapturePropertyVars(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.capturePropertyVars.size === 0) {
                return;
            }
            // In a full implementation, you would handle frontmatter property updates
            this.capturePropertyVars.clear();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FwdHVyZUNob2ljZUVuZ2luZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNhcHR1cmVDaG9pY2VFbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQVksS0FBSyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRW5ELE9BQU8sRUFBRSwwQkFBMEIsRUFBMEIsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQXNCLE1BQU0saUJBQWlCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLDBCQUEwQixFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLGlDQUFpQyxFQUFFLG1DQUFtQyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUseUNBQXlDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUloWSxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQztBQUVyQyxNQUFNLE9BQU8sbUJBQW1CO0lBTy9CLFlBQ0MsR0FBUSxFQUNSLE1BQWdCLEVBQ2hCLE1BQXNCLEVBQ2QsY0FBK0I7UUFBL0IsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBTmhDLHdCQUFtQixHQUF5QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBUTdELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3pFLCtCQUErQjtRQUMvQixJQUFLLE1BQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxD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QUFLLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0QsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDO1FBQ3RCLENBQUM7S0FBQTtJQUVPLGFBQWEsQ0FBQyxJQUFZO1FBQ2pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvRCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxJQUEwQjtRQUMxRCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFFRCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFYSx3QkFBd0IsQ0FBQyxJQUFXOztZQUNqRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE9BQU87WUFDUixDQUFDO1lBRUQsMEVBQTBFO1lBQzFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5vdGljZSwgdHlwZSBBcHAsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgSUNob2ljZUV4ZWN1dG9yIH0gZnJvbSBcIi4uL0lDaG9pY2VFeGVjdXRvclwiO1xyXG5pbXBvcnQgeyBub3JtYWxpemVBcHBlbmRMaW5rT3B0aW9ucywgdHlwZSBBcHBlbmRMaW5rT3B0aW9ucyB9IGZyb20gXCIuLi90eXBlcy9saW5rUGxhY2VtZW50XCI7XHJcbmltcG9ydCB7IGdldENhcHR1cmVBY3Rpb24sIHR5cGUgQ2FwdHVyZUFjdGlvbiB9IGZyb20gXCIuL2NhcHR1cmVBY3Rpb25cIjtcclxuaW1wb3J0IHsgQ2FwdHVyZUNob2ljZUZvcm1hdHRlciB9IGZyb20gXCIuLi9mb3JtYXR0ZXJzL2NhcHR1cmVDaG9pY2VGb3JtYXR0ZXJcIjtcclxuaW1wb3J0IHsgYXBwZW5kVG9DdXJyZW50TGluZSwgZ2V0TWFya2Rvd25GaWxlc0luRm9sZGVyLCBnZXRNYXJrZG93bkZpbGVzV2l0aFRhZywgaW5zZXJ0RmlsZUxpbmtUb0FjdGl2ZVZpZXcsIGluc2VydE9uTmV3TGluZUFib3ZlLCBpbnNlcnRPbk5ld0xpbmVCZWxvdywgaXNUZW1wbGF0ZXJUcmlnZ2VyT25DcmVhdGVFbmFibGVkLCBqdW1wVG9OZXh0VGVtcGxhdGVyQ3Vyc29ySWZQb3NzaWJsZSwgaXNGb2xkZXIsIG9wZW5FeGlzdGluZ0ZpbGVUYWIsIG9wZW5GaWxlLCBvdmVyd3JpdGVUZW1wbGF0ZXJPbmNlLCB0ZW1wbGF0ZXJQYXJzZVRlbXBsYXRlLCB3YWl0Rm9yVGVtcGxhdGVyVHJpZ2dlck9uQ3JlYXRlVG9Db21wbGV0ZSB9IGZyb20gXCIuLi91dGlsaXR5T2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgSUNhcHR1cmVDaG9pY2UgZnJvbSBcIi4uL3R5cGVzL2Nob2ljZXMvSUNhcHR1cmVDaG9pY2VcIjtcclxuaW1wb3J0IHR5cGUgTXlQbHVnaW4gZnJvbSBcIi4uL21haW5cIjtcclxuXHJcbmNvbnN0IERFRkFVTFRfTk9USUNFX0RVUkFUSU9OID0gNDAwMDtcclxuXHJcbmV4cG9ydCBjbGFzcyBDYXB0dXJlQ2hvaWNlRW5naW5lIHtcclxuXHRjaG9pY2U6IElDYXB0dXJlQ2hvaWNlO1xyXG5cdHByaXZhdGUgZm9ybWF0dGVyOiBDYXB0dXJlQ2hvaWNlRm9ybWF0dGVyO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBNeVBsdWdpbjtcclxuXHRwcml2YXRlIHRlbXBsYXRlUHJvcGVydHlWYXJzPzogTWFwPHN0cmluZywgdW5rbm93bj47XHJcblx0cHJpdmF0ZSBjYXB0dXJlUHJvcGVydHlWYXJzOiBNYXA8c3RyaW5nLCB1bmtub3duPiA9IG5ldyBNYXAoKTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogTXlQbHVnaW4sXHJcblx0XHRjaG9pY2U6IElDYXB0dXJlQ2hvaWNlLFxyXG5cdFx0cHJpdmF0ZSBjaG9pY2VFeGVjdXRvcjogSUNob2ljZUV4ZWN1dG9yLFxyXG5cdCkge1xyXG5cdFx0dGhpcy5jaG9pY2UgPSBjaG9pY2U7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuZm9ybWF0dGVyID0gbmV3IENhcHR1cmVDaG9pY2VGb3JtYXR0ZXIoYXBwLCBwbHVnaW4sIGNob2ljZUV4ZWN1dG9yKTtcclxuXHRcdC8vIFNldCBpbnB1dCBtZXRob2QgaWYgcHJvdmlkZWRcclxuXHRcdGlmICgoY2hvaWNlIGFzIGFueSkuaW5wdXRNZXRob2QpIHtcclxuXHRcdFx0dGhpcy5mb3JtYXR0ZXIuc2V0SW5wdXRNZXRob2QoKGNob2ljZSBhcyBhbnkpLmlucHV0TWV0aG9kKTtcclxuXHRcdH1cclxuXHRcdC8vIFNldCBjaG9pY2Ugc28gZm9ybWF0dGVycyBjYW4gdXNlIGl0IGZvciB0YXJnZXQgZGF0ZVxyXG5cdFx0dGhpcy5mb3JtYXR0ZXIuc2V0Q2hvaWNlKGNob2ljZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dTdWNjZXNzTm90aWNlKFxyXG5cdFx0ZmlsZTogVEZpbGUsXHJcblx0XHR7IHdhc05ld0ZpbGUsIGFjdGlvbiB9OiB7IHdhc05ld0ZpbGU6IGJvb2xlYW47IGFjdGlvbjogQ2FwdHVyZUFjdGlvbiB9LFxyXG5cdCkge1xyXG5cdFx0Y29uc3QgZmlsZU5hbWUgPSBgJyR7ZmlsZS5iYXNlbmFtZX0nYDtcclxuXHJcblx0XHRpZiAod2FzTmV3RmlsZSkge1xyXG5cdFx0XHRuZXcgTm90aWNlKFxyXG5cdFx0XHRcdGBDcmVhdGVkIGFuZCBjYXB0dXJlZCB0byAke2ZpbGVOYW1lfWAsXHJcblx0XHRcdFx0REVGQVVMVF9OT1RJQ0VfRFVSQVRJT04sXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbXNnID0gXCJcIjtcclxuXHRcdHN3aXRjaCAoYWN0aW9uKSB7XHJcblx0XHRcdGNhc2UgXCJjdXJyZW50TGluZVwiOlxyXG5cdFx0XHRcdG1zZyA9IGBDYXB0dXJlZCB0byBjdXJyZW50IGxpbmUgaW4gJHtmaWxlTmFtZX1gO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJlcGVuZFwiOlxyXG5cdFx0XHRjYXNlIFwiYWN0aXZlRmlsZVRvcFwiOlxyXG5cdFx0XHRcdG1zZyA9IGBDYXB0dXJlZCB0byB0b3Agb2YgJHtmaWxlTmFtZX1gO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiYXBwZW5kXCI6XHJcblx0XHRcdFx0bXNnID0gYENhcHR1cmVkIHRvICR7ZmlsZU5hbWV9YDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImluc2VydEFmdGVyXCI6IHtcclxuXHRcdFx0XHRjb25zdCBoZWFkaW5nID0gdGhpcy5jaG9pY2UuaW5zZXJ0QWZ0ZXIuYWZ0ZXI7XHJcblx0XHRcdFx0bXNnID0gaGVhZGluZ1xyXG5cdFx0XHRcdFx0PyBgQ2FwdHVyZWQgdG8gJHtmaWxlTmFtZX0gdW5kZXIgJyR7aGVhZGluZ30nYFxyXG5cdFx0XHRcdFx0OiBgQ2FwdHVyZWQgdG8gJHtmaWxlTmFtZX1gO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0bmV3IE5vdGljZShtc2csIERFRkFVTFRfTk9USUNFX0RVUkFUSU9OKTtcclxuXHR9XHJcblxyXG5cdGFzeW5jIHJ1bigpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFJlc2V0IGFueSBwZW5kaW5nIHN0cnVjdHVyZWQgdmFsdWVzIGJlZm9yZSBzdGFydGluZyBhIG5ldyBjYXB0dXJlIHJ1blxyXG5cdFx0XHR0aGlzLmNhcHR1cmVQcm9wZXJ0eVZhcnMuY2xlYXIoKTtcclxuXHRcdFx0Y29uc3QgbGlua09wdGlvbnMgPSBub3JtYWxpemVBcHBlbmRMaW5rT3B0aW9ucyh0aGlzLmNob2ljZS5hcHBlbmRMaW5rKTtcclxuXHRcdFx0dGhpcy5mb3JtYXR0ZXIuc2V0TGlua1RvQ3VycmVudEZpbGVCZWhhdmlvcihcclxuXHRcdFx0XHRsaW5rT3B0aW9ucy5lbmFibGVkICYmICFsaW5rT3B0aW9ucy5yZXF1aXJlQWN0aXZlRmlsZVxyXG5cdFx0XHRcdFx0PyBcIm9wdGlvbmFsXCJcclxuXHRcdFx0XHRcdDogXCJyZXF1aXJlZFwiLFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCB1c2VTZWxlY3Rpb25Bc0NhcHR1cmVWYWx1ZSA9IHRoaXMuY2hvaWNlLnVzZVNlbGVjdGlvbkFzQ2FwdHVyZVZhbHVlID8/IHRydWU7XHJcblx0XHRcdHRoaXMuZm9ybWF0dGVyLnNldFVzZVNlbGVjdGlvbkFzQ2FwdHVyZVZhbHVlKHVzZVNlbGVjdGlvbkFzQ2FwdHVyZVZhbHVlKTtcclxuXHJcblx0XHRcdGNvbnN0IGZpbGVQYXRoID0gYXdhaXQgdGhpcy5nZXRGb3JtYXR0ZWRQYXRoVG9DYXB0dXJlVG8oXHJcblx0XHRcdFx0dGhpcy5jaG9pY2UuY2FwdHVyZVRvQWN0aXZlRmlsZSxcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgY29udGVudCA9IHRoaXMuZ2V0Q2FwdHVyZUNvbnRlbnQoKTtcclxuXHJcblx0XHRcdGxldCBnZXRGaWxlQW5kQWRkQ29udGVudEZuOiB0eXBlb2YgdGhpcy5vbkZpbGVFeGlzdHM7XHJcblx0XHRcdGNvbnN0IGZpbGVBbHJlYWR5RXhpc3RzID0gYXdhaXQgdGhpcy5maWxlRXhpc3RzKGZpbGVQYXRoKTtcclxuXHJcblx0XHRcdGlmIChmaWxlQWxyZWFkeUV4aXN0cykge1xyXG5cdFx0XHRcdGdldEZpbGVBbmRBZGRDb250ZW50Rm4gPSB0aGlzLm9uRmlsZUV4aXN0cy5iaW5kKFxyXG5cdFx0XHRcdFx0dGhpcyxcclxuXHRcdFx0XHQpIGFzIHR5cGVvZiB0aGlzLm9uRmlsZUV4aXN0cztcclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmNob2ljZT8uY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdD8uZW5hYmxlZCkge1xyXG5cdFx0XHRcdGdldEZpbGVBbmRBZGRDb250ZW50Rm4gPSAoKHBhdGgsIGNhcHR1cmUsIF9vcHRpb25zKSA9PlxyXG5cdFx0XHRcdFx0dGhpcy5vbkNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3QocGF0aCwgY2FwdHVyZSwgbGlua09wdGlvbnMpXHJcblx0XHRcdFx0KSBhcyB0eXBlb2YgdGhpcy5vbkNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YFRoZSBmaWxlICR7ZmlsZVBhdGh9IGRvZXMgbm90IGV4aXN0IGFuZCBcIkNyZWF0ZSBmaWxlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcIiBpcyBkaXNhYmxlZC5gLFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCB7IGZpbGUsIG5ld0ZpbGVDb250ZW50LCBjYXB0dXJlQ29udGVudCB9ID0gYXdhaXQgZ2V0RmlsZUFuZEFkZENvbnRlbnRGbihmaWxlUGF0aCwgY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBhY3Rpb24gPSBnZXRDYXB0dXJlQWN0aW9uKHRoaXMuY2hvaWNlKTtcclxuXHRcdFx0Y29uc3QgaXNFZGl0b3JJbnNlcnRpb25BY3Rpb24gPVxyXG5cdFx0XHRcdGFjdGlvbiA9PT0gXCJjdXJyZW50TGluZVwiIHx8XHJcblx0XHRcdFx0YWN0aW9uID09PSBcIm5ld0xpbmVBYm92ZVwiIHx8XHJcblx0XHRcdFx0YWN0aW9uID09PSBcIm5ld0xpbmVCZWxvd1wiO1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIGNhcHR1cmUgdG8gYWN0aXZlIGZpbGUgd2l0aCBzcGVjaWFsIGFjdGlvbnNcclxuXHRcdFx0aWYgKGlzRWRpdG9ySW5zZXJ0aW9uQWN0aW9uKSB7XHJcblx0XHRcdFx0Ly8gUGFyc2UgVGVtcGxhdGVyIHN5bnRheCBpbiB0aGUgY2FwdHVyZSBjb250ZW50XHJcblx0XHRcdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRlbXBsYXRlclBhcnNlVGVtcGxhdGUoXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAsXHJcblx0XHRcdFx0XHRjYXB0dXJlQ29udGVudCxcclxuXHRcdFx0XHRcdGZpbGUsXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0c3dpdGNoIChhY3Rpb24pIHtcclxuXHRcdFx0XHRcdGNhc2UgXCJjdXJyZW50TGluZVwiOlxyXG5cdFx0XHRcdFx0XHRhcHBlbmRUb0N1cnJlbnRMaW5lKGNvbnRlbnQsIHRoaXMucGx1Z2luLmFwcCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIm5ld0xpbmVBYm92ZVwiOlxyXG5cdFx0XHRcdFx0XHRpbnNlcnRPbk5ld0xpbmVBYm92ZShjb250ZW50LCB0aGlzLnBsdWdpbi5hcHApO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJuZXdMaW5lQmVsb3dcIjpcclxuXHRcdFx0XHRcdFx0aW5zZXJ0T25OZXdMaW5lQmVsb3coY29udGVudCwgdGhpcy5wbHVnaW4uYXBwKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgbmV3RmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRcdGlmICh0aGlzLmNob2ljZS50ZW1wbGF0ZXI/LmFmdGVyQ2FwdHVyZSA9PT0gXCJ3aG9sZUZpbGVcIikge1xyXG5cdFx0XHRcdFx0YXdhaXQgb3ZlcndyaXRlVGVtcGxhdGVyT25jZSh0aGlzLnBsdWdpbi5hcHAsIGZpbGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRhd2FpdCB0aGlzLmFwcGx5Q2FwdHVyZVByb3BlcnR5VmFycyhmaWxlKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gU2hvdyBzdWNjZXNzIG5vdGlmaWNhdGlvblxyXG5cdFx0XHR0aGlzLnNob3dTdWNjZXNzTm90aWNlKGZpbGUsIHtcclxuXHRcdFx0XHR3YXNOZXdGaWxlOiAhZmlsZUFscmVhZHlFeGlzdHMsXHJcblx0XHRcdFx0YWN0aW9uLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChsaW5rT3B0aW9ucy5lbmFibGVkKSB7XHJcblx0XHRcdFx0aW5zZXJ0RmlsZUxpbmtUb0FjdGl2ZVZpZXcodGhpcy5wbHVnaW4uYXBwLCBmaWxlLCBsaW5rT3B0aW9ucyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGlzLmNob2ljZS5vcGVuRmlsZSAmJiBmaWxlKSB7XHJcblx0XHRcdFx0Y29uc3QgZmlsZU9wZW5pbmcgPSB0aGlzLmNob2ljZS5maWxlT3BlbmluZztcclxuXHRcdFx0XHRjb25zdCBmb2N1cyA9IGZpbGVPcGVuaW5nLmZvY3VzID8/IHRydWU7XHJcblx0XHRcdFx0Y29uc3Qgb3BlbkV4aXN0aW5nVGFiID0gb3BlbkV4aXN0aW5nRmlsZVRhYih0aGlzLnBsdWdpbi5hcHAsIGZpbGUsIGZvY3VzKTtcclxuXHJcblx0XHRcdFx0aWYgKCFvcGVuRXhpc3RpbmdUYWIpIHtcclxuXHRcdFx0XHRcdGF3YWl0IG9wZW5GaWxlKHRoaXMucGx1Z2luLmFwcCwgZmlsZSwgZmlsZU9wZW5pbmcpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0YXdhaXQganVtcFRvTmV4dFRlbXBsYXRlckN1cnNvcklmUG9zc2libGUodGhpcy5wbHVnaW4uYXBwLCBmaWxlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoYEVycm9yIHJ1bm5pbmcgY2FwdHVyZSBjaG9pY2UgXCIke3RoaXMuY2hvaWNlLm5hbWV9XCI6YCwgZXJyKTtcclxuXHRcdFx0bmV3IE5vdGljZShgRXJyb3IgcnVubmluZyBjYXB0dXJlIGNob2ljZTogJHsoZXJyIGFzIEVycm9yKS5tZXNzYWdlfWAsIERFRkFVTFRfTk9USUNFX0RVUkFUSU9OKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0Q2FwdHVyZUNvbnRlbnQoKTogc3RyaW5nIHtcclxuXHRcdGxldCBjb250ZW50OiBzdHJpbmc7XHJcblxyXG5cdFx0aWYgKCF0aGlzLmNob2ljZS5mb3JtYXQuZW5hYmxlZCkgY29udGVudCA9IFwie3tWQUxVRX19XCI7XHJcblx0XHRlbHNlIGNvbnRlbnQgPSB0aGlzLmNob2ljZS5mb3JtYXQuZm9ybWF0O1xyXG5cclxuXHRcdGlmICh0aGlzLmNob2ljZS50YXNrKSBjb250ZW50ID0gYC0gWyBdICR7Y29udGVudH1cXG5gO1xyXG5cclxuXHRcdHJldHVybiBjb250ZW50O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBnZXRGb3JtYXR0ZWRQYXRoVG9DYXB0dXJlVG8oXHJcblx0XHRzaG91bGRDYXB0dXJlVG9BY3RpdmVGaWxlOiBib29sZWFuLFxyXG5cdCk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRpZiAoc2hvdWxkQ2FwdHVyZVRvQWN0aXZlRmlsZSkge1xyXG5cdFx0XHRjb25zdCBhY3RpdmVGaWxlID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcblx0XHRcdGlmICghYWN0aXZlRmlsZSkge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjYXB0dXJlIHRvIGFjdGl2ZSBmaWxlIC0gbm8gYWN0aXZlIGZpbGUuXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gYWN0aXZlRmlsZS5wYXRoO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNhcHR1cmVUbyA9IHRoaXMuY2hvaWNlLmNhcHR1cmVUbztcclxuXHRcdGNvbnN0IGZvcm1hdHRlZENhcHR1cmVUbyA9IGF3YWl0IHRoaXMuZm9ybWF0RmlsZVBhdGgoY2FwdHVyZVRvKTtcclxuXHJcblx0XHQvLyBSZW1vdmluZyB0aGUgdHJhaWxpbmcgc2xhc2ggZnJvbSB0aGUgY2FwdHVyZSB0byBwYXRoXHJcblx0XHRjb25zdCBmb2xkZXJQYXRoID0gZm9ybWF0dGVkQ2FwdHVyZVRvLnJlcGxhY2UoL15cXC8kfFxcL1xcLm1kJHxeXFwubWQkLywgXCJcIik7XHJcblx0XHQvLyBFbXB0eSBzdHJpbmcgbWVhbnMgd2Ugc3VnZ2VzdCB0byBjYXB0dXJlIGFueXdoZXJlIGluIHRoZSB2YXVsdFxyXG5cdFx0Y29uc3QgY2FwdHVyZUFueXdoZXJlSW5WYXVsdCA9IGZvbGRlclBhdGggPT09IFwiXCI7XHJcblx0XHRjb25zdCBzaG91bGRDYXB0dXJlVG9Gb2xkZXIgPVxyXG5cdFx0XHRjYXB0dXJlQW55d2hlcmVJblZhdWx0IHx8IGlzRm9sZGVyKHRoaXMucGx1Z2luLmFwcCwgZm9sZGVyUGF0aCk7XHJcblx0XHRjb25zdCBzaG91bGRDYXB0dXJlV2l0aFRhZyA9IGZvcm1hdHRlZENhcHR1cmVUby5zdGFydHNXaXRoKFwiI1wiKTtcclxuXHJcblx0XHRpZiAoc2hvdWxkQ2FwdHVyZVRvRm9sZGVyKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnNlbGVjdEZpbGVJbkZvbGRlcihmb2xkZXJQYXRoLCBjYXB0dXJlQW55d2hlcmVJblZhdWx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoc2hvdWxkQ2FwdHVyZVdpdGhUYWcpIHtcclxuXHRcdFx0Y29uc3QgdGFnID0gZm9ybWF0dGVkQ2FwdHVyZVRvLnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5zZWxlY3RGaWxlV2l0aFRhZyh0YWcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmb3JtYXR0ZWRDYXB0dXJlVG87XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHNlbGVjdEZpbGVJbkZvbGRlcihcclxuXHRcdGZvbGRlclBhdGg6IHN0cmluZyxcclxuXHRcdGNhcHR1cmVBbnl3aGVyZUluVmF1bHQ6IGJvb2xlYW4sXHJcblx0KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdGNvbnN0IGZvbGRlclBhdGhTbGFzaCA9XHJcblx0XHRcdGZvbGRlclBhdGguZW5kc1dpdGgoXCIvXCIpIHx8IGNhcHR1cmVBbnl3aGVyZUluVmF1bHRcclxuXHRcdFx0XHQ/IGZvbGRlclBhdGhcclxuXHRcdFx0XHQ6IGAke2ZvbGRlclBhdGh9L2A7XHJcblx0XHRjb25zdCBmaWxlc0luRm9sZGVyID0gZ2V0TWFya2Rvd25GaWxlc0luRm9sZGVyKHRoaXMucGx1Z2luLmFwcCwgZm9sZGVyUGF0aFNsYXNoKTtcclxuXHJcblx0XHRpZiAoZmlsZXNJbkZvbGRlci5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBGb2xkZXIgJHtmb2xkZXJQYXRoU2xhc2h9IGlzIGVtcHR5LmApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBzaW1wbGljaXR5LCBqdXN0IHJldHVybiB0aGUgZmlyc3QgZmlsZSBpbiB0aGUgZm9sZGVyXHJcblx0XHQvLyBJbiBhIGZ1bGwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBzaG93IGEgZmlsZSBwaWNrZXJcclxuXHRcdHJldHVybiBmaWxlc0luRm9sZGVyLmxlbmd0aCA+IDAgPyAoZmlsZXNJbkZvbGRlclswXSBhcyBhbnkpLnBhdGggOiAnJztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgc2VsZWN0RmlsZVdpdGhUYWcodGFnOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0Y29uc3QgdGFnV2l0aEhhc2ggPSB0YWcuc3RhcnRzV2l0aChcIiNcIikgPyB0YWcgOiBgIyR7dGFnfWA7XHJcblx0XHRjb25zdCBmaWxlc1dpdGhUYWcgPSBnZXRNYXJrZG93bkZpbGVzV2l0aFRhZyh0aGlzLnBsdWdpbi5hcHAsIHRhZ1dpdGhIYXNoKTtcclxuXHJcblx0XHRpZiAoZmlsZXNXaXRoVGFnLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYE5vIGZpbGVzIHdpdGggdGFnICR7dGFnfS5gKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGb3Igc2ltcGxpY2l0eSwganVzdCByZXR1cm4gdGhlIGZpcnN0IGZpbGUgd2l0aCB0aGUgdGFnXHJcblx0XHQvLyBJbiBhIGZ1bGwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBzaG93IGEgZmlsZSBwaWNrZXJcclxuXHRcdHJldHVybiBmaWxlc1dpdGhUYWcubGVuZ3RoID4gMCA/IChmaWxlc1dpdGhUYWdbMF0gYXMgYW55KS5wYXRoIDogJyc7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIG9uRmlsZUV4aXN0cyhcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHRjb250ZW50OiBzdHJpbmcsXHJcblx0KTogUHJvbWlzZTx7XHJcblx0XHRmaWxlOiBURmlsZTtcclxuXHRcdG5ld0ZpbGVDb250ZW50OiBzdHJpbmc7XHJcblx0XHRjYXB0dXJlQ29udGVudDogc3RyaW5nO1xyXG5cdH0+IHtcclxuXHRcdGNvbnN0IGZpbGU6IFRGaWxlID0gdGhpcy5nZXRGaWxlQnlQYXRoKGZpbGVQYXRoKTtcclxuXHRcdGlmICghZmlsZSkgdGhyb3cgbmV3IEVycm9yKFwiRmlsZSBub3QgZm91bmRcIik7XHJcblxyXG5cdFx0Ly8gU2V0IHRoZSB0aXRsZSB0byB0aGUgZXhpc3RpbmcgZmlsZSdzIGJhc2VuYW1lXHJcblx0XHR0aGlzLmZvcm1hdHRlci5zZXRUaXRsZShmaWxlLmJhc2VuYW1lKTtcclxuXHJcblx0XHQvLyBTZXQgdGhlIGNob2ljZSBzbyBmb3JtYXR0ZXJzIGNhbiB1c2UgaXQgZm9yIHRpdGxlXHJcblx0XHR0aGlzLmZvcm1hdHRlci5zZXRDaG9pY2UodGhpcy5jaG9pY2UpO1xyXG5cclxuXHRcdC8vIFNldCB0aGUgZGVzdGluYXRpb24gZmlsZSBzbyBmb3JtYXR0ZXJzIGNhbiBnZW5lcmF0ZSBwcm9wZXIgcmVsYXRpdmUgbGlua3NcclxuXHRcdHRoaXMuZm9ybWF0dGVyLnNldERlc3RpbmF0aW9uRmlsZShmaWxlKTtcclxuXHJcblx0XHQvLyBGaXJzdCBmb3JtYXQgcGFzcy4uLlxyXG5cdFx0Y29uc3QgZm9ybWF0dGVkID0gYXdhaXQgdGhpcy5mb3JtYXR0ZXIuZm9ybWF0Q29udGVudE9ubHkoY29udGVudCk7XHJcblx0XHR0aGlzLm1lcmdlQ2FwdHVyZVByb3BlcnR5VmFycyh0aGlzLmZvcm1hdHRlci5nZXRBbmRDbGVhclRlbXBsYXRlUHJvcGVydHlWYXJzKCkpO1xyXG5cclxuXHRcdGNvbnN0IGZpbGVDb250ZW50OiBzdHJpbmcgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcHAudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdC8vIFNlY29uZCBmb3JtYXQgcGFzcywgd2l0aCB0aGUgZmlsZSBjb250ZW50Li4uXHJcblx0XHRjb25zdCBmb3JtYXR0ZWRGaWxlQ29udGVudDogc3RyaW5nID0gYXdhaXQgdGhpcy5mb3JtYXR0ZXIuZm9ybWF0Q29udGVudFdpdGhGaWxlKFxyXG5cdFx0XHRmb3JtYXR0ZWQsXHJcblx0XHRcdHRoaXMuY2hvaWNlLFxyXG5cdFx0XHRmaWxlQ29udGVudCxcclxuXHRcdFx0ZmlsZSxcclxuXHRcdCk7XHJcblx0XHR0aGlzLm1lcmdlQ2FwdHVyZVByb3BlcnR5VmFycyh0aGlzLmZvcm1hdHRlci5nZXRBbmRDbGVhclRlbXBsYXRlUHJvcGVydHlWYXJzKCkpO1xyXG5cclxuXHRcdHJldHVybiB7IGZpbGUsIG5ld0ZpbGVDb250ZW50OiBmb3JtYXR0ZWRGaWxlQ29udGVudCwgY2FwdHVyZUNvbnRlbnQ6IGZvcm1hdHRlZCB9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBvbkNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3QoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0Y2FwdHVyZUNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdGxpbmtPcHRpb25zPzogQXBwZW5kTGlua09wdGlvbnMsXHJcblx0KTogUHJvbWlzZTx7XHJcblx0XHRmaWxlOiBURmlsZTtcclxuXHRcdG5ld0ZpbGVDb250ZW50OiBzdHJpbmc7XHJcblx0XHRjYXB0dXJlQ29udGVudDogc3RyaW5nO1xyXG5cdH0+IHtcclxuXHRcdC8vIEV4dHJhY3QgZmlsZW5hbWUgd2l0aG91dCBleHRlbnNpb24gZnJvbSB0aGUgZnVsbCBwYXRoXHJcblx0XHRjb25zdCBmaWxlQmFzZW5hbWUgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk/LnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpIHx8IFwiXCI7XHJcblx0XHR0aGlzLmZvcm1hdHRlci5zZXRUaXRsZShmaWxlQmFzZW5hbWUpO1xyXG5cclxuXHRcdC8vIFNldCB0aGUgY2hvaWNlIHNvIGZvcm1hdHRlcnMgY2FuIHVzZSBpdCBmb3IgdGl0bGVcclxuXHRcdHRoaXMuZm9ybWF0dGVyLnNldENob2ljZSh0aGlzLmNob2ljZSk7XHJcblxyXG5cdFx0Ly8gU2V0IHRoZSBkZXN0aW5hdGlvbiBwYXRoIHNvIGZvcm1hdHRlcnMgY2FuIGdlbmVyYXRlIHByb3BlciByZWxhdGl2ZSBsaW5rc1xyXG5cdFx0dGhpcy5mb3JtYXR0ZXIuc2V0RGVzdGluYXRpb25Tb3VyY2VQYXRoKGZpbGVQYXRoKTtcclxuXHJcblx0XHQvLyBGaXJzdCBmb3JtYXR0aW5nIHBhc3M6IHJlc29sdmUgcGxhY2Vob2xkZXJzIGFuZCBwcm9tcHQgZm9yIHVzZXIgaW5wdXRcclxuXHRcdGNvbnN0IGZvcm1hdHRlZENhcHR1cmVDb250ZW50OiBzdHJpbmcgPSBhd2FpdCB0aGlzLmZvcm1hdHRlci5mb3JtYXRDb250ZW50T25seShjYXB0dXJlQ29udGVudCk7XHJcblx0XHR0aGlzLm1lcmdlQ2FwdHVyZVByb3BlcnR5VmFycyh0aGlzLmZvcm1hdHRlci5nZXRBbmRDbGVhclRlbXBsYXRlUHJvcGVydHlWYXJzKCkpO1xyXG5cclxuXHRcdGxldCBmaWxlQ29udGVudCA9IFwiXCI7XHJcblx0XHRpZiAodGhpcy5jaG9pY2UuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC5jcmVhdGVXaXRoVGVtcGxhdGUpIHtcclxuXHRcdFx0Ly8g6I635Y+W5qih5p2/6Lev5b6EXHJcblx0XHRcdGxldCB0ZW1wbGF0ZVBhdGggPSB0aGlzLmNob2ljZS5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LnRlbXBsYXRlO1xyXG5cdFx0XHRpZiAodGVtcGxhdGVQYXRoKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIOWFiOagvOW8j+WMluaooeadv+i3r+W+hO+8jOabv+aNouWFtuS4reeahOWPmOmHj1xyXG5cdFx0XHRcdFx0dGVtcGxhdGVQYXRoID0gYXdhaXQgdGhpcy5mb3JtYXR0ZXIuZm9ybWF0RmlsZU5hbWUodGVtcGxhdGVQYXRoLCB0aGlzLmNob2ljZS5uYW1lKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGBGb3JtYXR0ZWQgdGVtcGxhdGUgcGF0aDogJHt0ZW1wbGF0ZVBhdGh9YCk7XHJcblx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdC8vIOehruS/neaooeadv+i3r+W+hOaciSAubWQg5omp5bGV5ZCNXHJcblx0XHRcdFx0XHRpZiAoIXRlbXBsYXRlUGF0aC5lbmRzV2l0aCgnLm1kJykpIHtcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVQYXRoICs9ICcubWQnO1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhgQWRkZWQgLm1kIGV4dGVuc2lvbiB0byB0ZW1wbGF0ZSBwYXRoOiAke3RlbXBsYXRlUGF0aH1gKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8g5bCd6K+V6K+75Y+W5qih5p2/5paH5Lu25YaF5a65XHJcblx0XHRcdFx0XHRjb25zdCB0ZW1wbGF0ZUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRlbXBsYXRlUGF0aCk7XHJcblx0XHRcdFx0XHRpZiAodGVtcGxhdGVGaWxlICYmIHRlbXBsYXRlRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LnJlYWQodGVtcGxhdGVGaWxlKTtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYFRlbXBsYXRlIGZpbGUgcmVhZCBzdWNjZXNzZnVsbHk6ICR7dGVtcGxhdGVQYXRofWApO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKGBUZW1wbGF0ZSBmaWxlIG5vdCBmb3VuZDogJHt0ZW1wbGF0ZVBhdGh9YCk7XHJcblx0XHRcdFx0XHRcdGZpbGVDb250ZW50ID0gXCJcIjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihgRXJyb3IgcmVhZGluZyB0ZW1wbGF0ZSBmaWxlOiAke3RlbXBsYXRlUGF0aH1gLCBlcnJvcik7XHJcblx0XHRcdFx0XHRmaWxlQ29udGVudCA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBuZXcgZmlsZSB3aXRoIHRoZSAob3B0aW9uYWwpIHRlbXBsYXRlIGNvbnRlbnRcclxuXHRcdGNvbnN0IGZpbGU6IFRGaWxlID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmNyZWF0ZShmaWxlUGF0aCwgZmlsZUNvbnRlbnQpO1xyXG5cclxuXHRcdC8vIFByb2Nlc3MgVGVtcGxhdGVyIGNvbW1hbmRzIGluIHRoZSB0ZW1wbGF0ZSBpZiBhIHRlbXBsYXRlIHdhcyB1c2VkXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMuY2hvaWNlLmNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3QuY3JlYXRlV2l0aFRlbXBsYXRlICYmXHJcblx0XHRcdGZpbGVDb250ZW50XHJcblx0XHQpIHtcclxuXHRcdFx0YXdhaXQgb3ZlcndyaXRlVGVtcGxhdGVyT25jZSh0aGlzLnBsdWdpbi5hcHAsIGZpbGUpO1xyXG5cdFx0fSBlbHNlIGlmIChpc1RlbXBsYXRlclRyaWdnZXJPbkNyZWF0ZUVuYWJsZWQodGhpcy5wbHVnaW4uYXBwKSkge1xyXG5cdFx0XHRhd2FpdCB3YWl0Rm9yVGVtcGxhdGVyVHJpZ2dlck9uQ3JlYXRlVG9Db21wbGV0ZSh0aGlzLnBsdWdpbi5hcHAsIGZpbGUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlYWQgdGhlIGZpbGUgZnJlc2ggZnJvbSBkaXNrXHJcblx0XHRjb25zdCB1cGRhdGVkRmlsZUNvbnRlbnQ6IHN0cmluZyA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xyXG5cdFx0Ly8gU2Vjb25kIGZvcm1hdHRpbmcgcGFzczogZW1iZWQgdGhlIGFscmVhZHktcmVzb2x2ZWQgY2FwdHVyZSBjb250ZW50IGludG8gdGhlIG5ld2x5IGNyZWF0ZWQgZmlsZVxyXG5cdFx0Y29uc3QgbmV3RmlsZUNvbnRlbnQ6IHN0cmluZyA9IGF3YWl0IHRoaXMuZm9ybWF0dGVyLmZvcm1hdENvbnRlbnRXaXRoRmlsZShcclxuXHRcdFx0Zm9ybWF0dGVkQ2FwdHVyZUNvbnRlbnQsXHJcblx0XHRcdHRoaXMuY2hvaWNlLFxyXG5cdFx0XHR1cGRhdGVkRmlsZUNvbnRlbnQsXHJcblx0XHRcdGZpbGUsXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5tZXJnZUNhcHR1cmVQcm9wZXJ0eVZhcnModGhpcy5mb3JtYXR0ZXIuZ2V0QW5kQ2xlYXJUZW1wbGF0ZVByb3BlcnR5VmFycygpKTtcclxuXHJcblx0XHRyZXR1cm4geyBmaWxlLCBuZXdGaWxlQ29udGVudCwgY2FwdHVyZUNvbnRlbnQ6IGZvcm1hdHRlZENhcHR1cmVDb250ZW50IH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGZvcm1hdEZpbGVQYXRoKGNhcHR1cmVUbzogc3RyaW5nKSB7XHJcblx0XHRjb25zdCBmb3JtYXR0ZWRDYXB0dXJlVG86IHN0cmluZyA9IGF3YWl0IHRoaXMuZm9ybWF0dGVyLmZvcm1hdEZpbGVOYW1lKFxyXG5cdFx0XHRjYXB0dXJlVG8sXHJcblx0XHRcdHRoaXMuY2hvaWNlLm5hbWUsXHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLm5vcm1hbGl6ZU1hcmtkb3duRmlsZVBhdGgoXCJcIiwgZm9ybWF0dGVkQ2FwdHVyZVRvKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbm9ybWFsaXplTWFya2Rvd25GaWxlUGF0aChiYXNlUGF0aDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGlmICghZmlsZU5hbWUuZW5kc1dpdGgoXCIubWRcIikpIHtcclxuXHRcdFx0ZmlsZU5hbWUgKz0gXCIubWRcIjtcclxuXHRcdH1cclxuXHRcdHJldHVybiBiYXNlUGF0aCA/IGAke2Jhc2VQYXRofS8ke2ZpbGVOYW1lfWAgOiBmaWxlTmFtZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZmlsZUV4aXN0cyhwYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuXHRcdGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xyXG5cdFx0cmV0dXJuIGZpbGUgIT09IG51bGw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEZpbGVCeVBhdGgocGF0aDogc3RyaW5nKTogVEZpbGUge1xyXG5cdFx0Y29uc3QgZmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XHJcblx0XHRpZiAoIWZpbGUgfHwgIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcihgRmlsZSBub3QgZm91bmQ6ICR7cGF0aH1gKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBmaWxlO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBtZXJnZUNhcHR1cmVQcm9wZXJ0eVZhcnModmFyczogTWFwPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcclxuXHRcdGlmICghdmFycyB8fCB2YXJzLnNpemUgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHZhcnMpIHtcclxuXHRcdFx0dGhpcy5jYXB0dXJlUHJvcGVydHlWYXJzLnNldChrZXksIHZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgYXBwbHlDYXB0dXJlUHJvcGVydHlWYXJzKGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRpZiAodGhpcy5jYXB0dXJlUHJvcGVydHlWYXJzLnNpemUgPT09IDApIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluIGEgZnVsbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGhhbmRsZSBmcm9udG1hdHRlciBwcm9wZXJ0eSB1cGRhdGVzXHJcblx0XHR0aGlzLmNhcHR1cmVQcm9wZXJ0eVZhcnMuY2xlYXIoKTtcclxuXHR9XHJcbn1cclxuIl19