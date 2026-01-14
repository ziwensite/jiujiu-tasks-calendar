import { Modal, App, Notice } from 'obsidian';

interface PromptModalOptions {
    app: App;
    title: string;
    placeholder: string;
    inputMethod: 'single-line' | 'multi-line';
    defaultValue?: string;
    onSubmit: (value: string) => void;
}

export class PromptModal extends Modal {
    private title: string;
    private placeholder: string;
    private inputMethod: 'single-line' | 'multi-line';
    private defaultValue?: string;
    private onSubmit: (value: string) => void;
    private inputEl: HTMLInputElement | HTMLTextAreaElement;

    constructor(options: PromptModalOptions) {
        super(options.app);
        this.title = options.title;
        this.placeholder = options.placeholder;
        this.inputMethod = options.inputMethod;
        this.defaultValue = options.defaultValue;
        this.onSubmit = options.onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.classList.add('prompt-modal');

        // Header
        const header = contentEl.createEl('div', { cls: 'prompt-modal-header' });
        header.createEl('h3', { text: this.title });

        // Content
        const content = contentEl.createEl('div', { cls: 'prompt-modal-content' });

        // Input field based on input method
        if (this.inputMethod === 'single-line') {
            const placeholder = this.placeholder ? `${this.placeholder} (回车确定)` : '回车确定';
            this.inputEl = content.createEl('input', {
                type: 'text',
                placeholder: placeholder,
                value: this.defaultValue || '',
                cls: 'prompt-modal-input'
            });
        } else {
            const placeholder = this.placeholder ? `${this.placeholder} (ctrl+回车 确定)` : 'ctrl+回车 确定';
            this.inputEl = content.createEl('textarea', {
                placeholder: placeholder,
                cls: 'prompt-modal-textarea'
            });
            if (this.defaultValue) {
                (this.inputEl as HTMLTextAreaElement).value = this.defaultValue;
            }
            (this.inputEl as HTMLTextAreaElement).rows = 4;
        }

        // Footer
        const footer = contentEl.createEl('div', { cls: 'prompt-modal-footer' });

        // 多行输入切换标签
        const multiLineToggle = footer.createEl('label', {
            cls: 'prompt-modal-multiline-toggle'
        });

        const toggleCheckbox = multiLineToggle.createEl('input', {
            type: 'checkbox'
        });

        multiLineToggle.createSpan({ text: '多行输入' });
        toggleCheckbox.checked = this.inputMethod === 'multi-line';

        toggleCheckbox.addEventListener('change', () => {
            // 切换输入方法
            const newInputMethod = toggleCheckbox.checked ? 'multi-line' : 'single-line';
            if (newInputMethod !== this.inputMethod) {
                this.inputMethod = newInputMethod;
                // 重新创建输入框
                content.empty();
                if (this.inputMethod === 'single-line') {
                    const placeholder = this.placeholder ? `${this.placeholder} (回车确定)` : '回车确定';
                    this.inputEl = content.createEl('input', {
                        type: 'text',
                        placeholder: placeholder,
                        value: this.inputEl.value,
                        cls: 'prompt-modal-input'
                    });
                } else {
                    const placeholder = this.placeholder ? `${this.placeholder} (ctrl+回车 确定)` : 'ctrl+回车 确定';
                    this.inputEl = content.createEl('textarea', {
                        placeholder: placeholder,
                        cls: 'prompt-modal-textarea'
                    });
                    (this.inputEl as HTMLTextAreaElement).value = this.inputEl.value;
                    (this.inputEl as HTMLTextAreaElement).rows = 4;
                }
                // 重新添加事件监听器
                this.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (this.inputMethod === 'single-line') {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            this.handleSubmit();
                        }
                    } else {
                        if (event.key === 'Enter' && event.ctrlKey) {
                            event.preventDefault();
                            this.handleSubmit();
                        }
                    }
                });
                // 重新聚焦输入框
                this.inputEl.focus();
            }
        });

        const cancelBtn = footer.createEl('button', {
            text: '取消',
            cls: 'prompt-modal-btn prompt-modal-btn-cancel'
        });

        const submitBtn = footer.createEl('button', {
            text: '确定',
            cls: 'prompt-modal-btn prompt-modal-btn-submit'
        });

        // Event listeners
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        submitBtn.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Handle Enter key
        this.inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
            if (this.inputMethod === 'single-line') {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSubmit();
                }
            } else {
                if (event.key === 'Enter' && event.ctrlKey) {
                    event.preventDefault();
                    this.handleSubmit();
                }
            }
        });

        // Focus input
        this.inputEl.focus();
        if (this.defaultValue) {
            this.inputEl.select();
        }
    }

    private handleSubmit() {
        const value = this.inputEl.value.trim();
        if (!value) {
            new Notice('请输入内容', 2000);
            return;
        }

        this.onSubmit(value);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
