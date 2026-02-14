import { __awaiter } from "tslib";
import { getLunarDate, getHolidayStatus, formatDate, getWeekInfo, calculateCellDate, calculateWeekStartDate } from '../../../utils/dateUtils';
import { noteExists } from '../../../services/noteService';
export class CalendarRenderer {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * 构建日历结构
     */
    buildCalendarStructure(container_1, currentDate_1, selectedDate_1, viewType_1) {
        return __awaiter(this, arguments, void 0, function* (container, currentDate, selectedDate, viewType, navigationType = 'month') {
            if (viewType === 'month') {
                yield this.buildMonthView(container, currentDate, selectedDate, navigationType);
            }
            else if (viewType === 'year') {
                this.buildYearView(container, currentDate, selectedDate, navigationType);
            }
            else if (viewType === 'tasks') {
                // 任务视图：在工作区打开，不在这里渲染
                // 由CalendarView中的任务按钮点击事件处理
            }
        });
    }
    /**
     * 构建月视图
     */
    buildMonthView(container_1, currentDate_1, selectedDate_1) {
        return __awaiter(this, arguments, void 0, function* (container, currentDate, selectedDate, navigationType = 'month') {
            // 日历头部
            this.buildCalendarHeader(container, currentDate, navigationType);
            // 日历表格
            const calendarTable = container.createEl("table", { cls: "calendar-table" });
            // 星期标题行
            this.buildWeekHeader(calendarTable);
            // 月份数据行
            yield this.buildMonthDays(calendarTable, currentDate);
        });
    }
    /**
     * 构建年视图
     */
    buildYearView(container, currentDate, selectedDate, navigationType = 'year') {
        // 日历头部
        this.buildCalendarHeader(container, currentDate, navigationType);
        const yearViewContainer = container.createEl("div", { cls: "year-view-container" });
        // 季度循环（Q1到Q4）
        for (let quarter = 0; quarter < 4; quarter++) {
            // 创建季度和月份的行容器
            const quarterRow = yearViewContainer.createEl("div", { cls: "year-view-quarter-row" });
            // 季度容器（左边列）
            const quarterContainer = quarterRow.createEl("div", { cls: "month-container quarter-container" });
            // 季度标题
            quarterContainer.createEl("div", {
                text: `${quarter + 1}季度`,
                cls: "month-header"
            });
            // 季度状态指示器
            quarterContainer.createEl("div", { cls: "month-indicators" });
            // 月份容器（右边行）
            const monthsContainer = quarterRow.createEl("div", { cls: "year-view-months-row" });
            // 每个季度包含3个月
            for (let monthInQuarter = 0; monthInQuarter < 3; monthInQuarter++) {
                // 计算当前月份索引
                const currentMonthIndex = quarter * 3 + monthInQuarter;
                // 月份容器
                const monthContainer = monthsContainer.createEl("div", { cls: "month-container" });
                // 月份标题
                monthContainer.createEl("div", {
                    text: `${currentMonthIndex + 1}月`,
                    cls: "month-header"
                });
                // 月份状态指示器
                monthContainer.createEl("div", { cls: "month-indicators" });
            }
        }
    }
    /**
     * 构建日历头部
     */
    buildCalendarHeader(container, currentDate, navigationType = 'month') {
        const header = container.createEl("div", { cls: "calendar-header" });
        // 单行：从左到右排列：侧边栏按钮、导航、年按钮、今日按钮
        const singleRow = header.createEl("div", { cls: "calendar-header-row" });
        // 左侧：根据导航类型渲染不同的导航
        if (navigationType === 'month') {
            this.buildMonthNavigation(singleRow, currentDate);
        }
        else {
            this.buildYearNavigation(singleRow, currentDate);
        }
        // 中间：年按钮
        singleRow.createEl("div", {
            text: "年",
            cls: "calendar-header-label-year today-unselected"
        });
        // 右侧：今按钮（显示今日的阳历数字）
        const today = new Date();
        singleRow.createEl("div", {
            text: `${today.getDate()}`,
            cls: "calendar-header-label-today today-unselected"
        });
        // 渲染自定义标签 LB1
        const lb1Settings = this.plugin.settings.moreLabelSettings.lb1;
        if (lb1Settings.enabled) {
            singleRow.createEl("div", {
                text: lb1Settings.labelText,
                cls: "calendar-header-label-lb1 today-unselected"
            });
        }
        // 渲染自定义标签 LB2
        const lb2Settings = this.plugin.settings.moreLabelSettings.lb2;
        if (lb2Settings.enabled) {
            singleRow.createEl("div", {
                text: lb2Settings.labelText,
                cls: "calendar-header-label-lb2 today-unselected"
            });
        }
    }
    /**
     * 构建年份导航
     */
    buildYearNavigation(container, currentDate) {
        const yearNav = container.createEl("div", { cls: "calendar-header-block-year" });
        const yearNavBody = yearNav.createEl("div", { cls: "calendar-header-body" });
        yearNavBody.createEl("span", { text: "‹", cls: "nav-btn prev-btn" });
        const yearContent = yearNavBody.createEl("div", { cls: "calendar-header-content" });
        yearContent.createEl("span", {
            text: `${currentDate.getFullYear()}年`,
        });
        yearNavBody.createEl("span", { text: "›", cls: "nav-btn next-btn" });
    }
    /**
     * 构建月份导航
     */
    buildMonthNavigation(container, currentDate) {
        const monthNav = container.createEl("div", { cls: "calendar-header-block-month" });
        const monthNavBody = monthNav.createEl("div", { cls: "calendar-header-body" });
        monthNavBody.createEl("span", { text: "‹", cls: "nav-btn prev-btn" });
        const monthContent = monthNavBody.createEl("div", { cls: "calendar-header-content" });
        monthContent.createEl("span", {
            text: `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`,
        });
        monthNavBody.createEl("span", { text: "›", cls: "nav-btn next-btn" });
    }
    /**
     * 构建星期标题行
     */
    buildWeekHeader(table) {
        const thead = table.createEl("thead");
        const headerRow = thead.createEl("tr");
        // 周数标题
        headerRow.createEl("th", { text: "周", cls: "week-number-header" });
        // 星期标题，默认周一为第一天
        const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
        for (const day of weekdays) {
            headerRow.createEl("th", { text: day });
        }
    }
    /**
     * 构建月份数据行
     */
    buildMonthDays(table, currentDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const tbody = table.createEl("tbody");
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth();
            // 计算月份第一天是星期几
            const firstDay = new Date(currentYear, currentMonth, 1);
            let startDay = firstDay.getDay();
            // 计算月份总天数
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            // 周一为第一天：如果第一天是周日，需要显示6天上个月的日期，否则显示startDay-1天
            const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;
            // 计算需要的行数：(上个月需要显示的天数 + 本月天数 + 7 - 1) / 7 向上取整
            const rowsNeeded = Math.ceil((prevMonthDaysToShow + daysInMonth) / 7);
            // 生成所需的行数
            for (let row = 0; row < rowsNeeded; row++) {
                yield this.buildWeekRow(tbody, row, currentYear, currentMonth, daysInMonth, prevMonthDaysToShow);
            }
        });
    }
    /**
     * 构建周行
     */
    buildWeekRow(tbody, rowIndex, currentYear, currentMonth, daysInMonth, prevMonthDaysToShow) {
        return __awaiter(this, void 0, void 0, function* () {
            const weekRow = tbody.createEl("tr");
            // 周数单元格
            this.buildWeekNumberCell(weekRow, rowIndex, currentYear, currentMonth, prevMonthDaysToShow);
            // 日期单元格
            for (let i = 0; i < 7; i++) {
                yield this.buildDayCell(weekRow, rowIndex, i, currentYear, currentMonth, daysInMonth, prevMonthDaysToShow);
            }
        });
    }
    /**
     * 构建周数单元格
     */
    buildWeekNumberCell(row, rowIndex, currentYear, currentMonth, prevMonthDaysToShow, weekStartDate) {
        const weekNumberCell = row.createEl("td", { cls: "week-number-cell" });
        // 计算当前周的起始日期（周一）
        let targetWeekStartDate;
        if (weekStartDate) {
            // 直接使用传入的周起始日期（用于周视图）
            targetWeekStartDate = weekStartDate;
        }
        else {
            // 使用计算的周起始日期（用于月视图）
            targetWeekStartDate = calculateWeekStartDate(rowIndex, currentYear, currentMonth, prevMonthDaysToShow);
        }
        // 获取全年周数
        const weekInfo = getWeekInfo(targetWeekStartDate);
        const weekNumber = weekInfo.week;
        // 周数文本
        const weekNumberText = weekNumberCell.createEl("div", {
            text: `${weekNumber}`,
            cls: "week-number-text"
        });
        // 周数状态指示器
        weekNumberCell.createEl("div", { cls: "week-indicators" });
    }
    /**
     * 构建日期单元格
     */
    buildDayCell(row, rowIndex, dayIndex, currentYear, currentMonth, daysInMonth, prevMonthDaysToShow, specificDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const dayCell = row.createEl("td", { cls: "day-cell" });
            // 计算当前日期
            let date;
            let isOtherMonth = false;
            if (specificDate) {
                // 直接使用传入的日期（用于周视图）
                date = specificDate;
                // 检查是否是其他月份
                isOtherMonth = date.getMonth() !== currentMonth;
            }
            else {
                // 使用计算的日期（用于月视图）
                const result = calculateCellDate(rowIndex, dayIndex, currentYear, currentMonth, prevMonthDaysToShow, daysInMonth);
                date = result.date;
                isOtherMonth = result.isOtherMonth;
            }
            if (isOtherMonth) {
                dayCell.addClass("other-month");
            }
            // 日期容器
            const dateContainer = dayCell.createEl("div", { cls: "date-container" });
            // 日期数字
            const dayNumber = dateContainer.createEl("span", {
                text: `${date.getDate()}`,
                cls: "day-number"
            });
            // 添加法定节假日状态标记
            const status = getHolidayStatus(date);
            if (status) {
                dateContainer.createEl("span", {
                    text: status,
                    cls: `holiday-status ${status === '休' ? 'holiday' : 'workday'}`
                });
                // 根据状态设置不同的颜色
                if (status === '休') {
                    // 法定节假日的阳历数字颜色改为深红
                    dayNumber.addClass("holiday-date");
                }
                else if (status === '班') {
                    // 调休的阳历数字颜色与班背景色一致
                    dayNumber.addClass("workday-date");
                }
            }
            // 农历日期
            const lunarDateResult = getLunarDate(date);
            dayCell.createEl("div", {
                text: lunarDateResult.text,
                cls: `lunar-date lunar-${lunarDateResult.type}`
            });
            // 日期状态指示器容器
            dayCell.createEl("div", { cls: "day-indicators" });
            // 只处理当前月份的日期，添加任务指示器
            if (!isOtherMonth) {
                // 检查是否有日记
                const dailySettings = this.plugin.settings.dailyNote;
                const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
                const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
                if (yield noteExists(this.plugin.app, dailyNotePath)) {
                    // 有日记，后续会通过updateIndicators更新指示器
                }
            }
        });
    }
    /**
     * 更新月视图的完整内容
     */
    updateMonthCalendarContent(container, currentDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // 更新日历头部显示
            this.updateCalendarHeader(container, currentDate);
            // 更新日历表格内容
            const tbody = container.querySelector('.calendar-table tbody');
            if (!tbody)
                return;
            // 获取所有日期行
            const rows = Array.from(tbody.querySelectorAll('tr'));
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
            // 获取今天的日期
            const today = new Date();
            // 遍历所有行，更新内容
            for (const row of rows) {
                // 获取当前行的所有单元格（第一个是周数，后面7个是日期）
                const cells = Array.from(row.querySelectorAll('td'));
                // 跳过周数单元格，从第2个单元格开始（索引1）
                for (let i = 1; i < cells.length; i++) {
                    const cell = cells[i];
                    if (cell) {
                        cell.removeClass('other-month');
                        cell.removeClass('today');
                        let date;
                        let isOtherMonth = false;
                        if (prevMonthDay <= prevMonthDays) {
                            // 上个月的日期
                            date = new Date(prevMonthYear, prevMonth, prevMonthDay);
                            prevMonthDay++;
                            isOtherMonth = true;
                        }
                        else if (currentDay <= daysInMonth) {
                            // 当前月的日期
                            date = new Date(currentYear, currentMonth, currentDay);
                            currentDay++;
                        }
                        else {
                            // 下个月的日期
                            date = new Date(nextMonthYear, nextMonth, nextMonthDay);
                            nextMonthDay++;
                            isOtherMonth = true;
                        }
                        if (isOtherMonth) {
                            cell.addClass('other-month');
                        }
                        // 检查是否是今天
                        if (date.toDateString() === today.toDateString()) {
                            cell.addClass('today');
                        }
                        // 更新日期数字
                        const dateContainer = cell.querySelector('.date-container');
                        if (dateContainer) {
                            // 清空现有内容
                            dateContainer.empty();
                            // 日期数字
                            const dayNumber = dateContainer.createEl('span', {
                                text: `${date.getDate()}`,
                                cls: 'day-number'
                            });
                            // 检查是否是周末
                            // 周一为第一天时，周六（i=6）和周日（i=7）为周末
                            // 但只有法定节假日才改变颜色，非法定节假日的周末保持默认颜色
                            // if (i === 6 || i === 7) {
                            //     dayNumber.style.color = 'var(--interactive-accent)';
                            // }
                            // 添加法定节假日状态标记（休/班）
                            const status = getHolidayStatus(date);
                            if (status) {
                                dateContainer.createEl('span', {
                                    text: status,
                                    cls: `holiday-status ${status === '休' ? 'holiday' : 'workday'}`
                                });
                                // 根据状态设置不同的颜色
                                if (status === '休') {
                                    // 法定节假日的阳历数字颜色改为深红
                                    dayNumber.addClass("holiday-date");
                                }
                                else if (status === '班') {
                                    // 调休的阳历数字颜色与班背景色一致
                                    dayNumber.addClass("workday-date");
                                }
                            }
                        }
                        // 更新农历日期
                        const lunarDate = cell.querySelector('.lunar-date');
                        if (lunarDate) {
                            const lunarDateResult = getLunarDate(date);
                            lunarDate.textContent = lunarDateResult.text;
                            lunarDate.className = `lunar-date lunar-${lunarDateResult.type}`;
                        }
                    }
                }
            }
        });
    }
    /**
     * 更新日历头部显示
     */
    updateCalendarHeader(container, currentDate) {
        // 更新年份显示
        const yearContent = container.querySelector('.calendar-header-block-year .calendar-header-content');
        if (yearContent) {
            const yearSpan = yearContent.querySelector('span');
            if (yearSpan) {
                yearSpan.textContent = `${currentDate.getFullYear()}年`;
            }
        }
        // 更新月份显示
        const monthContent = container.querySelector('.calendar-header-block-month .calendar-header-content');
        if (monthContent) {
            const monthSpan = monthContent.querySelector('span');
            if (monthSpan) {
                monthSpan.textContent = `${currentDate.getMonth() + 1}月`;
            }
        }
        // 更新今日标签的数字
        const todayLabel = container.querySelector('.calendar-header-label-today');
        if (todayLabel) {
            const today = new Date();
            todayLabel.textContent = `${today.getDate()}`;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXJSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhbGVuZGFyUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzlJLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUzRCxNQUFNLE9BQU8sZ0JBQWdCO0lBR3pCLFlBQVksTUFBZ0I7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0csc0JBQXNCOzZEQUFDLFNBQXNCLEVBQUUsV0FBaUIsRUFBRSxZQUFrQixFQUFFLFFBQW9DLEVBQUUsaUJBQW1DLE9BQU87WUFDeEssSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNwRixDQUFDO2lCQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzdFLENBQUM7aUJBQU0sSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQzlCLHFCQUFxQjtnQkFDckIsNEJBQTRCO1lBQ2hDLENBQUM7UUFDTCxDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNXLGNBQWM7NkRBQUMsU0FBc0IsRUFBRSxXQUFpQixFQUFFLFlBQWtCLEVBQUUsaUJBQW1DLE9BQU87WUFDbEksT0FBTztZQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FB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RyxZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JELElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ1osU0FBUyxDQUFDLFdBQVcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUM3RCxDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE15UGx1Z2luIH0gZnJvbSAnLi4vLi4vLi4vbWFpbic7XHJcbmltcG9ydCB7IGdldEx1bmFyRGF0ZSwgZ2V0SG9saWRheVN0YXR1cywgZm9ybWF0RGF0ZSwgZ2V0V2Vla0luZm8sIGNhbGN1bGF0ZUNlbGxEYXRlLCBjYWxjdWxhdGVXZWVrU3RhcnREYXRlIH0gZnJvbSAnLi4vLi4vLi4vdXRpbHMvZGF0ZVV0aWxzJztcclxuaW1wb3J0IHsgbm90ZUV4aXN0cyB9IGZyb20gJy4uLy4uLy4uL3NlcnZpY2VzL25vdGVTZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBDYWxlbmRhclJlbmRlcmVyIHtcclxuICAgIHByaXZhdGUgcGx1Z2luOiBNeVBsdWdpbjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihwbHVnaW46IE15UGx1Z2luKSB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmnoTlu7rml6Xljobnu5PmnoRcclxuICAgICAqL1xyXG4gICAgYXN5bmMgYnVpbGRDYWxlbmRhclN0cnVjdHVyZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50RGF0ZTogRGF0ZSwgc2VsZWN0ZWREYXRlOiBEYXRlLCB2aWV3VHlwZTogJ21vbnRoJyB8ICd5ZWFyJyB8ICd0YXNrcycsIG5hdmlnYXRpb25UeXBlOiAnbW9udGgnIHwgJ3llYXInID0gJ21vbnRoJykge1xyXG4gICAgICAgIGlmICh2aWV3VHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkTW9udGhWaWV3KGNvbnRhaW5lciwgY3VycmVudERhdGUsIHNlbGVjdGVkRGF0ZSwgbmF2aWdhdGlvblR5cGUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodmlld1R5cGUgPT09ICd5ZWFyJykge1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkWWVhclZpZXcoY29udGFpbmVyLCBjdXJyZW50RGF0ZSwgc2VsZWN0ZWREYXRlLCBuYXZpZ2F0aW9uVHlwZSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh2aWV3VHlwZSA9PT0gJ3Rhc2tzJykge1xyXG4gICAgICAgICAgICAvLyDku7vliqHop4blm77vvJrlnKjlt6XkvZzljLrmiZPlvIDvvIzkuI3lnKjov5nph4zmuLLmn5NcclxuICAgICAgICAgICAgLy8g55SxQ2FsZW5kYXJWaWV35Lit55qE5Lu75Yqh5oyJ6ZKu54K55Ye75LqL5Lu25aSE55CGXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5p6E5bu65pyI6KeG5Zu+XHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRNb250aFZpZXcoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudERhdGU6IERhdGUsIHNlbGVjdGVkRGF0ZTogRGF0ZSwgbmF2aWdhdGlvblR5cGU6ICdtb250aCcgfCAneWVhcicgPSAnbW9udGgnKSB7XHJcbiAgICAgICAgLy8g5pel5Y6G5aS06YOoXHJcbiAgICAgICAgdGhpcy5idWlsZENhbGVuZGFySGVhZGVyKGNvbnRhaW5lciwgY3VycmVudERhdGUsIG5hdmlnYXRpb25UeXBlKTtcclxuXHJcbiAgICAgICAgLy8g5pel5Y6G6KGo5qC8XHJcbiAgICAgICAgY29uc3QgY2FsZW5kYXJUYWJsZSA9IGNvbnRhaW5lci5jcmVhdGVFbChcInRhYmxlXCIsIHtjbHM6IFwiY2FsZW5kYXItdGFibGVcIn0pO1xyXG5cclxuICAgICAgICAvLyDmmJ/mnJ/moIfpopjooYxcclxuICAgICAgICB0aGlzLmJ1aWxkV2Vla0hlYWRlcihjYWxlbmRhclRhYmxlKTtcclxuXHJcbiAgICAgICAgLy8g5pyI5Lu95pWw5o2u6KGMXHJcbiAgICAgICAgYXdhaXQgdGhpcy5idWlsZE1vbnRoRGF5cyhjYWxlbmRhclRhYmxlLCBjdXJyZW50RGF0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmnoTlu7rlubTop4blm75cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBidWlsZFllYXJWaWV3KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnREYXRlOiBEYXRlLCBzZWxlY3RlZERhdGU6IERhdGUsIG5hdmlnYXRpb25UeXBlOiAnbW9udGgnIHwgJ3llYXInID0gJ3llYXInKSB7XHJcbiAgICAgICAgLy8g5pel5Y6G5aS06YOoXHJcbiAgICAgICAgdGhpcy5idWlsZENhbGVuZGFySGVhZGVyKGNvbnRhaW5lciwgY3VycmVudERhdGUsIG5hdmlnYXRpb25UeXBlKTtcclxuXHJcbiAgICAgICAgY29uc3QgeWVhclZpZXdDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJ5ZWFyLXZpZXctY29udGFpbmVyXCJ9KTtcclxuXHJcbiAgICAgICAgLy8g5a2j5bqm5b6q546v77yIUTHliLBRNO+8iVxyXG4gICAgICAgIGZvciAobGV0IHF1YXJ0ZXIgPSAwOyBxdWFydGVyIDwgNDsgcXVhcnRlcisrKSB7XHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuWto+W6puWSjOaciOS7veeahOihjOWuueWZqFxyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVyUm93ID0geWVhclZpZXdDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJ5ZWFyLXZpZXctcXVhcnRlci1yb3dcIn0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5a2j5bqm5a655Zmo77yI5bem6L655YiX77yJXHJcbiAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJDb250YWluZXIgPSBxdWFydGVyUm93LmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwibW9udGgtY29udGFpbmVyIHF1YXJ0ZXItY29udGFpbmVyXCJ9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOWto+W6puagh+mimFxyXG4gICAgICAgICAgICBxdWFydGVyQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiBgJHtxdWFydGVyICsgMX3lraPluqZgLFxyXG4gICAgICAgICAgICAgICAgY2xzOiBcIm1vbnRoLWhlYWRlclwiXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5a2j5bqm54q25oCB5oyH56S65ZmoXHJcbiAgICAgICAgICAgIHF1YXJ0ZXJDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJtb250aC1pbmRpY2F0b3JzXCJ9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOaciOS7veWuueWZqO+8iOWPs+i+ueihjO+8iVxyXG4gICAgICAgICAgICBjb25zdCBtb250aHNDb250YWluZXIgPSBxdWFydGVyUm93LmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwieWVhci12aWV3LW1vbnRocy1yb3dcIn0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5q+P5Liq5a2j5bqm5YyF5ZCrM+S4quaciFxyXG4gICAgICAgICAgICBmb3IgKGxldCBtb250aEluUXVhcnRlciA9IDA7IG1vbnRoSW5RdWFydGVyIDwgMzsgbW9udGhJblF1YXJ0ZXIrKykge1xyXG4gICAgICAgICAgICAgICAgLy8g6K6h566X5b2T5YmN5pyI5Lu957Si5byVXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50TW9udGhJbmRleCA9IHF1YXJ0ZXIgKiAzICsgbW9udGhJblF1YXJ0ZXI7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOaciOS7veWuueWZqFxyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGhDb250YWluZXIgPSBtb250aHNDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJtb250aC1jb250YWluZXJcIn0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmnIjku73moIfpophcclxuICAgICAgICAgICAgICAgIG1vbnRoQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogYCR7Y3VycmVudE1vbnRoSW5kZXggKyAxfeaciGAsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xzOiBcIm1vbnRoLWhlYWRlclwiXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5pyI5Lu954q25oCB5oyH56S65ZmoXHJcbiAgICAgICAgICAgICAgICBtb250aENvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcIm1vbnRoLWluZGljYXRvcnNcIn0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5p6E5bu65pel5Y6G5aS06YOoXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYnVpbGRDYWxlbmRhckhlYWRlcihjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50RGF0ZTogRGF0ZSwgbmF2aWdhdGlvblR5cGU6ICdtb250aCcgfCAneWVhcicgPSAnbW9udGgnKSB7XHJcbiAgICAgICAgY29uc3QgaGVhZGVyID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwiY2FsZW5kYXItaGVhZGVyXCJ9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDljZXooYzvvJrku47lt6bliLDlj7PmjpLliJfvvJrkvqfovrnmoI/mjInpkq7jgIHlr7zoiKrjgIHlubTmjInpkq7jgIHku4rml6XmjInpkq5cclxuICAgICAgICBjb25zdCBzaW5nbGVSb3cgPSBoZWFkZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJjYWxlbmRhci1oZWFkZXItcm93XCJ9KTtcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgICAgICAvLyDlt6bkvqfvvJrmoLnmja7lr7zoiKrnsbvlnovmuLLmn5PkuI3lkIznmoTlr7zoiKpcclxuICAgICAgICBpZiAobmF2aWdhdGlvblR5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgdGhpcy5idWlsZE1vbnRoTmF2aWdhdGlvbihzaW5nbGVSb3csIGN1cnJlbnREYXRlKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJ1aWxkWWVhck5hdmlnYXRpb24oc2luZ2xlUm93LCBjdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOS4remXtO+8muW5tOaMiemSrlxyXG4gICAgICAgIHNpbmdsZVJvdy5jcmVhdGVFbChcImRpdlwiLCB7IFxyXG4gICAgICAgICAgICB0ZXh0OiBcIuW5tFwiLFxyXG4gICAgICAgICAgICBjbHM6IFwiY2FsZW5kYXItaGVhZGVyLWxhYmVsLXllYXIgdG9kYXktdW5zZWxlY3RlZFwiXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Y+z5L6n77ya5LuK5oyJ6ZKu77yI5pi+56S65LuK5pel55qE6Ziz5Y6G5pWw5a2X77yJXHJcbiAgICAgICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIHNpbmdsZVJvdy5jcmVhdGVFbChcImRpdlwiLCB7IFxyXG4gICAgICAgICAgICB0ZXh0OiBgJHt0b2RheS5nZXREYXRlKCl9YCxcclxuICAgICAgICAgICAgY2xzOiBcImNhbGVuZGFyLWhlYWRlci1sYWJlbC10b2RheSB0b2RheS11bnNlbGVjdGVkXCJcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmuLLmn5Poh6rlrprkuYnmoIfnrb4gTEIxXHJcbiAgICAgICAgY29uc3QgbGIxU2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb3JlTGFiZWxTZXR0aW5ncy5sYjE7XHJcbiAgICAgICAgaWYgKGxiMVNldHRpbmdzLmVuYWJsZWQpIHtcclxuICAgICAgICAgICAgc2luZ2xlUm93LmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuICAgICAgICAgICAgICAgIHRleHQ6IGxiMVNldHRpbmdzLmxhYmVsVGV4dCxcclxuICAgICAgICAgICAgICAgIGNsczogXCJjYWxlbmRhci1oZWFkZXItbGFiZWwtbGIxIHRvZGF5LXVuc2VsZWN0ZWRcIlxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riy5p+T6Ieq5a6a5LmJ5qCH562+IExCMlxyXG4gICAgICAgIGNvbnN0IGxiMlNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubW9yZUxhYmVsU2V0dGluZ3MubGIyO1xyXG4gICAgICAgIGlmIChsYjJTZXR0aW5ncy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIHNpbmdsZVJvdy5jcmVhdGVFbChcImRpdlwiLCB7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiBsYjJTZXR0aW5ncy5sYWJlbFRleHQsXHJcbiAgICAgICAgICAgICAgICBjbHM6IFwiY2FsZW5kYXItaGVhZGVyLWxhYmVsLWxiMiB0b2RheS11bnNlbGVjdGVkXCJcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5p6E5bu65bm05Lu95a+86IiqXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYnVpbGRZZWFyTmF2aWdhdGlvbihjb250YWluZXI6IEhUTUxFbGVtZW50LCBjdXJyZW50RGF0ZTogRGF0ZSkge1xyXG4gICAgICAgIGNvbnN0IHllYXJOYXYgPSBjb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJjYWxlbmRhci1oZWFkZXItYmxvY2steWVhclwifSk7XHJcbiAgICAgICAgY29uc3QgeWVhck5hdkJvZHkgPSB5ZWFyTmF2LmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwiY2FsZW5kYXItaGVhZGVyLWJvZHlcIn0pO1xyXG5cclxuICAgICAgICB5ZWFyTmF2Qm9keS5jcmVhdGVFbChcInNwYW5cIiwge3RleHQ6IFwi4oC5XCIsIGNsczogXCJuYXYtYnRuIHByZXYtYnRuXCJ9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB5ZWFyQ29udGVudCA9IHllYXJOYXZCb2R5LmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwiY2FsZW5kYXItaGVhZGVyLWNvbnRlbnRcIn0pO1xyXG4gICAgICAgIHllYXJDb250ZW50LmNyZWF0ZUVsKFwic3BhblwiLCB7IFxyXG4gICAgICAgICAgICB0ZXh0OiBgJHtjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpfeW5tGAsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgeWVhck5hdkJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHt0ZXh0OiBcIuKAulwiLCBjbHM6IFwibmF2LWJ0biBuZXh0LWJ0blwifSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5p6E5bu65pyI5Lu95a+86IiqXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYnVpbGRNb250aE5hdmlnYXRpb24oY29udGFpbmVyOiBIVE1MRWxlbWVudCwgY3VycmVudERhdGU6IERhdGUpIHtcclxuICAgICAgICBjb25zdCBtb250aE5hdiA9IGNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcImNhbGVuZGFyLWhlYWRlci1ibG9jay1tb250aFwifSk7XHJcbiAgICAgICAgY29uc3QgbW9udGhOYXZCb2R5ID0gbW9udGhOYXYuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJjYWxlbmRhci1oZWFkZXItYm9keVwifSk7XHJcblxyXG4gICAgICAgIG1vbnRoTmF2Qm9keS5jcmVhdGVFbChcInNwYW5cIiwge3RleHQ6IFwi4oC5XCIsIGNsczogXCJuYXYtYnRuIHByZXYtYnRuXCJ9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBtb250aENvbnRlbnQgPSBtb250aE5hdkJvZHkuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJjYWxlbmRhci1oZWFkZXItY29udGVudFwifSk7XHJcbiAgICAgICAgbW9udGhDb250ZW50LmNyZWF0ZUVsKFwic3BhblwiLCB7IFxyXG4gICAgICAgICAgICB0ZXh0OiBgJHtjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpfeW5tCR7Y3VycmVudERhdGUuZ2V0TW9udGgoKSArIDF95pyIYCxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBtb250aE5hdkJvZHkuY3JlYXRlRWwoXCJzcGFuXCIsIHt0ZXh0OiBcIuKAulwiLCBjbHM6IFwibmF2LWJ0biBuZXh0LWJ0blwifSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmnoTlu7rmmJ/mnJ/moIfpopjooYxcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBidWlsZFdlZWtIZWFkZXIodGFibGU6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgY29uc3QgdGhlYWQgPSB0YWJsZS5jcmVhdGVFbChcInRoZWFkXCIpO1xyXG4gICAgICAgIGNvbnN0IGhlYWRlclJvdyA9IHRoZWFkLmNyZWF0ZUVsKFwidHJcIik7XHJcbiAgICAgICAgLy8g5ZGo5pWw5qCH6aKYXHJcbiAgICAgICAgaGVhZGVyUm93LmNyZWF0ZUVsKFwidGhcIiwge3RleHQ6IFwi5ZGoXCIsIGNsczogXCJ3ZWVrLW51bWJlci1oZWFkZXJcIn0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaYn+acn+agh+mimO+8jOm7mOiupOWRqOS4gOS4uuesrOS4gOWkqVxyXG4gICAgICAgIGNvbnN0IHdlZWtkYXlzID0gW1wi5LiAXCIsIFwi5LqMXCIsIFwi5LiJXCIsIFwi5ZubXCIsIFwi5LqUXCIsIFwi5YWtXCIsIFwi5pelXCJdO1xyXG4gICAgICAgIGZvciAoY29uc3QgZGF5IG9mIHdlZWtkYXlzKSB7XHJcbiAgICAgICAgICAgIGhlYWRlclJvdy5jcmVhdGVFbChcInRoXCIsIHt0ZXh0OiBkYXl9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmnoTlu7rmnIjku73mlbDmja7ooYxcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZE1vbnRoRGF5cyh0YWJsZTogSFRNTEVsZW1lbnQsIGN1cnJlbnREYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0YWJsZS5jcmVhdGVFbChcInRib2R5XCIpO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRZZWFyID0gY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBjb25zdCBjdXJyZW50TW9udGggPSBjdXJyZW50RGF0ZS5nZXRNb250aCgpO1xyXG5cclxuICAgICAgICAvLyDorqHnrpfmnIjku73nrKzkuIDlpKnmmK/mmJ/mnJ/lh6BcclxuICAgICAgICBjb25zdCBmaXJzdERheSA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIDEpO1xyXG4gICAgICAgIGxldCBzdGFydERheSA9IGZpcnN0RGF5LmdldERheSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiuoeeul+aciOS7veaAu+WkqeaVsFxyXG4gICAgICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCArIDEsIDApLmdldERhdGUoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDlkajkuIDkuLrnrKzkuIDlpKnvvJrlpoLmnpznrKzkuIDlpKnmmK/lkajml6XvvIzpnIDopoHmmL7npLo25aSp5LiK5Liq5pyI55qE5pel5pyf77yM5ZCm5YiZ5pi+56S6c3RhcnREYXktMeWkqVxyXG4gICAgICAgIGNvbnN0IHByZXZNb250aERheXNUb1Nob3cgPSBzdGFydERheSA9PT0gMCA/IDYgOiBzdGFydERheSAtIDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6K6h566X6ZyA6KaB55qE6KGM5pWw77yaKOS4iuS4quaciOmcgOimgeaYvuekuueahOWkqeaVsCArIOacrOaciOWkqeaVsCArIDcgLSAxKSAvIDcg5ZCR5LiK5Y+W5pW0XHJcbiAgICAgICAgY29uc3Qgcm93c05lZWRlZCA9IE1hdGguY2VpbCgocHJldk1vbnRoRGF5c1RvU2hvdyArIGRheXNJbk1vbnRoKSAvIDcpO1xyXG5cclxuICAgICAgICAvLyDnlJ/miJDmiYDpnIDnmoTooYzmlbBcclxuICAgICAgICBmb3IgKGxldCByb3cgPSAwOyByb3cgPCByb3dzTmVlZGVkOyByb3crKykge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkV2Vla1Jvdyh0Ym9keSwgcm93LCBjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBkYXlzSW5Nb250aCwgcHJldk1vbnRoRGF5c1RvU2hvdyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5p6E5bu65ZGo6KGMXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRXZWVrUm93KHRib2R5OiBIVE1MRWxlbWVudCwgcm93SW5kZXg6IG51bWJlciwgY3VycmVudFllYXI6IG51bWJlciwgY3VycmVudE1vbnRoOiBudW1iZXIsIGRheXNJbk1vbnRoOiBudW1iZXIsIHByZXZNb250aERheXNUb1Nob3c6IG51bWJlcikge1xyXG4gICAgICAgIGNvbnN0IHdlZWtSb3cgPSB0Ym9keS5jcmVhdGVFbChcInRyXCIpO1xyXG5cclxuICAgICAgICAvLyDlkajmlbDljZXlhYPmoLxcclxuICAgICAgICB0aGlzLmJ1aWxkV2Vla051bWJlckNlbGwod2Vla1Jvdywgcm93SW5kZXgsIGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIHByZXZNb250aERheXNUb1Nob3cpO1xyXG5cclxuICAgICAgICAvLyDml6XmnJ/ljZXlhYPmoLxcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDc7IGkrKykge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkRGF5Q2VsbCh3ZWVrUm93LCByb3dJbmRleCwgaSwgY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgZGF5c0luTW9udGgsIHByZXZNb250aERheXNUb1Nob3cpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOaehOW7uuWRqOaVsOWNleWFg+agvFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGJ1aWxkV2Vla051bWJlckNlbGwocm93OiBIVE1MRWxlbWVudCwgcm93SW5kZXg6IG51bWJlciwgY3VycmVudFllYXI6IG51bWJlciwgY3VycmVudE1vbnRoOiBudW1iZXIsIHByZXZNb250aERheXNUb1Nob3c6IG51bWJlciwgd2Vla1N0YXJ0RGF0ZT86IERhdGUpIHtcclxuICAgICAgICBjb25zdCB3ZWVrTnVtYmVyQ2VsbCA9IHJvdy5jcmVhdGVFbChcInRkXCIsIHsgY2xzOiBcIndlZWstbnVtYmVyLWNlbGxcIiB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDorqHnrpflvZPliY3lkajnmoTotbflp4vml6XmnJ/vvIjlkajkuIDvvIlcclxuICAgICAgICBsZXQgdGFyZ2V0V2Vla1N0YXJ0RGF0ZTogRGF0ZTtcclxuICAgICAgICBpZiAod2Vla1N0YXJ0RGF0ZSkge1xyXG4gICAgICAgICAgICAvLyDnm7TmjqXkvb/nlKjkvKDlhaXnmoTlkajotbflp4vml6XmnJ/vvIjnlKjkuo7lkajop4blm77vvIlcclxuICAgICAgICAgICAgdGFyZ2V0V2Vla1N0YXJ0RGF0ZSA9IHdlZWtTdGFydERhdGU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8g5L2/55So6K6h566X55qE5ZGo6LW35aeL5pel5pyf77yI55So5LqO5pyI6KeG5Zu+77yJXHJcbiAgICAgICAgICAgIHRhcmdldFdlZWtTdGFydERhdGUgPSBjYWxjdWxhdGVXZWVrU3RhcnREYXRlKHJvd0luZGV4LCBjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBwcmV2TW9udGhEYXlzVG9TaG93KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W5YWo5bm05ZGo5pWwXHJcbiAgICAgICAgY29uc3Qgd2Vla0luZm8gPSBnZXRXZWVrSW5mbyh0YXJnZXRXZWVrU3RhcnREYXRlKTtcclxuICAgICAgICBjb25zdCB3ZWVrTnVtYmVyID0gd2Vla0luZm8ud2VlaztcclxuICAgICAgICBcclxuICAgICAgICAvLyDlkajmlbDmlofmnKxcclxuICAgICAgICBjb25zdCB3ZWVrTnVtYmVyVGV4dCA9IHdlZWtOdW1iZXJDZWxsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgXHJcbiAgICAgICAgICAgIHRleHQ6IGAke3dlZWtOdW1iZXJ9YCxcclxuICAgICAgICAgICAgY2xzOiBcIndlZWstbnVtYmVyLXRleHRcIlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWRqOaVsOeKtuaAgeaMh+ekuuWZqFxyXG4gICAgICAgIHdlZWtOdW1iZXJDZWxsLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwid2Vlay1pbmRpY2F0b3JzXCJ9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOaehOW7uuaXpeacn+WNleWFg+agvFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkRGF5Q2VsbChyb3c6IEhUTUxFbGVtZW50LCByb3dJbmRleDogbnVtYmVyLCBkYXlJbmRleDogbnVtYmVyLCBjdXJyZW50WWVhcjogbnVtYmVyLCBjdXJyZW50TW9udGg6IG51bWJlciwgZGF5c0luTW9udGg6IG51bWJlciwgcHJldk1vbnRoRGF5c1RvU2hvdzogbnVtYmVyLCBzcGVjaWZpY0RhdGU/OiBEYXRlKSB7XHJcbiAgICAgICAgY29uc3QgZGF5Q2VsbCA9IHJvdy5jcmVhdGVFbChcInRkXCIsIHtjbHM6IFwiZGF5LWNlbGxcIn0pO1xyXG5cclxuICAgICAgICAvLyDorqHnrpflvZPliY3ml6XmnJ9cclxuICAgICAgICBsZXQgZGF0ZTogRGF0ZTtcclxuICAgICAgICBsZXQgaXNPdGhlck1vbnRoID0gZmFsc2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHNwZWNpZmljRGF0ZSkge1xyXG4gICAgICAgICAgICAvLyDnm7TmjqXkvb/nlKjkvKDlhaXnmoTml6XmnJ/vvIjnlKjkuo7lkajop4blm77vvIlcclxuICAgICAgICAgICAgZGF0ZSA9IHNwZWNpZmljRGF0ZTtcclxuICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5YW25LuW5pyI5Lu9XHJcbiAgICAgICAgICAgIGlzT3RoZXJNb250aCA9IGRhdGUuZ2V0TW9udGgoKSAhPT0gY3VycmVudE1vbnRoO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIOS9v+eUqOiuoeeul+eahOaXpeacn++8iOeUqOS6juaciOinhuWbvu+8iVxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBjYWxjdWxhdGVDZWxsRGF0ZShyb3dJbmRleCwgZGF5SW5kZXgsIGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIHByZXZNb250aERheXNUb1Nob3csIGRheXNJbk1vbnRoKTtcclxuICAgICAgICAgICAgZGF0ZSA9IHJlc3VsdC5kYXRlO1xyXG4gICAgICAgICAgICBpc090aGVyTW9udGggPSByZXN1bHQuaXNPdGhlck1vbnRoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGlzT3RoZXJNb250aCkge1xyXG4gICAgICAgICAgICBkYXlDZWxsLmFkZENsYXNzKFwib3RoZXItbW9udGhcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyDml6XmnJ/lrrnlmahcclxuICAgICAgICBjb25zdCBkYXRlQ29udGFpbmVyID0gZGF5Q2VsbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJkYXRlLWNvbnRhaW5lclwiIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaXpeacn+aVsOWtl1xyXG4gICAgICAgIGNvbnN0IGRheU51bWJlciA9IGRhdGVDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgXHJcbiAgICAgICAgICAgIHRleHQ6IGAke2RhdGUuZ2V0RGF0ZSgpfWAsXHJcbiAgICAgICAgICAgIGNsczogXCJkYXktbnVtYmVyXCJcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8g5re75Yqg5rOV5a6a6IqC5YGH5pel54q25oCB5qCH6K6wXHJcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gZ2V0SG9saWRheVN0YXR1cyhkYXRlKTtcclxuICAgICAgICBpZiAoc3RhdHVzKSB7XHJcbiAgICAgICAgICAgIGRhdGVDb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiBzdGF0dXMsXHJcbiAgICAgICAgICAgICAgICBjbHM6IGBob2xpZGF5LXN0YXR1cyAke3N0YXR1cyA9PT0gJ+S8kScgPyAnaG9saWRheScgOiAnd29ya2RheSd9YFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8g5qC55o2u54q25oCB6K6+572u5LiN5ZCM55qE6aKc6ImyXHJcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT09ICfkvJEnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDms5XlrproioLlgYfml6XnmoTpmLPljobmlbDlrZfpopzoibLmlLnkuLrmt7HnuqJcclxuICAgICAgICAgICAgICAgIGRheU51bWJlci5hZGRDbGFzcyhcImhvbGlkYXktZGF0ZVwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMgPT09ICfnj60nKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDosIPkvJHnmoTpmLPljobmlbDlrZfpopzoibLkuI7nj63og4zmma/oibLkuIDoh7RcclxuICAgICAgICAgICAgICAgIGRheU51bWJlci5hZGRDbGFzcyhcIndvcmtkYXktZGF0ZVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8g5Yac5Y6G5pel5pyfXHJcbiAgICAgICAgY29uc3QgbHVuYXJEYXRlUmVzdWx0ID0gZ2V0THVuYXJEYXRlKGRhdGUpO1xyXG4gICAgICAgIGRheUNlbGwuY3JlYXRlRWwoXCJkaXZcIiwgeyBcclxuICAgICAgICAgICAgdGV4dDogbHVuYXJEYXRlUmVzdWx0LnRleHQsXHJcbiAgICAgICAgICAgIGNsczogYGx1bmFyLWRhdGUgbHVuYXItJHtsdW5hckRhdGVSZXN1bHQudHlwZX1gXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIOaXpeacn+eKtuaAgeaMh+ekuuWZqOWuueWZqFxyXG4gICAgICAgIGRheUNlbGwuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJkYXktaW5kaWNhdG9yc1wifSk7XHJcblxyXG4gICAgICAgIC8vIOWPquWkhOeQhuW9k+WJjeaciOS7veeahOaXpeacn++8jOa3u+WKoOS7u+WKoeaMh+ekuuWZqFxyXG4gICAgICAgIGlmICghaXNPdGhlck1vbnRoKSB7XHJcbiAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuacieaXpeiusFxyXG4gICAgICAgICAgICBjb25zdCBkYWlseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlOb3RlO1xyXG4gICAgICAgICAgICBjb25zdCBkYWlseUZpbGVOYW1lID0gZm9ybWF0RGF0ZShkYXRlLCBkYWlseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuICAgICAgICAgICAgY29uc3QgZGFpbHlOb3RlUGF0aCA9IGAke2RhaWx5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7ZGFpbHlGaWxlTmFtZX0ubWRgO1xyXG5cclxuICAgICAgICAgICAgaWYgKGF3YWl0IG5vdGVFeGlzdHModGhpcy5wbHVnaW4uYXBwLCBkYWlseU5vdGVQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgLy8g5pyJ5pel6K6w77yM5ZCO57ut5Lya6YCa6L+HdXBkYXRlSW5kaWNhdG9yc+abtOaWsOaMh+ekuuWZqFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5pu05paw5pyI6KeG5Zu+55qE5a6M5pW05YaF5a65XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHVwZGF0ZU1vbnRoQ2FsZW5kYXJDb250ZW50KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnREYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgLy8g5pu05paw5pel5Y6G5aS06YOo5pi+56S6XHJcbiAgICAgICAgdGhpcy51cGRhdGVDYWxlbmRhckhlYWRlcihjb250YWluZXIsIGN1cnJlbnREYXRlKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrDml6XljobooajmoLzlhoXlrrlcclxuICAgICAgICBjb25zdCB0Ym9keSA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuY2FsZW5kYXItdGFibGUgdGJvZHknKTtcclxuICAgICAgICBpZiAoIXRib2R5KSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W5omA5pyJ5pel5pyf6KGMXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGJvZHkucXVlcnlTZWxlY3RvckFsbCgndHInKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6K6h566X5b2T5YmN5pyI5Lu955qE5pel5Y6G5pWw5o2uXHJcbiAgICAgICAgY29uc3QgY3VycmVudFllYXIgPSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRNb250aCA9IGN1cnJlbnREYXRlLmdldE1vbnRoKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZmlyc3REYXkgPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCAxKTtcclxuICAgICAgICBsZXQgc3RhcnREYXkgPSBmaXJzdERheS5nZXREYXkoKTtcclxuICAgICAgICBjb25zdCBkYXlzSW5Nb250aCA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGggKyAxLCAwKS5nZXREYXRlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5ZGo5LiA5Li656ys5LiA5aSp77ya5aaC5p6c56ys5LiA5aSp5piv5ZGo5pel77yM6ZyA6KaB5pi+56S6NuWkqeS4iuS4quaciOeahOaXpeacn++8jOWQpuWImeaYvuekunN0YXJ0RGF5LTHlpKlcclxuICAgICAgICBjb25zdCBwcmV2TW9udGhEYXlzVG9TaG93ID0gc3RhcnREYXkgPT09IDAgPyA2IDogc3RhcnREYXkgLSAxO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiuoeeul+S4iuS4quaciOeahOacgOWQjuS4gOWkqVxyXG4gICAgICAgIGNvbnN0IGxhc3REYXlPZlByZXZNb250aCA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIDApO1xyXG4gICAgICAgIGNvbnN0IHByZXZNb250aERheXMgPSBsYXN0RGF5T2ZQcmV2TW9udGguZ2V0RGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IHByZXZNb250aCA9IGxhc3REYXlPZlByZXZNb250aC5nZXRNb250aCgpO1xyXG4gICAgICAgIGNvbnN0IHByZXZNb250aFllYXIgPSBsYXN0RGF5T2ZQcmV2TW9udGguZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDorqHnrpfkuIvkuKrmnIjnmoTnrKzkuIDlpKlcclxuICAgICAgICBjb25zdCBmaXJzdERheU9mTmV4dE1vbnRoID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCArIDEsIDEpO1xyXG4gICAgICAgIGNvbnN0IG5leHRNb250aCA9IGZpcnN0RGF5T2ZOZXh0TW9udGguZ2V0TW9udGgoKTtcclxuICAgICAgICBjb25zdCBuZXh0TW9udGhZZWFyID0gZmlyc3REYXlPZk5leHRNb250aC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWkhOeQhuS4iuS4quaciOeahOWJqeS9meWkqeaVsFxyXG4gICAgICAgIGxldCBwcmV2TW9udGhEYXkgPSBwcmV2TW9udGhEYXlzIC0gcHJldk1vbnRoRGF5c1RvU2hvdyArIDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5aSE55CG5LiL5Liq5pyI55qE6LW35aeL5aSp5pWwXHJcbiAgICAgICAgbGV0IG5leHRNb250aERheSA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGN1cnJlbnREYXkgPSAxO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiOt+WPluS7iuWkqeeahOaXpeacn1xyXG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDpgY3ljobmiYDmnInooYzvvIzmm7TmlrDlhoXlrrlcclxuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XHJcbiAgICAgICAgICAgIC8vIOiOt+WPluW9k+WJjeihjOeahOaJgOacieWNleWFg+agvO+8iOesrOS4gOS4quaYr+WRqOaVsO+8jOWQjumdojfkuKrmmK/ml6XmnJ/vvIlcclxuICAgICAgICAgICAgY29uc3QgY2VsbHMgPSBBcnJheS5mcm9tKHJvdy5xdWVyeVNlbGVjdG9yQWxsKCd0ZCcpKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOi3s+i/h+WRqOaVsOWNleWFg+agvO+8jOS7juesrDLkuKrljZXlhYPmoLzlvIDlp4vvvIjntKLlvJUx77yJXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgY2VsbHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGwgPSBjZWxsc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChjZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnb3RoZXItbW9udGgnKTtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKCd0b2RheScpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRlOiBEYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpc090aGVyTW9udGggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAocHJldk1vbnRoRGF5IDw9IHByZXZNb250aERheXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiK5Liq5pyI55qE5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGUgPSBuZXcgRGF0ZShwcmV2TW9udGhZZWFyLCBwcmV2TW9udGgsIHByZXZNb250aERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZNb250aERheSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudERheSA8PSBkYXlzSW5Nb250aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlvZPliY3mnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIGN1cnJlbnREYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF5Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiL5Liq5pyI55qE5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGUgPSBuZXcgRGF0ZShuZXh0TW9udGhZZWFyLCBuZXh0TW9udGgsIG5leHRNb250aERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRNb250aERheSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNPdGhlck1vbnRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoJ290aGVyLW1vbnRoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+S7iuWkqVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlLnRvRGF0ZVN0cmluZygpID09PSB0b2RheS50b0RhdGVTdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKCd0b2RheScpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDml6XmnJ/mlbDlrZdcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlQ29udGFpbmVyID0gY2VsbC5xdWVyeVNlbGVjdG9yKCcuZGF0ZS1jb250YWluZXInKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0ZUNvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmuIXnqbrnjrDmnInlhoXlrrlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNvbnRhaW5lci5lbXB0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pel5pyf5pWw5a2XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheU51bWJlciA9IGRhdGVDb250YWluZXIuY3JlYXRlRWwoJ3NwYW4nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBgJHtkYXRlLmdldERhdGUoKX1gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xzOiAnZGF5LW51bWJlcidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/lkajmnKtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZGo5LiA5Li656ys5LiA5aSp5pe277yM5ZGo5YWt77yIaT0277yJ5ZKM5ZGo5pel77yIaT0377yJ5Li65ZGo5pyrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS9huWPquacieazleWumuiKguWBh+aXpeaJjeaUueWPmOminOiJsu+8jOmdnuazleWumuiKguWBh+aXpeeahOWRqOacq+S/neaMgem7mOiupOminOiJslxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAoaSA9PT0gNiB8fCBpID09PSA3KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBkYXlOdW1iZXIuc3R5bGUuY29sb3IgPSAndmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOazleWumuiKguWBh+aXpeeKtuaAgeagh+iusO+8iOS8kS/nj63vvIlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gZ2V0SG9saWRheVN0YXR1cyhkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNvbnRhaW5lci5jcmVhdGVFbCgnc3BhbicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzdGF0dXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xzOiBgaG9saWRheS1zdGF0dXMgJHtzdGF0dXMgPT09ICfkvJEnID8gJ2hvbGlkYXknIDogJ3dvcmtkYXknfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qC55o2u54q25oCB6K6+572u5LiN5ZCM55qE6aKc6ImyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSAn5LyRJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOazleWumuiKguWBh+aXpeeahOmYs+WOhuaVsOWtl+minOiJsuaUueS4uua3see6olxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRheU51bWJlci5hZGRDbGFzcyhcImhvbGlkYXktZGF0ZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzID09PSAn54+tJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiwg+S8keeahOmYs+WOhuaVsOWtl+minOiJsuS4juePreiDjOaZr+iJsuS4gOiHtFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRheU51bWJlci5hZGRDbGFzcyhcIndvcmtkYXktZGF0ZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDlhpzljobml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsdW5hckRhdGUgPSBjZWxsLnF1ZXJ5U2VsZWN0b3IoJy5sdW5hci1kYXRlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGx1bmFyRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsdW5hckRhdGVSZXN1bHQgPSBnZXRMdW5hckRhdGUoZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGx1bmFyRGF0ZS50ZXh0Q29udGVudCA9IGx1bmFyRGF0ZVJlc3VsdC50ZXh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsdW5hckRhdGUuY2xhc3NOYW1lID0gYGx1bmFyLWRhdGUgbHVuYXItJHtsdW5hckRhdGVSZXN1bHQudHlwZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOabtOaWsOaXpeWOhuWktOmDqOaYvuekulxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHVwZGF0ZUNhbGVuZGFySGVhZGVyKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGN1cnJlbnREYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgLy8g5pu05paw5bm05Lu95pi+56S6XHJcbiAgICAgICAgY29uc3QgeWVhckNvbnRlbnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmNhbGVuZGFyLWhlYWRlci1ibG9jay15ZWFyIC5jYWxlbmRhci1oZWFkZXItY29udGVudCcpO1xyXG4gICAgICAgIGlmICh5ZWFyQ29udGVudCkge1xyXG4gICAgICAgICAgICBjb25zdCB5ZWFyU3BhbiA9IHllYXJDb250ZW50LnF1ZXJ5U2VsZWN0b3IoJ3NwYW4nKTtcclxuICAgICAgICAgICAgaWYgKHllYXJTcGFuKSB7XHJcbiAgICAgICAgICAgICAgICB5ZWFyU3Bhbi50ZXh0Q29udGVudCA9IGAke2N1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCl95bm0YDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrDmnIjku73mmL7npLpcclxuICAgICAgICBjb25zdCBtb250aENvbnRlbnQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmNhbGVuZGFyLWhlYWRlci1ibG9jay1tb250aCAuY2FsZW5kYXItaGVhZGVyLWNvbnRlbnQnKTtcclxuICAgICAgICBpZiAobW9udGhDb250ZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoU3BhbiA9IG1vbnRoQ29udGVudC5xdWVyeVNlbGVjdG9yKCdzcGFuJyk7XHJcbiAgICAgICAgICAgIGlmIChtb250aFNwYW4pIHtcclxuICAgICAgICAgICAgICAgIG1vbnRoU3Bhbi50ZXh0Q29udGVudCA9IGAke2N1cnJlbnREYXRlLmdldE1vbnRoKCkgKyAxfeaciGA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXX0=