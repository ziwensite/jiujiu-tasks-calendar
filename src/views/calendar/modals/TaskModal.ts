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
        
        // 初始化选中的日期，默认使用传入的日期
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
        tabs.createEl('button', {
            text: '事件',
            cls: 'task-modal-tab task-modal-tab-active'
        });
        tabs.createEl('button', {
            text: '提醒',
            cls: 'task-modal-tab'
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
        
        this.fullDayToggle = fullDayRow.createEl('input', {
            type: 'checkbox',
            cls: 'task-modal-full-day-toggle'
        });
        this.fullDayToggle.id = 'full-day-toggle';
        
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
        
        // 开始日期显示
        const startDateDisplay = startDateTimeRow.createEl('div', { cls: 'task-modal-date-display' });
        startDateDisplay.createEl('div', { text: '1月 12日 周一', cls: 'task-modal-date-text' });
        this.startTimeInput = startDateDisplay.createEl('input', {
            type: 'time',
            value: getNextHour(this.date),
            cls: 'task-modal-time-input'
        });
        
        // 箭头
        startDateTimeRow.createEl('span', { text: '→', cls: 'task-modal-arrow' });
        
        // 结束日期时间
        const endDateDisplay = startDateTimeRow.createEl('div', { cls: 'task-modal-date-display' });
        endDateDisplay.createEl('div', { text: '1月 12日 周一', cls: 'task-modal-date-text' });
        this.endTimeInput = endDateDisplay.createEl('input', {
            type: 'time',
            value: endHour.toTimeString().slice(0, 5),
            cls: 'task-modal-time-input'
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
            } else {
                this.fullDayToggle.checked = true;
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
        const dateStr = this.date.toISOString().split('T')[0];
        if (!this.fullDayToggle.checked) {
            taskText += ` ${dateStr} ${this.startTimeInput.value}-${this.endTimeInput.value}`;
        } else {
            taskText += ` ${dateStr}`;
        }
        
        // 添加位置信息
        if (this.locationInput.value.trim()) {
            taskText += ` @${this.locationInput.value.trim()}`;
        }
        
        // 创建任务
        await createTaskInNote(
            this.plugin.app,
            taskText,
            this.date,
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
        
        // 提取原任务中的日期信息
        const dateMatch = this.task.text.match(/(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : this.date.toISOString().split('T')[0];
        
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
