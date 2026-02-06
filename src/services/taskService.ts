import { App, MarkdownView, TFile } from 'obsidian';
import { taskRegex, dueDateRegex, createdAtRegex, startDateRegex, cancelledDateRegex, completedDateRegex, plannedDateRegex, fullDayRegex, timeRangeRegex, singleTimeRegex, priorityRegex, recurrenceRegex, escapeRegExp } from '../utils/regexUtils';
import { MyPluginSettings } from '../settings';
import { formatDate } from '../utils/dateUtils';
import { generateTaskDateMarkers, generateTaskCompletionMarker } from '../utils/taskUtils';
import type { IChoiceExecutor } from '../IChoiceExecutor';
import { ChoiceType } from '../types/choices/choiceType';

/**
 * 解析重复规则并计算下一个任务的日期
 * @param recurrenceRule 重复规则
 * @param currentDate 当前任务的日期
 * @returns 下一个任务的日期
 */
function calculateNextRecurrenceDate(recurrenceRule: string, currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    
    // 更全面的重复规则解析
    const ruleLower = recurrenceRule.toLowerCase();
    
    // 处理每天重复
    if (ruleLower.includes('every day') || ruleLower.includes('daily')) {
        nextDate.setDate(nextDate.getDate() + 1);
    }
    // 处理每周重复
    else if (ruleLower.includes('every week') || ruleLower.includes('weekly')) {
        nextDate.setDate(nextDate.getDate() + 7);
    }
    // 处理每月重复
    else if (ruleLower.includes('every month') || ruleLower.includes('monthly')) {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    // 处理每年重复
    else if (ruleLower.includes('every year') || ruleLower.includes('yearly')) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    // 处理每两天重复
    else if (ruleLower.includes('every 2 days')) {
        nextDate.setDate(nextDate.getDate() + 2);
    }
    // 处理每三天重复
    else if (ruleLower.includes('every 3 days')) {
        nextDate.setDate(nextDate.getDate() + 3);
    }
    // 处理每两周重复
    else if (ruleLower.includes('every 2 weeks')) {
        nextDate.setDate(nextDate.getDate() + 14);
    }
    // 处理每两周重复（简写）
    else if (ruleLower.includes('biweekly')) {
        nextDate.setDate(nextDate.getDate() + 14);
    }
    // 处理每两个月重复
    else if (ruleLower.includes('every 2 months')) {
        nextDate.setMonth(nextDate.getMonth() + 2);
    }
    // 处理每季度重复
    else if (ruleLower.includes('every quarter') || ruleLower.includes('quarterly')) {
        nextDate.setMonth(nextDate.getMonth() + 3);
    }
    // 处理每半年重复
    else if (ruleLower.includes('every 6 months') || ruleLower.includes('semiannual')) {
        nextDate.setMonth(nextDate.getMonth() + 6);
    }
    // 默认情况：如果没有匹配的重复规则，默认每天重复
    else {
        nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate;
}

export interface Task {
    text: string;
    completed: boolean;
    status?: string;
    priority?: string;
    recurrenceRule?: string;
    filePath: string;
    dueDate?: Date;
    createdAt?: Date;
    startDate?: Date;
    plannedDate?: Date;
    cancelledDate?: Date;
    completedDate?: Date;
    rawText: string;
    fullDay?: boolean;
    timeRange?: {
        startTime: string;
        endTime: string;
    };
    location?: string;
    line?: number;
    lineCount?: number;
    position?: {
        start: {
            line: number;
            col: number;
        };
        end: {
            line: number;
            col: number;
        };
    };
}

// 文件修改时间缓存
interface FileCache {
    mtime: number;
    tasks: Task[];
}

// 全局缓存
let fileCacheMap: Map<string, FileCache> = new Map();

// 从笔记中提取任务
export async function extractTasks(app: App, settings: MyPluginSettings): Promise<Task[]> {
    // 直接使用优化后的任务提取逻辑
    return await extractBasicTasks(app);
}

// 优化后的任务提取逻辑
export async function extractBasicTasks(app: App): Promise<Task[]> {
    const allFiles = app.vault.getMarkdownFiles();
    const tasks: Task[] = [];
    
    // 并行处理文件，提高读取速度
    const filePromises = allFiles.map(async (file) => {
        try {
            // 检查文件是否是TFile类型
            if (!(file instanceof TFile)) return [];
            
            // 获取文件修改时间（使用TFile对象的stat属性）
            const fileStat = file.stat;
            if (!fileStat) return [];
            
            // 检查缓存
            const cacheKey = file.path;
            const cache = fileCacheMap.get(cacheKey);
            
            // 如果缓存存在且文件未修改，直接返回缓存的任务
            if (cache && cache.mtime === fileStat.mtime) {
                return cache.tasks;
            }
            
            // 读取文件内容
            const content = await app.vault.read(file);
            
            // 提取任务
            const fileTasks: Task[] = [];
            let match;
            
            // 重置正则表达式的lastIndex，避免影响其他匹配
            taskRegex.lastIndex = 0;
            
            while ((match = taskRegex.exec(content)) !== null) {
                if (match[1] && match[2]) {
                    const status = match[1];
                    const completed = status.toLowerCase() === 'x';
                    const rawText = match[2].trim();
                    
                    // 计算任务位置信息
                    const matchStart = match.index;
                    const matchEnd = match.index + match[0].length;
                    
                    // 计算起始行号和列号
                    const beforeMatch = content.substring(0, matchStart);
                    const lines = beforeMatch.split('\n');
                    const startLine = lines.length - 1;
                    const startCol = lines[startLine]?.length || 0;
                    
                    // 计算结束行号和列号
                    const afterMatch = content.substring(0, matchEnd);
                    const endLines = afterMatch.split('\n');
                    const endLine = endLines.length - 1;
                    const endCol = endLines[endLine]?.length || 0;
                    
                    // 计算任务跨越的行数
                    const lineCount = endLine - startLine + 1;
                    
                    // 提取截止日期
                    const dateMatch = rawText.match(dueDateRegex);
                    let dueDate: Date | undefined;
                    if (dateMatch && dateMatch[1]) {
                        dueDate = new Date(dateMatch[1]);
                    }
                    
                    // 提取创建日期，但不在任务列表中显示
                    const createdAtMatch = rawText.match(createdAtRegex);
                    let createdAt: Date | undefined;
                    if (createdAtMatch && createdAtMatch[1]) {
                        createdAt = new Date(createdAtMatch[1]);
                    }
                    
                    // 提取开始日期
                    const startDateMatch = rawText.match(startDateRegex);
                    let startDate: Date | undefined;
                    if (startDateMatch && startDateMatch[1]) {
                        startDate = new Date(startDateMatch[1]);
                    }
                    
                    // 提取计划日期
                    const plannedDateMatch = rawText.match(plannedDateRegex);
                    let plannedDate: Date | undefined;
                    if (plannedDateMatch && plannedDateMatch[1]) {
                        plannedDate = new Date(plannedDateMatch[1]);
                    }
                    
                    // 提取取消日期
                    const cancelledDateMatch = rawText.match(cancelledDateRegex);
                    let cancelledDate: Date | undefined;
                    if (cancelledDateMatch && cancelledDateMatch[1]) {
                        cancelledDate = new Date(cancelledDateMatch[1]);
                    }
                    
                    // 提取完成日期
                    const completedDateMatch = rawText.match(completedDateRegex);
                    let completedDate: Date | undefined;
                    if (completedDateMatch && completedDateMatch[1]) {
                        completedDate = new Date(completedDateMatch[1]);
                    }
                    
                    // 提取优先级
                    const priorityMatch = rawText.match(priorityRegex);
                    let priority: string | undefined;
                    if (priorityMatch && priorityMatch[1]) {
                        switch (priorityMatch[1]) {
                            case '🔺':
                                priority = 'highest';
                                break;
                            case '⏫':
                                priority = 'high';
                                break;
                            case '🔼':
                                priority = 'medium';
                                break;
                            case '🔽':
                                priority = 'low';
                                break;
                            case '⏬️':
                                priority = 'lowest';
                                break;
                        }
                    }
                    
                    // 提取重复规则
                    const recurrenceMatch = rawText.match(recurrenceRegex);
                    let recurrenceRule: string | undefined;
                    if (recurrenceMatch && recurrenceMatch[1]) {
                        // 提取 🔁 后面的重复规则内容
                        recurrenceRule = recurrenceMatch[1].trim();
                    }
                    
                    // 提取全天标记
                    const fullDayMatch = rawText.match(fullDayRegex);
                    const fullDay = !!fullDayMatch;
                    
                    // 提取时间范围
                    let timeRange = undefined;
                    let timeText = rawText;
                    
                    // 先尝试匹配完整的时间范围
                    const timeRangeMatch = rawText.match(timeRangeRegex);
                    let singleTimeMatch = null;
                    
                    if (timeRangeMatch && timeRangeMatch[1] && timeRangeMatch[2]) {
                        timeRange = {
                            startTime: timeRangeMatch[1],
                            endTime: timeRangeMatch[2]
                        };
                    }
                    
                    // 如果没有完整的时间范围，尝试匹配单独的时间点
                    else {
                        singleTimeMatch = rawText.match(singleTimeRegex);
                        if (singleTimeMatch && singleTimeMatch[1]) {
                            timeRange = {
                                startTime: singleTimeMatch[1],
                                endTime: ''
                            };
                        }
                    }
                    
                    // 提取任务描述（去除日期、时间、全天、标签等标记）
                    let taskDescription = rawText;
                    
                    // 移除日期标记
                    if (dateMatch) {
                        taskDescription = taskDescription.replace(dueDateRegex, '').trim();
                    }
                    
                    // 移除创建日期标记，确保它不会出现在任务描述中
                    if (createdAtMatch) {
                        taskDescription = taskDescription.replace(createdAtRegex, '').trim();
                    }
                    
                    // 移除开始日期标记
                    if (startDateMatch) {
                        taskDescription = taskDescription.replace(startDateRegex, '').trim();
                    }
                    
                    // 移除计划日期标记
                    if (plannedDateMatch) {
                        taskDescription = taskDescription.replace(plannedDateRegex, '').trim();
                    }
                    
                    // 移除取消日期标记
                    if (cancelledDateMatch) {
                        taskDescription = taskDescription.replace(cancelledDateRegex, '').trim();
                    }
                    
                    // 移除完成日期标记
                    if (completedDateMatch) {
                        taskDescription = taskDescription.replace(completedDateRegex, '').trim();
                    }
                    
                    // 移除优先级标记
                    if (priorityMatch) {
                        taskDescription = taskDescription.replace(priorityRegex, '').trim();
                    }
                    
                    // 移除重复规则
                    if (recurrenceMatch) {
                        taskDescription = taskDescription.replace(recurrenceRegex, '').trim();
                    }
                    
                    // 移除全天标记
                    if (fullDayMatch) {
                        taskDescription = taskDescription.replace(fullDayRegex, '').trim();
                    }
                    
                    // 移除时间范围
                    if (timeRangeMatch) {
                        taskDescription = taskDescription.replace(timeRangeRegex, '').trim();
                    } else if (singleTimeMatch) {
                        taskDescription = taskDescription.replace(singleTimeRegex, '').trim();
                    }
                    
                    // 移除标签（以#开头的标签）
                    taskDescription = taskDescription.replace(/#\S+/g, '').trim();
                    
                    // 移除emoji标签（如 🔁）
                    taskDescription = taskDescription.replace(/[🔁📅⏳🔼📅✅⏸️🔁🔄]/g, '').trim();
                    
                    // 去除多余的空格
                    taskDescription = taskDescription.replace(/\s+/g, ' ').trim();
                    
                    fileTasks.push({
                        text: taskDescription, // 只显示任务描述，不包含日期和时间
                        completed: completed,
                        status: status,
                        priority: priority,
                        recurrenceRule: recurrenceRule,
                        filePath: file.path,
                        dueDate: dueDate,
                        createdAt: createdAt, // 存储创建日期，但不在任务列表中显示
                        startDate: startDate,
                        plannedDate: plannedDate,
                        cancelledDate: cancelledDate,
                        completedDate: completedDate,
                        rawText: rawText,
                        fullDay: fullDay,
                        timeRange: timeRange,
                        line: startLine,
                        lineCount: lineCount,
                        position: {
                            start: {
                                line: startLine,
                                col: startCol
                            },
                            end: {
                                line: endLine,
                                col: endCol
                            }
                        }
                    });
                }
            }
            
            // 更新缓存
            fileCacheMap.set(cacheKey, {
                mtime: fileStat.mtime,
                tasks: fileTasks
            });
            
            return fileTasks;
        } catch (error) {
            console.error(`Failed to read file ${file.path}:`, error);
            return [];
        }
    });
    
    // 等待所有文件处理完成
    const results = await Promise.all(filePromises);
    
    // 合并结果
    for (const fileTasks of results) {
        tasks.push(...fileTasks);
    }

    return tasks;
}

// 清除任务缓存
export function clearTaskCache(): void {
    fileCacheMap.clear();
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
export function evaluateExpression(task: Task, node: ExpressionNode): boolean {
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
export async function updateTaskInNote(app: App, task: Task, completed: boolean, settings?: any): Promise<void> {
    try {

        // 读取笔记内容
        const file = app.vault.getAbstractFileByPath(task.filePath);
        if (file instanceof TFile) {

            const content = await app.vault.read(file);

            
            // 按行分割内容
            const lines = content.split('\n');

            
            // 检查任务是否有行号信息
            if (task.line !== undefined && task.line >= 0 && task.line < lines.length) {

                
                // 构建更新后的任务行
                let checkbox;
                if (completed) {
                    checkbox = '[x]';
                } else if (task.status === '-') {
                    checkbox = '[-]';
                } else if (task.status === '/') {
                    checkbox = '[/]';
                } else {
                    checkbox = '[ ]';
                }
                let updatedTaskText = task.text;
                
                // 添加日期标记（包括完成日期和取消日期）
                updatedTaskText += generateTaskDateMarkers(task);
                
                // 保持原始的缩进
                const originalLine = lines[task.line];
                const indentMatch = originalLine.match(/^(\s*)/);
                const indent = indentMatch ? indentMatch[1] : '';

                
                const updatedLine = `${indent}- ${checkbox} ${updatedTaskText}`;

                
                // 替换任务行
                lines[task.line] = updatedLine;
                const newContent = lines.join('\n');
                
                // 检查内容是否有变化
                if (content !== newContent) {
                    // 保存修改后的内容
                    await app.vault.modify(file, newContent);
                } else {
    
                }
                
                // 处理重复任务
                if (completed && task.recurrenceRule) {
                    // 计算下一个任务的日期
                    // 使用原任务的 dueDate 作为基准，如果原任务没有 dueDate，则使用当前日期
                    const currentDate = task.dueDate || new Date();
                    
                    // 对于所有重复规则，使用 calculateNextRecurrenceDate 函数计算
                    const nextDate = calculateNextRecurrenceDate(task.recurrenceRule, currentDate);
                    
                    // 当前系统日期，用于新任务的创建日期
                    const currentSystemDate = new Date();
                    
                    // 创建新的任务对象
                    // 计算计划日期和开始日期的下一个值
                    let nextStartDate: Date | undefined;
                    if (task.startDate) {
                        nextStartDate = calculateNextRecurrenceDate(task.recurrenceRule, task.startDate);
                    }
                    
                    let nextPlannedDate: Date | undefined;
                    if (task.plannedDate) {
                        nextPlannedDate = calculateNextRecurrenceDate(task.recurrenceRule, task.plannedDate);
                    }
                    
                    const newTask: Task = {
                        text: task.text,
                        completed: false,
                        status: ' ',
                        priority: task.priority,
                        recurrenceRule: task.recurrenceRule, // 确保重复规则正确传递给新任务
                        filePath: task.filePath,
                        dueDate: nextDate,
                        createdAt: currentSystemDate, // 设置为当前日期，作为新任务的创建日期
                        startDate: nextStartDate,
                        plannedDate: nextPlannedDate,
                        cancelledDate: undefined,
                        completedDate: undefined,
                        rawText: task.text,
                        fullDay: task.fullDay,
                        timeRange: task.timeRange,
                        line: task.line + 1, // 新任务添加到当前任务的下一行
                        lineCount: 1
                    };
                    
                    // 生成新任务的文本
                    let newTaskText = newTask.text;
                    newTaskText += generateTaskDateMarkers(newTask);
                    
                    // 保持与原任务相同的缩进
                    const newTaskLine = `${indent}- [ ] ${newTaskText}`;
                    
                    // 将新任务添加到文件中
                    // 重新读取文件内容以获取最新状态
                    const updatedContent = await app.vault.read(file);
                    const updatedLines = updatedContent.split('\n');
                    
                    // 根据设置决定新任务的添加位置
                    let insertPosition = task.line + 1; // 默认在当前任务的下一行
                    
                    // 根据插件设置来调整插入位置
                    if (settings && settings.taskSettings && settings.taskSettings.recurrenceSettings) {
                        const positionSetting = settings.taskSettings.recurrenceSettings.newTaskPosition;
                        if (positionSetting === 'above') {
                            insertPosition = task.line; // 在当前任务的上一行插入
                        }
                    }
                    
                    // 在决定的位置插入新任务
                    updatedLines.splice(insertPosition, 0, newTaskLine);
                    const finalContent = updatedLines.join('\n');
                    
                    // 保存带有新任务的内容
                    await app.vault.modify(file, finalContent);

                }
            } else {
                // 如果没有行号信息，尝试使用正则表达式匹配
                const taskRegex = new RegExp(`^\s*-\s*\[(.)\]\s*(${escapeRegExp(task.rawText)})`, 'm');
                
                // 检查是否匹配到任务
                const match = content.match(taskRegex);
                
                if (match) {
                    // 替换任务状态和完成日期
                    const newContent = content.replace(taskRegex, (match, status, taskText) => {

                        let checkbox;
                        if (completed) {
                            checkbox = '[x]';
                        } else if (task.status === '-') {
                            checkbox = '[-]';
                        } else if (task.status === '/') {
                            checkbox = '[/]';
                        } else {
                            checkbox = '[ ]';
                        }
                        let updatedTaskText = task.text;
                        
                        // 添加日期标记
                        updatedTaskText += generateTaskDateMarkers(task);
                        
                        // 根据Tasks插件格式，处理完成日期和取消日期
                        if (completed) {
                            // 如果任务已完成，添加完成日期标记 ✅ YYYY-MM-DD
                            const today = new Date().toISOString().split('T')[0];
                            updatedTaskText += ` ✅ ${today}`;
                            // 移除取消日期标记
                            updatedTaskText = updatedTaskText.replace(/\s*❌\s*\d{4}-\d{2}-\d{2}/g, '').trim();
                        } else if (task.cancelledDate) {
                            // 移除重复的取消日期标记
                            updatedTaskText = updatedTaskText.replace(/\s*❌\s*\d{4}-\d{2}-\d{2}/g, '').trim();
                            // 移除完成日期标记
                            updatedTaskText = updatedTaskText.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g, '').trim();
                            // 添加取消日期标记
                            const cancelledDateStr = task.cancelledDate.toISOString().split('T')[0];
                            updatedTaskText += ` ❌ ${cancelledDateStr}`;
                        } else {
                            // 如果任务未完成也未取消，确保移除完成日期和取消日期标记
                            updatedTaskText = updatedTaskText.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/g, '').trim();
                            updatedTaskText = updatedTaskText.replace(/\s*❌\s*\d{4}-\d{2}-\d{2}/g, '').trim();
                        }
                        
                        // 保持原始的缩进
                        const indentMatch = match.match(/^(\s*)/);
                        const indent = indentMatch ? indentMatch[1] : '';
                        const result = `${indent}- ${checkbox} ${updatedTaskText}`;
                        return result;
                    });
                    
                    // 检查内容是否有变化
                    if (content !== newContent) {
                        // 保存修改后的内容
                        await app.vault.modify(file, newContent);
                    } else {

                    }
                } else {

                }
            }
        } else {

        }
    } catch (error) {
        console.error('[TaskService] Failed to update task in note:', error);
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
    customNotePath?: string,
    configId?: string
): Promise<void> {
    try {
        // 使用 capture to 功能
        const { CaptureChoiceEngine } = await import('../engine/CaptureChoiceEngine');
        const MyPlugin = (window as any).jiujiuObsidianCalendarPlugin;
        
        if (MyPlugin && MyPlugin.instance) {
            // 创建 choice executor
            const choiceExecutor: IChoiceExecutor = {
                variables: new Map(),
            };
            
            // 获取 capture to 设置，确保taskSettings和captureToSettings存在
            const taskSettings = settings.taskSettings || { captureToSettings: { enabled: false, configs: [] } };
            const captureSettings = taskSettings.captureToSettings || { enabled: false, configs: [] };
            
            // 选择配置
            let selectedConfigId: string;
            if (configId) {
                selectedConfigId = configId;
            } else if (insertTarget === "daily") {
                // 对于每日笔记，使用默认配置
                selectedConfigId = captureSettings.taskConfigId;
            } else if (insertTarget === "note") {
                // 对于普通笔记，使用默认配置
                selectedConfigId = captureSettings.taskConfigId;
            } else {
                // 对于当前笔记，使用默认配置
                selectedConfigId = captureSettings.taskConfigId;
            }
            
            const selectedConfig = captureSettings.configs.find(config => config.id === selectedConfigId && config.enabled);
            
            // 如果没有找到启用的配置，使用第一个启用的配置
            let configToUse = selectedConfig || captureSettings.configs.find(config => config.enabled) || captureSettings.configs[0];
            
            // 如果没有配置，使用默认配置
        if (!configToUse) {
            configToUse = {
                id: "default",
                name: "默认配置",
                description: "默认的 Capture To 配置",
                enabled: true,
                defaultCapturePath: "{{日记}}",
                captureToActiveFile: false,
                hotkey: null,
                inputMethod: "single-line",
                createFileIfItDoesntExist: {
                    enabled: true,
                    createWithTemplate: true,
                    template: "{{日记模板}}"
                },
                format: {
                    enabled: true,
                    format: "{{TASK_TEXT}}\n"
                },
                autoAddCreatedDate: true,
                autoAddDueDate: false,
                dueDateOption: "today",
                customDueDays: 1,
                prepend: false,
                appendLink: false,
                task: true,
                insertAfter: {
                    enabled: true,
                    after: "## 日常记录",
                    insertAtEnd: true,
                    considerSubsections: false,
                    createIfNotFound: true,
                    createIfNotFoundLocation: "bottom"
                },
                newLineCapture: {
                    enabled: false,
                    direction: "below"
                },
                openFile: false,
                fileOpening: {
                    location: "tab",
                    direction: "vertical",
                    mode: "default",
                    focus: true
                }
            };
        }
            
            // 构建 capture choice
            let captureToPath = "";
            if (customNotePath) {
                captureToPath = customNotePath;
            } else if (insertTarget === "daily") {
                captureToPath = "{{日记}}";
            } else {
                captureToPath = configToUse.defaultCapturePath;
            }
            
            // 生成 Tasks 格式的任务文本
            let finalTaskText: string;
            // 所有配置都使用Tasks插件格式
            // 导入 TaskTextBuilder
            const { TaskTextBuilder } = await import('./tasksFormatBuilder');
            
            // 解析现有的任务文本，保留其中的属性
            const taskBuilder = TaskTextBuilder.parse(taskText);
            
            // 检查任务文本中是否已经包含创建日期
            const hasCreatedDate = /\s*(\+|➕)\s*(\d{4}-\d{2}-\d{2})\s*/.test(taskText);
            // 只有当任务文本中没有创建日期，且配置允许自动添加时，才添加创建日期
            if (configToUse.autoAddCreatedDate && !hasCreatedDate) {
                taskBuilder.setCreatedDate(date);
            }
            
            // 检查任务文本中是否已经包含截止日期
            const hasDueDate = /\s*(📅|due:)\s*(\d{4}-\d{2}-\d{2})\s*/.test(taskText);
            // 只有当任务文本中没有截止日期，且配置允许自动添加时，才添加截止日期
            if (configToUse.autoAddDueDate && !hasDueDate) {
                // 计算截止日期的辅助函数
                const calculateDueDate = (baseDate: Date, option: string, customDays: number): Date => {
                    const result = new Date(baseDate);
                    
                    switch (option) {
                        case "today":
                            return result;
                        case "custom":
                            result.setDate(result.getDate() + customDays);
                            return result;
                        case "weekend":
                            // 计算本周末（周六）
                            const dayOfWeek = result.getDay();
                            const daysToSaturday = 6 - dayOfWeek;
                            result.setDate(result.getDate() + daysToSaturday);
                            return result;
                        case "monthEnd":
                            // 计算本月底
                            result.setMonth(result.getMonth() + 1, 0);
                            return result;
                        case "yearEnd":
                            // 计算本年底
                            result.setMonth(11, 31);
                            return result;
                        default:
                            return result;
                    }
                };
                
                const dueDate = calculateDueDate(
                    date,
                    configToUse.dueDateOption,
                    configToUse.customDueDays
                );
                taskBuilder.setDueDate(dueDate);
            }
            
            finalTaskText = taskBuilder.build();
            
            const captureChoice = {
                name: "Create Task",
                id: "create-task",
                type: ChoiceType.Capture,
                command: false,
                captureTo: captureToPath,
                captureToActiveFile: insertTarget === "current" || configToUse.captureToActiveFile,
                createFileIfItDoesntExist: {
                    enabled: configToUse.createFileIfItDoesntExist.enabled,
                    createWithTemplate: configToUse.createFileIfItDoesntExist.createWithTemplate,
                    template: configToUse.createFileIfItDoesntExist.template,
                },
                format: {
                    enabled: configToUse.format.enabled,
                    format: configToUse.format.format.replace("{{TASK_TEXT}}", finalTaskText).replace("{{DATE}}", formatDate(date, "YYYY-MM-DD")),
                },
                prepend: configToUse.prepend,
                appendLink: configToUse.appendLink,
                task: configToUse.task,
                insertAfter: {
                    enabled: configToUse.insertAfter.enabled,
                    after: configToUse.insertAfter.after,
                    insertAtEnd: configToUse.insertAfter.insertAtEnd,
                    considerSubsections: configToUse.insertAfter.considerSubsections,
                    createIfNotFound: configToUse.insertAfter.createIfNotFound,
                    createIfNotFoundLocation: configToUse.insertAfter.createIfNotFoundLocation,
                },
                newLineCapture: {
                    enabled: configToUse.newLineCapture.enabled,
                    direction: configToUse.newLineCapture.direction,
                },
                openFile: configToUse.openFile,
                fileOpening: {
                    location: configToUse.fileOpening.location,
                    direction: configToUse.fileOpening.direction,
                    mode: configToUse.fileOpening.mode,
                    focus: configToUse.fileOpening.focus,
                },
                inputMethod: configToUse.inputMethod,
                autoAddCreatedDate: configToUse.autoAddCreatedDate,
                autoAddDueDate: configToUse.autoAddDueDate,
                dueDateOption: configToUse.dueDateOption,
                customDueDays: configToUse.customDueDays
            };
            
            // 创建并运行 CaptureChoiceEngine
            const engine = new CaptureChoiceEngine(app, MyPlugin.instance, captureChoice, choiceExecutor);
            await engine.run();
        } else {
            throw new Error("MyPlugin instance not found");
        }
    } catch (error) {
        console.error(`Failed to create task in note:`, error);
        throw error;
    }
}