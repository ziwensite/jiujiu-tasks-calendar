import { ItemView, WorkspaceLeaf, Notice, MarkdownView, App, TFile } from 'obsidian';
import { MyPlugin } from '../main';
import { MyPluginSettings } from '../settings';
import { getLunarDate, getHolidayInfo, getHolidayStatus, getWeekNumber, getWeekInfo, getQuarter, formatDate, lunarMonthNames, lunarDayNames, calculateCalendarMonthData } from '../utils/dateUtils';
import { Solar } from 'lunar-typescript';
import { noteExists } from '../services/noteService';
import { extractTasks, filterTasks, updateTaskInNote, Task, parseCustomFilter, evaluateExpression } from '../services/taskService';
import { CalendarRenderer, TaskListRenderer, IndicatorRenderer, EventHandler } from './calendar';
import { CommandSelectModal } from '../modals/CommandSelectModal';
import { updateDaySelection, updateIndicators, updateYearViewMonthIndicators, updateAllDayIndicators, updateWeekIndicators, checkWeekNoteAndTasks, checkQuarterNoteAndTasks, checkMonthNoteAndTasks, addDayIndicators } from './CalendarView/indicators';
import { installNavigationListeners, installCellListeners } from './CalendarView/eventListeners';

const VIEW_TYPE_CALENDAR = "jiujiu-calendar-view";

export class CalendarView extends ItemView {
    currentDate: Date;
    plugin: MyPlugin;

    selectedDate: Date | null = null;
    viewType: 'month' | 'year' | 'tasks' = 'month';
    selectionType: 'date' | 'month' | 'quarter' | 'year' | 'tasks' | 'week' = 'date';
    selectedWeekRange: { start: Date; end: Date } | null = null;
    selectedQuarter: number | null = null;
    taskSortDirection: 'desc' | 'asc' = 'desc';

    // 模块化组件
    calendarRenderer: CalendarRenderer;
    taskListRenderer: TaskListRenderer;
    eventHandler: EventHandler;

    private lastRenderedYear: number = -1;
    private lastRenderedMonth: number = -1;
    private lastRenderedViewType: 'month' | 'year' | 'tasks' = 'month';
    private lastRenderedRows: number = -1;
    private lastRenderedNavigationType: 'month' | 'year' = 'month';
    navigationType: 'month' | 'year' = 'month';
    private indicatorRenderer: IndicatorRenderer;
    private timeListenerId: number | null = null;
    private lastCheckedDate: Date | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentDate = new Date();
        this.selectedDate = new Date();
        
        // 初始化模块化组件
        this.calendarRenderer = new CalendarRenderer(plugin);
        this.taskListRenderer = new TaskListRenderer(plugin);
        this.indicatorRenderer = new IndicatorRenderer(plugin);
        this.eventHandler = new EventHandler(plugin);
    }

    getViewType(): string {
        return VIEW_TYPE_CALENDAR;
    }

    getDisplayText(): string {
        return this.plugin.manifest.name;
    }

    getIcon(): string {
        return "calendar";
    }

    async onOpen() {
        await this.renderCalendar();
        
        // 视图打开时自动显示当天的任务列表
        const taskListContainer = this.containerEl.querySelector(".task-list-container") as HTMLElement;
        if (taskListContainer && this.selectedDate) {
            await this.refreshTaskList();
        }
        
        // 调整任务列表高度，确保滚动条在需要时显示
        setTimeout(() => {
            this.adjustTaskListHeight();
        }, 100);
        
        // 添加文件系统事件监听，实现实时更新
        this.registerEvent(this.app.vault.on('create', async (file) => {
            await this.handleFileChange(file);
        }));

        this.registerEvent(this.app.vault.on('delete', async (file) => {
            await this.handleFileChange(file);
        }));

        this.registerEvent(this.app.vault.on('modify', async (file) => {
            await this.handleFileChange(file);
        }));

        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
            await this.handleFileChange(file);
        }));
        
        // 初始化时间监听器，每秒检查一次日期变化
        this.timeListenerId = window.setInterval(async () => {
            await this.checkDateChange();
        }, 1000);
    }
    
    /**
     * 检查日期是否变化，实现自然跨天自动更新
     */
    private async checkDateChange() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 检查日期是否发生变化
        if (this.lastCheckedDate) {
            const lastCheckedDateOnly = new Date(this.lastCheckedDate.getFullYear(), this.lastCheckedDate.getMonth(), this.lastCheckedDate.getDate());
            
            // 如果日期没有变化，直接返回，避免不必要的更新
            if (today.getTime() === lastCheckedDateOnly.getTime()) {
                return;
            }
        }
        
        // 更新上次检查的日期
        this.lastCheckedDate = today;
        
        // 比较当前日期和选中日期是否在同一天
        if (this.selectedDate) {
            // 当日期发生变化时，不需要改变用户的选择
            // 只需要更新日历视图，让今日标签指向新的今天
        } else {
            // 如果没有选中日期，将当前日期设置为今天
            this.currentDate = today;
        }
        
        // 重新渲染日历，确保今日标签的日期和状态正确更新
        // renderCalendar 方法会：
        // 1. 更新所有日期单元格的内容，包括添加/移除 today 类
        // 2. 更新今日标签的选中状态
        // 3. 更新任务列表
        await this.renderCalendar();
    }

    async onClose() {
        // 清理资源
        if (this.timeListenerId !== null) {
            window.clearInterval(this.timeListenerId);
            this.timeListenerId = null;
        }
    }

    public async renderCalendar() {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;

        // 使用 selectedDate 优先计算日历数据，确保从年视图切换回月视图时使用正确的日期
        const targetDate = this.selectedDate || this.currentDate;
        const { currentYear, currentMonth, currentRows } = this.plugin.calendarDataManager.getCalendarMonthData(targetDate);

        // 检查是否需要完全重建日历结构
        const needsFullRebuild = 
            this.lastRenderedYear !== currentYear || 
            this.lastRenderedMonth !== currentMonth ||
            this.lastRenderedViewType !== this.viewType ||
            this.lastRenderedNavigationType !== this.navigationType ||
            this.lastRenderedRows !== currentRows;

        if (needsFullRebuild) {
            container.empty();
            await this.buildCalendarStructure(container);
            this.lastRenderedYear = currentYear;
            this.lastRenderedMonth = currentMonth;
            this.lastRenderedViewType = this.viewType;
            this.lastRenderedNavigationType = this.navigationType;
            this.lastRenderedRows = currentRows;
        } else {
            // 行数没有变化，只更新日历内容，不整体刷新
            await this.updateCalendarContent();
        }

        // 1. 首先更新日期选择状态，确保任务列表能显示正确的日期内容
        this.updateDaySelection();
        
        // 2. 优先更新任务列表，让用户尽快看到关键内容
        if (this.selectedDate) {
            if ((this.viewType === 'month' || this.viewType === 'year') && this.selectionType === 'month') {
                // 月视图或年视图且选择类型为月份：显示整个月份的任务
                const year = this.selectedDate.getFullYear();
                const month = this.selectedDate.getMonth();
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0);
                await this.renderTaskListByDateRange(startDate, endDate);
            } else {
                // 其他情况：显示选中日期的任务
                await this.refreshTaskList();
            }
        }
        
        // 3. 调整任务列表高度，确保滚动条在需要时显示
        this.adjustTaskListHeight();
        
        // 4. 最后更新非关键的指示器，这些操作不影响用户核心体验
        if (this.viewType === 'month') {
            // 使用异步方式更新所有指示器，不阻塞主线程
            setTimeout(async () => {
                const targetDate = this.selectedDate || this.currentDate;
                await this.indicatorRenderer.updateAllDayIndicators(this.containerEl, targetDate);
                this.indicatorRenderer.updateWeekIndicators(this.containerEl, targetDate);
            }, 0);
        }
    }

    /**
     * 当月历行数没有变化时，只更新日历内容，不整体重建DOM
     */
    private async updateCalendarContent() {
        if (this.viewType === 'month') {
            // 更新日历头部显示
            this.updateCalendarHeader();
            
            // 更新所有日期单元格的完整内容
            await this.updateMonthCalendarContent();
        } else {
            // 年视图也需要更新日历头部
            this.updateCalendarHeader();
            
            // 更新年视图的月份和指示器
            await this.updateYearViewMonthIndicators();
        }
    }

    private async updateMonthCalendarContent() {
        // 更新日历表格内容
        const tbody = this.containerEl.querySelector('.calendar-table tbody');
        if (!tbody) return;
        
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
                    
                    let date: Date;
                    let isOtherMonth = false;
                    
                    if (prevMonthDay <= prevMonthDays) {
                        // 上个月的日期
                        date = new Date(prevMonthYear, prevMonth, prevMonthDay);
                        prevMonthDay++;
                        isOtherMonth = true;
                    } else if (currentDay <= daysInMonth) {
                        // 当前月的日期
                        date = new Date(currentYear, currentMonth, currentDay);
                        currentDay++;
                    } else {
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
        await this.updateIndicators();
    }

    /**
     * 更新日历头部显示
     */
    private updateCalendarHeader() {
        // 日历头部更新已由calendarRenderer处理
        // 此方法保留以确保兼容性
    }

    private async buildCalendarStructure(container: HTMLElement) {
        // 使用 calendarRenderer 构建日历结构（不包含输入框，输入框将在任务列表容器的下方创建）
        await this.calendarRenderer.buildCalendarStructure(container, this.currentDate, this.selectedDate || this.currentDate, this.viewType, this.navigationType);
        
        
        
        // 添加导航按钮事件监听器
        this.addNavigationEventListeners();
        
        // 添加日期和周数单元格事件监听器
        await this.addCalendarCellEventListeners();
        
        // 任务列表区域
        const taskListContainer = container.createEl("div", {cls: "task-list-container"});
        
        // 任务列表标题
        const taskListHeader = taskListContainer.createEl("div", {cls: "task-list-header"});
        
        // 左侧：选中日期显示
        const selectedDateDisplay = taskListHeader.createEl("div", {cls: "selected-date-display"});
        this.updateSelectedDateDisplay(selectedDateDisplay);
        
        // 右侧：操作按钮组
        const actionButtons = taskListHeader.createEl("div", {cls: "task-list-action-buttons"});
        
        // 添加闪念按钮
        const flashButton = actionButtons.createEl("button", {
            text: " 💡 ",
            cls: "task-action-button flash-button",
            title: "新建闪念"
        });
        flashButton.addEventListener("click", async () => {
            // 获取闪念配置
            const flashConfigId = this.plugin.settings.taskSettings.captureToSettings.fleetingNoteConfigId;
            const flashConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(
                config => config.id === flashConfigId
            );
            if (flashConfig) {
                await this.plugin.executeCaptureToConfig(flashConfig);
            }
        });
        
        // 添加记录按钮
        const recordButton = actionButtons.createEl("button", {
            text: " 📝 ",
            cls: "task-action-button record-button",
            title: "新建记录"
        });
        recordButton.addEventListener("click", async () => {
            // 获取记录配置
            const recordConfigId = this.plugin.settings.taskSettings.captureToSettings.recordConfigId;
            const recordConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(
                config => config.id === recordConfigId
            );
            if (recordConfig) {
                await this.plugin.executeCaptureToConfig(recordConfig);
            }
        });
        
        // 添加任务按钮
        const taskButton = actionButtons.createEl("button", {
            text: " ⏰ ",
            cls: "task-action-button task-button",
            title: "新建任务"
        });
        taskButton.addEventListener("click", async () => {
            // 获取任务配置
            const taskConfigId = this.plugin.settings.taskSettings.captureToSettings.taskConfigId;
            const taskConfig = this.plugin.settings.taskSettings.captureToSettings.configs.find(
                config => config.id === taskConfigId
            );
            if (taskConfig) {
                await this.plugin.executeCaptureToConfig(taskConfig);
            }
        });
        
        // 排序箭头 - 放到任务按钮的后面
        const sortArrow = actionButtons.createEl("div", {
            cls: `task-sort-arrow ${this.taskSortDirection}`,
            title: "点击切换排序方向"
        });
        sortArrow.textContent = this.taskSortDirection === 'desc' ? '↑' : '↓';
        sortArrow.style.cursor = 'pointer';
        sortArrow.style.margin = '0 0.5em';
        sortArrow.style.fontSize = '1.0em';
        sortArrow.style.color = 'var(--text-muted)';
        sortArrow.style.display = 'inline-flex';
        sortArrow.style.alignItems = 'center';
        
        // 添加点击事件，切换排序方向
        sortArrow.addEventListener("click", async () => {
            // 切换排序方向
            this.taskSortDirection = this.taskSortDirection === 'desc' ? 'asc' : 'desc';
            // 更新箭头显示
            sortArrow.textContent = this.taskSortDirection === 'desc' ? '↑' : '↓';
            sortArrow.className = `task-sort-arrow ${this.taskSortDirection}`;
            // 重新渲染任务列表
            if (this.selectionType === 'date') {
                await this.refreshTaskList();
            } else if (this.selectedWeekRange) {
                await this.renderTaskListByDateRange(this.selectedWeekRange.start, this.selectedWeekRange.end);
            } else if (this.selectionType === 'month' || this.selectionType === 'quarter' || this.selectionType === 'year') {
                const year = this.currentDate.getFullYear();
                let startDate: Date;
                let endDate: Date;
                
                if (this.selectionType === 'month') {
                    const month = this.currentDate.getMonth();
                    startDate = new Date(year, month, 1);
                    endDate = new Date(year, month + 1, 0);
                } else if (this.selectionType === 'quarter') {
                    const quarter = this.selectedQuarter || 1;
                    const startMonth = (quarter - 1) * 3;
                    startDate = new Date(year, startMonth, 1);
                    endDate = new Date(year, startMonth + 3, 0);
                } else {
                    startDate = new Date(year, 0, 1);
                    endDate = new Date(year, 11, 31);
                }
                
                await this.renderTaskListByDateRange(startDate, endDate);
            }
        });
        
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
                    const calendarTable = this.containerEl.querySelector(".calendar-table") as HTMLElement;
                    const yearViewContainer = this.containerEl.querySelector(".year-view-container") as HTMLElement;
                    
                    let isCollapsed = false;
                    
                    if (calendarTable) {
                        if (this.viewType === 'month') {
                            const tbody = calendarTable.querySelector('tbody');
                            const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];
                            isCollapsed = rows.some(row => row.style.display === 'none');
                        } else {
                            isCollapsed = !!calendarTable.style.maxHeight;
                        }
                    } else if (yearViewContainer) {
                        isCollapsed = !!yearViewContainer.style.maxHeight;
                    }
                    
                    // 如果当前是收缩状态，则展开
                    if (isCollapsed) {
                        this.toggleCalendarView();
                    }
                }
            }
        });
        
        const taskList = taskListContainer.createEl("div", {cls: "task-list"});
    }

    /**
     * 添加导航按钮事件监听器
     */
    private addNavigationEventListeners() {
        installNavigationListeners(this);
    }

    /**
     * 添加日期和周数单元格事件监听器
     */
    private async addCalendarCellEventListeners() {
        await installCellListeners(this);
    }

    public async refreshTaskList() {
        if (this.selectedDate) {
            const taskListContainer = this.containerEl.querySelector(".task-list-container") as HTMLElement;
            if (taskListContainer) {
                // 从数据管理器获取任务并应用筛选
                const allTasks = await this.plugin.calendarDataManager.getTasks();
                const filteredTasks = filterTasks(allTasks, this.plugin.settings, this.selectedDate);
                
                // 按截止日期排序任务
                const sortedTasks = [...filteredTasks].sort((a, b) => {
                    // 无截止日期的任务排在最后
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    
                    // 按截止日期排序
                    const diff = a.dueDate.getTime() - b.dueDate.getTime();
                    // 根据排序方向调整
                    return this.taskSortDirection === 'desc' ? -diff : diff;
                });
                
                // 使用taskListRenderer更新任务列表
                this.taskListRenderer.renderTaskList(taskListContainer, sortedTasks, 
                    async (index, updatedTask) => {
                        if (updatedTask) {
                            await this.eventHandler.handleTaskToggle(updatedTask, updatedTask.completed, async () => {
                                // 任务状态变更后刷新数据缓存
                                await this.plugin.calendarDataManager.refreshTasks();
                                await this.refreshTaskList();
                            });
                        }
                    },
                    async (task) => {
                        await this.eventHandler.handleTaskDoubleClick(task);
                    }
                );
            }
        }
    }

    private async handleFileChange(file: any) {
        // 检查文件是否是笔记文件
        if (!file || !('extension' in file) || file.extension !== 'md') return;
        
        // 强制刷新任务数据缓存
        await this.plugin.calendarDataManager.refreshTasks();
        
        // 根据当前选择类型更新任务列表
        if (this.selectionType === 'date') {
            await this.refreshTaskList();
        } else if (this.selectionType === 'week' && this.selectedWeekRange) {
            await this.renderTaskListByDateRange(this.selectedWeekRange.start, this.selectedWeekRange.end);
        } else if (this.selectionType === 'month') {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            await this.renderTaskListByDateRange(startDate, endDate);
        } else if (this.selectionType === 'quarter' && this.selectedQuarter !== null) {
            const year = this.currentDate.getFullYear();
            const quarterStartMonth = (this.selectedQuarter - 1) * 3;
            const quarterEndMonth = quarterStartMonth + 2;
            const startDate = new Date(year, quarterStartMonth, 1);
            const endDate = new Date(year, quarterEndMonth + 1, 0);
            await this.renderTaskListByDateRange(startDate, endDate);
        } else if (this.selectionType === 'year') {
            const year = this.currentDate.getFullYear();
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            await this.renderTaskListByDateRange(startDate, endDate);
        }
        
        // 更新指示器
        await this.updateIndicators();
    }

    async onDayClick(date: Date) {
        this.selectedDate = date;
        this.currentDate = date; // 使当前月切换到选中日期的月份

        // 重置选择类型为日期
        this.selectionType = 'date';
        this.selectedWeekRange = null;
        this.selectedQuarter = null;

        // 重新渲染日历视图，确保切换到选中日期的月份
        await this.renderCalendar();

        // 更新选择状态并刷新日期显示
        await this.updateSelectionState();

        // 只更新任务列表
        await this.refreshTaskList();
    }

    updateDaySelection() {
        updateDaySelection(this);
    }

    public updateWeekSelectionIfNeeded() {
        this.updateWeekSelection();
    }

    updateWeekSelection(selectedWeekCell?: HTMLElement) {
        // 移除所有周数单元格的选中状态
        this.containerEl.querySelectorAll(".week-number-cell").forEach((cell: any) => {
            cell.removeClass('selected-week');
        });
        
        // 如果有选中的周数单元格，添加选中状态
        if (selectedWeekCell) {
            selectedWeekCell.addClass('selected-week');
        }
    }

    updateSelectionState() {
        // 更新任务列表头部的日期显示
        const selectedDateDisplay = this.containerEl.querySelector(".selected-date-display") as HTMLElement;
        if (selectedDateDisplay) {
            this.updateSelectedDateDisplay(selectedDateDisplay);
        }
        
        // 更新今日标签的选中状态
        const currentToday = new Date();
        const isTodaySelected = this.selectedDate && 
            this.selectedDate.toDateString() === currentToday.toDateString();
        
        const todayBtn = this.containerEl.querySelector(".calendar-header-label-today");
        if (todayBtn) {
            if (isTodaySelected) {
                todayBtn.addClass("today-selected");
                todayBtn.removeClass("today-unselected");
            } else {
                todayBtn.addClass("today-unselected");
                todayBtn.removeClass("today-selected");
            }
        }
    }

    private updateSelectedDateDisplay(container: HTMLElement) {
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
                    } else {
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
                } else {
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
                } else {
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
                } else {
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

    async renderTaskListByDateRange(startDate: Date, endDate: Date) {
        // 获取任务列表容器
        const taskListContainer = this.containerEl.querySelector(".task-list-container") as HTMLElement;
        if (!taskListContainer) return;

        // 从数据管理器获取任务（带缓存）
        const allTasks = await this.plugin.calendarDataManager.getTasks();
        
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
                if (this.selectedQuarter !== null) {
                    const quarterlySettings = this.plugin.settings.quarterlyNote;
                    const quarterlyFileName = formatDate(startDate, quarterlySettings.fileNameFormat);
                    const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
                    if (task.filePath === quarterlyNotePath) {
                        return true;
                    }
                }
            } else if (this.viewType === 'year' && this.selectionType === 'month') {
                // 月视图：检查任务是否在月报中
                const monthlySettings = this.plugin.settings.monthlyNote;
                const monthlyFileName = formatDate(startDate, monthlySettings.fileNameFormat);
                const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
                if (task.filePath === monthlyNotePath) {
                    return true;
                }
            } else if (this.selectionType === 'week') {
                // 周选择：检查任务是否在周报中
                const weeklySettings = this.plugin.settings.weeklyNote;
                const weeklyFileName = formatDate(startDate, weeklySettings.fileNameFormat);
                const weeklyNotePath = `${weeklySettings.savePath}/${weeklyFileName}.md`;
                if (task.filePath === weeklyNotePath) {
                    return true;
                }
            } else if (this.viewType === 'year' && this.selectionType === 'year') {
                // 年视图：检查任务是否在年报中
                const yearlySettings = this.plugin.settings.yearlyNote;
                if (yearlySettings) {
                    const yearlyFileName = formatDate(startDate, yearlySettings.fileNameFormat);
                    const yearlyNotePath = `${yearlySettings.savePath}/${yearlyFileName}.md`;
                    if (task.filePath === yearlyNotePath) {
                        return true;
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
        
        // 按截止日期排序任务
        const sortedTasks = [...finalFilteredTasks].sort((a, b) => {
            // 无截止日期的任务排在最后
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            
            // 按截止日期排序
            const diff = a.dueDate.getTime() - b.dueDate.getTime();
            // 根据排序方向调整
            return this.taskSortDirection === 'desc' ? -diff : diff;
        });
        
        // 使用taskListRenderer更新任务列表
        this.taskListRenderer.renderTaskList(taskListContainer, sortedTasks, 
            async (index, updatedTask) => {
                if (updatedTask) {
                    await this.eventHandler.handleTaskToggle(updatedTask, updatedTask.completed, async () => {
                        // 任务状态变更后刷新数据缓存
                        await this.plugin.calendarDataManager.refreshTasks();
                        // 根据当前选择类型重新渲染任务列表
                        if (this.selectionType === 'date') {
                            await this.refreshTaskList();
                        } else {
                            await this.renderTaskListByDateRange(startDate, endDate);
                        }
                    });
                }
            },
            async (task) => {
                await this.eventHandler.handleTaskDoubleClick(task);
            }
        );
    }

    private async checkWeekNoteAndTasks(weekStartDate: Date, weekNumber: number, indicators: HTMLElement) {
        await checkWeekNoteAndTasks(this, weekStartDate, weekNumber, indicators);
    }

    private async checkQuarterNoteAndTasks(quarter: number, indicators: HTMLElement) {
        const result = await checkQuarterNoteAndTasks(this, quarter);
        indicators.empty();
        if (result.hasNote) {
            indicators.createEl("div", { cls: "indicator-dot solid-dot" });
        }
        if (result.hasIncomplete) {
            indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
        }
        if (result.hasCompleted) {
            indicators.createEl("div", { cls: "indicator-dot check-dot" });
        }
    }

    private async checkMonthNoteAndTasks(monthIndex: number, indicators: HTMLElement) {
        const result = await checkMonthNoteAndTasks(this, monthIndex);
        indicators.empty();
        if (result.hasNote) {
            indicators.createEl("div", { cls: "indicator-dot solid-dot" });
        }
        if (result.hasIncomplete) {
            indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
        }
        if (result.hasCompleted) {
            indicators.createEl("div", { cls: "indicator-dot check-dot" });
        }
    }

    private async addDayIndicators(container: HTMLElement, date: Date) {
        await addDayIndicators(container, this, date);
    }

    private async updateIndicators() {
        await updateIndicators(this);
    }

    private async updateYearViewMonthIndicators() {
        await updateYearViewMonthIndicators(this);
    }

    /**
     * 计算并调整任务列表高度，使其占据剩余空间
     */
    adjustTaskListHeight() {
        // 获取整个视图容器
        const viewContainer = this.containerEl.children[1] as HTMLElement;
        if (!viewContainer) return;
        
        // 获取视图容器的总高度
        const viewHeight = viewContainer.offsetHeight;
        
        // 计算任务列表上方所有元素的高度
        let totalHeightAboveTaskList = 0;
        
        // 日历头部
        const calendarHeader = viewContainer.querySelector('.calendar-header') as HTMLElement;
        if (calendarHeader) {
            totalHeightAboveTaskList += calendarHeader.offsetHeight;
        }
        
        // 日历表格（月视图）
        const calendarTable = viewContainer.querySelector('.calendar-table') as HTMLElement;
        if (calendarTable) {
            totalHeightAboveTaskList += calendarTable.offsetHeight;
        }
        
        // 年视图容器
        const yearViewContainer = viewContainer.querySelector('.year-view-container') as HTMLElement;
        if (yearViewContainer) {
            totalHeightAboveTaskList += yearViewContainer.offsetHeight;
        }
        
        // 任务列表容器（包括其边距和内边距）
        const taskListContainer = viewContainer.querySelector('.task-list-container') as HTMLElement;
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
            const taskListHeader = taskListContainer.querySelector('.task-list-header') as HTMLElement;
            if (taskListHeader) {
                totalHeightAboveTaskList += taskListHeader.offsetHeight;
            }
        }
        
        // 计算剩余空间高度，减去状态栏高度，防止任务被遮挡
        const remainingHeight = Math.max(0, viewHeight - totalHeightAboveTaskList - 60); // 减去60px作为状态栏空间，增加空间以避免遮挡
        
        // 设置任务列表的高度
        if (taskListContainer) {
            const taskList = taskListContainer.querySelector('.task-list') as HTMLElement;
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
            const calendarTable = this.containerEl.querySelector('.calendar-table') as HTMLElement;
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
                    } else {
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
                        } else if (rows.length > 0 && rows[0]) {
                            // 如果没有选中日期，显示第一行
                            rows[0].style.display = '';
                        }
                    }
                }
            }
        } else if (this.viewType === 'year') {
            // 年视图的收缩/展开逻辑
            const yearViewContainer = this.containerEl.querySelector('.year-view-container') as HTMLElement;
            if (yearViewContainer) {
                if (yearViewContainer.style.maxHeight) {
                    // 展开视图
                    yearViewContainer.style.maxHeight = "30em";
                    yearViewContainer.style.overflow = "hidden";
                    
                    setTimeout(() => {
                        yearViewContainer.style.maxHeight = "";
                        yearViewContainer.style.overflow = "";
                    }, 300);
                } else {
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
