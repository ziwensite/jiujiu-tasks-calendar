import { Modal, App, Notice } from 'obsidian';
import { t } from '../i18n';
import { TagManager } from '../services/tagManager';

interface PromptModalOptions {
    app: App;
    title: string;
    placeholder: string;
    inputMethod: 'single-line' | 'multi-line';
    defaultValue?: string;
    onSubmit: (value: string) => void;
}

// 自定义补全项接口
interface CompletionItem {
    label: string;
    value: string;
    description?: string;
    type: 'note' | 'tag' | 'mention';
}

// 输入框上下文接口，模拟EditorSuggestContext
interface InputSuggestContext {
    inputEl: HTMLInputElement | HTMLTextAreaElement;
    cursorPos: number;
    textBeforeCursor: string;
}

// 基于Obsidian的EditorSuggest API设计的补全类
export class InputSuggest {
    private app: App;
    private inputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
    private suggestionsEl: HTMLElement | null = null;
    private completionItems: CompletionItem[] = [];
    private selectedIndex: number = -1;
    private _isOpen: boolean = false;
    private debounceTimer: number | null = null;
    private lastQuery: string = '';
    private tagManager: TagManager;

    get isOpen(): boolean {
        return this._isOpen;
    }

    constructor(app: App) {
        this.app = app;
        this.tagManager = new TagManager(app);
    }

    // 绑定到输入框
    bindToInput(inputEl: HTMLInputElement | HTMLTextAreaElement) {
        this.inputEl = inputEl;
        
        // 添加输入事件监听，带防抖
inputEl.addEventListener('input', this.handleInput);

        inputEl.addEventListener('keydown', this.handleKeydown);

        document.addEventListener('mousedown', this.handleClickOutside);
        
        // 添加无障碍属性
        inputEl.setAttribute('aria-autocomplete', 'list');
        inputEl.setAttribute('aria-expanded', 'false');
    }

    // 移除绑定
    unbind() {
        if (this.inputEl) {
            this.inputEl.removeEventListener('input', this.handleInput);
            this.inputEl.removeEventListener('keydown', this.handleKeydown);
            this.inputEl.removeAttribute('aria-autocomplete');
            this.inputEl.removeAttribute('aria-expanded');
        }
        document.removeEventListener('mousedown', this.handleClickOutside);
        this.close();
        this.inputEl = null;
    }

    // 防抖处理输入事件
    private handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement | HTMLTextAreaElement;
        const value = input.value;
        const cursorPos = input.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPos);
        
        // 清除之前的防抖定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // 设置新的防抖定时器
        this.debounceTimer = window.setTimeout(() => {
            this.getSuggestions(textBeforeCursor);
        }, 100);
    }

    // 处理键盘事件
    private handleKeydown = (e: KeyboardEvent) => {
        if (!this._isOpen) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                if (this.selectedIndex >= 0) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.selectSuggestion();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    // 处理点击外部事件
    private handleClickOutside = (e: MouseEvent) => {
        if (this._isOpen && this.suggestionsEl && !this.suggestionsEl.contains(e.target as Node)) {
            this.close();
        }
    }

    // 获取补全建议
    private getSuggestions(textBeforeCursor: string) {
        if (!this.inputEl) return;
        
        // 检测补全类型
        const cursorPos = this.inputEl.selectionStart || 0;
        
        // 检测[[ 笔记链接补全
        const noteMatch = textBeforeCursor.match(/\[\[(.*)$/);
        if (noteMatch && noteMatch[1]) {
            const query = noteMatch[1].toLowerCase();
            this.showSuggestions(this.getNoteSuggestions(query), cursorPos);
            return;
        }
        
        // 检测# 标签补全，支持嵌套标签
        const tagMatch = textBeforeCursor.match(/#([^\s#]*)$/);
        if (tagMatch) {
            const query = (tagMatch[1] || '').toLowerCase();
            this.lastQuery = query;
            this.showSuggestions(this.getTagSuggestions(query), cursorPos);
            return;
        }
        
        // 没有匹配的补全类型，关闭建议
        this.close();
    }

    // 显示补全建议
    private showSuggestions(suggestions: CompletionItem[], cursorPos: number) {
        if (!this.inputEl) return;
        
        // 如果没有建议，关闭
        if (suggestions.length === 0) {
            this.close();
            return;
        }
        
        // 关闭之前的建议
        this.close();
        
        // 设置建议项和选中索引
        this.completionItems = suggestions;
        this.selectedIndex = 0;
        
        // 创建建议容器
        this.suggestionsEl = document.createElement('div');
        this.suggestionsEl.className = 'prompt-suggestions';
        this.suggestionsEl.style.minWidth = `${this.inputEl.offsetWidth}px`;
        
        // 设置无障碍属性
        this.suggestionsEl.setAttribute('role', 'listbox');
        this.suggestionsEl.setAttribute('aria-label', 'Suggestions');
        
        // 计算位置
        const rect = this.inputEl.getBoundingClientRect();
        this.suggestionsEl.style.left = `${rect.left + window.scrollX}px`;
        this.suggestionsEl.style.top = `${rect.bottom + window.scrollY}px`;
        
        // 添加建议项
        suggestions.forEach((item, index) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'prompt-suggestion-item';
            
            // 无障碍属性
            suggestionItem.setAttribute('role', 'option');
            suggestionItem.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            
            // 根据类型显示不同的图标
            let icon = '';
            switch (item.type) {
                case 'note':
                    icon = '📄';
                    break;
                case 'tag':
                    icon = '🏷️';
                    break;
                case 'mention':
                    icon = '@';
                    break;
            }
            
            const iconEl = document.createElement('span');
            iconEl.textContent = icon;
            iconEl.style.marginRight = '8px';
            
            const labelEl = document.createElement('span');
            labelEl.textContent = item.label;
            labelEl.style.flex = '1';
            
            // 添加高亮
            if (item.type === 'tag' && this.lastQuery) {
                this.highlightText(labelEl, item.label, this.lastQuery);
            }
            
            suggestionItem.appendChild(iconEl);
            suggestionItem.appendChild(labelEl);
            
            if (item.description) {
                const descEl = document.createElement('span');
                descEl.textContent = item.description;
                descEl.style.fontSize = '12px';
                descEl.style.color = 'var(--text-muted)';
                suggestionItem.appendChild(descEl);
            }
            
            // 鼠标事件
            suggestionItem.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
            
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectSuggestion();
            });
            
            this.suggestionsEl!.appendChild(suggestionItem);
        });
        
        // 添加到文档
        document.body.appendChild(this.suggestionsEl);
        this._isOpen = true;
        
        // 更新输入框的无障碍属性
        this.inputEl.setAttribute('aria-expanded', 'true');
        
        // 更新选择状态
        this.updateSelection();
    }

    // 高亮匹配文本
    private highlightText(el: HTMLElement, text: string, query: string) {
        if (!query) {
            el.textContent = text;
            return;
        }
        
        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerText.indexOf(lowerQuery);
        
        if (index === -1) {
            el.textContent = text;
            return;
        }
        
        el.empty();
        
        // 添加匹配前的文本
        el.appendChild(document.createTextNode(text.substring(0, index)));
        
        // 添加匹配的文本（高亮）
        const highlightEl = document.createElement('span');
        highlightEl.style.backgroundColor = 'var(--text-selection)';
        highlightEl.style.color = 'var(--text-on-accent)';
        highlightEl.textContent = text.substring(index, index + query.length);
        el.appendChild(highlightEl);
        
        // 添加匹配后的文本
        el.appendChild(document.createTextNode(text.substring(index + query.length)));
    }

    // 关闭补全建议
    private close() {
        if (this.suggestionsEl) {
            document.body.removeChild(this.suggestionsEl);
            this.suggestionsEl = null;
        }
        
        this._isOpen = false;
        this.selectedIndex = -1;
        
        // 更新输入框的无障碍属性
        if (this.inputEl) {
            this.inputEl.setAttribute('aria-expanded', 'false');
        }
    }

    // 选择下一个建议
    private selectNext() {
        if (!this._isOpen || !this.suggestionsEl) return;
        
        this.selectedIndex = (this.selectedIndex + 1) % this.completionItems.length;
        this.updateSelection();
    }

    // 选择上一个建议
    private selectPrevious() {
        if (!this._isOpen || !this.suggestionsEl) return;
        
        this.selectedIndex = (this.selectedIndex - 1 + this.completionItems.length) % this.completionItems.length;
        this.updateSelection();
    }

    // 更新选择状态
    private updateSelection() {
        if (!this._isOpen || !this.suggestionsEl) return;
        
        const items = this.suggestionsEl.querySelectorAll('.prompt-suggestion-item');
        items.forEach((item, index) => {
            const htmlItem = item as HTMLElement;
            if (index === this.selectedIndex) {
                htmlItem.style.backgroundColor = 'var(--interactive-hover)';
                htmlItem.setAttribute('aria-selected', 'true');
                
                // 滚动到选中项
                htmlItem.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth'
                });
            } else {
                htmlItem.style.backgroundColor = 'transparent';
                htmlItem.setAttribute('aria-selected', 'false');
            }
        });
    }

    // 选择建议项
    private selectSuggestion() {
        if (!this.inputEl || !this._isOpen || this.selectedIndex < 0 || this.selectedIndex >= this.completionItems.length) return;
        
        const item = this.completionItems[this.selectedIndex];
        if (!item) return;
        
        const value = this.inputEl.value;
        const cursorPos = this.inputEl.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPos);
        
        // 根据补全类型确定替换范围
        let startPos: number = 0;
        let newText: string = '';
        let newCursorPos: number = 0;
        
        // 检测[[ 笔记链接补全
        const noteMatch = textBeforeCursor.match(/\[\[(.*)$/);
        if (noteMatch) {
            startPos = textBeforeCursor.lastIndexOf('[[');
            newText = value.substring(0, startPos) + `[[${item.value}]]` + value.substring(cursorPos);
            newCursorPos = startPos + `[[${item.value}]]`.length;
        }
        // 检测# 标签补全，支持嵌套标签
        else {
            const tagMatch = textBeforeCursor.match(/#([^\s#]*)$/);
            if (tagMatch) {
                startPos = textBeforeCursor.lastIndexOf('#');
                
                // 检查#前方是否有空格，如果没有则添加一个空格
                const charBeforeHash = startPos > 0 ? value.charAt(startPos - 1) : ' ';
                const shouldAddSpace = !charBeforeHash.match(/\s/);
                
                const spacePrefix = shouldAddSpace ? ' ' : '';
                newText = value.substring(0, startPos) + `${spacePrefix}#${item.value} ` + value.substring(cursorPos);
                newCursorPos = startPos + `${spacePrefix}#${item.value} `.length;
            }
        }
        
        // 更新输入框值和光标位置
        if (newText) {
            this.inputEl.value = newText;
            this.inputEl.setSelectionRange(newCursorPos, newCursorPos);
        }
        
        // 关闭建议
        this.close();
    }

    // 获取笔记建议
    private getNoteSuggestions(query: string): CompletionItem[] {
        const suggestions: CompletionItem[] = [];
        
        // 获取所有笔记文件
        this.app.vault.getMarkdownFiles().forEach(file => {
            const fileName = file.basename.toLowerCase();
            const filePath = file.path;
            
            // 匹配查询
            if (fileName.includes(query) || filePath.toLowerCase().includes(query)) {
                suggestions.push({
                    label: file.basename,
                    value: file.basename,
                    description: filePath,
                    type: 'note'
                });
            }
        });
        
        // 按匹配程度排序
        return suggestions.sort((a, b) => {
            const aMatch = a.label.toLowerCase().startsWith(query) ? 0 : 1;
            const bMatch = b.label.toLowerCase().startsWith(query) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
            return a.label.localeCompare(b.label);
        });
    }

    // 获取标签建议
    private getTagSuggestions(query: string): CompletionItem[] {
        const suggestions: CompletionItem[] = [];
        
        // 使用TagManager获取标签数据
        const tagPrefix = query ? `#${query}` : '#';
        const tagInfos = this.tagManager.getTagsByPrefix(tagPrefix);
        
        // 遍历所有标签
        tagInfos.forEach(tagInfo => {
            // 移除开头的#
            const tagName = tagInfo.name.startsWith('#') ? tagInfo.name.slice(1) : tagInfo.name;
            
            suggestions.push({
                label: tagName,
                value: tagName,
                description: `${tagInfo.count}${t('次使用')}`,
                type: 'tag'
            });
        });
        
        // 按匹配程度和使用次数排序
        return suggestions.sort((a, b) => {
            // 先按匹配程度排序
            const aExactMatch = a.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
            const bExactMatch = b.label.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
            if (aExactMatch !== bExactMatch) return aExactMatch - bExactMatch;
            
            // 再按标签层级深度排序（层级浅的在前）
            const aDepth = a.label.split('/').length;
            const bDepth = b.label.split('/').length;
            if (aDepth !== bDepth) return aDepth - bDepth;
            
            // 最后按使用次数排序
            const aCount = parseInt(a.description?.split(' ')[0] || '0');
            const bCount = parseInt(b.description?.split(' ')[0] || '0');
            return bCount - aCount;
        });
    }
}

export class PromptModal extends Modal {
    private title: string;
    private placeholder: string;
    private inputMethod: 'single-line' | 'multi-line';
    private defaultValue?: string;
    private onSubmit: (value: string) => void;
    private inputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
    private inputSuggest: InputSuggest;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(options: PromptModalOptions) {
        super(options.app);
        this.title = options.title;
        this.placeholder = options.placeholder;
        this.inputMethod = options.inputMethod;
        this.defaultValue = options.defaultValue;
        this.onSubmit = options.onSubmit;
        this.inputSuggest = new InputSuggest(options.app);
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

        // 绑定补全功能
        if (this.inputEl) {
            this.inputSuggest.bindToInput(this.inputEl);
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

        multiLineToggle.createSpan({ text: t('多行输入') });
        toggleCheckbox.checked = this.inputMethod === 'multi-line';

        toggleCheckbox.addEventListener('change', () => {
            // 切换输入方法
            const newInputMethod = toggleCheckbox.checked ? 'multi-line' : 'single-line';
            if (newInputMethod !== this.inputMethod) {
                this.inputMethod = newInputMethod;
                // 重新创建输入框
                content.empty();
                
                // 解绑旧输入框的补全
                if (this.inputEl) {
                    this.inputSuggest.unbind();
                }
                
                // 创建新输入框
                if (this.inputMethod === 'single-line') {
const placeholder = this.placeholder ? `${this.placeholder} (${t('回车确定')})` : t('回车确定');
                    this.inputEl = content.createEl('input', {
                        type: 'text',
                        placeholder: placeholder,
                        value: this.inputEl?.value || '',
                        cls: 'prompt-modal-input'
                    });
                } else {
const placeholder = this.placeholder ? `${this.placeholder} (${t('ctrl+回车 确定')})` : t('ctrl+回车 确定');
                    this.inputEl = content.createEl('textarea', {
                        placeholder: placeholder,
                        cls: 'prompt-modal-textarea'
                    });
                    (this.inputEl as HTMLTextAreaElement).value = this.inputEl?.value || '';
                    (this.inputEl as HTMLTextAreaElement).rows = 4;
                }
                
                // 绑定新输入框的补全
                if (this.inputEl) {
                    this.inputSuggest.bindToInput(this.inputEl);
                }
                
                // 重新聚焦输入框
                this.inputEl?.focus();
            }
        });

        const cancelBtn = footer.createEl('button', {
            text: t('取消'),
            cls: 'prompt-modal-btn prompt-modal-btn-cancel'
        });

        const submitBtn = footer.createEl('button', {
            text: t('确定'),
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
        if (this.inputEl) {
            this.keydownHandler = (event: KeyboardEvent) => {
                // 检查是否有标签建议显示，如果有，则不触发提交
                if (this.inputSuggest.isOpen) {
                    return;
                }
                
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
            };
            this.inputEl.addEventListener('keydown', this.keydownHandler);
        }

        // Focus input
        this.inputEl?.focus();
        if (this.defaultValue && this.inputEl) {
            this.inputEl.select();
        }
    }

    private handleSubmit() {
        if (!this.inputEl) return;
        
        const value = this.inputEl.value.trim();
        if (!value) {
            new Notice(t('请输入内容'), 2000);
            return;
        }

        this.onSubmit(value);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        
        // 解绑补全功能
        this.inputSuggest.unbind();
        
        // 移除keydown事件监听
        if (this.inputEl && this.keydownHandler) {
            this.inputEl.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        contentEl.empty();
    }
}
