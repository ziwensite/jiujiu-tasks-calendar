import {App, PluginSettingTab, Setting, Notice, TextComponent} from "obsidian";
import MyPlugin from "./main";
import { formatDate } from "./utils/dateUtils";
import { AddCaptureToConfigBox } from "./components";
import { FileSelectModal } from "./modals/FileSelectModal";
import { FolderSelectModal } from "./modals/FolderSelectModal";
import { CaptureToConfigModal } from "./views/calendar/modals/CaptureToConfigModal";
import { CommandSelectModal } from "./modals/CommandSelectModal";

export interface NoteTemplateSettings {
    savePath: string;
    templatePath: string;
    fileNameFormat: string;
}

export interface TaskInsertSettings {
    insertSection: string;
    insertPosition: "first" | "last";
}

export interface CreateFileIfItDoesntExist {
    enabled: boolean;
    createWithTemplate: boolean;
    template: string;
}

export interface FormatSettings {
    enabled: boolean;
    format: string;
}

export interface InsertAfterSettings {
    enabled: boolean;
    after: string;
    insertAtEnd: boolean;
    considerSubsections: boolean;
    createIfNotFound: boolean;
    createIfNotFoundLocation: "top" | "bottom";
}

export interface NewLineCaptureSettings {
    enabled: boolean;
    direction: "above" | "below";
}

export interface FileOpeningSettings {
    location: "reuse" | "tab" | "split" | "window" | "left-sidebar" | "right-sidebar";
    direction: "vertical" | "horizontal";
    mode: "preview" | "source" | "live" | "live-preview" | "default";
    focus: boolean;
}

export interface CaptureToConfig {
    id: string;
    name: string;
    description: string;
    
    // 基本设置
    enabled: boolean;
    defaultCapturePath: string;
    captureToActiveFile: boolean;
    
    // 快捷键设置
    hotkey: {
        modifiers: string[];
        key: string;
    } | null;
    
    // 输入方式设置
    inputMethod: "single-line" | "multi-line" | "none";
    
    // 文件创建设置
    createFileIfItDoesntExist: CreateFileIfItDoesntExist;
    
    // 格式化设置
    format: FormatSettings;
    
    // 插入设置
    prepend: boolean;
    appendLink: boolean;
    
    // 任务设置
    task: boolean;
    
    // 日期设置
    autoAddCreatedDate: boolean;
    autoAddDueDate: boolean;
    dueDateOption: "today" | "custom" | "weekend" | "monthEnd" | "yearEnd";
    customDueDays: number;
    
    // 插入位置设置
    insertAfter: InsertAfterSettings;
    newLineCapture: NewLineCaptureSettings;
    
    // 文件打开设置
    openFile: boolean;
    fileOpening: FileOpeningSettings;
}

export interface CaptureToSettings {
    enabled: boolean;
    fleetingNoteConfigId: string;
    recordConfigId: string;
    taskConfigId: string;
    configs: CaptureToConfig[];
}

export interface TaskSettings {
    // 捕获插入设置
    captureToSettings: CaptureToSettings;
    // 重复任务设置
    recurrenceSettings: {
        // 新任务添加位置：above 或 below
        newTaskPosition: "above" | "below";
    };
}

export interface TaskFilterSettings {
    customFilter: string;
}

// 更多标签设置
export interface CustomLabel {
    enabled: boolean;
    labelText: string;
    actionType: "systemCommand" | "openFile";
    systemCommand: string;
    filePath: string;
}

export interface MoreLabelSettings {
    lb1: CustomLabel;
    lb2: CustomLabel;
}


export interface MyPluginSettings {
    fleetingNote: NoteTemplateSettings;
    dailyNote: NoteTemplateSettings;
    weeklyNote: NoteTemplateSettings;
    monthlyNote: NoteTemplateSettings;
    quarterlyNote: NoteTemplateSettings;
    yearlyNote: NoteTemplateSettings;
    taskFilter: TaskFilterSettings;
    taskSettings: TaskSettings;
    moreLabelSettings: MoreLabelSettings;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
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
        fileNameFormat: "GGGG-[w]WW"
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
                        format: "- ==📝{{DATE:yyyy-MM-DD HH:mm}}==  {{TASK_TEXT}}  \n"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        format: "- 📝  {{TASK_TEXT}}  \n"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        format: "⏰  {{TASK_TEXT}}  \n"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
                        createIfNotFoundLocation: "bottom" as "top" | "bottom"
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
        },
        recurrenceSettings: {
            newTaskPosition: "below"
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
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;
    private settingsChanged: boolean = false;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();
        const header = containerEl.createEl("div", {cls: "setting-section"});
        header.style.textAlign = "center";
        header.style.marginBottom = "20px";
        header.createEl("h2", {text: "99日历设置"});

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

    private renderMoreLabelSettings(): void {
        const section = this.containerEl.createEl("div", {cls: "setting-section"});
        section.createEl("h4", {text: "自定义标签设置"});

        const moreSettings = this.plugin.settings.moreLabelSettings;

        this.renderCustomLabelSettings(section, "LB1", moreSettings.lb1);
        this.renderCustomLabelSettings(section, "LB2", moreSettings.lb2);
    }



    private renderCustomLabelSettings(section: HTMLElement, labelName: string, labelSettings: CustomLabel): void {
        const labelSection = section.createEl("div", {cls: "setting-section"});
        labelSection.createEl("h5", {text: `${labelName}设置`});

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
                    labelSettings.actionType = value as "systemCommand" | "openFile";
                    this.settingsChanged = true;
                    this.display();
                }));

        if (labelSettings.actionType === "systemCommand") {
            let commandInputTextComponent: TextComponent | null = null;
            const commandInput = new Setting(labelSection)
                .setName("系统命令")
                .setDesc("输入要执行的Obsidian系统命令ID")
                .addText(text => {
                    commandInputTextComponent = text;
                    text.setPlaceholder("例如：app:open-vault")
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
                    onCommandSelected: (commandId: string) => {
                        if (commandInputTextComponent) {
                            commandInputTextComponent.setValue(commandId);
                        }
                        labelSettings.systemCommand = commandId;
                        this.settingsChanged = true;
                    }
                }).open();
            });
        } else if (labelSettings.actionType === "openFile") {
            let filePathTextComponent: TextComponent | null = null;
            const filePathInput = new Setting(labelSection)
                .setName("文件路径")
                .setDesc("输入要打开的文件路径")
                .addText(text => {
                    filePathTextComponent = text;
                    text.setPlaceholder("例如：日记/2024-01-01.md")
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

    // 添加一个变量来存储 MutationObserver 实例
    private observer: MutationObserver | null = null;

    private registerEvents() {
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

    private async saveSettings() {
        await this.plugin.saveSettings();
        // 保存设置后刷新视图
        this.plugin.updateAllViews();
        new Notice("设置已保存并刷新视图");
    }

    private renderTaskFilterSettings(): void {
        const section = this.containerEl.createEl("div", {cls: "setting-section"});
        section.createEl("h4", {text: "任务列表设置"});

        // 自定义筛选设置
        new Setting(section)
            .setName("自定义筛选")
            .setDesc("规则：使用路径或标签，!表示排除，and、or、()逻辑组合。例如：(A or B) and #C - 路径A或B中包含标签#C的任务")
            .addTextArea(textArea => {
                textArea
                    .setPlaceholder("输入筛选规则")
                    .setValue(this.plugin.settings.taskFilter.customFilter)
                    .onChange((value: string) => {
                        this.plugin.settings.taskFilter.customFilter = value;
                        this.settingsChanged = true;
                    });
                // 设置文本域属性
                textArea.inputEl.rows = 4;
                textArea.inputEl.wrap = "soft";
                textArea.inputEl.style.resize = "vertical";
                textArea.inputEl.style.maxHeight = "100px";
            });
        
        // 重复任务设置
        new Setting(section)
            .setName("重复任务新任务位置")
            .setDesc("设置重复任务完成后，新任务的添加位置")
            .addDropdown(dropdown => {
                dropdown
                    .addOption("below", "当前任务下方")
                    .addOption("above", "当前任务上方")
                    .setValue(this.plugin.settings.taskSettings?.recurrenceSettings?.newTaskPosition || "below")
                    .onChange((value) => {
                        // 确保 recurrenceSettings 对象存在
                        if (!this.plugin.settings.taskSettings) {
                            this.plugin.settings.taskSettings = { captureToSettings: { enabled: false, fleetingNoteConfigId: "", recordConfigId: "", taskConfigId: "", configs: [] }, recurrenceSettings: { newTaskPosition: "below" } };
                        }
                        if (!this.plugin.settings.taskSettings.recurrenceSettings) {
                            this.plugin.settings.taskSettings.recurrenceSettings = { newTaskPosition: "below" };
                        }
                        this.plugin.settings.taskSettings.recurrenceSettings.newTaskPosition = value as "above" | "below";
                        this.settingsChanged = true;
                    });
            });
    }

    private renderTaskSettings(): void {
        // 任务创建设置已移至 Capture To 设置中
    }

    private renderCaptureToSettings(): void {
        const section = this.containerEl.createEl("div", {cls: "setting-section"});
        section.createEl("h4", {text: "捕获插入设置"});

        const captureSettings = this.plugin.settings.taskSettings.captureToSettings;

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
        const configsHeader = section.createEl("div", {cls: "setting-header"});
        configsHeader.createEl("h4", {text: "配置列表"});

        // 拖拽排序相关变量
        let draggedElement: HTMLElement | null = null;
        let dragStartIndex: number = -1;

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
                    const htmlEl = el as HTMLElement;
                    htmlEl.style.borderColor = "var(--background-modifier-border)";
                    htmlEl.style.transform = "";
                });
            });

            // 拖拽经过事件
            configRow.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (draggedElement === configRow) return;
                
                // 计算拖拽位置
                const rect = configRow.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                // 显示拖拽提示
                if (y < rect.height / 2) {
                    // 拖拽到上方
                    configRow.style.transform = "translateY(8px)";
                } else {
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
                    const duplicatedConfig = JSON.parse(JSON.stringify(config)) as CaptureToConfig;
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
            renameButton.addEventListener("click", async () => {
                // 重命名模态框
                const newName = await new Promise<string | null>((resolve) => {
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
                    input.addEventListener("keypress", (e: KeyboardEvent) => {
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
            });

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
            deleteButton.addEventListener("click", async () => {
                // 确认删除
                const confirmed = await new Promise<boolean>((resolve) => {
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
            });
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
            const newConfig: CaptureToConfig = {
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
                const defaultConfigs: CaptureToConfig[] = [
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
                        format: "- ==📝{{DATE:yyyy-MM-DD HH:mm}}==  {{TASK_TEXT}}  \n"
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
                        format: "- 📝  {{TASK_TEXT}}  \n"
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
                        format: "⏰  {{TASK_TEXT}}  \n"
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

    private renderNoteSettings(
        title: string,
        settings: NoteTemplateSettings,
        onChange: (newSettings: NoteTemplateSettings) => void
    ) {
        const section = this.containerEl.createEl("div", {cls: "setting-section"});
        section.createEl("h4", {text: title});
        
        // 计算预览日期（根据不同笔记类型使用不同的日期）
        let previewDate: Date;
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
        let fullPathPreviewText: HTMLElement;
        
        // 当前设置引用
        let currentSettings = settings;
        
        // 更新预览函数
        const updatePreview = () => {
            if (!fullPathPreviewText) return;
            try {
                // 使用formatDate函数生成文件名预览
                const fileNamePreview = formatDate(previewDate, currentSettings.fileNameFormat);
                
                // 生成完整路径预览
                const fullPathPreview = `${currentSettings.savePath}/${fileNamePreview}.md`;
                fullPathPreviewText.textContent = fullPathPreview;
                fullPathPreviewText.style.color = "var(--text-muted)";
            } catch (error) {
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
                    const newSettings = { ...currentSettings, fileNameFormat: value };
                    currentSettings = newSettings;
                    onChange(newSettings);
                    this.settingsChanged = true;
                    // 更新预览
                    updatePreview();
                }));

        // 保存路径设置
        let savePathInputEl: HTMLInputElement | null = null;
        const savePathSetting = new Setting(section)
            .setName("保存路径")
            .addText(text => {
                savePathInputEl = text.inputEl;
                text
                    .setValue(settings.savePath)
                    .setPlaceholder("例如：日记")
                    .onChange((value) => {
                        const newSettings = { ...currentSettings, savePath: value };
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
                        const newSettings = { ...currentSettings, savePath: folder.path };
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
        let templatePathInputEl: HTMLInputElement | null = null;
        new Setting(section)
            .setName("模板路径")
            .setDesc("模板文件的路径")
            .addText(text => {
                templatePathInputEl = text.inputEl;
                text
                    .setValue(settings.templatePath)
                    .setPlaceholder("例如：模板/日记模板")
                    .onChange((value) => {
                        const newSettings = { ...currentSettings, templatePath: value };
                        currentSettings = newSettings;
                        onChange(newSettings);
                        this.settingsChanged = true;
                    });
            })
            .addButton(button => button
                .setButtonText("选择")
                .onClick(() => {
                    new FileSelectModal(this.app, (file) => {
                        const newSettings = { ...currentSettings, templatePath: file.path };
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
