import { __awaiter } from "tslib";
import { MarkdownView } from "obsidian";
import { templaterParseTemplate } from "../utilityObsidian";
import { PromptModal } from "../modals/PromptModal";
import { formatDate } from "../utils/dateUtils";
export class CaptureChoiceFormatter {
    constructor(app, plugin, choiceExecutor) {
        this.choice = null;
        this.file = null;
        this.fileContent = "";
        this.sourcePath = null;
        this.useSelectionAsCaptureValue = true;
        this.templaterProcessed = false;
        this.templatePropertyVars = new Map();
        this.title = "";
        this.inputMethod = 'single-line';
        this.app = app;
        this.plugin = plugin;
        this.choiceExecutor = choiceExecutor;
    }
    setInputMethod(method) {
        this.inputMethod = method;
    }
    setDestinationFile(file) {
        this.file = file;
        this.sourcePath = file.path;
    }
    setDestinationSourcePath(path) {
        this.sourcePath = path;
        this.file = null;
    }
    setUseSelectionAsCaptureValue(value) {
        this.useSelectionAsCaptureValue = value;
    }
    setLinkToCurrentFileBehavior(behavior) {
        // Implementation would go here
    }
    setTitle(title) {
        this.title = title;
    }
    setChoice(choice) {
        this.choice = choice;
    }
    formatContentOnly(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let formatted = input;
            // Replace {{VALUE}} or {{TASK_TEXT}} with selected text or user input
            let taskText = "";
            if (formatted.includes("{{VALUE}}")) {
                const selectedText = yield this.getSelectedText();
                taskText = selectedText.trim() || "";
                formatted = formatted.replace(/\{\{VALUE\}\}/g, taskText);
            }
            else if (formatted.includes("{{TASK_TEXT}}")) {
                const selectedText = yield this.getSelectedText();
                taskText = selectedText.trim() || "";
                formatted = formatted.replace(/\{\{TASK_TEXT\}\}/g, taskText);
            }
            // Replace {{TITLE}} with file title
            if (formatted.includes("{{TITLE}}")) {
                formatted = formatted.replace(/\{\{TITLE\}\}/g, this.title);
            }
            // 自动添加创建日期和截止日期
            if (this.choice && taskText) {
                let dateString = "";
                // 自动添加创建日期
                if (this.choice.autoAddCreatedDate) {
                    const createdDate = new Date().toISOString().split('T')[0];
                    dateString += ` ➕ ${createdDate}`;
                }
                // 自动添加截止日期
                if (this.choice.autoAddDueDate) {
                    let dueDate = new Date();
                    switch (this.choice.dueDateOption) {
                        case "today":
                            // 使用当前日期
                            break;
                        case "custom":
                            // 自定义天数
                            dueDate.setDate(dueDate.getDate() + (this.choice.customDueDays || 1));
                            break;
                        case "weekend":
                            // 本周末（周六）
                            const dayOfWeek = dueDate.getDay();
                            const daysToWeekend = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
                            dueDate.setDate(dueDate.getDate() + daysToWeekend);
                            break;
                        case "monthEnd":
                            // 本月底
                            dueDate.setMonth(dueDate.getMonth() + 1, 0);
                            break;
                        case "yearEnd":
                            // 本年底
                            dueDate = new Date(dueDate.getFullYear(), 11, 31);
                            break;
                    }
                    const dueDateStr = dueDate.toISOString().split('T')[0];
                    dateString += ` 📅 ${dueDateStr}`;
                }
                // 如果需要添加日期，将其插入到任务文本后面
                if (dateString) {
                    formatted = formatted.replace(taskText, `${taskText}${dateString}`);
                }
            }
            return formatted;
        });
    }
    formatContentWithFile(input, choice, fileContent, file) {
        return __awaiter(this, void 0, void 0, function* () {
            this.choice = choice;
            this.file = file;
            this.fileContent = fileContent;
            let formatted = input;
            // Run templater if needed
            if (!this.templaterProcessed && this.file) {
                const templaterFormatted = yield templaterParseTemplate(this.app, formatted, this.file);
                if (templaterFormatted) {
                    formatted = templaterFormatted;
                }
                this.templaterProcessed = true;
            }
            const formattedContentIsEmpty = formatted.trim() === "";
            if (formattedContentIsEmpty)
                return this.fileContent;
            if (choice.prepend) {
                const shouldInsertLinebreak = !choice.task;
                return `${this.fileContent}${shouldInsertLinebreak ? "\n" : ""}${formatted}`;
            }
            if (choice.insertAfter.enabled) {
                return yield this.insertAfterHandler(formatted);
            }
            const frontmatterEndPosition = this.getFrontmatterEndPosition(this.file, this.fileContent);
            if (frontmatterEndPosition === null || frontmatterEndPosition < 0) {
                return `${formatted}${this.fileContent}`;
            }
            return this.insertTextAfterPositionInBody(formatted, this.fileContent, frontmatterEndPosition);
        });
    }
    formatFileName(fileName, choiceName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // 获取目标日期，如果没有则使用当前日期
            const targetDate = ((_a = this.choice) === null || _a === void 0 ? void 0 : _a._targetDate) || new Date();
            // Replace {{DATE}} or {{date}} with target date
            if (fileName.includes("{{DATE}}") || fileName.includes("{{date}}")) {
                const date = targetDate.toISOString().split("T")[0];
                fileName = fileName.replace(/\{\{DATE\}\}/gi, date || '');
            }
            // Replace {{CHOICE_NAME}} with choice name
            if (fileName.includes("{{CHOICE_NAME}}")) {
                fileName = fileName.replace(/\{\{CHOICE_NAME\}\}/g, choiceName);
            }
            // 替换 {{日记}} 为 ${dailyNote.savePath}/${dailyFileName}.md
            const dailySettings = this.plugin.settings.dailyNote;
            if (dailySettings) {
                // 使用目标日期
                const dailyFileName = formatDate(targetDate, dailySettings.fileNameFormat);
                const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
                fileName = fileName.replace(/\{\{日记\}\}/g, dailyNotePath);
                // 替换 {{日记模板}} 为 ${dailySettings.templatePath}
                fileName = fileName.replace(/\{\{日记模板\}\}/g, dailySettings.templatePath);
            }
            // 替换 {{周报}} 为 ${weeklyNote.savePath}/${weeklyFileName}.md
            const weeklySettings = this.plugin.settings.weeklyNote;
            if (weeklySettings) {
                // 使用目标日期
                const weeklyFileName = formatDate(targetDate, weeklySettings.fileNameFormat);
                const weeklyNotePath = `${weeklySettings.savePath}/${weeklyFileName}.md`;
                fileName = fileName.replace(/\{\{周报\}\}/g, weeklyNotePath);
                // 替换 {{周报模板}} 为 ${weeklySettings.templatePath}
                fileName = fileName.replace(/\{\{周报模板\}\}/g, weeklySettings.templatePath);
            }
            // 替换 {{月报}} 为 ${monthlyNote.savePath}/${monthlyFileName}.md
            const monthlySettings = this.plugin.settings.monthlyNote;
            if (monthlySettings) {
                // 使用目标日期
                const monthlyFileName = formatDate(targetDate, monthlySettings.fileNameFormat);
                const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
                fileName = fileName.replace(/\{\{月报\}\}/g, monthlyNotePath);
                // 替换 {{月报模板}} 为 ${monthlySettings.templatePath}
                fileName = fileName.replace(/\{\{月报模板\}\}/g, monthlySettings.templatePath);
            }
            // 替换 {{季报}} 为 ${quarterlyNote.savePath}/${quarterlyFileName}.md
            const quarterlySettings = this.plugin.settings.quarterlyNote;
            if (quarterlySettings) {
                // 使用目标日期
                const quarterlyFileName = formatDate(targetDate, quarterlySettings.fileNameFormat);
                const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
                fileName = fileName.replace(/\{\{季报\}\}/g, quarterlyNotePath);
                // 替换 {{季报模板}} 为 ${quarterlySettings.templatePath}
                fileName = fileName.replace(/\{\{季报模板\}\}/g, quarterlySettings.templatePath);
            }
            // 替换 {{年报}} 为 ${yearlyNote.savePath}/${yearlyFileName}.md
            const yearlySettings = this.plugin.settings.yearlyNote;
            if (yearlySettings) {
                // 使用目标日期
                const yearlyFileName = formatDate(targetDate, yearlySettings.fileNameFormat);
                const yearlyNotePath = `${yearlySettings.savePath}/${yearlyFileName}.md`;
                fileName = fileName.replace(/\{\{年报\}\}/g, yearlyNotePath);
                // 替换 {{年报模板}} 为 ${yearlySettings.templatePath}
                fileName = fileName.replace(/\{\{年报模板\}\}/g, yearlySettings.templatePath);
            }
            // 替换 {{闪念}} 为 ${fleetingNote.savePath}/${fleetingNoteFileName}.md
            const fleetingNoteSettings = this.plugin.settings.fleetingNote;
            if (fleetingNoteSettings) {
                // 使用目标日期
                const fleetingNoteFileName = formatDate(targetDate, fleetingNoteSettings.fileNameFormat);
                const fleetingNotePath = `${fleetingNoteSettings.savePath}/${fleetingNoteFileName}.md`;
                fileName = fileName.replace(/\{\{闪念\}\}/g, fleetingNotePath);
                // 替换 {{闪念模板}} 为 ${fleetingNoteSettings.templatePath}
                fileName = fileName.replace(/\{\{闪念模板\}\}/g, fleetingNoteSettings.templatePath);
            }
            return fileName;
        });
    }
    getAndClearTemplatePropertyVars() {
        const vars = this.templatePropertyVars;
        this.templatePropertyVars = new Map();
        return vars;
    }
    getSelectedText() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            let selection = "";
            if (activeView) {
                const editor = activeView.editor;
                selection = editor.getSelection();
            }
            if (selection.trim()) {
                return selection;
            }
            // 如果输入方式为"none"，直接返回空字符串
            if (this.inputMethod === 'none') {
                return "";
            }
            // No selection, show prompt modal based on input method
            return new Promise((resolve) => {
                var _a;
                const modal = new PromptModal({
                    app: this.app,
                    title: ((_a = this.choice) === null || _a === void 0 ? void 0 : _a.name) || "输入内容",
                    placeholder: "输入内容",
                    inputMethod: this.inputMethod,
                    onSubmit: (value) => {
                        resolve(value);
                    }
                });
                modal.open();
            });
        });
    }
    getFrontmatterEndPosition(file, fallbackContent) {
        const fileCache = this.app.metadataCache.getFileCache(file);
        if (fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatterPosition) {
            return fileCache.frontmatterPosition.end.line;
        }
        if (fallbackContent) {
            const inferred = this.inferFrontmatterEndLineFromContent(fallbackContent);
            if (inferred !== null) {
                return inferred;
            }
        }
        return -1;
    }
    inferFrontmatterEndLineFromContent(content) {
        var _a;
        const lines = content.split(/\r?\n/);
        let frontmatterEndLine = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = (_a = lines[i]) === null || _a === void 0 ? void 0 : _a.trim();
            if (line === "---" && frontmatterEndLine === -1) {
                frontmatterEndLine = i;
            }
            else if (line === "---" && frontmatterEndLine !== -1) {
                return i;
            }
        }
        return null;
    }
    insertTextAfterPositionInBody(text, body, pos) {
        var _a;
        if (pos === -1) {
            const shouldAddLinebreak = !((_a = this.choice) === null || _a === void 0 ? void 0 : _a.task);
            return `${text}${shouldAddLinebreak ? "\n" : ""}${body}`;
        }
        const splitContent = body.split("\n");
        const pre = splitContent.slice(0, pos + 1).join("\n");
        const post = splitContent.slice(pos + 1).join("\n");
        return `${pre}\n${text}${post}`;
    }
    insertAfterHandler(formatted) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            if (!this.choice || !this.choice.insertAfter) {
                return this.fileContent;
            }
            const targetString = this.choice.insertAfter.after;
            if ((_a = this.choice.insertAfter) === null || _a === void 0 ? void 0 : _a.inline) {
                return this.insertAfterInlineHandler(formatted, targetString);
            }
            const fileContentLines = this.fileContent.split("\n");
            let targetPosition = this.findInsertAfterIndex(fileContentLines, targetString);
            const targetNotFound = targetPosition === -1;
            if (targetNotFound) {
                if ((_b = this.choice.insertAfter) === null || _b === void 0 ? void 0 : _b.createIfNotFound) {
                    return yield this.createInsertAfterIfNotFound(formatted);
                }
                return this.fileContent;
            }
            if ((_c = this.choice.insertAfter) === null || _c === void 0 ? void 0 : _c.insertAtEnd) {
                targetPosition = this.findEndOfSection(fileContentLines, targetPosition);
            }
            else {
                const blankLineMode = (_e = (_d = this.choice.insertAfter) === null || _d === void 0 ? void 0 : _d.blankLineAfterMatchMode) !== null && _e !== void 0 ? _e : "auto";
                targetPosition = this.findInsertAfterPositionWithBlankLines(fileContentLines, targetPosition, this.fileContent, blankLineMode);
            }
            return this.insertTextAfterPositionInBody(formatted, this.fileContent, targetPosition);
        });
    }
    findInsertAfterIndex(lines, rawTarget) {
        var _a;
        const target = rawTarget.replace("\\n", "").trimEnd();
        let partialIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = (_a = lines[i]) === null || _a === void 0 ? void 0 : _a.trimStart();
            // Exact match
            if (line === target)
                return i;
            // Prefix match
            if (line && line.startsWith(target)) {
                const suffix = line.slice(target.length);
                if (/^\s*$/.test(suffix))
                    return i;
                if (partialIndex === -1) {
                    partialIndex = i;
                }
                continue;
            }
            // Substring match
            if (line) {
                const targetIndex = line.indexOf(target);
                if (targetIndex !== -1) {
                    const suffix = line.slice(targetIndex + target.length);
                    if (/^\s*$/.test(suffix))
                        return i;
                    if (partialIndex === -1) {
                        partialIndex = i;
                    }
                }
            }
        }
        return partialIndex;
    }
    findInsertAfterPositionWithBlankLines(lines, matchIndex, body, mode) {
        var _a, _b;
        if (matchIndex < 0)
            return matchIndex;
        const matchLine = (_a = lines[matchIndex]) !== null && _a !== void 0 ? _a : "";
        const shouldSkip = this.shouldSkipBlankLinesAfterMatch(mode, matchLine);
        if (!shouldSkip)
            return matchIndex;
        const scanLimit = body.endsWith("\n")
            ? Math.max(lines.length - 1, 0)
            : lines.length;
        let position = matchIndex;
        for (let i = matchIndex + 1; i < scanLimit; i++) {
            if (((_b = lines[i]) === null || _b === void 0 ? void 0 : _b.trim().length) === 0) {
                position = i;
                continue;
            }
            break;
        }
        return position;
    }
    shouldSkipBlankLinesAfterMatch(mode, line) {
        if (mode === "skip")
            return true;
        if (mode === "none")
            return false;
        return this.isAtxHeading(line);
    }
    isAtxHeading(line) {
        return /^\s{0,3}#{1,6}\s+\S/.test(line);
    }
    findEndOfSection(lines, startIndex) {
        let position = startIndex;
        let headingLevel = this.getHeadingLevel(lines[startIndex] || '');
        if (headingLevel === -1)
            return startIndex;
        // 首先找到章节的末尾（遇到相同或更高优先级的标题时停止）
        let endIndex = startIndex;
        for (let i = startIndex + 1; i < lines.length; i++) {
            const currentLevel = this.getHeadingLevel(lines[i] || '');
            if (currentLevel !== -1 && currentLevel <= headingLevel) {
                break;
            }
            endIndex = i;
        }
        // 然后从末尾向前查找，找到第一个非空行
        position = endIndex;
        for (let i = endIndex; i > startIndex; i--) {
            const line = lines[i];
            if (line && line.trim().length > 0) {
                position = i;
                break;
            }
        }
        return position;
    }
    getHeadingLevel(line) {
        var _a;
        const match = line.match(/^\s{0,3}(#{1,6})\s+/);
        if (!match)
            return -1;
        return ((_a = match[1]) === null || _a === void 0 ? void 0 : _a.length) || -1;
    }
    insertAfterInlineHandler(formatted, targetString) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const matchIndex = this.fileContent.indexOf(targetString);
            if (matchIndex === -1) {
                if ((_b = (_a = this.choice) === null || _a === void 0 ? void 0 : _a.insertAfter) === null || _b === void 0 ? void 0 : _b.createIfNotFound) {
                    return yield this.createInlineInsertAfterIfNotFound(formatted, targetString);
                }
                return this.fileContent;
            }
            const matchEnd = matchIndex + targetString.length;
            if ((_d = (_c = this.choice) === null || _c === void 0 ? void 0 : _c.insertAfter) === null || _d === void 0 ? void 0 : _d.replaceExisting) {
                const endOfLine = this.getInlineEndOfLine(matchEnd);
                return this.fileContent.slice(0, matchEnd) + formatted + this.fileContent.slice(endOfLine);
            }
            return this.fileContent.slice(0, matchEnd) + formatted + this.fileContent.slice(matchEnd);
        });
    }
    getInlineEndOfLine(startIndex) {
        const newlineIndex = this.fileContent.indexOf("\n", startIndex);
        if (newlineIndex === -1)
            return this.fileContent.length;
        if (newlineIndex > 0 && this.fileContent[newlineIndex - 1] === "\r") {
            return newlineIndex - 1;
        }
        return newlineIndex;
    }
    createInsertAfterIfNotFound(formatted) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.choice || !this.choice.insertAfter) {
                return this.fileContent;
            }
            const insertAfterLine = this.choice.insertAfter.after;
            const insertAfterLineAndFormatted = `${insertAfterLine}\n${formatted}`;
            if (((_a = this.choice.insertAfter) === null || _a === void 0 ? void 0 : _a.createIfNotFoundLocation) === "top") {
                const frontmatterEndPosition = this.getFrontmatterEndPosition(this.file, this.fileContent);
                return this.insertTextAfterPositionInBody(insertAfterLineAndFormatted, this.fileContent, frontmatterEndPosition || -1);
            }
            if (((_b = this.choice.insertAfter) === null || _b === void 0 ? void 0 : _b.createIfNotFoundLocation) === "bottom") {
                return `${this.fileContent}\n${insertAfterLineAndFormatted}`;
            }
            return this.fileContent;
        });
    }
    createInlineInsertAfterIfNotFound(formatted, targetString) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const insertAfterLineAndFormatted = `${targetString}${formatted}`;
            if (((_b = (_a = this.choice) === null || _a === void 0 ? void 0 : _a.insertAfter) === null || _b === void 0 ? void 0 : _b.createIfNotFoundLocation) === "top") {
                const frontmatterEndPosition = this.getFrontmatterEndPosition(this.file, this.fileContent);
                return this.insertTextAfterPositionInBody(insertAfterLineAndFormatted, this.fileContent, frontmatterEndPosition || -1);
            }
            if (((_d = (_c = this.choice) === null || _c === void 0 ? void 0 : _c.insertAfter) === null || _d === void 0 ? void 0 : _d.createIfNotFoundLocation) === "bottom") {
                return `${this.fileContent}\n${insertAfterLineAndFormatted}`;
            }
            return this.fileContent;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwdHVyZUNob2ljZUZvcm1hdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhcHR1cmVDaG9pY2VGb3JtYXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxZQUFZLEVBQWMsTUFBTSxVQUFVLENBQUM7QUFLcEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUVoRCxNQUFNLE9BQU8sc0JBQXNCO0lBY2xDLFlBQVksR0FBUSxFQUFFLE1BQWdCLEVBQUUsY0FBK0I7UUFWL0QsV0FBTSxHQUEwQixJQUFJLENBQUM7UUFDckMsU0FBSSxHQUFpQixJQUFJLENBQUM7UUFDMUIsZ0JBQVcsR0FBRyxFQUFFLENBQUM7UUFDakIsZUFBVSxHQUFrQixJQUFJLENBQUM7UUFDakMsK0JBQTBCLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLHVCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMzQix5QkFBb0IsR0FBeUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN2RCxVQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ25CLGdCQUFXLEdBQTBDLGFBQWEsQ0FBQztRQUcxRSxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztRQUNmLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO0lBQ3RDLENBQUM7SUFFTSxjQUFjLENBQUMsTUFBNkM7UUFDbEUsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7SUFDM0IsQ0FBQztJQUVNLGtCQUFrQixDQUFDLElBQVc7UUFDcEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFB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QUM7UUFDekIsQ0FBQztLQUFBO0lBRWEsaUNBQWlDLENBQzlDLFNBQWlCLEVBQ2pCLFlBQW9COzs7WUFFcEIsTUFBTSwyQkFBMkIsR0FBRyxHQUFHLFlBQVksR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUVsRSxJQUFJLENBQUEsTUFBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLFdBQVcsMENBQUUsd0JBQXdCLE1BQUssS0FBSyxFQUFFLENBQUM7Z0JBQ2xFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUM1RixPQUFPLElBQUksQ0FBQyw2QkFBNkIsQ0FDeEMsMkJBQTJCLEVBQzNCLElBQUksQ0FBQyxXQUFXLEVBQ2hCLHNCQUFzQixJQUFJLENBQUMsQ0FBQyxDQUM1QixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksQ0FBQSxNQUFBLE1BQUEsSUFBSSxDQUFDLE1BQU0sMENBQUUsV0FBVywwQ0FBRSx3QkFBd0IsTUFBSyxRQUFRLEVBQUUsQ0FBQztnQkFDckUsT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLEtBQUssMkJBQTJCLEVBQUUsQ0FBQztZQUM5RCxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO1FBQ3pCLENBQUM7S0FBQTtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWFya2Rvd25WaWV3LCB0eXBlIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgSUNob2ljZUV4ZWN1dG9yIH0gZnJvbSBcIi4uL0lDaG9pY2VFeGVjdXRvclwiO1xyXG5pbXBvcnQgdHlwZSBJQ2FwdHVyZUNob2ljZSBmcm9tIFwiLi4vdHlwZXMvY2hvaWNlcy9JQ2FwdHVyZUNob2ljZVwiO1xyXG5pbXBvcnQgdHlwZSB7IEJsYW5rTGluZUFmdGVyTWF0Y2hNb2RlIH0gZnJvbSBcIi4uL3R5cGVzL2Nob2ljZXMvSUNhcHR1cmVDaG9pY2VcIjtcclxuaW1wb3J0IHsgdGVtcGxhdGVyUGFyc2VUZW1wbGF0ZSB9IGZyb20gXCIuLi91dGlsaXR5T2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgTXlQbHVnaW4gZnJvbSBcIi4uL21haW5cIjtcclxuaW1wb3J0IHsgUHJvbXB0TW9kYWwgfSBmcm9tIFwiLi4vbW9kYWxzL1Byb21wdE1vZGFsXCI7XHJcbmltcG9ydCB7IGZvcm1hdERhdGUgfSBmcm9tIFwiLi4vdXRpbHMvZGF0ZVV0aWxzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ2FwdHVyZUNob2ljZUZvcm1hdHRlciB7XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHBsdWdpbjogTXlQbHVnaW47XHJcblx0cHJpdmF0ZSBjaG9pY2VFeGVjdXRvcjogSUNob2ljZUV4ZWN1dG9yO1xyXG5cdHByaXZhdGUgY2hvaWNlOiBJQ2FwdHVyZUNob2ljZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZmlsZTogVEZpbGUgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGZpbGVDb250ZW50ID0gXCJcIjtcclxuXHRwcml2YXRlIHNvdXJjZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdXNlU2VsZWN0aW9uQXNDYXB0dXJlVmFsdWUgPSB0cnVlO1xyXG5cdHByaXZhdGUgdGVtcGxhdGVyUHJvY2Vzc2VkID0gZmFsc2U7XHJcblx0cHJpdmF0ZSB0ZW1wbGF0ZVByb3BlcnR5VmFyczogTWFwPHN0cmluZywgdW5rbm93bj4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSB0aXRsZTogc3RyaW5nID0gXCJcIjtcclxuXHRwcml2YXRlIGlucHV0TWV0aG9kOiAnc2luZ2xlLWxpbmUnIHwgJ211bHRpLWxpbmUnIHwgJ25vbmUnID0gJ3NpbmdsZS1saW5lJztcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogTXlQbHVnaW4sIGNob2ljZUV4ZWN1dG9yOiBJQ2hvaWNlRXhlY3V0b3IpIHtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLmNob2ljZUV4ZWN1dG9yID0gY2hvaWNlRXhlY3V0b3I7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0SW5wdXRNZXRob2QobWV0aG9kOiAnc2luZ2xlLWxpbmUnIHwgJ211bHRpLWxpbmUnIHwgJ25vbmUnKSB7XHJcblx0XHR0aGlzLmlucHV0TWV0aG9kID0gbWV0aG9kO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldERlc3RpbmF0aW9uRmlsZShmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0dGhpcy5maWxlID0gZmlsZTtcclxuXHRcdHRoaXMuc291cmNlUGF0aCA9IGZpbGUucGF0aDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXREZXN0aW5hdGlvblNvdXJjZVBhdGgocGF0aDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLnNvdXJjZVBhdGggPSBwYXRoO1xyXG5cdFx0dGhpcy5maWxlID0gbnVsbDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRVc2VTZWxlY3Rpb25Bc0NhcHR1cmVWYWx1ZSh2YWx1ZTogYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0dGhpcy51c2VTZWxlY3Rpb25Bc0NhcHR1cmVWYWx1ZSA9IHZhbHVlO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldExpbmtUb0N1cnJlbnRGaWxlQmVoYXZpb3IoYmVoYXZpb3I6IFwib3B0aW9uYWxcIiB8IFwicmVxdWlyZWRcIik6IHZvaWQge1xyXG5cdFx0Ly8gSW1wbGVtZW50YXRpb24gd291bGQgZ28gaGVyZVxyXG5cdH1cclxuXHJcblx0cHVibGljIHNldFRpdGxlKHRpdGxlOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRoaXMudGl0bGUgPSB0aXRsZTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRDaG9pY2UoY2hvaWNlOiBJQ2FwdHVyZUNob2ljZSB8IG51bGwpOiB2b2lkIHtcclxuXHRcdHRoaXMuY2hvaWNlID0gY2hvaWNlO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGFzeW5jIGZvcm1hdENvbnRlbnRPbmx5KGlucHV0OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0bGV0IGZvcm1hdHRlZCA9IGlucHV0O1xyXG5cdFx0Ly8gUmVwbGFjZSB7e1ZBTFVFfX0gb3Ige3tUQVNLX1RFWFR9fSB3aXRoIHNlbGVjdGVkIHRleHQgb3IgdXNlciBpbnB1dFxyXG5cdFx0bGV0IHRhc2tUZXh0ID0gXCJcIjtcclxuXHRcdGlmIChmb3JtYXR0ZWQuaW5jbHVkZXMoXCJ7e1ZBTFVFfX1cIikpIHtcclxuXHRcdFx0Y29uc3Qgc2VsZWN0ZWRUZXh0ID0gYXdhaXQgdGhpcy5nZXRTZWxlY3RlZFRleHQoKTtcclxuXHRcdFx0dGFza1RleHQgPSBzZWxlY3RlZFRleHQudHJpbSgpIHx8IFwiXCI7XHJcblx0XHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9cXHtcXHtWQUxVRVxcfVxcfS9nLCB0YXNrVGV4dCk7XHJcblx0XHR9IGVsc2UgaWYgKGZvcm1hdHRlZC5pbmNsdWRlcyhcInt7VEFTS19URVhUfX1cIikpIHtcclxuXHRcdFx0Y29uc3Qgc2VsZWN0ZWRUZXh0ID0gYXdhaXQgdGhpcy5nZXRTZWxlY3RlZFRleHQoKTtcclxuXHRcdFx0dGFza1RleHQgPSBzZWxlY3RlZFRleHQudHJpbSgpIHx8IFwiXCI7XHJcblx0XHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9cXHtcXHtUQVNLX1RFWFRcXH1cXH0vZywgdGFza1RleHQpO1xyXG5cdFx0fVxyXG5cdFx0Ly8gUmVwbGFjZSB7e1RJVExFfX0gd2l0aCBmaWxlIHRpdGxlXHJcblx0XHRpZiAoZm9ybWF0dGVkLmluY2x1ZGVzKFwie3tUSVRMRX19XCIpKSB7XHJcblx0XHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9cXHtcXHtUSVRMRVxcfVxcfS9nLCB0aGlzLnRpdGxlKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8g6Ieq5Yqo5re75Yqg5Yib5bu65pel5pyf5ZKM5oiq5q2i5pel5pyfXHJcblx0XHRpZiAodGhpcy5jaG9pY2UgJiYgdGFza1RleHQpIHtcclxuXHRcdFx0bGV0IGRhdGVTdHJpbmcgPSBcIlwiO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g6Ieq5Yqo5re75Yqg5Yib5bu65pel5pyfXHJcblx0XHRcdGlmICh0aGlzLmNob2ljZS5hdXRvQWRkQ3JlYXRlZERhdGUpIHtcclxuXHRcdFx0XHRjb25zdCBjcmVhdGVkRGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdO1xyXG5cdFx0XHRcdGRhdGVTdHJpbmcgKz0gYCDinpUgJHtjcmVhdGVkRGF0ZX1gO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDoh6rliqjmt7vliqDmiKrmraLml6XmnJ9cclxuXHRcdFx0aWYgKHRoaXMuY2hvaWNlLmF1dG9BZGREdWVEYXRlKSB7XHJcblx0XHRcdFx0bGV0IGR1ZURhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdHN3aXRjaCAodGhpcy5jaG9pY2UuZHVlRGF0ZU9wdGlvbikge1xyXG5cdFx0XHRcdFx0Y2FzZSBcInRvZGF5XCI6XHJcblx0XHRcdFx0XHRcdC8vIOS9v+eUqOW9k+WJjeaXpeacn1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgXCJjdXN0b21cIjpcclxuXHRcdFx0XHRcdFx0Ly8g6Ieq5a6a5LmJ5aSp5pWwXHJcblx0XHRcdFx0XHRcdGR1ZURhdGUuc2V0RGF0ZShkdWVEYXRlLmdldERhdGUoKSArICh0aGlzLmNob2ljZS5jdXN0b21EdWVEYXlzIHx8IDEpKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwid2Vla2VuZFwiOlxyXG5cdFx0XHRcdFx0XHQvLyDmnKzlkajmnKvvvIjlkajlha3vvIlcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGF5T2ZXZWVrID0gZHVlRGF0ZS5nZXREYXkoKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgZGF5c1RvV2Vla2VuZCA9IGRheU9mV2VlayA9PT0gMCA/IDYgOiA2IC0gZGF5T2ZXZWVrO1xyXG5cdFx0XHRcdFx0XHRkdWVEYXRlLnNldERhdGUoZHVlRGF0ZS5nZXREYXRlKCkgKyBkYXlzVG9XZWVrZW5kKTtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIFwibW9udGhFbmRcIjpcclxuXHRcdFx0XHRcdFx0Ly8g5pys5pyI5bqVXHJcblx0XHRcdFx0XHRcdGR1ZURhdGUuc2V0TW9udGgoZHVlRGF0ZS5nZXRNb250aCgpICsgMSwgMCk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcInllYXJFbmRcIjpcclxuXHRcdFx0XHRcdFx0Ly8g5pys5bm05bqVXHJcblx0XHRcdFx0XHRcdGR1ZURhdGUgPSBuZXcgRGF0ZShkdWVEYXRlLmdldEZ1bGxZZWFyKCksIDExLCAzMSk7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRjb25zdCBkdWVEYXRlU3RyID0gZHVlRGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF07XHJcblx0XHRcdFx0ZGF0ZVN0cmluZyArPSBgIPCfk4UgJHtkdWVEYXRlU3RyfWA7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIOWmguaenOmcgOimgea3u+WKoOaXpeacn++8jOWwhuWFtuaPkuWFpeWIsOS7u+WKoeaWh+acrOWQjumdolxyXG5cdFx0XHRpZiAoZGF0ZVN0cmluZykge1xyXG5cdFx0XHRcdGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKHRhc2tUZXh0LCBgJHt0YXNrVGV4dH0ke2RhdGVTdHJpbmd9YCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIGZvcm1hdHRlZDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhc3luYyBmb3JtYXRDb250ZW50V2l0aEZpbGUoXHJcblx0XHRpbnB1dDogc3RyaW5nLFxyXG5cdFx0Y2hvaWNlOiBJQ2FwdHVyZUNob2ljZSxcclxuXHRcdGZpbGVDb250ZW50OiBzdHJpbmcsXHJcblx0XHRmaWxlOiBURmlsZSxcclxuXHQpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0dGhpcy5jaG9pY2UgPSBjaG9pY2U7XHJcblx0XHR0aGlzLmZpbGUgPSBmaWxlO1xyXG5cdFx0dGhpcy5maWxlQ29udGVudCA9IGZpbGVDb250ZW50O1xyXG5cclxuXHRcdGxldCBmb3JtYXR0ZWQgPSBpbnB1dDtcclxuXHRcdFxyXG5cdFx0Ly8gUnVuIHRlbXBsYXRlciBpZiBuZWVkZWRcclxuXHRcdGlmICghdGhpcy50ZW1wbGF0ZXJQcm9jZXNzZWQgJiYgdGhpcy5maWxlKSB7XHJcblx0XHRcdGNvbnN0IHRlbXBsYXRlckZvcm1hdHRlZCA9IGF3YWl0IHRlbXBsYXRlclBhcnNlVGVtcGxhdGUoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0Zm9ybWF0dGVkLFxyXG5cdFx0XHRcdHRoaXMuZmlsZSxcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKHRlbXBsYXRlckZvcm1hdHRlZCkge1xyXG5cdFx0XHRcdGZvcm1hdHRlZCA9IHRlbXBsYXRlckZvcm1hdHRlZDtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnRlbXBsYXRlclByb2Nlc3NlZCA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZm9ybWF0dGVkQ29udGVudElzRW1wdHkgPSBmb3JtYXR0ZWQudHJpbSgpID09PSBcIlwiO1xyXG5cdFx0aWYgKGZvcm1hdHRlZENvbnRlbnRJc0VtcHR5KSByZXR1cm4gdGhpcy5maWxlQ29udGVudDtcclxuXHJcblx0XHRpZiAoY2hvaWNlLnByZXBlbmQpIHtcclxuXHRcdFx0Y29uc3Qgc2hvdWxkSW5zZXJ0TGluZWJyZWFrID0gIWNob2ljZS50YXNrO1xyXG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5maWxlQ29udGVudH0ke3Nob3VsZEluc2VydExpbmVicmVhayA/IFwiXFxuXCIgOiBcIlwifSR7Zm9ybWF0dGVkfWA7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGNob2ljZS5pbnNlcnRBZnRlci5lbmFibGVkKSB7XHJcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmluc2VydEFmdGVySGFuZGxlcihmb3JtYXR0ZWQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZyb250bWF0dGVyRW5kUG9zaXRpb24gPSB0aGlzLmdldEZyb250bWF0dGVyRW5kUG9zaXRpb24odGhpcy5maWxlLCB0aGlzLmZpbGVDb250ZW50KTtcclxuXHRcdGlmIChmcm9udG1hdHRlckVuZFBvc2l0aW9uID09PSBudWxsIHx8IGZyb250bWF0dGVyRW5kUG9zaXRpb24gPCAwKSB7XHJcblx0XHRcdHJldHVybiBgJHtmb3JtYXR0ZWR9JHt0aGlzLmZpbGVDb250ZW50fWA7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaW5zZXJ0VGV4dEFmdGVyUG9zaXRpb25JbkJvZHkoXHJcblx0XHRcdGZvcm1hdHRlZCxcclxuXHRcdFx0dGhpcy5maWxlQ29udGVudCxcclxuXHRcdFx0ZnJvbnRtYXR0ZXJFbmRQb3NpdGlvbixcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgYXN5bmMgZm9ybWF0RmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgY2hvaWNlTmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdC8vIOiOt+WPluebruagh+aXpeacn++8jOWmguaenOayoeacieWImeS9v+eUqOW9k+WJjeaXpeacn1xyXG5cdFx0Y29uc3QgdGFyZ2V0RGF0ZSA9ICh0aGlzLmNob2ljZSBhcyBhbnkpPy5fdGFyZ2V0RGF0ZSB8fCBuZXcgRGF0ZSgpO1xyXG5cdFx0XHJcblx0XHQvLyBSZXBsYWNlIHt7REFURX19IG9yIHt7ZGF0ZX19IHdpdGggdGFyZ2V0IGRhdGVcclxuXHRcdGlmIChmaWxlTmFtZS5pbmNsdWRlcyhcInt7REFURX19XCIpIHx8IGZpbGVOYW1lLmluY2x1ZGVzKFwie3tkYXRlfX1cIikpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZSA9IHRhcmdldERhdGUudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx7REFURVxcfVxcfS9naSwgZGF0ZSB8fCAnJyk7XHJcblx0XHR9XHJcblx0XHQvLyBSZXBsYWNlIHt7Q0hPSUNFX05BTUV9fSB3aXRoIGNob2ljZSBuYW1lXHJcblx0XHRpZiAoZmlsZU5hbWUuaW5jbHVkZXMoXCJ7e0NIT0lDRV9OQU1FfX1cIikpIHtcclxuXHRcdFx0ZmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXHtcXHtDSE9JQ0VfTkFNRVxcfVxcfS9nLCBjaG9pY2VOYW1lKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8g5pu/5o2iIHt75pel6K6wfX0g5Li6ICR7ZGFpbHlOb3RlLnNhdmVQYXRofS8ke2RhaWx5RmlsZU5hbWV9Lm1kXHJcblx0XHRjb25zdCBkYWlseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3RlO1xyXG5cdFx0aWYgKGRhaWx5U2V0dGluZ3MpIHtcclxuXHRcdFx0Ly8g5L2/55So55uu5qCH5pel5pyfXHJcblx0XHRcdGNvbnN0IGRhaWx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKHRhcmdldERhdGUsIGRhaWx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG5cdFx0XHRjb25zdCBkYWlseU5vdGVQYXRoID0gYCR7ZGFpbHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtkYWlseUZpbGVOYW1lfS5tZGA7XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx75pel6K6wXFx9XFx9L2csIGRhaWx5Tm90ZVBhdGgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g5pu/5o2iIHt75pel6K6w5qih5p2/fX0g5Li6ICR7ZGFpbHlTZXR0aW5ncy50ZW1wbGF0ZVBhdGh9XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx75pel6K6w5qih5p2/XFx9XFx9L2csIGRhaWx5U2V0dGluZ3MudGVtcGxhdGVQYXRoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8g5pu/5o2iIHt75ZGo5oqlfX0g5Li6ICR7d2Vla2x5Tm90ZS5zYXZlUGF0aH0vJHt3ZWVrbHlGaWxlTmFtZX0ubWRcclxuXHRcdGNvbnN0IHdlZWtseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZTtcclxuXHRcdGlmICh3ZWVrbHlTZXR0aW5ncykge1xyXG5cdFx0XHQvLyDkvb/nlKjnm67moIfml6XmnJ9cclxuXHRcdFx0Y29uc3Qgd2Vla2x5RmlsZU5hbWUgPSBmb3JtYXREYXRlKHRhcmdldERhdGUsIHdlZWtseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuXHRcdFx0Y29uc3Qgd2Vla2x5Tm90ZVBhdGggPSBgJHt3ZWVrbHlTZXR0aW5ncy5zYXZlUGF0aH0vJHt3ZWVrbHlGaWxlTmFtZX0ubWRgO1xyXG5cdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xce1xce+WRqOaKpVxcfVxcfS9nLCB3ZWVrbHlOb3RlUGF0aCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDmm7/mjaIge3vlkajmiqXmqKHmnb99fSDkuLogJHt3ZWVrbHlTZXR0aW5ncy50ZW1wbGF0ZVBhdGh9XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx75ZGo5oql5qih5p2/XFx9XFx9L2csIHdlZWtseVNldHRpbmdzLnRlbXBsYXRlUGF0aCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIOabv+aNoiB7e+aciOaKpX19IOS4uiAke21vbnRobHlOb3RlLnNhdmVQYXRofS8ke21vbnRobHlGaWxlTmFtZX0ubWRcclxuXHRcdGNvbnN0IG1vbnRobHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm1vbnRobHlOb3RlO1xyXG5cdFx0aWYgKG1vbnRobHlTZXR0aW5ncykge1xyXG5cdFx0XHQvLyDkvb/nlKjnm67moIfml6XmnJ9cclxuXHRcdFx0Y29uc3QgbW9udGhseUZpbGVOYW1lID0gZm9ybWF0RGF0ZSh0YXJnZXREYXRlLCBtb250aGx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG5cdFx0XHRjb25zdCBtb250aGx5Tm90ZVBhdGggPSBgJHttb250aGx5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7bW9udGhseUZpbGVOYW1lfS5tZGA7XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx75pyI5oqlXFx9XFx9L2csIG1vbnRobHlOb3RlUGF0aCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDmm7/mjaIge3vmnIjmiqXmqKHmnb99fSDkuLogJHttb250aGx5U2V0dGluZ3MudGVtcGxhdGVQYXRofVxyXG5cdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xce1xce+aciOaKpeaooeadv1xcfVxcfS9nLCBtb250aGx5U2V0dGluZ3MudGVtcGxhdGVQYXRoKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8g5pu/5o2iIHt75a2j5oqlfX0g5Li6ICR7cXVhcnRlcmx5Tm90ZS5zYXZlUGF0aH0vJHtxdWFydGVybHlGaWxlTmFtZX0ubWRcclxuXHRcdGNvbnN0IHF1YXJ0ZXJseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVhcnRlcmx5Tm90ZTtcclxuXHRcdGlmIChxdWFydGVybHlTZXR0aW5ncykge1xyXG5cdFx0XHQvLyDkvb/nlKjnm67moIfml6XmnJ9cclxuXHRcdFx0Y29uc3QgcXVhcnRlcmx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKHRhcmdldERhdGUsIHF1YXJ0ZXJseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuXHRcdFx0Y29uc3QgcXVhcnRlcmx5Tm90ZVBhdGggPSBgJHtxdWFydGVybHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtxdWFydGVybHlGaWxlTmFtZX0ubWRgO1xyXG5cdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xce1xce+Wto+aKpVxcfVxcfS9nLCBxdWFydGVybHlOb3RlUGF0aCk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyDmm7/mjaIge3vlraPmiqXmqKHmnb99fSDkuLogJHtxdWFydGVybHlTZXR0aW5ncy50ZW1wbGF0ZVBhdGh9XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx75a2j5oql5qih5p2/XFx9XFx9L2csIHF1YXJ0ZXJseVNldHRpbmdzLnRlbXBsYXRlUGF0aCk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIOabv+aNoiB7e+W5tOaKpX19IOS4uiAke3llYXJseU5vdGUuc2F2ZVBhdGh9LyR7eWVhcmx5RmlsZU5hbWV9Lm1kXHJcblx0XHRjb25zdCB5ZWFybHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnllYXJseU5vdGU7XHJcblx0XHRpZiAoeWVhcmx5U2V0dGluZ3MpIHtcclxuXHRcdFx0Ly8g5L2/55So55uu5qCH5pel5pyfXHJcblx0XHRcdGNvbnN0IHllYXJseUZpbGVOYW1lID0gZm9ybWF0RGF0ZSh0YXJnZXREYXRlLCB5ZWFybHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcblx0XHRcdGNvbnN0IHllYXJseU5vdGVQYXRoID0gYCR7eWVhcmx5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7eWVhcmx5RmlsZU5hbWV9Lm1kYDtcclxuXHRcdFx0ZmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXHtcXHvlubTmiqVcXH1cXH0vZywgeWVhcmx5Tm90ZVBhdGgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g5pu/5o2iIHt75bm05oql5qih5p2/fX0g5Li6ICR7eWVhcmx5U2V0dGluZ3MudGVtcGxhdGVQYXRofVxyXG5cdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xce1xce+W5tOaKpeaooeadv1xcfVxcfS9nLCB5ZWFybHlTZXR0aW5ncy50ZW1wbGF0ZVBhdGgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyDmm7/mjaIge3vpl6rlv7V9fSDkuLogJHtmbGVldGluZ05vdGUuc2F2ZVBhdGh9LyR7ZmxlZXRpbmdOb3RlRmlsZU5hbWV9Lm1kXHJcblx0XHRjb25zdCBmbGVldGluZ05vdGVTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZsZWV0aW5nTm90ZTtcclxuXHRcdGlmIChmbGVldGluZ05vdGVTZXR0aW5ncykge1xyXG5cdFx0XHQvLyDkvb/nlKjnm67moIfml6XmnJ9cclxuXHRcdFx0Y29uc3QgZmxlZXRpbmdOb3RlRmlsZU5hbWUgPSBmb3JtYXREYXRlKHRhcmdldERhdGUsIGZsZWV0aW5nTm90ZVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuXHRcdFx0Y29uc3QgZmxlZXRpbmdOb3RlUGF0aCA9IGAke2ZsZWV0aW5nTm90ZVNldHRpbmdzLnNhdmVQYXRofS8ke2ZsZWV0aW5nTm90ZUZpbGVOYW1lfS5tZGA7XHJcblx0XHRcdGZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFx7XFx76Zeq5b+1XFx9XFx9L2csIGZsZWV0aW5nTm90ZVBhdGgpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8g5pu/5o2iIHt76Zeq5b+15qih5p2/fX0g5Li6ICR7ZmxlZXRpbmdOb3RlU2V0dGluZ3MudGVtcGxhdGVQYXRofVxyXG5cdFx0XHRmaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xce1xce+mXquW/teaooeadv1xcfVxcfS9nLCBmbGVldGluZ05vdGVTZXR0aW5ncy50ZW1wbGF0ZVBhdGgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gZmlsZU5hbWU7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0QW5kQ2xlYXJUZW1wbGF0ZVByb3BlcnR5VmFycygpOiBNYXA8c3RyaW5nLCB1bmtub3duPiB7XHJcblx0XHRjb25zdCB2YXJzID0gdGhpcy50ZW1wbGF0ZVByb3BlcnR5VmFycztcclxuXHRcdHRoaXMudGVtcGxhdGVQcm9wZXJ0eVZhcnMgPSBuZXcgTWFwKCk7XHJcblx0XHRyZXR1cm4gdmFycztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgZ2V0U2VsZWN0ZWRUZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRjb25zdCBhY3RpdmVWaWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuXHRcdGxldCBzZWxlY3Rpb24gPSBcIlwiO1xyXG5cdFx0aWYgKGFjdGl2ZVZpZXcpIHtcclxuXHRcdFx0Y29uc3QgZWRpdG9yID0gYWN0aXZlVmlldy5lZGl0b3I7XHJcblx0XHRcdHNlbGVjdGlvbiA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoc2VsZWN0aW9uLnRyaW0oKSkge1xyXG5cdFx0XHRyZXR1cm4gc2VsZWN0aW9uO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOWmguaenOi+k+WFpeaWueW8j+S4ulwibm9uZVwi77yM55u05o6l6L+U5Zue56m65a2X56ym5LiyXHJcblx0XHRpZiAodGhpcy5pbnB1dE1ldGhvZCA9PT0gJ25vbmUnKSB7XHJcblx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5vIHNlbGVjdGlvbiwgc2hvdyBwcm9tcHQgbW9kYWwgYmFzZWQgb24gaW5wdXQgbWV0aG9kXHJcblx0XHRyZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2RhbCA9IG5ldyBQcm9tcHRNb2RhbCh7XHJcblx0XHRcdFx0YXBwOiB0aGlzLmFwcCxcclxuXHRcdFx0XHR0aXRsZTogdGhpcy5jaG9pY2U/Lm5hbWUgfHwgXCLovpPlhaXlhoXlrrlcIixcclxuXHRcdFx0XHRwbGFjZWhvbGRlcjogXCLovpPlhaXlhoXlrrlcIixcclxuXHRcdFx0XHRpbnB1dE1ldGhvZDogdGhpcy5pbnB1dE1ldGhvZCBhcyAnc2luZ2xlLWxpbmUnIHwgJ211bHRpLWxpbmUnLFxyXG5cdFx0XHRcdG9uU3VibWl0OiAodmFsdWUpID0+IHtcclxuXHRcdFx0XHRcdHJlc29sdmUodmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vZGFsLm9wZW4oKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRGcm9udG1hdHRlckVuZFBvc2l0aW9uKGZpbGU6IFRGaWxlLCBmYWxsYmFja0NvbnRlbnQ/OiBzdHJpbmcpOiBudW1iZXIgfCBudWxsIHtcclxuXHRcdGNvbnN0IGZpbGVDYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cclxuXHRcdGlmIChmaWxlQ2FjaGU/LmZyb250bWF0dGVyUG9zaXRpb24pIHtcclxuXHRcdFx0cmV0dXJuIGZpbGVDYWNoZS5mcm9udG1hdHRlclBvc2l0aW9uLmVuZC5saW5lO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChmYWxsYmFja0NvbnRlbnQpIHtcclxuXHRcdFx0Y29uc3QgaW5mZXJyZWQgPSB0aGlzLmluZmVyRnJvbnRtYXR0ZXJFbmRMaW5lRnJvbUNvbnRlbnQoZmFsbGJhY2tDb250ZW50KTtcclxuXHRcdFx0aWYgKGluZmVycmVkICE9PSBudWxsKSB7XHJcblx0XHRcdFx0cmV0dXJuIGluZmVycmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIC0xO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpbmZlckZyb250bWF0dGVyRW5kTGluZUZyb21Db250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KC9cXHI/XFxuLyk7XHJcblx0XHRsZXQgZnJvbnRtYXR0ZXJFbmRMaW5lID0gLTE7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV0/LnRyaW0oKTtcclxuXHRcdFx0aWYgKGxpbmUgPT09IFwiLS0tXCIgJiYgZnJvbnRtYXR0ZXJFbmRMaW5lID09PSAtMSkge1xyXG5cdFx0XHRcdGZyb250bWF0dGVyRW5kTGluZSA9IGk7XHJcblx0XHRcdH0gZWxzZSBpZiAobGluZSA9PT0gXCItLS1cIiAmJiBmcm9udG1hdHRlckVuZExpbmUgIT09IC0xKSB7XHJcblx0XHRcdFx0cmV0dXJuIGk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaW5zZXJ0VGV4dEFmdGVyUG9zaXRpb25JbkJvZHkoXHJcblx0XHR0ZXh0OiBzdHJpbmcsXHJcblx0XHRib2R5OiBzdHJpbmcsXHJcblx0XHRwb3M6IG51bWJlcixcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0aWYgKHBvcyA9PT0gLTEpIHtcclxuXHRcdFx0Y29uc3Qgc2hvdWxkQWRkTGluZWJyZWFrID0gIXRoaXMuY2hvaWNlPy50YXNrO1xyXG5cdFx0XHRyZXR1cm4gYCR7dGV4dH0ke3Nob3VsZEFkZExpbmVicmVhayA/IFwiXFxuXCIgOiBcIlwifSR7Ym9keX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHNwbGl0Q29udGVudCA9IGJvZHkuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRjb25zdCBwcmUgPSBzcGxpdENvbnRlbnQuc2xpY2UoMCwgcG9zICsgMSkuam9pbihcIlxcblwiKTtcclxuXHRcdGNvbnN0IHBvc3QgPSBzcGxpdENvbnRlbnQuc2xpY2UocG9zICsgMSkuam9pbihcIlxcblwiKTtcclxuXHJcblx0XHRyZXR1cm4gYCR7cHJlfVxcbiR7dGV4dH0ke3Bvc3R9YDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgaW5zZXJ0QWZ0ZXJIYW5kbGVyKGZvcm1hdHRlZDogc3RyaW5nKSB7XHJcblx0XHRpZiAoIXRoaXMuY2hvaWNlIHx8ICF0aGlzLmNob2ljZS5pbnNlcnRBZnRlcikge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5maWxlQ29udGVudDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB0YXJnZXRTdHJpbmcgPSB0aGlzLmNob2ljZS5pbnNlcnRBZnRlci5hZnRlcjtcclxuXHJcblx0XHRpZiAodGhpcy5jaG9pY2UuaW5zZXJ0QWZ0ZXI/LmlubGluZSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pbnNlcnRBZnRlcklubGluZUhhbmRsZXIoZm9ybWF0dGVkLCB0YXJnZXRTdHJpbmcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZpbGVDb250ZW50TGluZXMgPSB0aGlzLmZpbGVDb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0bGV0IHRhcmdldFBvc2l0aW9uID0gdGhpcy5maW5kSW5zZXJ0QWZ0ZXJJbmRleChmaWxlQ29udGVudExpbmVzLCB0YXJnZXRTdHJpbmcpO1xyXG5cdFx0Y29uc3QgdGFyZ2V0Tm90Rm91bmQgPSB0YXJnZXRQb3NpdGlvbiA9PT0gLTE7XHJcblxyXG5cdFx0aWYgKHRhcmdldE5vdEZvdW5kKSB7XHJcblx0XHRcdGlmICh0aGlzLmNob2ljZS5pbnNlcnRBZnRlcj8uY3JlYXRlSWZOb3RGb3VuZCkge1xyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZUluc2VydEFmdGVySWZOb3RGb3VuZChmb3JtYXR0ZWQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB0aGlzLmZpbGVDb250ZW50O1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmNob2ljZS5pbnNlcnRBZnRlcj8uaW5zZXJ0QXRFbmQpIHtcclxuXHRcdFx0dGFyZ2V0UG9zaXRpb24gPSB0aGlzLmZpbmRFbmRPZlNlY3Rpb24oZmlsZUNvbnRlbnRMaW5lcywgdGFyZ2V0UG9zaXRpb24pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Y29uc3QgYmxhbmtMaW5lTW9kZSA9IHRoaXMuY2hvaWNlLmluc2VydEFmdGVyPy5ibGFua0xpbmVBZnRlck1hdGNoTW9kZSA/PyBcImF1dG9cIjtcclxuXHRcdFx0dGFyZ2V0UG9zaXRpb24gPSB0aGlzLmZpbmRJbnNlcnRBZnRlclBvc2l0aW9uV2l0aEJsYW5rTGluZXMoXHJcblx0XHRcdFx0ZmlsZUNvbnRlbnRMaW5lcyxcclxuXHRcdFx0XHR0YXJnZXRQb3NpdGlvbixcclxuXHRcdFx0XHR0aGlzLmZpbGVDb250ZW50LFxyXG5cdFx0XHRcdGJsYW5rTGluZU1vZGUsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuaW5zZXJ0VGV4dEFmdGVyUG9zaXRpb25JbkJvZHkoXHJcblx0XHRcdGZvcm1hdHRlZCxcclxuXHRcdFx0dGhpcy5maWxlQ29udGVudCxcclxuXHRcdFx0dGFyZ2V0UG9zaXRpb24sXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmaW5kSW5zZXJ0QWZ0ZXJJbmRleChsaW5lczogc3RyaW5nW10sIHJhd1RhcmdldDogc3RyaW5nKTogbnVtYmVyIHtcclxuXHRcdGNvbnN0IHRhcmdldCA9IHJhd1RhcmdldC5yZXBsYWNlKFwiXFxcXG5cIiwgXCJcIikudHJpbUVuZCgpO1xyXG5cdFx0bGV0IHBhcnRpYWxJbmRleCA9IC0xO1xyXG5cclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldPy50cmltU3RhcnQoKTtcclxuXHJcblx0XHRcdC8vIEV4YWN0IG1hdGNoXHJcblx0XHRcdGlmIChsaW5lID09PSB0YXJnZXQpIHJldHVybiBpO1xyXG5cclxuXHRcdFx0Ly8gUHJlZml4IG1hdGNoXHJcblx0XHRcdGlmIChsaW5lICYmIGxpbmUuc3RhcnRzV2l0aCh0YXJnZXQpKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3VmZml4ID0gbGluZS5zbGljZSh0YXJnZXQubGVuZ3RoKTtcclxuXHRcdFx0XHRpZiAoL15cXHMqJC8udGVzdChzdWZmaXgpKSByZXR1cm4gaTtcclxuXHRcdFx0XHRpZiAocGFydGlhbEluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0cGFydGlhbEluZGV4ID0gaTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN1YnN0cmluZyBtYXRjaFxyXG5cdFx0XHRpZiAobGluZSkge1xyXG5cdFx0XHRcdGNvbnN0IHRhcmdldEluZGV4ID0gbGluZS5pbmRleE9mKHRhcmdldCk7XHJcblx0XHRcdFx0aWYgKHRhcmdldEluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHRcdFx0Y29uc3Qgc3VmZml4ID0gbGluZS5zbGljZSh0YXJnZXRJbmRleCArIHRhcmdldC5sZW5ndGgpO1xyXG5cdFx0XHRcdFx0aWYgKC9eXFxzKiQvLnRlc3Qoc3VmZml4KSkgcmV0dXJuIGk7XHJcblx0XHRcdFx0XHRpZiAocGFydGlhbEluZGV4ID09PSAtMSkge1xyXG5cdFx0XHRcdFx0XHRwYXJ0aWFsSW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBwYXJ0aWFsSW5kZXg7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZpbmRJbnNlcnRBZnRlclBvc2l0aW9uV2l0aEJsYW5rTGluZXMoXHJcblx0XHRsaW5lczogc3RyaW5nW10sXHJcblx0XHRtYXRjaEluZGV4OiBudW1iZXIsXHJcblx0XHRib2R5OiBzdHJpbmcsXHJcblx0XHRtb2RlOiBCbGFua0xpbmVBZnRlck1hdGNoTW9kZSxcclxuXHQpOiBudW1iZXIge1xyXG5cdFx0aWYgKG1hdGNoSW5kZXggPCAwKSByZXR1cm4gbWF0Y2hJbmRleDtcclxuXHJcblx0XHRjb25zdCBtYXRjaExpbmUgPSBsaW5lc1ttYXRjaEluZGV4XSA/PyBcIlwiO1xyXG5cdFx0Y29uc3Qgc2hvdWxkU2tpcCA9IHRoaXMuc2hvdWxkU2tpcEJsYW5rTGluZXNBZnRlck1hdGNoKG1vZGUsIG1hdGNoTGluZSk7XHJcblx0XHRpZiAoIXNob3VsZFNraXApIHJldHVybiBtYXRjaEluZGV4O1xyXG5cclxuXHRcdGNvbnN0IHNjYW5MaW1pdCA9IGJvZHkuZW5kc1dpdGgoXCJcXG5cIilcclxuXHRcdFx0PyBNYXRoLm1heChsaW5lcy5sZW5ndGggLSAxLCAwKVxyXG5cdFx0XHQ6IGxpbmVzLmxlbmd0aDtcclxuXHRcdGxldCBwb3NpdGlvbiA9IG1hdGNoSW5kZXg7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IG1hdGNoSW5kZXggKyAxOyBpIDwgc2NhbkxpbWl0OyBpKyspIHtcclxuXHRcdFx0aWYgKGxpbmVzW2ldPy50cmltKCkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0cG9zaXRpb24gPSBpO1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBwb3NpdGlvbjtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvdWxkU2tpcEJsYW5rTGluZXNBZnRlck1hdGNoKFxyXG5cdFx0bW9kZTogQmxhbmtMaW5lQWZ0ZXJNYXRjaE1vZGUsXHJcblx0XHRsaW5lOiBzdHJpbmcsXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHRpZiAobW9kZSA9PT0gXCJza2lwXCIpIHJldHVybiB0cnVlO1xyXG5cdFx0aWYgKG1vZGUgPT09IFwibm9uZVwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRyZXR1cm4gdGhpcy5pc0F0eEhlYWRpbmcobGluZSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzQXR4SGVhZGluZyhsaW5lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAvXlxcc3swLDN9I3sxLDZ9XFxzK1xcUy8udGVzdChsaW5lKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZmluZEVuZE9mU2VjdGlvbihsaW5lczogc3RyaW5nW10sIHN0YXJ0SW5kZXg6IG51bWJlcik6IG51bWJlciB7XHJcblx0XHRsZXQgcG9zaXRpb24gPSBzdGFydEluZGV4O1xyXG5cdFx0bGV0IGhlYWRpbmdMZXZlbCA9IHRoaXMuZ2V0SGVhZGluZ0xldmVsKGxpbmVzW3N0YXJ0SW5kZXhdIHx8ICcnKTtcclxuXHJcblx0XHRpZiAoaGVhZGluZ0xldmVsID09PSAtMSkgcmV0dXJuIHN0YXJ0SW5kZXg7XHJcblxyXG5cdFx0Ly8g6aaW5YWI5om+5Yiw56ug6IqC55qE5pyr5bC+77yI6YGH5Yiw55u45ZCM5oiW5pu06auY5LyY5YWI57qn55qE5qCH6aKY5pe25YGc5q2i77yJXHJcblx0XHRsZXQgZW5kSW5kZXggPSBzdGFydEluZGV4O1xyXG5cdFx0Zm9yIChsZXQgaSA9IHN0YXJ0SW5kZXggKyAxOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudExldmVsID0gdGhpcy5nZXRIZWFkaW5nTGV2ZWwobGluZXNbaV0gfHwgJycpO1xyXG5cdFx0XHRpZiAoY3VycmVudExldmVsICE9PSAtMSAmJiBjdXJyZW50TGV2ZWwgPD0gaGVhZGluZ0xldmVsKSB7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdFx0ZW5kSW5kZXggPSBpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIOeEtuWQjuS7juacq+WwvuWQkeWJjeafpeaJvu+8jOaJvuWIsOesrOS4gOS4qumdnuepuuihjFxyXG5cdFx0cG9zaXRpb24gPSBlbmRJbmRleDtcclxuXHRcdGZvciAobGV0IGkgPSBlbmRJbmRleDsgaSA+IHN0YXJ0SW5kZXg7IGktLSkge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblx0XHRcdGlmIChsaW5lICYmIGxpbmUudHJpbSgpLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRwb3NpdGlvbiA9IGk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcG9zaXRpb247XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEhlYWRpbmdMZXZlbChsaW5lOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0Y29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFxzezAsM30oI3sxLDZ9KVxccysvKTtcclxuXHRcdGlmICghbWF0Y2gpIHJldHVybiAtMTtcclxuXHRcdHJldHVybiBtYXRjaFsxXT8ubGVuZ3RoIHx8IC0xO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBpbnNlcnRBZnRlcklubGluZUhhbmRsZXIoXHJcblx0XHRmb3JtYXR0ZWQ6IHN0cmluZyxcclxuXHRcdHRhcmdldFN0cmluZzogc3RyaW5nLFxyXG5cdCk6IFByb21pc2U8c3RyaW5nPiB7XHJcblx0XHRjb25zdCBtYXRjaEluZGV4ID0gdGhpcy5maWxlQ29udGVudC5pbmRleE9mKHRhcmdldFN0cmluZyk7XHJcblx0XHRpZiAobWF0Y2hJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0aWYgKHRoaXMuY2hvaWNlPy5pbnNlcnRBZnRlcj8uY3JlYXRlSWZOb3RGb3VuZCkge1xyXG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZUlubGluZUluc2VydEFmdGVySWZOb3RGb3VuZChmb3JtYXR0ZWQsIHRhcmdldFN0cmluZyk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRoaXMuZmlsZUNvbnRlbnQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbWF0Y2hFbmQgPSBtYXRjaEluZGV4ICsgdGFyZ2V0U3RyaW5nLmxlbmd0aDtcclxuXHRcdGlmICh0aGlzLmNob2ljZT8uaW5zZXJ0QWZ0ZXI/LnJlcGxhY2VFeGlzdGluZykge1xyXG5cdFx0XHRjb25zdCBlbmRPZkxpbmUgPSB0aGlzLmdldElubGluZUVuZE9mTGluZShtYXRjaEVuZCk7XHJcblx0XHRcdHJldHVybiB0aGlzLmZpbGVDb250ZW50LnNsaWNlKDAsIG1hdGNoRW5kKSArIGZvcm1hdHRlZCArIHRoaXMuZmlsZUNvbnRlbnQuc2xpY2UoZW5kT2ZMaW5lKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5maWxlQ29udGVudC5zbGljZSgwLCBtYXRjaEVuZCkgKyBmb3JtYXR0ZWQgKyB0aGlzLmZpbGVDb250ZW50LnNsaWNlKG1hdGNoRW5kKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0SW5saW5lRW5kT2ZMaW5lKHN0YXJ0SW5kZXg6IG51bWJlcik6IG51bWJlciB7XHJcblx0XHRjb25zdCBuZXdsaW5lSW5kZXggPSB0aGlzLmZpbGVDb250ZW50LmluZGV4T2YoXCJcXG5cIiwgc3RhcnRJbmRleCk7XHJcblx0XHRpZiAobmV3bGluZUluZGV4ID09PSAtMSkgcmV0dXJuIHRoaXMuZmlsZUNvbnRlbnQubGVuZ3RoO1xyXG5cdFx0aWYgKG5ld2xpbmVJbmRleCA+IDAgJiYgdGhpcy5maWxlQ29udGVudFtuZXdsaW5lSW5kZXggLSAxXSA9PT0gXCJcXHJcIikge1xyXG5cdFx0XHRyZXR1cm4gbmV3bGluZUluZGV4IC0gMTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBuZXdsaW5lSW5kZXg7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGNyZWF0ZUluc2VydEFmdGVySWZOb3RGb3VuZChmb3JtYXR0ZWQ6IHN0cmluZykge1xyXG5cdFx0aWYgKCF0aGlzLmNob2ljZSB8fCAhdGhpcy5jaG9pY2UuaW5zZXJ0QWZ0ZXIpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZmlsZUNvbnRlbnQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaW5zZXJ0QWZ0ZXJMaW5lID0gdGhpcy5jaG9pY2UuaW5zZXJ0QWZ0ZXIuYWZ0ZXI7XHJcblx0XHRjb25zdCBpbnNlcnRBZnRlckxpbmVBbmRGb3JtYXR0ZWQgPSBgJHtpbnNlcnRBZnRlckxpbmV9XFxuJHtmb3JtYXR0ZWR9YDtcclxuXHJcblx0XHRpZiAodGhpcy5jaG9pY2UuaW5zZXJ0QWZ0ZXI/LmNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbiA9PT0gXCJ0b3BcIikge1xyXG5cdFx0XHRjb25zdCBmcm9udG1hdHRlckVuZFBvc2l0aW9uID0gdGhpcy5nZXRGcm9udG1hdHRlckVuZFBvc2l0aW9uKHRoaXMuZmlsZSEsIHRoaXMuZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pbnNlcnRUZXh0QWZ0ZXJQb3NpdGlvbkluQm9keShcclxuXHRcdFx0XHRpbnNlcnRBZnRlckxpbmVBbmRGb3JtYXR0ZWQsXHJcblx0XHRcdFx0dGhpcy5maWxlQ29udGVudCxcclxuXHRcdFx0XHRmcm9udG1hdHRlckVuZFBvc2l0aW9uIHx8IC0xLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmNob2ljZS5pbnNlcnRBZnRlcj8uY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uID09PSBcImJvdHRvbVwiKSB7XHJcblx0XHRcdHJldHVybiBgJHt0aGlzLmZpbGVDb250ZW50fVxcbiR7aW5zZXJ0QWZ0ZXJMaW5lQW5kRm9ybWF0dGVkfWA7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuZmlsZUNvbnRlbnQ7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGNyZWF0ZUlubGluZUluc2VydEFmdGVySWZOb3RGb3VuZChcclxuXHRcdGZvcm1hdHRlZDogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0U3RyaW5nOiBzdHJpbmcsXHJcblx0KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRcdGNvbnN0IGluc2VydEFmdGVyTGluZUFuZEZvcm1hdHRlZCA9IGAke3RhcmdldFN0cmluZ30ke2Zvcm1hdHRlZH1gO1xyXG5cclxuXHRcdGlmICh0aGlzLmNob2ljZT8uaW5zZXJ0QWZ0ZXI/LmNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbiA9PT0gXCJ0b3BcIikge1xyXG5cdFx0XHRjb25zdCBmcm9udG1hdHRlckVuZFBvc2l0aW9uID0gdGhpcy5nZXRGcm9udG1hdHRlckVuZFBvc2l0aW9uKHRoaXMuZmlsZSEsIHRoaXMuZmlsZUNvbnRlbnQpO1xyXG5cdFx0XHRyZXR1cm4gdGhpcy5pbnNlcnRUZXh0QWZ0ZXJQb3NpdGlvbkluQm9keShcclxuXHRcdFx0XHRpbnNlcnRBZnRlckxpbmVBbmRGb3JtYXR0ZWQsXHJcblx0XHRcdFx0dGhpcy5maWxlQ29udGVudCxcclxuXHRcdFx0XHRmcm9udG1hdHRlckVuZFBvc2l0aW9uIHx8IC0xLFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmNob2ljZT8uaW5zZXJ0QWZ0ZXI/LmNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbiA9PT0gXCJib3R0b21cIikge1xyXG5cdFx0XHRyZXR1cm4gYCR7dGhpcy5maWxlQ29udGVudH1cXG4ke2luc2VydEFmdGVyTGluZUFuZEZvcm1hdHRlZH1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLmZpbGVDb250ZW50O1xyXG5cdH1cclxufVxyXG4iXX0=