import { MarkdownView, TFile } from 'obsidian';
import { MyPlugin } from '../../../main';
import { Task, updateTaskInNote } from '../../../services/taskService';
import { formatDate } from '../../../utils/dateUtils';

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
     * 移除文本中的emoji图标，只保留文字内容
     */
    private removeEmojis(text: string): string {
        // 使用正则表达式匹配所有emoji字符
        return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}\u{1F200}-\u{1F2FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2190}-\u{21FF}\u{24C2}-\u{1F251}]/gu, '').trim();
    }

    /**
     * 处理任务双击事件：打开文件并高亮选中任务
     */
    async handleTaskDoubleClick(task: Task) {
        console.log('[TaskDoubleClick] Task clicked:', task);
        console.log('[TaskDoubleClick] Task filePath:', task.filePath);
        console.log('[TaskDoubleClick] Task text:', task.text);
        
        const file = this.plugin.app.vault.getAbstractFileByPath(task.filePath);
        console.log('[TaskDoubleClick] File found:', file);
        
        if (!file || !('stat' in file)) {
            console.warn('[TaskDoubleClick] File not found or invalid');
            return;
        }

        try {
            // 1. 打开文件
            const leaf = this.plugin.app.workspace.getLeaf(false);
            await leaf.openFile(file as TFile);
            console.log('[TaskDoubleClick] File opened');

            // 2. 等待文件完全打开和渲染
            await new Promise(resolve => setTimeout(resolve, 200));

            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            console.log('[TaskDoubleClick] Active view:', activeView);
            
            if (!activeView) {
                console.warn('[TaskDoubleClick] No active view');
                return;
            }

            // 3. 根据视图类型处理
            if (activeView.getMode() === 'source') {
                // 编辑视图
                const editor = activeView.editor;
                const content = editor.getValue();
                console.log('[TaskDoubleClick] Content length:', content.length);

                // 4. 查找任务在文件中的位置
                const taskIndex = content.indexOf(task.text);
                console.log('[TaskDoubleClick] Task index:', taskIndex);
                
                if (taskIndex === -1) {
                    console.warn('[TaskDoubleClick] Task text not found in file, trying to find by raw text');
                    // 尝试使用原始任务文本查找
                    const rawTaskIndex = content.indexOf(task.rawText || '');
                    console.log('[TaskDoubleClick] Raw task index:', rawTaskIndex);
                    
                    if (rawTaskIndex === -1) {
                        console.warn('[TaskDoubleClick] Raw task text not found either');
                        return;
                    }
                    
                    // 5. 计算任务所在行（使用原始文本）
                    const line = content.substring(0, rawTaskIndex).split('\n').length - 1;
                    const lineText = editor.getLine(line);
                    console.log('[TaskDoubleClick] Line:', line, 'Line text:', lineText);
                    
                    if (!lineText) {
                        console.warn('[TaskDoubleClick] Line text is empty');
                        return;
                    }

                    // 6. 只选中该行的开头，不尝试精确匹配完整文本
                    const startPos = { line, ch: 0 };
                    const endPos = { line, ch: lineText.length };
                    console.log('[TaskDoubleClick] Selection:', startPos, 'to', endPos);

                    // 7. 选中整行
                    editor.setSelection(startPos, endPos);

                    // 8. 滚动到视口中间
                    editor.scrollIntoView(
                        { from: startPos, to: endPos },
                        true
                    );
                    console.log('[TaskDoubleClick] Task line highlighted and scrolled in source mode');
                    return;
                }

                // 5. 计算任务所在行
                const line = content.substring(0, taskIndex).split('\n').length - 1;
                const lineText = editor.getLine(line);
                console.log('[TaskDoubleClick] Line:', line, 'Line text:', lineText);
                
                if (!lineText) {
                    console.warn('[TaskDoubleClick] Line text is empty');
                    return;
                }

                // 6. 只选中该行的开头，不尝试精确匹配完整文本
                const startPos = { line, ch: 0 };
                const endPos = { line, ch: lineText.length };
                console.log('[TaskDoubleClick] Selection:', startPos, 'to', endPos);

                // 7. 选中整行
                editor.setSelection(startPos, endPos);

                // 8. 滚动到视口中间
                editor.scrollIntoView(
                    { from: startPos, to: endPos },
                    true
                );
                console.log('[TaskDoubleClick] Task highlighted and scrolled in source mode');
            } else {
                // 阅读视图
                console.log('[TaskDoubleClick] Reading mode detected');
                
                // 获取阅读视图容器
                const readingView = activeView.containerEl.querySelector('.markdown-preview-view');
                if (!readingView) {
                    console.warn('[TaskDoubleClick] No reading view container found');
                    return;
                }
                
                // 查找任务元素 - 优先匹配列表项，确保只匹配任务的第一行，忽略emoji
                let taskElement: HTMLElement | null = null;
                
                // 获取移除emoji后的任务文本
                const taskTextNoEmoji = this.removeEmojis(task.text);
                const taskRawTextNoEmoji = task.rawText ? this.removeEmojis(task.rawText) : '';
                
                // 首先在列表项中查找（任务通常以列表形式存在）
                const listItems = readingView.querySelectorAll('li');
                listItems.forEach(el => {
                    const htmlEl = el as HTMLElement;
                    if (htmlEl.textContent) {
                        const elText = htmlEl.textContent.trim();
                        const elTextNoEmoji = this.removeEmojis(elText);
                        
                        // 比较移除emoji后的文本
                        if (elTextNoEmoji.startsWith(taskTextNoEmoji)) {
                            taskElement = htmlEl;
                        }
                    }
                });
                
                // 如果没找到，在段落中查找
                if (!taskElement) {
                    const paragraphs = readingView.querySelectorAll('p');
                    paragraphs.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        if (htmlEl.textContent) {
                            const elText = htmlEl.textContent.trim();
                            const elTextNoEmoji = this.removeEmojis(elText);
                            
                            // 比较移除emoji后的文本
                            if (elTextNoEmoji.startsWith(taskTextNoEmoji)) {
                                taskElement = htmlEl;
                            }
                        }
                    });
                }
                
                // 如果没找到，尝试使用原始文本匹配
                if (!taskElement && taskRawTextNoEmoji) {
                    const allElements = readingView.querySelectorAll('li, p');
                    allElements.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        if (htmlEl.textContent) {
                            const elText = htmlEl.textContent.trim();
                            const elTextNoEmoji = this.removeEmojis(elText);
                            
                            // 比较移除emoji后的文本
                            if (elTextNoEmoji.startsWith(taskRawTextNoEmoji)) {
                                taskElement = htmlEl;
                            }
                        }
                    });
                }
                
                // 如果还是没找到，使用包含匹配但限制为列表项
                if (!taskElement) {
                    const allElements = readingView.querySelectorAll('li, p');
                    allElements.forEach(el => {
                        const htmlEl = el as HTMLElement;
                        if (htmlEl.textContent) {
                            const elText = htmlEl.textContent;
                            const elTextNoEmoji = this.removeEmojis(elText);
                            
                            // 比较移除emoji后的文本
                            if (elTextNoEmoji.includes(taskTextNoEmoji)) {
                                taskElement = htmlEl;
                            }
                        }
                    });
                }
                
                console.log('[TaskDoubleClick] Task element found:', taskElement);
                
                if (taskElement) {
                    // 添加高亮样式
                    (taskElement as HTMLElement).classList.add('task-highlighted');
                    
                    // 滚动到视口中间
                    (taskElement as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center'
                    });
                    
                    console.log('[TaskDoubleClick] Task highlighted and scrolled in reading mode');
                    
                    // 5秒后移除高亮样式
                    setTimeout(() => {
                        if (taskElement) {
                            (taskElement as HTMLElement).classList.remove('task-highlighted');
                        }
                    }, 5000);
                } else {
                    console.warn('[TaskDoubleClick] Task element not found in reading mode');
                }
            }

        } catch (error) {
            console.warn('Failed to highlight and center task:', error);
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
            await updateTaskInNote(this.plugin.app, task, completed);
            
            // 重新渲染任务列表，显示最新状态
            await onRefreshTaskList();
        } catch (error) {
            console.error('Failed to update task:', error);
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
        // 只使用 captureTo 配置创建笔记
        await this.executeCaptureToConfig(date, 'daily');
    }

    /**
     * 处理周数双击事件
     */
    async handleWeekDoubleClick(date: Date) {
        // 只使用 captureTo 配置创建笔记
        await this.executeCaptureToConfig(date, 'weekly');
    }

    /**
     * 处理月份双击事件
     */
    async handleMonthDoubleClick(date: Date) {
        // 只使用 captureTo 配置创建笔记
        await this.executeCaptureToConfig(date, 'monthly');
    }

    /**
     * 处理季度双击事件
     */
    async handleQuarterDoubleClick(date: Date) {
        // 只使用 captureTo 配置创建笔记
        await this.executeCaptureToConfig(date, 'quarterly');
    }

    /**
     * 处理年份双击事件
     */
    async handleYearDoubleClick(date: Date) {
        // 只使用 captureTo 配置创建笔记
        await this.executeCaptureToConfig(date, 'yearly');
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
