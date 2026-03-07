import { TFile } from 'obsidian';
import { MyPlugin } from '../../../main';
import { Task, updateTaskInNote } from '../../../services/taskService';
import { formatDate } from '../../../utils/dateUtils';
import { noteExists } from '../../../services/noteService';
import { CalendarEvent } from '../../../core/EventEmitter';

export class EventHandler {
    private plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    /**
     * 处理文件变化事件
     */
    async handleFileChange(file: any, onUpdateIndicator: (date: Date) => Promise<void>, onUpdateWeekIndicator: (date: Date) => Promise<void>, onRefreshTaskList: () => Promise<void>) {
        // 检查是否是文件且是Markdown文件
        if (!file || !('extension' in file) || file.extension !== 'md') return;
        
        // 尝试从文件路径中解析日期
        const date = this.parseDateFromFilePath(file.path);
        if (date) {
            // 如果文件对应到一个具体日期，只更新该日期的指示器
            await onUpdateIndicator(date);
            // 同时更新该日期所在周的周数指示器
            await onUpdateWeekIndicator(date);
        }
        
        // 如果文件可能影响当前选中日期的任务列表，更新任务列表
        if (this.isFileRelatedToSelectedDate(file)) {
            await onRefreshTaskList();
        }
    }

    /**
     * 处理任务双击事件：打开文件并高亮选中任务
     */
    async handleTaskDoubleClick(task: Task) {

        
        // 检查任务是否有位置信息
        if (!task.line || !task.position) {
            return;
        }
        
        const file = this.plugin.app.vault.getAbstractFileByPath(task.filePath) as TFile;
        
        if (!file || !('stat' in file)) {
            return;
        }

        try {
            // 构造 selectionState 对象，用于精确定位和选中任务
            const selectionState = {
                eState: {
                    cursor: {
                        from: { 
                            line: task.line, 
                            ch: task.position.start.col 
                        },
                        to: { 
                            line: task.line + (task.lineCount || 1) - 1, 
                            ch: task.position.end.col 
                        },
                    },
                    line: task.line,
                },
            };

            // 检查文件是否已经打开
            const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
            let existingLeaf = null;
            
            for (const leaf of leaves) {
                const view = leaf.view as any;
                if (view && view.file && view.file.path === file.path) {
                    existingLeaf = leaf;
                    break;
                }
            }

            if (existingLeaf) {
                // 文件已打开，切换到该标签页并设置光标位置
                await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                
                // 设置光标位置
                const vs = existingLeaf.getViewState();
                await existingLeaf.setViewState({
                    ...vs,
                    state: {
                        ...(vs.state ?? {}),
                        ...selectionState.eState
                    }
                });
            } else {
                // 文件未打开，在新标签页打开
                await this.plugin.app.workspace.openLinkText(
                    file.basename, // 使用文件名作为链接文本
                    task.filePath, // 源文件路径
                    true, // 在新标签页打开
                    selectionState as any // 编辑器状态（包含光标位置）
                );
            }

        } catch (error) {
            console.warn('Failed to open and select task:', error);
        }
    }

    /**
     * 处理日期点击事件
     */
    handleDayClick(date: Date, onUpdateSelection: () => void, onUpdateTaskList: (date: Date) => Promise<void>) {
        // 更新选中状态
        onUpdateSelection();
        
        // 更新任务列表
        onUpdateTaskList(date);
    }

    /**
     * 处理任务状态切换事件
     */
    async handleTaskToggle(task: Task, completed: boolean, onRefreshTaskList: () => Promise<void>) {
        try {

            // 更新笔记中的任务状态
            await updateTaskInNote(this.plugin.app, task, completed, this.plugin.settings);

            
            // 重新渲染任务列表，显示最新状态
            await onRefreshTaskList();
            
            // 刷新任务数据缓存
            await this.plugin.calendarDataManager.refreshTasks();
            
            // 触发任务数据更新事件，更新指示器
            this.plugin.eventEmitter.emit(CalendarEvent.TASK_DATA_UPDATED);
        } catch (error) {
            console.error('[EventHandler] Failed to update task:', error);
        }
    }

    /**
     * 从文件路径中解析日期
     */
    private parseDateFromFilePath(filePath: string): Date | null {
        const dailySettings = this.plugin.settings.dailyNote;
        const savePath = dailySettings.savePath;
        
        // 检查文件是否在日记保存路径中
        if (!filePath.startsWith(savePath)) return null;
        
        // 提取文件名（不含扩展名）
        const fileName = filePath.substring(savePath.length + 1, filePath.length - 3);
        
        // 尝试使用日记的日期格式解析日期
        try {
            const dateRegex = /(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/;
            const match = fileName.match(dateRegex);
            if (match && match[1] && match[2] && match[3]) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1; // 月份从0开始
                const day = parseInt(match[3]);
                return new Date(year, month, day);
            }
        } catch (error) {
            console.error('Failed to parse date from file path:', error);
        }
        
        return null;
    }

    /**
     * 检查文件是否与选中日期相关
     */
    private isFileRelatedToSelectedDate(file: any): boolean {
        // 这里需要根据实际的选中日期逻辑进行实现
        // 暂时返回true，后续可以根据具体需求修改
        return true;
    }

    /**
     * 处理导航按钮点击事件
     */
    handleNavigationClick(direction: 'prev' | 'next', unit: 'year' | 'month' | 'quarter', currentDate: Date, onUpdateDate: (newDate: Date) => void) {
        const newDate = new Date(currentDate);
        
        switch (unit) {
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
                break;
            case 'quarter':
                newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -3 : 3));
                break;
        }
        
        onUpdateDate(newDate);
    }

    /**
     * 处理视图切换事件
     */
    handleViewToggle(currentViewType: 'month' | 'year', onUpdateViewType: (newViewType: 'month' | 'year') => void) {
        const newViewType = currentViewType === 'month' ? 'year' : 'month';
        onUpdateViewType(newViewType);
    }

    /**
     * 处理今日按钮点击事件
     */
    handleTodayClick(onUpdateDate: (newDate: Date) => void) {
        const today = new Date();
        onUpdateDate(today);
    }

    /**
     * 处理日期双击事件
     */
    async handleDayDoubleClick(date: Date) {
        try {
            // 使用现有的 dailySettings 配置和函数
            const dailySettings = this.plugin.settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            
            // 检查每日笔记是否存在
            if (await noteExists(this.plugin.app, dailyNotePath)) {
                // 检查笔记是否已经在某个标签页打开
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                let existingLeaf = null;
                
                for (const leaf of leaves) {
                    const view = leaf.view as any;
                    if (view && view.file && view.file.path === dailyNotePath) {
                        existingLeaf = leaf;
                        break;
                    }
                }
                
                if (existingLeaf) {
                    // 笔记已打开，切换到该标签页
                    await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 笔记存在但未打开，在新标签页打开
                    await this.plugin.app.workspace.openLinkText(
                        dailyFileName,
                        dailyNotePath,
                        true // 在新标签页打开
                    );
                }
            } else {
                // 笔记不存在，调用 captureTo 配置创建笔记
                await this.executeCaptureToConfig(date, 'daily');
            }
        } catch (error) {
            console.error('Failed to handle day double click:', error);
        }
    }

    /**
     * 处理周数双击事件
     */
    async handleWeekDoubleClick(date: Date) {
        try {
            // 使用现有的 weeklySettings 配置和函数
            const weeklySettings = this.plugin.settings.weeklyNote;
            const weeklyFileName = formatDate(date, weeklySettings.fileNameFormat);
            const weeklyNotePath = `${weeklySettings.savePath}/${weeklyFileName}.md`;
            
            // 检查周报是否存在
            if (await noteExists(this.plugin.app, weeklyNotePath)) {
                // 检查笔记是否已经在某个标签页打开
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                let existingLeaf = null;
                
                for (const leaf of leaves) {
                    const view = leaf.view as any;
                    if (view && view.file && view.file.path === weeklyNotePath) {
                        existingLeaf = leaf;
                        break;
                    }
                }
                
                if (existingLeaf) {
                    // 笔记已打开，切换到该标签页
                    await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 笔记存在但未打开，在新标签页打开
                    await this.plugin.app.workspace.openLinkText(
                        weeklyFileName,
                        weeklyNotePath,
                        true // 在新标签页打开
                    );
                }
            } else {
                // 笔记不存在，调用 captureTo 配置创建笔记
                await this.executeCaptureToConfig(date, 'weekly');
            }
        } catch (error) {
            console.error('Failed to handle week double click:', error);
        }
    }

    /**
     * 处理月份双击事件
     */
    async handleMonthDoubleClick(date: Date) {
        try {
            // 使用现有的 monthlySettings 配置和函数
            const monthlySettings = this.plugin.settings.monthlyNote;
            const monthlyFileName = formatDate(date, monthlySettings.fileNameFormat);
            const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
            
            // 检查月报是否存在
            if (await noteExists(this.plugin.app, monthlyNotePath)) {
                // 检查笔记是否已经在某个标签页打开
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                let existingLeaf = null;
                
                for (const leaf of leaves) {
                    const view = leaf.view as any;
                    if (view && view.file && view.file.path === monthlyNotePath) {
                        existingLeaf = leaf;
                        break;
                    }
                }
                
                if (existingLeaf) {
                    // 笔记已打开，切换到该标签页
                    await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 笔记存在但未打开，在新标签页打开
                    await this.plugin.app.workspace.openLinkText(
                        monthlyFileName,
                        monthlyNotePath,
                        true // 在新标签页打开
                    );
                }
            } else {
                // 笔记不存在，调用 captureTo 配置创建笔记
                await this.executeCaptureToConfig(date, 'monthly');
            }
        } catch (error) {
            console.error('Failed to handle month double click:', error);
        }
    }

    /**
     * 处理季度双击事件
     */
    async handleQuarterDoubleClick(date: Date) {
        try {
            // 使用现有的 quarterlySettings 配置和函数
            const quarterlySettings = this.plugin.settings.quarterlyNote;
            const quarterlyFileName = formatDate(date, quarterlySettings.fileNameFormat);
            const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
            
            // 检查季报是否存在
            if (await noteExists(this.plugin.app, quarterlyNotePath)) {
                // 检查笔记是否已经在某个标签页打开
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                let existingLeaf = null;
                
                for (const leaf of leaves) {
                    const view = leaf.view as any;
                    if (view && view.file && view.file.path === quarterlyNotePath) {
                        existingLeaf = leaf;
                        break;
                    }
                }
                
                if (existingLeaf) {
                    // 笔记已打开，切换到该标签页
                    await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 笔记存在但未打开，在新标签页打开
                    await this.plugin.app.workspace.openLinkText(
                        quarterlyFileName,
                        quarterlyNotePath,
                        true // 在新标签页打开
                    );
                }
            } else {
                // 笔记不存在，调用 captureTo 配置创建笔记
                await this.executeCaptureToConfig(date, 'quarterly');
            }
        } catch (error) {
            console.error('Failed to handle quarter double click:', error);
        }
    }

    /**
     * 处理年份双击事件
     */
    async handleYearDoubleClick(date: Date) {
        try {
            // 使用现有的 yearlySettings 配置和函数
            const yearlySettings = this.plugin.settings.yearlyNote;
            const yearlyFileName = formatDate(date, yearlySettings.fileNameFormat);
            const yearlyNotePath = `${yearlySettings.savePath}/${yearlyFileName}.md`;
            
            // 检查年报是否存在
            if (await noteExists(this.plugin.app, yearlyNotePath)) {
                // 检查笔记是否已经在某个标签页打开
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                let existingLeaf = null;
                
                for (const leaf of leaves) {
                    const view = leaf.view as any;
                    if (view && view.file && view.file.path === yearlyNotePath) {
                        existingLeaf = leaf;
                        break;
                    }
                }
                
                if (existingLeaf) {
                    // 笔记已打开，切换到该标签页
                    await this.plugin.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 笔记存在但未打开，在新标签页打开
                    await this.plugin.app.workspace.openLinkText(
                        yearlyFileName,
                        yearlyNotePath,
                        true // 在新标签页打开
                    );
                }
            } else {
                // 笔记不存在，调用 captureTo 配置创建笔记
                await this.executeCaptureToConfig(date, 'yearly');
            }
        } catch (error) {
            console.error('Failed to handle year double click:', error);
        }
    }

    /**
     * 执行 captureTo 配置
     * @param date 日期
     * @param type 类型：daily, weekly, monthly, quarterly, yearly
     * @returns 是否成功执行 captureTo 配置
     */
    private async executeCaptureToConfig(date: Date, type: string): Promise<boolean> {
        try {
            // 获取 captureTo 配置
            const captureSettings = this.plugin.settings.taskSettings.captureToSettings;
            if (!captureSettings.enabled || !captureSettings.configs || captureSettings.configs.length === 0) {
                return false;
            }

            // 尝试找到匹配类型的配置
            let targetConfig = captureSettings.configs.find(config => 
                config.name.toLowerCase().includes(type)
            );

            // 如果没有找到匹配的配置，使用默认配置
            if (!targetConfig) {
                targetConfig = captureSettings.configs.find(config => 
                    config.id === captureSettings.taskConfigId
                );
            }

            // 如果仍然没有找到配置，返回 false
            if (!targetConfig) {
                return false;
            }

            // 执行 captureTo 配置，并传递目标日期
            await this.plugin.executeCaptureToConfig({
                ...targetConfig,
                _targetDate: date // 添加目标日期
            });
            return true;
        } catch (error) {
            console.error(`Failed to execute captureTo config for ${type}:`, error);
            return false;
        }
    }
}
