import { __awaiter } from "tslib";
import { getLunarDate, formatDate } from '../../../utils/dateUtils';
import { noteExists } from '../../../services/noteService';
export class IndicatorRenderer {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * 更新单个日期的指示器
     */
    updateSingleDayIndicator(container, date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 获取对应日期的单元格
            const dayCell = this.getDayCellByDate(container, date);
            if (!dayCell)
                return;
            // 检查是否有日记和任务
            const dailySettings = this.plugin.settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            let hasNote = false;
            let hasTask = false;
            if (yield noteExists(this.plugin.app, dailyNotePath)) {
                hasNote = true;
                // 检查当天日记中没有截止日期的任务
                try {
                    const dailyFile = this.plugin.app.vault.getAbstractFileByPath(dailyNotePath);
                    if (dailyFile && 'stat' in dailyFile) {
                        const content = yield this.plugin.app.vault.read(dailyFile);
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
                                }
                                else {
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
                }
                catch (error) {
                    console.error('Failed to check daily note tasks:', error);
                }
            }
            // 检查所有文件中截止日期在当天的任务（其他文件中的任务）
            try {
                const allTasks = yield this.plugin.calendarDataManager.getTasks();
                // 筛选截止日期在当天的任务
                // 创建当天的开始和结束时间（本地时间）
                const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
                for (const task of allTasks) {
                    // 只检查其他文件中的任务，避免重复检查
                    if (task.filePath !== dailyNotePath && task.dueDate) {
                        // 创建任务截止日期的本地时间版本（去除时区影响）
                        const taskDueDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate(), task.dueDate.getHours(), task.dueDate.getMinutes(), task.dueDate.getSeconds(), task.dueDate.getMilliseconds());
                        if (taskDueDate >= dayStart && taskDueDate <= dayEnd) {
                            hasTask = true;
                            break;
                        }
                    }
                }
            }
            catch (error) {
                console.error('Failed to check tasks for day indicator:', error);
            }
            // 更新指示器
            this.updateDayIndicators(dayCell, hasNote, hasTask);
        });
    }
    /**
     * 更新所有日期的指示器
     */
    updateAllDayIndicators(container, currentDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const dayCells = Array.from(container.querySelectorAll('.day-cell:not(.other-month)'));
            // 批量收集所有日期的数据
            const indicatorData = new Map();
            // 先提取所有任务，避免重复提取
            let allTasks = [];
            try {
                allTasks = yield this.plugin.calendarDataManager.getTasks();
            }
            catch (error) {
                console.error('Failed to extract tasks for day indicators:', error);
            }
            for (const cell of dayCells) {
                const cellEl = cell;
                const dayNumberEl = cellEl.querySelector('.day-number');
                if (!dayNumberEl)
                    continue;
                const dayNumber = parseInt(dayNumberEl.textContent || '0');
                if (isNaN(dayNumber))
                    continue;
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
                if (yield noteExists(this.plugin.app, dailyNotePath)) {
                    hasNote = true;
                    // 检查当天日记中没有截止日期的任务
                    try {
                        const dailyFile = this.plugin.app.vault.getAbstractFileByPath(dailyNotePath);
                        if (dailyFile && 'stat' in dailyFile) {
                            const content = yield this.plugin.app.vault.read(dailyFile);
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
                                    }
                                    else {
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
                    }
                    catch (error) {
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
                            const taskDueDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate(), task.dueDate.getHours(), task.dueDate.getMinutes(), task.dueDate.getSeconds(), task.dueDate.getMilliseconds());
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
                const cellEl = cell;
                const dayNumberEl = cellEl.querySelector('.day-number');
                if (!dayNumberEl)
                    continue;
                const dayNumber = parseInt(dayNumberEl.textContent || '0');
                if (isNaN(dayNumber))
                    continue;
                // 获取当前视图的年月
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const dataKey = `${year}-${month}-${dayNumber}`;
                const data = indicatorData.get(dataKey);
                if (data) {
                    this.updateDayIndicators(cellEl, data.hasNote, data.hasTask);
                }
            }
        });
    }
    /**
     * 更新周数指示器
     */
    updateWeekIndicators(container, currentDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const weekCells = Array.from(container.querySelectorAll('.week-number-cell'));
            // 批量收集所有周的数据
            const indicatorData = new Map();
            // 先提取所有任务，避免重复提取
            let allTasks = [];
            try {
                allTasks = yield this.plugin.calendarDataManager.getTasks();
            }
            catch (error) {
                console.error('Failed to extract tasks for week indicators:', error);
            }
            for (const cell of weekCells) {
                const cellEl = cell;
                const weekNumberEl = cellEl.querySelector('.week-number-text');
                if (!weekNumberEl)
                    continue;
                const weekNumber = parseInt(weekNumberEl.textContent || '0');
                if (isNaN(weekNumber))
                    continue;
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
                    if (yield noteExists(this.plugin.app, path)) {
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
                const cellEl = cell;
                const weekNumberEl = cellEl.querySelector('.week-number-text');
                if (!weekNumberEl)
                    continue;
                const weekNumber = parseInt(weekNumberEl.textContent || '0');
                if (isNaN(weekNumber))
                    continue;
                const data = indicatorData.get(weekNumber);
                if (data) {
                    // 清空现有指示器
                    const indicators = cellEl.querySelector('.week-indicators');
                    if (indicators) {
                        indicators.empty();
                        // 添加实心小圆点表示周报
                        if (data.hasNote) {
                            indicators.createEl('div', { cls: 'indicator-dot solid-dot' });
                        }
                        // 添加空心小圆点表示任务
                        if (data.hasTask) {
                            indicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
                        }
                    }
                }
            }
        });
    }
    /**
     * 更新日期单元格的指示器
     */
    updateDayIndicators(cell, hasNote, hasTask) {
        // 清空现有指示器
        const indicatorsContainer = cell.querySelector('.day-indicators');
        if (indicatorsContainer) {
            indicatorsContainer.empty();
            // 创建一行指示器
            const indicatorRow = indicatorsContainer.createEl('div', { cls: 'indicator-row' });
            // 显示日记指示器（实心小圆点）
            if (hasNote) {
                indicatorRow.createEl('div', { cls: 'indicator-dot solid-dot' });
            }
            // 显示任务指示器（空心小圆点）
            if (hasTask) {
                indicatorRow.createEl('div', { cls: 'indicator-dot hollow-dot' });
            }
        }
    }
    /**
     * 根据日期获取对应的单元格
     */
    getDayCellByDate(container, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();
        // 查找对应日期的单元格
        const dayCells = Array.from(container.querySelectorAll('.day-cell:not(.other-month)'));
        for (const cell of dayCells) {
            const cellEl = cell;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl)
                continue;
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
    updateDaySelection(container, selectedDate) {
        // 移除所有日期单元格的选中状态
        container.querySelectorAll(".day-cell").forEach((cell) => {
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
    updateLunarDates(container, currentDate) {
        const dayCells = Array.from(container.querySelectorAll('.day-cell'));
        for (const cell of dayCells) {
            const cellEl = cell;
            const dayNumberEl = cellEl.querySelector('.day-number');
            if (!dayNumberEl)
                continue;
            const dayNumber = parseInt(dayNumberEl.textContent || '0');
            if (isNaN(dayNumber))
                continue;
            // 计算当前日期
            const isOtherMonth = cellEl.hasClass('other-month');
            let date;
            if (isOtherMonth) {
                // 其他月份的日期，需要计算具体日期
                // 这里可以根据实际的日期计算逻辑进行实现
                // 暂时使用当前月份的日期，后续可以根据具体需求修改
                date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
            }
            else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kaWNhdG9yUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRpY2F0b3JSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHM0QsTUFBTSxPQUFPLGlCQUFpQjtJQUcxQixZQUFZLE1BQWdCO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNHLHdCQUF3QixDQUFDLFNBQWMsRUFBRSxJQUFVOztZQUNyRCxhQUFhO1lBQ2IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsT0FBTztnQkFBRSxPQUFPO1lBRXJCLGFBQWE7WUFDYixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDckQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDckUsTUFBTSxhQUFhLEdBQUcsR0FBRyxhQUFhLENBQUMsUUFBUSxJQUFJLGFBQWEsS0FBSyxDQUFDO1lBRXRFLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQztZQUNwQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFFcEIsSUFBSSxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUVmLG1CQUFtQjtnQkFDbkIsSUFBSSxDQUFDO29CQUNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtB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QUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7aUJBQU0sQ0FBQztnQkFDSixVQUFVO2dCQUNWLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xGLENBQUM7WUFFRCxTQUFTO1lBQ1QsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN0RCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsU0FBUyxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDO2dCQUM3QyxTQUFTLENBQUMsU0FBUyxHQUFHLG9CQUFvQixlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckUsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNeVBsdWdpbiB9IGZyb20gJy4uLy4uLy4uL21haW4nO1xyXG5pbXBvcnQgeyBnZXRMdW5hckRhdGUsIGZvcm1hdERhdGUgfSBmcm9tICcuLi8uLi8uLi91dGlscy9kYXRlVXRpbHMnO1xyXG5pbXBvcnQgeyBub3RlRXhpc3RzIH0gZnJvbSAnLi4vLi4vLi4vc2VydmljZXMvbm90ZVNlcnZpY2UnO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSAnLi4vLi4vLi4vc2VydmljZXMvdGFza1NlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEluZGljYXRvclJlbmRlcmVyIHtcclxuICAgIHByaXZhdGUgcGx1Z2luOiBNeVBsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwbHVnaW46IE15UGx1Z2luKSB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDljZXkuKrml6XmnJ/nmoTmjIfnpLrlmahcclxuICAgICAqL1xyXG4gICAgYXN5bmMgdXBkYXRlU2luZ2xlRGF5SW5kaWNhdG9yKGNvbnRhaW5lcjogYW55LCBkYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgLy8g6I635Y+W5a+55bqU5pel5pyf55qE5Y2V5YWD5qC8XHJcbiAgICAgICAgY29uc3QgZGF5Q2VsbCA9IHRoaXMuZ2V0RGF5Q2VsbEJ5RGF0ZShjb250YWluZXIsIGRhdGUpO1xyXG4gICAgICAgIGlmICghZGF5Q2VsbCkgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeaYr+WQpuacieaXpeiusOWSjOS7u+WKoVxyXG4gICAgICAgIGNvbnN0IGRhaWx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGU7XHJcbiAgICAgICAgY29uc3QgZGFpbHlGaWxlTmFtZSA9IGZvcm1hdERhdGUoZGF0ZSwgZGFpbHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgY29uc3QgZGFpbHlOb3RlUGF0aCA9IGAke2RhaWx5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7ZGFpbHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBoYXNOb3RlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGhhc1Rhc2sgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoYXdhaXQgbm90ZUV4aXN0cyh0aGlzLnBsdWdpbi5hcHAsIGRhaWx5Tm90ZVBhdGgpKSB7XHJcbiAgICAgICAgICAgIGhhc05vdGUgPSB0cnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l5b2T5aSp5pel6K6w5Lit5rKh5pyJ5oiq5q2i5pel5pyf55qE5Lu75YqhXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYWlseUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGRhaWx5Tm90ZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRhaWx5RmlsZSAmJiAnc3RhdCcgaW4gZGFpbHlGaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwcC52YXVsdC5yZWFkKGRhaWx5RmlsZSBhcyBhbnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqCB0YXNrUmVnZXgg5Yy56YWN5omA5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza1JlZ2V4ID0gL15cXHMqLVxccypcXFsoLilcXF1cXHMqKC4rKSQvZ207XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSB0YXNrUmVnZXguZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5o+Q5Y+W5Lu75Yqh54q25oCB5ZKM5paH5pysXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IG1hdGNoWzFdIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrVGV4dCA9IG1hdGNoWzJdIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5pyq5a6M5oiQ55qE5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMudG9Mb3dlckNhc2UoKSAhPT0gJ3gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xku7vliqHmlofmnKzkuK3mmK/lkKbljIXlkKvmiKrmraLml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGVSZWdleCA9IC8oPzpbQCNdfGR1ZTpcXHM/fPCfk4VcXHM/KShcXGR7NH0tXFxkezJ9LVxcZHsyfSkvO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzRHVlRGF0ZSA9IGR1ZURhdGVSZWdleC50ZXN0KHRhc2tUZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5pyJ5oiq5q2i5pel5pyf77yM5oiW6ICF5oiq5q2i5pel5pyf5piv5b2T5aSp77yM6YO9566X5L2c5b2T5aSp55qE5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc0R1ZURhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNUYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8g5Y+q6KaB5pyJ5LiA5Liq56ym5ZCI5p2h5Lu255qE5Lu75Yqh77yM5bCx5Y+v5Lul6YCA5Ye65b6q546vXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieaIquatouaXpeacn++8jOajgOafpeaYr+WQpuaYr+W9k+WkqVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGVNYXRjaCA9IHRhc2tUZXh0Lm1hdGNoKGR1ZURhdGVSZWdleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGVNYXRjaCAmJiBkdWVEYXRlTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZVN0ciA9IGR1ZURhdGVNYXRjaFsxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKGR1ZURhdGVTdHIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yib5bu65b2T5aSp55qE5byA5aeL5ZKM57uT5p2f5pe26Ze0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheVN0YXJ0ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCAwLCAwLCAwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5RW5kID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCAyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGUgPj0gZGF5U3RhcnQgJiYgZHVlRGF0ZSA8PSBkYXlFbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1Rhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2hlY2sgZGFpbHkgbm90ZSB0YXNrczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5omA5pyJ5paH5Lu25Lit5oiq5q2i5pel5pyf5Zyo5b2T5aSp55qE5Lu75Yqh77yI5YW25LuW5paH5Lu25Lit55qE5Lu75Yqh77yJXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYWxsVGFza3MgPSBhd2FpdCB0aGlzLnBsdWdpbi5jYWxlbmRhckRhdGFNYW5hZ2VyLmdldFRhc2tzKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDnrZvpgInmiKrmraLml6XmnJ/lnKjlvZPlpKnnmoTku7vliqFcclxuICAgICAgICAgICAgLy8g5Yib5bu65b2T5aSp55qE5byA5aeL5ZKM57uT5p2f5pe26Ze077yI5pys5Zyw5pe26Ze077yJXHJcbiAgICAgICAgICAgIGNvbnN0IGRheVN0YXJ0ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCAwLCAwLCAwLCAwKTtcclxuICAgICAgICAgICAgY29uc3QgZGF5RW5kID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCAyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDlj6rmo4Dmn6Xlhbbku5bmlofku7bkuK3nmoTku7vliqHvvIzpgb/lhY3ph43lpI3mo4Dmn6VcclxuICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoICE9PSBkYWlseU5vdGVQYXRoICYmIHRhc2suZHVlRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uuS7u+WKoeaIquatouaXpeacn+eahOacrOWcsOaXtumXtOeJiOacrO+8iOWOu+mZpOaXtuWMuuW9seWTje+8iVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tEdWVEYXRlID0gbmV3IERhdGUoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmR1ZURhdGUuZ2V0TW9udGgoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldERhdGUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRNaW51dGVzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRTZWNvbmRzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRNaWxsaXNlY29uZHMoKVxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2tEdWVEYXRlID49IGRheVN0YXJ0ICYmIHRhc2tEdWVEYXRlIDw9IGRheUVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNUYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNoZWNrIHRhc2tzIGZvciBkYXkgaW5kaWNhdG9yOicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pu05paw5oyH56S65ZmoXHJcbiAgICAgICAgdGhpcy51cGRhdGVEYXlJbmRpY2F0b3JzKGRheUNlbGwsIGhhc05vdGUsIGhhc1Rhc2spO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5pu05paw5omA5pyJ5pel5pyf55qE5oyH56S65ZmoXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHVwZGF0ZUFsbERheUluZGljYXRvcnMoY29udGFpbmVyOiBhbnksIGN1cnJlbnREYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgY29uc3QgZGF5Q2VsbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5LWNlbGw6bm90KC5vdGhlci1tb250aCknKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5om56YeP5pS26ZuG5omA5pyJ5pel5pyf55qE5pWw5o2uXHJcbiAgICAgICAgY29uc3QgaW5kaWNhdG9yRGF0YSA9IG5ldyBNYXA8c3RyaW5nLCB7IGhhc05vdGU6IGJvb2xlYW47IGhhc1Rhc2s6IGJvb2xlYW4gfT4oKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDlhYjmj5Dlj5bmiYDmnInku7vliqHvvIzpgb/lhY3ph43lpI3mj5Dlj5ZcclxuICAgICAgICBsZXQgYWxsVGFza3M6IFRhc2tbXSA9IFtdO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGFsbFRhc2tzID0gYXdhaXQgdGhpcy5wbHVnaW4uY2FsZW5kYXJEYXRhTWFuYWdlci5nZXRUYXNrcygpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBleHRyYWN0IHRhc2tzIGZvciBkYXkgaW5kaWNhdG9yczonLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGZvciAoY29uc3QgY2VsbCBvZiBkYXlDZWxscykge1xyXG4gICAgICAgICAgICBjb25zdCBjZWxsRWwgPSBjZWxsIGFzIGFueTtcclxuICAgICAgICAgICAgY29uc3QgZGF5TnVtYmVyRWwgPSBjZWxsRWwucXVlcnlTZWxlY3RvcignLmRheS1udW1iZXInKTtcclxuICAgICAgICAgICAgaWYgKCFkYXlOdW1iZXJFbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBkYXlOdW1iZXIgPSBwYXJzZUludChkYXlOdW1iZXJFbC50ZXh0Q29udGVudCB8fCAnMCcpO1xyXG4gICAgICAgICAgICBpZiAoaXNOYU4oZGF5TnVtYmVyKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDojrflj5blvZPliY3op4blm77nmoTlubTmnIhcclxuICAgICAgICAgICAgY29uc3QgeWVhciA9IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoID0gY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoLCBkYXlOdW1iZXIpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJ5pel6K6wXHJcbiAgICAgICAgICAgIGNvbnN0IGRhaWx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGU7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhaWx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKGRhdGUsIGRhaWx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG4gICAgICAgICAgICBjb25zdCBkYWlseU5vdGVQYXRoID0gYCR7ZGFpbHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtkYWlseUZpbGVOYW1lfS5tZGA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgaGFzTm90ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgaGFzVGFzayA9IGZhbHNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGF3YWl0IG5vdGVFeGlzdHModGhpcy5wbHVnaW4uYXBwLCBkYWlseU5vdGVQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgaGFzTm90ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOajgOafpeW9k+WkqeaXpeiusOS4reayoeacieaIquatouaXpeacn+eahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYWlseUZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGRhaWx5Tm90ZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYWlseUZpbGUgJiYgJ3N0YXQnIGluIGRhaWx5RmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5wbHVnaW4uYXBwLnZhdWx0LnJlYWQoZGFpbHlGaWxlIGFzIGFueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKggdGFza1JlZ2V4IOWMuemFjeaJgOacieS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrUmVnZXggPSAvXlxccyooLXxcXCp8XFxkK1xcLilcXHMqXFxbKC4pXFxdXFxzKiguKykkL2dtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2g7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSB0YXNrUmVnZXguZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaPkOWPluS7u+WKoeeKtuaAgeWSjOaWh+acrFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gbWF0Y2hbMl0gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrVGV4dCA9IG1hdGNoWzNdIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/mnKrlrozmiJDnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMudG9Mb3dlckNhc2UoKSAhPT0gJ3gnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5Lu75Yqh5paH5pys5Lit5piv5ZCm5YyF5ZCr5oiq5q2i5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZVJlZ2V4ID0gLyg/OltAI118ZHVlOlxccz988J+ThVxccz8pKFxcZHs0fS1cXGR7Mn0tXFxkezJ9KS87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzRHVlRGF0ZSA9IGR1ZURhdGVSZWdleC50ZXN0KHRhc2tUZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmsqHmnInmiKrmraLml6XmnJ/vvIzmiJbogIXmiKrmraLml6XmnJ/mmK/lvZPlpKnvvIzpg73nrpfkvZzlvZPlpKnnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc0R1ZURhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyDlj6ropoHmnInkuIDkuKrnrKblkIjmnaHku7bnmoTku7vliqHvvIzlsLHlj6/ku6XpgIDlh7rlvqrnjq9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnInmiKrmraLml6XmnJ/vvIzmo4Dmn6XmmK/lkKbmmK/lvZPlpKlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZU1hdGNoID0gdGFza1RleHQubWF0Y2goZHVlRGF0ZVJlZ2V4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGVNYXRjaCAmJiBkdWVEYXRlTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGVTdHIgPSBkdWVEYXRlTWF0Y2hbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlID0gbmV3IERhdGUoZHVlRGF0ZVN0cik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uuW9k+WkqeeahOW8gOWni+WSjOe7k+adn+aXtumXtFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5U3RhcnQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIDAsIDAsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5RW5kID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpLCAyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVlRGF0ZSA+PSBkYXlTdGFydCAmJiBkdWVEYXRlIDw9IGRheUVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1Rhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2hlY2sgZGFpbHkgbm90ZSB0YXNrczonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeaJgOacieaWh+S7tuS4reaIquatouaXpeacn+WcqOW9k+WkqeeahOS7u+WKoe+8iOWFtuS7luaWh+S7tuS4reeahOS7u+WKoe+8iVxyXG4gICAgICAgICAgICBpZiAoYWxsVGFza3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8g5Yib5bu65b2T5aSp55qE5byA5aeL5ZKM57uT5p2f5pe26Ze077yI5pys5Zyw5pe26Ze077yJXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlTdGFydCA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCBkYXRlLmdldERhdGUoKSwgMCwgMCwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFbmQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIDIzLCA1OSwgNTksIDk5OSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGFzayBvZiBhbGxUYXNrcykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWPquajgOafpeWFtuS7luaWh+S7tuS4reeahOS7u+WKoe+8jOmBv+WFjemHjeWkjeajgOafpVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoICE9PSBkYWlseU5vdGVQYXRoICYmIHRhc2suZHVlRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rku7vliqHmiKrmraLml6XmnJ/nmoTmnKzlnLDml7bpl7TniYjmnKzvvIjljrvpmaTml7bljLrlvbHlk43vvIlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza0R1ZURhdGUgPSBuZXcgRGF0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldE1vbnRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmR1ZURhdGUuZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmR1ZURhdGUuZ2V0TWludXRlcygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldFNlY29uZHMoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRNaWxsaXNlY29uZHMoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2tEdWVEYXRlID49IGRheVN0YXJ0ICYmIHRhc2tEdWVEYXRlIDw9IGRheUVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5a2Y5YKo5pWw5o2u77yM5L2/55So5pel5pyf5a2X56ym5Liy5L2c5Li66ZSuXHJcbiAgICAgICAgICAgIGluZGljYXRvckRhdGEuc2V0KGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5TnVtYmVyfWAsIHsgaGFzTm90ZSwgaGFzVGFzayB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5LiA5qyh5oCn5bqU55So5omA5pyJ5pu05pawXHJcbiAgICAgICAgZm9yIChjb25zdCBjZWxsIG9mIGRheUNlbGxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxFbCA9IGNlbGwgYXMgYW55O1xyXG4gICAgICAgICAgICBjb25zdCBkYXlOdW1iZXJFbCA9IGNlbGxFbC5xdWVyeVNlbGVjdG9yKCcuZGF5LW51bWJlcicpO1xyXG4gICAgICAgICAgICBpZiAoIWRheU51bWJlckVsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGRheU51bWJlciA9IHBhcnNlSW50KGRheU51bWJlckVsLnRleHRDb250ZW50IHx8ICcwJyk7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihkYXlOdW1iZXIpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiOt+WPluW9k+WJjeinhuWbvueahOW5tOaciFxyXG4gICAgICAgICAgICBjb25zdCB5ZWFyID0gY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgY29uc3QgbW9udGggPSBjdXJyZW50RGF0ZS5nZXRNb250aCgpO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhS2V5ID0gYCR7eWVhcn0tJHttb250aH0tJHtkYXlOdW1iZXJ9YDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBpbmRpY2F0b3JEYXRhLmdldChkYXRhS2V5KTtcclxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRGF5SW5kaWNhdG9ycyhjZWxsRWwsIGRhdGEuaGFzTm90ZSwgZGF0YS5oYXNUYXNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOabtOaWsOWRqOaVsOaMh+ekuuWZqFxyXG4gICAgICovXHJcbiAgICBhc3luYyB1cGRhdGVXZWVrSW5kaWNhdG9ycyhjb250YWluZXI6IGFueSwgY3VycmVudERhdGU6IERhdGUpIHtcclxuICAgICAgICBjb25zdCB3ZWVrQ2VsbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcud2Vlay1udW1iZXItY2VsbCcpKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmibnph4/mlLbpm4bmiYDmnInlkajnmoTmlbDmja5cclxuICAgICAgICBjb25zdCBpbmRpY2F0b3JEYXRhID0gbmV3IE1hcDxudW1iZXIsIHsgaGFzTm90ZTogYm9vbGVhbjsgaGFzVGFzazogYm9vbGVhbiB9PigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWFiOaPkOWPluaJgOacieS7u+WKoe+8jOmBv+WFjemHjeWkjeaPkOWPllxyXG4gICAgICAgIGxldCBhbGxUYXNrczogVGFza1tdID0gW107XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYWxsVGFza3MgPSBhd2FpdCB0aGlzLnBsdWdpbi5jYWxlbmRhckRhdGFNYW5hZ2VyLmdldFRhc2tzKCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGV4dHJhY3QgdGFza3MgZm9yIHdlZWsgaW5kaWNhdG9yczonLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGZvciAoY29uc3QgY2VsbCBvZiB3ZWVrQ2VsbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgY2VsbEVsID0gY2VsbCBhcyBhbnk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtOdW1iZXJFbCA9IGNlbGxFbC5xdWVyeVNlbGVjdG9yKCcud2Vlay1udW1iZXItdGV4dCcpO1xyXG4gICAgICAgICAgICBpZiAoIXdlZWtOdW1iZXJFbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCB3ZWVrTnVtYmVyID0gcGFyc2VJbnQod2Vla051bWJlckVsLnRleHRDb250ZW50IHx8ICcwJyk7XHJcbiAgICAgICAgICAgIGlmIChpc05hTih3ZWVrTnVtYmVyKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorqHnrpflvZPliY3lkajnmoTotbflp4vml6XmnJ9cclxuICAgICAgICAgICAgY29uc3QgZmlyc3REYXlPZk1vbnRoID0gbmV3IERhdGUoY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKSwgY3VycmVudERhdGUuZ2V0TW9udGgoKSwgMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF5T2ZXZWVrID0gZmlyc3REYXlPZk1vbnRoLmdldERheSgpO1xyXG4gICAgICAgICAgICBjb25zdCBwcmV2TW9udGhEYXlzVG9TaG93ID0gc3RhcnREYXlPZldlZWsgPT09IDAgPyA2IDogc3RhcnREYXlPZldlZWsgLSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0RGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCksIGN1cnJlbnREYXRlLmdldE1vbnRoKCksIDEpO1xyXG4gICAgICAgICAgICB3ZWVrU3RhcnREYXRlLnNldERhdGUod2Vla1N0YXJ0RGF0ZS5nZXREYXRlKCkgLSBwcmV2TW9udGhEYXlzVG9TaG93ICsgKHdlZWtOdW1iZXIgLSAxKSAqIDcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6K6h566X5ZGo57uT5p2f5pel5pyfXHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtFbmREYXRlID0gbmV3IERhdGUod2Vla1N0YXJ0RGF0ZSk7XHJcbiAgICAgICAgICAgIHdlZWtFbmREYXRlLnNldERhdGUod2Vla0VuZERhdGUuZ2V0RGF0ZSgpICsgNik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgaGFzV2Vla2x5Tm90ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgaGFzV2Vla2x5VGFzayA9IGZhbHNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6I635Y+W5ZGo5oql6K6+572uXHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZTtcclxuICAgICAgICAgICAgY29uc3Qgd2Vla2x5RmlsZU5hbWUgPSBmb3JtYXREYXRlKHdlZWtTdGFydERhdGUsIHdlZWtseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeWkmuenjeWPr+iDveeahOWRqOaKpei3r+W+hFxyXG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xyXG4gICAgICAgICAgICAgICAgYCR7d2Vla2x5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7d2Vla2x5RmlsZU5hbWV9Lm1kYCxcclxuICAgICAgICAgICAgICAgIGAwMC3lkajmnJ/nrJTorrAvMi3lkajmiqUvJHt3ZWVrbHlGaWxlTmFtZX0ubWRgLFxyXG4gICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke2Zvcm1hdERhdGUod2Vla1N0YXJ0RGF0ZSwgXCJZWVlZLXdXV1wiKX0ubWRgLFxyXG4gICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke2Zvcm1hdERhdGUod2Vla1N0YXJ0RGF0ZSwgXCJZWVlZLVdXXCIpfS5tZGBcclxuICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOWRqOaKpVxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgcG9zc2libGVQYXRocykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGF3YWl0IG5vdGVFeGlzdHModGhpcy5wbHVnaW4uYXBwLCBwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGhhc1dlZWtseU5vdGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmo4Dmn6XmnKzlkajlhoXmmK/lkKbmnInmiKrmraLku7vliqFcclxuICAgICAgICAgICAgaWYgKGFsbFRhc2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGFzayBvZiBhbGxUYXNrcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmR1ZURhdGUgJiYgdGFzay5kdWVEYXRlID49IHdlZWtTdGFydERhdGUgJiYgdGFzay5kdWVEYXRlIDw9IHdlZWtFbmREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc1dlZWtseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOWtmOWCqOaVsOaNru+8jOS9v+eUqOWRqOaVsOS9nOS4uumUrlxyXG4gICAgICAgICAgICBpbmRpY2F0b3JEYXRhLnNldCh3ZWVrTnVtYmVyLCB7IGhhc05vdGU6IGhhc1dlZWtseU5vdGUsIGhhc1Rhc2s6IGhhc1dlZWtseVRhc2sgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOS4gOasoeaAp+W6lOeUqOaJgOacieabtOaWsFxyXG4gICAgICAgIGZvciAoY29uc3QgY2VsbCBvZiB3ZWVrQ2VsbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgY2VsbEVsID0gY2VsbCBhcyBhbnk7XHJcbiAgICAgICAgICAgIGNvbnN0IHdlZWtOdW1iZXJFbCA9IGNlbGxFbC5xdWVyeVNlbGVjdG9yKCcud2Vlay1udW1iZXItdGV4dCcpO1xyXG4gICAgICAgICAgICBpZiAoIXdlZWtOdW1iZXJFbCkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCB3ZWVrTnVtYmVyID0gcGFyc2VJbnQod2Vla051bWJlckVsLnRleHRDb250ZW50IHx8ICcwJyk7XHJcbiAgICAgICAgICAgIGlmIChpc05hTih3ZWVrTnVtYmVyKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gaW5kaWNhdG9yRGF0YS5nZXQod2Vla051bWJlcik7XHJcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDmuIXnqbrnjrDmnInmjIfnpLrlmahcclxuICAgICAgICAgICAgICAgIGNvbnN0IGluZGljYXRvcnMgPSBjZWxsRWwucXVlcnlTZWxlY3RvcignLndlZWstaW5kaWNhdG9ycycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGljYXRvcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3JzLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5re75Yqg5a6e5b+D5bCP5ZyG54K56KGo56S65ZGo5oqlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaGFzTm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRpY2F0b3JzLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBzb2xpZC1kb3QnfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOepuuW/g+Wwj+WchueCueihqOekuuS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmhhc1Rhc2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kaWNhdG9ycy5jcmVhdGVFbCgnZGl2Jywge2NsczogJ2luZGljYXRvci1kb3QgaG9sbG93LWRvdCd9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDml6XmnJ/ljZXlhYPmoLznmoTmjIfnpLrlmahcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVEYXlJbmRpY2F0b3JzKGNlbGw6IGFueSwgaGFzTm90ZTogYm9vbGVhbiwgaGFzVGFzazogYm9vbGVhbikge1xyXG4gICAgICAgIC8vIOa4heepuueOsOacieaMh+ekuuWZqFxyXG4gICAgICAgIGNvbnN0IGluZGljYXRvcnNDb250YWluZXIgPSBjZWxsLnF1ZXJ5U2VsZWN0b3IoJy5kYXktaW5kaWNhdG9ycycpO1xyXG4gICAgICAgIGlmIChpbmRpY2F0b3JzQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIGluZGljYXRvcnNDb250YWluZXIuZW1wdHkoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuS4gOihjOaMh+ekuuWZqFxyXG4gICAgICAgICAgICBjb25zdCBpbmRpY2F0b3JSb3cgPSBpbmRpY2F0b3JzQ29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLXJvdyd9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOaYvuekuuaXpeiusOaMh+ekuuWZqO+8iOWunuW/g+Wwj+WchueCue+8iVxyXG4gICAgICAgICAgICBpZiAoaGFzTm90ZSkge1xyXG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yUm93LmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBzb2xpZC1kb3QnfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOaYvuekuuS7u+WKoeaMh+ekuuWZqO+8iOepuuW/g+Wwj+WchueCue+8iVxyXG4gICAgICAgICAgICBpZiAoaGFzVGFzaykge1xyXG4gICAgICAgICAgICAgICAgaW5kaWNhdG9yUm93LmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBob2xsb3ctZG90J30pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5qC55o2u5pel5pyf6I635Y+W5a+55bqU55qE5Y2V5YWD5qC8XHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgZ2V0RGF5Q2VsbEJ5RGF0ZShjb250YWluZXI6IGFueSwgZGF0ZTogRGF0ZSk6IGFueSB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IHllYXIgPSBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgY29uc3QgbW9udGggPSBkYXRlLmdldE1vbnRoKCk7XHJcbiAgICAgICAgY29uc3QgZGF5ID0gZGF0ZS5nZXREYXRlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5p+l5om+5a+55bqU5pel5pyf55qE5Y2V5YWD5qC8XHJcbiAgICAgICAgY29uc3QgZGF5Q2VsbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5LWNlbGw6bm90KC5vdGhlci1tb250aCknKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBjZWxsIG9mIGRheUNlbGxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxFbCA9IGNlbGwgYXMgYW55O1xyXG4gICAgICAgICAgICBjb25zdCBkYXlOdW1iZXJFbCA9IGNlbGxFbC5xdWVyeVNlbGVjdG9yKCcuZGF5LW51bWJlcicpO1xyXG4gICAgICAgICAgICBpZiAoIWRheU51bWJlckVsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGRheU51bWJlciA9IHBhcnNlSW50KGRheU51bWJlckVsLnRleHRDb250ZW50IHx8ICcwJyk7XHJcbiAgICAgICAgICAgIGlmIChkYXlOdW1iZXIgPT09IGRheSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNlbGxFbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOabtOaWsOaXpeacn+WNleWFg+agvOeahOmAieS4reeKtuaAgVxyXG4gICAgICovXHJcbiAgICB1cGRhdGVEYXlTZWxlY3Rpb24oY29udGFpbmVyOiBhbnksIHNlbGVjdGVkRGF0ZTogRGF0ZSB8IG51bGwpIHtcclxuICAgICAgICAvLyDnp7vpmaTmiYDmnInml6XmnJ/ljZXlhYPmoLznmoTpgInkuK3nirbmgIFcclxuICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcIi5kYXktY2VsbFwiKS5mb3JFYWNoKChjZWxsOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQtZGF5Jyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5aaC5p6c5pyJ6YCJ5Lit55qE5pel5pyf77yM5re75Yqg6YCJ5Lit54q25oCBXHJcbiAgICAgICAgaWYgKHNlbGVjdGVkRGF0ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBkYXlDZWxsID0gdGhpcy5nZXREYXlDZWxsQnlEYXRlKGNvbnRhaW5lciwgc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgaWYgKGRheUNlbGwpIHtcclxuICAgICAgICAgICAgICAgIGRheUNlbGwuYWRkQ2xhc3MoJ3NlbGVjdGVkLWRheScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5pu05paw5Yac5Y6G5pel5pyfXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZUx1bmFyRGF0ZXMoY29udGFpbmVyOiBhbnksIGN1cnJlbnREYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgY29uc3QgZGF5Q2VsbHMgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuZGF5LWNlbGwnKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBjZWxsIG9mIGRheUNlbGxzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNlbGxFbCA9IGNlbGwgYXMgYW55O1xyXG4gICAgICAgICAgICBjb25zdCBkYXlOdW1iZXJFbCA9IGNlbGxFbC5xdWVyeVNlbGVjdG9yKCcuZGF5LW51bWJlcicpO1xyXG4gICAgICAgICAgICBpZiAoIWRheU51bWJlckVsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGRheU51bWJlciA9IHBhcnNlSW50KGRheU51bWJlckVsLnRleHRDb250ZW50IHx8ICcwJyk7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihkYXlOdW1iZXIpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuoeeul+W9k+WJjeaXpeacn1xyXG4gICAgICAgICAgICBjb25zdCBpc090aGVyTW9udGggPSBjZWxsRWwuaGFzQ2xhc3MoJ290aGVyLW1vbnRoJyk7XHJcbiAgICAgICAgICAgIGxldCBkYXRlOiBEYXRlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGlzT3RoZXJNb250aCkge1xyXG4gICAgICAgICAgICAgICAgLy8g5YW25LuW5pyI5Lu955qE5pel5pyf77yM6ZyA6KaB6K6h566X5YW35L2T5pel5pyfXHJcbiAgICAgICAgICAgICAgICAvLyDov5nph4zlj6/ku6XmoLnmja7lrp7pmYXnmoTml6XmnJ/orqHnrpfpgLvovpHov5vooYzlrp7njrBcclxuICAgICAgICAgICAgICAgIC8vIOaaguaXtuS9v+eUqOW9k+WJjeaciOS7veeahOaXpeacn++8jOWQjue7reWPr+S7peagueaNruWFt+S9k+mcgOaxguS/ruaUuVxyXG4gICAgICAgICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCksIGN1cnJlbnREYXRlLmdldE1vbnRoKCksIGRheU51bWJlcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyDlvZPliY3mnIjku73nmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgIGRhdGUgPSBuZXcgRGF0ZShjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpLCBjdXJyZW50RGF0ZS5nZXRNb250aCgpLCBkYXlOdW1iZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmm7TmlrDlhpzljobml6XmnJ9cclxuICAgICAgICAgICAgY29uc3QgbHVuYXJEYXRlID0gY2VsbEVsLnF1ZXJ5U2VsZWN0b3IoJy5sdW5hci1kYXRlJyk7XHJcbiAgICAgICAgICAgIGlmIChsdW5hckRhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGx1bmFyRGF0ZVJlc3VsdCA9IGdldEx1bmFyRGF0ZShkYXRlKTtcclxuICAgICAgICAgICAgICAgIGx1bmFyRGF0ZS50ZXh0Q29udGVudCA9IGx1bmFyRGF0ZVJlc3VsdC50ZXh0O1xyXG4gICAgICAgICAgICAgICAgbHVuYXJEYXRlLmNsYXNzTmFtZSA9IGBsdW5hci1kYXRlIGx1bmFyLSR7bHVuYXJEYXRlUmVzdWx0LnR5cGV9YDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=