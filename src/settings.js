import { __awaiter } from "tslib";
import { PluginSettingTab, Setting, Notice } from "obsidian";
import { formatDate } from "./utils/dateUtils";
import { FileSelectModal } from "./modals/FileSelectModal";
import { FolderSelectModal } from "./modals/FolderSelectModal";
import { CaptureToConfigModal } from "./views/calendar/modals/CaptureToConfigModal";
import { CommandSelectModal } from "./modals/CommandSelectModal";
export const DEFAULT_SETTINGS = {
    fleetingNote: {
        savePath: "闪念",
        templatePath: "模板/闪念模板",
        fileNameFormat: "闪念 YYYY-MM"
    },
    dailyNote: {
        savePath: "日记",
        templatePath: "模板/日记模板",
        fileNameFormat: "YYYY-MM-DD"
    },
    weeklyNote: {
        savePath: "周报",
        templatePath: "模板/周报模板",
        fileNameFormat: "GGGG-WW"
    },
    monthlyNote: {
        savePath: "月报",
        templatePath: "模板/月报模板",
        fileNameFormat: "YYYY-MM"
    },
    quarterlyNote: {
        savePath: "季报",
        templatePath: "模板/季报模板",
        fileNameFormat: "YYYY-Q[Q]"
    },
    yearlyNote: {
        savePath: "年报",
        templatePath: "模板/年报模板",
        fileNameFormat: "YYYY"
    },
    taskFilter: {
        customFilter: ""
    },
    taskSettings: {
        captureToSettings: {
            enabled: true,
            fleetingNoteConfigId: "fleetingNote",
            recordConfigId: "record",
            taskConfigId: "task",
            configs: [
                {
                    id: "fleetingNote",
                    name: "默认闪念",
                    description: "默认的闪念捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{闪念}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{闪念模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: false,
                        after: "",
                        insertAtEnd: false,
                        considerSubsections: false,
                        createIfNotFound: false,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "record",
                    name: "默认记录",
                    description: "默认的记录捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: false,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "task",
                    name: "默认任务",
                    description: "默认的捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: true,
                    autoAddCreatedDate: false,
                    autoAddDueDate: true,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: false,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "daily",
                    name: "默认daily",
                    description: "专门用于每日笔记的配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "weekly",
                    name: "默认weekly",
                    description: "专门用于周报的配置",
                    enabled: true,
                    defaultCapturePath: "{{周报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{周报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本周工作: \n- 下周计划: \n- 遇到问题: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 工作记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "monthly",
                    name: "默认monthly",
                    description: "专门用于月报的配置",
                    enabled: true,
                    defaultCapturePath: "{{默认monthly}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{月报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本月工作: \n- 下月计划: \n- 总结反思: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 月度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "quarterly",
                    name: "默认quarterly",
                    description: "专门用于季报的配置",
                    enabled: true,
                    defaultCapturePath: "{{季报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{季报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本季工作: \n- 下季计划: \n- 季度反思: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 季度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "yearly",
                    name: "默认yearly",
                    description: "专门用于年报的配置",
                    enabled: true,
                    defaultCapturePath: "{{年报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{年报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本年工作: \n- 明年计划: \n- 年度反思: \n- 目标达成: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 年度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "meeting",
                    name: "会议笔记",
                    description: "专门用于会议笔记的配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 时间: {{DATE}}\n- 地点: \n- 参与人员: \n- 内容: \n- 行动项: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                }
            ]
        }
    },
    moreLabelSettings: {
        lb1: {
            enabled: false,
            labelText: "LB1",
            actionType: "systemCommand",
            systemCommand: "",
            filePath: ""
        },
        lb2: {
            enabled: false,
            labelText: "LB2",
            actionType: "systemCommand",
            systemCommand: "",
            filePath: ""
        }
    }
};
export class SampleSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.settingsChanged = false;
        // 添加一个变量来存储 MutationObserver 实例
        this.observer = null;
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        const header = containerEl.createEl("div", { cls: "setting-section" });
        header.style.textAlign = "center";
        header.style.marginBottom = "20px";
        header.createEl("h2", { text: "99日历设置" });
        // 渲染任务显示筛选设置
        this.renderTaskFilterSettings();
        // 渲染 Capture To 设置
        this.renderCaptureToSettings();
        this.renderNoteSettings("闪念设置", this.plugin.settings.fleetingNote, (newSettings) => {
            this.plugin.settings.fleetingNote = newSettings;
            this.settingsChanged = true;
        });
        this.renderNoteSettings("日记设置", this.plugin.settings.dailyNote, (newSettings) => {
            this.plugin.settings.dailyNote = newSettings;
            this.settingsChanged = true;
        });
        this.renderNoteSettings("周报设置", this.plugin.settings.weeklyNote, (newSettings) => {
            this.plugin.settings.weeklyNote = newSettings;
            this.settingsChanged = true;
        });
        this.renderNoteSettings("月报设置", this.plugin.settings.monthlyNote, (newSettings) => {
            this.plugin.settings.monthlyNote = newSettings;
            this.settingsChanged = true;
        });
        this.renderNoteSettings("季报设置", this.plugin.settings.quarterlyNote, (newSettings) => {
            this.plugin.settings.quarterlyNote = newSettings;
            this.settingsChanged = true;
        });
        this.renderNoteSettings("年报设置", this.plugin.settings.yearlyNote, (newSettings) => {
            this.plugin.settings.yearlyNote = newSettings;
            this.settingsChanged = true;
        });
        // 渲染更多标签设置
        this.renderMoreLabelSettings();
        // 监听设置页面关闭事件
        this.registerEvents();
    }
    renderMoreLabelSettings() {
        const section = this.containerEl.createEl("div", { cls: "setting-section" });
        section.createEl("h4", { text: "自定义标签设置" });
        const moreSettings = this.plugin.settings.moreLabelSettings;
        this.renderCustomLabelSettings(section, "LB1", moreSettings.lb1);
        this.renderCustomLabelSettings(section, "LB2", moreSettings.lb2);
    }
    renderCustomLabelSettings(section, labelName, labelSettings) {
        const labelSection = section.createEl("div", { cls: "setting-section" });
        labelSection.createEl("h5", { text: `${labelName}设置` });
        new Setting(labelSection)
            .setName(`启用${labelName}`)
            .setDesc(`启用或禁用日历右上角的${labelName}标签`)
            .addToggle(toggle => toggle
            .setValue(labelSettings.enabled)
            .onChange(value => {
            labelSettings.enabled = value;
            this.settingsChanged = true;
        }));
        new Setting(labelSection)
            .setName(`${labelName}名称`)
            .setDesc(`自定义${labelName}显示的文本`)
            .addText(text => text
            .setPlaceholder(`例如：${labelName}`)
            .setValue(labelSettings.labelText)
            .onChange(value => {
            labelSettings.labelText = value;
            this.settingsChanged = true;
        }));
        new Setting(labelSection)
            .setName("操作类型")
            .setDesc(`选择点击${labelName}后执行的操作类型`)
            .addDropdown(dropdown => dropdown
            .addOption("systemCommand", "系统命令")
            .addOption("openFile", "打开文件")
            .setValue(labelSettings.actionType)
            .onChange(value => {
            labelSettings.actionType = value;
            this.settingsChanged = true;
            this.display();
        }));
        if (labelSettings.actionType === "systemCommand") {
            let commandInputTextComponent = null;
            const commandInput = new Setting(labelSection)
                .setName("系统命令")
                .setDesc("输入要执行的Obsidian系统命令ID")
                .addText(text => {
                commandInputTextComponent = text;
                text.setPlaceholder("例如：app:open-vault");
                text.setValue(labelSettings.systemCommand)
                    .onChange(value => {
                    labelSettings.systemCommand = value;
                    this.settingsChanged = true;
                });
            });
            const selectButton = commandInput.controlEl.createEl('button', {
                cls: 'command-select-button',
                text: '选择命令'
            });
            selectButton.addEventListener('click', () => {
                new CommandSelectModal({
                    app: this.app,
                    onCommandSelected: (commandId) => {
                        if (commandInputTextComponent) {
                            commandInputTextComponent.setValue(commandId);
                        }
                        labelSettings.systemCommand = commandId;
                        this.settingsChanged = true;
                    }
                }).open();
            });
        }
        else if (labelSettings.actionType === "openFile") {
            let filePathTextComponent = null;
            const filePathInput = new Setting(labelSection)
                .setName("文件路径")
                .setDesc("输入要打开的文件路径")
                .addText(text => {
                filePathTextComponent = text;
                text.setPlaceholder("例如：日记/2024-01-01.md");
                text.setValue(labelSettings.filePath)
                    .onChange(value => {
                    labelSettings.filePath = value;
                    this.settingsChanged = true;
                });
            });
            const selectFileButton = filePathInput.controlEl.createEl('button', {
                cls: 'command-select-button',
                text: '选择文件'
            });
            selectFileButton.addEventListener('click', () => {
                new FileSelectModal(this.app, (file) => {
                    const filePath = file.path;
                    if (filePathTextComponent) {
                        filePathTextComponent.setValue(filePath);
                    }
                    labelSettings.filePath = filePath;
                    this.settingsChanged = true;
                }).open();
            });
        }
    }
    registerEvents() {
        // 如果已经有 Observer，先断开连接
        if (this.observer) {
            this.observer.disconnect();
        }
        // 创建新的 Observer
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && this.containerEl.parentElement === null) {
                    // 设置页面已关闭，检查是否需要保存设置
                    if (this.settingsChanged) {
                        this.saveSettings().then(() => {
                            this.settingsChanged = false;
                        });
                    }
                    // 断开连接
                    if (this.observer) {
                        this.observer.disconnect();
                        this.observer = null;
                    }
                }
            });
        });
        this.observer.observe(this.containerEl.parentElement || document.body, {
            childList: true,
            subtree: true
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.saveSettings();
            // 保存设置后刷新视图
            this.plugin.updateAllViews();
            new Notice("设置已保存并刷新视图");
        });
    }
    renderTaskFilterSettings() {
        const section = this.containerEl.createEl("div", { cls: "setting-section" });
        section.createEl("h4", { text: "任务列表设置" });
        // 自定义筛选设置
        new Setting(section)
            .setName("自定义筛选")
            .setDesc("规则：使用路径或标签，!表示排除，and、or、()逻辑组合。例如：(A or B) and #C - 路径A或B中包含标签#C的任务")
            .addTextArea(textArea => {
            textArea
                .setPlaceholder("输入筛选规则")
                .setValue(this.plugin.settings.taskFilter.customFilter)
                .onChange((value) => {
                this.plugin.settings.taskFilter.customFilter = value;
                this.settingsChanged = true;
            });
            // 设置文本域属性
            textArea.inputEl.rows = 4;
            textArea.inputEl.wrap = "soft";
            textArea.inputEl.style.resize = "vertical";
            textArea.inputEl.style.maxHeight = "100px";
        });
    }
    renderTaskSettings() {
        // 任务创建设置已移至 Capture To 设置中
    }
    renderCaptureToSettings() {
        console.log("renderCaptureToSettings called");
        const section = this.containerEl.createEl("div", { cls: "setting-section" });
        section.createEl("h4", { text: "捕获插入设置" });
        const captureSettings = this.plugin.settings.taskSettings.captureToSettings;
        console.log("captureSettings:", captureSettings);
        // 启用/禁用设置
        new Setting(section)
            .setName("启用捕获插入功能")
            .setDesc("使用捕获插入功能进行任务和笔记的创建与插入")
            .addToggle(toggle => toggle
            .setValue(captureSettings.enabled)
            .onChange((value) => {
            this.plugin.settings.taskSettings.captureToSettings.enabled = value;
            this.settingsChanged = true;
        }));
        // 闪念标签配置
        new Setting(section)
            .setName("闪念标签配置")
            .setDesc("选择任务显示区域头部闪念标签对应的配置")
            .addDropdown(dropdown => {
            captureSettings.configs.forEach(config => {
                dropdown.addOption(config.id, config.name);
            });
            dropdown.setValue(captureSettings.fleetingNoteConfigId)
                .onChange((value) => {
                this.plugin.settings.taskSettings.captureToSettings.fleetingNoteConfigId = value;
                this.settingsChanged = true;
            });
        });
        // 记录标签配置
        new Setting(section)
            .setName("记录标签配置")
            .setDesc("选择任务显示区域头部记录标签对应的配置")
            .addDropdown(dropdown => {
            captureSettings.configs.forEach(config => {
                dropdown.addOption(config.id, config.name);
            });
            dropdown.setValue(captureSettings.recordConfigId)
                .onChange((value) => {
                this.plugin.settings.taskSettings.captureToSettings.recordConfigId = value;
                this.settingsChanged = true;
            });
        });
        // 任务标签配置
        new Setting(section)
            .setName("任务标签配置")
            .setDesc("选择任务显示区域头部任务标签对应的配置")
            .addDropdown(dropdown => {
            captureSettings.configs.forEach(config => {
                dropdown.addOption(config.id, config.name);
            });
            dropdown.setValue(captureSettings.taskConfigId)
                .onChange((value) => {
                this.plugin.settings.taskSettings.captureToSettings.taskConfigId = value;
                this.settingsChanged = true;
            });
        });
        // 配置列表
        const configsHeader = section.createEl("div", { cls: "setting-header" });
        configsHeader.createEl("h4", { text: "配置列表" });
        // 拖拽排序相关变量
        let draggedElement = null;
        let dragStartIndex = -1;
        // 显示现有配置
        captureSettings.configs.forEach((config, index) => {
            const configRow = section.createEl("div", {
                cls: "capture-config-row"
            });
            configRow.setAttribute("draggable", "true");
            configRow.style.display = "flex";
            configRow.style.justifyContent = "space-between";
            configRow.style.alignItems = "center";
            configRow.style.padding = "8px 12px";
            configRow.style.border = "1px solid var(--background-modifier-border)";
            configRow.style.borderRadius = "4px";
            configRow.style.marginBottom = "4px";
            configRow.style.cursor = "grab";
            // 存储配置索引
            configRow.dataset.index = index.toString();
            // 拖拽开始事件
            configRow.addEventListener("dragstart", (e) => {
                draggedElement = configRow;
                dragStartIndex = parseInt(configRow.dataset.index || "-1");
                configRow.style.opacity = "0.5";
                configRow.style.cursor = "grabbing";
            });
            // 拖拽结束事件
            configRow.addEventListener("dragend", (e) => {
                draggedElement = null;
                configRow.style.opacity = "1";
                configRow.style.cursor = "grab";
                // 移除所有拖拽提示样式
                document.querySelectorAll(".capture-config-row").forEach(el => {
                    const htmlEl = el;
                    htmlEl.style.borderColor = "var(--background-modifier-border)";
                    htmlEl.style.transform = "";
                });
            });
            // 拖拽经过事件
            configRow.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (draggedElement === configRow)
                    return;
                // 计算拖拽位置
                const rect = configRow.getBoundingClientRect();
                const y = e.clientY - rect.top;
                // 显示拖拽提示
                if (y < rect.height / 2) {
                    // 拖拽到上方
                    configRow.style.transform = "translateY(8px)";
                }
                else {
                    // 拖拽到下方
                    configRow.style.transform = "translateY(-8px)";
                }
                configRow.style.borderColor = "var(--interactive-accent)";
            });
            // 拖拽离开事件
            configRow.addEventListener("dragleave", (e) => {
                configRow.style.borderColor = "var(--background-modifier-border)";
                configRow.style.transform = "";
            });
            // 拖拽放置事件
            configRow.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedElement && dragStartIndex !== -1) {
                    const dragEndIndex = parseInt(configRow.dataset.index || "-1");
                    if (dragStartIndex !== dragEndIndex) {
                        // 重新排序配置
                        if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                            const configs = this.plugin.settings.taskSettings.captureToSettings.configs;
                            const [draggedConfig] = configs.splice(dragStartIndex, 1);
                            if (draggedConfig) {
                                configs.splice(dragEndIndex, 0, draggedConfig);
                                this.settingsChanged = true;
                                // 重新渲染设置页面
                                this.display();
                            }
                        }
                    }
                }
                configRow.style.borderColor = "var(--background-modifier-border)";
                configRow.style.transform = "";
            });
            // 配置名称
            const configName = configRow.createEl("div", {
                cls: "config-name"
            });
            configName.style.flex = "1";
            configName.style.fontSize = "14px";
            configName.style.color = config.enabled ? "var(--text-normal)" : "var(--text-muted)";
            configName.textContent = config.name;
            // 操作按钮容器
            const buttonContainer = configRow.createEl("div", {
                cls: "config-buttons"
            });
            buttonContainer.style.display = "flex";
            buttonContainer.style.alignItems = "center";
            buttonContainer.style.gap = "8px";
            // 启用/禁用按钮（emoji 图形）
            const toggleButton = buttonContainer.createEl("button", {
                cls: "config-button"
            });
            toggleButton.style.width = "20px";
            toggleButton.style.height = "20px";
            toggleButton.style.display = "flex";
            toggleButton.style.alignItems = "center";
            toggleButton.style.justifyContent = "center";
            toggleButton.style.border = "none";
            toggleButton.style.background = "transparent";
            toggleButton.style.color = config.enabled ? "var(--text-normal)" : "var(--text-muted)";
            toggleButton.style.cursor = "pointer";
            toggleButton.textContent = config.enabled ? "⚡" : "🔴";
            toggleButton.title = config.enabled ? "禁用配置" : "启用配置";
            toggleButton.addEventListener("click", () => {
                if (this.plugin.settings.taskSettings.captureToSettings.configs &&
                    this.plugin.settings.taskSettings.captureToSettings.configs[index]) {
                    this.plugin.settings.taskSettings.captureToSettings.configs[index].enabled = !config.enabled;
                    this.settingsChanged = true;
                    // 重新渲染设置页面
                    this.display();
                }
            });
            // 配置按钮（emoji 图形）
            const settingsButton = buttonContainer.createEl("button", {
                cls: "config-button"
            });
            settingsButton.style.width = "20px";
            settingsButton.style.height = "20px";
            settingsButton.style.display = "flex";
            settingsButton.style.alignItems = "center";
            settingsButton.style.justifyContent = "center";
            settingsButton.style.border = "none";
            settingsButton.style.background = "transparent";
            settingsButton.style.color = "var(--text-muted)";
            settingsButton.style.cursor = "pointer";
            settingsButton.textContent = "⚙️";
            settingsButton.title = "配置";
            settingsButton.addEventListener("click", () => {
                // 打开详细配置对话框
                new CaptureToConfigModal({
                    plugin: this.plugin,
                    config: config,
                    onSave: (updatedConfig) => {
                        // 更新配置
                        if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                            const configIndex = this.plugin.settings.taskSettings.captureToSettings.configs.findIndex(c => c.id === updatedConfig.id);
                            if (configIndex !== -1) {
                                this.plugin.settings.taskSettings.captureToSettings.configs[configIndex] = updatedConfig;
                                this.settingsChanged = true;
                                // 重新渲染设置页面
                                this.display();
                            }
                        }
                    }
                }).open();
            });
            // 复制按钮（emoji 图形）
            const duplicateButton = buttonContainer.createEl("button", {
                cls: "config-button"
            });
            duplicateButton.style.width = "20px";
            duplicateButton.style.height = "20px";
            duplicateButton.style.display = "flex";
            duplicateButton.style.alignItems = "center";
            duplicateButton.style.justifyContent = "center";
            duplicateButton.style.border = "none";
            duplicateButton.style.background = "transparent";
            duplicateButton.style.color = "var(--text-muted)";
            duplicateButton.style.cursor = "pointer";
            duplicateButton.textContent = "📋";
            duplicateButton.title = "复制";
            duplicateButton.addEventListener("click", () => {
                if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                    // 创建配置副本
                    const duplicatedConfig = JSON.parse(JSON.stringify(config));
                    duplicatedConfig.id = `config-${Date.now()}`;
                    duplicatedConfig.name = `${config.name} (副本)`;
                    // 添加到配置列表
                    this.plugin.settings.taskSettings.captureToSettings.configs.push(duplicatedConfig);
                    this.settingsChanged = true;
                    // 重新渲染设置页面
                    this.display();
                }
            });
            // 重命名按钮（emoji 图形）
            const renameButton = buttonContainer.createEl("button", {
                cls: "config-button"
            });
            renameButton.style.width = "20px";
            renameButton.style.height = "20px";
            renameButton.style.display = "flex";
            renameButton.style.alignItems = "center";
            renameButton.style.justifyContent = "center";
            renameButton.style.border = "none";
            renameButton.style.background = "transparent";
            renameButton.style.color = "var(--text-muted)";
            renameButton.style.cursor = "pointer";
            renameButton.textContent = "✏️";
            renameButton.title = "重命名";
            renameButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 重命名模态框
                const newName = yield new Promise((resolve) => {
                    const modal = new (require('obsidian').Modal)(this.app);
                    modal.titleEl.setText("重命名配置");
                    modal.contentEl.createEl("p", {
                        text: `请输入新的配置名称：`
                    });
                    const input = modal.contentEl.createEl("input", {
                        type: "text",
                        value: config.name
                    });
                    input.style.width = "100%";
                    input.style.padding = "8px";
                    input.style.marginTop = "10px";
                    input.style.border = "1px solid var(--background-modifier-border)";
                    input.style.borderRadius = "4px";
                    const buttonContainer = modal.contentEl.createEl("div");
                    buttonContainer.style.display = "flex";
                    buttonContainer.style.justifyContent = "flex-end";
                    buttonContainer.style.gap = "10px";
                    buttonContainer.style.marginTop = "20px";
                    const cancelButton = buttonContainer.createEl("button", {
                        text: "取消",
                        cls: "mod-button"
                    });
                    cancelButton.addEventListener("click", () => {
                        resolve(null);
                        modal.close();
                    });
                    const confirmButton = buttonContainer.createEl("button", {
                        text: "确认",
                        cls: "mod-cta"
                    });
                    confirmButton.addEventListener("click", () => {
                        const value = input.value.trim();
                        if (value) {
                            resolve(value);
                        }
                        modal.close();
                    });
                    // 回车键确认
                    input.addEventListener("keypress", (e) => {
                        if (e.key === "Enter") {
                            const value = input.value.trim();
                            if (value) {
                                resolve(value);
                                modal.close();
                            }
                        }
                    });
                    modal.open();
                    // 自动聚焦输入框
                    setTimeout(() => input.focus(), 100);
                });
                if (newName) {
                    // 更新配置名称
                    if (this.plugin.settings.taskSettings.captureToSettings.configs &&
                        this.plugin.settings.taskSettings.captureToSettings.configs[index]) {
                        this.plugin.settings.taskSettings.captureToSettings.configs[index].name = newName;
                        this.settingsChanged = true;
                        // 重新渲染设置页面
                        this.display();
                    }
                }
            }));
            // 删除按钮（emoji 图形）
            const deleteButton = buttonContainer.createEl("button", {
                cls: "config-button"
            });
            deleteButton.style.width = "20px";
            deleteButton.style.height = "20px";
            deleteButton.style.display = "flex";
            deleteButton.style.alignItems = "center";
            deleteButton.style.justifyContent = "center";
            deleteButton.style.border = "none";
            deleteButton.style.background = "transparent";
            deleteButton.style.color = "var(--text-muted)";
            deleteButton.style.cursor = "pointer";
            deleteButton.textContent = "🗑️";
            deleteButton.title = "删除";
            deleteButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 确认删除
                const confirmed = yield new Promise((resolve) => {
                    const modal = new (require('obsidian').Modal)(this.app);
                    modal.titleEl.setText("确认删除");
                    modal.contentEl.createEl("p", {
                        text: `确定要删除配置 "${config.name}" 吗？`
                    });
                    const buttonContainer = modal.contentEl.createEl("div");
                    buttonContainer.style.display = "flex";
                    buttonContainer.style.justifyContent = "flex-end";
                    buttonContainer.style.gap = "10px";
                    buttonContainer.style.marginTop = "20px";
                    const cancelButton = buttonContainer.createEl("button", {
                        text: "取消",
                        cls: "mod-button"
                    });
                    cancelButton.addEventListener("click", () => {
                        resolve(false);
                        modal.close();
                    });
                    const confirmButton = buttonContainer.createEl("button", {
                        text: "删除",
                        cls: "mod-danger"
                    });
                    confirmButton.addEventListener("click", () => {
                        resolve(true);
                        modal.close();
                    });
                    modal.open();
                });
                if (confirmed) {
                    // 从配置列表中删除
                    if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                        this.plugin.settings.taskSettings.captureToSettings.configs.splice(index, 1);
                        this.settingsChanged = true;
                        // 重新渲染设置页面
                        this.display();
                    }
                }
            }));
        });
        // 添加新配置的输入框和按钮，模仿 QuickAdd 的样式
        const addConfigContainer = section.createEl("div", {
            cls: "add-config-container"
        });
        addConfigContainer.style.display = "flex";
        addConfigContainer.style.alignItems = "center";
        addConfigContainer.style.gap = "8px";
        addConfigContainer.style.marginTop = "12px";
        addConfigContainer.style.padding = "8px";
        addConfigContainer.style.border = "1px dashed var(--background-modifier-border)";
        addConfigContainer.style.borderRadius = "4px";
        // 名称输入框
        const nameInput = addConfigContainer.createEl("input", {
            type: "text",
            placeholder: "名称",
            cls: "add-config-input"
        });
        nameInput.style.flex = "1";
        nameInput.style.padding = "6px 8px";
        nameInput.style.border = "1px solid var(--background-modifier-border)";
        nameInput.style.borderRadius = "4px";
        nameInput.style.fontSize = "14px";
        // 添加按钮
        const addButton = addConfigContainer.createEl("button", {
            text: "新建配置",
            cls: "mod-cta add-config-button"
        });
        addButton.style.padding = "6px 16px";
        addButton.style.fontSize = "14px";
        addButton.addEventListener("click", () => {
            const name = nameInput.value.trim();
            if (!name) {
                new Notice("配置名称不能为空");
                return;
            }
            // 创建新配置
            const newConfig = {
                id: `config-${Date.now()}`,
                name,
                description: "",
                enabled: true,
                defaultCapturePath: "",
                captureToActiveFile: false,
                hotkey: null,
                inputMethod: "single-line",
                createFileIfItDoesntExist: {
                    enabled: true,
                    createWithTemplate: false,
                    template: ""
                },
                format: {
                    enabled: true,
                    format: "{{TASK_TEXT}}\n"
                },
                prepend: false,
                appendLink: false,
                task: true,
                insertAfter: {
                    enabled: false,
                    after: "",
                    insertAtEnd: false,
                    considerSubsections: false,
                    createIfNotFound: false,
                    createIfNotFoundLocation: "bottom"
                },
                newLineCapture: {
                    enabled: false,
                    direction: "below"
                },
                openFile: false,
                fileOpening: {
                    location: "tab",
                    direction: "vertical",
                    mode: "default",
                    focus: true
                },
                autoAddCreatedDate: false,
                autoAddDueDate: false,
                dueDateOption: "today",
                customDueDays: 0
            };
            // 添加到配置列表
            if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                this.plugin.settings.taskSettings.captureToSettings.configs.push(newConfig);
                this.settingsChanged = true;
                // 清空输入框
                nameInput.value = "";
                // 重新渲染设置页面
                this.display();
            }
        });
        // 回车键添加
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                addButton.click();
            }
        });
        // 默认配置按钮
        const defaultConfigButton = addConfigContainer.createEl("button", {
            text: "默认配置",
            cls: "mod-button"
        });
        defaultConfigButton.style.padding = "6px 16px";
        defaultConfigButton.style.fontSize = "14px";
        defaultConfigButton.addEventListener("click", () => {
            // 恢复默认配置
            const defaultConfigs = [
                {
                    id: "fleetingNote",
                    name: "默认闪念",
                    description: "默认的闪念捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{闪念}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{闪念模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: false,
                        after: "",
                        insertAtEnd: false,
                        considerSubsections: false,
                        createIfNotFound: false,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "record",
                    name: "默认记录",
                    description: "默认的记录捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 1,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: false,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    }
                },
                {
                    id: "task",
                    name: "默认任务",
                    description: "默认的捕获插入配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: true,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: false,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: true,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "daily",
                    name: "默认daily",
                    description: "专门用于每日笔记的配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "{{TASK_TEXT}}\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "weekly",
                    name: "默认weekly",
                    description: "专门用于周报的配置",
                    enabled: true,
                    defaultCapturePath: "{{周报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{周报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本周工作: \n- 下周计划: \n- 遇到问题: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 工作记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "monthly",
                    name: "默认monthly",
                    description: "专门用于月报的配置",
                    enabled: true,
                    defaultCapturePath: "{{默认monthly}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{月报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本月工作: \n- 下月计划: \n- 总结反思: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 月度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "quarterly",
                    name: "默认quarterly",
                    description: "专门用于季报的配置",
                    enabled: true,
                    defaultCapturePath: "{{季报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{季报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本季工作: \n- 下季计划: \n- 季度反思: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 季度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "yearly",
                    name: "默认yearly",
                    description: "专门用于年报的配置",
                    enabled: true,
                    defaultCapturePath: "{{年报}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "none",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{年报模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 本年工作: \n- 明年计划: \n- 年度反思: \n- 目标达成: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 年度总结",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                },
                {
                    id: "meeting",
                    name: "会议笔记",
                    description: "专门用于会议笔记的配置",
                    enabled: true,
                    defaultCapturePath: "{{日记}}",
                    captureToActiveFile: false,
                    hotkey: null,
                    inputMethod: "single-line",
                    createFileIfItDoesntExist: {
                        enabled: true,
                        createWithTemplate: true,
                        template: "{{日记模板}}"
                    },
                    format: {
                        enabled: true,
                        format: "## {{TASK_TEXT}}\n\n- 时间: {{DATE}}\n- 地点: \n- 参与人员: \n- 内容: \n- 行动项: \n\n"
                    },
                    prepend: false,
                    appendLink: false,
                    task: false,
                    insertAfter: {
                        enabled: true,
                        after: "## 日常记录",
                        insertAtEnd: true,
                        considerSubsections: false,
                        createIfNotFound: true,
                        createIfNotFoundLocation: "bottom"
                    },
                    newLineCapture: {
                        enabled: false,
                        direction: "below"
                    },
                    openFile: true,
                    fileOpening: {
                        location: "tab",
                        direction: "vertical",
                        mode: "default",
                        focus: true
                    },
                    autoAddCreatedDate: false,
                    autoAddDueDate: false,
                    dueDateOption: "today",
                    customDueDays: 0
                }
            ];
            // 清空现有配置并添加默认配置
            if (this.plugin.settings.taskSettings.captureToSettings.configs) {
                this.plugin.settings.taskSettings.captureToSettings.configs = defaultConfigs;
                this.settingsChanged = true;
                // 重新渲染设置页面
                this.display();
            }
        });
    }
    renderNoteSettings(title, settings, onChange) {
        const section = this.containerEl.createEl("div", { cls: "setting-section" });
        section.createEl("h4", { text: title });
        // 计算预览日期（根据不同笔记类型使用不同的日期）
        let previewDate;
        switch (title) {
            case "周报设置":
                // 使用当前周的周一作为预览日期
                previewDate = new Date();
                const dayOfWeek = previewDate.getDay();
                previewDate.setDate(previewDate.getDate() + (dayOfWeek === 0 ? -6 : 1) - dayOfWeek);
                break;
            case "月报设置":
                // 使用当月1日作为预览日期
                previewDate = new Date();
                previewDate.setDate(1);
                break;
            case "季报设置":
                // 使用当季第一天作为预览日期
                previewDate = new Date();
                const currentMonth = previewDate.getMonth();
                const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
                previewDate.setMonth(quarterStartMonth);
                previewDate.setDate(1);
                break;
            case "年报设置":
                // 使用当年1月1日作为预览日期
                previewDate = new Date();
                previewDate.setMonth(0);
                previewDate.setDate(1);
                break;
            case "日记设置":
            default:
                // 使用当前日期作为预览日期
                previewDate = new Date();
                break;
        }
        // 预览元素引用
        let fullPathPreviewText;
        // 当前设置引用
        let currentSettings = settings;
        // 更新预览函数
        const updatePreview = () => {
            if (!fullPathPreviewText)
                return;
            try {
                // 使用formatDate函数生成文件名预览
                const fileNamePreview = formatDate(previewDate, currentSettings.fileNameFormat);
                // 生成完整路径预览
                const fullPathPreview = `${currentSettings.savePath}/${fileNamePreview}.md`;
                fullPathPreviewText.textContent = fullPathPreview;
                fullPathPreviewText.style.color = "var(--text-muted)";
            }
            catch (error) {
                fullPathPreviewText.textContent = "格式错误";
                fullPathPreviewText.style.color = "var(--text-error)";
            }
        };
        // 文件名格式设置
        new Setting(section)
            .setName("文件名格式")
            .setDesc(`（年-YYYY、周所属年-GGGG、月-MM、日-DD、周数-WW、季-Q     例如： ${settings.fileNameFormat}）`)
            .addText(text => text
            .setPlaceholder("输入格式")
            .setValue(settings.fileNameFormat)
            .onChange((value) => {
            const newSettings = Object.assign(Object.assign({}, settings), { fileNameFormat: value });
            currentSettings = newSettings;
            onChange(newSettings);
            this.settingsChanged = true;
            // 更新预览
            updatePreview();
        }));
        // 保存路径设置
        let savePathInputEl = null;
        const savePathSetting = new Setting(section)
            .setName("保存路径")
            .addText(text => {
            savePathInputEl = text.inputEl;
            text
                .setValue(settings.savePath)
                .setPlaceholder("例如：日记")
                .onChange((value) => {
                const newSettings = Object.assign(Object.assign({}, settings), { savePath: value });
                currentSettings = newSettings;
                onChange(newSettings);
                this.settingsChanged = true;
                // 更新预览
                updatePreview();
            });
        })
            .addButton(button => button
            .setButtonText("选择")
            .onClick(() => {
            new FolderSelectModal(this.app, (folder) => {
                const newSettings = Object.assign(Object.assign({}, settings), { savePath: folder.path });
                currentSettings = newSettings;
                onChange(newSettings);
                this.settingsChanged = true;
                // 更新输入框的值
                if (savePathInputEl) {
                    savePathInputEl.value = folder.path;
                }
                // 更新预览
                updatePreview();
            }).open();
        }));
        // 模板路径设置
        let templatePathInputEl = null;
        new Setting(section)
            .setName("模板路径")
            .setDesc("模板文件的路径")
            .addText(text => {
            templatePathInputEl = text.inputEl;
            text
                .setValue(settings.templatePath)
                .setPlaceholder("例如：模板/日记模板")
                .onChange((value) => {
                const newSettings = Object.assign(Object.assign({}, settings), { templatePath: value });
                currentSettings = newSettings;
                onChange(newSettings);
                this.settingsChanged = true;
            });
        })
            .addButton(button => button
            .setButtonText("选择")
            .onClick(() => {
            new FileSelectModal(this.app, (file) => {
                const newSettings = Object.assign(Object.assign({}, settings), { templatePath: file.path });
                currentSettings = newSettings;
                onChange(newSettings);
                this.settingsChanged = true;
                // 更新输入框的值
                if (templatePathInputEl) {
                    templatePathInputEl.value = file.path;
                }
            }).open();
        }));
        // 添加完整路径预览
        const fullPathPreviewContainer = savePathSetting.descEl.createEl("div", {
            cls: "fullPath-preview",
            text: "路径预览："
        });
        fullPathPreviewContainer.style.marginTop = "8px";
        fullPathPreviewContainer.style.color = "var(--text-muted)";
        fullPathPreviewText = fullPathPreviewContainer.createEl("span");
        // 初始渲染预览
        updatePreview();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXR0aW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFNLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQWdCLE1BQU0sVUFBVSxDQUFDO0FBRS9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUF3SWpFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFxQjtJQUM5QyxZQUFZLEVBQUU7UUFDVixRQUFRLEVBQUUsSUFBSTtRQUNkLFlBQVksRUFBRSxTQUFTO1FBQ3ZCLGNBQWMsRUFBRSxZQUFZO0tBQy9CO0lBQ0QsU0FBUyxFQUFFO1FBQ1AsUUFBUSxFQUFFLElBQUk7UUFDZCxZQUFZLEVBQUUsU0FBUztRQUN2QixjQUFjLEVBQUUsWUFBWTtLQUMvQjtJQUNELFVBQVUsRUFBRTtRQUNSLFFBQVEsRUFBRSxJQUFJO1FBQ2QsWUFBWSxFQUFFLFNBQVM7UUFDdkIsY0FBYyxFQUFFLFNBQVM7S0FDNUI7SUFDRCxXQUFXLEVBQUU7UUFDVCxRQUFRLEVBQUUsSUFBSTtRQUNkLFlBQVksRUFBRSxTQUFTO1FBQ3ZCLGNBQWMsRUFBRSxTQUFTO0tBQzVCO0lBQ0QsYUFBYSxFQUFFO1FBQ1gsUUFBUSxFQUFFLElBQUk7UUFDZCxZQUFZLEVBQUUsU0FBUztRQUN2QixjQUFjLEVBQUUsV0FBVztLQUM5QjtJQUNELFVBQVUsRUFBRTtRQUNSLFFBQVEsRUFBRSxJQUFJO1FBQ2QsWUFBWSxFQUFFLFNBQVM7UUFDdkIsY0FBYyxFQUFF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QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDNUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQztZQUM3QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDN0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQztZQUM5QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDOUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztZQUMvQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDaEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQztZQUNqRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxD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IHtBcHAsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIE5vdGljZSwgVGV4dENvbXBvbmVudH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBNeVBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IGZvcm1hdERhdGUgfSBmcm9tIFwiLi91dGlscy9kYXRlVXRpbHNcIjtcclxuaW1wb3J0IHsgQWRkQ2FwdHVyZVRvQ29uZmlnQm94IH0gZnJvbSBcIi4vY29tcG9uZW50c1wiO1xyXG5pbXBvcnQgeyBGaWxlU2VsZWN0TW9kYWwgfSBmcm9tIFwiLi9tb2RhbHMvRmlsZVNlbGVjdE1vZGFsXCI7XG5pbXBvcnQgeyBGb2xkZXJTZWxlY3RNb2RhbCB9IGZyb20gXCIuL21vZGFscy9Gb2xkZXJTZWxlY3RNb2RhbFwiO1xuaW1wb3J0IHsgQ2FwdHVyZVRvQ29uZmlnTW9kYWwgfSBmcm9tIFwiLi92aWV3cy9jYWxlbmRhci9tb2RhbHMvQ2FwdHVyZVRvQ29uZmlnTW9kYWxcIjtcbmltcG9ydCB7IENvbW1hbmRTZWxlY3RNb2RhbCB9IGZyb20gXCIuL21vZGFscy9Db21tYW5kU2VsZWN0TW9kYWxcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90ZVRlbXBsYXRlU2V0dGluZ3Mge1xyXG4gICAgc2F2ZVBhdGg6IHN0cmluZztcclxuICAgIHRlbXBsYXRlUGF0aDogc3RyaW5nO1xyXG4gICAgZmlsZU5hbWVGb3JtYXQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUYXNrSW5zZXJ0U2V0dGluZ3Mge1xyXG4gICAgaW5zZXJ0U2VjdGlvbjogc3RyaW5nO1xyXG4gICAgaW5zZXJ0UG9zaXRpb246IFwiZmlyc3RcIiB8IFwibGFzdFwiO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Qge1xyXG4gICAgZW5hYmxlZDogYm9vbGVhbjtcclxuICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogYm9vbGVhbjtcclxuICAgIHRlbXBsYXRlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0U2V0dGluZ3Mge1xyXG4gICAgZW5hYmxlZDogYm9vbGVhbjtcclxuICAgIGZvcm1hdDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEluc2VydEFmdGVyU2V0dGluZ3Mge1xyXG4gICAgZW5hYmxlZDogYm9vbGVhbjtcclxuICAgIGFmdGVyOiBzdHJpbmc7XHJcbiAgICBpbnNlcnRBdEVuZDogYm9vbGVhbjtcclxuICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGJvb2xlYW47XHJcbiAgICBjcmVhdGVJZk5vdEZvdW5kOiBib29sZWFuO1xyXG4gICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcInRvcFwiIHwgXCJib3R0b21cIjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBOZXdMaW5lQ2FwdHVyZVNldHRpbmdzIHtcclxuICAgIGVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgICBkaXJlY3Rpb246IFwiYWJvdmVcIiB8IFwiYmVsb3dcIjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlT3BlbmluZ1NldHRpbmdzIHtcclxuICAgIGxvY2F0aW9uOiBcInJldXNlXCIgfCBcInRhYlwiIHwgXCJzcGxpdFwiIHwgXCJ3aW5kb3dcIiB8IFwibGVmdC1zaWRlYmFyXCIgfCBcInJpZ2h0LXNpZGViYXJcIjtcclxuICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiIHwgXCJob3Jpem9udGFsXCI7XHJcbiAgICBtb2RlOiBcInByZXZpZXdcIiB8IFwic291cmNlXCIgfCBcImxpdmVcIiB8IFwibGl2ZS1wcmV2aWV3XCIgfCBcImRlZmF1bHRcIjtcclxuICAgIGZvY3VzOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENhcHR1cmVUb0NvbmZpZyB7XHJcbiAgICBpZDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgIFxyXG4gICAgLy8g5Z+65pys6K6+572uXHJcbiAgICBlbmFibGVkOiBib29sZWFuO1xyXG4gICAgZGVmYXVsdENhcHR1cmVQYXRoOiBzdHJpbmc7XHJcbiAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBib29sZWFuO1xyXG4gICAgXHJcbiAgICAvLyDlv6vmjbfplK7orr7nva5cclxuICAgIGhvdGtleToge1xyXG4gICAgICAgIG1vZGlmaWVyczogc3RyaW5nW107XHJcbiAgICAgICAga2V5OiBzdHJpbmc7XHJcbiAgICB9IHwgbnVsbDtcclxuICAgIFxyXG4gICAgLy8g6L6T5YWl5pa55byP6K6+572uXHJcbiAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiIHwgXCJtdWx0aS1saW5lXCIgfCBcIm5vbmVcIjtcclxuICAgIFxyXG4gICAgLy8g5paH5Lu25Yib5bu66K6+572uXHJcbiAgICBjcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0OiBDcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0O1xyXG4gICAgXHJcbiAgICAvLyDmoLzlvI/ljJborr7nva5cclxuICAgIGZvcm1hdDogRm9ybWF0U2V0dGluZ3M7XHJcbiAgICBcclxuICAgIC8vIOaPkuWFpeiuvue9rlxyXG4gICAgcHJlcGVuZDogYm9vbGVhbjtcclxuICAgIGFwcGVuZExpbms6IGJvb2xlYW47XHJcbiAgICBcclxuICAgIC8vIOS7u+WKoeiuvue9rlxyXG4gICAgdGFzazogYm9vbGVhbjtcclxuICAgIFxyXG4gICAgLy8g5pel5pyf6K6+572uXHJcbiAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGJvb2xlYW47XHJcbiAgICBhdXRvQWRkRHVlRGF0ZTogYm9vbGVhbjtcclxuICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIiB8IFwiY3VzdG9tXCIgfCBcIndlZWtlbmRcIiB8IFwibW9udGhFbmRcIiB8IFwieWVhckVuZFwiO1xyXG4gICAgY3VzdG9tRHVlRGF5czogbnVtYmVyO1xyXG4gICAgXHJcbiAgICAvLyDmj5LlhaXkvY3nva7orr7nva5cclxuICAgIGluc2VydEFmdGVyOiBJbnNlcnRBZnRlclNldHRpbmdzO1xyXG4gICAgbmV3TGluZUNhcHR1cmU6IE5ld0xpbmVDYXB0dXJlU2V0dGluZ3M7XHJcbiAgICBcclxuICAgIC8vIOaWh+S7tuaJk+W8gOiuvue9rlxyXG4gICAgb3BlbkZpbGU6IGJvb2xlYW47XHJcbiAgICBmaWxlT3BlbmluZzogRmlsZU9wZW5pbmdTZXR0aW5ncztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDYXB0dXJlVG9TZXR0aW5ncyB7XHJcbiAgICBlbmFibGVkOiBib29sZWFuO1xyXG4gICAgZmxlZXRpbmdOb3RlQ29uZmlnSWQ6IHN0cmluZztcclxuICAgIHJlY29yZENvbmZpZ0lkOiBzdHJpbmc7XHJcbiAgICB0YXNrQ29uZmlnSWQ6IHN0cmluZztcclxuICAgIGNvbmZpZ3M6IENhcHR1cmVUb0NvbmZpZ1tdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRhc2tTZXR0aW5ncyB7XHJcbiAgICAvLyDmjZXojrfmj5LlhaXorr7nva5cclxuICAgIGNhcHR1cmVUb1NldHRpbmdzOiBDYXB0dXJlVG9TZXR0aW5ncztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUYXNrRmlsdGVyU2V0dGluZ3Mge1xyXG4gICAgY3VzdG9tRmlsdGVyOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIOabtOWkmuagh+etvuiuvue9rlxyXG5leHBvcnQgaW50ZXJmYWNlIEN1c3RvbUxhYmVsIHtcclxuICAgIGVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgICBsYWJlbFRleHQ6IHN0cmluZztcclxuICAgIGFjdGlvblR5cGU6IFwic3lzdGVtQ29tbWFuZFwiIHwgXCJvcGVuRmlsZVwiO1xyXG4gICAgc3lzdGVtQ29tbWFuZDogc3RyaW5nO1xyXG4gICAgZmlsZVBhdGg6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb3JlTGFiZWxTZXR0aW5ncyB7XHJcbiAgICBsYjE6IEN1c3RvbUxhYmVsO1xyXG4gICAgbGIyOiBDdXN0b21MYWJlbDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTXlQbHVnaW5TZXR0aW5ncyB7XHJcbiAgICBmbGVldGluZ05vdGU6IE5vdGVUZW1wbGF0ZVNldHRpbmdzO1xyXG4gICAgZGFpbHlOb3RlOiBOb3RlVGVtcGxhdGVTZXR0aW5ncztcclxuICAgIHdlZWtseU5vdGU6IE5vdGVUZW1wbGF0ZVNldHRpbmdzO1xyXG4gICAgbW9udGhseU5vdGU6IE5vdGVUZW1wbGF0ZVNldHRpbmdzO1xyXG4gICAgcXVhcnRlcmx5Tm90ZTogTm90ZVRlbXBsYXRlU2V0dGluZ3M7XHJcbiAgICB5ZWFybHlOb3RlOiBOb3RlVGVtcGxhdGVTZXR0aW5ncztcclxuICAgIHRhc2tGaWx0ZXI6IFRhc2tGaWx0ZXJTZXR0aW5ncztcclxuICAgIHRhc2tTZXR0aW5nczogVGFza1NldHRpbmdzO1xyXG4gICAgbW9yZUxhYmVsU2V0dGluZ3M6IE1vcmVMYWJlbFNldHRpbmdzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogTXlQbHVnaW5TZXR0aW5ncyA9IHtcclxuICAgIGZsZWV0aW5nTm90ZToge1xyXG4gICAgICAgIHNhdmVQYXRoOiBcIumXquW/tVwiLFxyXG4gICAgICAgIHRlbXBsYXRlUGF0aDogXCLmqKHmnb8v6Zeq5b+15qih5p2/XCIsXHJcbiAgICAgICAgZmlsZU5hbWVGb3JtYXQ6IFwi6Zeq5b+1IFlZWVktTU1cIlxyXG4gICAgfSxcclxuICAgIGRhaWx5Tm90ZToge1xyXG4gICAgICAgIHNhdmVQYXRoOiBcIuaXpeiusFwiLFxyXG4gICAgICAgIHRlbXBsYXRlUGF0aDogXCLmqKHmnb8v5pel6K6w5qih5p2/XCIsXHJcbiAgICAgICAgZmlsZU5hbWVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiXHJcbiAgICB9LFxyXG4gICAgd2Vla2x5Tm90ZToge1xyXG4gICAgICAgIHNhdmVQYXRoOiBcIuWRqOaKpVwiLFxyXG4gICAgICAgIHRlbXBsYXRlUGF0aDogXCLmqKHmnb8v5ZGo5oql5qih5p2/XCIsXHJcbiAgICAgICAgZmlsZU5hbWVGb3JtYXQ6IFwiR0dHRy1XV1wiXHJcbiAgICB9LFxyXG4gICAgbW9udGhseU5vdGU6IHtcclxuICAgICAgICBzYXZlUGF0aDogXCLmnIjmiqVcIixcclxuICAgICAgICB0ZW1wbGF0ZVBhdGg6IFwi5qih5p2/L+aciOaKpeaooeadv1wiLFxyXG4gICAgICAgIGZpbGVOYW1lRm9ybWF0OiBcIllZWVktTU1cIlxyXG4gICAgfSxcclxuICAgIHF1YXJ0ZXJseU5vdGU6IHtcclxuICAgICAgICBzYXZlUGF0aDogXCLlraPmiqVcIixcclxuICAgICAgICB0ZW1wbGF0ZVBhdGg6IFwi5qih5p2/L+Wto+aKpeaooeadv1wiLFxyXG4gICAgICAgIGZpbGVOYW1lRm9ybWF0OiBcIllZWVktUVtRXVwiXHJcbiAgICB9LFxyXG4gICAgeWVhcmx5Tm90ZToge1xyXG4gICAgICAgIHNhdmVQYXRoOiBcIuW5tOaKpVwiLFxyXG4gICAgICAgIHRlbXBsYXRlUGF0aDogXCLmqKHmnb8v5bm05oql5qih5p2/XCIsXHJcbiAgICAgICAgZmlsZU5hbWVGb3JtYXQ6IFwiWVlZWVwiXHJcbiAgICB9LFxyXG4gICAgdGFza0ZpbHRlcjoge1xyXG4gICAgICAgIGN1c3RvbUZpbHRlcjogXCJcIlxyXG4gICAgfSxcclxuICAgIHRhc2tTZXR0aW5nczoge1xyXG4gICAgICAgIGNhcHR1cmVUb1NldHRpbmdzOiB7XHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGZsZWV0aW5nTm90ZUNvbmZpZ0lkOiBcImZsZWV0aW5nTm90ZVwiLFxyXG4gICAgICAgICAgICByZWNvcmRDb25maWdJZDogXCJyZWNvcmRcIixcclxuICAgICAgICAgICAgdGFza0NvbmZpZ0lkOiBcInRhc2tcIixcclxuICAgICAgICAgICAgY29uZmlnczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcImZsZWV0aW5nTm90ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6k6Zeq5b+1XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwi6buY6K6k55qE6Zeq5b+15o2V6I635o+S5YWl6YWN572uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGg6IFwie3vpl6rlv7V9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+mXquW/teaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwie3tUQVNLX1RFWFR9fVxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2lkZXJTdWJzZWN0aW9uczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCIgYXMgXCJ0b3BcIiB8IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcInJlY29yZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6k6K6w5b2VXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwi6buY6K6k55qE6K6w5b2V5o2V6I635o+S5YWl6YWN572uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGg6IFwie3vml6XorrB9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+aXpeiusOaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwie3tUQVNLX1RFWFR9fVxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDml6XluLjorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCIgYXMgXCJ0b3BcIiB8IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ0YXNrXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLpu5jorqTku7vliqFcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLpu5jorqTnmoTmjZXojrfmj5LlhaXphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcInNpbmdsZS1saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pel6K6w5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCJ7e1RBU0tfVEVYVH19XFxuXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHByZXBlbmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRhc2s6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDml6XluLjorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCIgYXMgXCJ0b3BcIiB8IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJkYWlseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6kZGFpbHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7mr4/ml6XnrJTorrDnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcIm5vbmVcIixcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IFwie3vml6XorrDmqKHmnb99fVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBcInt7VEFTS19URVhUfX1cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZU9wdGlvbjogXCJ0b2RheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUR1ZURheXM6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5pel5bi46K6w5b2VXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiIGFzIFwidG9wXCIgfCBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ3ZWVrbHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupHdlZWtseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIuS4k+mXqOeUqOS6juWRqOaKpeeahOmFjee9rlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdENhcHR1cmVQYXRoOiBcInt75ZGo5oqlfX1cIixcclxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBob3RrZXk6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IFwibm9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+WRqOaKpeaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwiIyMge3tUQVNLX1RFWFR9fVxcblxcbi0g5pys5ZGo5bel5L2cOiBcXG4tIOS4i+WRqOiuoeWIkjogXFxuLSDpgYfliLDpl67popg6IFxcblxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDlt6XkvZzorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCIgYXMgXCJ0b3BcIiB8IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcIm1vbnRobHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupG1vbnRobHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7mnIjmiqXnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+m7mOiupG1vbnRobHl9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJub25lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pyI5oql5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCIjIyB7e1RBU0tfVEVYVH19XFxuXFxuLSDmnKzmnIjlt6XkvZw6IFxcbi0g5LiL5pyI6K6h5YiSOiBcXG4tIOaAu+e7k+WPjeaAnTogXFxuXFxuXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHByZXBlbmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRhc2s6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGRDcmVhdGVkRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZER1ZURhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIixcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21EdWVEYXlzOiAxLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydEFmdGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiBcIiMjIOaciOW6puaAu+e7k1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRBdEVuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2lkZXJTdWJzZWN0aW9uczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbjogXCJib3R0b21cIiBhcyBcInRvcFwiIHwgXCJib3R0b21cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGluZUNhcHR1cmU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJiZWxvd1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcGVuRmlsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlT3BlbmluZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogXCJ0YWJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcInZlcnRpY2FsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGU6IFwiZGVmYXVsdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1czogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IFwicXVhcnRlcmx5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLpu5jorqRxdWFydGVybHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7lraPmiqXnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+Wto+aKpX19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcIm5vbmVcIixcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IFwie3vlraPmiqXmqKHmnb99fVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBcIiMjIHt7VEFTS19URVhUfX1cXG5cXG4tIOacrOWto+W3peS9nDogXFxuLSDkuIvlraPorqHliJI6IFxcbi0g5a2j5bqm5Y+N5oCdOiBcXG5cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZU9wdGlvbjogXCJ0b2RheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUR1ZURheXM6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5a2j5bqm5oC757uTXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiIGFzIFwidG9wXCIgfCBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ5ZWFybHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupHllYXJseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIuS4k+mXqOeUqOS6juW5tOaKpeeahOmFjee9rlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdENhcHR1cmVQYXRoOiBcInt75bm05oqlfX1cIixcclxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBob3RrZXk6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IFwibm9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+W5tOaKpeaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwiIyMge3tUQVNLX1RFWFR9fVxcblxcbi0g5pys5bm05bel5L2cOiBcXG4tIOaYjuW5tOiuoeWIkjogXFxuLSDlubTluqblj43mgJ06IFxcbi0g55uu5qCH6L6+5oiQOiBcXG5cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZU9wdGlvbjogXCJ0b2RheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUR1ZURheXM6IDEsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5bm05bqm5oC757uTXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiIGFzIFwidG9wXCIgfCBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJtZWV0aW5nXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLkvJrorq7nrJTorrBcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7kvJrorq7nrJTorrDnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcInNpbmdsZS1saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pel6K6w5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCIjIyB7e1RBU0tfVEVYVH19XFxuXFxuLSDml7bpl7Q6IHt7REFURX19XFxuLSDlnLDngrk6IFxcbi0g5Y+C5LiO5Lq65ZGYOiBcXG4tIOWGheWuuTogXFxuLSDooYzliqjpobk6IFxcblxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDml6XluLjorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCIgYXMgXCJ0b3BcIiB8IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgbW9yZUxhYmVsU2V0dGluZ3M6IHtcclxuICAgICAgICBsYjE6IHtcclxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGxhYmVsVGV4dDogXCJMQjFcIixcclxuICAgICAgICAgICAgYWN0aW9uVHlwZTogXCJzeXN0ZW1Db21tYW5kXCIsXHJcbiAgICAgICAgICAgIHN5c3RlbUNvbW1hbmQ6IFwiXCIsXHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBcIlwiXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsYjI6IHtcclxuICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGxhYmVsVGV4dDogXCJMQjJcIixcclxuICAgICAgICAgICAgYWN0aW9uVHlwZTogXCJzeXN0ZW1Db21tYW5kXCIsXHJcbiAgICAgICAgICAgIHN5c3RlbUNvbW1hbmQ6IFwiXCIsXHJcbiAgICAgICAgICAgIGZpbGVQYXRoOiBcIlwiXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2FtcGxlU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gICAgcGx1Z2luOiBNeVBsdWdpbjtcclxuICAgIHByaXZhdGUgc2V0dGluZ3NDaGFuZ2VkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogTXlQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcblxyXG4gICAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCB7Y29udGFpbmVyRWx9ID0gdGhpcztcclxuXHJcbiAgICAgICAgY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgICAgICBjb25zdCBoZWFkZXIgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInNldHRpbmctc2VjdGlvblwifSk7XHJcbiAgICAgICAgaGVhZGVyLnN0eWxlLnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgaGVhZGVyLnN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiMjBweFwiO1xyXG4gICAgICAgIGhlYWRlci5jcmVhdGVFbChcImgyXCIsIHt0ZXh0OiBcIjk55pel5Y6G6K6+572uXCJ9KTtcclxuXHJcbiAgICAgICAgLy8g5riy5p+T5Lu75Yqh5pi+56S6562b6YCJ6K6+572uXHJcbiAgICAgICAgdGhpcy5yZW5kZXJUYXNrRmlsdGVyU2V0dGluZ3MoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmuLLmn5MgQ2FwdHVyZSBUbyDorr7nva5cclxuICAgICAgICB0aGlzLnJlbmRlckNhcHR1cmVUb1NldHRpbmdzKCk7XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyTm90ZVNldHRpbmdzKFwi6Zeq5b+16K6+572uXCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmZsZWV0aW5nTm90ZSwgKG5ld1NldHRpbmdzKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmZsZWV0aW5nTm90ZSA9IG5ld1NldHRpbmdzO1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyTm90ZVNldHRpbmdzKFwi5pel6K6w6K6+572uXCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZSwgKG5ld1NldHRpbmdzKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5Tm90ZSA9IG5ld1NldHRpbmdzO1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyTm90ZVNldHRpbmdzKFwi5ZGo5oql6K6+572uXCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtseU5vdGUsIChuZXdTZXR0aW5ncykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3RlID0gbmV3U2V0dGluZ3M7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJOb3RlU2V0dGluZ3MoXCLmnIjmiqXorr7nva5cIiwgdGhpcy5wbHVnaW4uc2V0dGluZ3MubW9udGhseU5vdGUsIChuZXdTZXR0aW5ncykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb250aGx5Tm90ZSA9IG5ld1NldHRpbmdzO1xyXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyTm90ZVNldHRpbmdzKFwi5a2j5oql6K6+572uXCIsIHRoaXMucGx1Z2luLnNldHRpbmdzLnF1YXJ0ZXJseU5vdGUsIChuZXdTZXR0aW5ncykgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5xdWFydGVybHlOb3RlID0gbmV3U2V0dGluZ3M7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5yZW5kZXJOb3RlU2V0dGluZ3MoXCLlubTmiqXorr7nva5cIiwgdGhpcy5wbHVnaW4uc2V0dGluZ3MueWVhcmx5Tm90ZSwgKG5ld1NldHRpbmdzKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnllYXJseU5vdGUgPSBuZXdTZXR0aW5ncztcclxuICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDmuLLmn5Pmm7TlpJrmoIfnrb7orr7nva5cclxuICAgICAgICB0aGlzLnJlbmRlck1vcmVMYWJlbFNldHRpbmdzKCk7XHJcblxyXG4gICAgICAgIC8vIOebkeWQrOiuvue9rumhtemdouWFs+mXreS6i+S7tlxyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudHMoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHJlbmRlck1vcmVMYWJlbFNldHRpbmdzKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNlY3Rpb24gPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwic2V0dGluZy1zZWN0aW9uXCJ9KTtcclxuICAgICAgICBzZWN0aW9uLmNyZWF0ZUVsKFwiaDRcIiwge3RleHQ6IFwi6Ieq5a6a5LmJ5qCH562+6K6+572uXCJ9KTtcclxuXHJcbiAgICAgICAgY29uc3QgbW9yZVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubW9yZUxhYmVsU2V0dGluZ3M7XHJcblxyXG4gICAgICAgIHRoaXMucmVuZGVyQ3VzdG9tTGFiZWxTZXR0aW5ncyhzZWN0aW9uLCBcIkxCMVwiLCBtb3JlU2V0dGluZ3MubGIxKTtcclxuICAgICAgICB0aGlzLnJlbmRlckN1c3RvbUxhYmVsU2V0dGluZ3Moc2VjdGlvbiwgXCJMQjJcIiwgbW9yZVNldHRpbmdzLmxiMik7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBwcml2YXRlIHJlbmRlckN1c3RvbUxhYmVsU2V0dGluZ3Moc2VjdGlvbjogSFRNTEVsZW1lbnQsIGxhYmVsTmFtZTogc3RyaW5nLCBsYWJlbFNldHRpbmdzOiBDdXN0b21MYWJlbCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGxhYmVsU2VjdGlvbiA9IHNlY3Rpb24uY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJzZXR0aW5nLXNlY3Rpb25cIn0pO1xyXG4gICAgICAgIGxhYmVsU2VjdGlvbi5jcmVhdGVFbChcImg1XCIsIHt0ZXh0OiBgJHtsYWJlbE5hbWV96K6+572uYH0pO1xyXG5cclxuICAgICAgICBuZXcgU2V0dGluZyhsYWJlbFNlY3Rpb24pXHJcbiAgICAgICAgICAgIC5zZXROYW1lKGDlkK/nlKgke2xhYmVsTmFtZX1gKVxyXG4gICAgICAgICAgICAuc2V0RGVzYyhg5ZCv55So5oiW56aB55So5pel5Y6G5Y+z5LiK6KeS55qEJHtsYWJlbE5hbWV95qCH562+YClcclxuICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUobGFiZWxTZXR0aW5ncy5lbmFibGVkKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbFNldHRpbmdzLmVuYWJsZWQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGxhYmVsU2VjdGlvbilcclxuICAgICAgICAgICAgLnNldE5hbWUoYCR7bGFiZWxOYW1lfeWQjeensGApXHJcbiAgICAgICAgICAgIC5zZXREZXNjKGDoh6rlrprkuYkke2xhYmVsTmFtZX3mmL7npLrnmoTmlofmnKxgKVxyXG4gICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHRleHRcclxuICAgICAgICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihg5L6L5aaC77yaJHtsYWJlbE5hbWV9YClcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShsYWJlbFNldHRpbmdzLmxhYmVsVGV4dClcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxTZXR0aW5ncy5sYWJlbFRleHQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGxhYmVsU2VjdGlvbilcclxuICAgICAgICAgICAgLnNldE5hbWUoXCLmk43kvZznsbvlnotcIilcclxuICAgICAgICAgICAgLnNldERlc2MoYOmAieaLqeeCueWHuyR7bGFiZWxOYW1lfeWQjuaJp+ihjOeahOaTjeS9nOexu+Wei2ApXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93blxyXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcInN5c3RlbUNvbW1hbmRcIiwgXCLns7vnu5/lkb3ku6RcIilcclxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oXCJvcGVuRmlsZVwiLCBcIuaJk+W8gOaWh+S7tlwiKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKGxhYmVsU2V0dGluZ3MuYWN0aW9uVHlwZSlcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFiZWxTZXR0aW5ncy5hY3Rpb25UeXBlID0gdmFsdWUgYXMgXCJzeXN0ZW1Db21tYW5kXCIgfCBcIm9wZW5GaWxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBpZiAobGFiZWxTZXR0aW5ncy5hY3Rpb25UeXBlID09PSBcInN5c3RlbUNvbW1hbmRcIikge1xyXG4gICAgICAgICAgICBsZXQgY29tbWFuZElucHV0VGV4dENvbXBvbmVudDogVGV4dENvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kSW5wdXQgPSBuZXcgU2V0dGluZyhsYWJlbFNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAuc2V0TmFtZShcIuezu+e7n+WRveS7pFwiKVxyXG4gICAgICAgICAgICAgICAgLnNldERlc2MoXCLovpPlhaXopoHmiafooYznmoRPYnNpZGlhbuezu+e7n+WRveS7pElEXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kSW5wdXRUZXh0Q29tcG9uZW50ID0gdGV4dDtcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKFwi5L6L5aaC77yaYXBwOm9wZW4tdmF1bHRcIilcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0LnNldFZhbHVlKGxhYmVsU2V0dGluZ3Muc3lzdGVtQ29tbWFuZClcclxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbFNldHRpbmdzLnN5c3RlbUNvbW1hbmQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RCdXR0b24gPSBjb21tYW5kSW5wdXQuY29udHJvbEVsLmNyZWF0ZUVsKCdidXR0b24nLCB7XHJcbiAgICAgICAgICAgICAgICBjbHM6ICdjb21tYW5kLXNlbGVjdC1idXR0b24nLFxyXG4gICAgICAgICAgICAgICAgdGV4dDogJ+mAieaLqeWRveS7pCdcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHNlbGVjdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBDb21tYW5kU2VsZWN0TW9kYWwoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcDogdGhpcy5hcHAsXHJcbiAgICAgICAgICAgICAgICAgICAgb25Db21tYW5kU2VsZWN0ZWQ6IChjb21tYW5kSWQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tbWFuZElucHV0VGV4dENvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZElucHV0VGV4dENvbXBvbmVudC5zZXRWYWx1ZShjb21tYW5kSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsU2V0dGluZ3Muc3lzdGVtQ29tbWFuZCA9IGNvbW1hbmRJZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChsYWJlbFNldHRpbmdzLmFjdGlvblR5cGUgPT09IFwib3BlbkZpbGVcIikge1xyXG4gICAgICAgICAgICBsZXQgZmlsZVBhdGhUZXh0Q29tcG9uZW50OiBUZXh0Q29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoSW5wdXQgPSBuZXcgU2V0dGluZyhsYWJlbFNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAuc2V0TmFtZShcIuaWh+S7tui3r+W+hFwiKVxyXG4gICAgICAgICAgICAgICAgLnNldERlc2MoXCLovpPlhaXopoHmiZPlvIDnmoTmlofku7bot6/lvoRcIilcclxuICAgICAgICAgICAgICAgIC5hZGRUZXh0KHRleHQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoVGV4dENvbXBvbmVudCA9IHRleHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihcIuS+i+Wmgu+8muaXpeiusC8yMDI0LTAxLTAxLm1kXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dC5zZXRWYWx1ZShsYWJlbFNldHRpbmdzLmZpbGVQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsU2V0dGluZ3MuZmlsZVBhdGggPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RGaWxlQnV0dG9uID0gZmlsZVBhdGhJbnB1dC5jb250cm9sRWwuY3JlYXRlRWwoJ2J1dHRvbicsIHtcclxuICAgICAgICAgICAgICAgIGNsczogJ2NvbW1hbmQtc2VsZWN0LWJ1dHRvbicsXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiAn6YCJ5oup5paH5Lu2J1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc2VsZWN0RmlsZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBGaWxlU2VsZWN0TW9kYWwodGhpcy5hcHAsIChmaWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVQYXRoVGV4dENvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aFRleHRDb21wb25lbnQuc2V0VmFsdWUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsYWJlbFNldHRpbmdzLmZpbGVQYXRoID0gZmlsZVBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSkub3BlbigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8g5re75Yqg5LiA5Liq5Y+Y6YeP5p2l5a2Y5YKoIE11dGF0aW9uT2JzZXJ2ZXIg5a6e5L6LXHJcbiAgICBwcml2YXRlIG9ic2VydmVyOiBNdXRhdGlvbk9ic2VydmVyIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgcHJpdmF0ZSByZWdpc3RlckV2ZW50cygpIHtcclxuICAgICAgICAvLyDlpoLmnpzlt7Lnu4/mnIkgT2JzZXJ2ZXLvvIzlhYjmlq3lvIDov57mjqVcclxuICAgICAgICBpZiAodGhpcy5vYnNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLm9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Yib5bu65paw55qEIE9ic2VydmVyXHJcbiAgICAgICAgdGhpcy5vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcclxuICAgICAgICAgICAgbXV0YXRpb25zLmZvckVhY2goKG11dGF0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobXV0YXRpb24udHlwZSA9PT0gJ2NoaWxkTGlzdCcgJiYgdGhpcy5jb250YWluZXJFbC5wYXJlbnRFbGVtZW50ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6K6+572u6aG16Z2i5bey5YWz6Zet77yM5qOA5p+l5piv5ZCm6ZyA6KaB5L+d5a2Y6K6+572uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3NDaGFuZ2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pat5byA6L+e5o6lXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vYnNlcnZlci5kaXNjb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMub2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLmNvbnRhaW5lckVsLnBhcmVudEVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keSwge1xyXG4gICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsXHJcbiAgICAgICAgICAgIHN1YnRyZWU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAvLyDkv53lrZjorr7nva7lkI7liLfmlrDop4blm75cclxuICAgICAgICB0aGlzLnBsdWdpbi51cGRhdGVBbGxWaWV3cygpO1xyXG4gICAgICAgIG5ldyBOb3RpY2UoXCLorr7nva7lt7Lkv53lrZjlubbliLfmlrDop4blm75cIik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW5kZXJUYXNrRmlsdGVyU2V0dGluZ3MoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbiA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJzZXR0aW5nLXNlY3Rpb25cIn0pO1xyXG4gICAgICAgIHNlY3Rpb24uY3JlYXRlRWwoXCJoNFwiLCB7dGV4dDogXCLku7vliqHliJfooajorr7nva5cIn0pO1xyXG5cclxuICAgICAgICAvLyDoh6rlrprkuYnnrZvpgInorr7nva5cclxuICAgICAgICBuZXcgU2V0dGluZyhzZWN0aW9uKVxyXG4gICAgICAgICAgICAuc2V0TmFtZShcIuiHquWumuS5ieetm+mAiVwiKVxyXG4gICAgICAgICAgICAuc2V0RGVzYyhcIuinhOWIme+8muS9v+eUqOi3r+W+hOaIluagh+etvu+8jCHooajnpLrmjpLpmaTvvIxhbmTjgIFvcuOAgSgp6YC76L6R57uE5ZCI44CC5L6L5aaC77yaKEEgb3IgQikgYW5kICNDIC0g6Lev5b6EQeaIlkLkuK3ljIXlkKvmoIfnrb4jQ+eahOS7u+WKoVwiKVxyXG4gICAgICAgICAgICAuYWRkVGV4dEFyZWEodGV4dEFyZWEgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGV4dEFyZWFcclxuICAgICAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCLovpPlhaXnrZvpgInop4TliJlcIilcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza0ZpbHRlci5jdXN0b21GaWx0ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tGaWx0ZXIuY3VzdG9tRmlsdGVyID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIC8vIOiuvue9ruaWh+acrOWfn+WxnuaAp1xyXG4gICAgICAgICAgICAgICAgdGV4dEFyZWEuaW5wdXRFbC5yb3dzID0gNDtcclxuICAgICAgICAgICAgICAgIHRleHRBcmVhLmlucHV0RWwud3JhcCA9IFwic29mdFwiO1xyXG4gICAgICAgICAgICAgICAgdGV4dEFyZWEuaW5wdXRFbC5zdHlsZS5yZXNpemUgPSBcInZlcnRpY2FsXCI7XHJcbiAgICAgICAgICAgICAgICB0ZXh0QXJlYS5pbnB1dEVsLnN0eWxlLm1heEhlaWdodCA9IFwiMTAwcHhcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW5kZXJUYXNrU2V0dGluZ3MoKTogdm9pZCB7XHJcbiAgICAgICAgLy8g5Lu75Yqh5Yib5bu66K6+572u5bey56e76IezIENhcHR1cmUgVG8g6K6+572u5LitXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZW5kZXJDYXB0dXJlVG9TZXR0aW5ncygpOiB2b2lkIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcInJlbmRlckNhcHR1cmVUb1NldHRpbmdzIGNhbGxlZFwiKTtcclxuICAgICAgICBjb25zdCBzZWN0aW9uID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInNldHRpbmctc2VjdGlvblwifSk7XHJcbiAgICAgICAgc2VjdGlvbi5jcmVhdGVFbChcImg0XCIsIHt0ZXh0OiBcIuaNleiOt+aPkuWFpeiuvue9rlwifSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNhcHR1cmVTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncztcclxuICAgICAgICBjb25zb2xlLmxvZyhcImNhcHR1cmVTZXR0aW5nczpcIiwgY2FwdHVyZVNldHRpbmdzKTtcclxuXHJcbiAgICAgICAgLy8g5ZCv55SoL+emgeeUqOiuvue9rlxyXG4gICAgICAgIG5ldyBTZXR0aW5nKHNlY3Rpb24pXHJcbiAgICAgICAgICAgIC5zZXROYW1lKFwi5ZCv55So5o2V6I635o+S5YWl5Yqf6IO9XCIpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKFwi5L2/55So5o2V6I635o+S5YWl5Yqf6IO96L+b6KGM5Lu75Yqh5ZKM56yU6K6w55qE5Yib5bu65LiO5o+S5YWlXCIpXHJcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKGNhcHR1cmVTZXR0aW5ncy5lbmFibGVkKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5lbmFibGVkID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAvLyDpl6rlv7XmoIfnrb7phY3nva5cclxuICAgICAgICBuZXcgU2V0dGluZyhzZWN0aW9uKVxyXG4gICAgICAgICAgICAuc2V0TmFtZShcIumXquW/teagh+etvumFjee9rlwiKVxyXG4gICAgICAgICAgICAuc2V0RGVzYyhcIumAieaLqeS7u+WKoeaYvuekuuWMuuWfn+WktOmDqOmXquW/teagh+etvuWvueW6lOeahOmFjee9rlwiKVxyXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4ge1xyXG4gICAgICAgICAgICAgICAgY2FwdHVyZVNldHRpbmdzLmNvbmZpZ3MuZm9yRWFjaChjb25maWcgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihjb25maWcuaWQsIGNvbmZpZy5uYW1lKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY2FwdHVyZVNldHRpbmdzLmZsZWV0aW5nTm90ZUNvbmZpZ0lkKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmZsZWV0aW5nTm90ZUNvbmZpZ0lkID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOiusOW9leagh+etvumFjee9rlxyXG4gICAgICAgIG5ldyBTZXR0aW5nKHNlY3Rpb24pXHJcbiAgICAgICAgICAgIC5zZXROYW1lKFwi6K6w5b2V5qCH562+6YWN572uXCIpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKFwi6YCJ5oup5Lu75Yqh5pi+56S65Yy65Z+f5aS06YOo6K6w5b2V5qCH562+5a+55bqU55qE6YWN572uXCIpXHJcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiB7XHJcbiAgICAgICAgICAgICAgICBjYXB0dXJlU2V0dGluZ3MuY29uZmlncy5mb3JFYWNoKGNvbmZpZyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKGNvbmZpZy5pZCwgY29uZmlnLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjYXB0dXJlU2V0dGluZ3MucmVjb3JkQ29uZmlnSWQpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MucmVjb3JkQ29uZmlnSWQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g5Lu75Yqh5qCH562+6YWN572uXHJcbiAgICAgICAgbmV3IFNldHRpbmcoc2VjdGlvbilcclxuICAgICAgICAgICAgLnNldE5hbWUoXCLku7vliqHmoIfnrb7phY3nva5cIilcclxuICAgICAgICAgICAgLnNldERlc2MoXCLpgInmi6nku7vliqHmmL7npLrljLrln5/lpLTpg6jku7vliqHmoIfnrb7lr7nlupTnmoTphY3nva5cIilcclxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IHtcclxuICAgICAgICAgICAgICAgIGNhcHR1cmVTZXR0aW5ncy5jb25maWdzLmZvckVhY2goY29uZmlnID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oY29uZmlnLmlkLCBjb25maWcubmFtZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNhcHR1cmVTZXR0aW5ncy50YXNrQ29uZmlnSWQpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MudGFza0NvbmZpZ0lkID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOmFjee9ruWIl+ihqFxyXG4gICAgICAgIGNvbnN0IGNvbmZpZ3NIZWFkZXIgPSBzZWN0aW9uLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwic2V0dGluZy1oZWFkZXJcIn0pO1xyXG4gICAgICAgIGNvbmZpZ3NIZWFkZXIuY3JlYXRlRWwoXCJoNFwiLCB7dGV4dDogXCLphY3nva7liJfooahcIn0pO1xyXG5cclxuICAgICAgICAvLyDmi5bmi73mjpLluo/nm7jlhbPlj5jph49cclxuICAgICAgICBsZXQgZHJhZ2dlZEVsZW1lbnQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgbGV0IGRyYWdTdGFydEluZGV4OiBudW1iZXIgPSAtMTtcclxuXHJcbiAgICAgICAgLy8g5pi+56S6546w5pyJ6YWN572uXHJcbiAgICAgICAgY2FwdHVyZVNldHRpbmdzLmNvbmZpZ3MuZm9yRWFjaCgoY29uZmlnLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjb25maWdSb3cgPSBzZWN0aW9uLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuICAgICAgICAgICAgICAgIGNsczogXCJjYXB0dXJlLWNvbmZpZy1yb3dcIlxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgY29uZmlnUm93LnNldEF0dHJpYnV0ZShcImRyYWdnYWJsZVwiLCBcInRydWVcIik7XHJcbiAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwic3BhY2UtYmV0d2VlblwiO1xyXG4gICAgICAgICAgICBjb25maWdSb3cuc3R5bGUuYWxpZ25JdGVtcyA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5wYWRkaW5nID0gXCI4cHggMTJweFwiO1xyXG4gICAgICAgICAgICBjb25maWdSb3cuc3R5bGUuYm9yZGVyID0gXCIxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCI7XHJcbiAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiO1xyXG4gICAgICAgICAgICBjb25maWdSb3cuc3R5bGUubWFyZ2luQm90dG9tID0gXCI0cHhcIjtcclxuICAgICAgICAgICAgY29uZmlnUm93LnN0eWxlLmN1cnNvciA9IFwiZ3JhYlwiO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5a2Y5YKo6YWN572u57Si5byVXHJcbiAgICAgICAgICAgIGNvbmZpZ1Jvdy5kYXRhc2V0LmluZGV4ID0gaW5kZXgudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaLluaLveW8gOWni+S6i+S7tlxyXG4gICAgICAgICAgICBjb25maWdSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdzdGFydFwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZHJhZ2dlZEVsZW1lbnQgPSBjb25maWdSb3c7XHJcbiAgICAgICAgICAgICAgICBkcmFnU3RhcnRJbmRleCA9IHBhcnNlSW50KGNvbmZpZ1Jvdy5kYXRhc2V0LmluZGV4IHx8IFwiLTFcIik7XHJcbiAgICAgICAgICAgICAgICBjb25maWdSb3cuc3R5bGUub3BhY2l0eSA9IFwiMC41XCI7XHJcbiAgICAgICAgICAgICAgICBjb25maWdSb3cuc3R5bGUuY3Vyc29yID0gXCJncmFiYmluZ1wiO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaLluaLvee7k+adn+S6i+S7tlxyXG4gICAgICAgICAgICBjb25maWdSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdlbmRcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGRyYWdnZWRFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XHJcbiAgICAgICAgICAgICAgICBjb25maWdSb3cuc3R5bGUuY3Vyc29yID0gXCJncmFiXCI7XHJcbiAgICAgICAgICAgICAgICAvLyDnp7vpmaTmiYDmnInmi5bmi73mj5DnpLrmoLflvI9cclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuY2FwdHVyZS1jb25maWctcm93XCIpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGh0bWxFbCA9IGVsIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWxFbC5zdHlsZS5ib3JkZXJDb2xvciA9IFwidmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbEVsLnN0eWxlLnRyYW5zZm9ybSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyDmi5bmi73nu4/ov4fkuovku7ZcclxuICAgICAgICAgICAgY29uZmlnUm93LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRyYWdnZWRFbGVtZW50ID09PSBjb25maWdSb3cpIHJldHVybjtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g6K6h566X5ouW5ou95L2N572uXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0ID0gY29uZmlnUm93LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmmL7npLrmi5bmi73mj5DnpLpcclxuICAgICAgICAgICAgICAgIGlmICh5IDwgcmVjdC5oZWlnaHQgLyAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5ouW5ou95Yiw5LiK5pa5XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnUm93LnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlWSg4cHgpXCI7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOaLluaLveWIsOS4i+aWuVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS50cmFuc2Zvcm0gPSBcInRyYW5zbGF0ZVkoLThweClcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS5ib3JkZXJDb2xvciA9IFwidmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaLluaLveemu+W8gOS6i+S7tlxyXG4gICAgICAgICAgICBjb25maWdSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdsZWF2ZVwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnUm93LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIjtcclxuICAgICAgICAgICAgICAgIGNvbmZpZ1Jvdy5zdHlsZS50cmFuc2Zvcm0gPSBcIlwiO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaLluaLveaUvue9ruS6i+S7tlxyXG4gICAgICAgICAgICBjb25maWdSb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIGlmIChkcmFnZ2VkRWxlbWVudCAmJiBkcmFnU3RhcnRJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkcmFnRW5kSW5kZXggPSBwYXJzZUludChjb25maWdSb3cuZGF0YXNldC5pbmRleCB8fCBcIi0xXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkcmFnU3RhcnRJbmRleCAhPT0gZHJhZ0VuZEluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOaOkuW6j+mFjee9rlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtkcmFnZ2VkQ29uZmlnXSA9IGNvbmZpZ3Muc3BsaWNlKGRyYWdTdGFydEluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkcmFnZ2VkQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlncy5zcGxpY2UoZHJhZ0VuZEluZGV4LCAwLCBkcmFnZ2VkQ29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN5paw5riy5p+T6K6+572u6aG16Z2iXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25maWdSb3cuc3R5bGUuYm9yZGVyQ29sb3IgPSBcInZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKVwiO1xyXG4gICAgICAgICAgICAgICAgY29uZmlnUm93LnN0eWxlLnRyYW5zZm9ybSA9IFwiXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8g6YWN572u5ZCN56ewXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ05hbWUgPSBjb25maWdSb3cuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG4gICAgICAgICAgICAgICAgY2xzOiBcImNvbmZpZy1uYW1lXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNvbmZpZ05hbWUuc3R5bGUuZmxleCA9IFwiMVwiO1xyXG4gICAgICAgICAgICBjb25maWdOYW1lLnN0eWxlLmZvbnRTaXplID0gXCIxNHB4XCI7XHJcbiAgICAgICAgICAgIGNvbmZpZ05hbWUuc3R5bGUuY29sb3IgPSBjb25maWcuZW5hYmxlZCA/IFwidmFyKC0tdGV4dC1ub3JtYWwpXCIgOiBcInZhcigtLXRleHQtbXV0ZWQpXCI7XHJcbiAgICAgICAgICAgIGNvbmZpZ05hbWUudGV4dENvbnRlbnQgPSBjb25maWcubmFtZTtcclxuXHJcbiAgICAgICAgICAgIC8vIOaTjeS9nOaMiemSruWuueWZqFxyXG4gICAgICAgICAgICBjb25zdCBidXR0b25Db250YWluZXIgPSBjb25maWdSb3cuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG4gICAgICAgICAgICAgICAgY2xzOiBcImNvbmZpZy1idXR0b25zXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGJ1dHRvbkNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgICAgIGJ1dHRvbkNvbnRhaW5lci5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgYnV0dG9uQ29udGFpbmVyLnN0eWxlLmdhcCA9IFwiOHB4XCI7XHJcblxyXG4gICAgICAgICAgICAvLyDlkK/nlKgv56aB55So5oyJ6ZKu77yIZW1vamkg5Zu+5b2i77yJXHJcbiAgICAgICAgICAgIGNvbnN0IHRvZ2dsZUJ1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcbiAgICAgICAgICAgICAgICBjbHM6IFwiY29uZmlnLWJ1dHRvblwiXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0b2dnbGVCdXR0b24uc3R5bGUud2lkdGggPSBcIjIwcHhcIjtcclxuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmhlaWdodCA9IFwiMjBweFwiO1xyXG4gICAgICAgICAgICB0b2dnbGVCdXR0b24uc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgICAgICB0b2dnbGVCdXR0b24uc3R5bGUuYWxpZ25JdGVtcyA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwiY2VudGVyXCI7XHJcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5ib3JkZXIgPSBcIm5vbmVcIjtcclxuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmJhY2tncm91bmQgPSBcInRyYW5zcGFyZW50XCI7XHJcbiAgICAgICAgICAgIHRvZ2dsZUJ1dHRvbi5zdHlsZS5jb2xvciA9IGNvbmZpZy5lbmFibGVkID8gXCJ2YXIoLS10ZXh0LW5vcm1hbClcIiA6IFwidmFyKC0tdGV4dC1tdXRlZClcIjtcclxuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xyXG4gICAgICAgICAgICB0b2dnbGVCdXR0b24udGV4dENvbnRlbnQgPSBjb25maWcuZW5hYmxlZCA/IFwi4pqhXCIgOiBcIvCflLRcIjtcclxuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLnRpdGxlID0gY29uZmlnLmVuYWJsZWQgPyBcIuemgeeUqOmFjee9rlwiIDogXCLlkK/nlKjphY3nva5cIjtcclxuICAgICAgICAgICAgdG9nZ2xlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3MgJiYgXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3NbaW5kZXhdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3NbaW5kZXhdLmVuYWJsZWQgPSAhY29uZmlnLmVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rumhtemdolxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIOmFjee9ruaMiemSru+8iGVtb2ppIOWbvuW9ou+8iVxyXG4gICAgICAgICAgICBjb25zdCBzZXR0aW5nc0J1dHRvbiA9IGJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcbiAgICAgICAgICAgICAgICBjbHM6IFwiY29uZmlnLWJ1dHRvblwiXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBzZXR0aW5nc0J1dHRvbi5zdHlsZS53aWR0aCA9IFwiMjBweFwiO1xyXG4gICAgICAgICAgICBzZXR0aW5nc0J1dHRvbi5zdHlsZS5oZWlnaHQgPSBcIjIwcHhcIjtcclxuICAgICAgICAgICAgc2V0dGluZ3NCdXR0b24uc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgICAgICBzZXR0aW5nc0J1dHRvbi5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgc2V0dGluZ3NCdXR0b24uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcImNlbnRlclwiO1xyXG4gICAgICAgICAgICBzZXR0aW5nc0J1dHRvbi5zdHlsZS5ib3JkZXIgPSBcIm5vbmVcIjtcclxuICAgICAgICAgICAgc2V0dGluZ3NCdXR0b24uc3R5bGUuYmFja2dyb3VuZCA9IFwidHJhbnNwYXJlbnRcIjtcclxuICAgICAgICAgICAgc2V0dGluZ3NCdXR0b24uc3R5bGUuY29sb3IgPSBcInZhcigtLXRleHQtbXV0ZWQpXCI7XHJcbiAgICAgICAgICAgIHNldHRpbmdzQnV0dG9uLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xyXG4gICAgICAgICAgICBzZXR0aW5nc0J1dHRvbi50ZXh0Q29udGVudCA9IFwi4pqZ77iPXCI7XHJcbiAgICAgICAgICAgIHNldHRpbmdzQnV0dG9uLnRpdGxlID0gXCLphY3nva5cIjtcclxuICAgICAgICAgICAgc2V0dGluZ3NCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIOaJk+W8gOivpue7humFjee9ruWvueivneahhlxyXG4gICAgICAgICAgICAgICAgbmV3IENhcHR1cmVUb0NvbmZpZ01vZGFsKHtcclxuICAgICAgICAgICAgICAgICAgICBwbHVnaW46IHRoaXMucGx1Z2luLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzogY29uZmlnLFxyXG4gICAgICAgICAgICAgICAgICAgIG9uU2F2ZTogKHVwZGF0ZWRDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6YWN572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnSW5kZXggPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncy5maW5kSW5kZXgoYyA9PiBjLmlkID09PSB1cGRhdGVkQ29uZmlnLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25maWdJbmRleCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlnc1tjb25maWdJbmRleF0gPSB1cGRhdGVkQ29uZmlnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva7pobXpnaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyDlpI3liLbmjInpkq7vvIhlbW9qaSDlm77lvaLvvIlcclxuICAgICAgICAgICAgY29uc3QgZHVwbGljYXRlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICAgICAgICAgIGNsczogXCJjb25maWctYnV0dG9uXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGR1cGxpY2F0ZUJ1dHRvbi5zdHlsZS53aWR0aCA9IFwiMjBweFwiO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVCdXR0b24uc3R5bGUuaGVpZ2h0ID0gXCIyMHB4XCI7XHJcbiAgICAgICAgICAgIGR1cGxpY2F0ZUJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgICAgIGR1cGxpY2F0ZUJ1dHRvbi5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgZHVwbGljYXRlQnV0dG9uLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgZHVwbGljYXRlQnV0dG9uLnN0eWxlLmJvcmRlciA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVCdXR0b24uc3R5bGUuYmFja2dyb3VuZCA9IFwidHJhbnNwYXJlbnRcIjtcclxuICAgICAgICAgICAgZHVwbGljYXRlQnV0dG9uLnN0eWxlLmNvbG9yID0gXCJ2YXIoLS10ZXh0LW11dGVkKVwiO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVCdXR0b24uc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XHJcbiAgICAgICAgICAgIGR1cGxpY2F0ZUJ1dHRvbi50ZXh0Q29udGVudCA9IFwi8J+Ti1wiO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVCdXR0b24udGl0bGUgPSBcIuWkjeWItlwiO1xyXG4gICAgICAgICAgICBkdXBsaWNhdGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uumFjee9ruWJr+acrFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cGxpY2F0ZWRDb25maWcgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZykpIGFzIENhcHR1cmVUb0NvbmZpZztcclxuICAgICAgICAgICAgICAgICAgICBkdXBsaWNhdGVkQ29uZmlnLmlkID0gYGNvbmZpZy0ke0RhdGUubm93KCl9YDtcclxuICAgICAgICAgICAgICAgICAgICBkdXBsaWNhdGVkQ29uZmlnLm5hbWUgPSBgJHtjb25maWcubmFtZX0gKOWJr+acrClgO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOWIsOmFjee9ruWIl+ihqFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzLnB1c2goZHVwbGljYXRlZENvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rumhtemdolxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIC8vIOmHjeWRveWQjeaMiemSru+8iGVtb2ppIOWbvuW9ou+8iVxyXG4gICAgICAgICAgICBjb25zdCByZW5hbWVCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICAgICAgY2xzOiBcImNvbmZpZy1idXR0b25cIlxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLnN0eWxlLndpZHRoID0gXCIyMHB4XCI7XHJcbiAgICAgICAgICAgIHJlbmFtZUJ1dHRvbi5zdHlsZS5oZWlnaHQgPSBcIjIwcHhcIjtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLnN0eWxlLmFsaWduSXRlbXMgPSBcImNlbnRlclwiO1xyXG4gICAgICAgICAgICByZW5hbWVCdXR0b24uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcImNlbnRlclwiO1xyXG4gICAgICAgICAgICByZW5hbWVCdXR0b24uc3R5bGUuYm9yZGVyID0gXCJub25lXCI7XHJcbiAgICAgICAgICAgIHJlbmFtZUJ1dHRvbi5zdHlsZS5iYWNrZ3JvdW5kID0gXCJ0cmFuc3BhcmVudFwiO1xyXG4gICAgICAgICAgICByZW5hbWVCdXR0b24uc3R5bGUuY29sb3IgPSBcInZhcigtLXRleHQtbXV0ZWQpXCI7XHJcbiAgICAgICAgICAgIHJlbmFtZUJ1dHRvbi5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLnRleHRDb250ZW50ID0gXCLinI/vuI9cIjtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLnRpdGxlID0gXCLph43lkb3lkI1cIjtcclxuICAgICAgICAgICAgcmVuYW1lQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyDph43lkb3lkI3mqKHmgIHmoYZcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld05hbWUgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmcgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IChyZXF1aXJlKCdvYnNpZGlhbicpLk1vZGFsKSh0aGlzLmFwcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwudGl0bGVFbC5zZXRUZXh0KFwi6YeN5ZG95ZCN6YWN572uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBg6K+36L6T5YWl5paw55qE6YWN572u5ZCN56ew77yaYFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gbW9kYWwuY29udGVudEVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcInRleHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbmZpZy5uYW1lXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS5wYWRkaW5nID0gXCI4cHhcIjtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEwcHhcIjtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIjtcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiKTtcclxuICAgICAgICAgICAgICAgICAgICBidXR0b25Db250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbkNvbnRhaW5lci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwiZmxleC1lbmRcIjtcclxuICAgICAgICAgICAgICAgICAgICBidXR0b25Db250YWluZXIuc3R5bGUuZ2FwID0gXCIxMHB4XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uQ29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IFwiMjBweFwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIuWPlua2iFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbHM6IFwibW9kLWJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGFsLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpcm1CdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIuehruiupFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbHM6IFwibW9kLWN0YVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlybUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGlucHV0LnZhbHVlLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyDlm57ovabplK7noa7orqRcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gaW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6Ieq5Yqo6IGa54Sm6L6T5YWl5qGGXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBpbnB1dC5mb2N1cygpLCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG5ld05hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDphY3nva7lkI3np7BcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3MgJiYgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzW2luZGV4XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlnc1tpbmRleF0ubmFtZSA9IG5ld05hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN5paw5riy5p+T6K6+572u6aG16Z2iXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyDliKDpmaTmjInpkq7vvIhlbW9qaSDlm77lvaLvvIlcclxuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICAgICAgICAgIGNsczogXCJjb25maWctYnV0dG9uXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi5zdHlsZS53aWR0aCA9IFwiMjBweFwiO1xyXG4gICAgICAgICAgICBkZWxldGVCdXR0b24uc3R5bGUuaGVpZ2h0ID0gXCIyMHB4XCI7XHJcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gXCJjZW50ZXJcIjtcclxuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLnN0eWxlLmJvcmRlciA9IFwibm9uZVwiO1xyXG4gICAgICAgICAgICBkZWxldGVCdXR0b24uc3R5bGUuYmFja2dyb3VuZCA9IFwidHJhbnNwYXJlbnRcIjtcclxuICAgICAgICAgICAgZGVsZXRlQnV0dG9uLnN0eWxlLmNvbG9yID0gXCJ2YXIoLS10ZXh0LW11dGVkKVwiO1xyXG4gICAgICAgICAgICBkZWxldGVCdXR0b24uc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XHJcbiAgICAgICAgICAgIGRlbGV0ZUJ1dHRvbi50ZXh0Q29udGVudCA9IFwi8J+Xke+4j1wiO1xyXG4gICAgICAgICAgICBkZWxldGVCdXR0b24udGl0bGUgPSBcIuWIoOmZpFwiO1xyXG4gICAgICAgICAgICBkZWxldGVCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIOehruiupOWIoOmZpFxyXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlybWVkID0gYXdhaXQgbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyAocmVxdWlyZSgnb2JzaWRpYW4nKS5Nb2RhbCkodGhpcy5hcHApO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vZGFsLnRpdGxlRWwuc2V0VGV4dChcIuehruiupOWIoOmZpFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBtb2RhbC5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogYOehruWumuimgeWIoOmZpOmFjee9riBcIiR7Y29uZmlnLm5hbWV9XCIg5ZCX77yfYFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbkNvbnRhaW5lciA9IG1vZGFsLmNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiKTtcclxuICAgICAgICAgICAgICAgICAgICBidXR0b25Db250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbkNvbnRhaW5lci5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwiZmxleC1lbmRcIjtcclxuICAgICAgICAgICAgICAgICAgICBidXR0b25Db250YWluZXIuc3R5bGUuZ2FwID0gXCIxMHB4XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9uQ29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IFwiMjBweFwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYW5jZWxCdXR0b24gPSBidXR0b25Db250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBcIuWPlua2iFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbHM6IFwibW9kLWJ1dHRvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RhbC5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maXJtQnV0dG9uID0gYnV0dG9uQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogXCLliKDpmaRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xzOiBcIm1vZC1kYW5nZXJcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpcm1CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kYWwuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpcm1lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOS7jumFjee9ruWIl+ihqOS4reWIoOmZpFxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva7pobXpnaJcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g5re75Yqg5paw6YWN572u55qE6L6T5YWl5qGG5ZKM5oyJ6ZKu77yM5qih5Lu/IFF1aWNrQWRkIOeahOagt+W8j1xyXG4gICAgICAgIGNvbnN0IGFkZENvbmZpZ0NvbnRhaW5lciA9IHNlY3Rpb24uY3JlYXRlRWwoXCJkaXZcIiwge1xyXG4gICAgICAgICAgICBjbHM6IFwiYWRkLWNvbmZpZy1jb250YWluZXJcIlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGFkZENvbmZpZ0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCI7XHJcbiAgICAgICAgYWRkQ29uZmlnQ29udGFpbmVyLnN0eWxlLmFsaWduSXRlbXMgPSBcImNlbnRlclwiO1xyXG4gICAgICAgIGFkZENvbmZpZ0NvbnRhaW5lci5zdHlsZS5nYXAgPSBcIjhweFwiO1xyXG4gICAgICAgIGFkZENvbmZpZ0NvbnRhaW5lci5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEycHhcIjtcclxuICAgICAgICBhZGRDb25maWdDb250YWluZXIuc3R5bGUucGFkZGluZyA9IFwiOHB4XCI7XHJcbiAgICAgICAgYWRkQ29uZmlnQ29udGFpbmVyLnN0eWxlLmJvcmRlciA9IFwiMXB4IGRhc2hlZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIjtcclxuICAgICAgICBhZGRDb25maWdDb250YWluZXIuc3R5bGUuYm9yZGVyUmFkaXVzID0gXCI0cHhcIjtcclxuXHJcbiAgICAgICAgLy8g5ZCN56ew6L6T5YWl5qGGXHJcbiAgICAgICAgY29uc3QgbmFtZUlucHV0ID0gYWRkQ29uZmlnQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG4gICAgICAgICAgICB0eXBlOiBcInRleHRcIixcclxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IFwi5ZCN56ewXCIsXHJcbiAgICAgICAgICAgIGNsczogXCJhZGQtY29uZmlnLWlucHV0XCJcclxuICAgICAgICB9KTtcclxuICAgICAgICBuYW1lSW5wdXQuc3R5bGUuZmxleCA9IFwiMVwiO1xyXG4gICAgICAgIG5hbWVJbnB1dC5zdHlsZS5wYWRkaW5nID0gXCI2cHggOHB4XCI7XHJcbiAgICAgICAgbmFtZUlucHV0LnN0eWxlLmJvcmRlciA9IFwiMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKVwiO1xyXG4gICAgICAgIG5hbWVJbnB1dC5zdHlsZS5ib3JkZXJSYWRpdXMgPSBcIjRweFwiO1xyXG4gICAgICAgIG5hbWVJbnB1dC5zdHlsZS5mb250U2l6ZSA9IFwiMTRweFwiO1xyXG5cclxuICAgICAgICAvLyDmt7vliqDmjInpkq5cclxuICAgICAgICBjb25zdCBhZGRCdXR0b24gPSBhZGRDb25maWdDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICB0ZXh0OiBcIuaWsOW7uumFjee9rlwiLFxyXG4gICAgICAgICAgICBjbHM6IFwibW9kLWN0YSBhZGQtY29uZmlnLWJ1dHRvblwiXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYWRkQnV0dG9uLnN0eWxlLnBhZGRpbmcgPSBcIjZweCAxNnB4XCI7XHJcbiAgICAgICAgYWRkQnV0dG9uLnN0eWxlLmZvbnRTaXplID0gXCIxNHB4XCI7XHJcbiAgICAgICAgYWRkQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBuYW1lSW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCLphY3nva7lkI3np7DkuI3og73kuLrnqbpcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuaWsOmFjee9rlxyXG4gICAgICAgICAgICBjb25zdCBuZXdDb25maWc6IENhcHR1cmVUb0NvbmZpZyA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBgY29uZmlnLSR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJcIixcclxuICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IFwic2luZ2xlLWxpbmVcIixcclxuICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IFwiXCJcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCJ7e1RBU0tfVEVYVH19XFxuXCJcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgdGFzazogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGluc2VydEFmdGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbjogXCJib3R0b21cIlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvcGVuRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBmaWxlT3BlbmluZzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vZGU6IFwiZGVmYXVsdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIixcclxuICAgICAgICAgICAgICAgIGN1c3RvbUR1ZURheXM6IDBcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIC8vIOa3u+WKoOWIsOmFjee9ruWIl+ihqFxyXG4gICAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzLnB1c2gobmV3Q29uZmlnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5riF56m66L6T5YWl5qGGXHJcbiAgICAgICAgICAgICAgICBuYW1lSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva7pobXpnaJcclxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOWbnui9pumUrua3u+WKoFxyXG4gICAgICAgIG5hbWVJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuICAgICAgICAgICAgICAgIGFkZEJ1dHRvbi5jbGljaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOm7mOiupOmFjee9ruaMiemSrlxyXG4gICAgICAgIGNvbnN0IGRlZmF1bHRDb25maWdCdXR0b24gPSBhZGRDb25maWdDb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgICAgICB0ZXh0OiBcIum7mOiupOmFjee9rlwiLFxyXG4gICAgICAgICAgICBjbHM6IFwibW9kLWJ1dHRvblwiXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZGVmYXVsdENvbmZpZ0J1dHRvbi5zdHlsZS5wYWRkaW5nID0gXCI2cHggMTZweFwiO1xyXG4gICAgICAgIGRlZmF1bHRDb25maWdCdXR0b24uc3R5bGUuZm9udFNpemUgPSBcIjE0cHhcIjtcclxuICAgICAgICBkZWZhdWx0Q29uZmlnQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIOaBouWkjem7mOiupOmFjee9rlxyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdENvbmZpZ3M6IENhcHR1cmVUb0NvbmZpZ1tdID0gW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcImZsZWV0aW5nTm90ZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6k6Zeq5b+1XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwi6buY6K6k55qE6Zeq5b+15o2V6I635o+S5YWl6YWN572uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGg6IFwie3vpl6rlv7V9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+mXquW/teaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwie3tUQVNLX1RFWFR9fVxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2lkZXJTdWJzZWN0aW9uczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcInJlY29yZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6k6K6w5b2VXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwi6buY6K6k55qE6K6w5b2V5o2V6I635o+S5YWl6YWN572uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGg6IFwie3vml6XorrB9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+aXpeiusOaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwie3tUQVNLX1RFWFR9fVxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDml6XluLjorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ0YXNrXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLpu5jorqTku7vliqFcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLpu5jorqTnmoTmjZXojrfmj5LlhaXphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcInNpbmdsZS1saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pel6K6w5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCJ7e1RBU0tfVEVYVH19XFxuXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHByZXBlbmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRhc2s6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5pel5bi46K6w5b2VXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlT3BlbmluZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogXCJ0YWJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcInZlcnRpY2FsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGU6IFwiZGVmYXVsdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1czogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJkYWlseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6kZGFpbHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7mr4/ml6XnrJTorrDnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcIm5vbmVcIixcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IFwie3vml6XorrDmqKHmnb99fVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBcInt7VEFTS19URVhUfX1cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5pel5bi46K6w5b2VXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ3ZWVrbHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupHdlZWtseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIuS4k+mXqOeUqOS6juWRqOaKpeeahOmFjee9rlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdENhcHR1cmVQYXRoOiBcInt75ZGo5oqlfX1cIixcclxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBob3RrZXk6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IFwibm9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+WRqOaKpeaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwiIyMge3tUQVNLX1RFWFR9fVxcblxcbi0g5pys5ZGo5bel5L2cOiBcXG4tIOS4i+WRqOiuoeWIkjogXFxuLSDpgYfliLDpl67popg6IFxcblxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDlt6XkvZzorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGRDcmVhdGVkRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZER1ZURhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIixcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21EdWVEYXlzOiAwXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcIm1vbnRobHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupG1vbnRobHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7mnIjmiqXnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+m7mOiupG1vbnRobHl9fVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJub25lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pyI5oql5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCIjIyB7e1RBU0tfVEVYVH19XFxuXFxuLSDmnKzmnIjlt6XkvZw6IFxcbi0g5LiL5pyI6K6h5YiSOiBcXG4tIOaAu+e7k+WPjeaAnTogXFxuXFxuXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHByZXBlbmQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRhc2s6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGluc2VydEFmdGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiBcIiMjIOaciOW6puaAu+e7k1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRBdEVuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2lkZXJTdWJzZWN0aW9uczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbjogXCJib3R0b21cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGluZUNhcHR1cmU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJiZWxvd1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcGVuRmlsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlT3BlbmluZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogXCJ0YWJcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcInZlcnRpY2FsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGU6IFwiZGVmYXVsdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2N1czogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZENyZWF0ZWREYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZU9wdGlvbjogXCJ0b2RheVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUR1ZURheXM6IDBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IFwicXVhcnRlcmx5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLpu5jorqRxdWFydGVybHlcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7lraPmiqXnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+Wto+aKpX19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcIm5vbmVcIixcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IFwie3vlraPmiqXmqKHmnb99fVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBcIiMjIHt7VEFTS19URVhUfX1cXG5cXG4tIOacrOWto+W3peS9nDogXFxuLSDkuIvlraPorqHliJI6IFxcbi0g5a2j5bqm5Y+N5oCdOiBcXG5cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5a2j5bqm5oC757uTXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJ5ZWFybHlcIixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIum7mOiupHllYXJseVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIuS4k+mXqOeUqOS6juW5tOaKpeeahOmFjee9rlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdENhcHR1cmVQYXRoOiBcInt75bm05oqlfX1cIixcclxuICAgICAgICAgICAgICAgICAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBob3RrZXk6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IFwibm9uZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+W5tOaKpeaooeadv319XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwiIyMge3tUQVNLX1RFWFR9fVxcblxcbi0g5pys5bm05bel5L2cOiBcXG4tIOaYjuW5tOiuoeWIkjogXFxuLSDlubTluqblj43mgJ06IFxcbi0g55uu5qCH6L6+5oiQOiBcXG5cXG5cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcHJlcGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kTGluazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFzazogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5bm05bqm5oC757uTXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG9wZW5GaWxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBcInRhYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwidmVydGljYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGREdWVEYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBkdWVEYXRlT3B0aW9uOiBcInRvZGF5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRHVlRGF5czogMFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogXCJtZWV0aW5nXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCLkvJrorq7nrJTorrBcIixcclxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCLkuJPpl6jnlKjkuo7kvJrorq7nrJTorrDnmoTphY3nva5cIixcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aDogXCJ7e+aXpeiusH19XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FwdHVyZVRvQWN0aXZlRmlsZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaG90a2V5OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBcInNpbmdsZS1saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVXaXRoVGVtcGxhdGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBcInt75pel6K6w5qih5p2/fX1cIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDogXCIjIyB7e1RBU0tfVEVYVH19XFxuXFxuLSDml7bpl7Q6IHt7REFURX19XFxuLSDlnLDngrk6IFxcbi0g5Y+C5LiO5Lq65ZGYOiBcXG4tIOWGheWuuTogXFxuLSDooYzliqjpobk6IFxcblxcblwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwcmVwZW5kOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRMaW5rOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICB0YXNrOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBpbnNlcnRBZnRlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogXCIjIyDml6XluLjorrDlvZVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNpZGVyU3Vic2VjdGlvbnM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IFwiYm90dG9tXCJcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IFwiYmVsb3dcIlxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlbkZpbGU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU9wZW5pbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb246IFwidGFiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogXCJ2ZXJ0aWNhbFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBcImRlZmF1bHRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXM6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9BZGRDcmVhdGVkRGF0ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b0FkZER1ZURhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIixcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21EdWVEYXlzOiAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgICAvLyDmuIXnqbrnjrDmnInphY3nva7lubbmt7vliqDpu5jorqTphY3nva5cclxuICAgICAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MuY29uZmlncyA9IGRlZmF1bHRDb25maWdzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgLy8g6YeN5paw5riy5p+T6K6+572u6aG16Z2iXHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgcmVuZGVyTm90ZVNldHRpbmdzKFxyXG4gICAgICAgIHRpdGxlOiBzdHJpbmcsXHJcbiAgICAgICAgc2V0dGluZ3M6IE5vdGVUZW1wbGF0ZVNldHRpbmdzLFxyXG4gICAgICAgIG9uQ2hhbmdlOiAobmV3U2V0dGluZ3M6IE5vdGVUZW1wbGF0ZVNldHRpbmdzKSA9PiB2b2lkXHJcbiAgICApIHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInNldHRpbmctc2VjdGlvblwifSk7XHJcbiAgICAgICAgc2VjdGlvbi5jcmVhdGVFbChcImg0XCIsIHt0ZXh0OiB0aXRsZX0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiuoeeul+mihOiniOaXpeacn++8iOagueaNruS4jeWQjOeslOiusOexu+Wei+S9v+eUqOS4jeWQjOeahOaXpeacn++8iVxyXG4gICAgICAgIGxldCBwcmV2aWV3RGF0ZTogRGF0ZTtcclxuICAgICAgICBzd2l0Y2ggKHRpdGxlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgXCLlkajmiqXorr7nva5cIjpcclxuICAgICAgICAgICAgICAgIC8vIOS9v+eUqOW9k+WJjeWRqOeahOWRqOS4gOS9nOS4uumihOiniOaXpeacn1xyXG4gICAgICAgICAgICAgICAgcHJldmlld0RhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGF5T2ZXZWVrID0gcHJldmlld0RhdGUuZ2V0RGF5KCk7XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZS5zZXREYXRlKHByZXZpZXdEYXRlLmdldERhdGUoKSArIChkYXlPZldlZWsgPT09IDAgPyAtNiA6IDEpIC0gZGF5T2ZXZWVrKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFwi5pyI5oql6K6+572uXCI6XHJcbiAgICAgICAgICAgICAgICAvLyDkvb/nlKjlvZPmnIgx5pel5L2c5Li66aKE6KeI5pel5pyfXHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZS5zZXREYXRlKDEpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCLlraPmiqXorr7nva5cIjpcclxuICAgICAgICAgICAgICAgIC8vIOS9v+eUqOW9k+Wto+esrOS4gOWkqeS9nOS4uumihOiniOaXpeacn1xyXG4gICAgICAgICAgICAgICAgcHJldmlld0RhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudE1vbnRoID0gcHJldmlld0RhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJTdGFydE1vbnRoID0gTWF0aC5mbG9vcihjdXJyZW50TW9udGggLyAzKSAqIDM7XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZS5zZXRNb250aChxdWFydGVyU3RhcnRNb250aCk7XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZS5zZXREYXRlKDEpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgXCLlubTmiqXorr7nva5cIjpcclxuICAgICAgICAgICAgICAgIC8vIOS9v+eUqOW9k+W5tDHmnIgx5pel5L2c5Li66aKE6KeI5pel5pyfXHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZS5zZXRNb250aCgwKTtcclxuICAgICAgICAgICAgICAgIHByZXZpZXdEYXRlLnNldERhdGUoMSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBcIuaXpeiusOiuvue9rlwiOlxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgLy8g5L2/55So5b2T5YmN5pel5pyf5L2c5Li66aKE6KeI5pel5pyfXHJcbiAgICAgICAgICAgICAgICBwcmV2aWV3RGF0ZSA9IG5ldyBEYXRlKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6aKE6KeI5YWD57Sg5byV55SoXHJcbiAgICAgICAgbGV0IGZ1bGxQYXRoUHJldmlld1RleHQ6IEhUTUxFbGVtZW50O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOW9k+WJjeiuvue9ruW8leeUqFxyXG4gICAgICAgIGxldCBjdXJyZW50U2V0dGluZ3MgPSBzZXR0aW5ncztcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrDpooTop4jlh73mlbBcclxuICAgICAgICBjb25zdCB1cGRhdGVQcmV2aWV3ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIWZ1bGxQYXRoUHJldmlld1RleHQpIHJldHVybjtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIOS9v+eUqGZvcm1hdERhdGXlh73mlbDnlJ/miJDmlofku7blkI3pooTop4hcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lUHJldmlldyA9IGZvcm1hdERhdGUocHJldmlld0RhdGUsIGN1cnJlbnRTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOeUn+aIkOWujOaVtOi3r+W+hOmihOiniFxyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGhQcmV2aWV3ID0gYCR7Y3VycmVudFNldHRpbmdzLnNhdmVQYXRofS8ke2ZpbGVOYW1lUHJldmlld30ubWRgO1xyXG4gICAgICAgICAgICAgICAgZnVsbFBhdGhQcmV2aWV3VGV4dC50ZXh0Q29udGVudCA9IGZ1bGxQYXRoUHJldmlldztcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoUHJldmlld1RleHQuc3R5bGUuY29sb3IgPSBcInZhcigtLXRleHQtbXV0ZWQpXCI7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBmdWxsUGF0aFByZXZpZXdUZXh0LnRleHRDb250ZW50ID0gXCLmoLzlvI/plJnor69cIjtcclxuICAgICAgICAgICAgICAgIGZ1bGxQYXRoUHJldmlld1RleHQuc3R5bGUuY29sb3IgPSBcInZhcigtLXRleHQtZXJyb3IpXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyDmlofku7blkI3moLzlvI/orr7nva5cclxuICAgICAgICBuZXcgU2V0dGluZyhzZWN0aW9uKVxyXG4gICAgICAgICAgICAuc2V0TmFtZShcIuaWh+S7tuWQjeagvOW8j1wiKVxyXG4gICAgICAgICAgICAuc2V0RGVzYyhg77yI5bm0LVlZWVnjgIHlkajmiYDlsZ7lubQtR0dHR+OAgeaciC1NTeOAgeaXpS1EROOAgeWRqOaVsC1XV+OAgeWtoy1RICAgICDkvovlpoLvvJogJHtzZXR0aW5ncy5maWxlTmFtZUZvcm1hdH3vvIlgKSAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHRleHRcclxuICAgICAgICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcIui+k+WFpeagvOW8j1wiKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1NldHRpbmdzID0geyAuLi5zZXR0aW5ncywgZmlsZU5hbWVGb3JtYXQ6IHZhbHVlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNldHRpbmdzID0gbmV3U2V0dGluZ3M7XHJcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2UobmV3U2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpooTop4hcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVQcmV2aWV3KCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIC8vIOS/neWtmOi3r+W+hOiuvue9rlxyXG4gICAgICAgIGxldCBzYXZlUGF0aElucHV0RWw6IEhUTUxJbnB1dEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgICAgICBjb25zdCBzYXZlUGF0aFNldHRpbmcgPSBuZXcgU2V0dGluZyhzZWN0aW9uKVxyXG4gICAgICAgICAgICAuc2V0TmFtZShcIuS/neWtmOi3r+W+hFwiKVxyXG4gICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHtcclxuICAgICAgICAgICAgICAgIHNhdmVQYXRoSW5wdXRFbCA9IHRleHQuaW5wdXRFbDtcclxuICAgICAgICAgICAgICAgIHRleHRcclxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUoc2V0dGluZ3Muc2F2ZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwi5L6L5aaC77ya5pel6K6wXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTZXR0aW5ncyA9IHsgLi4uc2V0dGluZ3MsIHNhdmVQYXRoOiB2YWx1ZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50U2V0dGluZ3MgPSBuZXdTZXR0aW5ncztcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2UobmV3U2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOmihOiniFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVQcmV2aWV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYnV0dG9uID0+IGJ1dHRvblxyXG4gICAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCLpgInmi6lcIilcclxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBuZXcgRm9sZGVyU2VsZWN0TW9kYWwodGhpcy5hcHAsIChmb2xkZXIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U2V0dGluZ3MgPSB7IC4uLnNldHRpbmdzLCBzYXZlUGF0aDogZm9sZGVyLnBhdGggfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNldHRpbmdzID0gbmV3U2V0dGluZ3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlKG5ld1NldHRpbmdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDovpPlhaXmoYbnmoTlgLxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNhdmVQYXRoSW5wdXRFbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGhJbnB1dEVsLnZhbHVlID0gZm9sZGVyLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6aKE6KeIXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVByZXZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KS5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIC8vIOaooeadv+i3r+W+hOiuvue9rlxyXG4gICAgICAgIGxldCB0ZW1wbGF0ZVBhdGhJbnB1dEVsOiBIVE1MSW5wdXRFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoc2VjdGlvbilcclxuICAgICAgICAgICAgLnNldE5hbWUoXCLmqKHmnb/ot6/lvoRcIilcclxuICAgICAgICAgICAgLnNldERlc2MoXCLmqKHmnb/mlofku7bnmoTot6/lvoRcIilcclxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVBhdGhJbnB1dEVsID0gdGV4dC5pbnB1dEVsO1xyXG4gICAgICAgICAgICAgICAgdGV4dFxyXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShzZXR0aW5ncy50ZW1wbGF0ZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwi5L6L5aaC77ya5qih5p2/L+aXpeiusOaooeadv1wiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSgodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U2V0dGluZ3MgPSB7IC4uLnNldHRpbmdzLCB0ZW1wbGF0ZVBhdGg6IHZhbHVlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRTZXR0aW5ncyA9IG5ld1NldHRpbmdzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZShuZXdTZXR0aW5ncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3NDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXHJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIumAieaLqVwiKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ldyBGaWxlU2VsZWN0TW9kYWwodGhpcy5hcHAsIChmaWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1NldHRpbmdzID0geyAuLi5zZXR0aW5ncywgdGVtcGxhdGVQYXRoOiBmaWxlLnBhdGggfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFNldHRpbmdzID0gbmV3U2V0dGluZ3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlKG5ld1NldHRpbmdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5nc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDovpPlhaXmoYbnmoTlgLxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlUGF0aElucHV0RWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlUGF0aElucHV0RWwudmFsdWUgPSBmaWxlLnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KS5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIC8vIOa3u+WKoOWujOaVtOi3r+W+hOmihOiniFxyXG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoUHJldmlld0NvbnRhaW5lciA9IHNhdmVQYXRoU2V0dGluZy5kZXNjRWwuY3JlYXRlRWwoXCJkaXZcIiwgeyBcclxuICAgICAgICAgICAgY2xzOiBcImZ1bGxQYXRoLXByZXZpZXdcIiwgXHJcbiAgICAgICAgICAgIHRleHQ6IFwi6Lev5b6E6aKE6KeI77yaXCIgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZnVsbFBhdGhQcmV2aWV3Q29udGFpbmVyLnN0eWxlLm1hcmdpblRvcCA9IFwiOHB4XCI7XHJcbiAgICAgICAgZnVsbFBhdGhQcmV2aWV3Q29udGFpbmVyLnN0eWxlLmNvbG9yID0gXCJ2YXIoLS10ZXh0LW11dGVkKVwiO1xyXG4gICAgICAgIGZ1bGxQYXRoUHJldmlld1RleHQgPSBmdWxsUGF0aFByZXZpZXdDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWIneWni+a4suafk+mihOiniFxyXG4gICAgICAgIHVwZGF0ZVByZXZpZXcoKTtcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgIH1cclxufVxyXG4iXX0=