import { Modal, App, TFile, MarkdownView } from 'obsidian';
import { MyPlugin } from '../../../main';
import { Task, updateTaskInNote, createTaskInNote } from '../../../services/taskService';
import { formatDate } from '../../../utils/dateUtils';
import { escapeRegExp } from '../../../utils/regexUtils';

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

    constructor(options: TaskModalOptions) {
        super(options.plugin.app);
        this.plugin = options.plugin;
        this.task = options.task;
        this.date = options.date;
        this.onTaskAdded = options.onTaskAdded;
        this.onTaskUpdated = options.onTaskUpdated;
        
        // 初始化选中的日期，默认开始日期是当天，结束日期是第二天
        this.selectedStartDate = new Date(this.date);
        this.selectedEndDate = new Date(this.date);
        this.selectedEndDate.setDate(this.selectedEndDate.getDate() + 1);
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
        titleIcons.createEl('span', { text: '😊', cls: 'task-modal-emoji' });
        titleIcons.createEl('span', { cls: 'task-modal-blue-dot' });
        
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
        
        // 格式化日期为 "1月 12日 周一" 格式
        const formatDateDisplay = (date: Date): string => {
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return `${months[date.getMonth()]} ${date.getDate()}日 ${weekdays[date.getDay()]}`;
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
        
        startDateText.addEventListener('click', () => {
            if (isStartDateActive) {
                // 取消激活开始日期，隐藏日期选择区域
                isStartDateActive = false;
                startDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'none';
            } else {
                // 激活开始日期，取消激活结束日期，显示日期选择区域
                isStartDateActive = true;
                isEndDateActive = false;
                isSelectingStartDate = true;
                startDateText.addClass('task-modal-date-text-selected');
                endDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'flex';
            }
        });
        
        endDateText.addEventListener('click', () => {
            if (isEndDateActive) {
                // 取消激活结束日期，隐藏日期选择区域
                isEndDateActive = false;
                endDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'none';
            } else {
                // 激活结束日期，取消激活开始日期，显示日期选择区域
                isEndDateActive = true;
                isStartDateActive = false;
                isSelectingStartDate = false;
                endDateText.addClass('task-modal-date-text-selected');
                startDateText.removeClass('task-modal-date-text-selected');
                calendarSection.style.display = 'flex';
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
        
        // 上一月按钮
        const prevMonthBtn = calendarHeader.createEl('button', {
            text: '‹',
            cls: 'task-modal-calendar-nav-btn'
        });
        
        // 年月显示和选择
        const yearMonthDisplay = calendarHeader.createEl('div', { cls: 'task-modal-calendar-year-month' });
        const yearMonthText = yearMonthDisplay.createEl('span', {
            text: `${currentYear}年${currentMonth + 1}月`,
            cls: 'task-modal-calendar-year-month-text'
        });
        const dropdownIcon = yearMonthDisplay.createEl('span', {
            text: '▼',
            cls: 'task-modal-calendar-dropdown'
        });
        
        // 下一月按钮
        const nextMonthBtn = calendarHeader.createEl('button', {
            text: '›',
            cls: 'task-modal-calendar-nav-btn'
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
                    
                    // 计算当前单元格的日期
                    const dayIndex = i * 7 + j;
                    
                    if (dayIndex < adjustedFirstDayOfWeek - 1) {
                        // 上个月的日期
                        const prevMonthDate = daysInPrevMonth - (adjustedFirstDayOfWeek - 2 - dayIndex);
                        dateText = prevMonthDate.toString();
                        isOtherMonth = true;
                    } else if (dayIndex < adjustedFirstDayOfWeek - 1 + daysInMonth) {
                        // 当月的日期
                        dateText = dateCounter.toString();
                        
                        // 检查是否是今天
                        const today = new Date();
                        if (dateCounter === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                            isToday = true;
                        }
                        
                        // 检查是否是开始日期
                        if (dateCounter === this.selectedStartDate.getDate() && currentMonth === this.selectedStartDate.getMonth() && currentYear === this.selectedStartDate.getFullYear()) {
                            isStartDate = true;
                        }
                        
                        // 检查是否是结束日期
                        if (dateCounter === this.selectedEndDate.getDate() && currentMonth === this.selectedEndDate.getMonth() && currentYear === this.selectedEndDate.getFullYear()) {
                            isEndDate = true;
                        }
                        
                        // 检查是否在日期范围内
                        const currentCellDate = new Date(currentYear, currentMonth, dateCounter);
                        if (currentCellDate > this.selectedStartDate && currentCellDate < this.selectedEndDate) {
                            isInRange = true;
                        }
                        
                        dateCounter++;
                    } else {
                        // 下个月的日期
                        const nextMonthDate = dayIndex - (adjustedFirstDayOfWeek - 1 + daysInMonth) + 1;
                        dateText = nextMonthDate.toString();
                        isOtherMonth = true;
                    }
                    
                    // 设置日期文本
                    const dateTextEl = dateCell.createEl('span', { 
                        text: dateText, 
                        cls: 'task-modal-calendar-date-text' 
                    });
                    
                    // 添加特殊样式
                    if (isStartDate) {
                        dateCell.addClass('task-modal-calendar-date-start');
                    } else if (isEndDate) {
                        dateCell.addClass('task-modal-calendar-date-end');
                    } else if (isInRange) {
                        dateCell.addClass('task-modal-calendar-date-range');
                    } else if (isToday) {
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
                                const selectedDate = new Date(currentYear, currentMonth, parseInt(dateText));
                                
                                // 根据当前选择模式处理日期选择
                                if (isSelectingStartDate) {
                                    // 选择开始日期的逻辑
                                    this.selectedStartDate = selectedDate;
                                    if (selectedDate >= this.selectedEndDate) {
                                        // 如果开始日期大于等于结束日期，更新结束日期为开始日期的第二天
                                        this.selectedEndDate = new Date(selectedDate);
                                        this.selectedEndDate.setDate(this.selectedEndDate.getDate() + 1);
                                    }
                                } else {
                                    // 选择结束日期的逻辑
                                    this.selectedEndDate = selectedDate;
                                    if (selectedDate <= this.selectedStartDate) {
                                        // 如果结束日期小于等于开始日期，更新开始日期为结束日期的前一天
                                        this.selectedStartDate = new Date(selectedDate);
                                        this.selectedStartDate.setDate(this.selectedStartDate.getDate() - 1);
                                    }
                                }
                                
                                // 更新日期显示
                                const startDateTextEl = startDateDisplay.querySelector('.task-modal-date-text') as HTMLElement;
                                const endDateTextEl = endDateDisplay.querySelector('.task-modal-date-text') as HTMLElement;
                                
                                if (startDateTextEl) {
                                    startDateTextEl.textContent = formatDateDisplay(this.selectedStartDate);
                                }
                                
                                if (endDateTextEl) {
                                    endDateTextEl.textContent = formatDateDisplay(this.selectedEndDate);
                                }
                                
                                // 重新生成日历以更新选中状态
                                generateCalendar();
                            }
                        }
                    });
                }
            }
        };
        
        // 生成初始日历
        generateCalendar();
        
        // 上一月按钮点击事件
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            yearMonthText.textContent = `${currentYear}年${currentMonth + 1}月`;
            generateCalendar();
        });
        
        // 下一月按钮点击事件
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            yearMonthText.textContent = `${currentYear}年${currentMonth + 1}月`;
            generateCalendar();
        });
        
        // 公历/农历切换
        solarBtn.addEventListener('click', () => {
            if (!isSolarCalendar) {
                isSolarCalendar = true;
                solarBtn.addClass('task-modal-calendar-type-btn-active');
                lunarBtn.removeClass('task-modal-calendar-type-btn-active');
                generateCalendar();
            }
        });
        
        lunarBtn.addEventListener('click', () => {
            if (isSolarCalendar) {
                isSolarCalendar = false;
                lunarBtn.addClass('task-modal-calendar-type-btn-active');
                solarBtn.removeClass('task-modal-calendar-type-btn-active');
                // 这里可以添加农历日历的生成逻辑
                generateCalendar();
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
    
    private populateTaskData() {
        if (!this.task) return;
        
        // 填充任务数据到表单
        this.titleInput.value = this.task.text;
        
        // 解析任务文本，提取各种信息
        const taskText = this.task.text;
        
        // 提取日期信息
        const dateMatch = taskText.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1]) {
            // 检查是否有时间范围
            const timeMatch = taskText.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
            if (timeMatch && timeMatch[1] && timeMatch[2]) {
                this.fullDayToggle.checked = false;
                this.startTimeInput.value = timeMatch[1];
                this.endTimeInput.value = timeMatch[2];
                // 显示时间输入框
                this.startTimeInput.style.display = 'block';
                this.endTimeInput.style.display = 'block';
            } else {
                this.fullDayToggle.checked = true;
                // 隐藏时间输入框，保留日期显示
                this.startTimeInput.style.display = 'none';
                this.endTimeInput.style.display = 'none';
            }
        }
        
        // 提取位置信息
        const locationMatch = taskText.match(/@(\S+)/);
        if (locationMatch && locationMatch[1]) {
            this.locationInput.value = locationMatch[1];
        }
    }
    
    private async handleSave() {
        const title = this.titleInput.value.trim();
        if (!title) {
            return;
        }
        
        try {
            if (this.task) {
                // 更新现有任务
                await this.updateTask(title);
            } else {
                // 创建新任务
                await this.createTask(title);
            }
        } catch (error) {
            console.error('Failed to save task:', error);
        }
    }
    
    private async createTask(title: string) {
        // 构建任务文本
        let taskText = title;
        
        // 添加时间信息
        const dateStr = this.selectedStartDate.toISOString().split('T')[0];
        if (!this.fullDayToggle.checked) {
            taskText += ` ${dateStr} ${this.startTimeInput.value}-${this.endTimeInput.value}`;
        } else {
            taskText += ` ${dateStr}`;
        }
        
        // 创建任务
        await createTaskInNote(
            this.plugin.app,
            taskText,
            this.selectedStartDate,
            this.plugin.settings,
            'daily'
        );
        
        // 调用回调
        if (this.onTaskAdded) {
            await this.onTaskAdded();
        }
        
        this.close();
    }
    
    private async updateTask(title: string) {
        if (!this.task) return;
        
        // 构建更新后的任务文本
        let updatedTaskText = title;
        
        // 使用用户选择的日期
        const dateStr = this.selectedStartDate.toISOString().split('T')[0];
        
        // 添加时间信息
        if (!this.fullDayToggle.checked) {
            updatedTaskText += ` ${dateStr} ${this.startTimeInput.value}-${this.endTimeInput.value}`;
        } else {
            updatedTaskText += ` ${dateStr}`;
        }
        
        // 添加位置信息
        if (this.locationInput.value.trim()) {
            updatedTaskText += ` @${this.locationInput.value.trim()}`;
        }
        
        try {
            // 确保 this.task 存在
            if (!this.task) return;
            
            // 读取文件内容
            const file = this.plugin.app.vault.getAbstractFileByPath(this.task.filePath);
            if (file instanceof TFile) {
                const content = await this.plugin.app.vault.read(file);
                const rawText = this.task.rawText;
                
                // 构建任务的正则表达式，匹配原始任务行
                const taskRegex = new RegExp(`^\s*-\s*\[(.)\]\s*${escapeRegExp(rawText)}`, 'm');
                
                // 替换任务文本
                const newContent = content.replace(taskRegex, (match, status) => {
                    return match.replace(rawText, updatedTaskText);
                });
                
                // 保存修改后的内容
                await this.plugin.app.vault.modify(file, newContent);
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
        
        // 调用回调
        if (this.onTaskUpdated) {
            await this.onTaskUpdated();
        }
        
        this.close();
    }
    
    private formatDate(date: Date): string {
        return `${date.getMonth() + 1}月 ${date.getDate()}日`;
    }
    
    /**
     * 更新日期显示
     */
    private updateDateDisplay(startDateDisplay: HTMLElement, endDateDisplay: HTMLElement) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const startWeekday = weekdays[this.selectedStartDate.getDay()];
        const endWeekday = weekdays[this.selectedEndDate.getDay()];
        
        startDateDisplay.textContent = `${this.selectedStartDate.getMonth() + 1}月 ${this.selectedStartDate.getDate()}日 ${startWeekday}`;
        endDateDisplay.textContent = `${this.selectedEndDate.getMonth() + 1}月 ${this.selectedEndDate.getDate()}日 ${endWeekday}`;
    }
}
