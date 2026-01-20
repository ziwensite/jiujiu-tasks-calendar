import { __awaiter } from "tslib";
import { ItemView, Notice, TFile } from 'obsidian';
import { getLunarDate, getHolidayStatus, getWeekInfo, formatDate, lunarMonthNames, lunarDayNames } from '../utils/dateUtils';
import { Solar } from 'lunar-typescript';
import { noteExists } from '../services/noteService';
import { extractTasks, filterTasks, parseCustomFilter, evaluateExpression } from '../services/taskService';
import { CalendarRenderer, TaskListRenderer, IndicatorRenderer, EventHandler } from './calendar';
import { CalendarEvent } from '../core/EventEmitter';
const VIEW_TYPE_CALENDAR = "jiujiu-calendar-view";
export class CalendarView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.selectedDate = null;
        this.viewType = 'month';
        this.lastRenderedYear = -1;
        this.lastRenderedMonth = -1;
        this.lastRenderedViewType = 'month';
        this.lastRenderedRows = -1;
        this.selectionType = 'date';
        this.selectedWeekRange = null;
        this.selectedQuarter = null;
        this.lastRenderedNavigationType = 'month';
        this.navigationType = 'month';
        this.plugin = plugin;
        this.currentDate = new Date();
        this.selectedDate = new Date();
        // 初始化模块化组件
        this.calendarRenderer = new CalendarRenderer(plugin);
        this.taskListRenderer = new TaskListRenderer(plugin);
        this.indicatorRenderer = new IndicatorRenderer(plugin);
        this.eventHandler = new EventHandler(plugin);
    }
    getViewType() {
        return VIEW_TYPE_CALENDAR;
    }
    getDisplayText() {
        return "JiuJiu Calendar";
    }
    getIcon() {
        return "calendar";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.renderCalendar();
            // 视图打开时自动显示当天的任务列表
            const taskListContainer = this.containerEl.querySelector(".task-list-container");
            if (taskListContainer && this.selectedDate) {
                yield this.refreshTaskList();
            }
            // 调整任务列表高度，确保滚动条在需要时显示
            setTimeout(() => {
                this.adjustTaskListHeight();
            }, 100);
            // 添加文件系统事件监听，实现实时更新
            this.registerEvent(this.app.vault.on('create', (file) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleFileChange(file);
            })));
            this.registerEvent(this.app.vault.on('delete', (file) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleFileChange(file);
            })));
            this.registerEvent(this.app.vault.on('modify', (file) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleFileChange(file);
            })));
            this.registerEvent(this.app.vault.on('rename', (file, oldPath) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleFileChange(file);
            })));
            // 添加事件监听器，使用事件驱动机制
            this.plugin.eventEmitter.on(CalendarEvent.FILE_CHANGED, () => __awaiter(this, void 0, void 0, function* () {
                // 文件变化时，刷新任务数据缓存并更新任务列表
                yield this.plugin.calendarDataManager.refreshTasks();
                yield this.refreshTaskList();
                // 更新所有日期指示器
                yield this.updateIndicators();
            }));
            this.plugin.eventEmitter.on(CalendarEvent.TASK_DATA_UPDATED, () => __awaiter(this, void 0, void 0, function* () {
                // 任务数据更新时，刷新任务列表
                yield this.refreshTaskList();
                // 更新所有日期指示器
                yield this.updateIndicators();
            }));
            this.plugin.eventEmitter.on(CalendarEvent.CALENDAR_VIEW_UPDATED, () => __awaiter(this, void 0, void 0, function* () {
                // 日历视图更新时，重新渲染日历
                yield this.renderCalendar();
            }));
            this.plugin.eventEmitter.on(CalendarEvent.SELECTED_DATE_CHANGED, () => __awaiter(this, void 0, void 0, function* () {
                // 选择日期变化时，刷新任务列表
                yield this.refreshTaskList();
            }));
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // 清理资源
        });
    }
    renderCalendar() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = this.containerEl.children[1];
            if (!container)
                return;
            // 使用 selectedDate 优先计算日历数据，确保从年视图切换回月视图时使用正确的日期
            const targetDate = this.selectedDate || this.currentDate;
            const { currentYear, currentMonth, currentRows } = this.plugin.calendarDataManager.getCalendarMonthData(targetDate);
            // 检查是否需要完全重建日历结构
            const needsFullRebuild = this.lastRenderedYear !== currentYear ||
                this.lastRenderedMonth !== currentMonth ||
                this.lastRenderedViewType !== this.viewType ||
                this.lastRenderedNavigationType !== this.navigationType ||
                this.lastRenderedRows !== currentRows;
            if (needsFullRebuild) {
                container.empty();
                yield this.buildCalendarStructure(container);
                this.lastRenderedYear = currentYear;
                this.lastRenderedMonth = currentMonth;
                this.lastRenderedViewType = this.viewType;
                this.lastRenderedNavigationType = this.navigationType;
                this.lastRenderedRows = currentRows;
            }
            else {
                // 行数没有变化，只更新日历内容，不整体刷新
                yield this.updateCalendarContent();
            }
            // 1. 首先更新日期选择状态，确保任务列表能显示正确的日期内容
            this.updateDaySelection();
            // 2. 优先更新任务列表，让用户尽快看到关键内容
            if (this.selectedDate) {
                if (this.viewType === 'month' && this.selectionType === 'month') {
                    // 月视图且选择类型为月份：显示整个月份的任务
                    const year = this.selectedDate.getFullYear();
                    const month = this.selectedDate.getMonth();
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    yield this.renderTaskListByDateRange(startDate, endDate);
                }
                else {
                    // 其他情况：显示选中日期的任务
                    yield this.refreshTaskList();
                }
            }
            // 3. 调整任务列表高度，确保滚动条在需要时显示
            this.adjustTaskListHeight();
            // 4. 最后更新非关键的指示器，这些操作不影响用户核心体验
            if (this.viewType === 'month') {
                // 使用异步方式更新周数指示器，不阻塞主线程
                setTimeout(() => {
                    const targetDate = this.selectedDate || this.currentDate;
                    this.indicatorRenderer.updateWeekIndicators(this.containerEl, targetDate);
                }, 0);
            }
        });
    }
    /**
     * 当月历行数没有变化时，只更新日历内容，不整体重建DOM
     */
    updateCalendarContent() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.viewType === 'month') {
                // 更新日历头部显示
                this.updateCalendarHeader();
                // 更新所有日期单元格的完整内容
                yield this.updateMonthCalendarContent();
            }
            else {
                // 年视图也需要更新日历头部
                this.updateCalendarHeader();
            }
        });
    }
    updateMonthCalendarContent() {
        return __awaiter(this, void 0, void 0, function* () {
            // 更新日历表格内容
            const tbody = this.containerEl.querySelector('.calendar-table tbody');
            if (!tbody)
                return;
            // 获取所有日期行
            const rows = Array.from(tbody.querySelectorAll('tr'));
            // 使用数据管理器获取日历数据（带缓存）
            const targetDate = this.selectedDate || this.currentDate;
            const { currentYear, currentMonth, prevMonthDaysToShow, daysInMonth, prevMonthDays, prevMonth, prevMonthYear, nextMonth, nextMonthYear } = this.plugin.calendarDataManager.getCalendarMonthData(targetDate);
            // 处理上个月的剩余天数
            let prevMonthDay = prevMonthDays - prevMonthDaysToShow + 1;
            // 处理下个月的起始天数
            let nextMonthDay = 1;
            let currentDay = 1;
            // 获取今天的日期
            const today = new Date();
            const todayStr = today.toDateString();
            // 使用DocumentFragment批量处理DOM更新，减少重排
            const fragment = document.createDocumentFragment();
            // 遍历所有行，更新内容
            for (const row of rows) {
                // 获取当前行的所有单元格（第一个是周数，后面7个是日期）
                const cells = Array.from(row.querySelectorAll('td'));
                // 跳过周数单元格，从第2个单元格开始（索引1）
                for (let i = 1; i < cells.length; i++) {
                    const cell = cells[i];
                    if (cell) {
                        // 重置类
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
                        const dateStr = date.toDateString();
                        // 批量添加类，减少重排
                        if (isOtherMonth) {
                            cell.addClass('other-month');
                        }
                        // 检查是否是今天
                        if (dateStr === todayStr) {
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
                            // 添加法定节假日状态标记（休/班）
                            const status = getHolidayStatus(date);
                            if (status) {
                                dateContainer.createEl('span', {
                                    text: status,
                                    cls: `holiday-status ${status === '休' ? 'holiday' : 'workday'}`
                                });
                                // 法定节假日的阳历数字颜色改为深红
                                dayNumber.addClass("holiday-date");
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
            // 更新所有指示器
            yield this.updateIndicators();
        });
    }
    /**
     * 更新日历头部显示
     */
    updateCalendarHeader() {
        // 日历头部更新已由calendarRenderer处理
        // 此方法保留以确保兼容性
    }
    buildCalendarStructure(container) {
        return __awaiter(this, void 0, void 0, function* () {
            // 使用 calendarRenderer 构建日历结构（不包含输入框，输入框将在任务列表容器的下方创建）
            yield this.calendarRenderer.buildCalendarStructure(container, this.currentDate, this.selectedDate || this.currentDate, this.viewType, this.navigationType);
            // 添加导航按钮事件监听器
            this.addNavigationEventListeners();
            // 添加日期和周数单元格事件监听器
            yield this.addCalendarCellEventListeners();
            // 任务列表区域
            const taskListContainer = container.createEl("div", { cls: "task-list-container" });
            // 任务列表标题
            const taskListHeader = taskListContainer.createEl("div", { cls: "task-list-header" });
            // 左侧：选中日期显示
            const selectedDateDisplay = taskListHeader.createEl("div", { cls: "selected-date-display" });
            this.updateSelectedDateDisplay(selectedDateDisplay);
            // 右侧：操作按钮组
            const actionButtons = taskListHeader.createEl("div", { cls: "task-list-action-buttons" });
            // 添加闪念按钮
            const flashButton = actionButtons.createEl("button", {
                text: "+闪念",
                cls: "task-action-button flash-button"
            });
            flashButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 获取闪念配置
                const flashConfigId = this.plugin.settings.taskSettings.captureToSettings.fleetingNoteConfigId;
                console.log('闪念配置ID:', flashConfigId);
                const flashConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(config => config.id === flashConfigId);
                console.log('闪念配置:', flashConfig);
                if (flashConfig) {
                    yield this.plugin.executeCaptureToConfig(flashConfig);
                }
            }));
            // 添加记录按钮
            const recordButton = actionButtons.createEl("button", {
                text: "+记录",
                cls: "task-action-button record-button"
            });
            recordButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 获取记录配置
                const recordConfigId = this.plugin.settings.taskSettings.captureToSettings.recordConfigId;
                console.log('记录配置ID:', recordConfigId);
                const recordConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(config => config.id === recordConfigId);
                console.log('记录配置:', recordConfig);
                if (recordConfig) {
                    yield this.plugin.executeCaptureToConfig(recordConfig);
                }
            }));
            // 添加任务按钮
            const taskButton = actionButtons.createEl("button", {
                text: "+任务",
                cls: "task-action-button task-button"
            });
            taskButton.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 获取任务配置
                const taskConfigId = this.plugin.settings.taskSettings.captureToSettings.taskConfigId;
                console.log('任务配置ID:', taskConfigId);
                const taskConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(config => config.id === taskConfigId);
                console.log('任务配置:', taskConfig);
                if (taskConfig) {
                    yield this.plugin.executeCaptureToConfig(taskConfig);
                }
            }));
            // 添加任务列表头部双击事件监听器，用于收缩/展开视图
            taskListHeader.addEventListener("dblclick", () => {
                this.toggleCalendarView();
            });
            // 添加触摸事件监听器，支持移动端向上滑动收缩视图和向下拉展开视图，只在日期显示部分触发
            let touchStartY = 0;
            selectedDateDisplay.addEventListener("touchstart", (e) => {
                if (e.touches && e.touches[0]) {
                    touchStartY = e.touches[0].clientY;
                }
            });
            selectedDateDisplay.addEventListener("touchmove", (e) => {
                if (e.touches && e.touches[0]) {
                    const touchEndY = e.touches[0].clientY;
                    const diff = touchStartY - touchEndY;
                    // 向上滑动超过一定距离时收缩视图
                    if (diff > 50) {
                        this.toggleCalendarView();
                    }
                    // 向下拉超过一定距离时展开视图
                    if (diff < -50) {
                        // 检查是否已经是展开状态
                        const calendarTable = this.containerEl.querySelector(".calendar-table");
                        const yearViewContainer = this.containerEl.querySelector(".year-view-container");
                        let isCollapsed = false;
                        if (calendarTable) {
                            if (this.viewType === 'month') {
                                const tbody = calendarTable.querySelector('tbody');
                                const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
                                isCollapsed = rows.some(row => row.style.display === 'none');
                            }
                            else {
                                isCollapsed = !!calendarTable.style.maxHeight;
                            }
                        }
                        else if (yearViewContainer) {
                            isCollapsed = !!yearViewContainer.style.maxHeight;
                        }
                        // 如果当前是收缩状态，则展开
                        if (isCollapsed) {
                            this.toggleCalendarView();
                        }
                    }
                }
            });
            const taskList = taskListContainer.createEl("div", { cls: "task-list" });
        });
    }
    /**
     * 添加导航按钮事件监听器
     */
    addNavigationEventListeners() {
        // 月份导航按钮
        const prevMonthBtn = this.containerEl.querySelector(".calendar-header-block-month .prev-btn");
        const nextMonthBtn = this.containerEl.querySelector(".calendar-header-block-month .next-btn");
        const monthContent = this.containerEl.querySelector(".calendar-header-block-month .calendar-header-content");
        if (prevMonthBtn) {
            prevMonthBtn.title = "上一月";
            prevMonthBtn.addEventListener("click", () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        if (nextMonthBtn) {
            nextMonthBtn.title = "下一月";
            nextMonthBtn.addEventListener("click", () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        if (monthContent) {
            monthContent.addEventListener("click", (event) => __awaiter(this, void 0, void 0, function* () {
                // 如果是月视图，点击月份数字部分切换导航类型
                if (this.viewType === 'month') {
                    // 切换导航类型
                    this.navigationType = 'year';
                    this.renderCalendar();
                }
                else {
                    // 显示当月所有任务
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    yield this.renderTaskListByDateRange(startDate, endDate);
                }
            }));
            monthContent.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                yield this.eventHandler.handleMonthDoubleClick(this.currentDate);
            }));
        }
        // 年份导航按钮
        const prevYearBtn = this.containerEl.querySelector(".calendar-header-block-year .prev-btn");
        const nextYearBtn = this.containerEl.querySelector(".calendar-header-block-year .next-btn");
        const yearContent = this.containerEl.querySelector(".calendar-header-block-year .calendar-header-content");
        if (prevYearBtn) {
            prevYearBtn.title = "上一年";
            prevYearBtn.addEventListener("click", () => {
                this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        if (nextYearBtn) {
            nextYearBtn.title = "下一年";
            nextYearBtn.addEventListener("click", () => {
                this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        if (yearContent) {
            yearContent.addEventListener("click", (event) => __awaiter(this, void 0, void 0, function* () {
                // 如果是月视图，点击年份数字部分切换导航类型
                if (this.viewType === 'month') {
                    // 切换导航类型
                    this.navigationType = 'month';
                    this.renderCalendar();
                }
                else {
                    // 更新选择类型
                    this.selectionType = 'year';
                    this.selectedDate = null;
                    this.selectedWeekRange = null;
                    this.selectedQuarter = null;
                    // 更新选择状态并刷新日期显示
                    yield this.updateSelectionState();
                    // 显示当年所有任务
                    const year = this.currentDate.getFullYear();
                    const startDate = new Date(year, 0, 1);
                    const endDate = new Date(year, 11, 31);
                    yield this.renderTaskListByDateRange(startDate, endDate);
                }
            }));
            yearContent.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                yield this.eventHandler.handleYearDoubleClick(this.currentDate);
            }));
        }
        // 今日和年按钮
        const todayBtn = this.containerEl.querySelector(".calendar-header .calendar-header-label-today");
        const yearBtn = this.containerEl.querySelector(".calendar-header .calendar-header-label-year");
        if (todayBtn) {
            // 今日按钮：根据是否选中今天日期来决定样式
            const currentToday = new Date();
            const isTodaySelected = this.selectedDate &&
                this.selectedDate.toDateString() === currentToday.toDateString();
            todayBtn.className = `calendar-header-label-today ${isTodaySelected ? 'today-selected' : 'today-unselected'}`;
            todayBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 选中今天日期，切换到月视图
                this.selectedDate = new Date();
                this.currentDate = new Date();
                this.viewType = 'month'; // 切换到月视图
                this.navigationType = 'month'; // 同步更新导航类型
                this.selectionType = 'date'; // 更新选择类型为日期
                this.selectedWeekRange = null;
                this.selectedQuarter = null;
                // 先更新选择状态，让用户立即看到日期变化
                this.updateSelectionState();
                // 然后刷新视图
                this.renderCalendar();
            }));
        }
        if (yearBtn) {
            // 年按钮：在月视图和年视图之间切换
            yearBtn.textContent = this.viewType === 'month' ? "年" : "月";
            yearBtn.className = `calendar-header-label-year ${this.viewType === 'year' ? 'today-selected' : 'today-unselected'}`;
            yearBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                // 切换视图类型
                this.viewType = this.viewType === 'month' ? 'year' : 'month';
                // 同步更新导航类型：年视图默认使用年导航
                this.navigationType = this.viewType === 'year' ? 'year' : 'month';
                // 如果从年视图切换回月视图，确保更新选择类型和相关状态
                if (this.viewType === 'month') {
                    this.selectionType = 'date';
                    this.selectedWeekRange = null;
                    this.selectedQuarter = null;
                }
                // 先更新选择状态，让用户立即看到日期变化
                this.updateSelectionState();
                // 然后刷新视图
                yield this.renderCalendar();
                // 如果切换到年视图，默认选择当前选中日期所在的月份
                if (this.viewType === 'year' && this.selectedDate) {
                    const currentMonthIndex = this.selectedDate.getMonth();
                    const monthContainers = this.containerEl.querySelectorAll(".month-container:not(.quarter-container)");
                    if (monthContainers[currentMonthIndex]) {
                        // 移除所有月份和季度的选中状态
                        document.querySelectorAll(".month-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        document.querySelectorAll(".quarter-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        // 添加当前月份的选中状态
                        monthContainers[currentMonthIndex].classList.add("selected");
                    }
                }
            }));
        }
        // 添加LB1按钮的点击事件监听
        const lb1Btn = this.containerEl.querySelector(".calendar-header-label-lb1");
        if (lb1Btn) {
            lb1Btn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                const lb1Settings = this.plugin.settings.moreLabelSettings.lb1;
                if (!lb1Settings.enabled) {
                    return;
                }
                switch (lb1Settings.actionType) {
                    case "systemCommand":
                        if (lb1Settings.systemCommand) {
                            try {
                                yield this.app.commands.executeCommandById(lb1Settings.systemCommand);
                            }
                            catch (error) {
                                console.error('Failed to execute system command:', error);
                                new Notice(`执行命令失败: ${error}`);
                            }
                        }
                        else {
                            // 如果没有配置命令，打开插件设置
                            this.app.setting.open();
                            this.app.setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                    case "openFile":
                        if (lb1Settings.filePath) {
                            try {
                                const file = this.app.vault.getAbstractFileByPath(lb1Settings.filePath);
                                if (file instanceof TFile) {
                                    yield this.app.workspace.openLinkText(lb1Settings.filePath, "", true);
                                }
                                else {
                                    new Notice('文件不存在，请检查路径');
                                }
                            }
                            catch (error) {
                                console.error('Failed to open file:', error);
                                new Notice(`打开文件失败: ${error}`);
                            }
                        }
                        else {
                            // 如果没有配置文件路径，打开插件设置
                            this.app.setting.open();
                            this.app.setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                }
            }));
        }
        // 添加LB2按钮的点击事件监听
        const lb2Btn = this.containerEl.querySelector(".calendar-header-label-lb2");
        if (lb2Btn) {
            lb2Btn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                const lb2Settings = this.plugin.settings.moreLabelSettings.lb2;
                if (!lb2Settings.enabled) {
                    return;
                }
                switch (lb2Settings.actionType) {
                    case "systemCommand":
                        if (lb2Settings.systemCommand) {
                            try {
                                yield this.app.commands.executeCommandById(lb2Settings.systemCommand);
                            }
                            catch (error) {
                                console.error('Failed to execute system command:', error);
                                new Notice(`执行命令失败: ${error}`);
                            }
                        }
                        else {
                            // 如果没有配置命令，打开插件设置
                            this.app.setting.open();
                            this.app.setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                    case "openFile":
                        if (lb2Settings.filePath) {
                            try {
                                const file = this.app.vault.getAbstractFileByPath(lb2Settings.filePath);
                                if (file instanceof TFile) {
                                    yield this.app.workspace.openLinkText(lb2Settings.filePath, "", true);
                                }
                                else {
                                    new Notice('文件不存在，请检查路径');
                                }
                            }
                            catch (error) {
                                console.error('Failed to open file:', error);
                                new Notice(`打开文件失败: ${error}`);
                            }
                        }
                        else {
                            // 如果没有配置文件路径，打开插件设置
                            this.app.setting.open();
                            this.app.setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                }
            }));
        }
    }
    /**
     * 添加日期和周数单元格事件监听器
     */
    addCalendarCellEventListeners() {
        return __awaiter(this, void 0, void 0, function* () {
            // 处理月视图的周数和日期单元格
            if (this.viewType === 'month') {
                // 周数单元格
                const weekNumberCells = this.containerEl.querySelectorAll(".week-number-cell");
                weekNumberCells.forEach((cell, index) => {
                    // 计算周的开始日期
                    const currentYear = this.currentDate.getFullYear();
                    const currentMonth = this.currentDate.getMonth();
                    const firstDay = new Date(currentYear, currentMonth, 1);
                    let startDay = firstDay.getDay();
                    const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;
                    // 计算当前周的起始日期
                    const weeksPassed = index;
                    const daysPassed = weeksPassed * 7 - prevMonthDaysToShow;
                    const weekStartDate = new Date(currentYear, currentMonth, 1 + daysPassed);
                    // 调整到周一
                    const dayOfWeek = weekStartDate.getDay();
                    const adjustedDate = new Date(weekStartDate);
                    adjustedDate.setDate(adjustedDate.getDate() + (dayOfWeek === 0 ? -6 : 1) - dayOfWeek);
                    // 获取周数
                    const weekInfo = getWeekInfo(adjustedDate);
                    const weekNumber = weekInfo.week;
                    // 周数状态指示器
                    const weekIndicators = cell.querySelector(".week-indicators");
                    if (weekIndicators) {
                        // 检查周报和任务
                        this.checkWeekNoteAndTasks(adjustedDate, weekNumber, weekIndicators);
                    }
                    // 单击事件
                    cell.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                        // 取消之前选择的日期
                        this.selectedDate = null;
                        // 更新选择类型和周范围
                        this.selectionType = 'week';
                        // 计算周的开始和结束日期
                        const weekStart = new Date(adjustedDate);
                        const weekEnd = new Date(adjustedDate);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        this.selectedWeekRange = { start: weekStart, end: weekEnd };
                        this.selectedQuarter = null;
                        // 更新日期单元格的选中状态
                        this.updateDaySelection();
                        // 更新周数单元格的选中状态
                        this.updateWeekSelection(cell);
                        // 更新选择状态并刷新日期显示
                        yield this.updateSelectionState();
                        // 显示该周内的任务
                        yield this.renderTaskListByDateRange(weekStart, weekEnd);
                    }));
                    // 双击事件
                    cell.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                        yield this.eventHandler.handleWeekDoubleClick(adjustedDate);
                    }));
                });
                // 日期单元格
                const dayCells = this.containerEl.querySelectorAll(".day-cell");
                const currentYear = this.currentDate.getFullYear();
                const currentMonth = this.currentDate.getMonth();
                const firstDay = new Date(currentYear, currentMonth, 1);
                let startDay = firstDay.getDay();
                const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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
                let cellIndex = 0;
                let currentDay = 1;
                let prevMonthDay = prevMonthDays - prevMonthDaysToShow + 1;
                let nextMonthDay = 1;
                // 将 NodeList 转换为数组
                const dayCellArray = Array.from(dayCells);
                for (const cell of dayCellArray) {
                    let date;
                    let isOtherMonth = false;
                    // 计算当前单元格的日期
                    if (cellIndex < prevMonthDaysToShow) {
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
                    // 只处理当前月份的日期
                    if (!isOtherMonth) {
                        // 检查是否有日记和任务，添加指示器
                        const indicatorsContainer = cell.querySelector(".day-indicators");
                        if (indicatorsContainer) {
                            yield this.addDayIndicators(indicatorsContainer, date);
                        }
                        // 检查是否是选中的日期
                        if (this.selectedDate) {
                            const isSelected = this.selectedDate.getFullYear() === date.getFullYear() &&
                                this.selectedDate.getMonth() === date.getMonth() &&
                                this.selectedDate.getDate() === date.getDate();
                            if (isSelected) {
                                cell.addClass("selected-day");
                            }
                        }
                        // 双击事件
                        cell.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                            yield this.eventHandler.handleDayDoubleClick(date);
                        }));
                        // 单击事件
                        cell.addEventListener("click", () => {
                            this.onDayClick(date);
                        });
                    }
                    cellIndex++;
                }
            }
            else {
                // 年视图的季度和月份单元格
                // 季度容器（使用与月份容器相同的处理方式）
                const quarterContainers = this.containerEl.querySelectorAll(".quarter-container");
                quarterContainers.forEach((container, index) => {
                    const quarter = index;
                    // 单击事件
                    container.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                        // 移除所有月份和季度的选中状态
                        document.querySelectorAll(".month-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        document.querySelectorAll(".quarter-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        // 添加当前季度的选中状态
                        container.classList.add("selected");
                        // 更新选择类型和季度值
                        this.selectionType = 'quarter';
                        this.selectedDate = null;
                        this.selectedWeekRange = null;
                        this.selectedQuarter = quarter + 1; // 季度从1开始
                        // 更新选择状态并刷新日期显示
                        yield this.updateSelectionState();
                        // 计算季度的开始和结束日期
                        const year = this.currentDate.getFullYear();
                        const quarterStartMonth = quarter * 3;
                        const quarterEndMonth = quarter * 3 + 2;
                        const startDate = new Date(year, quarterStartMonth, 1);
                        const endDate = new Date(year, quarterEndMonth + 1, 0);
                        // 显示该季度内的任务
                        yield this.renderTaskListByDateRange(startDate, endDate);
                    }));
                    // 双击事件
                    container.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                        const quarterDate = new Date(this.currentDate.getFullYear(), quarter * 3, 1);
                        yield this.eventHandler.handleQuarterDoubleClick(quarterDate);
                    }));
                    // 季度状态指示器
                    const quarterIndicators = container.querySelector(".month-indicators");
                    if (quarterIndicators) {
                        // 检查季报和任务
                        this.checkQuarterNoteAndTasks(quarter, quarterIndicators);
                    }
                });
                // 月份容器（排除季度容器）
                const monthContainers = this.containerEl.querySelectorAll(".month-container:not(.quarter-container)");
                monthContainers.forEach((container, index) => {
                    const currentMonthIndex = index;
                    // 月份标题
                    const monthHeader = container.querySelector(".month-header");
                    // 单击事件
                    container.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                        // 移除所有月份和季度的选中状态
                        document.querySelectorAll(".month-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        document.querySelectorAll(".quarter-container").forEach(el => {
                            el.classList.remove("selected");
                        });
                        // 添加当前月份的选中状态
                        container.classList.add("selected");
                        // 更新选择类型
                        this.selectionType = 'month';
                        this.selectedWeekRange = null;
                        this.selectedQuarter = null;
                        // 更新当前日期到选中的月份，并将选中日期设置为该月的1日
                        const selectedMonthDate = new Date(this.currentDate.getFullYear(), currentMonthIndex, 1);
                        this.currentDate = selectedMonthDate;
                        this.selectedDate = selectedMonthDate;
                        // 更新选择状态并刷新日期显示
                        yield this.updateSelectionState();
                        // 计算月份的开始和结束日期
                        const year = this.currentDate.getFullYear();
                        const month = currentMonthIndex;
                        const startDate = new Date(year, month, 1);
                        const endDate = new Date(year, month + 1, 0);
                        // 显示该月份内的任务
                        yield this.renderTaskListByDateRange(startDate, endDate);
                    }));
                    // 双击事件
                    container.addEventListener("dblclick", () => __awaiter(this, void 0, void 0, function* () {
                        const monthDate = new Date(this.currentDate.getFullYear(), currentMonthIndex, 1);
                        yield this.eventHandler.handleMonthDoubleClick(monthDate);
                    }));
                    // 月份状态指示器
                    const monthIndicators = container.querySelector(".month-indicators");
                    if (monthIndicators) {
                        // 检查月报和任务
                        this.checkMonthNoteAndTasks(currentMonthIndex, monthIndicators);
                    }
                });
            }
        });
    }
    refreshAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateCalendarContent();
            yield this.updateIndicators();
            yield this.refreshTaskList();
        });
    }
    refreshCalendar() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateCalendarContent();
            yield this.updateIndicators();
        });
    }
    refreshTaskList() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.selectedDate) {
                const taskListContainer = this.containerEl.querySelector(".task-list-container");
                if (taskListContainer) {
                    // 从数据管理器获取任务并应用筛选
                    const allTasks = yield this.plugin.calendarDataManager.getTasks();
                    const filteredTasks = filterTasks(allTasks, this.plugin.settings, this.selectedDate);
                    // 使用taskListRenderer更新任务列表
                    this.taskListRenderer.renderTaskList(taskListContainer, filteredTasks, (index, completed) => __awaiter(this, void 0, void 0, function* () {
                        const task = filteredTasks[index];
                        if (task) {
                            yield this.eventHandler.handleTaskToggle(task, completed, () => __awaiter(this, void 0, void 0, function* () {
                                // 任务状态变更后刷新数据缓存
                                yield this.plugin.calendarDataManager.refreshTasks();
                                yield this.refreshTaskList();
                            }));
                        }
                    }), (task) => __awaiter(this, void 0, void 0, function* () {
                        yield this.eventHandler.handleTaskDoubleClick(task);
                    }));
                }
            }
        });
    }
    handleFileChange(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // 检查文件是否是笔记文件
            if (!file || !('extension' in file) || file.extension !== 'md')
                return;
            // 强制刷新任务数据缓存
            yield this.plugin.calendarDataManager.refreshTasks();
            // 立即更新任务列表和指示器
            yield this.refreshTaskList();
            yield this.updateIndicators();
        });
    }
    onDayClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            this.selectedDate = date;
            this.currentDate = date; // 使当前月切换到选中日期的月份
            // 重置选择类型为日期
            this.selectionType = 'date';
            this.selectedWeekRange = null;
            this.selectedQuarter = null;
            // 更新日期单元格的选中状态
            this.updateDaySelection();
            // 更新选择状态并刷新日期显示
            yield this.updateSelectionState();
            // 只更新任务列表
            yield this.refreshTaskList();
        });
    }
    updateDaySelection() {
        // 使用indicatorRenderer更新日期选择状态
        this.indicatorRenderer.updateDaySelection(this.containerEl, this.selectedDate);
        // 更新"今"字按钮的样式，根据今天是否被选中
        const currentToday = new Date();
        const isTodaySelected = this.selectedDate &&
            this.selectedDate.toDateString() === currentToday.toDateString();
        const todayBtn = this.containerEl.querySelector(".calendar-header-label-today");
        if (todayBtn) {
            if (isTodaySelected) {
                todayBtn.addClass("today-selected");
                todayBtn.removeClass("today-unselected");
            }
            else {
                todayBtn.addClass("today-unselected");
                todayBtn.removeClass("today-selected");
            }
        }
        // 点击日期时取消周数的选中状态
        this.updateWeekSelection();
    }
    updateWeekSelection(selectedWeekCell) {
        // 移除所有周数单元格的选中状态
        this.containerEl.querySelectorAll(".week-number-cell").forEach((cell) => {
            cell.removeClass('selected-week');
        });
        // 如果有选中的周数单元格，添加选中状态
        if (selectedWeekCell) {
            selectedWeekCell.addClass('selected-week');
        }
    }
    updateSelectionState() {
        // 更新任务列表头部的日期显示
        const selectedDateDisplay = this.containerEl.querySelector(".selected-date-display");
        if (selectedDateDisplay) {
            this.updateSelectedDateDisplay(selectedDateDisplay);
        }
    }
    updateSelectedDateDisplay(container) {
        container.empty();
        switch (this.selectionType) {
            case 'date':
                if (this.selectedDate) {
                    const date = this.selectedDate;
                    const day = date.getDate();
                    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                    const weekday = weekdays[date.getDay()];
                    // 获取阴历信息
                    const solar = Solar.fromDate(date);
                    const lunar = solar.getLunar();
                    const lunarMonth = lunarMonthNames[lunar.getMonth()] || '';
                    const dayNum = lunar.getDay();
                    const lunarDay = lunarDayNames[dayNum] || '';
                    // 组合阴历日期（包含月份）
                    let lunarText = '';
                    if (lunarDay === '初一') {
                        lunarText = lunarMonth;
                    }
                    else {
                        lunarText = `${lunarMonth}${lunarDay}`;
                    }
                    // 清空容器
                    container.empty();
                    // 第一行：日和周
                    const firstLine = container.createEl('div');
                    firstLine.className = 'selected-date-first-line';
                    // 创建日期部分
                    const daySpan = firstLine.createEl('span', { text: `${day}` });
                    daySpan.className = 'day-part';
                    // 创建空格
                    firstLine.createEl('span', { text: ' ' });
                    // 创建星期部分
                    const weekdaySpan = firstLine.createEl('span', { text: weekday });
                    weekdaySpan.className = 'weekday-part';
                    // 第二行：农历
                    const secondLine = container.createEl('div');
                    secondLine.className = 'selected-date-second-line';
                    // 创建阴历部分
                    const lunarSpan = secondLine.createEl('span', { text: lunarText });
                    lunarSpan.className = 'lunar-part';
                }
                else {
                    container.textContent = '未选择日期';
                }
                break;
            case 'week':
                if (this.selectedWeekRange) {
                    const start = this.selectedWeekRange.start;
                    const year = start.getFullYear();
                    const weekInfo = getWeekInfo(start);
                    const weekNumber = weekInfo.week.toString().padStart(2, '0');
                    container.textContent = `${year}年${weekNumber}周`;
                }
                else {
                    container.textContent = '未选择周';
                }
                break;
            case 'month':
                const monthYear = this.currentDate.getFullYear();
                const monthNum = this.currentDate.getMonth() + 1;
                container.textContent = `${monthYear}年${monthNum}月`;
                break;
            case 'quarter':
                if (this.selectedQuarter !== null) {
                    const quarterYear = this.currentDate.getFullYear();
                    container.textContent = `${quarterYear}年${this.selectedQuarter}季度`;
                }
                else {
                    container.textContent = '未选择季度';
                }
                break;
            case 'year':
                const fullYear = this.currentDate.getFullYear();
                container.textContent = `${fullYear}年`;
                break;
            default:
                container.textContent = '未选择';
                break;
        }
    }
    renderTaskListByDateRange(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // 获取任务列表容器
            const taskListContainer = this.containerEl.querySelector(".task-list-container");
            if (!taskListContainer)
                return;
            // 从笔记中提取任务
            const allTasks = yield extractTasks(this.app, this.plugin.settings);
            // 过滤任务：截止日期在 startDate 和 endDate 之间，或者无截止日期但属于当前周期的任务
            const filteredByDateRange = allTasks.filter(task => {
                // 检查1: 有截止日期且截止日期在范围内的任务
                if (task.dueDate) {
                    return task.dueDate >= startDate && task.dueDate <= endDate;
                }
                // 检查2: 没有截止日期但属于当前周期的任务
                // 2.1: 检查任务是否在当前日期范围内的日笔记中
                const fileName = task.filePath.split('/').pop() || '';
                const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch && dateMatch[1]) {
                    // 如果文件名包含日期，检查该日期是否在当前范围内
                    const taskDate = new Date(dateMatch[1]);
                    if (taskDate >= startDate && taskDate <= endDate) {
                        return true;
                    }
                }
                // 2.2: 检查任务是否属于当前周期笔记中的任务
                // 根据当前视图类型和选择类型，判断任务是否属于当前周期
                if (this.viewType === 'year' && this.selectionType === 'quarter') {
                    // 季度视图：检查任务是否在季报中
                    if (this.selectedQuarter !== null) {
                        const quarterlySettings = this.plugin.settings.quarterlyNote;
                        const quarterlyFileName = formatDate(startDate, quarterlySettings.fileNameFormat);
                        const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
                        if (task.filePath === quarterlyNotePath) {
                            return true;
                        }
                        // 检查其他可能的季报路径
                        const possibleQuarterlyPaths = [
                            `00-周期笔记/4-季报/${quarterlyFileName}.md`,
                            `00-周期笔记/4-季报/${formatDate(startDate, "YYYY-QQQ")}.md`,
                            `00-周期笔记/4-季报/${formatDate(startDate, "YYYY-QQ")}.md`
                        ];
                        for (const path of possibleQuarterlyPaths) {
                            if (task.filePath === path) {
                                return true;
                            }
                        }
                    }
                }
                else if (this.viewType === 'year' && this.selectionType === 'month') {
                    // 月视图：检查任务是否在月报中
                    const monthlySettings = this.plugin.settings.monthlyNote;
                    const monthlyFileName = formatDate(startDate, monthlySettings.fileNameFormat);
                    const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
                    if (task.filePath === monthlyNotePath) {
                        return true;
                    }
                    // 检查其他可能的月报路径
                    const possibleMonthlyPaths = [
                        `00-周期笔记/3-月报/${monthlyFileName}.md`,
                        `00-周期笔记/3-月报/${formatDate(startDate, "YYYY-MM")}.md`
                    ];
                    for (const path of possibleMonthlyPaths) {
                        if (task.filePath === path) {
                            return true;
                        }
                    }
                }
                else if (this.selectionType === 'week') {
                    // 周选择：检查任务是否在周报中
                    const weeklySettings = this.plugin.settings.weeklyNote;
                    const weeklyFileName = formatDate(startDate, weeklySettings.fileNameFormat);
                    const weeklyNotePath = `${weeklySettings.savePath}/${weeklyFileName}.md`;
                    if (task.filePath === weeklyNotePath) {
                        return true;
                    }
                    // 检查其他可能的周报路径
                    const possibleWeeklyPaths = [
                        `00-周期笔记/2-周报/${weeklyFileName}.md`,
                        `00-周期笔记/2-周报/${formatDate(startDate, "YYYY-wWW")}.md`,
                        `00-周期笔记/2-周报/${formatDate(startDate, "YYYY-WW")}.md`
                    ];
                    for (const path of possibleWeeklyPaths) {
                        if (task.filePath === path) {
                            return true;
                        }
                    }
                }
                else if (this.viewType === 'year' && this.selectionType === 'year') {
                    // 年视图：检查任务是否在年报中
                    const yearlySettings = this.plugin.settings.yearlyNote;
                    if (yearlySettings) {
                        const yearlyFileName = formatDate(startDate, yearlySettings.fileNameFormat);
                        const yearlyNotePath = `${yearlySettings.savePath}/${yearlyFileName}.md`;
                        if (task.filePath === yearlyNotePath) {
                            return true;
                        }
                        // 检查其他可能的年报路径
                        const possibleYearlyPaths = [
                            `00-周期笔记/5-年报/${yearlyFileName}.md`,
                            `00-周期笔记/5-年报/${formatDate(startDate, "YYYY")}.md`
                        ];
                        for (const path of possibleYearlyPaths) {
                            if (task.filePath === path) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            });
            // 应用插件设置中的筛选条件
            const customFilter = this.plugin.settings.taskFilter.customFilter;
            const expression = parseCustomFilter(customFilter);
            const finalFilteredTasks = expression ? filteredByDateRange.filter(task => {
                return evaluateExpression(task, expression);
            }) : filteredByDateRange;
            // 使用taskListRenderer更新任务列表
            this.taskListRenderer.renderTaskList(taskListContainer, finalFilteredTasks, (index, completed) => __awaiter(this, void 0, void 0, function* () {
                const task = finalFilteredTasks[index];
                if (task) {
                    yield this.eventHandler.handleTaskToggle(task, completed, () => __awaiter(this, void 0, void 0, function* () {
                        yield this.refreshTaskList();
                    }));
                }
            }), (task) => __awaiter(this, void 0, void 0, function* () {
                yield this.eventHandler.handleTaskDoubleClick(task);
            }));
        });
    }
    checkWeekNoteAndTasks(weekStartDate, weekNumber, indicators) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let weeklyFilePath = '';
            for (const path of possiblePaths) {
                if (yield noteExists(this.app, path)) {
                    hasWeeklyNote = true;
                    weeklyFilePath = path;
                    break;
                }
            }
            // 检查周报中是否有任务
            if (hasWeeklyNote && weeklyFilePath) {
                try {
                    const file = this.app.vault.getAbstractFileByPath(weeklyFilePath);
                    if (file instanceof TFile) {
                        const content = yield this.app.vault.read(file);
                        // 检查周报中是否有任务
                        const taskRegex = /^\s*([-\*\d]+\.?)\s*\[(.)\]\s*(.+)$/gm;
                        let match;
                        while ((match = taskRegex.exec(content)) !== null) {
                            const status = match[2] || '';
                            const taskText = match[3] || '';
                            // 检查是否是未完成的任务
                            if (status.toLowerCase() !== 'x') {
                                // 检查任务文本中是否包含截止日期
                                const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                                const hasDueDate = dueDateRegex.test(taskText);
                                // 如果没有截止日期，或者截止日期在本周，都算作本周的任务
                                if (!hasDueDate) {
                                    hasWeeklyTask = true;
                                    break;
                                }
                                else {
                                    // 有截止日期，检查是否在本周
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
                }
                catch (error) {
                    console.error(`Failed to read weekly note: ${weeklyFilePath}`, error);
                }
            }
            // 检查本周内是否有截止任务（其他文件）
            if (!hasWeeklyTask) {
                const allTasks = yield extractTasks(this.app, this.plugin.settings);
                for (const task of allTasks) {
                    if (task.dueDate && task.dueDate >= weekStartDate && task.dueDate <= weekEndDate) {
                        hasWeeklyTask = true;
                        break;
                    }
                }
            }
            // 清空现有指示器
            indicators.empty();
            // 添加实心小圆点表示周报
            if (hasWeeklyNote) {
                indicators.createEl("div", { cls: "indicator-dot solid-dot" });
            }
            // 添加空心小圆点表示任务
            if (hasWeeklyTask) {
                indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
            }
        });
    }
    checkQuarterNoteAndTasks(quarter, indicators) {
        return __awaiter(this, void 0, void 0, function* () {
            // 计算季度的开始和结束日期
            const year = this.currentDate.getFullYear();
            const quarterStartMonth = quarter * 3;
            const quarterEndMonth = quarter * 3 + 2;
            const quarterStartDate = new Date(year, quarterStartMonth, 1);
            const quarterEndDate = new Date(year, quarterEndMonth + 1, 0);
            quarterEndDate.setHours(23, 59, 59, 999);
            let hasQuarterlyNote = false;
            let hasQuarterlyTask = false;
            // 获取季度设置
            const quarterlySettings = this.plugin.settings.quarterlyNote;
            const quarterlyFileName = formatDate(quarterStartDate, quarterlySettings.fileNameFormat);
            // 检查多种可能的季度报告路径
            const possiblePaths = [
                `${quarterlySettings.savePath}/${quarterlyFileName}.md`,
                `00-周期笔记/4-季报/${quarterlyFileName}.md`,
                `00-周期笔记/4-季报/${formatDate(quarterStartDate, "YYYY-QQQ")}.md`,
                `00-周期笔记/4-季报/${formatDate(quarterStartDate, "YYYY-QQ")}.md`
            ];
            // 检查是否存在季度报告
            for (const path of possiblePaths) {
                if (yield noteExists(this.app, path)) {
                    hasQuarterlyNote = true;
                    break;
                }
            }
            // 检查本季度内是否有截止任务
            const allTasks = yield extractTasks(this.app, this.plugin.settings);
            for (const task of allTasks) {
                if (task.dueDate && task.dueDate >= quarterStartDate && task.dueDate <= quarterEndDate) {
                    hasQuarterlyTask = true;
                    break;
                }
            }
            // 清空现有指示器
            indicators.empty();
            // 添加实心小圆点表示季度报告
            if (hasQuarterlyNote) {
                indicators.createEl("div", { cls: "indicator-dot solid-dot" });
            }
            // 添加空心小圆点表示任务
            if (hasQuarterlyTask) {
                indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
            }
        });
    }
    checkMonthNoteAndTasks(monthIndex, indicators) {
        return __awaiter(this, void 0, void 0, function* () {
            // 计算月份的开始和结束日期
            const year = this.currentDate.getFullYear();
            const monthStartDate = new Date(year, monthIndex, 1);
            const monthEndDate = new Date(year, monthIndex + 1, 0);
            monthEndDate.setHours(23, 59, 59, 999);
            let hasMonthlyNote = false;
            let hasMonthlyTask = false;
            // 获取月份设置
            const monthlySettings = this.plugin.settings.monthlyNote;
            const monthlyFileName = formatDate(monthStartDate, monthlySettings.fileNameFormat);
            // 检查多种可能的月报路径
            const possiblePaths = [
                `${monthlySettings.savePath}/${monthlyFileName}.md`,
                `00-周期笔记/3-月报/${monthlyFileName}.md`,
                `00-周期笔记/3-月报/${formatDate(monthStartDate, "YYYY-MM")}.md`
            ];
            // 检查是否存在月报
            for (const path of possiblePaths) {
                if (yield noteExists(this.app, path)) {
                    hasMonthlyNote = true;
                    break;
                }
            }
            // 检查本月内是否有截止任务
            const allTasks = yield extractTasks(this.app, this.plugin.settings);
            for (const task of allTasks) {
                if (task.dueDate && task.dueDate >= monthStartDate && task.dueDate <= monthEndDate) {
                    hasMonthlyTask = true;
                    break;
                }
            }
            // 清空现有指示器
            indicators.empty();
            // 添加实心小圆点表示月报
            if (hasMonthlyNote) {
                indicators.createEl("div", { cls: "indicator-dot solid-dot" });
            }
            // 添加空心小圆点表示任务
            if (hasMonthlyTask) {
                indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
            }
        });
    }
    addDayIndicators(container, date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 检查是否有日记和任务，添加指示器
            const dailySettings = this.plugin.settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            let hasNote = false;
            let hasTask = false;
            if (yield noteExists(this.app, dailyNotePath)) {
                hasNote = true;
                // 检查当天日记中没有截止日期的任务
                try {
                    const dailyFile = this.app.vault.getAbstractFileByPath(dailyNotePath);
                    if (dailyFile instanceof TFile) {
                        const content = yield this.app.vault.read(dailyFile);
                        // 使用 taskRegex 匹配所有任务
                        const taskRegex = /^\s*([-\*\d]+\.?)\s*\[(.)\]\s*(.+)$/gm;
                        let match;
                        while ((match = taskRegex.exec(content)) !== null) {
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
                                    break;
                                }
                                else {
                                    // 有截止日期，检查是否是当天
                                    const dueDateMatch = taskText.match(dueDateRegex);
                                    if (dueDateMatch && dueDateMatch[1]) {
                                        const dueDate = new Date(dueDateMatch[1]);
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
            if (!hasTask) {
                try {
                    const allTasks = yield extractTasks(this.app, this.plugin.settings);
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
            }
            // 清空现有指示器
            container.empty();
            // 创建一行指示器
            const indicatorRow = container.createEl('div', { cls: 'indicator-row' });
            // 显示日记指示器（实心小圆点）
            if (hasNote) {
                indicatorRow.createEl('div', { cls: 'indicator-dot solid-dot' });
            }
            // 显示任务指示器（空心小圆点）
            if (hasTask) {
                indicatorRow.createEl('div', { cls: 'indicator-dot hollow-dot' });
            }
        });
    }
    updateIndicators() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.viewType === 'month') {
                // 使用indicatorRenderer更新指示器
                const targetDate = this.selectedDate || this.currentDate;
                yield this.indicatorRenderer.updateAllDayIndicators(this.containerEl, targetDate);
                yield this.indicatorRenderer.updateWeekIndicators(this.containerEl, targetDate);
            }
            else if (this.viewType === 'year') {
                // 年视图：更新月份指示器
                yield this.updateYearViewMonthIndicators();
            }
            // 移除不必要的refreshTaskList调用，避免重复提取任务
        });
    }
    updateYearViewMonthIndicators() {
        return __awaiter(this, void 0, void 0, function* () {
            // 获取年视图容器
            const yearViewContainer = this.containerEl.querySelector('.year-view-container');
            if (!yearViewContainer)
                return;
            // 获取所有季度容器
            const quarterContainers = Array.from(yearViewContainer.querySelectorAll('.quarter-container'));
            // 遍历所有季度容器
            for (const quarterContainer of quarterContainers) {
                const quarterHeader = quarterContainer.querySelector('.month-header');
                if (!quarterHeader)
                    continue;
                // 解析季度标题，获取季度索引
                const quarterText = quarterHeader.textContent || '';
                const quarterMatch = quarterText.match(/(\d+)季度/);
                if (!quarterMatch || !quarterMatch[1])
                    continue;
                const quarterIndex = parseInt(quarterMatch[1]) - 1;
                if (isNaN(quarterIndex) || quarterIndex < 0 || quarterIndex > 3)
                    continue;
                // 检查该季度是否有季报和任务
                const year = this.currentDate.getFullYear();
                const quarterDate = new Date(year, quarterIndex * 3, 1);
                // 提前声明季度开始和结束日期
                const quarterStartDate = new Date(year, quarterIndex * 3, 1);
                const quarterEndDate = new Date(year, quarterIndex * 3 + 3, 0);
                quarterEndDate.setHours(23, 59, 59, 999);
                let hasQuarterlyNote = false;
                let hasQuarterlyTask = false;
                // 检查季报
                const quarterlySettings = this.plugin.settings.quarterlyNote;
                const quarterlyFileName = formatDate(quarterDate, quarterlySettings.fileNameFormat);
                const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
                if (yield noteExists(this.app, quarterlyNotePath)) {
                    hasQuarterlyNote = true;
                    // 有季报，检查是否有任务
                    try {
                        const file = this.app.vault.getAbstractFileByPath(quarterlyNotePath);
                        if (file instanceof TFile) {
                            const content = yield this.app.vault.read(file);
                            // 检查季报中是否有任务
                            const taskRegex = /^\s*([-\*\d]+\.?)\s*\[([ xX])\]\s*(.+)$/gm;
                            let match;
                            while ((match = taskRegex.exec(content)) !== null) {
                                const status = match[2] || '';
                                const taskText = match[3] || '';
                                // 检查是否是未完成的任务
                                if (status.toLowerCase() !== 'x') {
                                    // 检查任务文本中是否包含截止日期
                                    const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                                    const hasDueDate = dueDateRegex.test(taskText);
                                    // 如果没有截止日期，或者截止日期在本季度，都算作本季度的任务
                                    if (!hasDueDate) {
                                        hasQuarterlyTask = true;
                                        break;
                                    }
                                    else {
                                        // 有截止日期，检查是否在本季度
                                        const dueDateMatch = taskText.match(dueDateRegex);
                                        if (dueDateMatch && dueDateMatch[1]) {
                                            const dueDate = new Date(dueDateMatch[1]);
                                            if (dueDate >= quarterStartDate && dueDate <= quarterEndDate) {
                                                hasQuarterlyTask = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error(`Failed to read quarterly note: ${quarterlyNotePath}`, error);
                    }
                }
                // 检查该季度内是否有截止任务
                const allTasks = yield this.plugin.calendarDataManager.getTasks();
                for (const task of allTasks) {
                    if (task.dueDate && task.dueDate >= quarterStartDate && task.dueDate <= quarterEndDate) {
                        hasQuarterlyTask = true;
                        break;
                    }
                }
                // 更新季度指示器
                const quarterIndicators = quarterContainer.querySelector('.month-indicators');
                if (quarterIndicators) {
                    quarterIndicators.empty();
                    // 添加实心小圆点表示季报
                    if (hasQuarterlyNote) {
                        quarterIndicators.createEl('div', { cls: 'indicator-dot solid-dot' });
                    }
                    // 添加空心小圆点表示任务
                    if (hasQuarterlyTask) {
                        quarterIndicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
                    }
                }
            }
            // 获取所有月份容器（排除季度容器）
            const monthContainers = Array.from(yearViewContainer.querySelectorAll('.month-container:not(.quarter-container)'));
            // 遍历所有月份容器
            for (const monthContainer of monthContainers) {
                const monthHeader = monthContainer.querySelector('.month-header');
                if (!monthHeader)
                    continue;
                // 解析月份标题，获取月份索引
                const monthText = monthHeader.textContent || '';
                const monthMatch = monthText.match(/(\d+)月/);
                if (!monthMatch || !monthMatch[1])
                    continue;
                const monthIndex = parseInt(monthMatch[1]) - 1;
                if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11)
                    continue;
                // 检查该月份是否有月报和任务
                const year = this.currentDate.getFullYear();
                const monthDate = new Date(year, monthIndex, 1);
                let hasMonthlyNote = false;
                let hasMonthlyTask = false;
                // 检查月报
                const monthlySettings = this.plugin.settings.monthlyNote;
                const monthlyFileName = formatDate(monthDate, monthlySettings.fileNameFormat);
                const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
                if (yield noteExists(this.app, monthlyNotePath)) {
                    hasMonthlyNote = true;
                    // 检查是否有任务
                    try {
                        const file = this.app.vault.getAbstractFileByPath(monthlyNotePath);
                        if (file instanceof TFile) {
                            const content = yield this.app.vault.read(file);
                            // 检查是否有任务
                            const taskRegex = /^\s*([-\*\d]+\.?)\s*\[([ xX])\]\s*(.+)$/gm;
                            let match;
                            while ((match = taskRegex.exec(content)) !== null) {
                                const status = match[2] || '';
                                const taskText = match[3] || '';
                                // 检查是否是未完成的任务
                                if (status.toLowerCase() !== 'x') {
                                    // 检查任务文本中是否包含截止日期
                                    const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                                    const hasDueDate = dueDateRegex.test(taskText);
                                    // 如果没有截止日期，或者截止日期在当月，都算作当月的任务
                                    if (!hasDueDate) {
                                        hasMonthlyTask = true;
                                        break;
                                    }
                                    else {
                                        // 有截止日期，检查是否在当月
                                        const dueDateMatch = taskText.match(dueDateRegex);
                                        if (dueDateMatch && dueDateMatch[1]) {
                                            const dueDate = new Date(dueDateMatch[1]);
                                            if (dueDate.getFullYear() === year && dueDate.getMonth() === monthIndex) {
                                                hasMonthlyTask = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error(`Failed to read monthly note: ${monthlyNotePath}`, error);
                    }
                }
                // 检查该月份内是否有截止任务
                const allTasks = yield extractTasks(this.app, this.plugin.settings);
                const monthStartDate = new Date(year, monthIndex, 1);
                const monthEndDate = new Date(year, monthIndex + 1, 0);
                monthEndDate.setHours(23, 59, 59, 999);
                for (const task of allTasks) {
                    if (task.dueDate && task.dueDate >= monthStartDate && task.dueDate <= monthEndDate) {
                        hasMonthlyTask = true;
                        break;
                    }
                }
                // 更新月份指示器
                const monthIndicators = monthContainer.querySelector('.month-indicators');
                if (monthIndicators) {
                    monthIndicators.empty();
                    // 添加实心小圆点表示月报
                    if (hasMonthlyNote) {
                        monthIndicators.createEl('div', { cls: 'indicator-dot solid-dot' });
                    }
                    // 添加空心小圆点表示任务
                    if (hasMonthlyTask) {
                        monthIndicators.createEl('div', { cls: 'indicator-dot hollow-dot' });
                    }
                }
            }
        });
    }
    /**
     * 计算并调整任务列表高度，使其占据剩余空间
     */
    adjustTaskListHeight() {
        // 获取整个视图容器
        const viewContainer = this.containerEl.children[1];
        if (!viewContainer)
            return;
        // 获取视图容器的总高度
        const viewHeight = viewContainer.offsetHeight;
        // 计算任务列表上方所有元素的高度
        let totalHeightAboveTaskList = 0;
        // 日历头部
        const calendarHeader = viewContainer.querySelector('.calendar-header');
        if (calendarHeader) {
            totalHeightAboveTaskList += calendarHeader.offsetHeight;
        }
        // 日历表格（月视图）
        const calendarTable = viewContainer.querySelector('.calendar-table');
        if (calendarTable) {
            totalHeightAboveTaskList += calendarTable.offsetHeight;
        }
        // 年视图容器
        const yearViewContainer = viewContainer.querySelector('.year-view-container');
        if (yearViewContainer) {
            totalHeightAboveTaskList += yearViewContainer.offsetHeight;
        }
        // 任务列表容器（包括其边距和内边距）
        const taskListContainer = viewContainer.querySelector('.task-list-container');
        if (taskListContainer) {
            // 获取任务列表容器的计算样式
            const taskListContainerStyle = window.getComputedStyle(taskListContainer);
            // 添加任务列表容器的外边距
            totalHeightAboveTaskList += parseFloat(taskListContainerStyle.marginTop) || 0;
            totalHeightAboveTaskList += parseFloat(taskListContainerStyle.marginBottom) || 0;
            // 添加任务列表容器的内边距
            totalHeightAboveTaskList += parseFloat(taskListContainerStyle.paddingTop) || 0;
            totalHeightAboveTaskList += parseFloat(taskListContainerStyle.paddingBottom) || 0;
            // 任务列表头部
            const taskListHeader = taskListContainer.querySelector('.task-list-header');
            if (taskListHeader) {
                totalHeightAboveTaskList += taskListHeader.offsetHeight;
            }
        }
        // 计算剩余空间高度，减去状态栏高度，防止任务被遮挡
        const remainingHeight = Math.max(0, viewHeight - totalHeightAboveTaskList - 60); // 减去60px作为状态栏空间，增加空间以避免遮挡
        // 设置任务列表的高度
        if (taskListContainer) {
            const taskList = taskListContainer.querySelector('.task-list');
            if (taskList) {
                taskList.style.height = `${remainingHeight}px`;
            }
        }
    }
    /**
     * 切换日历视图的展开和收缩状态
     */
    toggleCalendarView() {
        // 月视图的收缩/展开逻辑
        if (this.viewType === 'month') {
            const calendarTable = this.containerEl.querySelector('.calendar-table');
            if (calendarTable) {
                const tbody = calendarTable.querySelector('tbody');
                const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
                if (rows.length > 0) {
                    // 检查是否已经是收缩状态
                    const isCollapsed = rows.some(row => row.style.display === 'none');
                    if (isCollapsed) {
                        // 展开视图
                        rows.forEach(row => {
                            row.style.display = '';
                        });
                    }
                    else {
                        // 收缩视图，只保留选中日期所在的行
                        let selectedRowIndex = -1;
                        if (this.selectedDate) {
                            // 计算选中日期所在的行索引
                            const firstDayOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
                            const startDayOfWeek = firstDayOfMonth.getDay();
                            const prevMonthDaysToShow = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
                            const selectedDay = this.selectedDate.getDate();
                            selectedRowIndex = Math.floor((prevMonthDaysToShow + selectedDay - 1) / 7);
                        }
                        // 隐藏所有行
                        rows.forEach(row => {
                            row.style.display = 'none';
                        });
                        // 显示选中日期所在的行（如果有选中日期）
                        const selectedRow = rows[selectedRowIndex];
                        if (selectedRowIndex >= 0 && selectedRowIndex < rows.length && selectedRow) {
                            selectedRow.style.display = '';
                        }
                        else if (rows.length > 0 && rows[0]) {
                            // 如果没有选中日期，显示第一行
                            rows[0].style.display = '';
                        }
                    }
                }
            }
        }
        else if (this.viewType === 'year') {
            // 年视图的收缩/展开逻辑
            const yearViewContainer = this.containerEl.querySelector('.year-view-container');
            if (yearViewContainer) {
                if (yearViewContainer.style.maxHeight) {
                    // 展开视图
                    yearViewContainer.style.maxHeight = "30em";
                    yearViewContainer.style.overflow = "hidden";
                    setTimeout(() => {
                        yearViewContainer.style.maxHeight = "";
                        yearViewContainer.style.overflow = "";
                    }, 300);
                }
                else {
                    // 收缩视图
                    yearViewContainer.style.maxHeight = "8em";
                    yearViewContainer.style.overflow = "hidden";
                }
            }
        }
        // 强制重新计算布局并调整任务列表高度
        setTimeout(() => {
            this.adjustTaskListHeight();
        }, 100);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FsZW5kYXJWaWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ2FsZW5kYXJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFpQixNQUFNLEVBQXFCLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUdyRixPQUFPLEVBQUUsWUFBWSxFQUFrQixnQkFBZ0IsRUFBaUIsV0FBVyxFQUFjLFVBQVUsRUFBRSxlQUFlLEVBQUUsYUFBYSxFQUE4QixNQUFNLG9CQUFvQixDQUFDO0FBQ3BNLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQTBCLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbkksT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHckQsTUFBTSxrQkFBa0IsR0FBRyxzQkFBc0IsQ0FBQztBQUVsRCxNQUFNLE9BQU8sWUFBYSxTQUFRLFFBQVE7SUFzQnRDLFlBQVksSUFBbUIsRUFBRSxNQUFnQjtRQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFuQlIsaUJBQVksR0FBZ0IsSUFBSSxDQUFDO1FBQ2pDLGFBQVEsR0FBK0IsT0FBTyxDQUFDO1FBQy9DLHFCQUFnQixHQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzlCLHNCQUFpQixHQUFXLENBQUMsQ0FBQyxDQUFDO1FBQy9CLHlCQUFvQixHQUErQixPQUFPLENBQUM7UUFDM0QscUJBQWdCLEdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDOUIsa0JBQWEsR0FBNkQsTUFBTSxDQUFDO1FBQ2pGLHNCQUFp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LGFBQWEsQ0FBQyxzQkFBc0IsQ0FBZ0IsQ0FBQztZQUNoRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNwQyxPQUFPO29CQUNQLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDO29CQUMzQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztvQkFFNUMsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDWixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQzt3QkFDdkMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7b0JBQzFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDWixDQUFDO3FCQUFNLENBQUM7b0JBQ0osT0FBTztvQkFDUCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztvQkFDMUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7Z0JBQ2hELENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUVELG9CQUFvQjtRQUNwQixVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ1osSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDaEMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ1osQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIE5vdGljZSwgTWFya2Rvd25WaWV3LCBBcHAsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xyXG5pbXBvcnQgeyBNeVBsdWdpbiB9IGZyb20gJy4uL21haW4nO1xyXG5pbXBvcnQgeyBNeVBsdWdpblNldHRpbmdzIH0gZnJvbSAnLi4vc2V0dGluZ3MnO1xyXG5pbXBvcnQgeyBnZXRMdW5hckRhdGUsIGdldEhvbGlkYXlJbmZvLCBnZXRIb2xpZGF5U3RhdHVzLCBnZXRXZWVrTnVtYmVyLCBnZXRXZWVrSW5mbywgZ2V0UXVhcnRlciwgZm9ybWF0RGF0ZSwgbHVuYXJNb250aE5hbWVzLCBsdW5hckRheU5hbWVzLCBjYWxjdWxhdGVDYWxlbmRhck1vbnRoRGF0YSB9IGZyb20gJy4uL3V0aWxzL2RhdGVVdGlscyc7XHJcbmltcG9ydCB7IFNvbGFyIH0gZnJvbSAnbHVuYXItdHlwZXNjcmlwdCc7XHJcbmltcG9ydCB7IG5vdGVFeGlzdHMgfSBmcm9tICcuLi9zZXJ2aWNlcy9ub3RlU2VydmljZSc7XHJcbmltcG9ydCB7IGV4dHJhY3RUYXNrcywgZmlsdGVyVGFza3MsIHVwZGF0ZVRhc2tJbk5vdGUsIFRhc2ssIHBhcnNlQ3VzdG9tRmlsdGVyLCBldmFsdWF0ZUV4cHJlc3Npb24gfSBmcm9tICcuLi9zZXJ2aWNlcy90YXNrU2VydmljZSc7XHJcbmltcG9ydCB7IENhbGVuZGFyUmVuZGVyZXIsIFRhc2tMaXN0UmVuZGVyZXIsIEluZGljYXRvclJlbmRlcmVyLCBFdmVudEhhbmRsZXIgfSBmcm9tICcuL2NhbGVuZGFyJztcclxuaW1wb3J0IHsgQ2FsZW5kYXJFdmVudCB9IGZyb20gJy4uL2NvcmUvRXZlbnRFbWl0dGVyJztcclxuaW1wb3J0IHsgQ29tbWFuZFNlbGVjdE1vZGFsIH0gZnJvbSAnLi4vbW9kYWxzL0NvbW1hbmRTZWxlY3RNb2RhbCc7XHJcblxyXG5jb25zdCBWSUVXX1RZUEVfQ0FMRU5EQVIgPSBcImppdWppdS1jYWxlbmRhci12aWV3XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ2FsZW5kYXJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG4gICAgcHJpdmF0ZSBjdXJyZW50RGF0ZTogRGF0ZTtcclxuICAgIHByaXZhdGUgcGx1Z2luOiBNeVBsdWdpbjtcclxuXHJcbiAgICBwcml2YXRlIHNlbGVjdGVkRGF0ZTogRGF0ZSB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSB2aWV3VHlwZTogJ21vbnRoJyB8ICd5ZWFyJyB8ICd0YXNrcycgPSAnbW9udGgnO1xyXG4gICAgcHJpdmF0ZSBsYXN0UmVuZGVyZWRZZWFyOiBudW1iZXIgPSAtMTtcclxuICAgIHByaXZhdGUgbGFzdFJlbmRlcmVkTW9udGg6IG51bWJlciA9IC0xO1xyXG4gICAgcHJpdmF0ZSBsYXN0UmVuZGVyZWRWaWV3VHlwZTogJ21vbnRoJyB8ICd5ZWFyJyB8ICd0YXNrcycgPSAnbW9udGgnO1xyXG4gICAgcHJpdmF0ZSBsYXN0UmVuZGVyZWRSb3dzOiBudW1iZXIgPSAtMTtcclxuICAgIHByaXZhdGUgc2VsZWN0aW9uVHlwZTogJ2RhdGUnIHwgJ21vbnRoJyB8ICdxdWFydGVyJyB8ICd5ZWFyJyB8ICd0YXNrcycgfCAnd2VlaycgPSAnZGF0ZSc7XHJcbiAgICBwcml2YXRlIHNlbGVjdGVkV2Vla1JhbmdlOiB7IHN0YXJ0OiBEYXRlOyBlbmQ6IERhdGUgfSB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzZWxlY3RlZFF1YXJ0ZXI6IG51bWJlciB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBsYXN0UmVuZGVyZWROYXZpZ2F0aW9uVHlwZTogJ21vbnRoJyB8ICd5ZWFyJyA9ICdtb250aCc7XHJcbiAgICBwcml2YXRlIG5hdmlnYXRpb25UeXBlOiAnbW9udGgnIHwgJ3llYXInID0gJ21vbnRoJztcclxuICAgIFxyXG4gICAgLy8g5qih5Z2X5YyW57uE5Lu2XHJcbiAgICBwcml2YXRlIGNhbGVuZGFyUmVuZGVyZXI6IENhbGVuZGFyUmVuZGVyZXI7XHJcbiAgICBwcml2YXRlIHRhc2tMaXN0UmVuZGVyZXI6IFRhc2tMaXN0UmVuZGVyZXI7XHJcbiAgICBwcml2YXRlIGluZGljYXRvclJlbmRlcmVyOiBJbmRpY2F0b3JSZW5kZXJlcjtcclxuICAgIHByaXZhdGUgZXZlbnRIYW5kbGVyOiBFdmVudEhhbmRsZXI7XHJcblxyXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBNeVBsdWdpbikge1xyXG4gICAgICAgIHN1cGVyKGxlYWYpO1xyXG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDliJ3lp4vljJbmqKHlnZfljJbnu4Tku7ZcclxuICAgICAgICB0aGlzLmNhbGVuZGFyUmVuZGVyZXIgPSBuZXcgQ2FsZW5kYXJSZW5kZXJlcihwbHVnaW4pO1xyXG4gICAgICAgIHRoaXMudGFza0xpc3RSZW5kZXJlciA9IG5ldyBUYXNrTGlzdFJlbmRlcmVyKHBsdWdpbik7XHJcbiAgICAgICAgdGhpcy5pbmRpY2F0b3JSZW5kZXJlciA9IG5ldyBJbmRpY2F0b3JSZW5kZXJlcihwbHVnaW4pO1xyXG4gICAgICAgIHRoaXMuZXZlbnRIYW5kbGVyID0gbmV3IEV2ZW50SGFuZGxlcihwbHVnaW4pO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIFZJRVdfVFlQRV9DQUxFTkRBUjtcclxuICAgIH1cclxuXHJcbiAgICBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBcIkppdUppdSBDYWxlbmRhclwiO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEljb24oKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gXCJjYWxlbmRhclwiO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIG9uT3BlbigpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckNhbGVuZGFyKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6KeG5Zu+5omT5byA5pe26Ieq5Yqo5pi+56S65b2T5aSp55qE5Lu75Yqh5YiX6KGoXHJcbiAgICAgICAgY29uc3QgdGFza0xpc3RDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIudGFzay1saXN0LWNvbnRhaW5lclwiKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBpZiAodGFza0xpc3RDb250YWluZXIgJiYgdGhpcy5zZWxlY3RlZERhdGUpIHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6LCD5pW05Lu75Yqh5YiX6KGo6auY5bqm77yM56Gu5L+d5rua5Yqo5p2h5Zyo6ZyA6KaB5pe25pi+56S6XHJcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRqdXN0VGFza0xpc3RIZWlnaHQoKTtcclxuICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOaWh+S7tuezu+e7n+S6i+S7tuebkeWQrO+8jOWunueOsOWunuaXtuabtOaWsFxyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbignY3JlYXRlJywgYXN5bmMgKGZpbGUpID0+IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVGaWxlQ2hhbmdlKGZpbGUpO1xyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLnZhdWx0Lm9uKCdkZWxldGUnLCBhc3luYyAoZmlsZSkgPT4ge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZUZpbGVDaGFuZ2UoZmlsZSk7XHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICB0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oJ21vZGlmeScsIGFzeW5jIChmaWxlKSA9PiB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlRmlsZUNoYW5nZShmaWxlKTtcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbigncmVuYW1lJywgYXN5bmMgKGZpbGUsIG9sZFBhdGgpID0+IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVGaWxlQ2hhbmdlKGZpbGUpO1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmt7vliqDkuovku7bnm5HlkKzlmajvvIzkvb/nlKjkuovku7bpqbHliqjmnLrliLZcclxuICAgICAgICB0aGlzLnBsdWdpbi5ldmVudEVtaXR0ZXIub24oQ2FsZW5kYXJFdmVudC5GSUxFX0NIQU5HRUQsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgLy8g5paH5Lu25Y+Y5YyW5pe277yM5Yi35paw5Lu75Yqh5pWw5o2u57yT5a2Y5bm25pu05paw5Lu75Yqh5YiX6KGoXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNhbGVuZGFyRGF0YU1hbmFnZXIucmVmcmVzaFRhc2tzKCk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaFRhc2tMaXN0KCk7XHJcbiAgICAgICAgICAgIC8vIOabtOaWsOaJgOacieaXpeacn+aMh+ekuuWZqFxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUluZGljYXRvcnMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnBsdWdpbi5ldmVudEVtaXR0ZXIub24oQ2FsZW5kYXJFdmVudC5UQVNLX0RBVEFfVVBEQVRFRCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyDku7vliqHmlbDmja7mm7TmlrDml7bvvIzliLfmlrDku7vliqHliJfooahcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICAgICAgLy8g5pu05paw5omA5pyJ5pel5pyf5oyH56S65ZmoXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlSW5kaWNhdG9ycygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMucGx1Z2luLmV2ZW50RW1pdHRlci5vbihDYWxlbmRhckV2ZW50LkNBTEVOREFSX1ZJRVdfVVBEQVRFRCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyDml6Xljobop4blm77mm7TmlrDml7bvvIzph43mlrDmuLLmn5Pml6XljoZcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYWxlbmRhcigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMucGx1Z2luLmV2ZW50RW1pdHRlci5vbihDYWxlbmRhckV2ZW50LlNFTEVDVEVEX0RBVEVfQ0hBTkdFRCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyDpgInmi6nml6XmnJ/lj5jljJbml7bvvIzliLfmlrDku7vliqHliJfooahcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBvbkNsb3NlKCkge1xyXG4gICAgICAgIC8vIOa4heeQhui1hOa6kFxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyByZW5kZXJDYWxlbmRhcigpIHtcclxuICAgICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGlmICghY29udGFpbmVyKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIOS9v+eUqCBzZWxlY3RlZERhdGUg5LyY5YWI6K6h566X5pel5Y6G5pWw5o2u77yM56Gu5L+d5LuO5bm06KeG5Zu+5YiH5o2i5Zue5pyI6KeG5Zu+5pe25L2/55So5q2j56Gu55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgdGFyZ2V0RGF0ZSA9IHRoaXMuc2VsZWN0ZWREYXRlIHx8IHRoaXMuY3VycmVudERhdGU7XHJcbiAgICAgICAgY29uc3QgeyBjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBjdXJyZW50Um93cyB9ID0gdGhpcy5wbHVnaW4uY2FsZW5kYXJEYXRhTWFuYWdlci5nZXRDYWxlbmRhck1vbnRoRGF0YSh0YXJnZXREYXRlKTtcclxuXHJcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm6ZyA6KaB5a6M5YWo6YeN5bu65pel5Y6G57uT5p6EXHJcbiAgICAgICAgY29uc3QgbmVlZHNGdWxsUmVidWlsZCA9IFxyXG4gICAgICAgICAgICB0aGlzLmxhc3RSZW5kZXJlZFllYXIgIT09IGN1cnJlbnRZZWFyIHx8IFxyXG4gICAgICAgICAgICB0aGlzLmxhc3RSZW5kZXJlZE1vbnRoICE9PSBjdXJyZW50TW9udGggfHxcclxuICAgICAgICAgICAgdGhpcy5sYXN0UmVuZGVyZWRWaWV3VHlwZSAhPT0gdGhpcy52aWV3VHlwZSB8fFxyXG4gICAgICAgICAgICB0aGlzLmxhc3RSZW5kZXJlZE5hdmlnYXRpb25UeXBlICE9PSB0aGlzLm5hdmlnYXRpb25UeXBlIHx8XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFJlbmRlcmVkUm93cyAhPT0gY3VycmVudFJvd3M7XHJcblxyXG4gICAgICAgIGlmIChuZWVkc0Z1bGxSZWJ1aWxkKSB7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lci5lbXB0eSgpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkQ2FsZW5kYXJTdHJ1Y3R1cmUoY29udGFpbmVyKTtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UmVuZGVyZWRZZWFyID0gY3VycmVudFllYXI7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFJlbmRlcmVkTW9udGggPSBjdXJyZW50TW9udGg7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFJlbmRlcmVkVmlld1R5cGUgPSB0aGlzLnZpZXdUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RSZW5kZXJlZE5hdmlnYXRpb25UeXBlID0gdGhpcy5uYXZpZ2F0aW9uVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UmVuZGVyZWRSb3dzID0gY3VycmVudFJvd3M7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8g6KGM5pWw5rKh5pyJ5Y+Y5YyW77yM5Y+q5pu05paw5pel5Y6G5YaF5a6577yM5LiN5pW05L2T5Yi35pawXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FsZW5kYXJDb250ZW50KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAxLiDpppblhYjmm7TmlrDml6XmnJ/pgInmi6nnirbmgIHvvIznoa7kv53ku7vliqHliJfooajog73mmL7npLrmraPnoa7nmoTml6XmnJ/lhoXlrrlcclxuICAgICAgICB0aGlzLnVwZGF0ZURheVNlbGVjdGlvbigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIDIuIOS8mOWFiOabtOaWsOS7u+WKoeWIl+ihqO+8jOiuqeeUqOaIt+WwveW/q+eci+WIsOWFs+mUruWGheWuuVxyXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRGF0ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ21vbnRoJyAmJiB0aGlzLnNlbGVjdGlvblR5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgICAgIC8vIOaciOinhuWbvuS4lOmAieaLqeexu+Wei+S4uuaciOS7ve+8muaYvuekuuaVtOS4quaciOS7veeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuc2VsZWN0ZWREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb250aCA9IHRoaXMuc2VsZWN0ZWREYXRlLmdldE1vbnRoKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgMSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggKyAxLCAwKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyVGFza0xpc3RCeURhdGVSYW5nZShzdGFydERhdGUsIGVuZERhdGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8g5YW25LuW5oOF5Ya177ya5pi+56S66YCJ5Lit5pel5pyf55qE5Lu75YqhXHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hUYXNrTGlzdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIDMuIOiwg+aVtOS7u+WKoeWIl+ihqOmrmOW6pu+8jOehruS/nea7muWKqOadoeWcqOmcgOimgeaXtuaYvuekulxyXG4gICAgICAgIHRoaXMuYWRqdXN0VGFza0xpc3RIZWlnaHQoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyA0LiDmnIDlkI7mm7TmlrDpnZ7lhbPplK7nmoTmjIfnpLrlmajvvIzov5nkupvmk43kvZzkuI3lvbHlk43nlKjmiLfmoLjlv4PkvZPpqoxcclxuICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICAvLyDkvb/nlKjlvILmraXmlrnlvI/mm7TmlrDlkajmlbDmjIfnpLrlmajvvIzkuI3pmLvloZ7kuLvnur/nqItcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXREYXRlID0gdGhpcy5zZWxlY3RlZERhdGUgfHwgdGhpcy5jdXJyZW50RGF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5kaWNhdG9yUmVuZGVyZXIudXBkYXRlV2Vla0luZGljYXRvcnModGhpcy5jb250YWluZXJFbCwgdGFyZ2V0RGF0ZSk7XHJcbiAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOW9k+aciOWOhuihjOaVsOayoeacieWPmOWMluaXtu+8jOWPquabtOaWsOaXpeWOhuWGheWuue+8jOS4jeaVtOS9k+mHjeW7ukRPTVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZUNhbGVuZGFyQ29udGVudCgpIHtcclxuICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICAvLyDmm7TmlrDml6XljoblpLTpg6jmmL7npLpcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVDYWxlbmRhckhlYWRlcigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5pu05paw5omA5pyJ5pel5pyf5Y2V5YWD5qC855qE5a6M5pW05YaF5a65XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlTW9udGhDYWxlbmRhckNvbnRlbnQoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyDlubTop4blm77kuZ/pnIDopoHmm7TmlrDml6XljoblpLTpg6hcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVDYWxlbmRhckhlYWRlcigpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZU1vbnRoQ2FsZW5kYXJDb250ZW50KCkge1xyXG4gICAgICAgIC8vIOabtOaWsOaXpeWOhuihqOagvOWGheWuuVxyXG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcuY2FsZW5kYXItdGFibGUgdGJvZHknKTtcclxuICAgICAgICBpZiAoIXRib2R5KSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W5omA5pyJ5pel5pyf6KGMXHJcbiAgICAgICAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGJvZHkucXVlcnlTZWxlY3RvckFsbCgndHInKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5L2/55So5pWw5o2u566h55CG5Zmo6I635Y+W5pel5Y6G5pWw5o2u77yI5bim57yT5a2Y77yJXHJcbiAgICAgICAgY29uc3QgdGFyZ2V0RGF0ZSA9IHRoaXMuc2VsZWN0ZWREYXRlIHx8IHRoaXMuY3VycmVudERhdGU7XHJcbiAgICAgICAgY29uc3QgeyBjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBwcmV2TW9udGhEYXlzVG9TaG93LCBkYXlzSW5Nb250aCwgcHJldk1vbnRoRGF5cywgcHJldk1vbnRoLCBwcmV2TW9udGhZZWFyLCBuZXh0TW9udGgsIG5leHRNb250aFllYXIgfSA9IHRoaXMucGx1Z2luLmNhbGVuZGFyRGF0YU1hbmFnZXIuZ2V0Q2FsZW5kYXJNb250aERhdGEodGFyZ2V0RGF0ZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5aSE55CG5LiK5Liq5pyI55qE5Ymp5L2Z5aSp5pWwXHJcbiAgICAgICAgbGV0IHByZXZNb250aERheSA9IHByZXZNb250aERheXMgLSBwcmV2TW9udGhEYXlzVG9TaG93ICsgMTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDlpITnkIbkuIvkuKrmnIjnmoTotbflp4vlpKnmlbBcclxuICAgICAgICBsZXQgbmV4dE1vbnRoRGF5ID0gMTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgY3VycmVudERheSA9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W5LuK5aSp55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IHRvZGF5U3RyID0gdG9kYXkudG9EYXRlU3RyaW5nKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5L2/55SoRG9jdW1lbnRGcmFnbWVudOaJuemHj+WkhOeQhkRPTeabtOaWsO+8jOWHj+WwkemHjeaOklxyXG4gICAgICAgIGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmBjeWOhuaJgOacieihjO+8jOabtOaWsOWGheWuuVxyXG4gICAgICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgICAgICAgICAgLy8g6I635Y+W5b2T5YmN6KGM55qE5omA5pyJ5Y2V5YWD5qC877yI56ys5LiA5Liq5piv5ZGo5pWw77yM5ZCO6Z2iN+S4quaYr+aXpeacn++8iVxyXG4gICAgICAgICAgICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20ocm93LnF1ZXJ5U2VsZWN0b3JBbGwoJ3RkJykpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6Lez6L+H5ZGo5pWw5Y2V5YWD5qC877yM5LuO56ysMuS4quWNleWFg+agvOW8gOWni++8iOe0ouW8lTHvvIlcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBjZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbCA9IGNlbGxzW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDph43nva7nsbtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLnJlbW92ZUNsYXNzKCdvdGhlci1tb250aCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNlbGwucmVtb3ZlQ2xhc3MoJ3RvZGF5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGU6IERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzT3RoZXJNb250aCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmV2TW9udGhEYXkgPD0gcHJldk1vbnRoRGF5cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDkuIrkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKHByZXZNb250aFllYXIsIHByZXZNb250aCwgcHJldk1vbnRoRGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJldk1vbnRoRGF5Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzT3RoZXJNb250aCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50RGF5IDw9IGRheXNJbk1vbnRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOW9k+WJjeaciOeahOaXpeacn1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgY3VycmVudERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnREYXkrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDkuIvkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKG5leHRNb250aFllYXIsIG5leHRNb250aCwgbmV4dE1vbnRoRGF5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dE1vbnRoRGF5Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzT3RoZXJNb250aCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvRGF0ZVN0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOaJuemHj+a3u+WKoOexu++8jOWHj+WwkemHjeaOklxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc090aGVyTW9udGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2VsbC5hZGRDbGFzcygnb3RoZXItbW9udGgnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5LuK5aSpXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVTdHIgPT09IHRvZGF5U3RyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNlbGwuYWRkQ2xhc3MoJ3RvZGF5Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOaXpeacn+aVsOWtl1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVDb250YWluZXIgPSBjZWxsLnF1ZXJ5U2VsZWN0b3IoJy5kYXRlLWNvbnRhaW5lcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRlQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa4heepuueOsOacieWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlQ29udGFpbmVyLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDml6XmnJ/mlbDlrZdcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5TnVtYmVyID0gZGF0ZUNvbnRhaW5lci5jcmVhdGVFbCgnc3BhbicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGAke2RhdGUuZ2V0RGF0ZSgpfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbHM6ICdkYXktbnVtYmVyJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOazleWumuiKguWBh+aXpeeKtuaAgeagh+iusO+8iOS8kS/nj63vvIlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gZ2V0SG9saWRheVN0YXR1cyhkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZUNvbnRhaW5lci5jcmVhdGVFbCgnc3BhbicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzdGF0dXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xzOiBgaG9saWRheS1zdGF0dXMgJHtzdGF0dXMgPT09ICfkvJEnID8gJ2hvbGlkYXknIDogJ3dvcmtkYXknfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5rOV5a6a6IqC5YGH5pel55qE6Ziz5Y6G5pWw5a2X6aKc6Imy5pS55Li65rex57qiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXlOdW1iZXIuYWRkQ2xhc3MoXCJob2xpZGF5LWRhdGVcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5Yac5Y6G5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbHVuYXJEYXRlID0gY2VsbC5xdWVyeVNlbGVjdG9yKCcubHVuYXItZGF0ZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsdW5hckRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbHVuYXJEYXRlUmVzdWx0ID0gZ2V0THVuYXJEYXRlKGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsdW5hckRhdGUudGV4dENvbnRlbnQgPSBsdW5hckRhdGVSZXN1bHQudGV4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbHVuYXJEYXRlLmNsYXNzTmFtZSA9IGBsdW5hci1kYXRlIGx1bmFyLSR7bHVuYXJEYXRlUmVzdWx0LnR5cGV9YDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pu05paw5omA5pyJ5oyH56S65ZmoXHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVJbmRpY2F0b3JzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDml6XljoblpLTpg6jmmL7npLpcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVDYWxlbmRhckhlYWRlcigpIHtcclxuICAgICAgICAvLyDml6XljoblpLTpg6jmm7TmlrDlt7LnlLFjYWxlbmRhclJlbmRlcmVy5aSE55CGXHJcbiAgICAgICAgLy8g5q2k5pa55rOV5L+d55WZ5Lul56Gu5L+d5YW85a655oCnXHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZENhbGVuZGFyU3RydWN0dXJlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAvLyDkvb/nlKggY2FsZW5kYXJSZW5kZXJlciDmnoTlu7rml6Xljobnu5PmnoTvvIjkuI3ljIXlkKvovpPlhaXmoYbvvIzovpPlhaXmoYblsIblnKjku7vliqHliJfooajlrrnlmajnmoTkuIvmlrnliJvlu7rvvIlcclxuICAgICAgICBhd2FpdCB0aGlzLmNhbGVuZGFyUmVuZGVyZXIuYnVpbGRDYWxlbmRhclN0cnVjdHVyZShjb250YWluZXIsIHRoaXMuY3VycmVudERhdGUsIHRoaXMuc2VsZWN0ZWREYXRlIHx8IHRoaXMuY3VycmVudERhdGUsIHRoaXMudmlld1R5cGUsIHRoaXMubmF2aWdhdGlvblR5cGUpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOWvvOiIquaMiemSruS6i+S7tuebkeWQrOWZqFxyXG4gICAgICAgIHRoaXMuYWRkTmF2aWdhdGlvbkV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5re75Yqg5pel5pyf5ZKM5ZGo5pWw5Y2V5YWD5qC85LqL5Lu255uR5ZCs5ZmoXHJcbiAgICAgICAgYXdhaXQgdGhpcy5hZGRDYWxlbmRhckNlbGxFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOS7u+WKoeWIl+ihqOWMuuWfn1xyXG4gICAgICAgIGNvbnN0IHRhc2tMaXN0Q29udGFpbmVyID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwidGFzay1saXN0LWNvbnRhaW5lclwifSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Lu75Yqh5YiX6KGo5qCH6aKYXHJcbiAgICAgICAgY29uc3QgdGFza0xpc3RIZWFkZXIgPSB0YXNrTGlzdENvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInRhc2stbGlzdC1oZWFkZXJcIn0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOW3puS+p++8mumAieS4reaXpeacn+aYvuekulxyXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkRGF0ZURpc3BsYXkgPSB0YXNrTGlzdEhlYWRlci5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInNlbGVjdGVkLWRhdGUtZGlzcGxheVwifSk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTZWxlY3RlZERhdGVEaXNwbGF5KHNlbGVjdGVkRGF0ZURpc3BsYXkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWPs+S+p++8muaTjeS9nOaMiemSrue7hFxyXG4gICAgICAgIGNvbnN0IGFjdGlvbkJ1dHRvbnMgPSB0YXNrTGlzdEhlYWRlci5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcInRhc2stbGlzdC1hY3Rpb24tYnV0dG9uc1wifSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5re75Yqg6Zeq5b+15oyJ6ZKuXHJcbiAgICAgICAgY29uc3QgZmxhc2hCdXR0b24gPSBhY3Rpb25CdXR0b25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICAgICAgdGV4dDogXCIr6Zeq5b+1XCIsXHJcbiAgICAgICAgICAgIGNsczogXCJ0YXNrLWFjdGlvbi1idXR0b24gZmxhc2gtYnV0dG9uXCJcclxuICAgICAgICB9KTtcclxuICAgICAgICBmbGFzaEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyDojrflj5bpl6rlv7XphY3nva5cclxuICAgICAgICAgICAgY29uc3QgZmxhc2hDb25maWdJZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5mbGVldGluZ05vdGVDb25maWdJZDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+mXquW/temFjee9rklEOicsIGZsYXNoQ29uZmlnSWQpO1xyXG4gICAgICAgICAgICBjb25zdCBmbGFzaENvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzLmZpbmQoXHJcbiAgICAgICAgICAgICAgICBjb25maWcgPT4gY29uZmlnLmlkID09PSBmbGFzaENvbmZpZ0lkXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfpl6rlv7XphY3nva46JywgZmxhc2hDb25maWcpO1xyXG4gICAgICAgICAgICBpZiAoZmxhc2hDb25maWcpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmV4ZWN1dGVDYXB0dXJlVG9Db25maWcoZmxhc2hDb25maWcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5re75Yqg6K6w5b2V5oyJ6ZKuXHJcbiAgICAgICAgY29uc3QgcmVjb3JkQnV0dG9uID0gYWN0aW9uQnV0dG9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcbiAgICAgICAgICAgIHRleHQ6IFwiK+iusOW9lVwiLFxyXG4gICAgICAgICAgICBjbHM6IFwidGFzay1hY3Rpb24tYnV0dG9uIHJlY29yZC1idXR0b25cIlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJlY29yZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyDojrflj5borrDlvZXphY3nva5cclxuICAgICAgICAgICAgY29uc3QgcmVjb3JkQ29uZmlnSWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MucmVjb3JkQ29uZmlnSWQ7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCforrDlvZXphY3nva5JRDonLCByZWNvcmRDb25maWdJZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZENvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy5jb25maWdzLmZpbmQoXHJcbiAgICAgICAgICAgICAgICBjb25maWcgPT4gY29uZmlnLmlkID09PSByZWNvcmRDb25maWdJZFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn6K6w5b2V6YWN572uOicsIHJlY29yZENvbmZpZyk7XHJcbiAgICAgICAgICAgIGlmIChyZWNvcmRDb25maWcpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmV4ZWN1dGVDYXB0dXJlVG9Db25maWcocmVjb3JkQ29uZmlnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOS7u+WKoeaMiemSrlxyXG4gICAgICAgIGNvbnN0IHRhc2tCdXR0b24gPSBhY3Rpb25CdXR0b25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICAgICAgdGV4dDogXCIr5Lu75YqhXCIsXHJcbiAgICAgICAgICAgIGNsczogXCJ0YXNrLWFjdGlvbi1idXR0b24gdGFzay1idXR0b25cIlxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRhc2tCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgLy8g6I635Y+W5Lu75Yqh6YWN572uXHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2tDb25maWdJZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTZXR0aW5ncy5jYXB0dXJlVG9TZXR0aW5ncy50YXNrQ29uZmlnSWQ7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfku7vliqHphY3nva5JRDonLCB0YXNrQ29uZmlnSWQpO1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrQ29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1NldHRpbmdzLmNhcHR1cmVUb1NldHRpbmdzLmNvbmZpZ3MuZmluZChcclxuICAgICAgICAgICAgICAgIGNvbmZpZyA9PiBjb25maWcuaWQgPT09IHRhc2tDb25maWdJZFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5Lu75Yqh6YWN572uOicsIHRhc2tDb25maWcpO1xyXG4gICAgICAgICAgICBpZiAodGFza0NvbmZpZykge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZXhlY3V0ZUNhcHR1cmVUb0NvbmZpZyh0YXNrQ29uZmlnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOS7u+WKoeWIl+ihqOWktOmDqOWPjOWHu+S6i+S7tuebkeWQrOWZqO+8jOeUqOS6juaUtue8qS/lsZXlvIDop4blm75cclxuICAgICAgICB0YXNrTGlzdEhlYWRlci5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZUNhbGVuZGFyVmlldygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOinpuaRuOS6i+S7tuebkeWQrOWZqO+8jOaUr+aMgeenu+WKqOerr+WQkeS4iua7keWKqOaUtue8qeinhuWbvuWSjOWQkeS4i+aLieWxleW8gOinhuWbvu+8jOWPquWcqOaXpeacn+aYvuekuumDqOWIhuinpuWPkVxyXG4gICAgICAgIGxldCB0b3VjaFN0YXJ0WSA9IDA7XHJcbiAgICAgICAgc2VsZWN0ZWREYXRlRGlzcGxheS5hZGRFdmVudExpc3RlbmVyKFwidG91Y2hzdGFydFwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlc1swXSkge1xyXG4gICAgICAgICAgICAgICAgdG91Y2hTdGFydFkgPSBlLnRvdWNoZXNbMF0uY2xpZW50WTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHNlbGVjdGVkRGF0ZURpc3BsYXkuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS50b3VjaGVzICYmIGUudG91Y2hlc1swXSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG91Y2hFbmRZID0gZS50b3VjaGVzWzBdLmNsaWVudFk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkaWZmID0gdG91Y2hTdGFydFkgLSB0b3VjaEVuZFk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOWQkeS4iua7keWKqOi2hei/h+S4gOWumui3neemu+aXtuaUtue8qeinhuWbvlxyXG4gICAgICAgICAgICAgICAgaWYgKGRpZmYgPiA1MCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlQ2FsZW5kYXJWaWV3KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOWQkeS4i+aLiei2hei/h+S4gOWumui3neemu+aXtuWxleW8gOinhuWbvlxyXG4gICAgICAgICAgICAgICAgaWYgKGRpZmYgPCAtNTApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKblt7Lnu4/mmK/lsZXlvIDnirbmgIFcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjYWxlbmRhclRhYmxlID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLmNhbGVuZGFyLXRhYmxlXCIpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHllYXJWaWV3Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLnllYXItdmlldy1jb250YWluZXJcIikgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGlzQ29sbGFwc2VkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbGVuZGFyVGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudmlld1R5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRib2R5ID0gY2FsZW5kYXJUYWJsZS5xdWVyeVNlbGVjdG9yKCd0Ym9keScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93cyA9IHRib2R5ID8gQXJyYXkuZnJvbSh0Ym9keS5xdWVyeVNlbGVjdG9yQWxsKCd0cicpKSA6IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb2xsYXBzZWQgPSByb3dzLnNvbWUocm93ID0+IHJvdy5zdHlsZS5kaXNwbGF5ID09PSAnbm9uZScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNDb2xsYXBzZWQgPSAhIWNhbGVuZGFyVGFibGUuc3R5bGUubWF4SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh5ZWFyVmlld0NvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc0NvbGxhcHNlZCA9ICEheWVhclZpZXdDb250YWluZXIuc3R5bGUubWF4SGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzlvZPliY3mmK/mlLbnvKnnirbmgIHvvIzliJnlsZXlvIBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVDYWxlbmRhclZpZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB0YXNrTGlzdCA9IHRhc2tMaXN0Q29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtjbHM6IFwidGFzay1saXN0XCJ9KTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOa3u+WKoOWvvOiIquaMiemSruS6i+S7tuebkeWQrOWZqFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFkZE5hdmlnYXRpb25FdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICAvLyDmnIjku73lr7zoiKrmjInpkq5cclxuICAgICAgICBjb25zdCBwcmV2TW9udGhCdG4gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuY2FsZW5kYXItaGVhZGVyLWJsb2NrLW1vbnRoIC5wcmV2LWJ0blwiKTtcclxuICAgICAgICBjb25zdCBuZXh0TW9udGhCdG4gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuY2FsZW5kYXItaGVhZGVyLWJsb2NrLW1vbnRoIC5uZXh0LWJ0blwiKTtcclxuICAgICAgICBjb25zdCBtb250aENvbnRlbnQgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuY2FsZW5kYXItaGVhZGVyLWJsb2NrLW1vbnRoIC5jYWxlbmRhci1oZWFkZXItY29udGVudFwiKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAocHJldk1vbnRoQnRuKSB7XHJcbiAgICAgICAgICAgIChwcmV2TW9udGhCdG4gYXMgSFRNTEVsZW1lbnQpLnRpdGxlID0gXCLkuIrkuIDmnIhcIjtcclxuICAgICAgICAgICAgcHJldk1vbnRoQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlLnNldE1vbnRoKHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKSAtIDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUgPSB0aGlzLmN1cnJlbnREYXRlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDYWxlbmRhcigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKG5leHRNb250aEJ0bikge1xyXG4gICAgICAgICAgICAobmV4dE1vbnRoQnRuIGFzIEhUTUxFbGVtZW50KS50aXRsZSA9IFwi5LiL5LiA5pyIXCI7XHJcbiAgICAgICAgICAgIG5leHRNb250aEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXRNb250aCh0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCkgKyAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gdGhpcy5jdXJyZW50RGF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2FsZW5kYXIoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChtb250aENvbnRlbnQpIHtcclxuICAgICAgICAgICAgbW9udGhDb250ZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIOWmguaenOaYr+aciOinhuWbvu+8jOeCueWHu+aciOS7veaVsOWtl+mDqOWIhuWIh+aNouWvvOiIquexu+Wei1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmlld1R5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDliIfmjaLlr7zoiKrnsbvlnotcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRpb25UeXBlID0gJ3llYXInO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2FsZW5kYXIoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pi+56S65b2T5pyI5omA5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb250aCA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5kRGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoICsgMSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJUYXNrTGlzdEJ5RGF0ZVJhbmdlKHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBtb250aENvbnRlbnQuYWRkRXZlbnRMaXN0ZW5lcihcImRibGNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZXZlbnRIYW5kbGVyLmhhbmRsZU1vbnRoRG91YmxlQ2xpY2sodGhpcy5jdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDlubTku73lr7zoiKrmjInpkq5cclxuICAgICAgICBjb25zdCBwcmV2WWVhckJ0biA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5jYWxlbmRhci1oZWFkZXItYmxvY2steWVhciAucHJldi1idG5cIik7XHJcbiAgICAgICAgY29uc3QgbmV4dFllYXJCdG4gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuY2FsZW5kYXItaGVhZGVyLWJsb2NrLXllYXIgLm5leHQtYnRuXCIpO1xyXG4gICAgICAgIGNvbnN0IHllYXJDb250ZW50ID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLmNhbGVuZGFyLWhlYWRlci1ibG9jay15ZWFyIC5jYWxlbmRhci1oZWFkZXItY29udGVudFwiKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAocHJldlllYXJCdG4pIHtcclxuICAgICAgICAgICAgKHByZXZZZWFyQnRuIGFzIEhUTUxFbGVtZW50KS50aXRsZSA9IFwi5LiK5LiA5bm0XCI7XHJcbiAgICAgICAgICAgIHByZXZZZWFyQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlLnNldEZ1bGxZZWFyKHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKSAtIDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUgPSB0aGlzLmN1cnJlbnREYXRlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDYWxlbmRhcigpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKG5leHRZZWFyQnRuKSB7XHJcbiAgICAgICAgICAgIChuZXh0WWVhckJ0biBhcyBIVE1MRWxlbWVudCkudGl0bGUgPSBcIuS4i+S4gOW5tFwiO1xyXG4gICAgICAgICAgICBuZXh0WWVhckJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50RGF0ZS5zZXRGdWxsWWVhcih0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCkgKyAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gdGhpcy5jdXJyZW50RGF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyQ2FsZW5kYXIoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh5ZWFyQ29udGVudCkge1xyXG4gICAgICAgICAgICB5ZWFyQ29udGVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyDlpoLmnpzmmK/mnIjop4blm77vvIzngrnlh7vlubTku73mlbDlrZfpg6jliIbliIfmjaLlr7zoiKrnsbvlnotcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnZpZXdUeXBlID09PSAnbW9udGgnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5YiH5o2i5a+86Iiq57G75Z6LXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uVHlwZSA9ICdtb250aCc7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJDYWxlbmRhcigpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpgInmi6nnsbvlnotcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblR5cGUgPSAneWVhcic7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRXZWVrUmFuZ2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWFydGVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpgInmi6nnirbmgIHlubbliLfmlrDml6XmnJ/mmL7npLpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVNlbGVjdGlvblN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pi+56S65b2T5bm05omA5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCAwLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoeWVhciwgMTEsIDMxKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclRhc2tMaXN0QnlEYXRlUmFuZ2Uoc3RhcnREYXRlLCBlbmREYXRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHllYXJDb250ZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmV2ZW50SGFuZGxlci5oYW5kbGVZZWFyRG91YmxlQ2xpY2sodGhpcy5jdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDku4rml6XlkozlubTmjInpkq5cclxuICAgICAgICBjb25zdCB0b2RheUJ0biA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5jYWxlbmRhci1oZWFkZXIgLmNhbGVuZGFyLWhlYWRlci1sYWJlbC10b2RheVwiKTtcclxuICAgICAgICBjb25zdCB5ZWFyQnRuID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLmNhbGVuZGFyLWhlYWRlciAuY2FsZW5kYXItaGVhZGVyLWxhYmVsLXllYXJcIik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHRvZGF5QnRuKSB7XHJcbiAgICAgICAgICAgIC8vIOS7iuaXpeaMiemSru+8muagueaNruaYr+WQpumAieS4reS7iuWkqeaXpeacn+adpeWGs+Wumuagt+W8j1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpc1RvZGF5U2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkRGF0ZSAmJiBcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlLnRvRGF0ZVN0cmluZygpID09PSBjdXJyZW50VG9kYXkudG9EYXRlU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIHRvZGF5QnRuLmNsYXNzTmFtZSA9IGBjYWxlbmRhci1oZWFkZXItbGFiZWwtdG9kYXkgJHtpc1RvZGF5U2VsZWN0ZWQgPyAndG9kYXktc2VsZWN0ZWQnIDogJ3RvZGF5LXVuc2VsZWN0ZWQnfWA7XHJcbiAgICAgICAgICAgIHRvZGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyDpgInkuK3ku4rlpKnml6XmnJ/vvIzliIfmjaLliLDmnIjop4blm75cclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gbmV3IERhdGUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudERhdGUgPSBuZXcgRGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3VHlwZSA9ICdtb250aCc7IC8vIOWIh+aNouWIsOaciOinhuWbvlxyXG4gICAgICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uVHlwZSA9ICdtb250aCc7IC8vIOWQjOatpeabtOaWsOWvvOiIquexu+Wei1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25UeXBlID0gJ2RhdGUnOyAvLyDmm7TmlrDpgInmi6nnsbvlnovkuLrml6XmnJ9cclxuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRXZWVrUmFuZ2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1YXJ0ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDlhYjmm7TmlrDpgInmi6nnirbmgIHvvIzorqnnlKjmiLfnq4vljbPnnIvliLDml6XmnJ/lj5jljJZcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU2VsZWN0aW9uU3RhdGUoKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g54S25ZCO5Yi35paw6KeG5Zu+XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlckNhbGVuZGFyKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoeWVhckJ0bikge1xyXG4gICAgICAgICAgICAvLyDlubTmjInpkq7vvJrlnKjmnIjop4blm77lkozlubTop4blm77kuYvpl7TliIfmjaJcclxuICAgICAgICAgICAgeWVhckJ0bi50ZXh0Q29udGVudCA9IHRoaXMudmlld1R5cGUgPT09ICdtb250aCcgPyBcIuW5tFwiIDogXCLmnIhcIjtcclxuICAgICAgICAgICAgeWVhckJ0bi5jbGFzc05hbWUgPSBgY2FsZW5kYXItaGVhZGVyLWxhYmVsLXllYXIgJHt0aGlzLnZpZXdUeXBlID09PSAneWVhcicgPyAndG9kYXktc2VsZWN0ZWQnIDogJ3RvZGF5LXVuc2VsZWN0ZWQnfWA7XHJcbiAgICAgICAgICAgIHllYXJCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIOWIh+aNouinhuWbvuexu+Wei1xyXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3VHlwZSA9IHRoaXMudmlld1R5cGUgPT09ICdtb250aCcgPyAneWVhcicgOiAnbW9udGgnO1xyXG4gICAgICAgICAgICAgICAgLy8g5ZCM5q2l5pu05paw5a+86Iiq57G75Z6L77ya5bm06KeG5Zu+6buY6K6k5L2/55So5bm05a+86IiqXHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hdmlnYXRpb25UeXBlID0gdGhpcy52aWV3VHlwZSA9PT0gJ3llYXInID8gJ3llYXInIDogJ21vbnRoJztcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5aaC5p6c5LuO5bm06KeG5Zu+5YiH5o2i5Zue5pyI6KeG5Zu+77yM56Gu5L+d5pu05paw6YCJ5oup57G75Z6L5ZKM55u45YWz54q25oCBXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uVHlwZSA9ICdkYXRlJztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkV2Vla1JhbmdlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVhcnRlciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOWFiOabtOaWsOmAieaLqeeKtuaAge+8jOiuqeeUqOaIt+eri+WNs+eci+WIsOaXpeacn+WPmOWMllxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTZWxlY3Rpb25TdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDnhLblkI7liLfmlrDop4blm75cclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyQ2FsZW5kYXIoKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5aaC5p6c5YiH5o2i5Yiw5bm06KeG5Zu+77yM6buY6K6k6YCJ5oup5b2T5YmN6YCJ5Lit5pel5pyf5omA5Zyo55qE5pyI5Lu9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ3llYXInICYmIHRoaXMuc2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudE1vbnRoSW5kZXggPSB0aGlzLnNlbGVjdGVkRGF0ZS5nZXRNb250aCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vbnRoQ29udGFpbmVycyA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5tb250aC1jb250YWluZXI6bm90KC5xdWFydGVyLWNvbnRhaW5lcilcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vbnRoQ29udGFpbmVyc1tjdXJyZW50TW9udGhJbmRleF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g56e76Zmk5omA5pyJ5pyI5Lu95ZKM5a2j5bqm55qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIubW9udGgtY29udGFpbmVyXCIpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5xdWFydGVyLWNvbnRhaW5lclwiKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOW9k+WJjeaciOS7veeahOmAieS4reeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb250aENvbnRhaW5lcnNbY3VycmVudE1vbnRoSW5kZXhdLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDmt7vliqBMQjHmjInpkq7nmoTngrnlh7vkuovku7bnm5HlkKxcclxuICAgICAgICBjb25zdCBsYjFCdG4gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoXCIuY2FsZW5kYXItaGVhZGVyLWxhYmVsLWxiMVwiKTtcclxuICAgICAgICBpZiAobGIxQnRuKSB7XHJcbiAgICAgICAgICAgIGxiMUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbGIxU2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb3JlTGFiZWxTZXR0aW5ncy5sYjE7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghbGIxU2V0dGluZ3MuZW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChsYjFTZXR0aW5ncy5hY3Rpb25UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN5c3RlbUNvbW1hbmRcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxiMVNldHRpbmdzLnN5c3RlbUNvbW1hbmQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgKHRoaXMuYXBwIGFzIGFueSkuY29tbWFuZHMuZXhlY3V0ZUNvbW1hbmRCeUlkKGxiMVNldHRpbmdzLnN5c3RlbUNvbW1hbmQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZXhlY3V0ZSBzeXN0ZW0gY29tbWFuZDonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShg5omn6KGM5ZG95Luk5aSx6LSlOiAke2Vycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5pyJ6YWN572u5ZG95Luk77yM5omT5byA5o+S5Lu26K6+572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlblRhYkJ5SWQodGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvcGVuRmlsZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGIxU2V0dGluZ3MuZmlsZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChsYjFTZXR0aW5ncy5maWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2Uub3BlbkxpbmtUZXh0KGxiMVNldHRpbmdzLmZpbGVQYXRoLCBcIlwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKCfmlofku7bkuI3lrZjlnKjvvIzor7fmo4Dmn6Xot6/lvoQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBvcGVuIGZpbGU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOaJk+W8gOaWh+S7tuWksei0pTogJHtlcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeaciemFjee9ruaWh+S7tui3r+W+hO+8jOaJk+W8gOaPkuS7tuiuvue9rlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkuc2V0dGluZy5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nLm9wZW5UYWJCeUlkKHRoaXMucGx1Z2luLm1hbmlmZXN0LmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoExCMuaMiemSrueahOeCueWHu+S6i+S7tuebkeWQrFxyXG4gICAgICAgIGNvbnN0IGxiMkJ0biA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5jYWxlbmRhci1oZWFkZXItbGFiZWwtbGIyXCIpO1xyXG4gICAgICAgIGlmIChsYjJCdG4pIHtcclxuICAgICAgICAgICAgbGIyQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsYjJTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm1vcmVMYWJlbFNldHRpbmdzLmxiMjtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCFsYjJTZXR0aW5ncy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGxiMlNldHRpbmdzLmFjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3lzdGVtQ29tbWFuZFwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGIyU2V0dGluZ3Muc3lzdGVtQ29tbWFuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCAodGhpcy5hcHAgYXMgYW55KS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZEJ5SWQobGIyU2V0dGluZ3Muc3lzdGVtQ29tbWFuZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIHN5c3RlbSBjb21tYW5kOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDmiafooYzlkb3ku6TlpLHotKU6ICR7ZXJyb3J9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmsqHmnInphY3nva7lkb3ku6TvvIzmiZPlvIDmj5Lku7borr7nva5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkuc2V0dGluZy5vcGVuVGFiQnlJZCh0aGlzLnBsdWdpbi5tYW5pZmVzdC5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIm9wZW5GaWxlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsYjJTZXR0aW5ncy5maWxlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGxiMlNldHRpbmdzLmZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5vcGVuTGlua1RleHQobGIyU2V0dGluZ3MuZmlsZVBhdGgsIFwiXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoJ+aWh+S7tuS4jeWtmOWcqO+8jOivt+ajgOafpei3r+W+hCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIG9wZW4gZmlsZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShg5omT5byA5paH5Lu25aSx6LSlOiAke2Vycm9yfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5pyJ6YWN572u5paH5Lu26Lev5b6E77yM5omT5byA5o+S5Lu26K6+572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5hcHAgYXMgYW55KS5zZXR0aW5nLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmFwcCBhcyBhbnkpLnNldHRpbmcub3BlblRhYkJ5SWQodGhpcy5wbHVnaW4ubWFuaWZlc3QuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDmt7vliqDml6XmnJ/lkozlkajmlbDljZXlhYPmoLzkuovku7bnm5HlkKzlmahcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDYWxlbmRhckNlbGxFdmVudExpc3RlbmVycygpIHtcclxuICAgICAgICAvLyDlpITnkIbmnIjop4blm77nmoTlkajmlbDlkozml6XmnJ/ljZXlhYPmoLxcclxuICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICAvLyDlkajmlbDljZXlhYPmoLxcclxuICAgICAgICAgICAgY29uc3Qgd2Vla051bWJlckNlbGxzID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLndlZWstbnVtYmVyLWNlbGxcIik7XHJcbiAgICAgICAgICAgIHdlZWtOdW1iZXJDZWxscy5mb3JFYWNoKChjZWxsLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8g6K6h566X5ZGo55qE5byA5aeL5pel5pyfXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50WWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRNb250aCA9IHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgMSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnREYXkgPSBmaXJzdERheS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZNb250aERheXNUb1Nob3cgPSBzdGFydERheSA9PT0gMCA/IDYgOiBzdGFydERheSAtIDE7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOiuoeeul+W9k+WJjeWRqOeahOi1t+Wni+aXpeacn1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2Vla3NQYXNzZWQgPSBpbmRleDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRheXNQYXNzZWQgPSB3ZWVrc1Bhc3NlZCAqIDcgLSBwcmV2TW9udGhEYXlzVG9TaG93O1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgd2Vla1N0YXJ0RGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIDEgKyBkYXlzUGFzc2VkKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g6LCD5pW05Yiw5ZGo5LiAXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlPZldlZWsgPSB3ZWVrU3RhcnREYXRlLmdldERheSgpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYWRqdXN0ZWREYXRlID0gbmV3IERhdGUod2Vla1N0YXJ0RGF0ZSk7XHJcbiAgICAgICAgICAgICAgICBhZGp1c3RlZERhdGUuc2V0RGF0ZShhZGp1c3RlZERhdGUuZ2V0RGF0ZSgpICsgKGRheU9mV2VlayA9PT0gMCA/IC02IDogMSkgLSBkYXlPZldlZWspO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDojrflj5blkajmlbBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtJbmZvID0gZ2V0V2Vla0luZm8oYWRqdXN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtOdW1iZXIgPSB3ZWVrSW5mby53ZWVrO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDlkajmlbDnirbmgIHmjIfnpLrlmahcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtJbmRpY2F0b3JzID0gY2VsbC5xdWVyeVNlbGVjdG9yKFwiLndlZWstaW5kaWNhdG9yc1wiKTtcclxuICAgICAgICAgICAgICAgIGlmICh3ZWVrSW5kaWNhdG9ycykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeWRqOaKpeWSjOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tXZWVrTm90ZUFuZFRhc2tzKGFkanVzdGVkRGF0ZSwgd2Vla051bWJlciwgd2Vla0luZGljYXRvcnMgYXMgSFRNTEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDljZXlh7vkuovku7ZcclxuICAgICAgICAgICAgICAgIGNlbGwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlj5bmtojkuYvliY3pgInmi6nnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkRGF0ZSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOmAieaLqeexu+Wei+WSjOWRqOiMg+WbtFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0aW9uVHlwZSA9ICd3ZWVrJztcclxuICAgICAgICAgICAgICAgICAgICAvLyDorqHnrpflkajnmoTlvIDlp4vlkoznu5PmnZ/ml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWVrU3RhcnQgPSBuZXcgRGF0ZShhZGp1c3RlZERhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtFbmQgPSBuZXcgRGF0ZShhZGp1c3RlZERhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdlZWtFbmQuc2V0RGF0ZSh3ZWVrRW5kLmdldERhdGUoKSArIDYpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRXZWVrUmFuZ2UgPSB7IHN0YXJ0OiB3ZWVrU3RhcnQsIGVuZDogd2Vla0VuZCB9O1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWFydGVyID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5pel5pyf5Y2V5YWD5qC855qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVEYXlTZWxlY3Rpb24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5ZGo5pWw5Y2V5YWD5qC855qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWVrU2VsZWN0aW9uKGNlbGwgYXMgSFRNTEVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpgInmi6nnirbmgIHlubbliLfmlrDml6XmnJ/mmL7npLpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVNlbGVjdGlvblN0YXRlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOaYvuekuuivpeWRqOWGheeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyVGFza0xpc3RCeURhdGVSYW5nZSh3ZWVrU3RhcnQsIHdlZWtFbmQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8g5Y+M5Ye75LqL5Lu2XHJcbiAgICAgICAgICAgICAgICBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoXCJkYmxjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5ldmVudEhhbmRsZXIuaGFuZGxlV2Vla0RvdWJsZUNsaWNrKGFkanVzdGVkRGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDml6XmnJ/ljZXlhYPmoLxcclxuICAgICAgICAgICAgY29uc3QgZGF5Q2VsbHMgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuZGF5LWNlbGxcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRZZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50TW9udGggPSB0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgMSk7XHJcbiAgICAgICAgICAgIGxldCBzdGFydERheSA9IGZpcnN0RGF5LmdldERheSgpO1xyXG4gICAgICAgICAgICBjb25zdCBkYXlzSW5Nb250aCA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGggKyAxLCAwKS5nZXREYXRlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb250aERheXNUb1Nob3cgPSBzdGFydERheSA9PT0gMCA/IDYgOiBzdGFydERheSAtIDE7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorqHnrpfkuIrkuKrmnIjnmoTmnIDlkI7kuIDlpKlcclxuICAgICAgICAgICAgY29uc3QgbGFzdERheU9mUHJldk1vbnRoID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgMCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHByZXZNb250aERheXMgPSBsYXN0RGF5T2ZQcmV2TW9udGguZ2V0RGF0ZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBwcmV2TW9udGggPSBsYXN0RGF5T2ZQcmV2TW9udGguZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgY29uc3QgcHJldk1vbnRoWWVhciA9IGxhc3REYXlPZlByZXZNb250aC5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6K6h566X5LiL5Liq5pyI55qE56ys5LiA5aSpXHJcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0RGF5T2ZOZXh0TW9udGggPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoICsgMSwgMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5leHRNb250aCA9IGZpcnN0RGF5T2ZOZXh0TW9udGguZ2V0TW9udGgoKTtcclxuICAgICAgICAgICAgY29uc3QgbmV4dE1vbnRoWWVhciA9IGZpcnN0RGF5T2ZOZXh0TW9udGguZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBjZWxsSW5kZXggPSAwO1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudERheSA9IDE7XHJcbiAgICAgICAgICAgIGxldCBwcmV2TW9udGhEYXkgPSBwcmV2TW9udGhEYXlzIC0gcHJldk1vbnRoRGF5c1RvU2hvdyArIDE7XHJcbiAgICAgICAgICAgIGxldCBuZXh0TW9udGhEYXkgPSAxO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5bCGIE5vZGVMaXN0IOi9rOaNouS4uuaVsOe7hFxyXG4gICAgICAgICAgICBjb25zdCBkYXlDZWxsQXJyYXkgPSBBcnJheS5mcm9tKGRheUNlbGxzKTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjZWxsIG9mIGRheUNlbGxBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRhdGU6IERhdGU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaXNPdGhlck1vbnRoID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOiuoeeul+W9k+WJjeWNleWFg+agvOeahOaXpeacn1xyXG4gICAgICAgICAgICAgICAgaWYgKGNlbGxJbmRleCA8IHByZXZNb250aERheXNUb1Nob3cpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDkuIrkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICBkYXRlID0gbmV3IERhdGUocHJldk1vbnRoWWVhciwgcHJldk1vbnRoLCBwcmV2TW9udGhEYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHByZXZNb250aERheSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzT3RoZXJNb250aCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnREYXkgPD0gZGF5c0luTW9udGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlvZPliY3mnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICBkYXRlID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgY3VycmVudERheSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudERheSsrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDkuIvkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICBkYXRlID0gbmV3IERhdGUobmV4dE1vbnRoWWVhciwgbmV4dE1vbnRoLCBuZXh0TW9udGhEYXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRNb250aERheSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlzT3RoZXJNb250aCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOWPquWkhOeQhuW9k+WJjeaciOS7veeahOaXpeacn1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc090aGVyTW9udGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmnInml6XorrDlkozku7vliqHvvIzmt7vliqDmjIfnpLrlmahcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmRpY2F0b3JzQ29udGFpbmVyID0gY2VsbC5xdWVyeVNlbGVjdG9yKFwiLmRheS1pbmRpY2F0b3JzXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRpY2F0b3JzQ29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYWRkRGF5SW5kaWNhdG9ycyhpbmRpY2F0b3JzQ29udGFpbmVyIGFzIEhUTUxFbGVtZW50LCBkYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv6YCJ5Lit55qE5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkRGF0ZS5nZXRGdWxsWWVhcigpID09PSBkYXRlLmdldEZ1bGxZZWFyKCkgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUuZ2V0TW9udGgoKSA9PT0gZGF0ZS5nZXRNb250aCgpICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlLmdldERhdGUoKSA9PT0gZGF0ZS5nZXREYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1NlbGVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZWxsLmFkZENsYXNzKFwic2VsZWN0ZWQtZGF5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWPjOWHu+S6i+S7tlxyXG4gICAgICAgICAgICAgICAgICAgIGNlbGwuYWRkRXZlbnRMaXN0ZW5lcihcImRibGNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5ldmVudEhhbmRsZXIuaGFuZGxlRGF5RG91YmxlQ2xpY2soZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5Y2V5Ye75LqL5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRGF5Q2xpY2soZGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNlbGxJbmRleCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8g5bm06KeG5Zu+55qE5a2j5bqm5ZKM5pyI5Lu95Y2V5YWD5qC8XHJcbiAgICAgICAgICAgIC8vIOWto+W6puWuueWZqO+8iOS9v+eUqOS4juaciOS7veWuueWZqOebuOWQjOeahOWkhOeQhuaWueW8j++8iVxyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVyQ29udGFpbmVycyA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbChcIi5xdWFydGVyLWNvbnRhaW5lclwiKTtcclxuICAgICAgICAgICAgcXVhcnRlckNvbnRhaW5lcnMuZm9yRWFjaCgoY29udGFpbmVyLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcXVhcnRlciA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDljZXlh7vkuovku7ZcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpOaJgOacieaciOS7veWSjOWto+W6pueahOmAieS4reeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIubW9udGgtY29udGFpbmVyXCIpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5xdWFydGVyLWNvbnRhaW5lclwiKS5mb3JFYWNoKGVsID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZShcInNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa3u+WKoOW9k+WJjeWto+W6pueahOmAieS4reeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKFwic2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6YCJ5oup57G75Z6L5ZKM5a2j5bqm5YC8XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3Rpb25UeXBlID0gJ3F1YXJ0ZXInO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWREYXRlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkV2Vla1JhbmdlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVhcnRlciA9IHF1YXJ0ZXIgKyAxOyAvLyDlraPluqbku44x5byA5aeLXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6YCJ5oup54q25oCB5bm25Yi35paw5pel5pyf5pi+56S6XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVTZWxlY3Rpb25TdGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOiuoeeul+Wto+W6pueahOW8gOWni+WSjOe7k+adn+aXpeacn1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHllYXIgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVhcnRlclN0YXJ0TW9udGggPSBxdWFydGVyICogMztcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWFydGVyRW5kTW9udGggPSBxdWFydGVyICogMyArIDI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gbmV3IERhdGUoeWVhciwgcXVhcnRlclN0YXJ0TW9udGgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBxdWFydGVyRW5kTW9udGggKyAxLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmmL7npLror6XlraPluqblhoXnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclRhc2tMaXN0QnlEYXRlUmFuZ2Uoc3RhcnREYXRlLCBlbmREYXRlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDlj4zlh7vkuovku7ZcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJEYXRlID0gbmV3IERhdGUodGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpLCBxdWFydGVyICogMywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5ldmVudEhhbmRsZXIuaGFuZGxlUXVhcnRlckRvdWJsZUNsaWNrKHF1YXJ0ZXJEYXRlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDlraPluqbnirbmgIHmjIfnpLrlmahcclxuICAgICAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJJbmRpY2F0b3JzID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXCIubW9udGgtaW5kaWNhdG9yc1wiKTtcclxuICAgICAgICAgICAgICAgIGlmIChxdWFydGVySW5kaWNhdG9ycykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeWto+aKpeWSjOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tRdWFydGVyTm90ZUFuZFRhc2tzKHF1YXJ0ZXIsIHF1YXJ0ZXJJbmRpY2F0b3JzIGFzIEhUTUxFbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmnIjku73lrrnlmajvvIjmjpLpmaTlraPluqblrrnlmajvvIlcclxuICAgICAgICAgICAgY29uc3QgbW9udGhDb250YWluZXJzID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLm1vbnRoLWNvbnRhaW5lcjpub3QoLnF1YXJ0ZXItY29udGFpbmVyKVwiKTtcclxuICAgICAgICAgICAgbW9udGhDb250YWluZXJzLmZvckVhY2goKGNvbnRhaW5lciwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRNb250aEluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOaciOS7veagh+mimFxyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGhIZWFkZXIgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihcIi5tb250aC1oZWFkZXJcIik7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOWNleWHu+S6i+S7tlxyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g56e76Zmk5omA5pyJ5pyI5Lu95ZKM5a2j5bqm55qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5tb250aC1jb250YWluZXJcIikuZm9yRWFjaChlbCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoXCJzZWxlY3RlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnF1YXJ0ZXItY29udGFpbmVyXCIpLmZvckVhY2goZWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKFwic2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5re75Yqg5b2T5YmN5pyI5Lu955qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJzZWxlY3RlZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpgInmi6nnsbvlnotcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGlvblR5cGUgPSAnbW9udGgnO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRXZWVrUmFuZ2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWFydGVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDlvZPliY3ml6XmnJ/liLDpgInkuK3nmoTmnIjku73vvIzlubblsIbpgInkuK3ml6XmnJ/orr7nva7kuLror6XmnIjnmoQx5pelXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRNb250aERhdGUgPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCksIGN1cnJlbnRNb250aEluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnREYXRlID0gc2VsZWN0ZWRNb250aERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUgPSBzZWxlY3RlZE1vbnRoRGF0ZTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDpgInmi6nnirbmgIHlubbliLfmlrDml6XmnJ/mmL7npLpcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVNlbGVjdGlvblN0YXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6K6h566X5pyI5Lu955qE5byA5aeL5ZKM57uT5p2f5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb250aCA9IGN1cnJlbnRNb250aEluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbmREYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggKyAxLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmmL7npLror6XmnIjku73lhoXnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclRhc2tMaXN0QnlEYXRlUmFuZ2Uoc3RhcnREYXRlLCBlbmREYXRlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDlj4zlh7vkuovku7ZcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vbnRoRGF0ZSA9IG5ldyBEYXRlKHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKSwgY3VycmVudE1vbnRoSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZXZlbnRIYW5kbGVyLmhhbmRsZU1vbnRoRG91YmxlQ2xpY2sobW9udGhEYXRlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmnIjku73nirbmgIHmjIfnpLrlmahcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vbnRoSW5kaWNhdG9ycyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKFwiLm1vbnRoLWluZGljYXRvcnNcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAobW9udGhJbmRpY2F0b3JzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5pyI5oql5ZKM5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja01vbnRoTm90ZUFuZFRhc2tzKGN1cnJlbnRNb250aEluZGV4LCBtb250aEluZGljYXRvcnMgYXMgSFRNTEVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZWZyZXNoQWxsKCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ2FsZW5kYXJDb250ZW50KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVJbmRpY2F0b3JzKCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlZnJlc2hDYWxlbmRhcigpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNhbGVuZGFyQ29udGVudCgpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlSW5kaWNhdG9ycygpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBhc3luYyByZWZyZXNoVGFza0xpc3QoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWREYXRlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2tMaXN0Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLnRhc2stbGlzdC1jb250YWluZXJcIikgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmICh0YXNrTGlzdENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAgICAgLy8g5LuO5pWw5o2u566h55CG5Zmo6I635Y+W5Lu75Yqh5bm25bqU55So562b6YCJXHJcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxUYXNrcyA9IGF3YWl0IHRoaXMucGx1Z2luLmNhbGVuZGFyRGF0YU1hbmFnZXIuZ2V0VGFza3MoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbHRlcmVkVGFza3MgPSBmaWx0ZXJUYXNrcyhhbGxUYXNrcywgdGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5L2/55SodGFza0xpc3RSZW5kZXJlcuabtOaWsOS7u+WKoeWIl+ihqFxyXG4gICAgICAgICAgICAgICAgdGhpcy50YXNrTGlzdFJlbmRlcmVyLnJlbmRlclRhc2tMaXN0KHRhc2tMaXN0Q29udGFpbmVyLCBmaWx0ZXJlZFRhc2tzLCBcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyAoaW5kZXgsIGNvbXBsZXRlZCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gZmlsdGVyZWRUYXNrc1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmV2ZW50SGFuZGxlci5oYW5kbGVUYXNrVG9nZ2xlKHRhc2ssIGNvbXBsZXRlZCwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS7u+WKoeeKtuaAgeWPmOabtOWQjuWIt+aWsOaVsOaNrue8k+WtmFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmNhbGVuZGFyRGF0YU1hbmFnZXIucmVmcmVzaFRhc2tzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyAodGFzaykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmV2ZW50SGFuZGxlci5oYW5kbGVUYXNrRG91YmxlQ2xpY2sodGFzayk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUZpbGVDaGFuZ2UoZmlsZTogYW55KSB7XHJcbiAgICAgICAgLy8g5qOA5p+l5paH5Lu25piv5ZCm5piv56yU6K6w5paH5Lu2XHJcbiAgICAgICAgaWYgKCFmaWxlIHx8ICEoJ2V4dGVuc2lvbicgaW4gZmlsZSkgfHwgZmlsZS5leHRlbnNpb24gIT09ICdtZCcpIHJldHVybjtcclxuICAgICAgICBcclxuICAgICAgICAvLyDlvLrliLbliLfmlrDku7vliqHmlbDmja7nvJPlrZhcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5jYWxlbmRhckRhdGFNYW5hZ2VyLnJlZnJlc2hUYXNrcygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOeri+WNs+abtOaWsOS7u+WKoeWIl+ihqOWSjOaMh+ekuuWZqFxyXG4gICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaFRhc2tMaXN0KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVJbmRpY2F0b3JzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvbkRheUNsaWNrKGRhdGU6IERhdGUpIHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRGF0ZSA9IGRhdGU7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50RGF0ZSA9IGRhdGU7IC8vIOS9v+W9k+WJjeaciOWIh+aNouWIsOmAieS4reaXpeacn+eahOaciOS7vVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmHjee9rumAieaLqeexu+Wei+S4uuaXpeacn1xyXG4gICAgICAgIHRoaXMuc2VsZWN0aW9uVHlwZSA9ICdkYXRlJztcclxuICAgICAgICB0aGlzLnNlbGVjdGVkV2Vla1JhbmdlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkUXVhcnRlciA9IG51bGw7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pu05paw5pel5pyf5Y2V5YWD5qC855qE6YCJ5Lit54q25oCBXHJcbiAgICAgICAgdGhpcy51cGRhdGVEYXlTZWxlY3Rpb24oKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrDpgInmi6nnirbmgIHlubbliLfmlrDml6XmnJ/mmL7npLpcclxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZVNlbGVjdGlvblN0YXRlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Y+q5pu05paw5Lu75Yqh5YiX6KGoXHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHVwZGF0ZURheVNlbGVjdGlvbigpIHtcclxuICAgICAgICAvLyDkvb/nlKhpbmRpY2F0b3JSZW5kZXJlcuabtOaWsOaXpeacn+mAieaLqeeKtuaAgVxyXG4gICAgICAgIHRoaXMuaW5kaWNhdG9yUmVuZGVyZXIudXBkYXRlRGF5U2VsZWN0aW9uKHRoaXMuY29udGFpbmVyRWwsIHRoaXMuc2VsZWN0ZWREYXRlKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmm7TmlrBcIuS7ilwi5a2X5oyJ6ZKu55qE5qC35byP77yM5qC55o2u5LuK5aSp5piv5ZCm6KKr6YCJ5LitXHJcbiAgICAgICAgY29uc3QgY3VycmVudFRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgICAgICBjb25zdCBpc1RvZGF5U2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkRGF0ZSAmJiBcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZERhdGUudG9EYXRlU3RyaW5nKCkgPT09IGN1cnJlbnRUb2RheS50b0RhdGVTdHJpbmcoKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCB0b2RheUJ0biA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi5jYWxlbmRhci1oZWFkZXItbGFiZWwtdG9kYXlcIik7XHJcbiAgICAgICAgaWYgKHRvZGF5QnRuKSB7XHJcbiAgICAgICAgICAgIGlmIChpc1RvZGF5U2VsZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHRvZGF5QnRuLmFkZENsYXNzKFwidG9kYXktc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICB0b2RheUJ0bi5yZW1vdmVDbGFzcyhcInRvZGF5LXVuc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0b2RheUJ0bi5hZGRDbGFzcyhcInRvZGF5LXVuc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgICAgICAgICB0b2RheUJ0bi5yZW1vdmVDbGFzcyhcInRvZGF5LXNlbGVjdGVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOeCueWHu+aXpeacn+aXtuWPlua2iOWRqOaVsOeahOmAieS4reeKtuaAgVxyXG4gICAgICAgIHRoaXMudXBkYXRlV2Vla1NlbGVjdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlV2Vla1NlbGVjdGlvbihzZWxlY3RlZFdlZWtDZWxsPzogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAvLyDnp7vpmaTmiYDmnInlkajmlbDljZXlhYPmoLznmoTpgInkuK3nirbmgIFcclxuICAgICAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCIud2Vlay1udW1iZXItY2VsbFwiKS5mb3JFYWNoKChjZWxsOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY2VsbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQtd2VlaycpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWmguaenOaciemAieS4reeahOWRqOaVsOWNleWFg+agvO+8jOa3u+WKoOmAieS4reeKtuaAgVxyXG4gICAgICAgIGlmIChzZWxlY3RlZFdlZWtDZWxsKSB7XHJcbiAgICAgICAgICAgIHNlbGVjdGVkV2Vla0NlbGwuYWRkQ2xhc3MoJ3NlbGVjdGVkLXdlZWsnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB1cGRhdGVTZWxlY3Rpb25TdGF0ZSgpIHtcclxuICAgICAgICAvLyDmm7TmlrDku7vliqHliJfooajlpLTpg6jnmoTml6XmnJ/mmL7npLpcclxuICAgICAgICBjb25zdCBzZWxlY3RlZERhdGVEaXNwbGF5ID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKFwiLnNlbGVjdGVkLWRhdGUtZGlzcGxheVwiKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICBpZiAoc2VsZWN0ZWREYXRlRGlzcGxheSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVNlbGVjdGVkRGF0ZURpc3BsYXkoc2VsZWN0ZWREYXRlRGlzcGxheSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdXBkYXRlU2VsZWN0ZWREYXRlRGlzcGxheShjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgY29udGFpbmVyLmVtcHR5KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnNlbGVjdGlvblR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSAnZGF0ZSc6XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZERhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gdGhpcy5zZWxlY3RlZERhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5ID0gZGF0ZS5nZXREYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2Vla2RheXMgPSBbJ+WRqOaXpScsICflkajkuIAnLCAn5ZGo5LqMJywgJ+WRqOS4iScsICflkajlm5snLCAn5ZGo5LqUJywgJ+WRqOWFrSddO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtkYXkgPSB3ZWVrZGF5c1tkYXRlLmdldERheSgpXTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bpmLTljobkv6Hmga9cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzb2xhciA9IFNvbGFyLmZyb21EYXRlKGRhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGx1bmFyID0gc29sYXIuZ2V0THVuYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsdW5hck1vbnRoID0gbHVuYXJNb250aE5hbWVzW2x1bmFyLmdldE1vbnRoKCldIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheU51bSA9IGx1bmFyLmdldERheSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGx1bmFyRGF5ID0gbHVuYXJEYXlOYW1lc1tkYXlOdW1dIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOe7hOWQiOmYtOWOhuaXpeacn++8iOWMheWQq+aciOS7ve+8iVxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsdW5hclRleHQgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICBpZiAobHVuYXJEYXkgPT09ICfliJ3kuIAnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGx1bmFyVGV4dCA9IGx1bmFyTW9udGg7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbHVuYXJUZXh0ID0gYCR7bHVuYXJNb250aH0ke2x1bmFyRGF5fWA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOa4heepuuWuueWZqFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5lbXB0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOesrOS4gOihjO+8muaXpeWSjOWRqFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpcnN0TGluZSA9IGNvbnRhaW5lci5jcmVhdGVFbCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RMaW5lLmNsYXNzTmFtZSA9ICdzZWxlY3RlZC1kYXRlLWZpcnN0LWxpbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uuaXpeacn+mDqOWIhlxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheVNwYW4gPSBmaXJzdExpbmUuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6IGAke2RheX1gIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGRheVNwYW4uY2xhc3NOYW1lID0gJ2RheS1wYXJ0JztcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rnqbrmoLxcclxuICAgICAgICAgICAgICAgICAgICBmaXJzdExpbmUuY3JlYXRlRWwoJ3NwYW4nLCB7IHRleHQ6ICcgJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rmmJ/mnJ/pg6jliIZcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWVrZGF5U3BhbiA9IGZpcnN0TGluZS5jcmVhdGVFbCgnc3BhbicsIHsgdGV4dDogd2Vla2RheSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB3ZWVrZGF5U3Bhbi5jbGFzc05hbWUgPSAnd2Vla2RheS1wYXJ0JztcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDnrKzkuozooYzvvJrlhpzljoZcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWNvbmRMaW5lID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnKTtcclxuICAgICAgICAgICAgICAgICAgICBzZWNvbmRMaW5lLmNsYXNzTmFtZSA9ICdzZWxlY3RlZC1kYXRlLXNlY29uZC1saW5lJztcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rpmLTljobpg6jliIZcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsdW5hclNwYW4gPSBzZWNvbmRMaW5lLmNyZWF0ZUVsKCdzcGFuJywgeyB0ZXh0OiBsdW5hclRleHQgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbHVuYXJTcGFuLmNsYXNzTmFtZSA9ICdsdW5hci1wYXJ0JztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnRleHRDb250ZW50ID0gJ+acqumAieaLqeaXpeacnyc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnd2Vlayc6XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZWxlY3RlZFdlZWtSYW5nZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdGhpcy5zZWxlY3RlZFdlZWtSYW5nZS5zdGFydDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB5ZWFyID0gc3RhcnQuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWVrSW5mbyA9IGdldFdlZWtJbmZvKHN0YXJ0KTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB3ZWVrTnVtYmVyID0gd2Vla0luZm8ud2Vlay50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnRleHRDb250ZW50ID0gYCR7eWVhcn3lubQke3dlZWtOdW1iZXJ95ZGoYDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnRleHRDb250ZW50ID0gJ+acqumAieaLqeWRqCc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbW9udGgnOlxyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGhZZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGhOdW0gPSB0aGlzLmN1cnJlbnREYXRlLmdldE1vbnRoKCkgKyAxO1xyXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnRleHRDb250ZW50ID0gYCR7bW9udGhZZWFyfeW5tCR7bW9udGhOdW195pyIYDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdxdWFydGVyJzpcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkUXVhcnRlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJZZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci50ZXh0Q29udGVudCA9IGAke3F1YXJ0ZXJZZWFyfeW5tCR7dGhpcy5zZWxlY3RlZFF1YXJ0ZXJ95a2j5bqmYDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnRleHRDb250ZW50ID0gJ+acqumAieaLqeWto+W6pic7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAneWVhcic6XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsWWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci50ZXh0Q29udGVudCA9IGAke2Z1bGxZZWFyfeW5tGA7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci50ZXh0Q29udGVudCA9ICfmnKrpgInmi6knO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVuZGVyVGFza0xpc3RCeURhdGVSYW5nZShzdGFydERhdGU6IERhdGUsIGVuZERhdGU6IERhdGUpIHtcclxuICAgICAgICAvLyDojrflj5bku7vliqHliJfooajlrrnlmahcclxuICAgICAgICBjb25zdCB0YXNrTGlzdENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcihcIi50YXNrLWxpc3QtY29udGFpbmVyXCIpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGlmICghdGFza0xpc3RDb250YWluZXIpIHJldHVybjtcclxuXHJcbiAgICAgICAgLy8g5LuO56yU6K6w5Lit5o+Q5Y+W5Lu75YqhXHJcbiAgICAgICAgY29uc3QgYWxsVGFza3MgPSBhd2FpdCBleHRyYWN0VGFza3ModGhpcy5hcHAsIHRoaXMucGx1Z2luLnNldHRpbmdzKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDov4fmu6Tku7vliqHvvJrmiKrmraLml6XmnJ/lnKggc3RhcnREYXRlIOWSjCBlbmREYXRlIOS5i+mXtO+8jOaIluiAheaXoOaIquatouaXpeacn+S9huWxnuS6juW9k+WJjeWRqOacn+eahOS7u+WKoVxyXG4gICAgICAgIGNvbnN0IGZpbHRlcmVkQnlEYXRlUmFuZ2UgPSBhbGxUYXNrcy5maWx0ZXIodGFzayA9PiB7XHJcbiAgICAgICAgICAgIC8vIOajgOafpTE6IOacieaIquatouaXpeacn+S4lOaIquatouaXpeacn+WcqOiMg+WbtOWGheeahOS7u+WKoVxyXG4gICAgICAgICAgICBpZiAodGFzay5kdWVEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFzay5kdWVEYXRlID49IHN0YXJ0RGF0ZSAmJiB0YXNrLmR1ZURhdGUgPD0gZW5kRGF0ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+lMjog5rKh5pyJ5oiq5q2i5pel5pyf5L2G5bGe5LqO5b2T5YmN5ZGo5pyf55qE5Lu75YqhXHJcbiAgICAgICAgICAgIC8vIDIuMTog5qOA5p+l5Lu75Yqh5piv5ZCm5Zyo5b2T5YmN5pel5pyf6IyD5Zu05YaF55qE5pel56yU6K6w5LitXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gdGFzay5maWxlUGF0aC5zcGxpdCgnLycpLnBvcCgpIHx8ICcnO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRlTWF0Y2ggPSBmaWxlTmFtZS5tYXRjaCgvKFxcZHs0fS1cXGR7Mn0tXFxkezJ9KS8pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGRhdGVNYXRjaCAmJiBkYXRlTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgICAgIC8vIOWmguaenOaWh+S7tuWQjeWMheWQq+aXpeacn++8jOajgOafpeivpeaXpeacn+aYr+WQpuWcqOW9k+WJjeiMg+WbtOWGhVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFza0RhdGUgPSBuZXcgRGF0ZShkYXRlTWF0Y2hbMV0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhc2tEYXRlID49IHN0YXJ0RGF0ZSAmJiB0YXNrRGF0ZSA8PSBlbmREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIDIuMjog5qOA5p+l5Lu75Yqh5piv5ZCm5bGe5LqO5b2T5YmN5ZGo5pyf56yU6K6w5Lit55qE5Lu75YqhXHJcbiAgICAgICAgICAgIC8vIOagueaNruW9k+WJjeinhuWbvuexu+Wei+WSjOmAieaLqeexu+Wei++8jOWIpOaWreS7u+WKoeaYr+WQpuWxnuS6juW9k+WJjeWRqOacn1xyXG4gICAgICAgICAgICBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ3llYXInICYmIHRoaXMuc2VsZWN0aW9uVHlwZSA9PT0gJ3F1YXJ0ZXInKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDlraPluqbop4blm77vvJrmo4Dmn6Xku7vliqHmmK/lkKblnKjlraPmiqXkuK1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkUXVhcnRlciAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucXVhcnRlcmx5Tm90ZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWFydGVybHlGaWxlTmFtZSA9IGZvcm1hdERhdGUoc3RhcnREYXRlLCBxdWFydGVybHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVhcnRlcmx5Tm90ZVBhdGggPSBgJHtxdWFydGVybHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtxdWFydGVybHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoID09PSBxdWFydGVybHlOb3RlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5YW25LuW5Y+v6IO955qE5a2j5oql6Lev5b6EXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zc2libGVRdWFydGVybHlQYXRocyA9IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC80LeWto+aKpS8ke3F1YXJ0ZXJseUZpbGVOYW1lfS5tZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGAwMC3lkajmnJ/nrJTorrAvNC3lraPmiqUvJHtmb3JtYXREYXRlKHN0YXJ0RGF0ZSwgXCJZWVlZLVFRUVwiKX0ubWRgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBgMDAt5ZGo5pyf56yU6K6wLzQt5a2j5oqlLyR7Zm9ybWF0RGF0ZShzdGFydERhdGUsIFwiWVlZWS1RUVwiKX0ubWRgXHJcbiAgICAgICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhdGggb2YgcG9zc2libGVRdWFydGVybHlQYXRocykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5maWxlUGF0aCA9PT0gcGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy52aWV3VHlwZSA9PT0gJ3llYXInICYmIHRoaXMuc2VsZWN0aW9uVHlwZSA9PT0gJ21vbnRoJykge1xyXG4gICAgICAgICAgICAgICAgLy8g5pyI6KeG5Zu+77ya5qOA5p+l5Lu75Yqh5piv5ZCm5Zyo5pyI5oql5LitXHJcbiAgICAgICAgICAgICAgICBjb25zdCBtb250aGx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb250aGx5Tm90ZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vbnRobHlGaWxlTmFtZSA9IGZvcm1hdERhdGUoc3RhcnREYXRlLCBtb250aGx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGhseU5vdGVQYXRoID0gYCR7bW9udGhseVNldHRpbmdzLnNhdmVQYXRofS8ke21vbnRobHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhc2suZmlsZVBhdGggPT09IG1vbnRobHlOb3RlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xlhbbku5blj6/og73nmoTmnIjmiqXot6/lvoRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc3NpYmxlTW9udGhseVBhdGhzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgIGAwMC3lkajmnJ/nrJTorrAvMy3mnIjmiqUvJHttb250aGx5RmlsZU5hbWV9Lm1kYCxcclxuICAgICAgICAgICAgICAgICAgICBgMDAt5ZGo5pyf56yU6K6wLzMt5pyI5oqlLyR7Zm9ybWF0RGF0ZShzdGFydERhdGUsIFwiWVlZWS1NTVwiKX0ubWRgXHJcbiAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIHBvc3NpYmxlTW9udGhseVBhdGhzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suZmlsZVBhdGggPT09IHBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc2VsZWN0aW9uVHlwZSA9PT0gJ3dlZWsnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyDlkajpgInmi6nvvJrmo4Dmn6Xku7vliqHmmK/lkKblnKjlkajmiqXkuK1cclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtseVNldHRpbmdzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2x5Tm90ZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtseUZpbGVOYW1lID0gZm9ybWF0RGF0ZShzdGFydERhdGUsIHdlZWtseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHdlZWtseU5vdGVQYXRoID0gYCR7d2Vla2x5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7d2Vla2x5RmlsZU5hbWV9Lm1kYDtcclxuICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoID09PSB3ZWVrbHlOb3RlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xlhbbku5blj6/og73nmoTlkajmiqXot6/lvoRcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc3NpYmxlV2Vla2x5UGF0aHMgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke3dlZWtseUZpbGVOYW1lfS5tZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke2Zvcm1hdERhdGUoc3RhcnREYXRlLCBcIllZWVktd1dXXCIpfS5tZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke2Zvcm1hdERhdGUoc3RhcnREYXRlLCBcIllZWVktV1dcIil9Lm1kYFxyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBwb3NzaWJsZVdlZWtseVBhdGhzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2suZmlsZVBhdGggPT09IHBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudmlld1R5cGUgPT09ICd5ZWFyJyAmJiB0aGlzLnNlbGVjdGlvblR5cGUgPT09ICd5ZWFyJykge1xyXG4gICAgICAgICAgICAgICAgLy8g5bm06KeG5Zu+77ya5qOA5p+l5Lu75Yqh5piv5ZCm5Zyo5bm05oql5LitXHJcbiAgICAgICAgICAgICAgICBjb25zdCB5ZWFybHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnllYXJseU5vdGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoeWVhcmx5U2V0dGluZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB5ZWFybHlGaWxlTmFtZSA9IGZvcm1hdERhdGUoc3RhcnREYXRlLCB5ZWFybHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeWVhcmx5Tm90ZVBhdGggPSBgJHt5ZWFybHlTZXR0aW5ncy5zYXZlUGF0aH0vJHt5ZWFybHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoID09PSB5ZWFybHlOb3RlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5YW25LuW5Y+v6IO955qE5bm05oql6Lev5b6EXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zc2libGVZZWFybHlQYXRocyA9IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC81LeW5tOaKpS8ke3llYXJseUZpbGVOYW1lfS5tZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGAwMC3lkajmnJ/nrJTorrAvNS3lubTmiqUvJHtmb3JtYXREYXRlKHN0YXJ0RGF0ZSwgXCJZWVlZXCIpfS5tZGBcclxuICAgICAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBwb3NzaWJsZVllYXJseVBhdGhzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoID09PSBwYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyDlupTnlKjmj5Lku7borr7nva7kuK3nmoTnrZvpgInmnaHku7ZcclxuICAgICAgICBjb25zdCBjdXN0b21GaWx0ZXIgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrRmlsdGVyLmN1c3RvbUZpbHRlcjtcclxuICAgICAgICBjb25zdCBleHByZXNzaW9uID0gcGFyc2VDdXN0b21GaWx0ZXIoY3VzdG9tRmlsdGVyKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBmaW5hbEZpbHRlcmVkVGFza3MgPSBleHByZXNzaW9uID8gZmlsdGVyZWRCeURhdGVSYW5nZS5maWx0ZXIodGFzayA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBldmFsdWF0ZUV4cHJlc3Npb24odGFzaywgZXhwcmVzc2lvbik7XHJcbiAgICAgICAgfSkgOiBmaWx0ZXJlZEJ5RGF0ZVJhbmdlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOS9v+eUqHRhc2tMaXN0UmVuZGVyZXLmm7TmlrDku7vliqHliJfooahcclxuICAgICAgICB0aGlzLnRhc2tMaXN0UmVuZGVyZXIucmVuZGVyVGFza0xpc3QodGFza0xpc3RDb250YWluZXIsIGZpbmFsRmlsdGVyZWRUYXNrcywgXHJcbiAgICAgICAgICAgIGFzeW5jIChpbmRleCwgY29tcGxldGVkKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gZmluYWxGaWx0ZXJlZFRhc2tzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGlmICh0YXNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5ldmVudEhhbmRsZXIuaGFuZGxlVGFza1RvZ2dsZSh0YXNrLCBjb21wbGV0ZWQsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYXN5bmMgKHRhc2spID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZXZlbnRIYW5kbGVyLmhhbmRsZVRhc2tEb3VibGVDbGljayh0YXNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja1dlZWtOb3RlQW5kVGFza3Mod2Vla1N0YXJ0RGF0ZTogRGF0ZSwgd2Vla051bWJlcjogbnVtYmVyLCBpbmRpY2F0b3JzOiBIVE1MRWxlbWVudCkge1xyXG4gICAgICAgIC8vIOiuoeeul+WRqOe7k+adn+aXpeacn1xyXG4gICAgICAgIGNvbnN0IHdlZWtFbmREYXRlID0gbmV3IERhdGUod2Vla1N0YXJ0RGF0ZSk7XHJcbiAgICAgICAgd2Vla0VuZERhdGUuc2V0RGF0ZSh3ZWVrRW5kRGF0ZS5nZXREYXRlKCkgKyA2KTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgaGFzV2Vla2x5Tm90ZSA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBoYXNXZWVrbHlUYXNrID0gZmFsc2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W5ZGo5oql6K6+572uXHJcbiAgICAgICAgY29uc3Qgd2Vla2x5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrbHlOb3RlO1xyXG4gICAgICAgIGNvbnN0IHdlZWtseUZpbGVOYW1lID0gZm9ybWF0RGF0ZSh3ZWVrU3RhcnREYXRlLCB3ZWVrbHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5aSa56eN5Y+v6IO955qE5ZGo5oql6Lev5b6EXHJcbiAgICAgICAgY29uc3QgcG9zc2libGVQYXRocyA9IFtcclxuICAgICAgICAgICAgYCR7d2Vla2x5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7d2Vla2x5RmlsZU5hbWV9Lm1kYCxcclxuICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke3dlZWtseUZpbGVOYW1lfS5tZGAsXHJcbiAgICAgICAgICAgIGAwMC3lkajmnJ/nrJTorrAvMi3lkajmiqUvJHtmb3JtYXREYXRlKHdlZWtTdGFydERhdGUsIFwiWVlZWS13V1dcIil9Lm1kYCxcclxuICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8yLeWRqOaKpS8ke2Zvcm1hdERhdGUod2Vla1N0YXJ0RGF0ZSwgXCJZWVlZLVdXXCIpfS5tZGBcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOWRqOaKpVxyXG4gICAgICAgIGxldCB3ZWVrbHlGaWxlUGF0aCA9ICcnO1xyXG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XHJcbiAgICAgICAgICAgIGlmIChhd2FpdCBub3RlRXhpc3RzKHRoaXMuYXBwLCBwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgaGFzV2Vla2x5Tm90ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB3ZWVrbHlGaWxlUGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDmo4Dmn6XlkajmiqXkuK3mmK/lkKbmnInku7vliqFcclxuICAgICAgICBpZiAoaGFzV2Vla2x5Tm90ZSAmJiB3ZWVrbHlGaWxlUGF0aCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh3ZWVrbHlGaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5ZGo5oql5Lit5piv5ZCm5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza1JlZ2V4ID0gL15cXHMqKFstXFwqXFxkXStcXC4/KVxccypcXFsoLilcXF1cXHMqKC4rKSQvZ207XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSB0YXNrUmVnZXguZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gbWF0Y2hbMl0gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tUZXh0ID0gbWF0Y2hbM10gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKbmmK/mnKrlrozmiJDnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy50b0xvd2VyQ2FzZSgpICE9PSAneCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeS7u+WKoeaWh+acrOS4reaYr+WQpuWMheWQq+aIquatouaXpeacn1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZVJlZ2V4ID0gLyg/OltAI118ZHVlOlxccz988J+ThVxccz8pKFxcZHs0fS1cXGR7Mn0tXFxkezJ9KS87XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNEdWVEYXRlID0gZHVlRGF0ZVJlZ2V4LnRlc3QodGFza1RleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzmsqHmnInmiKrmraLml6XmnJ/vvIzmiJbogIXmiKrmraLml6XmnJ/lnKjmnKzlkajvvIzpg73nrpfkvZzmnKzlkajnmoTku7vliqFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzRHVlRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1dlZWtseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnInmiKrmraLml6XmnJ/vvIzmo4Dmn6XmmK/lkKblnKjmnKzlkahcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlTWF0Y2ggPSB0YXNrVGV4dC5tYXRjaChkdWVEYXRlUmVnZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkdWVEYXRlTWF0Y2ggJiYgZHVlRGF0ZU1hdGNoWzFdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZShkdWVEYXRlTWF0Y2hbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVlRGF0ZSA+PSB3ZWVrU3RhcnREYXRlICYmIGR1ZURhdGUgPD0gd2Vla0VuZERhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1dlZWtseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gcmVhZCB3ZWVrbHkgbm90ZTogJHt3ZWVrbHlGaWxlUGF0aH1gLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5pys5ZGo5YaF5piv5ZCm5pyJ5oiq5q2i5Lu75Yqh77yI5YW25LuW5paH5Lu277yJXHJcbiAgICAgICAgaWYgKCFoYXNXZWVrbHlUYXNrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgZXh0cmFjdFRhc2tzKHRoaXMuYXBwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgdGFzayBvZiBhbGxUYXNrcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRhc2suZHVlRGF0ZSAmJiB0YXNrLmR1ZURhdGUgPj0gd2Vla1N0YXJ0RGF0ZSAmJiB0YXNrLmR1ZURhdGUgPD0gd2Vla0VuZERhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBoYXNXZWVrbHlUYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDmuIXnqbrnjrDmnInmjIfnpLrlmahcclxuICAgICAgICBpbmRpY2F0b3JzLmVtcHR5KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5re75Yqg5a6e5b+D5bCP5ZyG54K56KGo56S65ZGo5oqlXHJcbiAgICAgICAgaWYgKGhhc1dlZWtseU5vdGUpIHtcclxuICAgICAgICAgICAgaW5kaWNhdG9ycy5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcImluZGljYXRvci1kb3Qgc29saWQtZG90XCJ9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5re75Yqg56m65b+D5bCP5ZyG54K56KGo56S65Lu75YqhXHJcbiAgICAgICAgaWYgKGhhc1dlZWtseVRhc2spIHtcclxuICAgICAgICAgICAgaW5kaWNhdG9ycy5jcmVhdGVFbChcImRpdlwiLCB7Y2xzOiBcImluZGljYXRvci1kb3QgaG9sbG93LWRvdFwifSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2hlY2tRdWFydGVyTm90ZUFuZFRhc2tzKHF1YXJ0ZXI6IG51bWJlciwgaW5kaWNhdG9yczogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAvLyDorqHnrpflraPluqbnmoTlvIDlp4vlkoznu5PmnZ/ml6XmnJ9cclxuICAgICAgICBjb25zdCB5ZWFyID0gdGhpcy5jdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgICAgIGNvbnN0IHF1YXJ0ZXJTdGFydE1vbnRoID0gcXVhcnRlciAqIDM7XHJcbiAgICAgICAgY29uc3QgcXVhcnRlckVuZE1vbnRoID0gcXVhcnRlciAqIDMgKyAyO1xyXG4gICAgICAgIGNvbnN0IHF1YXJ0ZXJTdGFydERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBxdWFydGVyU3RhcnRNb250aCwgMSk7XHJcbiAgICAgICAgY29uc3QgcXVhcnRlckVuZERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBxdWFydGVyRW5kTW9udGggKyAxLCAwKTtcclxuICAgICAgICBxdWFydGVyRW5kRGF0ZS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBoYXNRdWFydGVybHlOb3RlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGhhc1F1YXJ0ZXJseVRhc2sgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5blraPluqborr7nva5cclxuICAgICAgICBjb25zdCBxdWFydGVybHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1YXJ0ZXJseU5vdGU7XHJcbiAgICAgICAgY29uc3QgcXVhcnRlcmx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKHF1YXJ0ZXJTdGFydERhdGUsIHF1YXJ0ZXJseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmo4Dmn6XlpJrnp43lj6/og73nmoTlraPluqbmiqXlkYrot6/lvoRcclxuICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xyXG4gICAgICAgICAgICBgJHtxdWFydGVybHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtxdWFydGVybHlGaWxlTmFtZX0ubWRgLFxyXG4gICAgICAgICAgICBgMDAt5ZGo5pyf56yU6K6wLzQt5a2j5oqlLyR7cXVhcnRlcmx5RmlsZU5hbWV9Lm1kYCxcclxuICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC80LeWto+aKpS8ke2Zvcm1hdERhdGUocXVhcnRlclN0YXJ0RGF0ZSwgXCJZWVlZLVFRUVwiKX0ubWRgLFxyXG4gICAgICAgICAgICBgMDAt5ZGo5pyf56yU6K6wLzQt5a2j5oqlLyR7Zm9ybWF0RGF0ZShxdWFydGVyU3RhcnREYXRlLCBcIllZWVktUVFcIil9Lm1kYFxyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5a2Y5Zyo5a2j5bqm5oql5ZGKXHJcbiAgICAgICAgZm9yIChjb25zdCBwYXRoIG9mIHBvc3NpYmxlUGF0aHMpIHtcclxuICAgICAgICAgICAgaWYgKGF3YWl0IG5vdGVFeGlzdHModGhpcy5hcHAsIHBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBoYXNRdWFydGVybHlOb3RlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeacrOWto+W6puWGheaYr+WQpuacieaIquatouS7u+WKoVxyXG4gICAgICAgIGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgZXh0cmFjdFRhc2tzKHRoaXMuYXBwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcbiAgICAgICAgICAgIGlmICh0YXNrLmR1ZURhdGUgJiYgdGFzay5kdWVEYXRlID49IHF1YXJ0ZXJTdGFydERhdGUgJiYgdGFzay5kdWVEYXRlIDw9IHF1YXJ0ZXJFbmREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBoYXNRdWFydGVybHlUYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa4heepuueOsOacieaMh+ekuuWZqFxyXG4gICAgICAgIGluZGljYXRvcnMuZW1wdHkoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmt7vliqDlrp7lv4PlsI/lnIbngrnooajnpLrlraPluqbmiqXlkYpcclxuICAgICAgICBpZiAoaGFzUXVhcnRlcmx5Tm90ZSkge1xyXG4gICAgICAgICAgICBpbmRpY2F0b3JzLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcImluZGljYXRvci1kb3Qgc29saWQtZG90XCIgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOepuuW/g+Wwj+WchueCueihqOekuuS7u+WKoVxyXG4gICAgICAgIGlmIChoYXNRdWFydGVybHlUYXNrKSB7XHJcbiAgICAgICAgICAgIGluZGljYXRvcnMuY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwiaW5kaWNhdG9yLWRvdCBob2xsb3ctZG90XCIgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2hlY2tNb250aE5vdGVBbmRUYXNrcyhtb250aEluZGV4OiBudW1iZXIsIGluZGljYXRvcnM6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgLy8g6K6h566X5pyI5Lu955qE5byA5aeL5ZKM57uT5p2f5pel5pyfXHJcbiAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICBjb25zdCBtb250aFN0YXJ0RGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoSW5kZXgsIDEpO1xyXG4gICAgICAgIGNvbnN0IG1vbnRoRW5kRGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoSW5kZXggKyAxLCAwKTtcclxuICAgICAgICBtb250aEVuZERhdGUuc2V0SG91cnMoMjMsIDU5LCA1OSwgOTk5KTtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgaGFzTW9udGhseU5vdGUgPSBmYWxzZTtcclxuICAgICAgICBsZXQgaGFzTW9udGhseVRhc2sgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5bmnIjku73orr7nva5cclxuICAgICAgICBjb25zdCBtb250aGx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tb250aGx5Tm90ZTtcclxuICAgICAgICBjb25zdCBtb250aGx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKG1vbnRoU3RhcnREYXRlLCBtb250aGx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeWkmuenjeWPr+iDveeahOaciOaKpei3r+W+hFxyXG4gICAgICAgIGNvbnN0IHBvc3NpYmxlUGF0aHMgPSBbXHJcbiAgICAgICAgICAgIGAke21vbnRobHlTZXR0aW5ncy5zYXZlUGF0aH0vJHttb250aGx5RmlsZU5hbWV9Lm1kYCxcclxuICAgICAgICAgICAgYDAwLeWRqOacn+eslOiusC8zLeaciOaKpS8ke21vbnRobHlGaWxlTmFtZX0ubWRgLFxyXG4gICAgICAgICAgICBgMDAt5ZGo5pyf56yU6K6wLzMt5pyI5oqlLyR7Zm9ybWF0RGF0ZShtb250aFN0YXJ0RGF0ZSwgXCJZWVlZLU1NXCIpfS5tZGBcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeaYr+WQpuWtmOWcqOaciOaKpVxyXG4gICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XHJcbiAgICAgICAgICAgIGlmIChhd2FpdCBub3RlRXhpc3RzKHRoaXMuYXBwLCBwYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgaGFzTW9udGhseU5vdGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5pys5pyI5YaF5piv5ZCm5pyJ5oiq5q2i5Lu75YqhXHJcbiAgICAgICAgY29uc3QgYWxsVGFza3MgPSBhd2FpdCBleHRyYWN0VGFza3ModGhpcy5hcHAsIHRoaXMucGx1Z2luLnNldHRpbmdzKTtcclxuICAgICAgICBmb3IgKGNvbnN0IHRhc2sgb2YgYWxsVGFza3MpIHtcclxuICAgICAgICAgICAgaWYgKHRhc2suZHVlRGF0ZSAmJiB0YXNrLmR1ZURhdGUgPj0gbW9udGhTdGFydERhdGUgJiYgdGFzay5kdWVEYXRlIDw9IG1vbnRoRW5kRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgaGFzTW9udGhseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riF56m6546w5pyJ5oyH56S65ZmoXHJcbiAgICAgICAgaW5kaWNhdG9ycy5lbXB0eSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOWunuW/g+Wwj+WchueCueihqOekuuaciOaKpVxyXG4gICAgICAgIGlmIChoYXNNb250aGx5Tm90ZSkge1xyXG4gICAgICAgICAgICBpbmRpY2F0b3JzLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcImluZGljYXRvci1kb3Qgc29saWQtZG90XCIgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa3u+WKoOepuuW/g+Wwj+WchueCueihqOekuuS7u+WKoVxyXG4gICAgICAgIGlmIChoYXNNb250aGx5VGFzaykge1xyXG4gICAgICAgICAgICBpbmRpY2F0b3JzLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcImluZGljYXRvci1kb3QgaG9sbG93LWRvdFwiIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGFkZERheUluZGljYXRvcnMoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgZGF0ZTogRGF0ZSkge1xyXG4gICAgICAgIC8vIOajgOafpeaYr+WQpuacieaXpeiusOWSjOS7u+WKoe+8jOa3u+WKoOaMh+ekuuWZqFxyXG4gICAgICAgIGNvbnN0IGRhaWx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGU7XHJcbiAgICAgICAgY29uc3QgZGFpbHlGaWxlTmFtZSA9IGZvcm1hdERhdGUoZGF0ZSwgZGFpbHlTZXR0aW5ncy5maWxlTmFtZUZvcm1hdCk7XHJcbiAgICAgICAgY29uc3QgZGFpbHlOb3RlUGF0aCA9IGAke2RhaWx5U2V0dGluZ3Muc2F2ZVBhdGh9LyR7ZGFpbHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCBoYXNOb3RlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGhhc1Rhc2sgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoYXdhaXQgbm90ZUV4aXN0cyh0aGlzLmFwcCwgZGFpbHlOb3RlUGF0aCkpIHtcclxuICAgICAgICAgICAgaGFzTm90ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmo4Dmn6XlvZPlpKnml6XorrDkuK3msqHmnInmiKrmraLml6XmnJ/nmoTku7vliqFcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRhaWx5RmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChkYWlseU5vdGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChkYWlseUZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGRhaWx5RmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5L2/55SoIHRhc2tSZWdleCDljLnphY3miYDmnInku7vliqFcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrUmVnZXggPSAvXlxccyooWy1cXCpcXGRdK1xcLj8pXFxzKlxcWyguKVxcXVxccyooLispJC9nbTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2g7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChtYXRjaCA9IHRhc2tSZWdleC5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBtYXRjaFsyXSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza1RleHQgPSBtYXRjaFszXSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+acquWujOaIkOeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnRvTG93ZXJDYXNlKCkgIT09ICd4Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5Lu75Yqh5paH5pys5Lit5piv5ZCm5YyF5ZCr5oiq5q2i5pel5pyfXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlUmVnZXggPSAvKD86W0AjXXxkdWU6XFxzP3zwn5OFXFxzPykoXFxkezR9LVxcZHsyfS1cXGR7Mn0pLztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc0R1ZURhdGUgPSBkdWVEYXRlUmVnZXgudGVzdCh0YXNrVGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeacieaIquatouaXpeacn++8jOaIluiAheaIquatouaXpeacn+aYr+W9k+Wkqe+8jOmDveeul+S9nOW9k+WkqeeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNEdWVEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieaIquatouaXpeacn++8jOajgOafpeaYr+WQpuaYr+W9k+WkqVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGVNYXRjaCA9IHRhc2tUZXh0Lm1hdGNoKGR1ZURhdGVSZWdleCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGVNYXRjaCAmJiBkdWVEYXRlTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKGR1ZURhdGVNYXRjaFsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rlvZPlpKnnmoTlvIDlp4vlkoznu5PmnZ/ml7bpl7RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5U3RhcnQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIDAsIDAsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXlFbmQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIDIzLCA1OSwgNTksIDk5OSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVlRGF0ZSA+PSBkYXlTdGFydCAmJiBkdWVEYXRlIDw9IGRheUVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjaGVjayBkYWlseSBub3RlIHRhc2tzOicsIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDmo4Dmn6XmiYDmnInmlofku7bkuK3miKrmraLml6XmnJ/lnKjlvZPlpKnnmoTku7vliqHvvIjlhbbku5bmlofku7bkuK3nmoTku7vliqHvvIlcclxuICAgICAgICBpZiAoIWhhc1Rhc2spIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgZXh0cmFjdFRhc2tzKHRoaXMuYXBwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOetm+mAieaIquatouaXpeacn+WcqOW9k+WkqeeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgLy8g5Yib5bu65b2T5aSp55qE5byA5aeL5ZKM57uT5p2f5pe26Ze077yI5pys5Zyw5pe26Ze077yJXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlTdGFydCA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCBkYXRlLmdldERhdGUoKSwgMCwgMCwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXlFbmQgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCksIDIzLCA1OSwgNTksIDk5OSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGFzayBvZiBhbGxUYXNrcykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWPquajgOafpeWFtuS7luaWh+S7tuS4reeahOS7u+WKoe+8jOmBv+WFjemHjeWkjeajgOafpVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmZpbGVQYXRoICE9PSBkYWlseU5vdGVQYXRoICYmIHRhc2suZHVlRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rku7vliqHmiKrmraLml6XmnJ/nmoTmnKzlnLDml7bpl7TniYjmnKzvvIjljrvpmaTml7bljLrlvbHlk43vvIlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza0R1ZURhdGUgPSBuZXcgRGF0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldE1vbnRoKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmR1ZURhdGUuZ2V0RGF0ZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldEhvdXJzKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXNrLmR1ZURhdGUuZ2V0TWludXRlcygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5kdWVEYXRlLmdldFNlY29uZHMoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suZHVlRGF0ZS5nZXRNaWxsaXNlY29uZHMoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhc2tEdWVEYXRlID49IGRheVN0YXJ0ICYmIHRhc2tEdWVEYXRlIDw9IGRheUVuZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjaGVjayB0YXNrcyBmb3IgZGF5IGluZGljYXRvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riF56m6546w5pyJ5oyH56S65ZmoXHJcbiAgICAgICAgY29udGFpbmVyLmVtcHR5KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Yib5bu65LiA6KGM5oyH56S65ZmoXHJcbiAgICAgICAgY29uc3QgaW5kaWNhdG9yUm93ID0gY29udGFpbmVyLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLXJvdyd9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmmL7npLrml6XorrDmjIfnpLrlmajvvIjlrp7lv4PlsI/lnIbngrnvvIlcclxuICAgICAgICBpZiAoaGFzTm90ZSkge1xyXG4gICAgICAgICAgICBpbmRpY2F0b3JSb3cuY3JlYXRlRWwoJ2RpdicsIHtjbHM6ICdpbmRpY2F0b3ItZG90IHNvbGlkLWRvdCd9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pi+56S65Lu75Yqh5oyH56S65Zmo77yI56m65b+D5bCP5ZyG54K577yJXHJcbiAgICAgICAgaWYgKGhhc1Rhc2spIHtcclxuICAgICAgICAgICAgaW5kaWNhdG9yUm93LmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBob2xsb3ctZG90J30pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZUluZGljYXRvcnMoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMudmlld1R5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgLy8g5L2/55SoaW5kaWNhdG9yUmVuZGVyZXLmm7TmlrDmjIfnpLrlmahcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0RGF0ZSA9IHRoaXMuc2VsZWN0ZWREYXRlIHx8IHRoaXMuY3VycmVudERhdGU7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuaW5kaWNhdG9yUmVuZGVyZXIudXBkYXRlQWxsRGF5SW5kaWNhdG9ycyh0aGlzLmNvbnRhaW5lckVsLCB0YXJnZXREYXRlKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbmRpY2F0b3JSZW5kZXJlci51cGRhdGVXZWVrSW5kaWNhdG9ycyh0aGlzLmNvbnRhaW5lckVsLCB0YXJnZXREYXRlKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMudmlld1R5cGUgPT09ICd5ZWFyJykge1xyXG4gICAgICAgICAgICAvLyDlubTop4blm77vvJrmm7TmlrDmnIjku73mjIfnpLrlmahcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVZZWFyVmlld01vbnRoSW5kaWNhdG9ycygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyDnp7vpmaTkuI3lv4XopoHnmoRyZWZyZXNoVGFza0xpc3TosIPnlKjvvIzpgb/lhY3ph43lpI3mj5Dlj5bku7vliqFcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVllYXJWaWV3TW9udGhJbmRpY2F0b3JzKCkge1xyXG4gICAgICAgIC8vIOiOt+WPluW5tOinhuWbvuWuueWZqFxyXG4gICAgICAgIGNvbnN0IHllYXJWaWV3Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcueWVhci12aWV3LWNvbnRhaW5lcicpO1xyXG4gICAgICAgIGlmICgheWVhclZpZXdDb250YWluZXIpIHJldHVybjtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5bmiYDmnInlraPluqblrrnlmahcclxuICAgICAgICBjb25zdCBxdWFydGVyQ29udGFpbmVycyA9IEFycmF5LmZyb20oeWVhclZpZXdDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLnF1YXJ0ZXItY29udGFpbmVyJykpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmBjeWOhuaJgOacieWto+W6puWuueWZqFxyXG4gICAgICAgIGZvciAoY29uc3QgcXVhcnRlckNvbnRhaW5lciBvZiBxdWFydGVyQ29udGFpbmVycykge1xyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVySGVhZGVyID0gcXVhcnRlckNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcubW9udGgtaGVhZGVyJyk7XHJcbiAgICAgICAgICAgIGlmICghcXVhcnRlckhlYWRlcikgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDop6PmnpDlraPluqbmoIfpopjvvIzojrflj5blraPluqbntKLlvJVcclxuICAgICAgICAgICAgY29uc3QgcXVhcnRlclRleHQgPSBxdWFydGVySGVhZGVyLnRleHRDb250ZW50IHx8ICcnO1xyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVyTWF0Y2ggPSBxdWFydGVyVGV4dC5tYXRjaCgvKFxcZCsp5a2j5bqmLyk7XHJcbiAgICAgICAgICAgIGlmICghcXVhcnRlck1hdGNoIHx8ICFxdWFydGVyTWF0Y2hbMV0pIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgcXVhcnRlckluZGV4ID0gcGFyc2VJbnQocXVhcnRlck1hdGNoWzFdKSAtIDE7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihxdWFydGVySW5kZXgpIHx8IHF1YXJ0ZXJJbmRleCA8IDAgfHwgcXVhcnRlckluZGV4ID4gMykgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmo4Dmn6Xor6XlraPluqbmmK/lkKbmnInlraPmiqXlkozku7vliqFcclxuICAgICAgICAgICAgY29uc3QgeWVhciA9IHRoaXMuY3VycmVudERhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgICAgICAgICAgY29uc3QgcXVhcnRlckRhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBxdWFydGVySW5kZXggKiAzLCAxKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOaPkOWJjeWjsOaYjuWto+W6puW8gOWni+WSjOe7k+adn+aXpeacn1xyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVyU3RhcnREYXRlID0gbmV3IERhdGUoeWVhciwgcXVhcnRlckluZGV4ICogMywgMSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJFbmREYXRlID0gbmV3IERhdGUoeWVhciwgcXVhcnRlckluZGV4ICogMyArIDMsIDApO1xyXG4gICAgICAgICAgICBxdWFydGVyRW5kRGF0ZS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGhhc1F1YXJ0ZXJseU5vdGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgbGV0IGhhc1F1YXJ0ZXJseVRhc2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeWto+aKpVxyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVybHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnF1YXJ0ZXJseU5vdGU7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1YXJ0ZXJseUZpbGVOYW1lID0gZm9ybWF0RGF0ZShxdWFydGVyRGF0ZSwgcXVhcnRlcmx5U2V0dGluZ3MuZmlsZU5hbWVGb3JtYXQpO1xyXG4gICAgICAgICAgICBjb25zdCBxdWFydGVybHlOb3RlUGF0aCA9IGAke3F1YXJ0ZXJseVNldHRpbmdzLnNhdmVQYXRofS8ke3F1YXJ0ZXJseUZpbGVOYW1lfS5tZGA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoYXdhaXQgbm90ZUV4aXN0cyh0aGlzLmFwcCwgcXVhcnRlcmx5Tm90ZVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICBoYXNRdWFydGVybHlOb3RlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5pyJ5a2j5oql77yM5qOA5p+l5piv5ZCm5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocXVhcnRlcmx5Tm90ZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XlraPmiqXkuK3mmK/lkKbmnInku7vliqFcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza1JlZ2V4ID0gL15cXHMqKFstXFwqXFxkXStcXC4/KVxccypcXFsoWyB4WF0pXFxdXFxzKiguKykkL2dtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2g7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSB0YXNrUmVnZXguZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IG1hdGNoWzJdIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFza1RleHQgPSBtYXRjaFszXSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5pyq5a6M5oiQ55qE5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLnRvTG93ZXJDYXNlKCkgIT09ICd4Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeS7u+WKoeaWh+acrOS4reaYr+WQpuWMheWQq+aIquatouaXpeacn1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGVSZWdleCA9IC8oPzpbQCNdfGR1ZTpcXHM/fPCfk4VcXHM/KShcXGR7NH0tXFxkezJ9LVxcZHsyfSkvO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc0R1ZURhdGUgPSBkdWVEYXRlUmVnZXgudGVzdCh0YXNrVGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5rKh5pyJ5oiq5q2i5pel5pyf77yM5oiW6ICF5oiq5q2i5pel5pyf5Zyo5pys5a2j5bqm77yM6YO9566X5L2c5pys5a2j5bqm55qE5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNEdWVEYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1F1YXJ0ZXJseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnInmiKrmraLml6XmnJ/vvIzmo4Dmn6XmmK/lkKblnKjmnKzlraPluqZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZU1hdGNoID0gdGFza1RleHQubWF0Y2goZHVlRGF0ZVJlZ2V4KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGVNYXRjaCAmJiBkdWVEYXRlTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZShkdWVEYXRlTWF0Y2hbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGR1ZURhdGUgPj0gcXVhcnRlclN0YXJ0RGF0ZSAmJiBkdWVEYXRlIDw9IHF1YXJ0ZXJFbmREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUXVhcnRlcmx5VGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byByZWFkIHF1YXJ0ZXJseSBub3RlOiAke3F1YXJ0ZXJseU5vdGVQYXRofWAsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l6K+l5a2j5bqm5YaF5piv5ZCm5pyJ5oiq5q2i5Lu75YqhXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgdGhpcy5wbHVnaW4uY2FsZW5kYXJEYXRhTWFuYWdlci5nZXRUYXNrcygpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFzay5kdWVEYXRlICYmIHRhc2suZHVlRGF0ZSA+PSBxdWFydGVyU3RhcnREYXRlICYmIHRhc2suZHVlRGF0ZSA8PSBxdWFydGVyRW5kRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGhhc1F1YXJ0ZXJseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmm7TmlrDlraPluqbmjIfnpLrlmahcclxuICAgICAgICAgICAgY29uc3QgcXVhcnRlckluZGljYXRvcnMgPSBxdWFydGVyQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5tb250aC1pbmRpY2F0b3JzJyk7XHJcbiAgICAgICAgICAgIGlmIChxdWFydGVySW5kaWNhdG9ycykge1xyXG4gICAgICAgICAgICAgICAgcXVhcnRlckluZGljYXRvcnMuZW1wdHkoKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5re75Yqg5a6e5b+D5bCP5ZyG54K56KGo56S65a2j5oqlXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzUXVhcnRlcmx5Tm90ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHF1YXJ0ZXJJbmRpY2F0b3JzLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBzb2xpZC1kb3QnfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOa3u+WKoOepuuW/g+Wwj+WchueCueihqOekuuS7u+WKoVxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc1F1YXJ0ZXJseVRhc2spIHtcclxuICAgICAgICAgICAgICAgICAgICBxdWFydGVySW5kaWNhdG9ycy5jcmVhdGVFbCgnZGl2Jywge2NsczogJ2luZGljYXRvci1kb3QgaG9sbG93LWRvdCd9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5bmiYDmnInmnIjku73lrrnlmajvvIjmjpLpmaTlraPluqblrrnlmajvvIlcclxuICAgICAgICBjb25zdCBtb250aENvbnRhaW5lcnMgPSBBcnJheS5mcm9tKHllYXJWaWV3Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5tb250aC1jb250YWluZXI6bm90KC5xdWFydGVyLWNvbnRhaW5lciknKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6YGN5Y6G5omA5pyJ5pyI5Lu95a655ZmoXHJcbiAgICAgICAgZm9yIChjb25zdCBtb250aENvbnRhaW5lciBvZiBtb250aENvbnRhaW5lcnMpIHtcclxuICAgICAgICAgICAgY29uc3QgbW9udGhIZWFkZXIgPSBtb250aENvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcubW9udGgtaGVhZGVyJyk7XHJcbiAgICAgICAgICAgIGlmICghbW9udGhIZWFkZXIpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6Kej5p6Q5pyI5Lu95qCH6aKY77yM6I635Y+W5pyI5Lu957Si5byVXHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoVGV4dCA9IG1vbnRoSGVhZGVyLnRleHRDb250ZW50IHx8ICcnO1xyXG4gICAgICAgICAgICBjb25zdCBtb250aE1hdGNoID0gbW9udGhUZXh0Lm1hdGNoKC8oXFxkKynmnIgvKTtcclxuICAgICAgICAgICAgaWYgKCFtb250aE1hdGNoIHx8ICFtb250aE1hdGNoWzFdKSBjb250aW51ZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoSW5kZXggPSBwYXJzZUludChtb250aE1hdGNoWzFdKSAtIDE7XHJcbiAgICAgICAgICAgIGlmIChpc05hTihtb250aEluZGV4KSB8fCBtb250aEluZGV4IDwgMCB8fCBtb250aEluZGV4ID4gMTEpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l6K+l5pyI5Lu95piv5ZCm5pyJ5pyI5oql5ZKM5Lu75YqhXHJcbiAgICAgICAgICAgIGNvbnN0IHllYXIgPSB0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRoRGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGhhc01vbnRobHlOb3RlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGxldCBoYXNNb250aGx5VGFzayA9IGZhbHNlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qOA5p+l5pyI5oqlXHJcbiAgICAgICAgICAgIGNvbnN0IG1vbnRobHlTZXR0aW5ncyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm1vbnRobHlOb3RlO1xyXG4gICAgICAgICAgICBjb25zdCBtb250aGx5RmlsZU5hbWUgPSBmb3JtYXREYXRlKG1vbnRoRGF0ZSwgbW9udGhseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcclxuICAgICAgICAgICAgY29uc3QgbW9udGhseU5vdGVQYXRoID0gYCR7bW9udGhseVNldHRpbmdzLnNhdmVQYXRofS8ke21vbnRobHlGaWxlTmFtZX0ubWRgO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGF3YWl0IG5vdGVFeGlzdHModGhpcy5hcHAsIG1vbnRobHlOb3RlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIGhhc01vbnRobHlOb3RlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobW9udGhseU5vdGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5pyJ5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tSZWdleCA9IC9eXFxzKihbLVxcKlxcZF0rXFwuPylcXHMqXFxbKFsgeFhdKVxcXVxccyooLispJC9nbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gdGFza1JlZ2V4LmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBtYXRjaFsyXSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tUZXh0ID0gbWF0Y2hbM10gfHwgJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+acquWujOaIkOeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cy50b0xvd2VyQ2FzZSgpICE9PSAneCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xku7vliqHmlofmnKzkuK3mmK/lkKbljIXlkKvmiKrmraLml6XmnJ9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlUmVnZXggPSAvKD86W0AjXXxkdWU6XFxzP3zwn5OFXFxzPykoXFxkezR9LVxcZHsyfS1cXGR7Mn0pLztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNEdWVEYXRlID0gZHVlRGF0ZVJlZ2V4LnRlc3QodGFza1RleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeacieaIquatouaXpeacn++8jOaIluiAheaIquatouaXpeacn+WcqOW9k+aciO+8jOmDveeul+S9nOW9k+aciOeahOS7u+WKoVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzRHVlRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNNb250aGx5VGFzayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacieaIquatouaXpeacn++8jOajgOafpeaYr+WQpuWcqOW9k+aciFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlTWF0Y2ggPSB0YXNrVGV4dC5tYXRjaChkdWVEYXRlUmVnZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVlRGF0ZU1hdGNoICYmIGR1ZURhdGVNYXRjaFsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKGR1ZURhdGVNYXRjaFsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVlRGF0ZS5nZXRGdWxsWWVhcigpID09PSB5ZWFyICYmIGR1ZURhdGUuZ2V0TW9udGgoKSA9PT0gbW9udGhJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vbnRobHlUYXNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHJlYWQgbW9udGhseSBub3RlOiAke21vbnRobHlOb3RlUGF0aH1gLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeivpeaciOS7veWGheaYr+WQpuacieaIquatouS7u+WKoVxyXG4gICAgICAgICAgICBjb25zdCBhbGxUYXNrcyA9IGF3YWl0IGV4dHJhY3RUYXNrcyh0aGlzLmFwcCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICBjb25zdCBtb250aFN0YXJ0RGF0ZSA9IG5ldyBEYXRlKHllYXIsIG1vbnRoSW5kZXgsIDEpO1xyXG4gICAgICAgICAgICBjb25zdCBtb250aEVuZERhdGUgPSBuZXcgRGF0ZSh5ZWFyLCBtb250aEluZGV4ICsgMSwgMCk7XHJcbiAgICAgICAgICAgIG1vbnRoRW5kRGF0ZS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIGFsbFRhc2tzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGFzay5kdWVEYXRlICYmIHRhc2suZHVlRGF0ZSA+PSBtb250aFN0YXJ0RGF0ZSAmJiB0YXNrLmR1ZURhdGUgPD0gbW9udGhFbmREYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGFzTW9udGhseVRhc2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmm7TmlrDmnIjku73mjIfnpLrlmahcclxuICAgICAgICAgICAgY29uc3QgbW9udGhJbmRpY2F0b3JzID0gbW9udGhDb250YWluZXIucXVlcnlTZWxlY3RvcignLm1vbnRoLWluZGljYXRvcnMnKTtcclxuICAgICAgICAgICAgaWYgKG1vbnRoSW5kaWNhdG9ycykge1xyXG4gICAgICAgICAgICAgICAgbW9udGhJbmRpY2F0b3JzLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOa3u+WKoOWunuW/g+Wwj+WchueCueihqOekuuaciOaKpVxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc01vbnRobHlOb3RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhJbmRpY2F0b3JzLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBzb2xpZC1kb3QnfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOa3u+WKoOepuuW/g+Wwj+WchueCueihqOekuuS7u+WKoVxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc01vbnRobHlUYXNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhJbmRpY2F0b3JzLmNyZWF0ZUVsKCdkaXYnLCB7Y2xzOiAnaW5kaWNhdG9yLWRvdCBob2xsb3ctZG90J30pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog6K6h566X5bm26LCD5pW05Lu75Yqh5YiX6KGo6auY5bqm77yM5L2/5YW25Y2g5o2u5Ymp5L2Z56m66Ze0XHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYWRqdXN0VGFza0xpc3RIZWlnaHQoKSB7XHJcbiAgICAgICAgLy8g6I635Y+W5pW05Liq6KeG5Zu+5a655ZmoXHJcbiAgICAgICAgY29uc3Qgdmlld0NvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV0gYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKCF2aWV3Q29udGFpbmVyKSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6I635Y+W6KeG5Zu+5a655Zmo55qE5oC76auY5bqmXHJcbiAgICAgICAgY29uc3Qgdmlld0hlaWdodCA9IHZpZXdDb250YWluZXIub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiuoeeul+S7u+WKoeWIl+ihqOS4iuaWueaJgOacieWFg+e0oOeahOmrmOW6plxyXG4gICAgICAgIGxldCB0b3RhbEhlaWdodEFib3ZlVGFza0xpc3QgPSAwO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaXpeWOhuWktOmDqFxyXG4gICAgICAgIGNvbnN0IGNhbGVuZGFySGVhZGVyID0gdmlld0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcuY2FsZW5kYXItaGVhZGVyJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKGNhbGVuZGFySGVhZGVyKSB7XHJcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0QWJvdmVUYXNrTGlzdCArPSBjYWxlbmRhckhlYWRlci5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaXpeWOhuihqOagvO+8iOaciOinhuWbvu+8iVxyXG4gICAgICAgIGNvbnN0IGNhbGVuZGFyVGFibGUgPSB2aWV3Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5jYWxlbmRhci10YWJsZScpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGlmIChjYWxlbmRhclRhYmxlKSB7XHJcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0QWJvdmVUYXNrTGlzdCArPSBjYWxlbmRhclRhYmxlLm9mZnNldEhlaWdodDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5bm06KeG5Zu+5a655ZmoXHJcbiAgICAgICAgY29uc3QgeWVhclZpZXdDb250YWluZXIgPSB2aWV3Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy55ZWFyLXZpZXctY29udGFpbmVyJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgaWYgKHllYXJWaWV3Q29udGFpbmVyKSB7XHJcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0QWJvdmVUYXNrTGlzdCArPSB5ZWFyVmlld0NvbnRhaW5lci5vZmZzZXRIZWlnaHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOS7u+WKoeWIl+ihqOWuueWZqO+8iOWMheaLrOWFtui+uei3neWSjOWGhei+uei3ne+8iVxyXG4gICAgICAgIGNvbnN0IHRhc2tMaXN0Q29udGFpbmVyID0gdmlld0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcudGFzay1saXN0LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgIGlmICh0YXNrTGlzdENvbnRhaW5lcikge1xyXG4gICAgICAgICAgICAvLyDojrflj5bku7vliqHliJfooajlrrnlmajnmoTorqHnrpfmoLflvI9cclxuICAgICAgICAgICAgY29uc3QgdGFza0xpc3RDb250YWluZXJTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRhc2tMaXN0Q29udGFpbmVyKTtcclxuICAgICAgICAgICAgLy8g5re75Yqg5Lu75Yqh5YiX6KGo5a655Zmo55qE5aSW6L656LedXHJcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0QWJvdmVUYXNrTGlzdCArPSBwYXJzZUZsb2F0KHRhc2tMaXN0Q29udGFpbmVyU3R5bGUubWFyZ2luVG9wKSB8fCAwO1xyXG4gICAgICAgICAgICB0b3RhbEhlaWdodEFib3ZlVGFza0xpc3QgKz0gcGFyc2VGbG9hdCh0YXNrTGlzdENvbnRhaW5lclN0eWxlLm1hcmdpbkJvdHRvbSkgfHwgMDtcclxuICAgICAgICAgICAgLy8g5re75Yqg5Lu75Yqh5YiX6KGo5a655Zmo55qE5YaF6L656LedXHJcbiAgICAgICAgICAgIHRvdGFsSGVpZ2h0QWJvdmVUYXNrTGlzdCArPSBwYXJzZUZsb2F0KHRhc2tMaXN0Q29udGFpbmVyU3R5bGUucGFkZGluZ1RvcCkgfHwgMDtcclxuICAgICAgICAgICAgdG90YWxIZWlnaHRBYm92ZVRhc2tMaXN0ICs9IHBhcnNlRmxvYXQodGFza0xpc3RDb250YWluZXJTdHlsZS5wYWRkaW5nQm90dG9tKSB8fCAwO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5Lu75Yqh5YiX6KGo5aS06YOoXHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2tMaXN0SGVhZGVyID0gdGFza0xpc3RDb250YWluZXIucXVlcnlTZWxlY3RvcignLnRhc2stbGlzdC1oZWFkZXInKSBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKHRhc2tMaXN0SGVhZGVyKSB7XHJcbiAgICAgICAgICAgICAgICB0b3RhbEhlaWdodEFib3ZlVGFza0xpc3QgKz0gdGFza0xpc3RIZWFkZXIub2Zmc2V0SGVpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiuoeeul+WJqeS9meepuumXtOmrmOW6pu+8jOWHj+WOu+eKtuaAgeagj+mrmOW6pu+8jOmYsuatouS7u+WKoeiiq+mBruaMoVxyXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZ0hlaWdodCA9IE1hdGgubWF4KDAsIHZpZXdIZWlnaHQgLSB0b3RhbEhlaWdodEFib3ZlVGFza0xpc3QgLSA2MCk7IC8vIOWHj+WOuzYwcHjkvZzkuLrnirbmgIHmoI/nqbrpl7TvvIzlop7liqDnqbrpl7Tku6Xpgb/lhY3pga7mjKFcclxuICAgICAgICBcclxuICAgICAgICAvLyDorr7nva7ku7vliqHliJfooajnmoTpq5jluqZcclxuICAgICAgICBpZiAodGFza0xpc3RDb250YWluZXIpIHtcclxuICAgICAgICAgICAgY29uc3QgdGFza0xpc3QgPSB0YXNrTGlzdENvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCcudGFzay1saXN0JykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmICh0YXNrTGlzdCkge1xyXG4gICAgICAgICAgICAgICAgdGFza0xpc3Quc3R5bGUuaGVpZ2h0ID0gYCR7cmVtYWluaW5nSGVpZ2h0fXB4YDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWIh+aNouaXpeWOhuinhuWbvueahOWxleW8gOWSjOaUtue8qeeKtuaAgVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHRvZ2dsZUNhbGVuZGFyVmlldygpIHtcclxuICAgICAgICAvLyDmnIjop4blm77nmoTmlLbnvKkv5bGV5byA6YC76L6RXHJcbiAgICAgICAgaWYgKHRoaXMudmlld1R5cGUgPT09ICdtb250aCcpIHtcclxuICAgICAgICAgICAgY29uc3QgY2FsZW5kYXJUYWJsZSA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignLmNhbGVuZGFyLXRhYmxlJykgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIGlmIChjYWxlbmRhclRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0Ym9keSA9IGNhbGVuZGFyVGFibGUucXVlcnlTZWxlY3RvcigndGJvZHknKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJvd3MgPSB0Ym9keSA/IEFycmF5LmZyb20odGJvZHkucXVlcnlTZWxlY3RvckFsbCgndHInKSkgOiBbXTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHJvd3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuW3sue7j+aYr+aUtue8qeeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29sbGFwc2VkID0gcm93cy5zb21lKHJvdyA9PiByb3cuc3R5bGUuZGlzcGxheSA9PT0gJ25vbmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bGV5byA6KeG5Zu+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LnN0eWxlLmRpc3BsYXkgPSAnJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pS257yp6KeG5Zu+77yM5Y+q5L+d55WZ6YCJ5Lit5pel5pyf5omA5Zyo55qE6KGMXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzZWxlY3RlZFJvd0luZGV4ID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K6h566X6YCJ5Lit5pel5pyf5omA5Zyo55qE6KGM57Si5byVXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXJzdERheU9mTW9udGggPSBuZXcgRGF0ZSh0aGlzLmN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCksIHRoaXMuY3VycmVudERhdGUuZ2V0TW9udGgoKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGFydERheU9mV2VlayA9IGZpcnN0RGF5T2ZNb250aC5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXZNb250aERheXNUb1Nob3cgPSBzdGFydERheU9mV2VlayA9PT0gMCA/IDYgOiBzdGFydERheU9mV2VlayAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkRGF5ID0gdGhpcy5zZWxlY3RlZERhdGUuZ2V0RGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRSb3dJbmRleCA9IE1hdGguZmxvb3IoKHByZXZNb250aERheXNUb1Nob3cgKyBzZWxlY3RlZERheSAtIDEpIC8gNyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmakOiXj+aJgOacieihjFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaYvuekuumAieS4reaXpeacn+aJgOWcqOeahOihjO+8iOWmguaenOaciemAieS4reaXpeacn++8iVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZFJvdyA9IHJvd3Nbc2VsZWN0ZWRSb3dJbmRleF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZFJvd0luZGV4ID49IDAgJiYgc2VsZWN0ZWRSb3dJbmRleCA8IHJvd3MubGVuZ3RoICYmIHNlbGVjdGVkUm93KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZFJvdy5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocm93cy5sZW5ndGggPiAwICYmIHJvd3NbMF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeaciemAieS4reaXpeacn++8jOaYvuekuuesrOS4gOihjFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93c1swXS5zdHlsZS5kaXNwbGF5ID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMudmlld1R5cGUgPT09ICd5ZWFyJykge1xyXG4gICAgICAgICAgICAvLyDlubTop4blm77nmoTmlLbnvKkv5bGV5byA6YC76L6RXHJcbiAgICAgICAgICAgIGNvbnN0IHllYXJWaWV3Q29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcueWVhci12aWV3LWNvbnRhaW5lcicpIGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoeWVhclZpZXdDb250YWluZXIpIHtcclxuICAgICAgICAgICAgICAgIGlmICh5ZWFyVmlld0NvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDlsZXlvIDop4blm75cclxuICAgICAgICAgICAgICAgICAgICB5ZWFyVmlld0NvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQgPSBcIjMwZW1cIjtcclxuICAgICAgICAgICAgICAgICAgICB5ZWFyVmlld0NvbnRhaW5lci5zdHlsZS5vdmVyZmxvdyA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHllYXJWaWV3Q29udGFpbmVyLnN0eWxlLm1heEhlaWdodCA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHllYXJWaWV3Q29udGFpbmVyLnN0eWxlLm92ZXJmbG93ID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICB9LCAzMDApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyDmlLbnvKnop4blm75cclxuICAgICAgICAgICAgICAgICAgICB5ZWFyVmlld0NvbnRhaW5lci5zdHlsZS5tYXhIZWlnaHQgPSBcIjhlbVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHllYXJWaWV3Q29udGFpbmVyLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDlvLrliLbph43mlrDorqHnrpfluIPlsYDlubbosIPmlbTku7vliqHliJfooajpq5jluqZcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5hZGp1c3RUYXNrTGlzdEhlaWdodCgpO1xyXG4gICAgICAgIH0sIDEwMCk7XHJcbiAgICB9XHJcbn1cclxuIl19