import { App, MarkdownView, TFile } from 'obsidian';
import { taskRegex, dueDateRegex, escapeRegExp } from '../utils/regexUtils';
import { MyPluginSettings } from '../settings';
import { formatDate } from '../utils/dateUtils';

export interface Task {
    text: string;
    completed: boolean;
    filePath: string;
    dueDate?: Date;
    rawText: string;
}

// 从笔记中提取任务
export async function extractTasks(app: App, settings: MyPluginSettings): Promise<Task[]> {
    // 直接使用基本的任务提取逻辑
    return await extractBasicTasks(app);
}

// 基本的任务提取逻辑
export async function extractBasicTasks(app: App): Promise<Task[]> {
    const allFiles = app.vault.getMarkdownFiles();
    const tasks: Task[] = [];

    for (const file of allFiles) {
        try {
            const content = await app.vault.read(file);
            
            let match;
            while ((match = taskRegex.exec(content)) !== null) {
                if (match[1] && match[2]) {
                    const completed = match[1].toLowerCase() === 'x';
                    const rawText = match[2].trim();
                    const taskText = rawText.replace(dueDateRegex, '').trim();
                    
                    // 提取截止日期
                    const dateMatch = rawText.match(dueDateRegex);
                    let dueDate: Date | undefined;
                    if (dateMatch && dateMatch[1]) {
                        dueDate = new Date(dateMatch[1]);
                    }
                    
                    tasks.push({
                        text: rawText, // 显示整行内容
                        completed: completed,
                        filePath: file.path,
                        dueDate: dueDate,
                        rawText: rawText
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to read file ${file.path}:`, error);
        }
    }

    return tasks;
}

// 定义筛选规则的类型
type FilterRuleType = 'include' | 'exclude';

// 定义筛选规则
export interface FilterRule {
    type: FilterRuleType;
    value: string;
    isTag: boolean;
}

// 定义逻辑运算符类型
type LogicalOperator = 'and' | 'or';

// 定义表达式节点类型
export interface ExpressionNode {
    type: 'rule' | 'logical' | 'group';
    rule?: FilterRule;
    operator?: LogicalOperator;
    left?: ExpressionNode;
    right?: ExpressionNode;
    expressions?: ExpressionNode[];
}

// 词法分析器：将筛选字符串转换为标记
export function tokenizeFilter(filterString: string): string[] {
    // 替换括号为空格包围的括号，以便于分割
    const normalizedString = filterString.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
    // 分割为标记
    return normalizedString.split(/\s+/).filter(token => token.trim());
}

// 语法分析器：将标记转换为抽象语法树
function parseTokens(tokens: string[]): ExpressionNode {
    let index = 0;

    function parseExpression(): ExpressionNode {
        return parseLogicalExpression();
    }

    function parseLogicalExpression(): ExpressionNode {
        let left = parsePrimaryExpression();

        while (index < tokens.length && (tokens[index] === 'and' || tokens[index] === 'or')) {
            const operator = tokens[index] as LogicalOperator;
            index++;
            const right = parsePrimaryExpression();
            left = {
                type: 'logical',
                operator,
                left,
                right
            };
        }

        return left;
    }

    function parsePrimaryExpression(): ExpressionNode {
        if (tokens[index] === '(') {
            index++;
            const expressions: ExpressionNode[] = [];
            
            while (index < tokens.length && tokens[index] !== ')') {
                expressions.push(parseExpression());
            }
            
            if (index < tokens.length && tokens[index] === ')') {
                index++;
            }
            
            return {
                type: 'group',
                expressions
            };
        } else {
            return parseRule();
        }
    }

    function parseRule(): ExpressionNode {
        let token = tokens[index];
        let type: FilterRuleType = 'include';
        let value = token || '';
        let isTag = false;

        // 检查是否是排除规则
        if (token && token.startsWith('!')) {
            type = 'exclude';
            value = token.substring(1);
        }

        // 检查是否是标签
        if (value && value.startsWith('#')) {
            isTag = true;
            value = value.substring(1);
        }

        index++;

        return {
            type: 'rule',
            rule: {
                type,
                value: value || '',
                isTag
            }
        };
    }

    return parseExpression();
}

// 解析自定义筛选规则
export function parseCustomFilter(filterString: string): ExpressionNode | null {
    if (!filterString.trim()) {
        return null;
    }

    const tokens = tokenizeFilter(filterString);
    if (tokens.length === 0) {
        return null;
    }

    return parseTokens(tokens);
}

// 检查任务是否匹配筛选规则
export function matchFilterRule(task: Task, rule: FilterRule): boolean {
    if (rule.isTag) {
        // 检查任务文本是否包含标签
        return task.rawText.includes(`#${rule.value}`);
    } else {
        // 检查任务文件路径是否在指定路径中
        const filePath = task.filePath;
        return filePath.startsWith(rule.value + "/") || filePath === rule.value;
    }
}

// 评估表达式节点
function evaluateExpression(task: Task, node: ExpressionNode): boolean {
    switch (node.type) {
        case 'rule':
            if (node.rule) {
                const matches = matchFilterRule(task, node.rule);
                return node.rule.type === 'include' ? matches : !matches;
            }
            return true;
        
        case 'logical':
            if (node.operator && node.left && node.right) {
                const leftResult = evaluateExpression(task, node.left);
                const rightResult = evaluateExpression(task, node.right);
                
                if (node.operator === 'and') {
                    return leftResult && rightResult;
                } else { // or
                    return leftResult || rightResult;
                }
            }
            return true;
        
        case 'group':
            if (node.expressions && node.expressions.length > 0) {
                // 对于分组表达式，默认使用 OR 逻辑
                return node.expressions.some(expr => evaluateExpression(task, expr));
            }
            return true;
        
        default:
            return true;
    }
}

// 筛选任务
export function filterTasks(tasks: Task[], settings: MyPluginSettings, filterDate: Date): Task[] {
    const customFilter = settings.taskFilter.customFilter;
    const expression = parseCustomFilter(customFilter);
    
    // 生成当天日记的路径
    const dailySettings = settings.dailyNote;
    const dailyFileName = formatDate(filterDate, dailySettings.fileNameFormat);
    const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
    
    return tasks.filter(task => {
        let isTaskForToday = false;
        
        // 检查1: 有截止日期且截止日期是当天的任务
        if (task.dueDate) {
            // 设置当天的开始时间
            const startOfDay = new Date(filterDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            // 设置当天的结束时间
            const endOfDay = new Date(filterDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            // 只显示截止日期在当天范围内的任务
            if (task.dueDate >= startOfDay && task.dueDate <= endOfDay) {
                isTaskForToday = true;
            }
        }
        
        // 检查2: 没有截止日期但在当天笔记中的任务
        if (!isTaskForToday && !task.dueDate) {
            // 比较任务的文件路径与当天日记的路径
            if (task.filePath === dailyNotePath) {
                isTaskForToday = true;
            }
        }
        
        // 如果任务不符合当天任务的条件，直接过滤掉
        if (!isTaskForToday) {
            return false;
        }
        
        // 如果没有筛选规则，默认通过
        if (!expression) {
            return true;
        }
        
        // 评估表达式
        return evaluateExpression(task, expression);
    });
}

// 更新笔记中的任务状态
export async function updateTaskInNote(app: App, task: Task, completed: boolean): Promise<void> {
    try {
        // 读取笔记内容
        const file = app.vault.getAbstractFileByPath(task.filePath);
        if (file instanceof TFile) {
            const content = await app.vault.read(file);
            
            // 构建任务的正则表达式，匹配原始任务行
            const taskRegex = new RegExp(`^\s*-\s*\[(.)\]\s*${escapeRegExp(task.rawText)}`, 'm');
            
            // 替换任务状态
            const newContent = content.replace(taskRegex, (match, status) => {
                return match.replace(`[${status}]`, completed ? '[x]' : '[ ]');
            });
            
            // 保存修改后的内容
            await app.vault.modify(file, newContent);
        }
    } catch (error) {
        console.error(`Failed to update task in note: ${task.filePath}`, error);
        throw error;
    }
}

// 在笔记中创建任务
export async function createTaskInNote(
    app: App, 
    taskText: string, 
    date: Date, 
    settings: MyPluginSettings,
    insertTarget: "daily" | "note" | "current",
    customNotePath?: string
): Promise<void> {
    try {
        let notePath: string;
        let insertSettings: { insertSection: string; insertPosition: "first" | "last" };
        
        // 根据插入目标确定任务插入位置和设置
        if (insertTarget === "daily") {
            // 生成当天日记的路径
            const dailySettings = settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            notePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            insertSettings = settings.taskSettings.dailyInsertSettings;
        } else if (insertTarget === "note") {
            // 使用默认笔记路径或自定义路径
            notePath = customNotePath || settings.taskSettings.defaultNotePath;
            insertSettings = settings.taskSettings.noteInsertSettings;
        } else {
            // 在当前打开的笔记中插入
            const activeView = app.workspace.getActiveViewOfType(MarkdownView);
            if (!activeView) {
                console.error("No active markdown view found");
                return;
            }
            
            const file = activeView.file;
            if (!file) {
                console.error("No file found in active view");
                return;
            }
            
            notePath = file.path;
            insertSettings = settings.taskSettings.noteInsertSettings;
        }
        
        // 检查笔记是否存在
        const file = app.vault.getAbstractFileByPath(notePath);
        if (!file || !(file instanceof TFile)) {
            console.error(`Note not found: ${notePath}`);
            return;
        }
        
        // 构建tasks插件标准的任务格式
        const taskParts: string[] = [];
        
        // 添加状态
        if (settings.taskSettings.defaultStatus) {
            taskParts.push(`${settings.taskSettings.defaultStatus}`);
        }
        
        // 添加任务文本
        taskParts.push(taskText);
        
        // 添加创建日期
        if (settings.taskSettings.includeCreationDate) {
            const creationDate = formatDate(new Date(), "YYYY-MM-DD");
            taskParts.push(`🔨 ${creationDate}`);
        }
        
        // 添加截止日期
        if (settings.taskSettings.includeDueDate) {
            const dueDate = formatDate(date, "YYYY-MM-DD");
            taskParts.push(`📅 ${dueDate}`);
        }
        
        // 添加优先级
        if (settings.taskSettings.defaultPriority) {
            taskParts.push(`[#${settings.taskSettings.defaultPriority}]`);
        }
        
        // 生成完整的任务行
        const fullTaskText = `- [ ] ${taskParts.join(" ")}`;
        
        if (insertTarget === "current") {
            // 在当前光标位置插入
            const activeView = app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                const editor = activeView.editor;
                const cursor = editor.getCursor();
                
                // 在光标位置插入任务
                editor.replaceRange(`${fullTaskText}\n`, cursor);
            }
        } else {
            // 读取笔记内容
            const content = await app.vault.read(file);
            
            // 找到插入位置
            const insertSection = insertSettings.insertSection;
            const insertPosition = insertSettings.insertPosition;
            
            let newContent: string;
            
            // 查找指定章节
            const sectionRegex = new RegExp(`(${insertSection})([\s\S]*?)(?=^#|$)`, 'm');
            const sectionMatch = content.match(sectionRegex);
            
            if (sectionMatch && sectionMatch.index !== undefined && sectionMatch[1] !== undefined) {
                // 找到章节，在章节内插入任务
                const sectionStart = sectionMatch.index;
                const sectionEnd = sectionStart + sectionMatch[0].length;
                const sectionHeader = sectionMatch[1];
                const sectionContent = sectionMatch[2] || '';
                
                if (insertPosition === "first") {
                    // 插入到章节标题之后的第一行
                    newContent = content.substring(0, sectionStart + sectionHeader.length) + 
                                `\n${fullTaskText}` + 
                                sectionContent + 
                                content.substring(sectionEnd);
                } else {
                    // 插入到章节末尾
                    newContent = content.substring(0, sectionEnd) + 
                                `\n${fullTaskText}` + 
                                content.substring(sectionEnd);
                }
            } else {
                // 没有找到章节，添加到文件末尾
                newContent = content + `\n\n${insertSection}\n${fullTaskText}`;
            }
            
            // 保存修改后的内容
            await app.vault.modify(file, newContent);
        }
    } catch (error) {
        console.error(`Failed to create task in note:`, error);
        throw error;
    }
}