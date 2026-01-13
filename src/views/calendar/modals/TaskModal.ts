import { Modal, App, TFile, MarkdownView } from 'obsidian';
import { MyPlugin } from '../../../main';
import { Task, updateTaskInNote, createTaskInNote } from '../../../services/taskService';
import { formatDate } from '../../../utils/dateUtils';
import { escapeRegExp } from '../../../utils/regexUtils';
import { Solar, Lunar } from 'lunar-typescript';
import { lunarMonthNames, lunarDayNames } from '../../../utils/dateUtils';

interface TaskModalOptions {
    plugin: MyPlugin;
    task?: Task;
    date: Date;
    onTaskAdded?: () => Promise<void>;
    onTaskUpdated?: () => Promise<void>;
}

export class TaskModal extends Modal {
    private plugin: MyPlugin;
    private task?: Task;
    private date: Date;
    private onTaskAdded?: () => Promise<void>;
    private onTaskUpdated?: () => Promise<void>;
    private titleInput: HTMLInputElement;
    private fullDayToggle: HTMLInputElement;
    private startTimeInput: HTMLInputElement;
    private endTimeInput: HTMLInputElement;
    private locationInput: HTMLInputElement;
    private selectedStartDate: Date;
    private selectedEndDate: Date;
    private isSolarCalendar: boolean = true; // true: 公历, false: 农历

    constructor(options: TaskModalOptions) {
        super(options.plugin.app);
        this.plugin = options.plugin;
        this.task = options.task;
        this.date = options.date;
        this.onTaskAdded = options.onTaskAdded;
        this.onTaskUpdated = options.onTaskUpdated;
        
        // 初始化选中的日期，默认开始日期和结束日期都是当天
        this.selectedStartDate = new Date(this.date);
        this.selectedEndDate = new Date(this.date);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.classList.add('task-modal');
        
        // 表单容器
        const form = contentEl.createEl('div', { cls: 'task-modal-form' });
        
        // 选项卡
        const tabs = form.createEl('div', { cls: 'task-modal-tabs' });
        
        // 创建事件选项卡（默认激活）
        const eventTab = tabs.createEl('button', {
            text: '事件',
            cls: 'task-modal-tab task-modal-tab-active'
        });
        
        // 创建提醒选项卡
        const reminderTab = tabs.createEl('button', {
            text: '提醒',
            cls: 'task-modal-tab'
        });
        
        // 选项卡点击事件监听器
        eventTab.addEventListener('click', () => {
            eventTab.classList.add('task-modal-tab-active');
            reminderTab.classList.remove('task-modal-tab-active');
        });
        
        reminderTab.addEventListener('click', () => {
            reminderTab.classList.add('task-modal-tab-active');
            eventTab.classList.remove('task-modal-tab-active');
        });
        
        // 标题
        const titleRow = form.createEl('div', { cls: 'task-modal-title-row' });
        
        this.titleInput = titleRow.createEl('input', {
            type: 'text',
            placeholder: '标题',
            value: this.task ? this.task.text : '',
            cls: 'task-modal-title-input'
        });
        this.titleInput.focus();
        
        // 标题图标
        const titleIcons = titleRow.createEl('div', { cls: 'task-modal-title-icons' });
        const emojiIcon = titleIcons.createEl('span', { text: '😊', cls: 'task-modal-emoji' });
        const colorDot = titleIcons.createEl('span', { cls: 'task-modal-blue-dot' });
        
        // 表情选择器
        emojiIcon.addEventListener('click', () => {
            this.showEmojiPicker(emojiIcon);
        });
        
        // 颜色选择器
        colorDot.addEventListener('click', () => {
            this.showColorPicker(colorDot);
        });
        
        // 全天切换
        const fullDayRow = form.createEl('div', { cls: 'task-modal-full-day-row' });
        
        const fullDayIcon = fullDayRow.createEl('span', { text: '⏰', cls: 'task-modal-icon' });
        fullDayRow.createEl('span', { text: '全天', cls: 'task-modal-full-day-text' });
        
        // 创建自定义开关组件
        const toggleContainer = fullDayRow.createEl('div', { cls: 'task-modal-full-day-toggle' });
        const toggleSlider = toggleContainer.createEl('div', { cls: 'task-modal-full-day-slider' });
        
        // 存储开关状态
        let isFullDay = false;
        
        // 点击事件处理函数（稍后绑定）
        const handleToggleClick = () => {
            isFullDay = !isFullDay;
            if (isFullDay) {
                toggleContainer.addClass('active');
                // 隐藏时间输入框，保留日期显示
                if (this.startTimeInput && this.endTimeInput) {
                    this.startTimeInput.style.display = 'none';
                    this.endTimeInput.style.display = 'none';
                }
            } else {
                toggleContainer.removeClass('active');
                // 显示时间输入框
                if (this.startTimeInput && this.endTimeInput) {
                    this.startTimeInput.style.display = 'block';
                    this.endTimeInput.style.display = 'block';
                }
            }
        };
        
        // 创建一个对象来模拟checkbox的行为，保持与现有代码的兼容性
        this.fullDayToggle = {
            get checked() {
                return isFullDay;
            },
            set checked(value: boolean) {
                isFullDay = value;
                if (value) {
                    toggleContainer.addClass('active');
                } else {
                    toggleContainer.removeClass('active');
                }
            },
            id: 'full-day-toggle'
        } as any;
        
        // 计算下一个整点时间
        const getNextHour = (date: Date): string => {
            const nextHour = new Date(date);
            nextHour.setHours(date.getHours() + 1);
            nextHour.setMinutes(0);
            nextHour.setSeconds(0);
            return nextHour.toTimeString().slice(0, 5);
        };
        
        // 结束时间，默认为下一个整点加1小时
        const endHour = new Date(this.date);
        endHour.setHours(this.date.getHours() + 2);
        endHour.setMinutes(0);
        endHour.setSeconds(0);
        
        // 日期时间选择区
        const datetimeSection = form.createEl('div', { cls: 'task-modal-datetime-section' });
        
        // 开始日期时间
        const startDateTimeRow = datetimeSection.createEl('div', { cls: 'task-modal-datetime-row' });
        
        // 格式化日期显示
        const formatDateDisplay = (date: Date): string => {
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            
            if (this.isSolarCalendar) {
                // 公历格式：1月 12日 周一
                return `${months[date.getMonth()]} ${date.getDate()}日 ${weekdays[date.getDay()]}`;
            } else {
                // 农历格式：两行显示
                // 第一行：阴历年
                // 第二行：阴历月日及周几
                const solar = Solar.fromDate(date);
                const lunar = solar.getLunar();
                const lunarYear = lunar.getYear();
                const lunarMonth = lunarMonthNames[lunar.getMonth()] || '';
                const lunarDay = lunarDayNames[lunar.getDay()] || '';
                return `${lunarYear}年<br>${lunarMonth}${lunarDay} ${weekdays[date.getDay()]}`;
            }
        };
        
        // 更新日期显示
        const updateDateDisplay = () => {
            const startDateTextEl = contentEl.querySelector('.task-modal-date-display:first-child .task-modal-date-text') as HTMLElement;
            const endDateTextEl = contentEl.querySelector('.task-modal-date-display:last-child .task-modal-date-text') as HTMLElement;
            
            if (startDateTextEl) {
                startDateTextEl.innerHTML = formatDateDisplay(this.selectedStartDate);
            }
            
            if (endDateTextEl) {
                endDateTextEl.innerHTML = formatDateDisplay(this.selectedEndDate);
            }
        };
        
        // 开始日期时间
        const startDateDisplay = startDateTimeRow.createEl('div', { cls: 'task-modal-date-display' });
        const startDateText = startDateDisplay.createEl('div', {
            text: formatDateDisplay(this.selectedStartDate),
            cls: 'task-modal-date-text'
        });
        this.startTimeInput = startDateDisplay.createEl('input', {
            type: 'time',
            value: getNextHour(this.selectedStartDate),
            cls: 'task-modal-time-input'
        });
        
        // 箭头
        startDateTimeRow.createEl('span', { text: '→', cls: 'task-modal-arrow' });
        
        // 结束日期时间
        const endDateDisplay = startDateTimeRow.createEl('div', { cls: 'task-modal-date-display' });
        const endDateText = endDateDisplay.createEl('div', {
            text: formatDateDisplay(this.selectedEndDate),
            cls: 'task-modal-date-text'
        });
        this.endTimeInput = endDateDisplay.createEl('input', {
            type: 'time',
            value: endHour.toTimeString().slice(0, 5),
            cls: 'task-modal-time-input'
        });
        
        // 日期文字点击事件
        let isSelectingStartDate = true; // 默认选择开始日期
        let isStartDateActive = false; // 默认开始日期未激活
        let isEndDateActive = false; // 默认结束日期未激活
        let isTransitioningMode = false; // 标记是否正在切换选择模式
        
        // 更新日历显示到指定日期
        const updateCalendarToDate = (date: Date) => {
            currentYear = date.getFullYear();
            currentMonth = date.getMonth();
            yearMonthText.textContent = `${currentYear}年${currentMonth + 1}月`;
            generateCalendar();
        };
        
        startDateText.addEventListener('click', () => {
            if (isStartDateActive) {
                // 取消激活开始日期，隐藏日期选择区域
                isStartDateActive = false;
                startDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'none';
            } else {
                // 检查当前是否为单天选择且正在从结束日期切换到开始日期
                const isCurrentlySingleDay = this.selectedStartDate.toDateString() === this.selectedEndDate.toDateString();
                isTransitioningMode = isCurrentlySingleDay && isEndDateActive;
                
                // 激活开始日期，取消激活结束日期，显示日期选择区域
                isStartDateActive = true;
                isEndDateActive = false;
                isSelectingStartDate = true;
                startDateText.addClass('task-modal-date-text-selected');
                endDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'flex';
                // 更新日历显示到开始日期
                updateCalendarToDate(this.selectedStartDate);
            }
        });
        
        endDateText.addEventListener('click', () => {
            if (isEndDateActive) {
                // 取消激活结束日期，隐藏日期选择区域
                isEndDateActive = false;
                endDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'none';
            } else {
                // 检查当前是否为单天选择且正在从开始日期切换到结束日期
                const isCurrentlySingleDay = this.selectedStartDate.toDateString() === this.selectedEndDate.toDateString();
                isTransitioningMode = isCurrentlySingleDay && isStartDateActive;
                
                // 激活结束日期，取消激活开始日期，显示日期选择区域
                isEndDateActive = true;
                isStartDateActive = false;
                isSelectingStartDate = false;
                endDateText.addClass('task-modal-date-text-selected');
                startDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'flex';
                // 更新日历显示到结束日期
                updateCalendarToDate(this.selectedEndDate);
            }
        });
        
        // 绑定开关的点击事件处理函数
        toggleContainer.addEventListener('click', handleToggleClick);
        
        // 日期选择区域（默认隐藏）
        const calendarSection = form.createEl('div', { cls: 'task-modal-calendar-section' });
        calendarSection.style.display = 'none';
        
        // 当前显示的年月
        let currentYear = this.date.getFullYear();
        let currentMonth = this.date.getMonth();
        let isSolarCalendar = true; // true: 公历, false: 农历
        
        // 日历导航栏
        const calendarHeader = calendarSection.createEl('div', { cls: 'task-modal-calendar-header' });
        
        // 使用月视图的月导航结构
        const monthNav = calendarHeader.createEl('div', { cls: 'calendar-header-block-month' });
        const monthNavBody = monthNav.createEl('div', { cls: 'calendar-header-body' });
        
        // 上一月按钮
        const prevMonthBtn = monthNavBody.createEl('span', {
            text: '‹',
            cls: 'nav-btn prev-btn'
        });
        
        // 年月显示
        const monthContent = monthNavBody.createEl('div', { cls: 'calendar-header-content' });
        const yearMonthText = monthContent.createEl('span', {
            text: `${currentYear}年${currentMonth + 1}月`,
        });
        
        // 下一月按钮
        const nextMonthBtn = monthNavBody.createEl('span', {
            text: '›',
            cls: 'nav-btn next-btn'
        });
        
        // 公历/农历切换
        const calendarTypeToggle = calendarHeader.createEl('div', { cls: 'task-modal-calendar-type-toggle' });
        const solarBtn = calendarTypeToggle.createEl('button', {
            text: '公历',
            cls: 'task-modal-calendar-type-btn task-modal-calendar-type-btn-active'
        });
        const lunarBtn = calendarTypeToggle.createEl('button', {
            text: '农历',
            cls: 'task-modal-calendar-type-btn'
        });
        
        // 星期标题
        const weekdayHeader = calendarSection.createEl('div', { cls: 'task-modal-calendar-weekday-header' });
        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
        weekdays.forEach(day => {
            weekdayHeader.createEl('div', {
                text: day,
                cls: 'task-modal-calendar-weekday'
            });
        });
        
        // 日期网格容器
        const calendarGridContainer = calendarSection.createEl('div', { cls: 'task-modal-calendar-grid-container' });
        
        // 更新导航栏的年月显示
        const updateNavYearMonth = () => {
            if (this.isSolarCalendar) {
                // 公历：显示数字年月
                yearMonthText.textContent = `${currentYear}年${currentMonth + 1}月`;
            } else {
                // 农历：显示农历年月
                const solar = Solar.fromDate(new Date(currentYear, currentMonth, 1));
                const lunar = solar.getLunar();
                const lunarYear = lunar.getYear();
                const lunarMonth = lunarMonthNames[lunar.getMonth()] || '';
                yearMonthText.textContent = `${lunarYear}年${lunarMonth}`;
            }
        };
        
        // 生成日历的函数
        const generateCalendar = () => {
            // 清空现有日历
            calendarGridContainer.empty();
            
            // 创建新的日期表格
            const calendarTable = calendarGridContainer.createEl('table', { cls: 'task-modal-calendar-table' });
            const tbody = calendarTable.createEl('tbody');
            
            // 获取当月第一天
            const firstDay = new Date(currentYear, currentMonth, 1);
            // 获取当月第一天是星期几（0-6，0表示周日）
            const firstDayOfWeek = firstDay.getDay();
            // 调整为周一为1，周日为7
            const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
            // 获取当月天数
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            // 获取上个月的天数
            const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
            
            // 生成日期
            let dateCounter = 1;
            
            // 生成6行7列的日期表格
            for (let i = 0; i < 6; i++) {
                const row = tbody.createEl('tr');
                for (let j = 0; j < 7; j++) {
                    const cell = row.createEl('td');
                    const dateCell = cell.createEl('div', { cls: 'task-modal-calendar-date' });
                    let dateText = '';
                    let isOtherMonth = false;
                    let isToday = false;
                    let isStartDate = false;
                    let isEndDate = false;
                    let isInRange = false;
                    let currentCellDate: Date;
                    
                    // 计算当前单元格的日期
                    const dayIndex = i * 7 + j;
                    
                    if (dayIndex < adjustedFirstDayOfWeek - 1) {
                        // 上个月的日期
                        const prevMonthDate = daysInPrevMonth - (adjustedFirstDayOfWeek - 2 - dayIndex);
                        currentCellDate = new Date(currentYear, currentMonth - 1, prevMonthDate);
                        isOtherMonth = true;
                    } else if (dayIndex < adjustedFirstDayOfWeek - 1 + daysInMonth) {
                        // 当月的日期
                        currentCellDate = new Date(currentYear, currentMonth, dateCounter);
                        dateCounter++;
                    } else {
                        // 下个月的日期
                        const nextMonthDate = dayIndex - (adjustedFirstDayOfWeek - 1 + daysInMonth) + 1;
                        currentCellDate = new Date(currentYear, currentMonth + 1, nextMonthDate);
                        isOtherMonth = true;
                    }
                    
                    // 根据日历类型设置日期文本
                    if (this.isSolarCalendar) {
                        // 公历：显示数字日期
                        dateText = currentCellDate.getDate().toString();
                    } else {
                        // 农历：显示阿拉伯数字日期
                        const solar = Solar.fromDate(currentCellDate);
                        const lunar = solar.getLunar();
                        // 直接使用农历的数字日期
                        dateText = lunar.getDay().toString();
                    }
                    
                    // 检查是否是今天
                    const today = new Date();
                    if (currentCellDate.toDateString() === today.toDateString()) {
                        isToday = true;
                    }
                    
                    // 检查是否是开始日期
                    if (currentCellDate.toDateString() === this.selectedStartDate.toDateString()) {
                        isStartDate = true;
                    }
                    
                    // 检查是否是结束日期
                    if (currentCellDate.toDateString() === this.selectedEndDate.toDateString()) {
                        isEndDate = true;
                    }
                    
                    // 检查是否在日期范围内
                    if (currentCellDate > this.selectedStartDate && currentCellDate < this.selectedEndDate) {
                        isInRange = true;
                    }
                    
                    // 设置日期文本
                    const dateTextEl = dateCell.createEl('span', { 
                        text: dateText, 
                        cls: 'task-modal-calendar-date-text' 
                    });
                    
                    // 存储实际日期，方便点击时获取
                    dateCell.dataset.date = currentCellDate.toISOString();
                    
                    // 检查是否是单天选择
                    const isSameDay = this.selectedStartDate.toDateString() === this.selectedEndDate.toDateString();
                    
                    // 添加特殊样式
                    if (isSameDay) {
                        // 单天选择 - 圆形背景
                        if (isStartDate) {
                            dateCell.addClass('task-modal-calendar-date-single');
                        }
                    } else {
                        // 多天选择 - 胶囊形选择区域
                        if (isStartDate) {
                            dateCell.addClass('task-modal-calendar-date-start');
                        } else if (isEndDate) {
                            dateCell.addClass('task-modal-calendar-date-end');
                        } else if (isInRange) {
                            dateCell.addClass('task-modal-calendar-date-range');
                        }
                    }
                    
                    // 添加其他样式
                    if (isToday) {
                        dateCell.addClass('task-modal-calendar-date-today');
                    } else if (isOtherMonth) {
                        dateCell.addClass('task-modal-calendar-date-other-month');
                    }
                    
                    // 添加日期点击事件
                    dateCell.addEventListener('click', () => {
                        if (!isOtherMonth) {
                            // 只有当日期文字激活时，才更新选择状态
                            if ((isSelectingStartDate && isStartDateActive) || (!isSelectingStartDate && isEndDateActive)) {
                                // 更新选中的日期
                                const selectedDate = new Date(dateCell.dataset.date || new Date().toISOString());
                                
                                // 检查当前是否为单天选择
                                const isCurrentlySingleDay = this.selectedStartDate.toDateString() === this.selectedEndDate.toDateString();
                                
                                // 根据当前选择模式和是否正在切换模式处理日期选择
                                if (isSelectingStartDate) {
                                    // 选择开始日期的逻辑
                                    if (isCurrentlySingleDay && !isTransitioningMode) {
                                        // 当前是单天选择且不是切换模式，保持单天选择
                                        this.selectedStartDate = selectedDate;
                                        this.selectedEndDate = new Date(selectedDate);
                                    } else {
                                        // 当前是区域选择或正在切换模式，按照区域选择规则处理
                                        this.selectedStartDate = selectedDate;
                                        if (selectedDate > this.selectedEndDate) {
                                            // 如果选择的开始日期晚于结束日期，自动调整结束日期为第二天
                                            this.selectedEndDate = new Date(selectedDate);
                                            this.selectedEndDate.setDate(this.selectedEndDate.getDate() + 1);
                                        }
                                        // 重置切换模式标记
                                        isTransitioningMode = false;
                                    }
                                } else {
                                    // 选择结束日期的逻辑
                                    if (isCurrentlySingleDay && !isTransitioningMode) {
                                        // 当前是单天选择且不是切换模式，保持单天选择
                                        this.selectedEndDate = selectedDate;
                                        this.selectedStartDate = new Date(selectedDate);
                                    } else {
                                        // 当前是区域选择或正在切换模式，按照区域选择规则处理
                                        this.selectedEndDate = selectedDate;
                                        if (selectedDate < this.selectedStartDate) {
                                            // 如果选择的结束日期早于开始日期，自动调整开始日期为前一天
                                            this.selectedStartDate = new Date(selectedDate);
                                            this.selectedStartDate.setDate(this.selectedStartDate.getDate() - 1);
                                        }
                                        // 重置切换模式标记
                                        isTransitioningMode = false;
                                    }
                                }
                                
                                // 更新日期显示
                                updateDateDisplay();
                                
                                // 重新生成日历以更新选中状态
                                generateCalendar();
                            }
                        }
                    });
                }
            }
        };
        
        // 生成初始日历
        updateNavYearMonth();
        generateCalendar();
        
        // 上一月按钮点击事件
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateNavYearMonth();
            generateCalendar();
        });
        
        // 下一月按钮点击事件
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            updateNavYearMonth();
            generateCalendar();
        });
        
        // 公历/农历切换
        solarBtn.addEventListener('click', () => {
            if (!this.isSolarCalendar) {
                this.isSolarCalendar = true;
                solarBtn.addClass('task-modal-calendar-type-btn-active');
                lunarBtn.removeClass('task-modal-calendar-type-btn-active');
                
                // 更新导航栏年月显示
                updateNavYearMonth();
                
                // 生成日历
                generateCalendar();
                
                updateDateDisplay();
            }
        });
        
        lunarBtn.addEventListener('click', () => {
            if (this.isSolarCalendar) {
                this.isSolarCalendar = false;
                lunarBtn.addClass('task-modal-calendar-type-btn-active');
                solarBtn.removeClass('task-modal-calendar-type-btn-active');
                
                // 更新导航栏年月显示
                updateNavYearMonth();
                
                // 生成日历
                generateCalendar();
                
                updateDateDisplay();
            }
        });
        
        // 确保日历日期选择后，农历日期也会更新
        contentEl.addEventListener('click', (e) => {
            // 检查是否点击了日历日期
            if (e.target && (e.target as HTMLElement).closest('.task-modal-calendar-date')) {
                // 延迟更新，确保selectedStartDate和selectedEndDate已经更新
                setTimeout(() => {
                    updateDateDisplay();
                }, 100);
            }
        });
        
        // 位置
        const locationRow = form.createEl('div', { cls: 'task-modal-field-row' });
        locationRow.createEl('span', { text: '📍', cls: 'task-modal-icon' });
        this.locationInput = locationRow.createEl('input', {
            type: 'text',
            placeholder: '位置',
            cls: 'task-modal-field-input'
        });
        
        // 我的日历
        const calendarRow = form.createEl('div', { cls: 'task-modal-field-row' });
        calendarRow.createEl('span', { text: '📅', cls: 'task-modal-icon' });
        const calendarContent = calendarRow.createEl('div', { cls: 'task-modal-field-content' });
        calendarContent.createEl('span', { text: '我的日历', cls: 'task-modal-field-text' });
        calendarContent.createEl('span', { cls: 'task-modal-blue-dot' });
        
        // 提醒
        const reminderRow = form.createEl('div', { cls: 'task-modal-field-row' });
        reminderRow.createEl('span', { text: '🔔', cls: 'task-modal-icon' });
        reminderRow.createEl('span', { text: '10 分钟之前', cls: 'task-modal-field-text' });
        
        // 重复
        const repeatRow = form.createEl('div', { cls: 'task-modal-field-row' });
        repeatRow.createEl('span', { text: '🔄', cls: 'task-modal-icon' });
        repeatRow.createEl('span', { text: '不再重复', cls: 'task-modal-field-text' });
        
        // 备注
        const notesRow = form.createEl('div', { cls: 'task-modal-field-row' });
        notesRow.createEl('span', { text: '📝', cls: 'task-modal-icon' });
        notesRow.createEl('span', { text: '备注', cls: 'task-modal-field-text' });
        
        // 附件
        const attachRow = form.createEl('div', { cls: 'task-modal-field-row' });
        attachRow.createEl('span', { text: '📎', cls: 'task-modal-icon' });
        attachRow.createEl('span', { text: '附件', cls: 'task-modal-field-text' });
        
        // 时区信息
        const timezoneRow = form.createEl('div', { cls: 'task-modal-timezone-row' });
        timezoneRow.createEl('span', { text: '🌐', cls: 'task-modal-icon' });
        timezoneRow.createEl('span', { text: '(GMT+8) 中国标准时间', cls: 'task-modal-timezone-text' });
        
        // 底部按钮
        const footer = contentEl.createEl('div', { cls: 'task-modal-footer' });
        
        footer.createEl('button', {
            text: '取消',
            cls: 'task-modal-cancel-btn'
        }).addEventListener('click', () => {
            this.close();
        });
        
        footer.createEl('button', {
            text: '保存',
            cls: 'task-modal-save-btn'
        }).addEventListener('click', async () => {
            await this.handleSave();
        });
        
        // 如果是编辑任务，填充现有数据
        if (this.task) {
            this.populateTaskData();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
    
    private showEmojiPicker(emojiIcon: HTMLElement) {
        // 常用表情符号列表
        const emojis = [
            '😊', '😂', '🤣', '😃', '😄', '😁', '😆', '😅', '🤔', '🙄',
            '😉', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
            '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😏', '😒', '😞', '😔',
            '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢',
            '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱'
        ];
        
        // 检查是否已存在表情选择器，如果存在则移除
        const existingPicker = this.contentEl.querySelector('.task-modal-emoji-picker');
        if (existingPicker) {
            existingPicker.remove();
            return; // 如果已经存在，点击则关闭
        }
        
        // 创建表情选择器容器
        const picker = this.contentEl.createEl('div', { 
            cls: 'task-modal-emoji-picker' 
        });
        
        // 计算表情选择器的位置，使其右上角位于表情图标的正下方
        const iconRect = emojiIcon.getBoundingClientRect();
        const modalRect = this.contentEl.getBoundingClientRect();
        
        // 计算表情图标的右下角位置
        const iconBottom = iconRect.top - modalRect.top + iconRect.height + 25;
        const iconRight = iconRect.left - modalRect.left + iconRect.width - 30;
        
        // 设置选择器的位置：右上角对齐图标右下角
        picker.style.top = `${iconBottom}px`;
        picker.style.right = `${modalRect.width - iconRight}px`;
        picker.style.left = 'auto'; // 移除之前的left设置
        picker.style.transform = 'none'; // 移除居中变换
        
        // 创建表情网格
        const emojiGrid = picker.createEl('div', { cls: 'task-modal-emoji-grid' });
        
        // 添加表情符号按钮
        emojis.forEach(emoji => {
            const emojiBtn = emojiGrid.createEl('button', { 
                text: emoji, 
                cls: 'task-modal-emoji-btn' 
            });
            
            emojiBtn.addEventListener('click', () => {
                // 代替task-modal-emoji元素的内容
                emojiIcon.textContent = emoji;
                
                // 移除表情选择器
                picker.remove();
            });
        });
        
        // 添加点击外部关闭功能
        const handleClickOutside = (event: MouseEvent) => {
            if (!picker.contains(event.target as Node) && event.target !== emojiIcon) {
                picker.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
    }
    
    private showColorPicker(colorDot: HTMLElement) {
        // 常用颜色列表
        const colors = [
            '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6B6B',
            '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8C471',
            '#82E0AA', '#F1948A', '#85929E', '#7DCEA0', '#BB8FCE'
        ];
        
        // 检查是否已存在颜色选择器，如果存在则移除
        const existingPicker = this.contentEl.querySelector('.task-modal-color-picker');
        if (existingPicker) {
            existingPicker.remove();
            return; // 如果已经存在，点击则关闭
        }
        
        // 创建颜色选择器容器
        const picker = this.contentEl.createEl('div', { 
            cls: 'task-modal-color-picker' 
        });
        
        // 计算颜色选择器的位置（基于颜色点的位置）
        const dotRect = colorDot.getBoundingClientRect();
        const modalRect = this.contentEl.getBoundingClientRect();
        
        // 计算颜色点的右下角位置
        const dotBottom = dotRect.top - modalRect.top + dotRect.height + 30;
        const dotRight = dotRect.left - modalRect.left + dotRect.width - 25;
        
        // 设置选择器的位置：右侧对齐颜色点右下角，向下偏移25px
        picker.style.top = `${dotBottom}px`;
        picker.style.right = `${modalRect.width - dotRight}px`;
        picker.style.left = 'auto'; // 移除之前的left设置
        picker.style.transform = 'none'; // 移除居中变换
        
        // 创建颜色网格
        const colorGrid = picker.createEl('div', { cls: 'task-modal-color-grid' });
        
        // 添加颜色按钮
        colors.forEach(color => {
            const colorBtn = colorGrid.createEl('button', { 
                cls: 'task-modal-color-btn' 
            });
            colorBtn.style.backgroundColor = color;
            
            colorBtn.addEventListener('click', () => {
                // 代替task-modal-blue-dot元素的背景色
                colorDot.style.backgroundColor = color;
                
                // 移除颜色选择器
                picker.remove();
            });
        });
        
        // 添加强调色板按钮
        const paletteBtn = colorGrid.createEl('button', { 
            cls: 'task-modal-palette-btn' 
        });
        // 使用 CSS 文件中定义的样式，不再需要内联样式
        paletteBtn.style.width = '30px';
        paletteBtn.style.height = '30px';
        paletteBtn.style.borderRadius = '50%'; // 确保是圆形
        paletteBtn.style.cursor = 'pointer';
        
        // 创建一个隐藏的颜色输入框，用于触发系统颜色选择器
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        // 隐藏输入框，但保持它在DOM中
        colorInput.style.position = 'absolute';
        colorInput.style.opacity = '0';
        colorInput.style.width = '0';
        colorInput.style.height = '0';
        colorInput.style.pointerEvents = 'none';
        
        // 计算颜色输入框的位置，使其位于颜色点下方并与侧边对齐
        const colorDotRect = colorDot.getBoundingClientRect();
        const modalContentRect = this.contentEl.getBoundingClientRect();
        
        const relativeLeft = colorDotRect.left - modalContentRect.left - 210;
        const relativeTop = colorDotRect.top - modalContentRect.top + colorDotRect.height + 30;
        
        // 设置颜色输入框的位置
        colorInput.style.left = `${relativeLeft}px`;
        colorInput.style.top = `${relativeTop}px`;
        
        // 将颜色输入框添加到模态框中
        this.contentEl.appendChild(colorInput);
        
        paletteBtn.addEventListener('click', (e) => {
            // 阻止事件冒泡，避免触发外部点击关闭功能
            e.stopPropagation();
            
            // 移除颜色选择器
            picker.remove();
            
            // 触发系统颜色选择器
            colorInput.click();
        });
        
        // 监听颜色变化事件
        colorInput.addEventListener('input', (e) => {
            const selectedColor = (e.target as HTMLInputElement).value;
            // 更新颜色点的背景色
            colorDot.style.backgroundColor = selectedColor;
        });
        
        // 监听颜色选择完成事件
        colorInput.addEventListener('change', () => {
            // 颜色选择完成后不需要特殊处理
        });
        
        // 添加点击外部关闭功能
        const handleClickOutside = (event: MouseEvent) => {
            if (!picker.contains(event.target as Node) && event.target !== colorDot) {
                picker.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
    }
    
    private async handleSave() {
        // 实现保存逻辑
    }
    
    private populateTaskData() {
        // 实现填充任务数据逻辑
    }
}