import { ItemView, WorkspaceLeaf, Notice, MarkdownView, App, TFile } from 'obsidian';
import { MyPlugin } from '../main';
import { MyPluginSettings } from '../settings';
import { getLunarDate, getHolidayInfo, getHolidayStatus, getWeekNumber, getWeekInfo, getQuarter, formatDate, lunarMonthNames, lunarDayNames, calculateCalendarMonthData } from '../utils/dateUtils';
import { Solar } from 'lunar-typescript';
import { noteExists } from '../services/noteService';
import { extractTasks, filterTasks, updateTaskInNote, Task, parseCustomFilter, evaluateExpression } from '../services/taskService';
import { CalendarRenderer, TaskListRenderer, IndicatorRenderer, EventHandler } from './calendar';
import { CalendarEvent } from '../core/EventEmitter';
import { CommandSelectModal } from '../modals/CommandSelectModal';

const VIEW_TYPE_CALENDAR = "jiujiu-calendar-view";

export class CalendarView extends ItemView {
    private currentDate: Date;
    private plugin: MyPlugin;

    private selectedDate: Date | null = null;
    private viewType: 'month' | 'year' | 'tasks' = 'month';
    private lastRenderedYear: number = -1;
    private lastRenderedMonth: number = -1;
    private lastRenderedViewType: 'month' | 'year' | 'tasks' = 'month';
    private lastRenderedRows: number = -1;
    private selectionType: 'date' | 'month' | 'quarter' | 'year' | 'tasks' | 'week' = 'date';
    private selectedWeekRange: { start: Date; end: Date } | null = null;
    private selectedQuarter: number | null = null;
    private lastRenderedNavigationType: 'month' | 'year' = 'month';
    private navigationType: 'month' | 'year' = 'month';
    
    // 模块化组件
    private calendarRenderer: CalendarRenderer;
    private taskListRenderer: TaskListRenderer;
    private indicatorRenderer: IndicatorRenderer;
    private eventHandler: EventHandler;
    
    // 时间监听器，用于检测日期变化
    private timeListenerId: number | null = null;
    // 上次检查的日期，用于检测日期变化
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
        return "JiuJiu Calendar";
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
        
        // 添加事件监听器，使用事件驱动机制
        this.plugin.eventEmitter.on(CalendarEvent.FILE_CHANGED, async () => {
            // 文件变化时，刷新任务数据缓存并更新任务列表
            await this.plugin.calendarDataManager.refreshTasks();
            await this.refreshTaskList();
            // 更新所有日期指示器
            await this.updateIndicators();
        });
        
        this.plugin.eventEmitter.on(CalendarEvent.TASK_DATA_UPDATED, async () => {
            // 任务数据更新时，刷新任务列表
            await this.refreshTaskList();
            // 更新所有日期指示器
            await this.updateIndicators();
        });
        
        this.plugin.eventEmitter.on(CalendarEvent.CALENDAR_VIEW_UPDATED, async () => {
            // 日历视图更新时，重新渲染日历
            await this.renderCalendar();
        });
        
        this.plugin.eventEmitter.on(CalendarEvent.SELECTED_DATE_CHANGED, async () => {
            // 选择日期变化时，刷新任务列表
            await this.refreshTaskList();
        });
        
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
        // 月份导航按钮
        const prevMonthBtn = this.containerEl.querySelector(".calendar-header-block-month .prev-btn");
        const nextMonthBtn = this.containerEl.querySelector(".calendar-header-block-month .next-btn");
        const monthContent = this.containerEl.querySelector(".calendar-header-block-month .calendar-header-content");
        
        if (prevMonthBtn) {
            (prevMonthBtn as HTMLElement).title = "上一月";
            prevMonthBtn.addEventListener("click", () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        
        if (nextMonthBtn) {
            (nextMonthBtn as HTMLElement).title = "下一月";
            nextMonthBtn.addEventListener("click", () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        
        if (monthContent) {
            monthContent.addEventListener("click", async (event) => {
                // 如果是月视图，点击月份数字部分切换导航类型
                if (this.viewType === 'month') {
                    // 切换导航类型
                    this.navigationType = 'year';
                    this.renderCalendar();
                } else {
                    // 显示当月所有任务
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    await this.renderTaskListByDateRange(startDate, endDate);
                }
            });
            monthContent.addEventListener("dblclick", async () => {
                await this.eventHandler.handleMonthDoubleClick(this.currentDate);
            });
        }
        
        // 年份导航按钮
        const prevYearBtn = this.containerEl.querySelector(".calendar-header-block-year .prev-btn");
        const nextYearBtn = this.containerEl.querySelector(".calendar-header-block-year .next-btn");
        const yearContent = this.containerEl.querySelector(".calendar-header-block-year .calendar-header-content");
        
        if (prevYearBtn) {
            (prevYearBtn as HTMLElement).title = "上一年";
            prevYearBtn.addEventListener("click", () => {
                this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        
        if (nextYearBtn) {
            (nextYearBtn as HTMLElement).title = "下一年";
            nextYearBtn.addEventListener("click", () => {
                this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
                this.selectedDate = this.currentDate;
                this.renderCalendar();
            });
        }
        
        if (yearContent) {
            yearContent.addEventListener("click", async (event) => {
                // 如果是月视图，点击年份数字部分切换导航类型
                if (this.viewType === 'month') {
                    // 切换导航类型
                    this.navigationType = 'month';
                    this.renderCalendar();
                } else {
                    // 更新选择类型
                    this.selectionType = 'year';
                    this.selectedDate = null;
                    this.selectedWeekRange = null;
                    this.selectedQuarter = null;
                    
                    // 更新选择状态并刷新日期显示
                    await this.updateSelectionState();
                    
                    // 显示当年所有任务
                    const year = this.currentDate.getFullYear();
                    const startDate = new Date(year, 0, 1);
                    const endDate = new Date(year, 11, 31);
                    await this.renderTaskListByDateRange(startDate, endDate);
                }
            });
            yearContent.addEventListener("dblclick", async () => {
                await this.eventHandler.handleYearDoubleClick(this.currentDate);
            });
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
            todayBtn.addEventListener("click", async () => {
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
            });
        }
        
        if (yearBtn) {
            // 年按钮：在月视图和年视图之间切换
            yearBtn.textContent = this.viewType === 'month' ? "年" : "月";
            yearBtn.className = `calendar-header-label-year ${this.viewType === 'year' ? 'today-selected' : 'today-unselected'}`;
            yearBtn.addEventListener("click", async () => {
                // 切换视图类型
                this.viewType = this.viewType === 'month' ? 'year' : 'month';
                // 同步更新导航类型：年视图默认使用年导航
                this.navigationType = this.viewType === 'year' ? 'year' : 'month';
                
                // 如果从年视图切换回月视图，确保更新选择类型和相关状态
                if (this.viewType === 'month') {
                    this.selectionType = 'date';
                    this.selectedWeekRange = null;
                    this.selectedQuarter = null;
                    
                    // 如果当前选中的月份是今日所在的月份，定位到今日
                    const currentToday = new Date();
                    if (this.selectedDate && this.selectedDate.getMonth() === currentToday.getMonth() && this.selectedDate.getFullYear() === currentToday.getFullYear()) {
                        this.selectedDate = currentToday;
                        this.currentDate = currentToday;
                    }
                }
                
                // 先更新选择状态，让用户立即看到日期变化
                this.updateSelectionState();
                
                // 然后刷新视图
                await this.renderCalendar();
                
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
                        
                        // 更新选择类型
                        this.selectionType = 'month';
                        this.selectedWeekRange = null;
                        this.selectedQuarter = null;
                        
                        // 更新当前日期到选中的月份，并将选中日期设置为该月的1日
                        const selectedMonthDate = new Date(this.selectedDate.getFullYear(), currentMonthIndex, 1);
                        this.currentDate = selectedMonthDate;
                        this.selectedDate = selectedMonthDate;
                        
                        // 更新选择状态并刷新日期显示
                        await this.updateSelectionState();
                        
                        // 计算月份的开始和结束日期
                        const year = this.selectedDate.getFullYear();
                        const month = currentMonthIndex;
                        const startDate = new Date(year, month, 1);
                        const endDate = new Date(year, month + 1, 0);
                        
                        // 显示该月份内的任务
                        await this.renderTaskListByDateRange(startDate, endDate);
                    }
                }
            });
        }
        
        // 添加LB1按钮的点击事件监听
        const lb1Btn = this.containerEl.querySelector(".calendar-header-label-lb1");
        if (lb1Btn) {
            lb1Btn.addEventListener("click", async () => {
                const lb1Settings = this.plugin.settings.moreLabelSettings.lb1;
                
                if (!lb1Settings.enabled) {
                    return;
                }
                
                switch (lb1Settings.actionType) {
                    case "systemCommand":
                        if (lb1Settings.systemCommand) {
                            try {
                                await (this.app as any).commands.executeCommandById(lb1Settings.systemCommand);
                            } catch (error) {
                                console.error('Failed to execute system command:', error);
                                new Notice(`执行命令失败: ${error}`);
                            }
                        } else {
                            // 如果没有配置命令，打开插件设置
                            (this.app as any).setting.open();
                            (this.app as any).setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                    case "openFile":
                        if (lb1Settings.filePath) {
                            try {
                                const file = this.app.vault.getAbstractFileByPath(lb1Settings.filePath);
                                if (file instanceof TFile) {
                                    await this.app.workspace.openLinkText(lb1Settings.filePath, "", true);
                                } else {
                                    new Notice('文件不存在，请检查路径');
                                }
                            } catch (error) {
                                console.error('Failed to open file:', error);
                                new Notice(`打开文件失败: ${error}`);
                            }
                        } else {
                            // 如果没有配置文件路径，打开插件设置
                            (this.app as any).setting.open();
                            (this.app as any).setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                }
            });
        }
        
        // 添加LB2按钮的点击事件监听
        const lb2Btn = this.containerEl.querySelector(".calendar-header-label-lb2");
        if (lb2Btn) {
            lb2Btn.addEventListener("click", async () => {
                const lb2Settings = this.plugin.settings.moreLabelSettings.lb2;
                
                if (!lb2Settings.enabled) {
                    return;
                }
                
                switch (lb2Settings.actionType) {
                    case "systemCommand":
                        if (lb2Settings.systemCommand) {
                            try {
                                await (this.app as any).commands.executeCommandById(lb2Settings.systemCommand);
                            } catch (error) {
                                console.error('Failed to execute system command:', error);
                                new Notice(`执行命令失败: ${error}`);
                            }
                        } else {
                            // 如果没有配置命令，打开插件设置
                            (this.app as any).setting.open();
                            (this.app as any).setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                    case "openFile":
                        if (lb2Settings.filePath) {
                            try {
                                const file = this.app.vault.getAbstractFileByPath(lb2Settings.filePath);
                                if (file instanceof TFile) {
                                    await this.app.workspace.openLinkText(lb2Settings.filePath, "", true);
                                } else {
                                    new Notice('文件不存在，请检查路径');
                                }
                            } catch (error) {
                                console.error('Failed to open file:', error);
                                new Notice(`打开文件失败: ${error}`);
                            }
                        } else {
                            // 如果没有配置文件路径，打开插件设置
                            (this.app as any).setting.open();
                            (this.app as any).setting.openTabById(this.plugin.manifest.id);
                        }
                        break;
                }
            });
        }
    }

    /**
     * 添加日期和周数单元格事件监听器
     */
    private async addCalendarCellEventListeners() {
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
                    this.checkWeekNoteAndTasks(adjustedDate, weekNumber, weekIndicators as HTMLElement);
                }
                
                // 单击事件
                cell.addEventListener("click", async () => {
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
                    this.updateWeekSelection(cell as HTMLElement);

                    // 更新选择状态并刷新日期显示
                    await this.updateSelectionState();

                    // 显示该周内的任务
                    await this.renderTaskListByDateRange(weekStart, weekEnd);
                });

                // 双击事件
                cell.addEventListener("dblclick", async () => {
                    await this.eventHandler.handleWeekDoubleClick(adjustedDate);
                });
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
                let date: Date;
                let isOtherMonth = false;
                
                // 计算当前单元格的日期
                if (cellIndex < prevMonthDaysToShow) {
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
                
                // 检查是否有日记和任务，添加指示器
                const indicatorsContainer = cell.querySelector(".day-indicators");
                if (indicatorsContainer) {
                    await this.addDayIndicators(indicatorsContainer as HTMLElement, date);
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
                
                // 双击事件 - 只在当前月份的日期上添加
                if (!isOtherMonth) {
                    cell.addEventListener("dblclick", async () => {
                        await this.eventHandler.handleDayDoubleClick(date);
                    });
                }
                
                // 单击事件 - 所有日期都添加
                cell.addEventListener("click", () => {
                    this.onDayClick(date);
                });
                
                cellIndex++;
            }
        } else {
            // 年视图的季度和月份单元格
            // 季度容器（使用与月份容器相同的处理方式）
            const quarterContainers = this.containerEl.querySelectorAll(".quarter-container");
            quarterContainers.forEach((container, index) => {
                const quarter = index;
                
                // 单击事件
                container.addEventListener("click", async () => {
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
                    await this.updateSelectionState();
                    
                    // 计算季度的开始和结束日期
                    const year = this.currentDate.getFullYear();
                    const quarterStartMonth = quarter * 3;
                    const quarterEndMonth = quarter * 3 + 2;
                    const startDate = new Date(year, quarterStartMonth, 1);
                    const endDate = new Date(year, quarterEndMonth + 1, 0);
                    
                    // 显示该季度内的任务
                    await this.renderTaskListByDateRange(startDate, endDate);
                });
                
                // 双击事件
                container.addEventListener("dblclick", async () => {
                    const quarterDate = new Date(this.currentDate.getFullYear(), quarter * 3, 1);
                    await this.eventHandler.handleQuarterDoubleClick(quarterDate);
                });
                
                // 季度状态指示器
                const quarterIndicators = container.querySelector(".month-indicators");
                if (quarterIndicators) {
                    // 检查季报和任务
                    this.checkQuarterNoteAndTasks(quarter, quarterIndicators as HTMLElement);
                }
            });
            
            // 月份容器（排除季度容器）
            const monthContainers = this.containerEl.querySelectorAll(".month-container:not(.quarter-container)");
            monthContainers.forEach((container, index) => {
                const currentMonthIndex = index;
                
                // 月份标题
                const monthHeader = container.querySelector(".month-header");
                
                // 单击事件
                container.addEventListener("click", async () => {
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
                    await this.updateSelectionState();
                    
                    // 计算月份的开始和结束日期
                    const year = this.currentDate.getFullYear();
                    const month = currentMonthIndex;
                    const startDate = new Date(year, month, 1);
                    const endDate = new Date(year, month + 1, 0);
                    
                    // 显示该月份内的任务
                    await this.renderTaskListByDateRange(startDate, endDate);
                });
                
                // 双击事件
                container.addEventListener("dblclick", async () => {
                    const monthDate = new Date(this.currentDate.getFullYear(), currentMonthIndex, 1);
                    await this.eventHandler.handleMonthDoubleClick(monthDate);
                });
                
                // 月份状态指示器
                const monthIndicators = container.querySelector(".month-indicators");
                if (monthIndicators) {
                    // 检查月报和任务
                    this.checkMonthNoteAndTasks(currentMonthIndex, monthIndicators as HTMLElement);
                }
            });
        }
    }

    private async refreshAll() {
        await this.updateCalendarContent();
        await this.updateIndicators();
        await this.refreshTaskList();
    }

    private async refreshCalendar() {
        await this.updateCalendarContent();
        await this.updateIndicators();
    }

    public async refreshTaskList() {
        if (this.selectedDate) {
            const taskListContainer = this.containerEl.querySelector(".task-list-container") as HTMLElement;
            if (taskListContainer) {
                // 从数据管理器获取任务并应用筛选
                const allTasks = await this.plugin.calendarDataManager.getTasks();
                const filteredTasks = filterTasks(allTasks, this.plugin.settings, this.selectedDate);
                
                // 使用taskListRenderer更新任务列表
                this.taskListRenderer.renderTaskList(taskListContainer, filteredTasks, 
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

    private async onDayClick(date: Date) {
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

    private updateDaySelection() {
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
            } else {
                todayBtn.addClass("today-unselected");
                todayBtn.removeClass("today-selected");
            }
        }
        
        // 点击日期时取消周数的选中状态
        this.updateWeekSelection();
    }

    private updateWeekSelection(selectedWeekCell?: HTMLElement) {
        // 移除所有周数单元格的选中状态
        this.containerEl.querySelectorAll(".week-number-cell").forEach((cell: any) => {
            cell.removeClass('selected-week');
        });
        
        // 如果有选中的周数单元格，添加选中状态
        if (selectedWeekCell) {
            selectedWeekCell.addClass('selected-week');
        }
    }

    private updateSelectionState() {
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

    private async renderTaskListByDateRange(startDate: Date, endDate: Date) {
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
            } else if (this.viewType === 'year' && this.selectionType === 'month') {
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
            } else if (this.selectionType === 'week') {
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
            } else if (this.viewType === 'year' && this.selectionType === 'year') {
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
        this.taskListRenderer.renderTaskList(taskListContainer, finalFilteredTasks, 
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
            if (await noteExists(this.app, path)) {
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
                    const content = await this.app.vault.read(file);
                    
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
                            } else {
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
            } catch (error) {
                console.error(`Failed to read weekly note: ${weeklyFilePath}`, error);
            }
        }
        
        // 检查本周内是否有截止任务（其他文件）
        if (!hasWeeklyTask) {
            const allTasks = await extractTasks(this.app, this.plugin.settings);
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
            indicators.createEl("div", {cls: "indicator-dot solid-dot"});
        }
        
        // 添加空心小圆点表示任务
        if (hasWeeklyTask) {
            indicators.createEl("div", {cls: "indicator-dot hollow-dot"});
        }
    }

    private async checkQuarterNoteAndTasks(quarter: number, indicators: HTMLElement) {
        // 计算季度的开始和结束日期
        const year = this.currentDate.getFullYear();
        const quarterStartMonth = quarter * 3;
        const quarterEndMonth = quarter * 3 + 2;
        const quarterStartDate = new Date(year, quarterStartMonth, 1);
        const quarterEndDate = new Date(year, quarterEndMonth + 1, 0);
        quarterEndDate.setHours(23, 59, 59, 999);
        
        let hasQuarterlyNote = false;
        let hasQuarterlyIncompleteTask = false;
        let hasQuarterlyCompletedTask = false;
        
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
            if (await noteExists(this.app, path)) {
                hasQuarterlyNote = true;
                break;
            }
        }
        
        // 检查本季度内是否有截止任务
        const allTasks = await extractTasks(this.app, this.plugin.settings);
        for (const task of allTasks) {
            if (task.dueDate && task.dueDate >= quarterStartDate && task.dueDate <= quarterEndDate) {
                if (task.status === "x" || task.status === "-") {
                    // 已完成或已取消的任务
                    hasQuarterlyCompletedTask = true;
                } else {
                    // 未完成的任务（待办或进行中）
                    hasQuarterlyIncompleteTask = true;
                }
            }
        }
        
        // 清空现有指示器
        indicators.empty();
        
        // 添加实心小圆点表示季度报告
        if (hasQuarterlyNote) {
            indicators.createEl("div", { cls: "indicator-dot solid-dot" });
        }
        
        // 添加空心小圆点表示未完成任务
        if (hasQuarterlyIncompleteTask) {
            indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
        }
        
        // 添加绿色实心小圆点表示已完成任务
        if (hasQuarterlyCompletedTask) {
            indicators.createEl("div", { cls: "indicator-dot check-dot" });
        }
    }

    private async checkMonthNoteAndTasks(monthIndex: number, indicators: HTMLElement) {
        // 计算月份的开始和结束日期
        const year = this.currentDate.getFullYear();
        const monthStartDate = new Date(year, monthIndex, 1);
        const monthEndDate = new Date(year, monthIndex + 1, 0);
        monthEndDate.setHours(23, 59, 59, 999);
        
        let hasMonthlyNote = false;
        let hasMonthlyIncompleteTask = false;
        let hasMonthlyCompletedTask = false;
        
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
            if (await noteExists(this.app, path)) {
                hasMonthlyNote = true;
                break;
            }
        }
        
        // 检查本月内是否有截止任务
        const allTasks = await extractTasks(this.app, this.plugin.settings);
        for (const task of allTasks) {
            if (task.dueDate && task.dueDate >= monthStartDate && task.dueDate <= monthEndDate) {
                if (task.status === "x" || task.status === "-") {
                    // 已完成或已取消的任务
                    hasMonthlyCompletedTask = true;
                } else {
                    // 未完成的任务（待办或进行中）
                    hasMonthlyIncompleteTask = true;
                }
            }
        }
        
        // 清空现有指示器
        indicators.empty();
        
        // 添加实心小圆点表示月报
        if (hasMonthlyNote) {
            indicators.createEl("div", { cls: "indicator-dot solid-dot" });
        }
        
        // 添加空心小圆点表示未完成任务
        if (hasMonthlyIncompleteTask) {
            indicators.createEl("div", { cls: "indicator-dot hollow-dot" });
        }
        
        // 添加绿色实心小圆点表示已完成任务
        if (hasMonthlyCompletedTask) {
            indicators.createEl("div", { cls: "indicator-dot check-dot" });
        }
    }

    private async addDayIndicators(container: HTMLElement, date: Date) {
        // 检查是否有日记和任务，添加指示器
        const dailySettings = this.plugin.settings.dailyNote;
        const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
        const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
        
        let hasNote = false;
        let hasTask = false;
        
        if (await noteExists(this.app, dailyNotePath)) {
            hasNote = true;
            
            // 检查当天日记中没有截止日期的任务
            try {
                const dailyFile = this.app.vault.getAbstractFileByPath(dailyNotePath);
                if (dailyFile instanceof TFile) {
                    const content = await this.app.vault.read(dailyFile);
                    
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
                            } else {
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
            } catch (error) {
                console.error('Failed to check daily note tasks:', error);
            }
        }
        
        // 检查所有文件中截止日期在当天的任务（其他文件中的任务）
        if (!hasTask) {
            try {
                const allTasks = await extractTasks(this.app, this.plugin.settings);
                
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
        }
        
        // 清空现有指示器
        container.empty();
        
        // 创建一行指示器
        const indicatorRow = container.createEl('div', {cls: 'indicator-row'});
        
        // 显示日记指示器（实心小圆点）
        if (hasNote) {
            indicatorRow.createEl('div', {cls: 'indicator-dot solid-dot'});
        }
        
        // 显示任务指示器（空心小圆点）
        if (hasTask) {
            indicatorRow.createEl('div', {cls: 'indicator-dot hollow-dot'});
        }
    }

    private async updateIndicators() {
        if (this.viewType === 'month') {
            // 使用indicatorRenderer更新指示器
            const targetDate = this.selectedDate || this.currentDate;
            await this.indicatorRenderer.updateAllDayIndicators(this.containerEl, targetDate);
            await this.indicatorRenderer.updateWeekIndicators(this.containerEl, targetDate);
        } else if (this.viewType === 'year') {
            // 年视图：更新月份指示器
            await this.updateYearViewMonthIndicators();
        }
        // 移除不必要的refreshTaskList调用，避免重复提取任务
    }

    private async updateYearViewMonthIndicators() {
        // 获取年视图容器
        const yearViewContainer = this.containerEl.querySelector('.year-view-container');
        if (!yearViewContainer) return;
        
        // 获取所有季度容器
        const quarterContainers = Array.from(yearViewContainer.querySelectorAll('.quarter-container'));
        
        // 遍历所有季度容器
        for (const quarterContainer of quarterContainers) {
            const quarterHeader = quarterContainer.querySelector('.month-header');
            if (!quarterHeader) continue;
            
            // 解析季度标题，获取季度索引
            const quarterText = quarterHeader.textContent || '';
            const quarterMatch = quarterText.match(/(\d+)季度/);
            if (!quarterMatch || !quarterMatch[1]) continue;
            
            const quarterIndex = parseInt(quarterMatch[1]) - 1;
            if (isNaN(quarterIndex) || quarterIndex < 0 || quarterIndex > 3) continue;
            
            // 检查该季度是否有季报和任务
            const year = this.currentDate.getFullYear();
            const quarterDate = new Date(year, quarterIndex * 3, 1);
            
            // 提前声明季度开始和结束日期
            const quarterStartDate = new Date(year, quarterIndex * 3, 1);
            const quarterEndDate = new Date(year, quarterIndex * 3 + 3, 0);
            quarterEndDate.setHours(23, 59, 59, 999);
            
            let hasQuarterlyNote = false;
            let hasQuarterlyTask = false;
            let hasQuarterlyCompletedTask = false;
            
            // 检查季报
            const quarterlySettings = this.plugin.settings.quarterlyNote;
            const quarterlyFileName = formatDate(quarterDate, quarterlySettings.fileNameFormat);
            const quarterlyNotePath = `${quarterlySettings.savePath}/${quarterlyFileName}.md`;
            
            if (await noteExists(this.app, quarterlyNotePath)) {
                hasQuarterlyNote = true;
                
                // 有季报，检查是否有任务
                try {
                    const file = this.app.vault.getAbstractFileByPath(quarterlyNotePath);
                    if (file instanceof TFile) {
                        const content = await this.app.vault.read(file);
                        
                        // 检查季报中是否有任务
                        const taskRegex = /^\s*([-\*\d]+\.?)\s*\[([ xX-])\]\s*(.+)$/gm;
                        let match;
                        while ((match = taskRegex.exec(content)) !== null) {
                            const status = match[2] || '';
                            const taskText = match[3] || '';
                            
                            // 检查任务文本中是否包含截止日期
                            const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                            const hasDueDate = dueDateRegex.test(taskText);
                            
                            // 如果没有截止日期，或者截止日期在本季度，都算作本季度的任务
                            let isTaskForThisQuarter = false;
                            if (!hasDueDate) {
                                isTaskForThisQuarter = true;
                            } else {
                                // 有截止日期，检查是否在本季度
                                const dueDateMatch = taskText.match(dueDateRegex);
                                if (dueDateMatch && dueDateMatch[1]) {
                                    const dueDate = new Date(dueDateMatch[1]);
                                    if (dueDate >= quarterStartDate && dueDate <= quarterEndDate) {
                                        isTaskForThisQuarter = true;
                                    }
                                }
                            }
                            
                            if (isTaskForThisQuarter) {
                                // 根据任务状态更新指示器
                                if (status.toLowerCase() === 'x' || status.toLowerCase() === '-') {
                                    hasQuarterlyCompletedTask = true;
                                } else {
                                    hasQuarterlyTask = true;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Failed to read quarterly note: ${quarterlyNotePath}`, error);
                }
            }
            
            // 检查该季度内是否有截止任务
            const allTasks = await this.plugin.calendarDataManager.getTasks();
            
            for (const task of allTasks) {
                if (task.dueDate && task.dueDate >= quarterStartDate && task.dueDate <= quarterEndDate) {
                    if (task.status === 'x' || task.status === '-') {
                        hasQuarterlyCompletedTask = true;
                    } else {
                        hasQuarterlyTask = true;
                    }
                }
            }
            
            // 更新季度指示器
            const quarterIndicators = quarterContainer.querySelector('.month-indicators');
            if (quarterIndicators) {
                quarterIndicators.empty();
                
                // 添加实心小圆点表示季报
                if (hasQuarterlyNote) {
                    quarterIndicators.createEl('div', {cls: 'indicator-dot solid-dot'});
                }
                
                // 添加空心小圆点表示未完成任务
                if (hasQuarterlyTask) {
                    quarterIndicators.createEl('div', {cls: 'indicator-dot hollow-dot'});
                }
                
                // 添加绿色实心小圆点表示已完成任务
                if (hasQuarterlyCompletedTask) {
                    quarterIndicators.createEl('div', {cls: 'indicator-dot check-dot'});
                }
            }
        }
        
        // 获取所有月份容器（排除季度容器）
        const monthContainers = Array.from(yearViewContainer.querySelectorAll('.month-container:not(.quarter-container)'));
        
        // 遍历所有月份容器
        for (const monthContainer of monthContainers) {
            const monthHeader = monthContainer.querySelector('.month-header');
            if (!monthHeader) continue;
            
            // 解析月份标题，获取月份索引
            const monthText = monthHeader.textContent || '';
            const monthMatch = monthText.match(/(\d+)月/);
            if (!monthMatch || !monthMatch[1]) continue;
            
            const monthIndex = parseInt(monthMatch[1]) - 1;
            if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) continue;
            
            // 检查该月份是否有月报和任务
            const year = this.currentDate.getFullYear();
            const monthDate = new Date(year, monthIndex, 1);
            
            let hasMonthlyNote = false;
            let hasMonthlyTask = false;
            let hasMonthlyCompletedTask = false;
            
            // 检查月报
            const monthlySettings = this.plugin.settings.monthlyNote;
            const monthlyFileName = formatDate(monthDate, monthlySettings.fileNameFormat);
            const monthlyNotePath = `${monthlySettings.savePath}/${monthlyFileName}.md`;
            
            if (await noteExists(this.app, monthlyNotePath)) {
                hasMonthlyNote = true;
                
                // 检查是否有任务
                try {
                    const file = this.app.vault.getAbstractFileByPath(monthlyNotePath);
                    if (file instanceof TFile) {
                        const content = await this.app.vault.read(file);
                        
                        // 检查是否有任务
                        const taskRegex = /^\s*([-\*\d]+\.?)\s*\[([ xX-])\]\s*(.+)$/gm;
                        let match;
                        while ((match = taskRegex.exec(content)) !== null) {
                            const status = match[2] || '';
                            const taskText = match[3] || '';
                            
                            // 检查任务文本中是否包含截止日期
                            const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/;
                            const hasDueDate = dueDateRegex.test(taskText);
                            
                            // 如果没有截止日期，或者截止日期在当月，都算作当月的任务
                            let isTaskForThisMonth = false;
                            if (!hasDueDate) {
                                isTaskForThisMonth = true;
                            } else {
                                // 有截止日期，检查是否在当月
                                const dueDateMatch = taskText.match(dueDateRegex);
                                if (dueDateMatch && dueDateMatch[1]) {
                                    const dueDate = new Date(dueDateMatch[1]);
                                    if (dueDate.getFullYear() === year && dueDate.getMonth() === monthIndex) {
                                        isTaskForThisMonth = true;
                                    }
                                }
                            }
                            
                            if (isTaskForThisMonth) {
                                // 根据任务状态更新指示器
                                if (status.toLowerCase() === 'x' || status.toLowerCase() === '-') {
                                    hasMonthlyCompletedTask = true;
                                } else {
                                    hasMonthlyTask = true;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Failed to read monthly note: ${monthlyNotePath}`, error);
                }
            }
            
            // 检查该月份内是否有截止任务
            const allTasks = await this.plugin.calendarDataManager.getTasks();
            const monthStartDate = new Date(year, monthIndex, 1);
            const monthEndDate = new Date(year, monthIndex + 1, 0);
            monthEndDate.setHours(23, 59, 59, 999);
            
            for (const task of allTasks) {
                if (task.dueDate && task.dueDate >= monthStartDate && task.dueDate <= monthEndDate) {
                    if (task.status === 'x' || task.status === '-') {
                        hasMonthlyCompletedTask = true;
                    } else {
                        hasMonthlyTask = true;
                    }
                }
            }
            
            // 更新月份指示器
            const monthIndicators = monthContainer.querySelector('.month-indicators');
            if (monthIndicators) {
                monthIndicators.empty();
                
                // 添加实心小圆点表示月报
                if (hasMonthlyNote) {
                    monthIndicators.createEl('div', {cls: 'indicator-dot solid-dot'});
                }
                
                // 添加空心小圆点表示未完成任务
                if (hasMonthlyTask) {
                    monthIndicators.createEl('div', {cls: 'indicator-dot hollow-dot'});
                }
                
                // 添加绿色实心小圆点表示已完成任务
                if (hasMonthlyCompletedTask) {
                    monthIndicators.createEl('div', {cls: 'indicator-dot check-dot'});
                }
            }
        }
    }

    /**
     * 计算并调整任务列表高度，使其占据剩余空间
     */
    private adjustTaskListHeight() {
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
    private toggleCalendarView() {
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
