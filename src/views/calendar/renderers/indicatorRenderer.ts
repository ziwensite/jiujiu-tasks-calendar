import { MyPlugin } from '../../../main';
import { getLunarDate, formatDate, getWeekInfo } from '../../../utils/dateUtils';
import { noteExists } from '../../../services/noteService';
import { Task } from '../../../services/taskService';

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
        let hasCompletedTask = false;
        
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
                        
                        // 检查是否是已完成或已取消的任务
                                if (status.toLowerCase() === 'x' || status.toLowerCase() === '-') {
                                    hasCompletedTask = true;
                                } else {
                            // 检查是否是未完成的任务
                            // 检查任务文本中是否包含截止日期
                            const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                            const hasDueDate = dueDateRegex.test(taskText);
                            
                            // 如果没有截止日期，或者截止日期是当天，都算作当天的任务
                            if (!hasDueDate) {
                                hasTask = true;
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
            const allTasks = await this.plugin.calendarDataManager.getTasks();
            
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
                        if (task.status === 'x' || task.status === '-') {
                            hasCompletedTask = true;
                        } else {
                            hasTask = true;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check tasks for day indicator:', error);
        }
        
        // 更新指示器
        this.updateDayIndicators(dayCell, hasNote, hasTask, hasCompletedTask);
    }

    /**
        * 更新所有日期的指示器
        */
       async updateAllDayIndicators(container: any, currentDate: Date) {
           const dayCells = Array.from(container.querySelectorAll('.day-cell'));
           
           // 批量收集所有日期的数据
           const indicatorData = new Map<string, { hasNote: boolean; hasTask: boolean; hasCompletedTask: boolean }>();
           
           // 先提取所有任务，避免重复提取
           let allTasks: Task[] = [];
           try {
               allTasks = await this.plugin.calendarDataManager.getTasks();
           } catch (error) {
               console.error('Failed to extract tasks for day indicators:', error);
           }
           
           // 计算当前月份的日历数据
           const currentYear = currentDate.getFullYear();
           const currentMonth = currentDate.getMonth();
           
           const firstDay = new Date(currentYear, currentMonth, 1);
           let startDay = firstDay.getDay();
           const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
           
           // 周一为第一天：如果第一天是周日，需要显示6天上个月的日期，否则显示startDay-1天
           const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;
           
           // 计算上个月的最后一天
           const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0);
           const prevMonthDays = lastDayOfPrevMonth.getDate();
           const prevMonth = lastDayOfPrevMonth.getMonth();
           const prevMonthYear = lastDayOfPrevMonth.getFullYear();
           
           // 计算下个月的第一天
           const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
           const nextMonth = firstDayOfNextMonth.getMonth();
           const nextMonthYear = firstDayOfNextMonth.getFullYear();
           
           // 处理上个月的剩余天数
           let prevMonthDay = prevMonthDays - prevMonthDaysToShow + 1;
           
           // 处理下个月的起始天数
           let nextMonthDay = 1;
           
           let currentDay = 1;
           
           // 遍历所有行，更新内容
           for (let i = 0; i < dayCells.length; i++) {
               const cell = dayCells[i];
               const cellEl = cell as any;
               const dayNumberEl = cellEl.querySelector('.day-number');
               if (!dayNumberEl) continue;
               
               const dayNumber = parseInt(dayNumberEl.textContent || '0');
               if (isNaN(dayNumber)) continue;
               
               let date: Date;
               let isOtherMonth = cellEl.hasClass('other-month');
               
               // 根据单元格位置计算正确的日期
               if (i < prevMonthDaysToShow) {
                   // 上个月的日期
                   date = new Date(prevMonthYear, prevMonth, prevMonthDay);
                   prevMonthDay++;
               } else if (i < prevMonthDaysToShow + daysInMonth) {
                   // 当前月的日期
                   date = new Date(currentYear, currentMonth, currentDay);
                   currentDay++;
               } else {
                   // 下个月的日期
                   date = new Date(nextMonthYear, nextMonth, nextMonthDay);
                   nextMonthDay++;
               }
               
               // 检查是否有日记
               const dailySettings = this.plugin.settings.dailyNote;
               const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
               const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
               
               let hasNote = false;
               let hasTask = false;
               let hasCompletedTask = false;
               
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
                               
                               // 检查是否是已完成或已取消的任务
                               if (status.toLowerCase() === 'x' || status.toLowerCase() === '-') {
                                   hasCompletedTask = true;
                               } else {
                                   // 检查是否是未完成的任务
                                   // 检查任务文本中是否包含截止日期
                                   const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                                   const hasDueDate = dueDateRegex.test(taskText);
                                   
                                   // 如果没有截止日期，或者截止日期是当天，都算作当天的任务
                                   if (!hasDueDate) {
                                       hasTask = true;
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
                               if (task.status === 'x' || task.status === '-') {
                                   hasCompletedTask = true;
                               } else {
                                   hasTask = true;
                               }
                           }
                       }
                   }
               }
               
               // 存储数据，使用日期字符串作为键
               const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
               indicatorData.set(dateKey, { hasNote, hasTask, hasCompletedTask });
           }
           
           // 重置计数器，重新计算日期以应用更新
           prevMonthDay = prevMonthDays - prevMonthDaysToShow + 1;
           nextMonthDay = 1;
           currentDay = 1;
           
           // 一次性应用所有更新
           for (let i = 0; i < dayCells.length; i++) {
               const cell = dayCells[i];
               const cellEl = cell as any;
               const dayNumberEl = cellEl.querySelector('.day-number');
               if (!dayNumberEl) continue;
               
               const dayNumber = parseInt(dayNumberEl.textContent || '0');
               if (isNaN(dayNumber)) continue;
               
               let date: Date;
               
               // 根据单元格位置计算正确的日期
               if (i < prevMonthDaysToShow) {
                   // 上个月的日期
                   date = new Date(prevMonthYear, prevMonth, prevMonthDay);
                   prevMonthDay++;
               } else if (i < prevMonthDaysToShow + daysInMonth) {
                   // 当前月的日期
                   date = new Date(currentYear, currentMonth, currentDay);
                   currentDay++;
               } else {
                   // 下个月的日期
                   date = new Date(nextMonthYear, nextMonth, nextMonthDay);
                   nextMonthDay++;
               }
               
               const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
               const data = indicatorData.get(dateKey);
               if (data) {
                   this.updateDayIndicators(cellEl, data.hasNote, data.hasTask, data.hasCompletedTask);
               }
           }
       }

    /**
     * 更新周数指示器
     */
    async updateWeekIndicators(container: any, currentDate: Date) {
        const weekCells = Array.from(container.querySelectorAll('.week-number-cell'));
        
        // 批量收集所有周的数据
        const indicatorData = new Map<number, { hasNote: boolean; hasIncompleteTask: boolean; hasCompletedTask: boolean }>();
        
        // 先提取所有任务，避免重复提取
        let allTasks: Task[] = [];
        try {
            allTasks = await this.plugin.calendarDataManager.getTasks();
        } catch (error) {
            console.error('Failed to extract tasks for week indicators:', error);
        }
        
        for (const cell of weekCells) {
            const cellEl = cell as any;
            const weekNumberEl = cellEl.querySelector('.week-number-text');
            if (!weekNumberEl) continue;
            
            const weekNumber = parseInt(weekNumberEl.textContent || '0');
            if (isNaN(weekNumber)) continue;
            
            // 直接计算当前周的起始日期
            // 1. 计算当月第一天
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            
            // 2. 计算当月第一天所在的周数
            const firstDayWeekInfo = getWeekInfo(firstDayOfMonth);
            const firstDayWeekNumber = firstDayWeekInfo.week;
            
            // 3. 计算当前周与当月第一周的差值
            const weekDiff = weekNumber - firstDayWeekNumber;
            
            // 4. 计算当月第一周的起始日期（周一）
            let firstWeekStartDate = new Date(firstDayOfMonth);
            const firstDayOfWeek = firstDayOfMonth.getDay();
            const daysToFirstMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
            firstWeekStartDate.setDate(firstWeekStartDate.getDate() - daysToFirstMonday);
            
            // 5. 计算当前周的起始日期
            const weekStartDate = new Date(firstWeekStartDate);
            weekStartDate.setDate(weekStartDate.getDate() + weekDiff * 7);
            
            // 计算周结束日期
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            
            let hasWeeklyNote = false;
            let hasWeeklyIncompleteTask = false;
            let hasWeeklyCompletedTask = false;
            
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
                        if (task.status === "x" || task.status === "-") {
                            // 已完成或已取消的任务
                            hasWeeklyCompletedTask = true;
                        } else {
                            // 未完成的任务（待办或进行中）
                            hasWeeklyIncompleteTask = true;
                        }
                    }
                }
            }
            
            // 存储数据，使用周数作为键
            indicatorData.set(weekNumber, { 
                hasNote: hasWeeklyNote, 
                hasIncompleteTask: hasWeeklyIncompleteTask, 
                hasCompletedTask: hasWeeklyCompletedTask 
            });
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
                    
                    // 添加空心小圆点表示未完成任务
                    if (data.hasIncompleteTask) {
                        indicators.createEl('div', {cls: 'indicator-dot hollow-dot'});
                    }
                    
                    // 添加绿色实心小圆点表示已完成任务
                    if (data.hasCompletedTask) {
                        indicators.createEl('div', {cls: 'indicator-dot check-dot'});
                    }
                }
            }
        }
    }

    /**
     * 更新日期单元格的指示器
     */
    private updateDayIndicators(cell: any, hasNote: boolean, hasTask: boolean, hasCompletedTask: boolean) {
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
            
            // 显示已完成任务指示器（对勾）
            if (hasCompletedTask) {
                indicatorRow.createEl('div', {cls: 'indicator-dot check-dot'});
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
