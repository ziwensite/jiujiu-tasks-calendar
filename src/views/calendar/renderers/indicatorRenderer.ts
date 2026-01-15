import { MyPlugin } from '../../../main';
import { getLunarDate, formatDate } from '../../../utils/dateUtils';
import { noteExists } from '../../../services/noteService';
import { extractTasks, Task } from '../../../services/taskService';

export class IndicatorRenderer {
    private plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    /**
     * 更新单个日期的指示器
     */
    async updateSingleDayIndicator(container: any, date: Date) {
        // 获取对应日期的单元格
        const dayCell = this.getDayCellByDate(container, date);
        if (!dayCell) return;
        
        // 检查是否有日记和任务
        const dailySettings = this.plugin.settings.dailyNote;
        const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
        const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
        
        let hasNote = false;
        let hasTask = false;
        
        if (await noteExists(this.plugin.app, dailyNotePath)) {
            hasNote = true;
            
            // 检查当天日记中没有截止日期的任务
            try {
                const dailyFile = this.plugin.app.vault.getAbstractFileByPath(dailyNotePath);
                if (dailyFile && 'stat' in dailyFile) {
                    const content = await this.plugin.app.vault.read(dailyFile as any);
                    
                    // 使用 taskRegex 匹配所有任务
                    const taskRegex = /^\s*-\s*\[(.)\]\s*(.+)$/gm;
                    let match;
                    while ((match = taskRegex.exec(content)) !== null) {
                        // 提取任务状态和文本
                        const status = match[1] || '';
                        const taskText = match[2] || '';
                        
                        // 检查是否是未完成的任务
                        if (status.toLowerCase() !== 'x') {
                            // 检查任务文本中是否包含截止日期
                            const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                            const hasDueDate = dueDateRegex.test(taskText);
                            
                            // 如果没有截止日期，或者截止日期是当天，都算作当天的任务
                            if (!hasDueDate) {
                                hasTask = true;
                                break; // 只要有一个符合条件的任务，就可以退出循环
                            } else {
                                // 有截止日期，检查是否是当天
                                const dueDateMatch = taskText.match(dueDateRegex);
                                if (dueDateMatch && dueDateMatch[1]) {
                                    const dueDateStr = dueDateMatch[1];
                                    const dueDate = new Date(dueDateStr);
                                    
                                    // 创建当天的开始和结束时间
                                    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                                    
                                    if (dueDate >= dayStart && dueDate <= dayEnd) {
                                        hasTask = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to check daily note tasks:', error);
            }
        }
        
        // 检查所有文件中截止日期在当天的任务（其他文件中的任务）
        try {
            const allTasks = await extractTasks(this.plugin.app, this.plugin.settings);
            
            // 筛选截止日期在当天的任务
            // 创建当天的开始和结束时间（本地时间）
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
            
            for (const task of allTasks) {
                // 只检查其他文件中的任务，避免重复检查
                if (task.filePath !== dailyNotePath && task.dueDate) {
                    // 创建任务截止日期的本地时间版本（去除时区影响）
                    const taskDueDate = new Date(
                        task.dueDate.getFullYear(),
                        task.dueDate.getMonth(),
                        task.dueDate.getDate(),
                        task.dueDate.getHours(),
                        task.dueDate.getMinutes(),
                        task.dueDate.getSeconds(),
                        task.dueDate.getMilliseconds()
                    );
                    
                    if (taskDueDate >= dayStart && taskDueDate <= dayEnd) {
                        hasTask = true;
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check tasks for day indicator:', error);
        }
        
        // 更新指示器
        this.updateDayIndicators(dayCell, hasNote, hasTask);
    }

    /**
     * 更新所有日期的指示器
     */
    async updateAllDayIndicators(container: any, currentDate: Date) {
        const dayCells = Array.from(container.querySelectorAll('.day-cell:not(.other-month)'));
        
        // 批量收集所有日期的数据
        const indicatorData = new Map<string, { hasNote: boolean; hasTask: boolean }>();
        
        // 先提取所有任务，避免重复提取
        let allTasks: Task[] = [];
        try {
            allTasks = await extractTasks(this.plugin.app, this.plugin.settings);
        } catch (error) {
            console.error('Failed to extract tasks for day indicators:', error);
        }
        
        for (const cell of dayCells) {
            const cellEl = cell as any;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl) continue;
            
            const dayNumber = parseInt(dayNumberEl.textContent || '0');
            if (isNaN(dayNumber)) continue;
            
            // 获取当前视图的年月
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const date = new Date(year, month, dayNumber);
            
            // 检查是否有日记
            const dailySettings = this.plugin.settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            
            let hasNote = false;
            let hasTask = false;
            
            if (await noteExists(this.plugin.app, dailyNotePath)) {
                hasNote = true;
                
                // 检查当天日记中没有截止日期的任务
                try {
                    const dailyFile = this.plugin.app.vault.getAbstractFileByPath(dailyNotePath);
                    if (dailyFile && 'stat' in dailyFile) {
                        const content = await this.plugin.app.vault.read(dailyFile as any);
                        
                        // 使用 taskRegex 匹配所有任务
                        const taskRegex = /^\s*(-|\*|\d+\.)\s*\[(.)\]\s*(.+)$/gm;
                        let match;
                        while ((match = taskRegex.exec(content)) !== null) {
                            // 提取任务状态和文本
                            const status = match[2] || '';
                            const taskText = match[3] || '';
                            
                            // 检查是否是未完成的任务
                            if (status.toLowerCase() !== 'x') {
                                // 检查任务文本中是否包含截止日期
                                const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                                const hasDueDate = dueDateRegex.test(taskText);
                                
                                // 如果没有截止日期，或者截止日期是当天，都算作当天的任务
                                if (!hasDueDate) {
                                    hasTask = true;
                                    break; // 只要有一个符合条件的任务，就可以退出循环
                                } else {
                                    // 有截止日期，检查是否是当天
                                    const dueDateMatch = taskText.match(dueDateRegex);
                                    if (dueDateMatch && dueDateMatch[1]) {
                                        const dueDateStr = dueDateMatch[1];
                                        const dueDate = new Date(dueDateStr);
                                        
                                        // 创建当天的开始和结束时间
                                        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                                        
                                        if (dueDate >= dayStart && dueDate <= dayEnd) {
                                            hasTask = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to check daily note tasks:', error);
                }
            }
            
            // 检查所有文件中截止日期在当天的任务（其他文件中的任务）
            if (allTasks.length > 0) {
                // 创建当天的开始和结束时间（本地时间）
                const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                
                for (const task of allTasks) {
                    // 只检查其他文件中的任务，避免重复检查
                    if (task.filePath !== dailyNotePath && task.dueDate) {
                        // 创建任务截止日期的本地时间版本（去除时区影响）
                        const taskDueDate = new Date(
                            task.dueDate.getFullYear(),
                            task.dueDate.getMonth(),
                            task.dueDate.getDate(),
                            task.dueDate.getHours(),
                            task.dueDate.getMinutes(),
                            task.dueDate.getSeconds(),
                            task.dueDate.getMilliseconds()
                        );
                        
                        if (taskDueDate >= dayStart && taskDueDate <= dayEnd) {
                            hasTask = true;
                            break;
                        }
                    }
                }
            }
            
            // 存储数据，使用日期字符串作为键
            indicatorData.set(`${year}-${month}-${dayNumber}`, { hasNote, hasTask });
        }
        
        // 一次性应用所有更新
        for (const cell of dayCells) {
            const cellEl = cell as any;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl) continue;
            
            const dayNumber = parseInt(dayNumberEl.textContent || '0');
            if (isNaN(dayNumber)) continue;
            
            // 获取当前视图的年月
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const dataKey = `${year}-${month}-${dayNumber}`;
            
            const data = indicatorData.get(dataKey);
            if (data) {
                this.updateDayIndicators(cellEl, data.hasNote, data.hasTask);
            }
        }
    }

    /**
     * 更新周数指示器
     */
    async updateWeekIndicators(container: any, currentDate: Date) {
        const weekCells = Array.from(container.querySelectorAll('.week-number-cell'));
        
        // 批量收集所有周的数据
        const indicatorData = new Map<number, { hasNote: boolean; hasTask: boolean }>();
        
        // 先提取所有任务，避免重复提取
        let allTasks: Task[] = [];
        try {
            allTasks = await extractTasks(this.plugin.app, this.plugin.settings);
        } catch (error) {
            console.error('Failed to extract tasks for week indicators:', error);
        }
        
        for (const cell of weekCells) {
            const cellEl = cell as any;
            const weekNumberEl = cellEl.querySelector('.week-number-text');
            if (!weekNumberEl) continue;
            
            const weekNumber = parseInt(weekNumberEl.textContent || '0');
            if (isNaN(weekNumber)) continue;
            
            // 计算当前周的起始日期
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const startDayOfWeek = firstDayOfMonth.getDay();
            const prevMonthDaysToShow = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
            
            const weekStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            weekStartDate.setDate(weekStartDate.getDate() - prevMonthDaysToShow + (weekNumber - 1) * 7);
            
            // 计算周结束日期
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            
            let hasWeeklyNote = false;
            let hasWeeklyTask = false;
            
            // 获取周报设置
            const weeklySettings = this.plugin.settings.weeklyNote;
            const weeklyFileName = formatDate(weekStartDate, weeklySettings.fileNameFormat);
            
            // 检查多种可能的周报路径
            const possiblePaths = [
                `${weeklySettings.savePath}/${weeklyFileName}.md`,
                `00-周期笔记/2-周报/${weeklyFileName}.md`,
                `00-周期笔记/2-周报/${formatDate(weekStartDate, "YYYY-wWW")}.md`,
                `00-周期笔记/2-周报/${formatDate(weekStartDate, "YYYY-WW")}.md`
            ];
            
            // 检查是否存在周报
            for (const path of possiblePaths) {
                if (await noteExists(this.plugin.app, path)) {
                    hasWeeklyNote = true;
                    break;
                }
            }
            
            // 检查本周内是否有截止任务
            if (allTasks.length > 0) {
                for (const task of allTasks) {
                    if (task.dueDate && task.dueDate >= weekStartDate && task.dueDate <= weekEndDate) {
                        hasWeeklyTask = true;
                        break;
                    }
                }
            }
            
            // 存储数据，使用周数作为键
            indicatorData.set(weekNumber, { hasNote: hasWeeklyNote, hasTask: hasWeeklyTask });
        }
        
        // 一次性应用所有更新
        for (const cell of weekCells) {
            const cellEl = cell as any;
            const weekNumberEl = cellEl.querySelector('.week-number-text');
            if (!weekNumberEl) continue;
            
            const weekNumber = parseInt(weekNumberEl.textContent || '0');
            if (isNaN(weekNumber)) continue;
            
            const data = indicatorData.get(weekNumber);
            if (data) {
                // 清空现有指示器
                const indicators = cellEl.querySelector('.week-indicators');
                if (indicators) {
                    indicators.empty();
                    
                    // 添加实心小圆点表示周报
                    if (data.hasNote) {
                        indicators.createEl('div', {cls: 'indicator-dot solid-dot'});
                    }
                    
                    // 添加空心小圆点表示任务
                    if (data.hasTask) {
                        indicators.createEl('div', {cls: 'indicator-dot hollow-dot'});
                    }
                }
            }
        }
    }

    /**
     * 更新日期单元格的指示器
     */
    private updateDayIndicators(cell: any, hasNote: boolean, hasTask: boolean) {
        // 清空现有指示器
        const indicatorsContainer = cell.querySelector('.day-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.empty();
            
            // 创建一行指示器
            const indicatorRow = indicatorsContainer.createEl('div', {cls: 'indicator-row'});
            
            // 显示日记指示器（实心小圆点）
            if (hasNote) {
                indicatorRow.createEl('div', {cls: 'indicator-dot solid-dot'});
            }
            
            // 显示任务指示器（空心小圆点）
            if (hasTask) {
                indicatorRow.createEl('div', {cls: 'indicator-dot hollow-dot'});
            }
        }
    }

    /**
     * 根据日期获取对应的单元格
     */
    private getDayCellByDate(container: any, date: Date): any | null {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        
        // 查找对应日期的单元格
        const dayCells = Array.from(container.querySelectorAll('.day-cell:not(.other-month)'));
        
        for (const cell of dayCells) {
            const cellEl = cell as any;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl) continue;
            
            const dayNumber = parseInt(dayNumberEl.textContent || '0');
            if (dayNumber === day) {
                return cellEl;
            }
        }
        
        return null;
    }

    /**
     * 更新日期单元格的选中状态
     */
    updateDaySelection(container: any, selectedDate: Date | null) {
        // 移除所有日期单元格的选中状态
        container.querySelectorAll(".day-cell").forEach((cell: any) => {
            cell.removeClass('selected-day');
        });
        
        // 如果有选中的日期，添加选中状态
        if (selectedDate) {
            const dayCell = this.getDayCellByDate(container, selectedDate);
            if (dayCell) {
                dayCell.addClass('selected-day');
            }
        }
    }

    /**
     * 更新农历日期
     */
    updateLunarDates(container: any, currentDate: Date) {
        const dayCells = Array.from(container.querySelectorAll('.day-cell'));
        
        for (const cell of dayCells) {
            const cellEl = cell as any;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl) continue;
            
            const dayNumber = parseInt(dayNumberEl.textContent || '0');
            if (isNaN(dayNumber)) continue;
            
            // 计算当前日期
            const isOtherMonth = cellEl.hasClass('other-month');
            let date: Date;
            
            if (isOtherMonth) {
                // 其他月份的日期，需要计算具体日期
                // 这里可以根据实际的日期计算逻辑进行实现
                // 暂时使用当前月份的日期，后续可以根据具体需求修改
                date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
            } else {
                // 当前月份的日期
                date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
            }
            
            // 更新农历日期
            const lunarDate = cellEl.querySelector('.lunar-date');
            if (lunarDate) {
                const lunarDateResult = getLunarDate(date);
                lunarDate.textContent = lunarDateResult.text;
                lunarDate.className = `lunar-date lunar-${lunarDateResult.type}`;
            }
        }
    }
}
