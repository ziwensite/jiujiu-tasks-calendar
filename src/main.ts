import {App, Plugin, WorkspaceLeaf} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import {CalendarView} from "./views/CalendarView";

export class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();
        
        // 暴露插件实例到 window 对象，以便其他模块访问
        (window as any).jiujiuObsidianCalendarPlugin = {
            instance: this
        };

        // 注册视图
        this.registerView(
            "jiujiu-calendar-view",
            (leaf) => new CalendarView(leaf, this)
        );

        // 添加侧边栏按钮
        this.addRibbonIcon('calendar', 'JiuJiu Calendar', (evt: MouseEvent) => {
            this.activateView();
        });

        // 添加命令来切换视图
        this.addCommand({
            id: "open-calendar-view",
            name: "Open Calendar View",
            callback: () => this.activateView(),
        });

        // 加载设置页
        this.addSettingTab(new SampleSettingTab(this.app, this));
        
        // 插件启用时自动打开默认视图
        this.activateView();
    }

    onunload() {
        this.app.workspace.detachLeavesOfType("jiujiu-calendar-view");
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType("jiujiu-calendar-view");

        if (leaves.length > 0 && leaves[0]) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: "jiujiu-calendar-view",
                    active: true,
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        const savedSettings = await this.loadData() as Partial<MyPluginSettings>;
        
        // 深度合并设置，确保嵌套对象也能正确合并
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...savedSettings,
            // 确保taskSettings包含所有必需的嵌套属性
            taskSettings: {
                ...DEFAULT_SETTINGS.taskSettings,
                ...savedSettings.taskSettings
            }
        };

        // 设置加载完成后注册快捷键命令
        this.registerCaptureToHotkeys();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // 保存设置后重新注册快捷键
        this.registerCaptureToHotkeys();
    }

    /**
     * 更新所有日历视图
     * @param refreshType 刷新类型：'full'表示完全刷新，'tasks'表示仅刷新任务列表，'calendar'表示仅刷新日历部分
     */
    updateAllViews(refreshType: 'full' | 'tasks' | 'calendar' = 'full') {
        // 获取所有日历视图
        const leaves = this.app.workspace.getLeavesOfType("jiujiu-calendar-view");
        
        // 遍历所有视图并根据刷新类型调用相应方法
        leaves.forEach(leaf => {
            const view = leaf.view as any;
            if (view) {
                if (refreshType === 'full' && typeof view.renderCalendar === 'function') {
                    view.renderCalendar();
                } else if (refreshType === 'tasks' && typeof view.refreshTaskList === 'function') {
                    view.refreshTaskList();
                } else if (refreshType === 'calendar' && typeof view.refreshCalendar === 'function') {
                    view.refreshCalendar();
                }
            }
        });
    }

    /**
     * 注册捕获插入配置的快捷键
     */
    private registerCaptureToHotkeys() {
        if (!this.settings.taskSettings.captureToSettings.configs) {
            return;
        }

        // 遍历所有捕获插入配置
        this.settings.taskSettings.captureToSettings.configs.forEach(config => {
            if (config.enabled) {
                // 为每个配置注册一个命令，即使没有设置快捷键
                // 这样命令会在系统设置中显示，用户可以在那里设置快捷键
                if (config.hotkey) {
                    // 有快捷键配置
                    this.addCommand({
                        id: `capture-to-${config.id}`,
                        name: `Capture to ${config.name}`,
                        hotkeys: [{
                            modifiers: config.hotkey.modifiers as any,
                            key: config.hotkey.key
                        }],
                        callback: () => this.executeCaptureToConfig(config)
                    });
                } else {
                    // 无快捷键配置，但仍注册命令
                    this.addCommand({
                        id: `capture-to-${config.id}`,
                        name: `Capture to ${config.name}`,
                        callback: () => this.executeCaptureToConfig(config)
                    });
                }
            }
        });
    }

    /**
     * 执行捕获插入配置
     * @param config 捕获插入配置
     */
    private async executeCaptureToConfig(config: any) {
        try {
            // 创建一个简单的 IChoiceExecutor 实例
            const choiceExecutor = {
                variables: new Map()
            };

            // 将 CaptureToConfig 转换为 ICaptureChoice
            const captureChoice = {
                id: config.id,
                name: config.name,
                type: "capture" as any,
                command: false,
                captureTo: config.defaultCapturePath,
                captureToActiveFile: config.captureToActiveFile,
                createFileIfItDoesntExist: config.createFileIfItDoesntExist,
                format: {
                    enabled: config.format.enabled,
                    format: config.format.format.includes("{{TASK_TEXT}}") 
                        ? config.format.format 
                        : config.format.format + " {{TASK_TEXT}}"
                },
                prepend: config.prepend,
                appendLink: config.appendLink,
                task: config.task,
                insertAfter: config.insertAfter,
                newLineCapture: config.newLineCapture,
                openFile: config.openFile,
                fileOpening: config.fileOpening,
                inputMethod: config.inputMethod
            };

            // 创建 CaptureChoiceEngine 实例并执行捕获操作
            const { CaptureChoiceEngine } = await import('./engine/CaptureChoiceEngine');
            const engine = new CaptureChoiceEngine(this.app, this, captureChoice, choiceExecutor);
            await engine.run();
        } catch (error) {
            console.error(`Error executing capture to config "${config.name}":`, error);
            new (require('obsidian').Notice)(`Error executing capture: ${(error as Error).message}`);
        }
    }
}

export default MyPlugin;