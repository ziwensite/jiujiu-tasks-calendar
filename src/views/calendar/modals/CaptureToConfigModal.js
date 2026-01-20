import { Modal, Setting } from 'obsidian';
import { FileSelectModal } from '../../../modals/FileSelectModal';
export class CaptureToConfigModal extends Modal {
    constructor(options) {
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
    addLocationSettings(container) {
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
            let defaultCapturePathInputEl = null;
            new Setting(container)
                .setName('默认插入文件路径')
                .setDesc('选择文件或使用格式化路径（例如：{{date}}-notes.md）')
                .addText(text => {
                defaultCapturePathInputEl = text.inputEl;
                text
                    .setValue(this.config.defaultCapturePath)
                    .setPlaceholder('例如：{{日记}}')
                    .onChange(value => {
                    this.config.defaultCapturePath = value;
                });
            })
                .addButton(button => button
                .setButtonText('选择')
                .onClick(() => {
                new FileSelectModal(this.app, (file) => {
                    this.config.defaultCapturePath = file.path;
                    // 更新输入框值
                    if (defaultCapturePathInputEl) {
                        defaultCapturePathInputEl.value = file.path;
                    }
                }).open();
            }));
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
                    let templatePathInputEl = null;
                    new Setting(container)
                        .setName('模板路径')
                        .setDesc('选择要使用的模板文件')
                        .addText(text => {
                        templatePathInputEl = text.inputEl;
                        text
                            .setValue(this.config.createFileIfItDoesntExist.template)
                            .setPlaceholder('例如：模板/日记模板')
                            .onChange(value => {
                            this.config.createFileIfItDoesntExist.template = value;
                        });
                    })
                        .addButton(button => button
                        .setButtonText('选择')
                        .onClick(() => {
                        new FileSelectModal(this.app, (file) => {
                            this.config.createFileIfItDoesntExist.template = file.path;
                            // 更新输入框值
                            if (templatePathInputEl) {
                                templatePathInputEl.value = file.path;
                            }
                        }).open();
                    }));
                }
            }
        }
    }
    addPositionSettings(container) {
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
            }
            else if (this.config.insertAfter.enabled) {
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
                }
                else if (value === 'after') {
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
                    this.config.insertAfter.createIfNotFoundLocation = value;
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
                    this.config.newLineCapture.direction = value;
                }));
            }
        }
    }
    addLinkingSettings(container) {
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
    addContentSettings(container) {
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
        // 自动添加创建日期
        const createdDateSetting = new Setting(container)
            .setName('自动添加创建日期')
            .setDesc('自动为捕获的内容添加创建日期')
            .addToggle(toggle => toggle
            .setValue(this.config.autoAddCreatedDate)
            .onChange(value => {
            this.config.autoAddCreatedDate = value;
        }));
        // 自动添加截止日期
        const dueDateSetting = new Setting(container)
            .setName('自动添加截止日期')
            .setDesc('自动为捕获的内容添加截止日期')
            .addToggle(toggle => toggle
            .setValue(this.config.autoAddDueDate)
            .onChange(value => {
            this.config.autoAddDueDate = value;
            // 重新渲染设置
            this.onOpen();
        }));
        // 截止日期选项
        if (this.config.autoAddDueDate) {
            new Setting(container)
                .setName('截止日期计算方式')
                .setDesc('选择自动添加截止日期的计算方式')
                .addDropdown(dropdown => {
                dropdown.addOption("today", "当天");
                dropdown.addOption("custom", "自定义天数");
                dropdown.addOption("weekend", "本周末");
                dropdown.addOption("monthEnd", "本月底");
                dropdown.addOption("yearEnd", "本年底");
                dropdown.setValue(this.config.dueDateOption)
                    .onChange(value => {
                    this.config.dueDateOption = value;
                    // 重新渲染设置
                    this.onOpen();
                });
            });
            // 自定义天数输入框，只有当选择自定义天数时才显示
            if (this.config.dueDateOption === "custom") {
                new Setting(container)
                    .setName('自定义天数')
                    .setDesc('设置自定义截止日期的天数')
                    .addText(text => text
                    .setPlaceholder("输入天数")
                    .setValue(this.config.customDueDays.toString())
                    .onChange((value) => {
                    const days = parseInt(value);
                    if (!isNaN(days)) {
                        this.config.customDueDays = days;
                    }
                }));
            }
        }
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
        }
        else if (!this.config.format.format) {
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
    updatePreview(textArea, previewEl) {
        const format = textArea.value || "{{TASK_TEXT}}\n";
        const previewText = format
            .replace(/\{\{TASK_TEXT\}\}/g, "示例任务内容")
            .replace(/\{\{DATE\}\}/g, new Date().toLocaleString());
        previewEl.textContent = previewText;
    }
    addBehaviorSettings(container) {
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
                    this.config.fileOpening.location = value;
                }));
                new Setting(container)
                    .setName('拆分方向')
                    .addDropdown(dropdown => dropdown
                    .addOption('vertical', '垂直')
                    .addOption('horizontal', '水平')
                    .setValue(this.config.fileOpening.direction)
                    .onChange(value => {
                    this.config.fileOpening.direction = value;
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
                    this.config.fileOpening.mode = value;
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
    addHotkeySettings(container) {
        // Hotkey
        new Setting(container)
            .setName('快捷键')
            .setDesc('设置触发此配置的快捷键（例如：Ctrl+Alt+K），留空则禁用')
            .addText(text => {
            // 显示当前快捷键
            let currentHotkey = '';
            if (this.config.hotkey) {
                const modifiers = this.config.hotkey.modifiers.map(mod => {
                    if (mod === 'Mod')
                        return 'Ctrl';
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
                    if (mod === 'Ctrl')
                        return 'Mod';
                    if (mod === 'Cmd')
                        return 'Mod';
                    return mod;
                }).filter(Boolean);
                this.config.hotkey = {
                    modifiers,
                    key
                };
            });
        });
    }
    addInputMethodSettings(container) {
        // Input Method
        new Setting(container)
            .setName('输入方式')
            .setDesc('选择触发此配置时的输入方式')
            .addDropdown(dropdown => {
            dropdown.addOption('single-line', '单行输入')
                .addOption('multi-line', '多行输入')
                .addOption('none', '不输入')
                .setValue(this.config.inputMethod || 'single-line')
                .onChange(value => {
                this.config.inputMethod = value;
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FwdHVyZVRvQ29uZmlnTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJDYXB0dXJlVG9Db25maWdNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsS0FBSyxFQUFlLE9BQU8sRUFBa0MsTUFBTSxVQUFVLENBQUM7QUFHdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBUWxFLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxLQUFLO0lBSzNDLFlBQVksT0FBb0M7UUFDNUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWTtRQUN0RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDakMsQ0FBQztJQUVELE1BQU07UUFDRixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDbkQsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ25DLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQztRQUVsQyx5QkFBeUI7UUFDekIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLFNBQVM7UUFDVCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUs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cG9uZW50LCBUb2dnbGVDb21wb25lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBNeVBsdWdpbiB9IGZyb20gJy4uLy4uLy4uL21haW4nO1xuaW1wb3J0IHsgQ2FwdHVyZVRvQ29uZmlnIH0gZnJvbSAnLi4vLi4vLi4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgRmlsZVNlbGVjdE1vZGFsIH0gZnJvbSAnLi4vLi4vLi4vbW9kYWxzL0ZpbGVTZWxlY3RNb2RhbCc7XG5cbmludGVyZmFjZSBDYXB0dXJlVG9Db25maWdNb2RhbE9wdGlvbnMge1xuICAgIHBsdWdpbjogTXlQbHVnaW47XG4gICAgY29uZmlnOiBDYXB0dXJlVG9Db25maWc7XG4gICAgb25TYXZlOiAoY29uZmlnOiBDYXB0dXJlVG9Db25maWcpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjbGFzcyBDYXB0dXJlVG9Db25maWdNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwcml2YXRlIHBsdWdpbjogTXlQbHVnaW47XG4gICAgcHJpdmF0ZSBjb25maWc6IENhcHR1cmVUb0NvbmZpZztcbiAgICBwcml2YXRlIG9uU2F2ZTogKGNvbmZpZzogQ2FwdHVyZVRvQ29uZmlnKSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogQ2FwdHVyZVRvQ29uZmlnTW9kYWxPcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKG9wdGlvbnMucGx1Z2luLmFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gb3B0aW9ucy5wbHVnaW47XG4gICAgICAgIHRoaXMuY29uZmlnID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRpb25zLmNvbmZpZykpOyAvLyBEZWVwIGNvcHlcbiAgICAgICAgdGhpcy5vblNhdmUgPSBvcHRpb25zLm9uU2F2ZTtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY2xhc3NMaXN0LmFkZCgnY2FwdHVyZS10by1jb25maWctbW9kYWwnKTtcbiAgICAgICAgY29udGVudEVsLnN0eWxlLm1heFdpZHRoID0gJzcwMHB4JztcbiAgICAgICAgY29udGVudEVsLnN0eWxlLm1hcmdpbiA9ICcwIGF1dG8nO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgY29udGVudEVsLmVtcHR5KCk7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IGNvbnRlbnRFbC5jcmVhdGVFbCgnZGl2JywgeyBjbHM6ICdjYXB0dXJlLXRvLWNvbmZpZy1oZWFkZXInIH0pO1xuICAgICAgICBoZWFkZXIuY3JlYXRlRWwoJ2gzJywgeyB0ZXh0OiBgJHt0aGlzLmNvbmZpZy5uYW1lfWAgfSk7XG5cbiAgICAgICAgLy8gQ29udGVudFxuICAgICAgICBjb25zdCBjb250ZW50ID0gY29udGVudEVsLmNyZWF0ZUVsKCdkaXYnLCB7IGNsczogJ2NhcHR1cmUtdG8tY29uZmlnLWNvbnRlbnQnIH0pO1xuXG4gICAgICAgIC8vIExvY2F0aW9uIFNlY3Rpb25cbiAgICAgICAgY29udGVudC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICfmlofku7YnIH0pO1xuICAgICAgICB0aGlzLmFkZExvY2F0aW9uU2V0dGluZ3MoY29udGVudCk7XG5cbiAgICAgICAgLy8gUG9zaXRpb24gU2VjdGlvblxuICAgICAgICBjb250ZW50LmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ+aPkuWFpeS9jee9ricgfSk7XG4gICAgICAgIHRoaXMuYWRkUG9zaXRpb25TZXR0aW5ncyhjb250ZW50KTtcblxuICAgICAgICAvLyBMaW5raW5nIFNlY3Rpb25cbiAgICAgICAgY29udGVudC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICfpk77mjqUnIH0pO1xuICAgICAgICB0aGlzLmFkZExpbmtpbmdTZXR0aW5ncyhjb250ZW50KTtcblxuICAgICAgICAvLyBDb250ZW50IFNlY3Rpb25cbiAgICAgICAgY29udGVudC5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICflhoXlrrknIH0pOyAgIFxuICAgICAgICB0aGlzLmFkZElucHV0TWV0aG9kU2V0dGluZ3MoY29udGVudCk7XG4gICAgICAgIC8vIOi+k+WFpeahhumAieaLqVxuICAgICAgICB0aGlzLmFkZENvbnRlbnRTZXR0aW5ncyhjb250ZW50KTtcblxuICAgICAgICAvLyBCZWhhdmlvciBTZWN0aW9uXG4gICAgICAgIGNvbnRlbnQuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAn6KGM5Li6JyB9KTtcbiAgICAgICAgdGhpcy5hZGRCZWhhdmlvclNldHRpbmdzKGNvbnRlbnQpO1xuICAgICAgICAvLyBIb3RrZXkgU2VjdGlvblxuICAgICAgICB0aGlzLmFkZEhvdGtleVNldHRpbmdzKGNvbnRlbnQpO1xuICAgICAgICBcblxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICAvLyDlhbPpl63nqpflj6Pml7boh6rliqjkv53lrZjphY3nva5cbiAgICAgICAgdGhpcy5vblNhdmUodGhpcy5jb25maWcpO1xuICAgICAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZExvY2F0aW9uU2V0dGluZ3MoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xuICAgICAgICAvLyBDYXB0dXJlIHRvIGFjdGl2ZSBmaWxlXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgIC5zZXROYW1lKCfmj5LlhaXlvZPliY3mtLvliqjmlofku7YnKVxuICAgICAgICAgICAgLnNldERlc2MoJ+WwhuWGheWuueaPkuWFpeWIsOW9k+WJjea0u+WKqOeahOaWh+S7tuS4rScpXG4gICAgICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuY2FwdHVyZVRvQWN0aXZlRmlsZSlcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5jYXB0dXJlVG9BY3RpdmVGaWxlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rlxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uT3BlbigpO1xuICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmNhcHR1cmVUb0FjdGl2ZUZpbGUpIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgY2FwdHVyZSBwYXRoXG4gICAgICAgICAgICBsZXQgZGVmYXVsdENhcHR1cmVQYXRoSW5wdXRFbDogSFRNTElucHV0RWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCfpu5jorqTmj5LlhaXmlofku7bot6/lvoQnKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCfpgInmi6nmlofku7bmiJbkvb/nlKjmoLzlvI/ljJbot6/lvoTvvIjkvovlpoLvvJp7e2RhdGV9fS1ub3Rlcy5tZO+8iScpXG4gICAgICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDYXB0dXJlUGF0aElucHV0RWwgPSB0ZXh0LmlucHV0RWw7XG4gICAgICAgICAgICAgICAgICAgIHRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5kZWZhdWx0Q2FwdHVyZVBhdGgpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ+S+i+Wmgu+8mnt75pel6K6wfX0nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5kZWZhdWx0Q2FwdHVyZVBhdGggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmFkZEJ1dHRvbihidXR0b24gPT4gYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KCfpgInmi6knKVxuICAgICAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgRmlsZVNlbGVjdE1vZGFsKHRoaXMuYXBwLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmRlZmF1bHRDYXB0dXJlUGF0aCA9IGZpbGUucGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmm7TmlrDovpPlhaXmoYblgLxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdENhcHR1cmVQYXRoSW5wdXRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGhJbnB1dEVsLnZhbHVlID0gZmlsZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGZpbGUgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCflpoLmnpzmlofku7bkuI3lrZjlnKjliJnliJvlu7onKVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC5lbmFibGVkKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3QuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB3aXRoIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5L2/55So5qih5p2/5Yib5bu6JylcbiAgICAgICAgICAgICAgICAgICAgLnNldERlc2MoJ+S9v+eUqOaMh+WumueahOaooeadv+WIm+W7uuaWh+S7ticpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3QuY3JlYXRlV2l0aFRlbXBsYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LmNyZWF0ZVdpdGhUZW1wbGF0ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC5jcmVhdGVXaXRoVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVtcGxhdGUgcGF0aFxuICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGVQYXRoSW5wdXRFbDogSFRNTElucHV0RWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5qih5p2/6Lev5b6EJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXREZXNjKCfpgInmi6nopoHkvb/nlKjnmoTmqKHmnb/mlofku7YnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVQYXRoSW5wdXRFbCA9IHRleHQuaW5wdXRFbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LnRlbXBsYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ+S+i+Wmgu+8muaooeadvy/ml6XorrDmqKHmnb8nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC50ZW1wbGF0ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQnV0dG9uKGJ1dHRvbiA9PiBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dCgn6YCJ5oupJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBGaWxlU2VsZWN0TW9kYWwodGhpcy5hcHAsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LnRlbXBsYXRlID0gZmlsZS5wYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6L6T5YWl5qGG5YC8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGVQYXRoSW5wdXRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlUGF0aElucHV0RWwudmFsdWUgPSBmaWxlLnBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhZGRQb3NpdGlvblNldHRpbmdzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgLy8gSW5zZXJ0IHBvc2l0aW9uIGRyb3Bkb3duXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgIC5zZXROYW1lKCfmj5LlhaXkvY3nva4nKVxuICAgICAgICAgICAgLnNldERlc2MoJ+mAieaLqeWGheWuueeahOaPkuWFpeS9jee9ricpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4ge1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbigndG9wJywgJ+mhtumDqCcpO1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbignYm90dG9tJywgJ+W6lemDqCcpO1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbignYWZ0ZXInLCAn56ug6IqC5ZCOJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGN1cnJlbnQgcG9zaXRpb25cbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFBvc2l0aW9uID0gJ3RvcCc7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnByZXBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFBvc2l0aW9uID0gJ2JvdHRvbSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5pbnNlcnRBZnRlci5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQb3NpdGlvbiA9ICdhZnRlcic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGN1cnJlbnRQb3NpdGlvbilcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IGFsbCBwb3NpdGlvbiBzZXR0aW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcucHJlcGVuZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaW5zZXJ0QWZ0ZXIuZW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5wcmVwZW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICdhZnRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5pbnNlcnRBZnRlci5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbk9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXR0aW5ncyBmb3IgXCJhZnRlclwiIHBvc2l0aW9uXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5pbnNlcnRBZnRlci5lbmFibGVkKSB7XG4gICAgICAgICAgICAvLyBBZnRlclxuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCfnq6DoioLmlofmnKwnKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCflnKjljLnphY3mraTmlofmnKznmoTnq6DoioLlkI7mj5LlhaXlhoXlrrnvvIjkvovlpoLvvJojIyDnq6DoioLmoIfpopjvvIknKVxuICAgICAgICAgICAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuaW5zZXJ0QWZ0ZXIuYWZ0ZXIpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5pbnNlcnRBZnRlci5hZnRlciA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIC8vIEluc2VydCBhdCBlbmRcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5Zyo56ug6IqC5pyr5bC+5o+S5YWlJylcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygn5Zyo5Yy56YWN55qE56ug6IqC5pyr5bC+5o+S5YWl5YaF5a65JylcbiAgICAgICAgICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmluc2VydEFmdGVyLmluc2VydEF0RW5kKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaW5zZXJ0QWZ0ZXIuaW5zZXJ0QXRFbmQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyBDb25zaWRlciBzdWJzZWN0aW9uc1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCfogIPomZHlrZDnq6DoioInKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCfkuZ/ogIPomZHljLnphY3nq6DoioLnmoTlrZDnq6DoioInKVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuaW5zZXJ0QWZ0ZXIuY29uc2lkZXJTdWJzZWN0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmluc2VydEFmdGVyLmNvbnNpZGVyU3Vic2VjdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAvLyDlpoLmnpzmnKrmib7liLDliJnliJvlu7pcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5aaC5p6c5pyq5om+5Yiw5YiZ5Yib5bu6JylcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygn5aaC5p6c5pyq5om+5Yiw5Yy56YWN55qE5paH5pys77yM5YiZ5Yib5bu65a6DJylcbiAgICAgICAgICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmluc2VydEFmdGVyLmNyZWF0ZUlmTm90Rm91bmQpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5pbnNlcnRBZnRlci5jcmVhdGVJZk5vdEZvdW5kID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLmluc2VydEFmdGVyLmNyZWF0ZUlmTm90Rm91bmQpIHtcbiAgICAgICAgICAgICAgICAvLyDliJvlu7rkvY3nva5cbiAgICAgICAgICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAgICAgICAgIC5zZXROYW1lKCfliJvlu7rkvY3nva4nKVxuICAgICAgICAgICAgICAgICAgICAuc2V0RGVzYygn5aaC5p6c5pyq5om+5Yiw5Yy56YWN55qE5paH5pys77yM5Zyo5ZOq6YeM5Yib5bu65a6DJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd0b3AnLCAn6aG26YOoJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2JvdHRvbScsICflupXpg6gnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmluc2VydEFmdGVyLmNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaW5zZXJ0QWZ0ZXIuY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uID0gdmFsdWUgYXMgJ3RvcCcgfCAnYm90dG9tJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldyBsaW5lIGNhcHR1cmUgc2V0dGluZ3NcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmNhcHR1cmVUb0FjdGl2ZUZpbGUpIHtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5paw6KGM5o+S5YWlJylcbiAgICAgICAgICAgICAgICAuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGVcbiAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLm5ld0xpbmVDYXB0dXJlLmVuYWJsZWQpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5uZXdMaW5lQ2FwdHVyZS5lbmFibGVkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDph43mlrDmuLLmn5Porr7nva5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm5ld0xpbmVDYXB0dXJlLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAgICAgICAgIC5zZXROYW1lKCfmlrDooYzmlrnlkJEnKVxuICAgICAgICAgICAgICAgICAgICAuc2V0RGVzYygn5Zyo5YWJ5qCH5LiK5pa56L+Y5piv5LiL5pa55re75Yqg5paw6KGMJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdhYm92ZScsICfkuIrmlrknKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignYmVsb3cnLCAn5LiL5pa5JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5uZXdMaW5lQ2FwdHVyZS5kaXJlY3Rpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm5ld0xpbmVDYXB0dXJlLmRpcmVjdGlvbiA9IHZhbHVlIGFzICdhYm92ZScgfCAnYmVsb3cnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhZGRMaW5raW5nU2V0dGluZ3MoY29udGFpbmVyOiBIVE1MRWxlbWVudCkge1xuICAgICAgICAvLyBBcHBlbmQgbGlua1xuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAuc2V0TmFtZSgn6ZmE5Yqg6ZO+5o6lJylcbiAgICAgICAgICAgIC5zZXREZXNjKCflnKjlvZPliY3mlofku7bkuK3pmYTliqDliLDmjZXojrfmlofku7bnmoTpk77mjqUnKVxuICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmFwcGVuZExpbmspXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuYXBwZW5kTGluayA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZENvbnRlbnRTZXR0aW5ncyhjb250YWluZXI6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIC8vIFRhc2tcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgLnNldE5hbWUoJ+S7u+WKoScpXG4gICAgICAgICAgICAuc2V0RGVzYygn5bCG5YaF5a655qC85byP5YyW5Li65Lu75YqhJylcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy50YXNrKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLnRhc2sgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gRm9ybWF0IGVuYWJsZWRcbiAgICAgICAgY29uc3QgZm9ybWF0RW5hYmxlZFNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAuc2V0TmFtZSgn5ZCv55So5qC85byPJylcbiAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5mb3JtYXQuZW5hYmxlZClcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5mb3JtYXQuZW5hYmxlZCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOiHquWKqOa3u+WKoOWIm+W7uuaXpeacn1xuICAgICAgICBjb25zdCBjcmVhdGVkRGF0ZVNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAuc2V0TmFtZSgn6Ieq5Yqo5re75Yqg5Yib5bu65pel5pyfJylcbiAgICAgICAgICAgIC5zZXREZXNjKCfoh6rliqjkuLrmjZXojrfnmoTlhoXlrrnmt7vliqDliJvlu7rml6XmnJ8nKVxuICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmF1dG9BZGRDcmVhdGVkRGF0ZSlcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5hdXRvQWRkQ3JlYXRlZERhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIFxuICAgICAgICAvLyDoh6rliqjmt7vliqDmiKrmraLml6XmnJ9cbiAgICAgICAgY29uc3QgZHVlRGF0ZVNldHRpbmcgPSBuZXcgU2V0dGluZyhjb250YWluZXIpXG4gICAgICAgICAgICAuc2V0TmFtZSgn6Ieq5Yqo5re75Yqg5oiq5q2i5pel5pyfJylcbiAgICAgICAgICAgIC5zZXREZXNjKCfoh6rliqjkuLrmjZXojrfnmoTlhoXlrrnmt7vliqDmiKrmraLml6XmnJ8nKVxuICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmF1dG9BZGREdWVEYXRlKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmF1dG9BZGREdWVEYXRlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rlxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uT3BlbigpO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIC8vIOaIquatouaXpeacn+mAiemhuVxuICAgICAgICBpZiAodGhpcy5jb25maWcuYXV0b0FkZER1ZURhdGUpIHtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5oiq5q2i5pel5pyf6K6h566X5pa55byPJylcbiAgICAgICAgICAgICAgICAuc2V0RGVzYygn6YCJ5oup6Ieq5Yqo5re75Yqg5oiq5q2i5pel5pyf55qE6K6h566X5pa55byPJylcbiAgICAgICAgICAgICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJ0b2RheVwiLCBcIuW9k+WkqVwiKTtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiY3VzdG9tXCIsIFwi6Ieq5a6a5LmJ5aSp5pWwXCIpO1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJ3ZWVrZW5kXCIsIFwi5pys5ZGo5pyrXCIpO1xuICAgICAgICAgICAgICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJtb250aEVuZFwiLCBcIuacrOaciOW6lVwiKTtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwieWVhckVuZFwiLCBcIuacrOW5tOW6lVwiKTtcbiAgICAgICAgICAgICAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5jb25maWcuZHVlRGF0ZU9wdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuZHVlRGF0ZU9wdGlvbiA9IHZhbHVlIGFzIFwidG9kYXlcIiB8IFwiY3VzdG9tXCIgfCBcIndlZWtlbmRcIiB8IFwibW9udGhFbmRcIiB8IFwieWVhckVuZFwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjeaWsOa4suafk+iuvue9rlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25PcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6Ieq5a6a5LmJ5aSp5pWw6L6T5YWl5qGG77yM5Y+q5pyJ5b2T6YCJ5oup6Ieq5a6a5LmJ5aSp5pWw5pe25omN5pi+56S6XG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcuZHVlRGF0ZU9wdGlvbiA9PT0gXCJjdXN0b21cIikge1xuICAgICAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAgICAgLnNldE5hbWUoJ+iHquWumuS5ieWkqeaVsCcpXG4gICAgICAgICAgICAgICAgICAgIC5zZXREZXNjKCforr7nva7oh6rlrprkuYnmiKrmraLml6XmnJ/nmoTlpKnmlbAnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcIui+k+WFpeWkqeaVsFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmN1c3RvbUR1ZURheXMudG9TdHJpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSgodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXlzID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNOYU4oZGF5cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuY3VzdG9tRHVlRGF5cyA9IGRheXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXRcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgLnNldE5hbWUoJ+aNleiOt+agvOW8jycpXG4gICAgICAgICAgICAuc2V0RGVzYygn5YaF5a6555qE5qC85byP77yM5pSv5oyBIHt7VEFTS19URVhUfX0g562J5Y+Y6YePJyk7XG4gICAgICAgIFxuICAgICAgICAvLyDpooTop4jljLrln59cbiAgICAgICAgY29uc3QgcHJldmlld1NlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgICAgICAgIGNsczogJ2NhcHR1cmUtZm9ybWF0LXByZXZpZXcnXG4gICAgICAgIH0pO1xuICAgICAgICBwcmV2aWV3U2VjdGlvbi5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnMTZweCc7XG4gICAgICAgIHByZXZpZXdTZWN0aW9uLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJldmlld0hlYWRlciA9IHByZXZpZXdTZWN0aW9uLmNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICAgICAgICBjbHM6ICdwcmV2aWV3LWhlYWRlcidcbiAgICAgICAgfSk7XG4gICAgICAgIHByZXZpZXdIZWFkZXIuc3R5bGUuZm9udFNpemUgPSAnMTRweCc7XG4gICAgICAgIHByZXZpZXdIZWFkZXIuc3R5bGUuZm9udFdlaWdodCA9ICdib2xkJztcbiAgICAgICAgcHJldmlld0hlYWRlci5zdHlsZS5tYXJnaW5Cb3R0b20gPSAnOHB4JztcbiAgICAgICAgcHJldmlld0hlYWRlci50ZXh0Q29udGVudCA9ICfpooTop4jmlYjmnpzvvJonO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJldmlld0VsID0gcHJldmlld1NlY3Rpb24uY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgICAgICAgIGNsczogJ3ByZXZpZXctY29udGVudCdcbiAgICAgICAgfSk7XG4gICAgICAgIHByZXZpZXdFbC5zdHlsZS5wYWRkaW5nID0gJzEycHgnO1xuICAgICAgICBwcmV2aWV3RWwuc3R5bGUuYm9yZGVyID0gJzFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlciknO1xuICAgICAgICBwcmV2aWV3RWwuc3R5bGUuYm9yZGVyUmFkaXVzID0gJzRweCc7XG4gICAgICAgIHByZXZpZXdFbC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAndmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpJztcbiAgICAgICAgcHJldmlld0VsLnN0eWxlLmZvbnRGYW1pbHkgPSAndmFyKC0tZm9udC1lZGl0b3IpJztcbiAgICAgICAgcHJldmlld0VsLnN0eWxlLmZvbnRTaXplID0gJzE0cHgnO1xuICAgICAgICBwcmV2aWV3RWwuc3R5bGUud2hpdGVTcGFjZSA9ICdwcmUtd3JhcCc7XG4gICAgICAgIFxuICAgICAgICAvLyDljZXni6zkuIDooYznmoTmlofmnKzljLrln5/vvIzmlrnkvr/ovpPlhaXovoPlpJrlhoXlrrlcbiAgICAgICAgY29uc3QgZm9ybWF0U2V0dGluZyA9IGNvbnRhaW5lci5jcmVhdGVFbCgnZGl2Jywge1xuICAgICAgICAgICAgY2xzOiAnY2FwdHVyZS1mb3JtYXQtc2V0dGluZydcbiAgICAgICAgfSk7XG4gICAgICAgIGZvcm1hdFNldHRpbmcuc3R5bGUubWFyZ2luQm90dG9tID0gJzE2cHgnO1xuICAgICAgICBmb3JtYXRTZXR0aW5nLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgICBcbiAgICAgICAgLy8g56Gu5L+dIGZvcm1hdCDlr7nosaHlkowgZm9ybWF0LmZvcm1hdCDmnInpu5jorqTlgLxcbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZy5mb3JtYXQpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLmZvcm1hdCA9IHtcbiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcm1hdDogXCJ7e1RBU0tfVEVYVH19XFxuXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY29uZmlnLmZvcm1hdC5mb3JtYXQpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlnLmZvcm1hdC5mb3JtYXQgPSBcInt7VEFTS19URVhUfX1cXG5cIjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGV4dEFyZWEgPSBmb3JtYXRTZXR0aW5nLmNyZWF0ZUVsKCd0ZXh0YXJlYScsIHtcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiAn6L6T5YWl5o2V6I635qC85byP77yM5L6L5aaC77yae3tUQVNLX1RFWFR9fSdcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyDmmL7lvI/orr7nva7lgLzvvIznoa7kv53pu5jorqTlhoXlrrnmmL7npLrlh7rmnaVcbiAgICAgICAgdGV4dEFyZWEudmFsdWUgPSB0aGlzLmNvbmZpZy5mb3JtYXQuZm9ybWF0O1xuICAgICAgICB0ZXh0QXJlYS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgICAgdGV4dEFyZWEuc3R5bGUubWluSGVpZ2h0ID0gJzEyMHB4JztcbiAgICAgICAgdGV4dEFyZWEuc3R5bGUucGFkZGluZyA9ICc4cHgnO1xuICAgICAgICB0ZXh0QXJlYS5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKSc7XG4gICAgICAgIHRleHRBcmVhLnN0eWxlLmJvcmRlclJhZGl1cyA9ICc0cHgnO1xuICAgICAgICB0ZXh0QXJlYS5zdHlsZS5mb250RmFtaWx5ID0gJ3ZhcigtLWZvbnQtZWRpdG9yKSc7XG4gICAgICAgIHRleHRBcmVhLnN0eWxlLmZvbnRTaXplID0gJzE0cHgnO1xuICAgICAgICBcbiAgICAgICAgLy8g5Yid5aeL5YyW6aKE6KeIXG4gICAgICAgIHRoaXMudXBkYXRlUHJldmlldyh0ZXh0QXJlYSwgcHJldmlld0VsKTtcbiAgICAgICAgXG4gICAgICAgIHRleHRBcmVhLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jb25maWcuZm9ybWF0LmZvcm1hdCA9IHRleHRBcmVhLnZhbHVlO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcmV2aWV3KHRleHRBcmVhLCBwcmV2aWV3RWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICBcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDmm7TmlrDpooTop4jmlYjmnpxcbiAgICAgKi9cbiAgICBwcml2YXRlIHVwZGF0ZVByZXZpZXcodGV4dEFyZWE6IEhUTUxUZXh0QXJlYUVsZW1lbnQsIHByZXZpZXdFbDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZm9ybWF0ID0gdGV4dEFyZWEudmFsdWUgfHwgXCJ7e1RBU0tfVEVYVH19XFxuXCI7XG4gICAgICAgIGNvbnN0IHByZXZpZXdUZXh0ID0gZm9ybWF0XG4gICAgICAgICAgICAucmVwbGFjZSgvXFx7XFx7VEFTS19URVhUXFx9XFx9L2csIFwi56S65L6L5Lu75Yqh5YaF5a65XCIpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx7XFx7REFURVxcfVxcfS9nLCBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCkpO1xuICAgICAgICBcbiAgICAgICAgcHJldmlld0VsLnRleHRDb250ZW50ID0gcHJldmlld1RleHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhZGRCZWhhdmlvclNldHRpbmdzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgLy8gT3BlbiBmaWxlXG4gICAgICAgIGlmICghdGhpcy5jb25maWcuY2FwdHVyZVRvQWN0aXZlRmlsZSkge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKCfmiZPlvIDmlofku7YnKVxuICAgICAgICAgICAgICAgIC5zZXREZXNjKCfmjZXojrflkI7miZPlvIDmlofku7YnKVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodG9nZ2xlID0+IHRvZ2dsZVxuICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcub3BlbkZpbGUpXG4gICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5vcGVuRmlsZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN5paw5riy5p+T6K6+572uXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uT3BlbigpO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vcGVuRmlsZSkge1xuICAgICAgICAgICAgICAgIC8vIEZpbGUgb3BlbmluZyBzZXR0aW5nc1xuICAgICAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAgICAgLnNldE5hbWUoJ+aWh+S7tuaJk+W8gOS9jee9ricpXG4gICAgICAgICAgICAgICAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncmV1c2UnLCAn6YeN55So5b2T5YmN5qCH562+JylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3RhYicsICfmlrDmoIfnrb4nKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignc3BsaXQnLCAn5ouG5YiGJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ3dpbmRvdycsICfmlrDnqpflj6MnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbGVmdC1zaWRlYmFyJywgJ+W3puS+p+i+ueagjycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdyaWdodC1zaWRlYmFyJywgJ+WPs+S+p+i+ueagjycpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuZmlsZU9wZW5pbmcubG9jYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmZpbGVPcGVuaW5nLmxvY2F0aW9uID0gdmFsdWUgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgICAgICAuc2V0TmFtZSgn5ouG5YiG5pa55ZCRJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZERyb3Bkb3duKGRyb3Bkb3duID0+IGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCd2ZXJ0aWNhbCcsICflnoLnm7QnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignaG9yaXpvbnRhbCcsICfmsLTlubMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMuY29uZmlnLmZpbGVPcGVuaW5nLmRpcmVjdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuZmlsZU9wZW5pbmcuZGlyZWN0aW9uID0gdmFsdWUgYXMgJ3ZlcnRpY2FsJyB8ICdob3Jpem9udGFsJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgICAgICAgICAgLnNldE5hbWUoJ+aJk+W8gOaooeW8jycpXG4gICAgICAgICAgICAgICAgICAgIC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbigncHJldmlldycsICfpooTop4gnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignc291cmNlJywgJ+a6kOeggScpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdsaXZlJywgJ+WunuaXticpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdsaXZlLXByZXZpZXcnLCAn5a6e5pe26aKE6KeIJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oJ2RlZmF1bHQnLCAn6buY6K6kJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5maWxlT3BlbmluZy5tb2RlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHZhbHVlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5maWxlT3BlbmluZy5tb2RlID0gdmFsdWUgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyKVxuICAgICAgICAgICAgICAgICAgICAuc2V0TmFtZSgn6I635Y+W54Sm54K5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5jb25maWcuZmlsZU9wZW5pbmcuZm9jdXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmZpbGVPcGVuaW5nLmZvY3VzID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZEhvdGtleVNldHRpbmdzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgLy8gSG90a2V5XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgIC5zZXROYW1lKCflv6vmjbfplK4nKVxuICAgICAgICAgICAgLnNldERlc2MoJ+iuvue9ruinpuWPkeatpOmFjee9rueahOW/q+aNt+mUru+8iOS+i+Wmgu+8mkN0cmwrQWx0K0vvvInvvIznlZnnqbrliJnnpoHnlKgnKVxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5pi+56S65b2T5YmN5b+r5o236ZSuXG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRIb3RrZXkgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcuaG90a2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmaWVycyA9IHRoaXMuY29uZmlnLmhvdGtleS5tb2RpZmllcnMubWFwKG1vZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kID09PSAnTW9kJykgcmV0dXJuICdDdHJsJztcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2Q7XG4gICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJysnKTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEhvdGtleSA9IG1vZGlmaWVycyA/IGAke21vZGlmaWVyc30rJHt0aGlzLmNvbmZpZy5ob3RrZXkua2V5fWAgOiB0aGlzLmNvbmZpZy5ob3RrZXkua2V5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShjdXJyZW50SG90a2V5KVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5ob3RrZXkgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6Kej5p6Q5b+r5o236ZSuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHZhbHVlLnNwbGl0KCcrJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaG90a2V5ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0UGFydCA9IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFsYXN0UGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLmhvdGtleSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gbGFzdFBhcnQudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5ob3RrZXkgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmaWVycyA9IHBhcnRzLnNsaWNlKDAsIC0xKS5tYXAobW9kID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2QgPSBtb2QudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb2QgPT09ICdDdHJsJykgcmV0dXJuICdNb2QnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtb2QgPT09ICdDbWQnKSByZXR1cm4gJ01vZCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1vZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmZpbHRlcihCb29sZWFuKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaG90a2V5ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhZGRJbnB1dE1ldGhvZFNldHRpbmdzKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgLy8gSW5wdXQgTWV0aG9kXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lcilcbiAgICAgICAgICAgIC5zZXROYW1lKCfovpPlhaXmlrnlvI8nKVxuICAgICAgICAgICAgLnNldERlc2MoJ+mAieaLqeinpuWPkeatpOmFjee9ruaXtueahOi+k+WFpeaWueW8jycpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZHJvcGRvd24gPT4ge1xuICAgICAgICAgICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbignc2luZ2xlLWxpbmUnLCAn5Y2V6KGM6L6T5YWlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZE9wdGlvbignbXVsdGktbGluZScsICflpJrooYzovpPlhaUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKCdub25lJywgJ+S4jei+k+WFpScpXG4gICAgICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLmNvbmZpZy5pbnB1dE1ldGhvZCB8fCAnc2luZ2xlLWxpbmUnKVxuICAgICAgICAgICAgICAgICAgICAub25DaGFuZ2UodmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcuaW5wdXRNZXRob2QgPSB2YWx1ZSBhcyBcInNpbmdsZS1saW5lXCIgfCBcIm11bHRpLWxpbmVcIiB8IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cbn0iXX0=