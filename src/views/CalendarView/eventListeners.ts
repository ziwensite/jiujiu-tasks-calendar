import { CalendarView } from '../CalendarView';
import { t } from '../../i18n';
import { getWeekInfo } from '../../utils/dateUtils';
import { checkWeekNoteAndTasks, checkQuarterNoteAndTasks, checkMonthNoteAndTasks, addDayIndicators } from './indicators';

function handleLabelAction(view: CalendarView, key: 'lb1' | 'lb2') {
    const cfg = view.plugin.settings.moreLabelSettings[key];
    if (!cfg.enabled) return;
    if (cfg.actionType === 'systemCommand' && cfg.systemCommand) {
        (view.app as any).commands.executeCommandById(cfg.systemCommand);
    } else if (cfg.actionType === 'openFile' && cfg.filePath) {
        view.app.workspace.openLinkText(cfg.filePath, '');
    }
}

export function installLabelListeners(view: CalendarView) {
    const lb1Btn = view.containerEl.querySelector(".calendar-header .calendar-header-label-lb1");
    if (lb1Btn) {
        lb1Btn.addEventListener("click", () => handleLabelAction(view, 'lb1'));
    }
    const lb2Btn = view.containerEl.querySelector(".calendar-header .calendar-header-label-lb2");
    if (lb2Btn) {
        lb2Btn.addEventListener("click", () => handleLabelAction(view, 'lb2'));
    }
}

export function installNavigationListeners(view: CalendarView) {
    // 月份导航按钮
    const prevMonthBtn = view.containerEl.querySelector(".calendar-header-block-month .prev-btn");
    const nextMonthBtn = view.containerEl.querySelector(".calendar-header-block-month .next-btn");
    const monthContent = view.containerEl.querySelector(".calendar-header-block-month .calendar-header-content");
    
    if (prevMonthBtn) {
        (prevMonthBtn as HTMLElement).title = t('上一月');
        prevMonthBtn.addEventListener("click", () => {
            view.currentDate.setMonth(view.currentDate.getMonth() - 1);
            view.selectedDate = view.currentDate;
            view.renderCalendar();
        });
    }
    
    if (nextMonthBtn) {
        (nextMonthBtn as HTMLElement).title = t('下一月');
        nextMonthBtn.addEventListener("click", () => {
            view.currentDate.setMonth(view.currentDate.getMonth() + 1);
            view.selectedDate = view.currentDate;
            view.renderCalendar();
        });
    }
    
    if (monthContent) {
        monthContent.addEventListener("click", async (event) => {
            if (view.viewType === 'month') {
                view.navigationType = 'year';
                view.renderCalendar();
            } else {
                const year = view.currentDate.getFullYear();
                const month = view.currentDate.getMonth();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0);
                await view.renderTaskListByDateRange(startDate, endDate);
            }
        });
        monthContent.addEventListener("dblclick", async () => {
            await view.eventHandler.handleMonthDoubleClick(view.currentDate);
        });
    }
    
    // 年份导航按钮
    const prevYearBtn = view.containerEl.querySelector(".calendar-header-block-year .prev-btn");
    const nextYearBtn = view.containerEl.querySelector(".calendar-header-block-year .next-btn");
    const yearContent = view.containerEl.querySelector(".calendar-header-block-year .calendar-header-content");
    
    if (prevYearBtn) {
        (prevYearBtn as HTMLElement).title = t('上一年');
        prevYearBtn.addEventListener("click", () => {
            view.currentDate.setFullYear(view.currentDate.getFullYear() - 1);
            view.selectedDate = view.currentDate;
            view.renderCalendar();
        });
    }
    
    if (nextYearBtn) {
        (nextYearBtn as HTMLElement).title = t('下一年');
        nextYearBtn.addEventListener("click", () => {
            view.currentDate.setFullYear(view.currentDate.getFullYear() + 1);
            view.selectedDate = view.currentDate;
            view.renderCalendar();
        });
    }
    
    if (yearContent) {
        yearContent.addEventListener("click", async (event) => {
            if (view.viewType === 'month') {
                view.navigationType = 'month';
                view.renderCalendar();
            } else {
                view.selectionType = 'year';
                view.selectedDate = null;
                view.selectedWeekRange = null;
                view.selectedQuarter = null;
                
                await view.updateSelectionState();
                
                const year = view.currentDate.getFullYear();
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year, 11, 31);
                await view.renderTaskListByDateRange(startDate, endDate);
            }
        });
        yearContent.addEventListener("dblclick", async () => {
            await view.eventHandler.handleYearDoubleClick(view.currentDate);
        });
    }
    
    // 今日和年按钮
    const todayBtn = view.containerEl.querySelector(".calendar-header .calendar-header-label-today");
    const yearBtn = view.containerEl.querySelector(".calendar-header .calendar-header-label-year");
    
    if (todayBtn) {
        const currentToday = new Date();
        const isTodaySelected = view.selectedDate && 
            view.selectedDate.toDateString() === currentToday.toDateString();
        todayBtn.className = `calendar-header-label-today ${isTodaySelected ? 'today-selected' : 'today-unselected'}`;
        todayBtn.addEventListener("click", async () => {
            view.selectedDate = new Date();
            view.currentDate = new Date();
            view.viewType = 'month';
            view.navigationType = 'month';
            view.selectionType = 'date';
            view.selectedWeekRange = null;
            view.selectedQuarter = null;
            
            view.updateSelectionState();
            
            view.renderCalendar();
        });
    }
    
    if (yearBtn) {
        yearBtn.textContent = view.viewType === 'month' ? t('年') : t('月');
        yearBtn.className = `calendar-header-label-year ${view.viewType === 'year' ? 'today-selected' : 'today-unselected'}`;
        yearBtn.addEventListener("click", async () => {
            view.viewType = view.viewType === 'month' ? 'year' : 'month';
            view.navigationType = view.viewType === 'year' ? 'year' : 'month';
            
            if (view.viewType === 'month') {
                view.selectionType = 'date';
                view.selectedWeekRange = null;
                view.selectedQuarter = null;
                
                const currentToday = new Date();
                if (view.selectedDate && view.selectedDate.getMonth() === currentToday.getMonth() && view.selectedDate.getFullYear() === currentToday.getFullYear()) {
                    view.selectedDate = currentToday;
                    view.currentDate = currentToday;
                }
            }
            
            view.updateSelectionState();
            
            await view.renderCalendar();
            
            if (view.viewType === 'year' && view.selectedDate) {
                const currentMonthIndex = view.selectedDate.getMonth();
                const monthContainers = view.containerEl.querySelectorAll(".month-container:not(.quarter-container)");
                if (monthContainers[currentMonthIndex]) {
                    document.querySelectorAll(".month-container").forEach(el => {
                        el.classList.remove("selected");
                    });
                    document.querySelectorAll(".quarter-container").forEach(el => {
                        el.classList.remove("selected");
                    });
                    monthContainers[currentMonthIndex].classList.add("selected");
                    
                    view.selectionType = 'month';
                    view.selectedWeekRange = null;
                    view.selectedQuarter = null;
                    
                    const selectedMonthDate = new Date(view.selectedDate.getFullYear(), currentMonthIndex, 1);
                    view.currentDate = selectedMonthDate;
                    view.selectedDate = selectedMonthDate;
                    
                    await view.updateSelectionState();
                    
                    const year = view.selectedDate.getFullYear();
                    const month = currentMonthIndex;
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    await view.renderTaskListByDateRange(startDate, endDate);
                }
            }
        });
    }

    // 安装自定义标签点击监听器
    installLabelListeners(view);
    
    // 任务列表头部的配置按钮
    const taskListContainer = view.containerEl.querySelector(".task-list-container");
    if (taskListContainer) {
        const taskListHeader = taskListContainer.querySelector(".task-list-header");
        if (taskListHeader) {
            const configBtn = taskListHeader.querySelector(".clickable-icon");
            if (configBtn) {
                let isCollapsed = false;
                configBtn.addEventListener("click", () => {
                    const clickableIcon = configBtn as HTMLElement;
                    const calendarTable = view.containerEl.querySelector('.calendar-table') as HTMLElement;
                    const yearViewContainer = view.containerEl.querySelector('.year-view-container') as HTMLElement;
                    
                    if (view.viewType === 'month') {
                        if (!isCollapsed) {
                            view.toggleCalendarView();
                            isCollapsed = true;
                        } else {
                            view.toggleCalendarView();
                            isCollapsed = false;
                        }
                    } else if (view.viewType === 'year' && yearViewContainer) {
                        if (!isCollapsed) {
                            view.toggleCalendarView();
                            isCollapsed = true;
                        } else {
                            view.toggleCalendarView();
                            isCollapsed = false;
                        }
                    }
                });
            }
        }
    }
}

export async function installCellListeners(view: CalendarView) {
    if (view.viewType === 'month') {
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
            
            cell.addEventListener("click", async () => {
                view.selectedDate = null;

                view.selectionType = 'week';
                const weekStart = new Date(adjustedDate);
                const weekEnd = new Date(adjustedDate);
                weekEnd.setDate(weekEnd.getDate() + 6);
                view.selectedWeekRange = { start: weekStart, end: weekEnd };
                view.selectedQuarter = null;

                view.updateDaySelection();

                view.updateWeekSelection(cell as HTMLElement);

                await view.updateSelectionState();

                await view.renderTaskListByDateRange(weekStart, weekEnd);
            });

            cell.addEventListener("dblclick", async () => {
                await view.eventHandler.handleWeekDoubleClick(adjustedDate);
            });
        });
        
        const dayCells = view.containerEl.querySelectorAll(".day-cell");
        const currentYear = view.currentDate.getFullYear();
        const currentMonth = view.currentDate.getMonth();
        const firstDay = new Date(currentYear, currentMonth, 1);
        let startDay = firstDay.getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;
        
        const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0);
        const prevMonthDays = lastDayOfPrevMonth.getDate();
        const prevMonth = lastDayOfPrevMonth.getMonth();
        const prevMonthYear = lastDayOfPrevMonth.getFullYear();
        
        const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
        const nextMonth = firstDayOfNextMonth.getMonth();
        const nextMonthYear = firstDayOfNextMonth.getFullYear();
        
        let cellIndex = 0;
        let currentDay = 1;
        let prevMonthDay = prevMonthDays - prevMonthDaysToShow + 1;
        let nextMonthDay = 1;
        
        const dayCellArray = Array.from(dayCells);
        for (const cell of dayCellArray) {
            let date: Date;
            let isOtherMonth = false;
            
            if (cellIndex < prevMonthDaysToShow) {
                date = new Date(prevMonthYear, prevMonth, prevMonthDay);
                prevMonthDay++;
                isOtherMonth = true;
            } else if (currentDay <= daysInMonth) {
                date = new Date(currentYear, currentMonth, currentDay);
                currentDay++;
            } else {
                date = new Date(nextMonthYear, nextMonth, nextMonthDay);
                nextMonthDay++;
                isOtherMonth = true;
            }
            
            const indicatorsContainer = cell.querySelector(".day-indicators");
            if (indicatorsContainer) {
                await addDayIndicators(indicatorsContainer as HTMLElement, view, date);
            }
            
            if (view.selectedDate) {
                const isSelected = view.selectedDate.getFullYear() === date.getFullYear() &&
                                  view.selectedDate.getMonth() === date.getMonth() &&
                                  view.selectedDate.getDate() === date.getDate();
                if (isSelected) {
                    cell.addClass("selected-day");
                }
            }
            
            if (!isOtherMonth) {
                let clickTimer: number | null = null;
                cell.addEventListener("click", () => {
                    if (clickTimer !== null) {
                        window.clearTimeout(clickTimer);
                        clickTimer = null;
                        view.eventHandler.handleDayDoubleClick(date);
                    } else {
                        clickTimer = window.setTimeout(() => {
                            clickTimer = null;
                            view.onDayClick(date);
                        }, 250);
                    }
                });
            } else {
                cell.addEventListener("click", () => {
                    view.onDayClick(date);
                });
            }
            
            cellIndex++;
        }
    } else {
        const quarterContainers = view.containerEl.querySelectorAll(".quarter-container");
        quarterContainers.forEach(async (container, index) => {
            const quarter = index;
            
            container.addEventListener("click", async () => {
                document.querySelectorAll(".month-container").forEach(el => {
                    el.classList.remove("selected");
                });
                document.querySelectorAll(".quarter-container").forEach(el => {
                    el.classList.remove("selected");
                });
                container.classList.add("selected");
                
                view.selectionType = 'quarter';
                view.selectedDate = null;
                view.selectedWeekRange = null;
                view.selectedQuarter = quarter + 1;
                
                await view.updateSelectionState();
                
                const year = view.currentDate.getFullYear();
                const quarterStartMonth = quarter * 3;
                const quarterEndMonth = quarter * 3 + 2;
                const startDate = new Date(year, quarterStartMonth, 1);
                const endDate = new Date(year, quarterEndMonth + 1, 0);
                
                await view.renderTaskListByDateRange(startDate, endDate);
            });
            
            container.addEventListener("dblclick", async () => {
                const quarterDate = new Date(view.currentDate.getFullYear(), quarter * 3, 1);
                await view.eventHandler.handleQuarterDoubleClick(quarterDate);
            });
            
            const quarterIndicators = container.querySelector(".month-indicators");
            if (quarterIndicators) {
                const quarterResult = await checkQuarterNoteAndTasks(view, quarter);
                const indicators = quarterIndicators as HTMLElement;
                indicators.empty();
                if (quarterResult.hasNote) {
                    indicators.createEl('div', { cls: 'indicator-dot solid-dot' });
                }
                if (quarterResult.hasIncomplete) {
                    indicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
                }
                if (quarterResult.hasCompleted) {
                    indicators.createEl('div', { cls: 'indicator-dot check-dot' });
                }
            }
        });
        
        const monthContainers = view.containerEl.querySelectorAll(".month-container:not(.quarter-container)");
        monthContainers.forEach(async (container, index) => {
            const currentMonthIndex = index;
            
            container.addEventListener("click", async () => {
                document.querySelectorAll(".month-container").forEach(el => {
                    el.classList.remove("selected");
                });
                document.querySelectorAll(".quarter-container").forEach(el => {
                    el.classList.remove("selected");
                });
                container.classList.add("selected");
                
                view.selectionType = 'month';
                view.selectedWeekRange = null;
                view.selectedQuarter = null;
                
                const selectedMonthDate = new Date(view.currentDate.getFullYear(), currentMonthIndex, 1);
                view.currentDate = selectedMonthDate;
                view.selectedDate = selectedMonthDate;
                
                await view.updateSelectionState();
                
                const year = view.currentDate.getFullYear();
                const month = currentMonthIndex;
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0);
                
                await view.renderTaskListByDateRange(startDate, endDate);
            });
            
            container.addEventListener("dblclick", async () => {
                const monthDate = new Date(view.currentDate.getFullYear(), currentMonthIndex, 1);
                await view.eventHandler.handleMonthDoubleClick(monthDate);
            });
            
            const monthIndicators = container.querySelector(".month-indicators");
            if (monthIndicators) {
                const monthResult = await checkMonthNoteAndTasks(view, currentMonthIndex);
                const indicators = monthIndicators as HTMLElement;
                indicators.empty();
                if (monthResult.hasNote) {
                    indicators.createEl('div', { cls: 'indicator-dot solid-dot' });
                }
                if (monthResult.hasIncomplete) {
                    indicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
                }
                if (monthResult.hasCompleted) {
                    indicators.createEl('div', { cls: 'indicator-dot check-dot' });
                }
            }
        });
    }
}
