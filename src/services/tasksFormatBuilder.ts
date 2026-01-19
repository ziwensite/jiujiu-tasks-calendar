// src/services/tasksFormatBuilder.ts

/**
 * Tasks插件格式的任务文本生成器
 * 遵循Tasks插件的标准语法：https://publish.obsidian.md/tasks/Getting+Started/Create+or+edit+a+task
 */
export class TaskTextBuilder {
    private title: string = '';
    private priority: string = '';
    private createdDate?: Date;
    private scheduledDate?: Date;
    private startDate?: Date;
    private dueDate?: Date;
    private doneDate?: Date;
    private repeatRule: string = '';
    private tags: string[] = [];
    private description: string = '';
    private completed: boolean = false;
    private waitDate?: Date;
    private recurrenceRule?: string;
    private hideSubtasks?: boolean;
    private collapsed?: boolean;
    private id?: string;
    private area?: string;
    private project?: string;
    private customFields: Map<string, string> = new Map();
    
    setTitle(title: string): TaskTextBuilder {
        this.title = title;
        return this;
    }
    
    setPriority(priority: string): TaskTextBuilder {
        // Tasks插件优先级：#A, #B, #C, #D
        this.priority = priority.toUpperCase().replace(/^#/, '#');
        return this;
    }
    
    setCreatedDate(date: Date): TaskTextBuilder {
        this.createdDate = date;
        return this;
    }
    
    setScheduledDate(date: Date): TaskTextBuilder {
        this.scheduledDate = date;
        return this;
    }
    
    setStartDate(date: Date): TaskTextBuilder {
        this.startDate = date;
        return this;
    }
    
    setDueDate(date: Date): TaskTextBuilder {
        this.dueDate = date;
        return this;
    }
    
    setDoneDate(date: Date): TaskTextBuilder {
        this.doneDate = date;
        return this;
    }
    
    setWaitDate(date: Date): TaskTextBuilder {
        this.waitDate = date;
        return this;
    }
    
    setRepeatRule(rule: string): TaskTextBuilder {
        this.repeatRule = rule;
        return this;
    }
    
    setRecurrenceRule(rule: string): TaskTextBuilder {
        this.recurrenceRule = rule;
        return this;
    }
    
    addTag(tag: string): TaskTextBuilder {
        if (tag && !this.tags.includes(tag)) {
            this.tags.push(tag.startsWith('#') ? tag : `#${tag}`);
        }
        return this;
    }
    
    addTags(tags: string[]): TaskTextBuilder {
        tags.forEach(tag => this.addTag(tag));
        return this;
    }
    
    setDescription(description: string): TaskTextBuilder {
        this.description = description;
        return this;
    }
    
    setCompleted(completed: boolean): TaskTextBuilder {
        this.completed = completed;
        return this;
    }
    
    setHideSubtasks(hide: boolean): TaskTextBuilder {
        this.hideSubtasks = hide;
        return this;
    }
    
    setCollapsed(collapsed: boolean): TaskTextBuilder {
        this.collapsed = collapsed;
        return this;
    }
    
    setId(id: string): TaskTextBuilder {
        this.id = id;
        return this;
    }
    
    setArea(area: string): TaskTextBuilder {
        this.area = area;
        return this;
    }
    
    setProject(project: string): TaskTextBuilder {
        this.project = project;
        return this;
    }
    
    addCustomField(name: string, value: string): TaskTextBuilder {
        this.customFields.set(name, value);
        return this;
    }
    
    build(): string {
        // 构建任务文本，只添加任务内容，不添加 - [ ] 标记，由捕获插入中已有设置
        let taskText = this.title;
        
        // 添加优先级（放在标题后）
        if (this.priority && ['#A', '#B', '#C', '#D'].includes(this.priority)) {
            taskText += ` ${this.priority}`;
        }
        
        // 添加任务状态（如果已完成）
        if (this.completed) {
            // 已完成任务会在 - [x] 标记中体现，这里只处理完成日期
            if (this.doneDate) {
                taskText += ` ✅ ${this.formatDate(this.doneDate)}`;
            }
        }
        
        // 添加创建日期（使用Tasks插件的创建日期标记：➕）
        if (this.createdDate) {
            taskText += ` ➕ ${this.formatDate(this.createdDate)}`;
        }
        
        // 添加计划日期（使用Tasks插件的计划日期标记：⏳ 或 scheduled:）
        if (this.scheduledDate) {
            taskText += ` ⏳ ${this.formatDate(this.scheduledDate)}`;
        }
        
        // 添加开始日期（使用Tasks插件的开始日期标记：🔼 或 start:）
        if (this.startDate) {
            taskText += ` 🔼 ${this.formatDate(this.startDate)}`;
        }
        
        // 添加截止日期（使用Tasks插件的截止日期标记：📅 或 due:）
        if (this.dueDate) {
            taskText += ` 📅 ${this.formatDate(this.dueDate)}`;
        }
        
        // 添加等待日期（使用Tasks插件的等待日期标记：⏸️ 或 wait:）
        if (this.waitDate) {
            taskText += ` ⏸️ ${this.formatDate(this.waitDate)}`;
        }
        
        // 添加重复规则（使用Tasks插件的重复规则标记：🔁 或 repeat:）
        if (this.repeatRule) {
            taskText += ` 🔁 ${this.repeatRule}`;
        }
        
        // 添加标签
        if (this.tags.length > 0) {
            taskText += ` ${this.tags.join(' ')}`;
        }
        
        // 添加ID（如果有）
        if (this.id) {
            taskText += ` id: ${this.id}`;
        }
        
        // 添加区域（如果有）
        if (this.area) {
            taskText += ` area: ${this.area}`;
        }
        
        // 添加项目（如果有）
        if (this.project) {
            taskText += ` project: ${this.project}`;
        }
        
        // 添加自定义字段
        for (const [name, value] of this.customFields.entries()) {
            taskText += ` ${name}: ${value}`;
        }
        
        // 添加描述（如果有）
        if (this.description) {
            // 描述应该换行并缩进
            taskText += `\n  ${this.description.replace(/\n/g, '\n  ')}`;
        }
        
        return taskText;
    }
    
    private formatDate(date: Date): string {
        // Tasks插件标准日期格式：YYYY-MM-DD
        const isoString = date.toISOString().split('T')[0];
        return isoString || '';
    }
    
    /**
     * 从现有任务文本解析任务属性
     */
    static parse(taskText: string): TaskTextBuilder {
        const builder = new TaskTextBuilder();
        
        // 解析优先级：#A, #B, #C, #D
        const priorityMatch = taskText.match(/\s*(#(?:A|B|C|D))\s*/);
        if (priorityMatch && priorityMatch[1]) {
            builder.setPriority(priorityMatch[1]);
            taskText = taskText.replace(priorityMatch[0], '').trim();
        }
        
        // 解析创建日期：+ YYYY-MM-DD 或 ➕ YYYY-MM-DD
        const createdMatch = taskText.match(/\s*(\+|➕)\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (createdMatch && createdMatch[2]) {
            builder.setCreatedDate(new Date(createdMatch[2]));
            taskText = taskText.replace(createdMatch[0], '').trim();
        }
        
        // 解析计划日期：⏳ YYYY-MM-DD
        const scheduledMatch = taskText.match(/\s*⏳\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (scheduledMatch && scheduledMatch[1]) {
            builder.setScheduledDate(new Date(scheduledMatch[1]));
            taskText = taskText.replace(scheduledMatch[0], '').trim();
        }
        
        // 解析开始日期：🔼 YYYY-MM-DD
        const startMatch = taskText.match(/\s*🔼\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (startMatch && startMatch[1]) {
            builder.setStartDate(new Date(startMatch[1]));
            taskText = taskText.replace(startMatch[0], '').trim();
        }
        
        // 解析截止日期：📅 YYYY-MM-DD
        const dueMatch = taskText.match(/\s*📅\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (dueMatch && dueMatch[1]) {
            builder.setDueDate(new Date(dueMatch[1]));
            taskText = taskText.replace(dueMatch[0], '').trim();
        }
        
        // 解析完成日期：✅ YYYY-MM-DD
        const doneMatch = taskText.match(/\s*✅\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (doneMatch && doneMatch[1]) {
            builder.setDoneDate(new Date(doneMatch[1]));
            builder.setCompleted(true);
            taskText = taskText.replace(doneMatch[0], '').trim();
        }
        
        // 解析等待日期：⏸️ YYYY-MM-DD
        const waitMatch = taskText.match(/\s*⏸️\s*(\d{4}-\d{2}-\d{2})\s*/);
        if (waitMatch && waitMatch[1]) {
            builder.setWaitDate(new Date(waitMatch[1]));
            taskText = taskText.replace(waitMatch[0], '').trim();
        }
        
        // 解析重复规则：🔁 规则
        const repeatMatch = taskText.match(/\s*🔁\s*([^\s]+)\s*/);
        if (repeatMatch && repeatMatch[1]) {
            builder.setRepeatRule(repeatMatch[1]);
            taskText = taskText.replace(repeatMatch[0], '').trim();
        }
        
        // 解析标签：#tag1 #tag2
        const tagMatches = taskText.match(/\s*#\w+\s*/g);
        if (tagMatches) {
            tagMatches.forEach(tag => {
                builder.addTag(tag.trim());
                taskText = taskText.replace(tag, '').trim();
            });
        }
        
        // 解析描述（换行后的内容）
        const descriptionMatch = taskText.match(/\n(?:\s{2,}.*)+/);
        let description = '';
        if (descriptionMatch) {
            description = descriptionMatch[0].replace(/^\n\s{2}/, '').replace(/\n\s{2}/g, '\n');
            taskText = taskText.replace(descriptionMatch[0], '').trim();
        }
        
        // 剩下的就是标题
        builder.setTitle(taskText);
        if (description) {
            builder.setDescription(description);
        }
        
        return builder;
    }
}