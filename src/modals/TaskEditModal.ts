import { App, Modal, Notice } from 'obsidian';
import { Task } from '../services/taskService';
import { generateTaskDateMarkers } from '../utils/taskUtils';
import { InputSuggest } from './PromptModal';
import { parseDateLabel, DATE_OPTIONS, PRIORITY_OPTIONS, getRecurrenceSuggestions, getPriorityDisplay } from '../suggest/taskProperties';
import { parseRelativeDate } from '../suggest/dateCalculator';

interface TaskEditModalOptions {
    app: App;
    task: Task;
    onSubmit: (task: Task) => void;
}

// 任务编辑结果接口
interface TaskEditResult {
    content: string;
    status: string;
    priority: string;
    startDate?: Date;
    endDate?: Date;
    plannedDate?: Date;
    createdDate?: Date;
    completedDate?: Date;
    cancelledDate?: Date;
    recurrenceRule?: string;
}

export class TaskEditModal extends Modal {
    private task: Task;
    private onSubmit: (task: Task) => void;
    private contentTextArea: HTMLTextAreaElement;
    private statusSelect: HTMLSelectElement;
    private prioritySelect: HTMLSelectElement;
    private recurrenceInput: HTMLInputElement;
    private endDateTextInput: HTMLSelectElement;
    private endDateInput: HTMLInputElement;
    private plannedDateTextInput: HTMLSelectElement;
    private plannedDateInput: HTMLInputElement;
    private startDateTextInput: HTMLSelectElement;
    private startDateInput: HTMLInputElement;
    private createdDateTextInput: HTMLSelectElement;
    private createdDateInput: HTMLInputElement;
    private completedDateTextInput: HTMLSelectElement;
    private completedDateInput: HTMLInputElement;
    private cancelledDateTextInput: HTMLSelectElement;
    private cancelledDateInput: HTMLInputElement;
    private recurrenceSuggestionsContainer: HTMLElement;
    private tagSuggestionsContainer: HTMLElement;
    private validationFeedback: HTMLElement;
    private inputSuggest: InputSuggest;
    private selectedSuggestionIndex: number = -1;
    private currentSuggestions: string[] = [];

    constructor(options: TaskEditModalOptions) {
        super(options.app);
        this.task = { ...options.task };
        this.onSubmit = options.onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        this.titleEl.textContent = '编辑任务';

        contentEl.empty();
        contentEl.style.padding = '20px';

        // Task content input - textarea for scrolling
        const contentContainer = contentEl.createDiv();
        contentContainer.style.position = 'relative';
        contentContainer.style.width = '100%';
        contentContainer.style.marginBottom = '1rem';
        
        this.contentTextArea = contentContainer.createEl('textarea');
        this.contentTextArea.placeholder = '任务内容';
        this.contentTextArea.value = this.task.text;
        this.contentTextArea.style.width = '100%';
        this.contentTextArea.style.height = '50px';
        this.contentTextArea.style.resize = 'vertical';
        this.contentTextArea.style.padding = '8px';
        this.contentTextArea.style.border = '1px solid var(--background-modifier-border)';
        this.contentTextArea.style.borderRadius = '4px';

        // Tag suggestions container
        this.tagSuggestionsContainer = contentContainer.createDiv();
        this.tagSuggestionsContainer.className = 'task-suggestions-container';
        this.tagSuggestionsContainer.style.display = 'none';

        // Status dropdown
        const statusContainer = contentEl.createDiv();
        statusContainer.style.marginBottom = '0.8rem';
        statusContainer.style.display = 'flex';
        statusContainer.style.alignItems = 'center';
        statusContainer.style.gap = '8px';
        statusContainer.style.width = '100%';

        // Status label
        const statusLabel = statusContainer.createEl('span');
        statusLabel.textContent = '状态';
        statusLabel.style.width = '40px';
        statusLabel.style.whiteSpace = 'nowrap';

        // Status select
        this.statusSelect = statusContainer.createEl('select');
        this.statusSelect.style.width = 'auto';
        this.statusSelect.style.minWidth = '60px';
        this.statusSelect.style.appearance = 'auto';
        this.statusSelect.style.padding = '4px 4px';

        const statusOptions = [
            { value: ' ', label: '待办 [ ]' },
            { value: 'x', label: '完成 [x]' },
            { value: '/', label: '进行中 [/]' },
            { value: '-', label: '取消 [-]' },
        ];

        // 初始化状态选择
        statusOptions.forEach(option => {
            const opt = this.statusSelect.createEl('option', { value: option.value });
            opt.textContent = option.label;
            if (this.task.status && option.value === this.task.status) {
                opt.selected = true;
            } else if (!this.task.status && option.value === (this.task.completed ? 'x' : ' ')) {
                opt.selected = true;
            }
        });
        
        // 如果任务已有开始日期，自动设置状态为进行中
        if (this.task.startDate && this.statusSelect.value === ' ') {
            this.statusSelect.value = '/';
        }

        this.statusSelect.addEventListener('change', (e) => {
            const newStatus = (e.target as HTMLSelectElement).value;
            const now = new Date();
            
            // 更新相应的日期字段
            if (newStatus === 'x') {
                this.completedDateInput.value = this.formatDate(now);
                this.cancelledDateInput.value = '';
            } else if (newStatus === '-') {
                this.cancelledDateInput.value = this.formatDate(now);
                this.completedDateInput.value = '';
            } else if (newStatus === '/') {
                if (!this.startDateInput.value) {
                    this.startDateInput.value = this.formatDate(now);
                }
                this.completedDateInput.value = '';
                this.cancelledDateInput.value = '';
            } else if (newStatus === ' ') {
                this.completedDateInput.value = '';
                this.cancelledDateInput.value = '';
                this.startDateInput.value = '';
            }
        });

        // Priority dropdown
        const priorityContainer = contentEl.createDiv();
        priorityContainer.style.marginBottom = '0.8rem';
        priorityContainer.style.display = 'flex';
        priorityContainer.style.alignItems = 'center';
        priorityContainer.style.gap = '8px';
        priorityContainer.style.width = '100%';

        // Priority label
        const priorityLabel = priorityContainer.createEl('span');
        priorityLabel.textContent = '优先';
        priorityLabel.style.width = '40px';
        priorityLabel.style.whiteSpace = 'nowrap';

        // Priority select
        this.prioritySelect = priorityContainer.createEl('select');
        this.prioritySelect.style.width = 'auto';
        this.prioritySelect.style.minWidth = '60px';
        this.prioritySelect.style.appearance = 'auto';
        this.prioritySelect.style.padding = '4px 4px';

        const priorityOptions = [
            { value: '', label: '无' },
            ...PRIORITY_OPTIONS.map(o => ({ value: o.value, label: getPriorityDisplay(o) })),
        ];

        priorityOptions.forEach(option => {
            const opt = this.prioritySelect.createEl('option', { value: option.value });
            opt.textContent = option.label;
            if (this.task.priority && option.value === this.task.priority) {
                opt.selected = true;
            } else if (!this.task.priority && option.value === '') {
                opt.selected = true;
            }
        });

        // Recurrence option
        const recurrenceContainer = contentEl.createDiv();
        recurrenceContainer.style.marginBottom = '0.8rem';
        recurrenceContainer.style.display = 'flex';
        recurrenceContainer.style.alignItems = 'center';
        recurrenceContainer.style.gap = '8px';
        recurrenceContainer.style.position = 'relative';
        recurrenceContainer.style.width = '100%';

        // Recurrence label
        const recurrenceLabel = recurrenceContainer.createEl('span');
        recurrenceLabel.textContent = '重复';
        recurrenceLabel.style.width = '40px';
        recurrenceLabel.style.whiteSpace = 'nowrap';
        
        // Recurrence text input
        this.recurrenceInput = recurrenceContainer.createEl('input');
        this.recurrenceInput.type = 'text';
        this.recurrenceInput.value = this.task.recurrenceRule || '';
        this.recurrenceInput.style.flex = '1';
        this.recurrenceInput.style.padding = '4px 4px';
        this.recurrenceInput.style.minWidth = '120px';
        this.recurrenceInput.placeholder = 'Try "every day when done"';

        // Recurrence emoji
        const recurrenceEmoji = recurrenceContainer.createEl('span');
        recurrenceEmoji.textContent = '🔁';
        recurrenceEmoji.style.whiteSpace = 'nowrap';

        // Suggestions container
        this.recurrenceSuggestionsContainer = recurrenceContainer.createDiv();
        this.recurrenceSuggestionsContainer.className = 'task-suggestions-container';
        this.recurrenceSuggestionsContainer.style.left = '48px';
        this.recurrenceSuggestionsContainer.style.display = 'none';

        this.selectedSuggestionIndex = -1;
        this.currentSuggestions = [];

        // Update recurrence rule
        this.recurrenceInput.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            this.selectedSuggestionIndex = -1;
            
            // Show suggestions
            const suggestions = this.getRecurrenceSuggestions(value);
            this.currentSuggestions = suggestions;
            if (suggestions.length > 0) {
                this.showSuggestions(suggestions);
            } else {
                this.hideSuggestions();
            }
        });

        this.recurrenceInput.addEventListener('focus', () => {
            const value = this.recurrenceInput.value;
            const suggestions = this.getRecurrenceSuggestions(value);
            this.currentSuggestions = suggestions;
            if (suggestions.length > 0) {
                this.showSuggestions(suggestions);
            }
        });

        this.recurrenceInput.addEventListener('blur', (e) => {
            // Delay hiding suggestions to allow click on suggestion
            setTimeout(() => {
                this.hideSuggestions();
            }, 200);
        });

        // Keyboard navigation for suggestions
        this.recurrenceInput.addEventListener('keydown', (e) => {
            if (this.recurrenceSuggestionsContainer.style.display === 'block') {
                const suggestionElements = this.recurrenceSuggestionsContainer.querySelectorAll('div');
                
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.currentSuggestions.length;
                        this.updateSelectedSuggestion(suggestionElements, this.selectedSuggestionIndex);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.selectedSuggestionIndex = this.selectedSuggestionIndex <= 0 ? this.currentSuggestions.length - 1 : this.selectedSuggestionIndex - 1;
                        this.updateSelectedSuggestion(suggestionElements, this.selectedSuggestionIndex);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.currentSuggestions.length) {
                            const selectedSuggestion = this.currentSuggestions[this.selectedSuggestionIndex];
                            if (selectedSuggestion) {
                                this.recurrenceInput.value = selectedSuggestion;
                                this.hideSuggestions();
                                this.recurrenceInput.focus();
                            }
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.hideSuggestions();
                        break;
                }
            }
        });

        // Validation feedback
        this.validationFeedback = contentEl.createDiv();
        this.validationFeedback.style.fontSize = '12px';
        this.validationFeedback.style.color = 'var(--text-muted)';
        this.validationFeedback.style.marginBottom = '0.8rem';
        this.validationFeedback.style.marginLeft = '48px';

        // Update validation feedback
        this.recurrenceInput.addEventListener('input', () => {
            const validation = this.validateRecurrence(this.recurrenceInput.value);
            this.validationFeedback.textContent = validation.parsedRecurrence;
            if (!validation.isValid) {
                this.validationFeedback.style.color = 'var(--text-error)';
            } else {
                this.validationFeedback.style.color = 'var(--text-muted)';
            }
        });

        // End date and time
        this.createDateTimePicker(
            contentEl,
            '截止',
            '📅',
            (date) => {
                // 检查截止日期是否小于开始日期
                if (this.startDateInput.value) {
                    const startDate = new Date(this.startDateInput.value);
                    const endDate = new Date(date);
                    if (endDate < startDate) {
                        this.endDateInput.value = this.startDateInput.value;
                        new Notice('截止日期不能小于开始日期', 3000);
                    }
                }
            },
            this.task.dueDate,
            true
        );

        // Planned date
        this.createDateTimePicker(
            contentEl,
            '计划',
            '⏳',
            () => {},
            this.task.plannedDate,
            false,
            'planned'
        );

        // Start date and time
        this.createDateTimePicker(
            contentEl,
            '开始',
            '🛫',
            (date) => {
                // 检查开始日期是否大于截止日期
                if (this.endDateInput.value) {
                    const startDate = new Date(date);
                    const endDate = new Date(this.endDateInput.value);
                    if (startDate > endDate) {
                        this.startDateInput.value = this.endDateInput.value;
                        new Notice('开始日期不能大于截止日期', 3000);
                    }
                }
                
                // 有开始日期表示任务已经开始，自动将状态设置为进行中
                if (this.statusSelect.value === ' ') {
                    this.statusSelect.value = '/';
                }
            },
            this.task.startDate,
            false
        );

        // Add separator between start and created
        const separator = contentEl.createDiv();
        separator.style.height = '1px';
        separator.style.backgroundColor = 'var(--background-modifier-border)';
        separator.style.margin = '1rem 0';

        // Created date
        this.createDateTimePicker(
            contentEl,
            '创建',
            '➕',
            () => {},
            this.task.createdAt,
            false,
            'created'
        );

        // Completed date
        this.createDateTimePicker(
            contentEl,
            '完成',
            '✅',
            (date) => {
                // 当设置完成日期时，自动切换到完成状态
                if (this.statusSelect.value !== 'x') {
                    this.statusSelect.value = 'x';
                }
            },
            this.task.completedDate,
            false,
            'completed'
        );

        // Cancelled date
        this.createDateTimePicker(
            contentEl,
            '取消',
            '❌',
            (date) => {
                // 当设置取消日期时，自动切换到取消状态
                if (this.statusSelect.value !== '-') {
                    this.statusSelect.value = '-';
                }
            },
            this.task.cancelledDate,
            false,
            'cancelled'
        );

        // Button bar
        const buttonBar = contentEl.createDiv();
        buttonBar.style.display = 'flex';
        buttonBar.style.justifyContent = 'flex-end';
        buttonBar.style.gap = '0.5rem';
        buttonBar.style.marginTop = '1rem';

        const cancelBtn = buttonBar.createEl('button', {
            text: '取消',
            cls: 'task-edit-modal-btn task-edit-modal-btn-cancel'
        });

        const saveBtn = buttonBar.createEl('button', {
            text: '保存',
            cls: 'task-edit-modal-btn task-edit-modal-btn-save'
        });

        // Event listeners
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        saveBtn.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Initialize InputSuggest for tag completion
        this.inputSuggest = new InputSuggest(this.app);
        this.inputSuggest.bindToInput(this.contentTextArea);

        // Focus on content input
        setTimeout(() => {
            this.contentTextArea.focus();
            this.contentTextArea.select();
        }, 100);
    }

    private handleSubmit() {
        // 验证任务数据
        const validation = this.validateTask();
        if (!validation.isValid) {
            // 显示错误信息
            validation.errors.forEach(error => {
                new Notice(error, 3000);
            });
            return;
        }

        // 更新任务

        this.task.text = this.contentTextArea.value;
        this.task.completed = this.statusSelect.value === 'x';
        // 保存任务状态
        this.task.status = this.statusSelect.value;
        // 保存任务优先级
        this.task.priority = this.prioritySelect.value || undefined;
        // 保存任务重复规则
        this.task.recurrenceRule = this.recurrenceInput.value || undefined;
        
        // 更新日期
        if (this.endDateInput.value) {
            this.task.dueDate = new Date(this.endDateInput.value);
        } else {
            this.task.dueDate = undefined;
        }
        if (this.startDateInput.value) {
            this.task.startDate = new Date(this.startDateInput.value);
        } else {
            this.task.startDate = undefined;
        }
        if (this.createdDateInput.value) {
            this.task.createdAt = new Date(this.createdDateInput.value);
        } else {
            this.task.createdAt = undefined;
        }
        if (this.plannedDateInput.value) {
            this.task.plannedDate = new Date(this.plannedDateInput.value);
        } else {
            this.task.plannedDate = undefined;
        }
        if (this.cancelledDateInput.value) {
            this.task.cancelledDate = new Date(this.cancelledDateInput.value);
        } else {
            this.task.cancelledDate = undefined;
        }
        if (this.completedDateInput.value) {
            this.task.completedDate = new Date(this.completedDateInput.value);
        } else {
            this.task.completedDate = undefined;
        }
        
        // 更新 rawText，确保下次匹配时能够正确找到任务
        this.task.rawText = this.task.text;
        this.task.rawText += generateTaskDateMarkers(this.task);
        

        this.onSubmit(this.task);
        this.close();
    }

    private createDateTimePicker(
        container: HTMLElement,
        name: string,
        emoji: string,
        onChange: (date: string) => void,
        initialDate?: Date,
        isEnd: boolean = false,
        type?: 'completed' | 'cancelled' | 'planned' | 'created'
    ) {
        const dateTimeContainer = container.createDiv();
        dateTimeContainer.style.marginBottom = '0.8rem';
        dateTimeContainer.style.display = 'flex';
        dateTimeContainer.style.alignItems = 'center';
        dateTimeContainer.style.gap = '8px';
        dateTimeContainer.style.width = '100%';

        // Create label
        const label = dateTimeContainer.createEl('span');
        label.textContent = name;
        label.style.width = '40px';
        label.style.whiteSpace = 'nowrap';

        const inputContainer = dateTimeContainer.createDiv();
        inputContainer.style.display = 'flex';
        inputContainer.style.alignItems = 'center';
        inputContainer.style.gap = '8px';
        inputContainer.style.flex = '1';

        // Dropdown select for Chinese date descriptions
        const textInput = inputContainer.createEl('select');
        textInput.id = type ? `${type}-text-input` : (isEnd ? 'end-text-input' : 'start-text-input');
        textInput.style.width = 'auto';
        textInput.style.minWidth = '60px';
        textInput.style.appearance = 'auto';
        textInput.style.padding = '4px 4px';

        // Add default option
        const defaultOption = textInput.createEl('option', { value: '' });
        defaultOption.textContent = '';

        // Add date options
        const dateOptions = ['无', ...DATE_OPTIONS.map(o => o.label)];
        dateOptions.forEach(optionText => {
            const option = textInput.createEl('option', { value: optionText });
            option.textContent = optionText;
        });

        // Add emoji icon between dropdown and date picker
        const emojiIcon = inputContainer.createEl('span');
        emojiIcon.textContent = emoji;

        // Original date picker (calendar)
        const dateInput = inputContainer.createEl('input');
        dateInput.type = 'date';
        dateInput.id = type ? `${type}-date-input` : (isEnd ? 'end-date-input' : 'start-date-input');
        dateInput.value = initialDate ? this.formatDate(initialDate) : '';
        dateInput.style.width = 'auto';
        dateInput.style.minWidth = '100px';

        // 保存对日期输入框的引用
        if (isEnd) {
            this.endDateTextInput = textInput;
            this.endDateInput = dateInput;
        } else if (type === 'planned') {
            this.plannedDateTextInput = textInput;
            this.plannedDateInput = dateInput;
        } else if (type === 'created') {
            this.createdDateTextInput = textInput;
            this.createdDateInput = dateInput;
        } else if (type === 'completed') {
            this.completedDateTextInput = textInput;
            this.completedDateInput = dateInput;
        } else if (type === 'cancelled') {
            this.cancelledDateTextInput = textInput;
            this.cancelledDateInput = dateInput;
        } else {
            this.startDateTextInput = textInput;
            this.startDateInput = dateInput;
        }

        // Event listener for text input (Chinese date descriptions)
        const updateFromTextInput = () => {
            const textValue = textInput.value;
            const parsedDate = this.parseDateInput(textValue);
            
            if (textValue === '无') {
                // Clear date
                dateInput.value = '';
                // Trigger date change event
                const dateChangeEvent = new Event('change');
                dateInput.dispatchEvent(dateChangeEvent);
            } else if (parsedDate) {
                // Update date picker
                dateInput.value = this.formatDate(parsedDate);
                // Trigger date change event
                const dateChangeEvent = new Event('change');
                dateInput.dispatchEvent(dateChangeEvent);
            }
        };

        // Event listener for date changes
        const updateDate = () => {
            const dateValue = dateInput.value;

            if (dateValue) {
                onChange(dateValue);
            }
        };

        // Add event listeners
        textInput.addEventListener('change', updateFromTextInput);
        textInput.addEventListener('blur', updateFromTextInput);
        dateInput.addEventListener('change', updateDate);
    }

    private parseDateInput(input: string): Date | null {
        const lower = input.trim();
        if (!lower) return null;
        const result = parseDateLabel(lower);
        if (result !== undefined) return result;
        const parsed = parseRelativeDate(lower);
        if (parsed) return new Date(parsed);
        return null;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private getRecurrenceSuggestions(input: string): string[] {
        return getRecurrenceSuggestions(input);
    }

    private validateRecurrence(input: string): { isValid: boolean; parsedRecurrence: string } {
        if (!input) {
            return { isValid: true, parsedRecurrence: '无重复' };
        }

        // 参考 obsidian-tasks 项目的验证逻辑
        try {
            const match = input.match(/^([a-zA-Z0-9, !]+?)( when done)?$/i);
            if (match == null) {
                return { isValid: false, parsedRecurrence: '无效的重复规则' };
            }

            const isolatedRuleText = match[1]?.trim() || '';
            const baseOnToday = match[2] !== undefined;

            // 更完整的重复规则验证
            const validPatterns = [
                /^every \d+ days?$/i,
                /^every day$/i,
                /^every \d+ weeks?$/i,
                /^every week$/i,
                /^every \d+ months?$/i,
                /^every month$/i,
                /^every \d+ years?$/i,
                /^every year$/i,
                /^every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)(, (monday|tuesday|wednesday|thursday|friday|saturday|sunday))*$/i,
            ];

            const isValid = validPatterns.some(pattern => pattern.test(isolatedRuleText));
            return {
                isValid,
                parsedRecurrence: isValid ? `重复: ${input}` : '无效的重复规则'
            };
        } catch (e) {
            return { isValid: false, parsedRecurrence: '无效的重复规则' };
        }
    }

    private validateTask(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.contentTextArea.value.trim()) {
            errors.push('任务内容不能为空');
        }

        // 验证日期
        if (this.startDateInput.value && this.endDateInput.value) {
            const startDate = new Date(this.startDateInput.value);
            const endDate = new Date(this.endDateInput.value);
            if (startDate > endDate) {
                errors.push('开始日期不能大于截止日期');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private showSuggestions(suggestions: string[]) {
        this.recurrenceSuggestionsContainer.innerHTML = '';
        suggestions.forEach((suggestion, index) => {
            const suggestionEl = this.recurrenceSuggestionsContainer.createEl('div');
            suggestionEl.textContent = suggestion;
            suggestionEl.className = 'task-suggestion-item';
            
            suggestionEl.addEventListener('click', () => {
                this.recurrenceInput.value = suggestion;
                this.hideSuggestions();
                this.recurrenceInput.focus();
            });
        });
        this.recurrenceSuggestionsContainer.style.display = 'block';
    }

    private hideSuggestions() {
        this.recurrenceSuggestionsContainer.style.display = 'none';
    }

    private updateSelectedSuggestion(suggestionElements: NodeListOf<Element>, selectedIndex: number) {
        suggestionElements.forEach((element, index) => {
            const htmlElement = element as HTMLElement;
            if (index === selectedIndex) {
                htmlElement.style.backgroundColor = 'var(--background-modifier-hover)';
                htmlElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                htmlElement.style.backgroundColor = 'transparent';
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        
        // 解绑InputSuggest
        if (this.inputSuggest) {
            this.inputSuggest.unbind();
        }
        
        contentEl.empty();
    }
}