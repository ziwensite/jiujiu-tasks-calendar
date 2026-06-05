import {App, Plugin, WorkspaceLeaf, Notice} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings";
import {CalendarView} from "./views/CalendarView";
import { CalendarViewController } from './core/CalendarViewController';
import { CalendarDataManager } from './core/CalendarDataManager';

export class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    calendarViewController: CalendarViewController;
    calendarDataManager: CalendarDataManager;

    async onload() {
        try {
            await this.loadSettings();
            
            // 初始化日历数据管理器
            this.calendarDataManager = new CalendarDataManager(this);
            
            // 初始化日历视图控制器
            this.calendarViewController = new CalendarViewController(this);

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
            
            // 一次性注册捕获插入快捷键命令
            this.registerCaptureToHotkeys();
            
            // 插件启用时自动打开默认视图（等待 workspace 布局就绪后一次性激活）
            const layoutHandler = () => {
                this.app.workspace.off('layout-change', layoutHandler);
                this.activateView();
            };
            this.registerEvent(this.app.workspace.on('layout-change', layoutHandler));
        } catch (error) {
            console.error("[JiuJiu Calendar] Plugin load error:", error);
            new Notice(`JiuJiu Calendar plugin failed to load: ${(error as Error).message}`);
        }
    }

    onunload() {
        this.app.workspace.detachLeavesOfType("jiujiu-calendar-view");
    }

    async activateView() {
        try {
            const { workspace } = this.app;
            if (!workspace) return;

            let leaf: WorkspaceLeaf | null = null;
            const leaves = workspace.getLeavesOfType("jiujiu-calendar-view");

            if (leaves.length > 0 && leaves[0]) {
                leaf = leaves[0];
            } else {
                try {
                    leaf = workspace.getRightLeaf(false);
                } catch (e) {
                    leaf = null;
                }
                if (!leaf) {
                    try {
                        leaf = workspace.getLeaf('tab');
                    } catch (e) {
                        leaf = null;
                    }
                }
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
        } catch (error) {
            console.error("[JiuJiu Calendar] Failed to activate view:", error);
        }
    }

    async loadSettings() {
        try {
            const savedSettings = await this.loadData() as Partial<MyPluginSettings>;
            
            // 确保savedSettings不是null
            const safeSavedSettings = savedSettings || {};
            
            // 深度合并设置，确保嵌套对象也能正确合并
            this.settings = {
                ...DEFAULT_SETTINGS,
                ...safeSavedSettings,
                // 确保taskSettings包含所有必需的嵌套属性
                taskSettings: {
                    ...DEFAULT_SETTINGS.taskSettings,
                    ...(safeSavedSettings.taskSettings || {}),
                    // 确保captureToSettings包含所有必需的嵌套属性
                    captureToSettings: {
                        ...DEFAULT_SETTINGS.taskSettings.captureToSettings,
                        ...safeSavedSettings.taskSettings?.captureToSettings,
                        // 确保configs始终是数组，即使savedSettings中没有或为undefined
                        configs: safeSavedSettings.taskSettings?.captureToSettings?.configs || DEFAULT_SETTINGS.taskSettings.captureToSettings.configs
                    }
                },
                // 确保moreLabelSettings包含所有必需的属性
                moreLabelSettings: {
                    ...DEFAULT_SETTINGS.moreLabelSettings,
                    ...(safeSavedSettings.moreLabelSettings || {})
                }
            };
            
            // 如果是第一次加载插件（没有savedSettings），自动保存默认设置到data.json文件
            if (!savedSettings) {
                await this.saveSettings();
            }
        } catch (error) {
            console.error("[JiuJiu Calendar] Error loading settings:", error);
            // 如果加载设置失败，使用默认设置
            this.settings = DEFAULT_SETTINGS;
            // 保存默认设置到data.json文件
            await this.saveSettings();
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * 更新所有日历视图
     * @param refreshType 刷新类型：'full'表示完全刷新，'tasks'表示仅刷新任务列表，'calendar'表示仅刷新日历部分
     */
    updateAllViews(refreshType: 'full' | 'tasks' | 'calendar' = 'full') {
        // 使用中央控制器管理刷新请求
        if (refreshType === 'full') {
            // 完全刷新使用防抖机制
            this.calendarViewController.requestFlush();
        } else if (refreshType === 'tasks') {
            // 任务列表刷新单独处理
            this.calendarViewController.requestRefreshTaskList();
        } else if (refreshType === 'calendar') {
            // 日历部分刷新使用防抖机制
            this.calendarViewController.requestFlush();
        }
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
    public async executeCaptureToConfig(config: any) {
        try {
            
            
            // 检查配置是否有效
            if (!config || !config.id) {
    
                new Notice('Error executing capture: Invalid config');
                return;
            }
            
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
                inputMethod: config.inputMethod,
                autoAddCreatedDate: config.autoAddCreatedDate,
                autoAddDueDate: config.autoAddDueDate,
                dueDateOption: config.dueDateOption,
                customDueDays: config.customDueDays,
                _targetDate: config._targetDate || new Date()
            };
            


            // 创建 CaptureChoiceEngine 实例并执行捕获操作
            let CaptureChoiceEngine;
            try {
                const module = await import('./engine/CaptureChoiceEngine');
                CaptureChoiceEngine = module.CaptureChoiceEngine;
            } catch (importError) {
                new Notice('Error executing capture: Failed to load CaptureChoiceEngine');
                return;
            }
            
            if (!CaptureChoiceEngine) {
                new Notice('Error executing capture: CaptureChoiceEngine not found');
                return;
            }
            
            const engine = new CaptureChoiceEngine(this.app, this, captureChoice, choiceExecutor);
            await engine.run();
        } catch (error) {
            new Notice(`Error executing capture: ${(error as Error).message}`);
        }
    }
}

export default MyPlugin;