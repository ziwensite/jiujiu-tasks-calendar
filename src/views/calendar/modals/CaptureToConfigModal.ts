import { Modal, App, Notice, Setting, TextComponent, ToggleComponent } from 'obsidian';
import { MyPlugin } from '../../../main';
import { CaptureToConfig } from '../../../settings';
import { PathAutocomplete } from '../../../components';

interface CaptureToConfigModalOptions {
    plugin: MyPlugin;
    config: CaptureToConfig;
    onSave: (config: CaptureToConfig) => void;
}

export class CaptureToConfigModal extends Modal {
    private plugin: MyPlugin;
    private config: CaptureToConfig;
    private onSave: (config: CaptureToConfig) => void;

    constructor(options: CaptureToConfigModalOptions) {
        super(options.plugin.app);
        this.plugin = options.plugin;
        this.config = JSON.parse(JSON.stringify(options.config)); // Deep copy
        this.onSave = options.onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.classList.add('capture-to-config-modal');
        contentEl.style.maxWidth = '700px';
        contentEl.style.margin = '0 auto';

        // Clear existing content
        contentEl.empty();

        // Header
        const header = contentEl.createEl('div', { cls: 'capture-to-config-header' });
        header.createEl('h3', { text: `${this.config.name}` });

        // Content
        const content = contentEl.createEl('div', { cls: 'capture-to-config-content' });

        // Location Section
        content.createEl('h4', { text: '文件' });
        this.addLocationSettings(content);

        // Position Section
        content.createEl('h4', { text: '插入位置' });
        this.addPositionSettings(content);

        // Linking Section
        content.createEl('h4', { text: '链接' });
        this.addLinkingSettings(content);

        // Content Section
        content.createEl('h4', { text: '内容' });   
        this.addInputMethodSettings(content);
        // 输入框选择
        this.addContentSettings(content);

        // Behavior Section
        content.createEl('h4', { text: '行为' });
        this.addBehaviorSettings(content);
        // Hotkey Section
        this.addHotkeySettings(content);
        

    }

    onClose() {
        const { contentEl } = this;
        // 关闭窗口时自动保存配置
        this.onSave(this.config);
        contentEl.empty();
    }

    private addLocationSettings(container: HTMLElement) {
        // Capture to active file
        new Setting(container)
            .setName('插入当前活动文件')
            .setDesc('将内容插入到当前活动的文件中')
            .addToggle(toggle => toggle
                .setValue(this.config.captureToActiveFile)
                .onChange(value => {
                    this.config.captureToActiveFile = value;
                    // 重新渲染设置
                    this.onOpen();
                }));

        if (!this.config.captureToActiveFile) {
            // Default capture path
            new Setting(container)
                .setName('默认插入文件路径')
                .setDesc('选择文件或使用格式化路径（例如：{{date}}-notes.md）')
                .addText(text => {
                    // 创建自定义路径自动完成组件
                    const containerEl = text.inputEl.parentElement;
                    if (containerEl) {
                        // 移除默认的input
                        text.inputEl.remove();
                        
                        // 创建路径自动完成组件
                        new PathAutocomplete(
                            this.app,
                            containerEl,
                            this.config.defaultCapturePath,
                            (value: string) => {
                                this.config.defaultCapturePath = value;
                            }
                        );
                    }
                });

            // Create file if it doesn't exist
            new Setting(container)
                .setName('如果文件不存在则创建')
                .addToggle(toggle => toggle
                    .setValue(this.config.createFileIfItDoesntExist.enabled)
                    .onChange(value => {
                        this.config.createFileIfItDoesntExist.enabled = value;
                        // 重新渲染设置
                        this.onOpen();
                    }));

            if (this.config.createFileIfItDoesntExist.enabled) {
                // Create with template
                new Setting(container)
                    .setName('使用模板创建')
                    .setDesc('使用指定的模板创建文件')
                    .addToggle(toggle => toggle
                        .setValue(this.config.createFileIfItDoesntExist.createWithTemplate)
                        .onChange(value => {
                            this.config.createFileIfItDoesntExist.createWithTemplate = value;
                            // 重新渲染设置
                            this.onOpen();
                        }));

                if (this.config.createFileIfItDoesntExist.createWithTemplate) {
                    // Template path
                    new Setting(container)
                        .setName('模板路径')
                        .setDesc('选择要使用的模板文件')
                        .addText(text => {
                            // 创建自定义路径自动完成组件
                            const containerEl = text.inputEl.parentElement;
                            if (containerEl) {
                                // 移除默认的input
                                text.inputEl.remove();
                                
                                // 创建路径自动完成组件
                                new PathAutocomplete(
                                    this.app,
                                    containerEl,
                                    this.config.createFileIfItDoesntExist.template,
                                    (value: string) => {
                                        this.config.createFileIfItDoesntExist.template = value;
                                    }
                                );
                            }
                        });
                }
            }
        }
    }

    private addPositionSettings(container: HTMLElement) {
        // Insert position dropdown
        new Setting(container)
            .setName('插入位置')
            .setDesc('选择内容的插入位置')
            .addDropdown(dropdown => {
                dropdown.addOption('top', '顶部');
                dropdown.addOption('bottom', '底部');
                dropdown.addOption('after', '章节后');
                
                // Determine current position
                let currentPosition = 'top';
                if (this.config.prepend) {
                    currentPosition = 'bottom';
                } else if (this.config.insertAfter.enabled) {
                    currentPosition = 'after';
                }
                
                dropdown.setValue(currentPosition)
                    .onChange(value => {
                        // Reset all position settings
                        this.config.prepend = false;
                        this.config.insertAfter.enabled = false;
                        
                        // Set selected position
                        if (value === 'bottom') {
                            this.config.prepend = true;
                        } else if (value === 'after') {
                            this.config.insertAfter.enabled = true;
                        }
                        // 重新渲染设置
                        this.onOpen();
                    });
            });

        // Settings for "after" position
        if (this.config.insertAfter.enabled) {
            // After
            new Setting(container)
                .setName('章节文本')
                .setDesc('在匹配此文本的章节后插入内容（例如：## 章节标题）')
                .addText(text => text
                    .setValue(this.config.insertAfter.after)
                    .onChange(value => {
                        this.config.insertAfter.after = value;
                    }));

            // Insert at end
            new Setting(container)
                .setName('在章节末尾插入')
                .setDesc('在匹配的章节末尾插入内容')
                .addToggle(toggle => toggle
                    .setValue(this.config.insertAfter.insertAtEnd)
                    .onChange(value => {
                        this.config.insertAfter.insertAtEnd = value;
                    }));

            // Consider subsections
            new Setting(container)
                .setName('考虑子章节')
                .setDesc('也考虑匹配章节的子章节')
                .addToggle(toggle => toggle
                    .setValue(this.config.insertAfter.considerSubsections)
                    .onChange(value => {
                        this.config.insertAfter.considerSubsections = value;
                    }));

            // 如果未找到则创建
            new Setting(container)
                .setName('如果未找到则创建')
                .setDesc('如果未找到匹配的文本，则创建它')
                .addToggle(toggle => toggle
                    .setValue(this.config.insertAfter.createIfNotFound)
                    .onChange(value => {
                        this.config.insertAfter.createIfNotFound = value;
                        // 重新渲染设置
                        this.onOpen();
                    }));

            if (this.config.insertAfter.createIfNotFound) {
                // 创建位置
                new Setting(container)
                    .setName('创建位置')
                    .setDesc('如果未找到匹配的文本，在哪里创建它')
                    .addDropdown(dropdown => dropdown
                        .addOption('top', '顶部')
                        .addOption('bottom', '底部')
                        .setValue(this.config.insertAfter.createIfNotFoundLocation)
                        .onChange(value => {
                            this.config.insertAfter.createIfNotFoundLocation = value as 'top' | 'bottom';
                        }));
            }
        }

        // New line capture settings
        if (this.config.captureToActiveFile) {
            new Setting(container)
                .setName('新行插入')
                .addToggle(toggle => toggle
                    .setValue(this.config.newLineCapture.enabled)
                    .onChange(value => {
                        this.config.newLineCapture.enabled = value;
                        // 重新渲染设置
                        this.onOpen();
                    }));

            if (this.config.newLineCapture.enabled) {
                new Setting(container)
                    .setName('新行方向')
                    .setDesc('在光标上方还是下方添加新行')
                    .addDropdown(dropdown => dropdown
                        .addOption('above', '上方')
                        .addOption('below', '下方')
                        .setValue(this.config.newLineCapture.direction)
                        .onChange(value => {
                            this.config.newLineCapture.direction = value as 'above' | 'below';
                        }));
            }
        }
    }

    private addLinkingSettings(container: HTMLElement) {
        // Append link
        new Setting(container)
            .setName('附加链接')
            .setDesc('在当前文件中附加到捕获文件的链接')
            .addToggle(toggle => toggle
                .setValue(this.config.appendLink)
                .onChange(value => {
                    this.config.appendLink = value;
                }));
    }

    private addContentSettings(container: HTMLElement) {
        // Task
        new Setting(container)
            .setName('任务')
            .setDesc('将内容格式化为任务')
            .addToggle(toggle => toggle
                .setValue(this.config.task)
                .onChange(value => {
                    this.config.task = value;
                }));

        // Format enabled
        const formatEnabledSetting = new Setting(container)
            .setName('启用格式')
            .addToggle(toggle => toggle
                .setValue(this.config.format.enabled)
                .onChange(value => {
                    this.config.format.enabled = value;
                }));
        
        // Format
        new Setting(container)
            .setName('捕获格式')
            .setDesc('内容的格式，支持 {{TASK_TEXT}} 等变量');
        
        // 预览区域
        const previewSection = container.createEl('div', {
            cls: 'capture-format-preview'
        });
        previewSection.style.marginBottom = '16px';
        previewSection.style.width = '100%';
        
        const previewHeader = previewSection.createEl('div', {
            cls: 'preview-header'
        });
        previewHeader.style.fontSize = '14px';
        previewHeader.style.fontWeight = 'bold';
        previewHeader.style.marginBottom = '8px';
        previewHeader.textContent = '预览效果：';
        
        const previewEl = previewSection.createEl('div', {
            cls: 'preview-content'
        });
        previewEl.style.padding = '12px';
        previewEl.style.border = '1px solid var(--background-modifier-border)';
        previewEl.style.borderRadius = '4px';
        previewEl.style.backgroundColor = 'var(--background-secondary)';
        previewEl.style.fontFamily = 'var(--font-editor)';
        previewEl.style.fontSize = '14px';
        previewEl.style.whiteSpace = 'pre-wrap';
        
        // 单独一行的文本区域，方便输入较多内容
        const formatSetting = container.createEl('div', {
            cls: 'capture-format-setting'
        });
        formatSetting.style.marginBottom = '16px';
        formatSetting.style.width = '100%';
        
        // 确保 format 对象和 format.format 有默认值
        if (!this.config.format) {
            this.config.format = {
                enabled: true,
                format: "{{TASK_TEXT}}\n"
            };
        } else if (!this.config.format.format) {
            this.config.format.format = "{{TASK_TEXT}}\n";
        }
        
        const textArea = formatSetting.createEl('textarea', {
            placeholder: '输入捕获格式，例如：{{TASK_TEXT}}'
        });
        
        // 显式设置值，确保默认内容显示出来
        textArea.value = this.config.format.format;
        textArea.style.width = '100%';
        textArea.style.minHeight = '120px';
        textArea.style.padding = '8px';
        textArea.style.border = '1px solid var(--background-modifier-border)';
        textArea.style.borderRadius = '4px';
        textArea.style.fontFamily = 'var(--font-editor)';
        textArea.style.fontSize = '14px';
        
        // 初始化预览
        this.updatePreview(textArea, previewEl);
        
        textArea.addEventListener('input', () => {
            this.config.format.format = textArea.value;
            this.updatePreview(textArea, previewEl);
        });

        
    }

    /**
     * 更新预览效果
     */
    private updatePreview(textArea: HTMLTextAreaElement, previewEl: HTMLElement) {
        const format = textArea.value || "{{TASK_TEXT}}\n";
        const previewText = format
            .replace(/\{\{TASK_TEXT\}\}/g, "示例任务内容")
            .replace(/\{\{DATE\}\}/g, new Date().toLocaleString());
        
        previewEl.textContent = previewText;
    }

    private addBehaviorSettings(container: HTMLElement) {
        // Open file
        if (!this.config.captureToActiveFile) {
            new Setting(container)
                .setName('打开文件')
                .setDesc('捕获后打开文件')
                .addToggle(toggle => toggle
                    .setValue(this.config.openFile)
                    .onChange(value => {
                        this.config.openFile = value;
                        // 重新渲染设置
                        this.onOpen();
                    }));

            if (this.config.openFile) {
                // File opening settings
                new Setting(container)
                    .setName('文件打开位置')
                    .addDropdown(dropdown => dropdown
                        .addOption('reuse', '重用当前标签')
                        .addOption('tab', '新标签')
                        .addOption('split', '拆分')
                        .addOption('window', '新窗口')
                        .addOption('left-sidebar', '左侧边栏')
                        .addOption('right-sidebar', '右侧边栏')
                        .setValue(this.config.fileOpening.location)
                        .onChange(value => {
                            this.config.fileOpening.location = value as any;
                        }));

                new Setting(container)
                    .setName('拆分方向')
                    .addDropdown(dropdown => dropdown
                        .addOption('vertical', '垂直')
                        .addOption('horizontal', '水平')
                        .setValue(this.config.fileOpening.direction)
                        .onChange(value => {
                            this.config.fileOpening.direction = value as 'vertical' | 'horizontal';
                        }));

                new Setting(container)
                    .setName('打开模式')
                    .addDropdown(dropdown => dropdown
                        .addOption('preview', '预览')
                        .addOption('source', '源码')
                        .addOption('live', '实时')
                        .addOption('live-preview', '实时预览')
                        .addOption('default', '默认')
                        .setValue(this.config.fileOpening.mode)
                        .onChange(value => {
                            this.config.fileOpening.mode = value as any;
                        }));

                new Setting(container)
                    .setName('获取焦点')
                    .addToggle(toggle => toggle
                        .setValue(this.config.fileOpening.focus)
                        .onChange(value => {
                            this.config.fileOpening.focus = value;
                        }));
            }
        }
    }

    private addHotkeySettings(container: HTMLElement) {
        // Hotkey
        new Setting(container)
            .setName('快捷键')
            .setDesc('设置触发此配置的快捷键（例如：Ctrl+Alt+K），留空则禁用')
            .addText(text => {
                // 显示当前快捷键
                let currentHotkey = '';
                if (this.config.hotkey) {
                    const modifiers = this.config.hotkey.modifiers.map(mod => {
                        if (mod === 'Mod') return 'Ctrl';
                        return mod;
                    }).join('+');
                    currentHotkey = modifiers ? `${modifiers}+${this.config.hotkey.key}` : this.config.hotkey.key;
                }
                text
                    .setValue(currentHotkey)
                    .onChange(value => {
                        if (!value.trim()) {
                            this.config.hotkey = null;
                            return;
                        }

                        // 解析快捷键
                        const parts = value.split('+');
                        if (parts.length === 0) {
                            this.config.hotkey = null;
                            return;
                        }
                        const lastPart = parts[parts.length - 1];
                        if (!lastPart) {
                            this.config.hotkey = null;
                            return;
                        }
                        const key = lastPart.trim();
                        if (!key) {
                            this.config.hotkey = null;
                            return;
                        }
                        const modifiers = parts.slice(0, -1).map(mod => {
                            mod = mod.trim();
                            if (mod === 'Ctrl') return 'Mod';
                            if (mod === 'Cmd') return 'Mod';
                            return mod;
                        }).filter(Boolean);

                        this.config.hotkey = {
                            modifiers,
                            key
                        };
                    });
            });
    }

    private addInputMethodSettings(container: HTMLElement) {
        // Input Method
        new Setting(container)
            .setName('输入方式')
            .setDesc('选择触发此配置时的输入方式')
            .addDropdown(dropdown => {
                dropdown.addOption('single-line', '单行输入')
                    .addOption('multi-line', '多行输入')
                    .setValue(this.config.inputMethod || 'single-line')
                    .onChange(value => {
                        this.config.inputMethod = value as "single-line" | "multi-line";
                    });
            });
    }
}