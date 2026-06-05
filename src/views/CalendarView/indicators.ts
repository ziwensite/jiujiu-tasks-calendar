import { TFile } from 'obsidian';
import { CalendarView } from '../CalendarView';
import { formatDate, getWeekInfo } from '../../utils/dateUtils';
import { noteExists } from '../../services/noteService';
import { extractTasks } from '../../services/taskService';

export async function updateDaySelection(view: CalendarView): Promise<void> {
    const container = view.containerEl;
    const selectedDate = view.selectedDate;

    container.querySelectorAll(".day-cell.selected-day").forEach(cell => cell.removeClass('selected-day'));

    if (!selectedDate) return;

    const dayCells = container.querySelectorAll(".day-cell");
    for (const cell of Array.from(dayCells)) {
        const dateContainer = cell.querySelector('.date-container');
        if (!dateContainer) continue;

        const dayNumber = dateContainer.querySelector('.day-number');
        if (!dayNumber) continue;

        const cellDay = parseInt(dayNumber.textContent || '0');
        if (isNaN(cellDay)) continue;

        const cellMonth = cell.hasClass('other-month') ? 'other' : 'current';
        if (cellMonth === 'other') continue;

        const isSelected = cellDay === selectedDate.getDate();
        if (isSelected) {
            cell.addClass('selected-day');
        }
    }

    const currentToday = new Date();
    const isTodaySelected = selectedDate && selectedDate.toDateString() === currentToday.toDateString();

    const todayBtn = container.querySelector(".calendar-header-label-today");
    if (todayBtn) {
        if (isTodaySelected) {
            todayBtn.addClass("today-selected");
            todayBtn.removeClass("today-unselected");
        } else {
            todayBtn.addClass("today-unselected");
            todayBtn.removeClass("today-selected");
        }
    }

    view.updateWeekSelectionIfNeeded();
}

export async function updateIndicators(view: CalendarView): Promise<void> {
    if (view.viewType === 'month') {
        const targetDate = view.selectedDate || view.currentDate;
        await updateAllDayIndicators(view, targetDate);
        await updateWeekIndicators(view, targetDate);
    } else if (view.viewType === 'year') {
        await updateYearViewMonthIndicators(view);
    }
}

export async function updateAllDayIndicators(view: CalendarView, targetDate: Date): Promise<void> {
    const container = view.containerEl;
    const dayCells = container.querySelectorAll(".day-cell");
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

    for (const cell of Array.from(dayCells)) {
        const dateContainer = cell.querySelector('.date-container');
        if (!dateContainer) continue;

        const dayNumber = dateContainer.querySelector('.day-number');
        if (!dayNumber) continue;

        const cellDay = parseInt(dayNumber.textContent || '0');
        if (isNaN(cellDay)) continue;

        const isOtherMonth = cell.hasClass('other-month');
        let date: Date;
        if (isOtherMonth) {
            const prevMonthDay = parseInt(dayNumber.textContent || '0');
            if (cellDay > 15) {
                const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
                const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
                date = new Date(prevYear, prevMonth, cellDay);
            } else {
                const nextMonth = targetMonth === 11 ? 0 : targetMonth + 1;
                const nextYear = targetMonth === 11 ? targetYear + 1 : targetYear;
                date = new Date(nextYear, nextMonth, cellDay);
            }
        } else {
            date = new Date(targetYear, targetMonth, cellDay);
        }

        const indicatorsContainer = cell.querySelector(".day-indicators");
        if (indicatorsContainer) {
            await addDayIndicators(indicatorsContainer as HTMLElement, view, date);
        }
    }
}

export async function addDayIndicators(container: HTMLElement, view: CalendarView, date: Date): Promise<void> {
    const dailySettings = view.plugin.settings.dailyNote;
    const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
    const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;

    let hasNote = false;
    let hasTask = false;

    if (await noteExists(view.app, dailyNotePath)) {
        hasNote = true;

        try {
            const dailyFile = view.app.vault.getAbstractFileByPath(dailyNotePath);
            if (dailyFile instanceof TFile) {
                const content = await view.app.vault.read(dailyFile);
                const taskRegex = /^\s*([-\*\d]+\.?)\s*\[(.)\]\s*(.+)$/gm;
                let match;
                while ((match = taskRegex.exec(content)) !== null) {
                    const status = match[2] || '';
                    const taskText = match[3] || '';
                    if (status.toLowerCase() !== 'x') {
                        const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                        const hasDueDate = dueDateRegex.test(taskText);
                        if (!hasDueDate) {
                            hasTask = true;
                            break;
                        } else {
                            const dueDateMatch = taskText.match(dueDateRegex);
                            if (dueDateMatch && dueDateMatch[1]) {
                                const dueDate = new Date(dueDateMatch[1]);
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

    if (!hasTask) {
        try {
            const allTasks = await extractTasks(view.app, view.plugin.settings);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

            for (const task of allTasks) {
                if (task.filePath !== dailyNotePath && task.dueDate) {
                    const taskDueDate = new Date(
                        task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate(),
                        task.dueDate.getHours(), task.dueDate.getMinutes(),
                        task.dueDate.getSeconds(), task.dueDate.getMilliseconds()
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
    }

    container.empty();
    const indicatorRow = container.createEl('div', { cls: 'indicator-row' });
    if (hasNote) {
        indicatorRow.createEl('div', { cls: 'indicator-dot solid-dot' });
    }
    if (hasTask) {
        indicatorRow.createEl('div', { cls: 'indicator-dot hollow-dot' });
    }
}

export async function updateWeekIndicators(view: CalendarView, targetDate: Date): Promise<void> {
    const weekNumberCells = view.containerEl.querySelectorAll(".week-number-cell");
    weekNumberCells.forEach(async (cell, index) => {
        const currentYear = view.currentDate.getFullYear();
        const currentMonth = view.currentDate.getMonth();
        const firstDay = new Date(currentYear, currentMonth, 1);
        let startDay = firstDay.getDay();
        const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;

        const weeksPassed = index;
        const daysPassed = weeksPassed * 7 - prevMonthDaysToShow;
        const weekStartDate = new Date(currentYear, currentMonth, 1 + daysPassed);

        const dayOfWeek = weekStartDate.getDay();
        const adjustedDate = new Date(weekStartDate);
        adjustedDate.setDate(adjustedDate.getDate() + (dayOfWeek === 0 ? -6 : 1) - dayOfWeek);

        const weekInfo = getWeekInfo(adjustedDate);
        const weekNumber = weekInfo.week;

        const weekIndicators = cell.querySelector(".week-indicators");
        if (weekIndicators) {
            await checkWeekNoteAndTasks(view, adjustedDate, weekNumber, weekIndicators as HTMLElement);
        }
    });
}

export async function checkWeekNoteAndTasks(view: CalendarView, weekStartDate: Date, weekNumber: number, indicators: HTMLElement): Promise<void> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    let hasWeeklyNote = false;
    let hasWeeklyTask = false;

    const weeklySettings = view.plugin.settings.weeklyNote;
    const weeklyFileName = formatDate(weekStartDate, weeklySettings.fileNameFormat);

    const weeklyNotePath = `${weeklySettings.savePath}/${weeklyFileName}.md`;

    let weeklyFilePath = '';
    if (await noteExists(view.app, weeklyNotePath)) {
        hasWeeklyNote = true;
        weeklyFilePath = weeklyNotePath;
    }

    if (hasWeeklyNote && weeklyFilePath) {
        try {
            const file = view.app.vault.getAbstractFileByPath(weeklyFilePath);
            if (file instanceof TFile) {
                const content = await view.app.vault.read(file);
                const taskRegex = /^\s*([-\*\d]+\.?)\s*\[(.)\]\s*(.+)$/gm;
                let match;
                while ((match = taskRegex.exec(content)) !== null) {
                    const status = match[2] || '';
                    const taskText = match[3] || '';
                    if (status.toLowerCase() !== 'x') {
                        const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                        const hasDueDate = dueDateRegex.test(taskText);
                        if (!hasDueDate) {
                            hasWeeklyTask = true;
                            break;
                        } else {
                            const dueDateMatch = taskText.match(dueDateRegex);
                            if (dueDateMatch && dueDateMatch[1]) {
                                const dueDate = new Date(dueDateMatch[1]);
                                if (dueDate >= weekStartDate && dueDate <= weekEndDate) {
                                    hasWeeklyTask = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to read weekly note: ${weeklyFilePath}`, error);
        }
    }

    if (!hasWeeklyTask) {
        const allTasks = await extractTasks(view.app, view.plugin.settings);
        for (const task of allTasks) {
            if (task.dueDate && task.dueDate >= weekStartDate && task.dueDate <= weekEndDate) {
                hasWeeklyTask = true;
                break;
            }
        }
    }

    indicators.empty();
    if (hasWeeklyNote) {
        indicators.createEl("div", { cls: "indicator-dot solid-dot" });
    }
    if (hasWeeklyTask) {
        indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
    }
}

export async function checkMonthNoteAndTasks(view: CalendarView, monthIndex: number): Promise<{ hasNote: boolean; hasIncomplete: boolean; hasCompleted: boolean }> {
    const year = view.currentDate.getFullYear();
    const monthStartDate = new Date(year, monthIndex, 1);
    const monthEndDate = new Date(year, monthIndex + 1, 0);
    monthEndDate.setHours(23, 59, 59, 999);

    let hasMonthlyNote = false;
    let hasMonthlyIncompleteTask = false;
    let hasMonthlyCompletedTask = false;

    const monthlySettings = view.plugin.settings.monthlyNote;
    const monthlyFileName = formatDate(monthStartDate, monthlySettings.fileNameFormat);
    const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;

    if (await noteExists(view.app, monthlyNotePath)) {
        hasMonthlyNote = true;
    }

    const allTasks = await extractTasks(view.app, view.plugin.settings);
    for (const task of allTasks) {
        if (task.dueDate && task.dueDate >= monthStartDate && task.dueDate <= monthEndDate) {
            if (task.status === "x" || task.status === "-") {
                hasMonthlyCompletedTask = true;
            } else {
                hasMonthlyIncompleteTask = true;
            }
        }
    }

    return { hasNote: hasMonthlyNote, hasIncomplete: hasMonthlyIncompleteTask, hasCompleted: hasMonthlyCompletedTask };
}

export async function checkQuarterNoteAndTasks(view: CalendarView, quarter: number): Promise<{ hasNote: boolean; hasIncomplete: boolean; hasCompleted: boolean }> {
    const year = view.currentDate.getFullYear();
    const quarterStartMonth = quarter * 3;
    const quarterEndMonth = quarter * 3 + 2;
    const quarterStartDate = new Date(year, quarterStartMonth, 1);
    const quarterEndDate = new Date(year, quarterEndMonth + 1, 0);
    quarterEndDate.setHours(23, 59, 59, 999);

    let hasQuarterlyNote = false;
    let hasQuarterlyIncompleteTask = false;
    let hasQuarterlyCompletedTask = false;

    const quarterlySettings = view.plugin.settings.quarterlyNote;
    const quarterlyFileName = formatDate(quarterStartDate, quarterlySettings.fileNameFormat);
    const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;

    if (await noteExists(view.app, quarterlyNotePath)) {
        hasQuarterlyNote = true;
    }

    const allTasks = await extractTasks(view.app, view.plugin.settings);
    for (const task of allTasks) {
        if (task.dueDate && task.dueDate >= quarterStartDate && task.dueDate <= quarterEndDate) {
            if (task.status === "x" || task.status === "-") {
                hasQuarterlyCompletedTask = true;
            } else {
                hasQuarterlyIncompleteTask = true;
            }
        }
    }

    return { hasNote: hasQuarterlyNote, hasIncomplete: hasQuarterlyIncompleteTask, hasCompleted: hasQuarterlyCompletedTask };
}

export async function updateYearViewMonthIndicators(view: CalendarView): Promise<void> {
    const yearViewContainer = view.containerEl.querySelector('.year-view-container');
    if (!yearViewContainer) return;

    const quarterContainers = Array.from(yearViewContainer.querySelectorAll('.quarter-container'));
    for (const quarterContainer of quarterContainers) {
        const quarterHeader = quarterContainer.querySelector('.month-header');
        if (!quarterHeader) continue;

        const quarterText = quarterHeader.textContent || '';
        const quarterMatch = quarterText.match(/(\d+)季度/);
        if (!quarterMatch || !quarterMatch[1]) continue;

        const quarterIndex = parseInt(quarterMatch[1]) - 1;
        if (isNaN(quarterIndex) || quarterIndex < 0 || quarterIndex > 3) continue;

        const year = view.currentDate.getFullYear();
        const quarterResult = await checkQuarterNoteAndTasks(view, quarterIndex);

        const quarterIndicators = quarterContainer.querySelector('.month-indicators');
        if (quarterIndicators) {
            quarterIndicators.empty();
            if (quarterResult.hasNote) {
                quarterIndicators.createEl('div', { cls: 'indicator-dot solid-dot' });
            }
            if (quarterResult.hasIncomplete) {
                quarterIndicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
            }
            if (quarterResult.hasCompleted) {
                quarterIndicators.createEl('div', { cls: 'indicator-dot check-dot' });
            }
        }
    }

    const monthContainers = Array.from(yearViewContainer.querySelectorAll('.month-container:not(.quarter-container)'));
    for (const monthContainer of monthContainers) {
        const monthHeader = monthContainer.querySelector('.month-header');
        if (!monthHeader) continue;

        const monthText = monthHeader.textContent || '';
        const monthMatch = monthText.match(/(\d+)月/);
        if (!monthMatch || !monthMatch[1]) continue;

        const monthIndex = parseInt(monthMatch[1]) - 1;
        if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) continue;

        const monthResult = await checkMonthNoteAndTasks(view, monthIndex);

        const monthIndicators = monthContainer.querySelector('.month-indicators');
        if (monthIndicators) {
            monthIndicators.empty();
            if (monthResult.hasNote) {
                monthIndicators.createEl('div', { cls: 'indicator-dot solid-dot' });
            }
            if (monthResult.hasIncomplete) {
                monthIndicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
            }
            if (monthResult.hasCompleted) {
                monthIndicators.createEl('div', { cls: 'indicator-dot check-dot' });
            }
        }
    }
}
