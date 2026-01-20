import { __awaiter } from "tslib";
import { TFile } from 'obsidian';
import { taskRegex, dueDateRegex, createdAtRegex, startDateRegex, fullDayRegex, timeRangeRegex, singleTimeRegex, escapeRegExp } from '../utils/regexUtils';
import { formatDate } from '../utils/dateUtils';
import { ChoiceType } from '../types/choices/choiceType';
// 全局缓存
let fileCacheMap = new Map();
// 从笔记中提取任务
export function extractTasks(app, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        // 直接使用优化后的任务提取逻辑
        return yield extractBasicTasks(app);
    });
}
// 优化后的任务提取逻辑
export function extractBasicTasks(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const allFiles = app.vault.getMarkdownFiles();
        const tasks = [];
        // 并行处理文件，提高读取速度
        const filePromises = allFiles.map((file) => __awaiter(this, void 0, void 0, function* () {
            try {
                // 检查文件是否是TFile类型
                if (!(file instanceof TFile))
                    return [];
                // 获取文件修改时间（使用TFile对象的stat属性）
                const fileStat = file.stat;
                if (!fileStat)
                    return [];
                // 检查缓存
                const cacheKey = file.path;
                const cache = fileCacheMap.get(cacheKey);
                // 如果缓存存在且文件未修改，直接返回缓存的任务
                if (cache && cache.mtime === fileStat.mtime) {
                    return cache.tasks;
                }
                // 读取文件内容
                const content = yield app.vault.read(file);
                // 提取任务
                const fileTasks = [];
                let match;
                // 重置正则表达式的lastIndex，避免影响其他匹配
                taskRegex.lastIndex = 0;
                while ((match = taskRegex.exec(content)) !== null) {
                    if (match[1] && match[2]) {
                        const completed = match[1].toLowerCase() === 'x';
                        const rawText = match[2].trim();
                        // 提取截止日期
                        const dateMatch = rawText.match(dueDateRegex);
                        let dueDate;
                        if (dateMatch && dateMatch[1]) {
                            dueDate = new Date(dateMatch[1]);
                        }
                        // 提取创建日期，但不在任务列表中显示
                        const createdAtMatch = rawText.match(createdAtRegex);
                        let createdAt;
                        if (createdAtMatch && createdAtMatch[1]) {
                            createdAt = new Date(createdAtMatch[1]);
                        }
                        // 提取开始日期
                        const startDateMatch = rawText.match(startDateRegex);
                        let startDate;
                        if (startDateMatch && startDateMatch[1]) {
                            startDate = new Date(startDateMatch[1]);
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
                        // 移除全天标记
                        if (fullDayMatch) {
                            taskDescription = taskDescription.replace(fullDayRegex, '').trim();
                        }
                        // 移除时间范围
                        if (timeRangeMatch) {
                            taskDescription = taskDescription.replace(timeRangeRegex, '').trim();
                        }
                        else if (singleTimeMatch) {
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
                            filePath: file.path,
                            dueDate: dueDate,
                            createdAt: createdAt, // 存储创建日期，但不在任务列表中显示
                            startDate: startDate,
                            rawText: rawText,
                            fullDay: fullDay,
                            timeRange: timeRange
                        });
                    }
                }
                // 更新缓存
                fileCacheMap.set(cacheKey, {
                    mtime: fileStat.mtime,
                    tasks: fileTasks
                });
                return fileTasks;
            }
            catch (error) {
                console.error(`Failed to read file ${file.path}:`, error);
                return [];
            }
        }));
        // 等待所有文件处理完成
        const results = yield Promise.all(filePromises);
        // 合并结果
        for (const fileTasks of results) {
            tasks.push(...fileTasks);
        }
        return tasks;
    });
}
// 清除任务缓存
export function clearTaskCache() {
    fileCacheMap.clear();
}
// 词法分析器：将筛选字符串转换为标记
export function tokenizeFilter(filterString) {
    // 替换括号为空格包围的括号，以便于分割
    const normalizedString = filterString.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ');
    // 分割为标记
    return normalizedString.split(/\s+/).filter(token => token.trim());
}
// 语法分析器：将标记转换为抽象语法树
function parseTokens(tokens) {
    let index = 0;
    function parseExpression() {
        return parseLogicalExpression();
    }
    function parseLogicalExpression() {
        let left = parsePrimaryExpression();
        while (index < tokens.length && (tokens[index] === 'and' || tokens[index] === 'or')) {
            const operator = tokens[index];
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
    function parsePrimaryExpression() {
        if (tokens[index] === '(') {
            index++;
            const expressions = [];
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
        }
        else {
            return parseRule();
        }
    }
    function parseRule() {
        let token = tokens[index];
        let type = 'include';
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
export function parseCustomFilter(filterString) {
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
export function matchFilterRule(task, rule) {
    if (rule.isTag) {
        // 检查任务文本是否包含标签
        return task.rawText.includes(`#${rule.value}`);
    }
    else {
        // 检查任务文件路径是否在指定路径中
        const filePath = task.filePath;
        return filePath.startsWith(rule.value + "/") || filePath === rule.value;
    }
}
// 评估表达式节点
export function evaluateExpression(task, node) {
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
                }
                else { // or
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
export function filterTasks(tasks, settings, filterDate) {
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
export function updateTaskInNote(app, task, completed) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 读取笔记内容
            const file = app.vault.getAbstractFileByPath(task.filePath);
            if (file instanceof TFile) {
                const content = yield app.vault.read(file);
                // 构建任务的正则表达式，匹配原始任务行
                const taskRegex = new RegExp(`^\s*-\s*\[(.)\]\s*(${escapeRegExp(task.rawText)})`, 'm');
                // 替换任务状态和完成日期
                const newContent = content.replace(taskRegex, (match, status, taskText) => {
                    const checkbox = completed ? '[x]' : '[ ]';
                    let updatedTaskText = taskText;
                    // 根据Tasks插件格式，处理完成日期
                    if (completed) {
                        // 如果任务已完成，添加完成日期标记 ✅ YYYY-MM-DD
                        const today = new Date().toISOString().split('T')[0];
                        const doneDateRegex = /\s*✅\s*\d{4}-\d{2}-\d{2}/;
                        if (doneDateRegex.test(updatedTaskText)) {
                            // 如果已经有完成日期，更新它
                            updatedTaskText = updatedTaskText.replace(doneDateRegex, ` ✅ ${today}`);
                        }
                        else {
                            // 如果没有完成日期，添加它
                            updatedTaskText += ` ✅ ${today}`;
                        }
                    }
                    else {
                        // 如果任务未完成，移除完成日期标记
                        const doneDateRegex = /\s*✅\s*\d{4}-\d{2}-\d{2}/;
                        updatedTaskText = updatedTaskText.replace(doneDateRegex, '').trim();
                    }
                    // 保持原始的缩进
                    const indentMatch = match.match(/^(\s*)/);
                    const indent = indentMatch ? indentMatch[1] : '';
                    return `${indent}- ${checkbox} ${updatedTaskText}`;
                });
                // 保存修改后的内容
                yield app.vault.modify(file, newContent);
            }
        }
        catch (error) {
            console.error(`Failed to update task in note: ${task.filePath}`, error);
            throw error;
        }
    });
}
// 在笔记中创建任务
export function createTaskInNote(app, taskText, date, settings, insertTarget, customNotePath, configId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 使用 capture to 功能
            const { CaptureChoiceEngine } = yield import('../engine/CaptureChoiceEngine');
            const MyPlugin = window.jiujiuObsidianCalendarPlugin;
            if (MyPlugin && MyPlugin.instance) {
                // 创建 choice executor
                const choiceExecutor = {
                    variables: new Map(),
                };
                // 获取 capture to 设置，确保taskSettings和captureToSettings存在
                const taskSettings = settings.taskSettings || { captureToSettings: { enabled: false, configs: [] } };
                const captureSettings = taskSettings.captureToSettings || { enabled: false, configs: [] };
                // 选择配置
                let selectedConfigId;
                if (configId) {
                    selectedConfigId = configId;
                }
                else if (insertTarget === "daily") {
                    // 对于每日笔记，使用默认配置
                    selectedConfigId = captureSettings.taskConfigId;
                }
                else if (insertTarget === "note") {
                    // 对于普通笔记，使用默认配置
                    selectedConfigId = captureSettings.taskConfigId;
                }
                else {
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
                }
                else if (insertTarget === "daily") {
                    captureToPath = "{{日记}}";
                }
                else {
                    captureToPath = configToUse.defaultCapturePath;
                }
                // 生成 Tasks 格式的任务文本
                let finalTaskText;
                // 所有配置都使用Tasks插件格式
                // 导入 TaskTextBuilder
                const { TaskTextBuilder } = yield import('./tasksFormatBuilder');
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
                    const calculateDueDate = (baseDate, option, customDays) => {
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
                    const dueDate = calculateDueDate(date, configToUse.dueDateOption, configToUse.customDueDays);
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
                yield engine.run();
            }
            else {
                throw new Error("MyPlugin instance not found");
            }
        }
        catch (error) {
            console.error(`Failed to create task in note:`, error);
            throw error;
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFxQixLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDcEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUzSixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFaEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBd0J6RCxPQUFPO0FBQ1AsSUFBSSxZQUFZLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7QUFFckQsV0FBVztBQUNYLE1BQU0sVUFBZ0IsWUFBWSxDQUFDLEdBQVEsRUFBRSxRQUEwQjs7UUFDbkUsaUJBQWlCO1FBQ2pCLE9BQU8sTUFBTSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQUE7QUFFRCxhQUFhO0FBQ2IsTUFBTSxVQUFnQixpQkFBaUIsQ0FBQyxHQUFROztRQUM1QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDOUMsTUFBTSxLQUFLLEdBQVcsRUFBRSxDQUFDO1FBRXpCLGdCQUFnQjtRQUNoQixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQU8sSUFBSSxFQUFFLEVBQUU7WUFDN0MsSUFBSSxDQUFDO2dCQUNELGlCQUFpQjtnQkFDakIsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLEtBQUssQ0FBQztvQkFBRSxPQUFPLEVBQUUsQ0FBQztnQkFFeEMsNkJBQTZCO2dCQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUMzQixJQUFJLENBQUMsUUFB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LENBQUM7WUFDbkQsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RCxNQUFNLEtBQUssQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBNYXJrZG93blZpZXcsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgdGFza1JlZ2V4LCBkdWVEYXRlUmVnZXgsIGNyZWF0ZWRBdFJlZ2V4LCBzdGFydERhdGVSZWdleCwgZnVsbERheVJlZ2V4LCB0aW1lUmFuZ2VSZWdleCwgc2luZ2xlVGltZVJlZ2V4LCBlc2NhcGVSZWdFeHAgfSBmcm9tICcuLi91dGlscy9yZWdleFV0aWxzJztcbmltcG9ydCB7IE15UGx1Z2luU2V0dGluZ3MgfSBmcm9tICcuLi9zZXR0aW5ncyc7XG5pbXBvcnQgeyBmb3JtYXREYXRlIH0gZnJvbSAnLi4vdXRpbHMvZGF0ZVV0aWxzJztcbmltcG9ydCB0eXBlIHsgSUNob2ljZUV4ZWN1dG9yIH0gZnJvbSAnLi4vSUNob2ljZUV4ZWN1dG9yJztcbmltcG9ydCB7IENob2ljZVR5cGUgfSBmcm9tICcuLi90eXBlcy9jaG9pY2VzL2Nob2ljZVR5cGUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICAgIHRleHQ6IHN0cmluZztcbiAgICBjb21wbGV0ZWQ6IGJvb2xlYW47XG4gICAgZmlsZVBhdGg6IHN0cmluZztcbiAgICBkdWVEYXRlPzogRGF0ZTtcbiAgICBjcmVhdGVkQXQ/OiBEYXRlO1xuICAgIHN0YXJ0RGF0ZT86IERhdGU7XG4gICAgcmF3VGV4dDogc3RyaW5nO1xuICAgIGZ1bGxEYXk/OiBib29sZWFuO1xuICAgIHRpbWVSYW5nZT86IHtcbiAgICAgICAgc3RhcnRUaW1lOiBzdHJpbmc7XG4gICAgICAgIGVuZFRpbWU6IHN0cmluZztcbiAgICB9O1xuICAgIGxvY2F0aW9uPzogc3RyaW5nO1xufVxuXG4vLyDmlofku7bkv67mlLnml7bpl7TnvJPlrZhcbmludGVyZmFjZSBGaWxlQ2FjaGUge1xuICAgIG10aW1lOiBudW1iZXI7XG4gICAgdGFza3M6IFRhc2tbXTtcbn1cblxuLy8g5YWo5bGA57yT5a2YXG5sZXQgZmlsZUNhY2hlTWFwOiBNYXA8c3RyaW5nLCBGaWxlQ2FjaGU+ID0gbmV3IE1hcCgpO1xuXG4vLyDku47nrJTorrDkuK3mj5Dlj5bku7vliqFcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleHRyYWN0VGFza3MoYXBwOiBBcHAsIHNldHRpbmdzOiBNeVBsdWdpblNldHRpbmdzKTogUHJvbWlzZTxUYXNrW10+IHtcbiAgICAvLyDnm7TmjqXkvb/nlKjkvJjljJblkI7nmoTku7vliqHmj5Dlj5bpgLvovpFcbiAgICByZXR1cm4gYXdhaXQgZXh0cmFjdEJhc2ljVGFza3MoYXBwKTtcbn1cblxuLy8g5LyY5YyW5ZCO55qE5Lu75Yqh5o+Q5Y+W6YC76L6RXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXh0cmFjdEJhc2ljVGFza3MoYXBwOiBBcHApOiBQcm9taXNlPFRhc2tbXT4ge1xuICAgIGNvbnN0IGFsbEZpbGVzID0gYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKTtcbiAgICBjb25zdCB0YXNrczogVGFza1tdID0gW107XG4gICAgXG4gICAgLy8g5bm26KGM5aSE55CG5paH5Lu277yM5o+Q6auY6K+75Y+W6YCf5bqmXG4gICAgY29uc3QgZmlsZVByb21pc2VzID0gYWxsRmlsZXMubWFwKGFzeW5jIChmaWxlKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyDmo4Dmn6Xmlofku7bmmK/lkKbmmK9URmlsZeexu+Wei1xuICAgICAgICAgICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDojrflj5bmlofku7bkv67mlLnml7bpl7TvvIjkvb/nlKhURmlsZeWvueixoeeahHN0YXTlsZ7mgKfvvIlcbiAgICAgICAgICAgIGNvbnN0IGZpbGVTdGF0ID0gZmlsZS5zdGF0O1xuICAgICAgICAgICAgaWYgKCFmaWxlU3RhdCkgcmV0dXJuIFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmo4Dmn6XnvJPlrZhcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gZmlsZS5wYXRoO1xuICAgICAgICAgICAgY29uc3QgY2FjaGUgPSBmaWxlQ2FjaGVNYXAuZ2V0KGNhY2hlS2V5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5aaC5p6c57yT5a2Y5a2Y5Zyo5LiU5paH5Lu25pyq5L+u5pS577yM55u05o6l6L+U5Zue57yT5a2Y55qE5Lu75YqhXG4gICAgICAgICAgICBpZiAoY2FjaGUgJiYgY2FjaGUubXRpbWUgPT09IGZpbGVTdGF0Lm10aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlLnRhc2tzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDor7vlj5bmlofku7blhoXlrrlcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBhcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5o+Q5Y+W5Lu75YqhXG4gICAgICAgICAgICBjb25zdCBmaWxlVGFza3M6IFRhc2tbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IG1hdGNoO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDph43nva7mraPliJnooajovr7lvI/nmoRsYXN0SW5kZXjvvIzpgb/lhY3lvbHlk43lhbbku5bljLnphY1cbiAgICAgICAgICAgIHRhc2tSZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gdGFza1JlZ2V4LmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoWzFdICYmIG1hdGNoWzJdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkgPT09ICd4JztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IG1hdGNoWzJdLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOaPkOWPluaIquatouaXpeacn1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlTWF0Y2ggPSByYXdUZXh0Lm1hdGNoKGR1ZURhdGVSZWdleCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkdWVEYXRlOiBEYXRlIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0ZU1hdGNoICYmIGRhdGVNYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVlRGF0ZSA9IG5ldyBEYXRlKGRhdGVNYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOaPkOWPluWIm+W7uuaXpeacn++8jOS9huS4jeWcqOS7u+WKoeWIl+ihqOS4reaYvuekulxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjcmVhdGVkQXRNYXRjaCA9IHJhd1RleHQubWF0Y2goY3JlYXRlZEF0UmVnZXgpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgY3JlYXRlZEF0OiBEYXRlIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3JlYXRlZEF0TWF0Y2ggJiYgY3JlYXRlZEF0TWF0Y2hbMV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdCA9IG5ldyBEYXRlKGNyZWF0ZWRBdE1hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g5o+Q5Y+W5byA5aeL5pel5pyfXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0RGF0ZU1hdGNoID0gcmF3VGV4dC5tYXRjaChzdGFydERhdGVSZWdleCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFydERhdGU6IERhdGUgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGVNYXRjaCAmJiBzdGFydERhdGVNYXRjaFsxXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlID0gbmV3IERhdGUoc3RhcnREYXRlTWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dlj5blhajlpKnmoIforrBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbERheU1hdGNoID0gcmF3VGV4dC5tYXRjaChmdWxsRGF5UmVnZXgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGF5ID0gISFmdWxsRGF5TWF0Y2g7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dlj5bml7bpl7TojIPlm7RcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRpbWVSYW5nZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRpbWVUZXh0ID0gcmF3VGV4dDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOWFiOWwneivleWMuemFjeWujOaVtOeahOaXtumXtOiMg+WbtFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lUmFuZ2VNYXRjaCA9IHJhd1RleHQubWF0Y2godGltZVJhbmdlUmVnZXgpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2luZ2xlVGltZU1hdGNoID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aW1lUmFuZ2VNYXRjaCAmJiB0aW1lUmFuZ2VNYXRjaFsxXSAmJiB0aW1lUmFuZ2VNYXRjaFsyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGltZVJhbmdlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZTogdGltZVJhbmdlTWF0Y2hbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kVGltZTogdGltZVJhbmdlTWF0Y2hbMl1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeacieWujOaVtOeahOaXtumXtOiMg+WbtO+8jOWwneivleWMuemFjeWNleeLrOeahOaXtumXtOeCuVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbmdsZVRpbWVNYXRjaCA9IHJhd1RleHQubWF0Y2goc2luZ2xlVGltZVJlZ2V4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzaW5nbGVUaW1lTWF0Y2ggJiYgc2luZ2xlVGltZU1hdGNoWzFdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZVJhbmdlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydFRpbWU6IHNpbmdsZVRpbWVNYXRjaFsxXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kVGltZTogJydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDmj5Dlj5bku7vliqHmj4/ov7DvvIjljrvpmaTml6XmnJ/jgIHml7bpl7TjgIHlhajlpKnjgIHmoIfnrb7nrYnmoIforrDvvIlcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhc2tEZXNjcmlwdGlvbiA9IHJhd1RleHQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDnp7vpmaTml6XmnJ/moIforrBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGVNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0Rlc2NyaXB0aW9uID0gdGFza0Rlc2NyaXB0aW9uLnJlcGxhY2UoZHVlRGF0ZVJlZ2V4LCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDnp7vpmaTliJvlu7rml6XmnJ/moIforrDvvIznoa7kv53lroPkuI3kvJrlh7rnjrDlnKjku7vliqHmj4/ov7DkuK1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNyZWF0ZWRBdE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrRGVzY3JpcHRpb24gPSB0YXNrRGVzY3JpcHRpb24ucmVwbGFjZShjcmVhdGVkQXRSZWdleCwgJycpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g56e76Zmk5byA5aeL5pel5pyf5qCH6K6wXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydERhdGVNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0Rlc2NyaXB0aW9uID0gdGFza0Rlc2NyaXB0aW9uLnJlcGxhY2Uoc3RhcnREYXRlUmVnZXgsICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpOWFqOWkqeagh+iusFxuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbERheU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrRGVzY3JpcHRpb24gPSB0YXNrRGVzY3JpcHRpb24ucmVwbGFjZShmdWxsRGF5UmVnZXgsICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpOaXtumXtOiMg+WbtFxuICAgICAgICAgICAgICAgICAgICBpZiAodGltZVJhbmdlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tEZXNjcmlwdGlvbiA9IHRhc2tEZXNjcmlwdGlvbi5yZXBsYWNlKHRpbWVSYW5nZVJlZ2V4LCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpbmdsZVRpbWVNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFza0Rlc2NyaXB0aW9uID0gdGFza0Rlc2NyaXB0aW9uLnJlcGxhY2Uoc2luZ2xlVGltZVJlZ2V4LCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyDnp7vpmaTmoIfnrb7vvIjku6Uj5byA5aS055qE5qCH562+77yJXG4gICAgICAgICAgICAgICAgICAgIHRhc2tEZXNjcmlwdGlvbiA9IHRhc2tEZXNjcmlwdGlvbi5yZXBsYWNlKC8jXFxTKy9nLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8g56e76ZmkZW1vamnmoIfnrb7vvIjlpoIg8J+Uge+8iVxuICAgICAgICAgICAgICAgICAgICB0YXNrRGVzY3JpcHRpb24gPSB0YXNrRGVzY3JpcHRpb24ucmVwbGFjZSgvW/CflIHwn5OF4o+z8J+UvPCfk4XinIXij7jvuI/wn5SB8J+UhF0vZywgJycpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOWOu+mZpOWkmuS9meeahOepuuagvFxuICAgICAgICAgICAgICAgICAgICB0YXNrRGVzY3JpcHRpb24gPSB0YXNrRGVzY3JpcHRpb24ucmVwbGFjZSgvXFxzKy9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGZpbGVUYXNrcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHRhc2tEZXNjcmlwdGlvbiwgLy8g5Y+q5pi+56S65Lu75Yqh5o+P6L+w77yM5LiN5YyF5ZCr5pel5pyf5ZKM5pe26Ze0XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IGNvbXBsZXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdWVEYXRlOiBkdWVEYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBjcmVhdGVkQXQsIC8vIOWtmOWCqOWIm+W7uuaXpeacn++8jOS9huS4jeWcqOS7u+WKoeWIl+ihqOS4reaYvuekulxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnREYXRlOiBzdGFydERhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICByYXdUZXh0OiByYXdUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZnVsbERheTogZnVsbERheSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVSYW5nZTogdGltZVJhbmdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5pu05paw57yT5a2YXG4gICAgICAgICAgICBmaWxlQ2FjaGVNYXAuc2V0KGNhY2hlS2V5LCB7XG4gICAgICAgICAgICAgICAgbXRpbWU6IGZpbGVTdGF0Lm10aW1lLFxuICAgICAgICAgICAgICAgIHRhc2tzOiBmaWxlVGFza3NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gZmlsZVRhc2tzO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHJlYWQgZmlsZSAke2ZpbGUucGF0aH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8g562J5b6F5omA5pyJ5paH5Lu25aSE55CG5a6M5oiQXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKGZpbGVQcm9taXNlcyk7XG4gICAgXG4gICAgLy8g5ZCI5bm257uT5p6cXG4gICAgZm9yIChjb25zdCBmaWxlVGFza3Mgb2YgcmVzdWx0cykge1xuICAgICAgICB0YXNrcy5wdXNoKC4uLmZpbGVUYXNrcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhc2tzO1xufVxuXG4vLyDmuIXpmaTku7vliqHnvJPlrZhcbmV4cG9ydCBmdW5jdGlvbiBjbGVhclRhc2tDYWNoZSgpOiB2b2lkIHtcbiAgICBmaWxlQ2FjaGVNYXAuY2xlYXIoKTtcbn1cblxuLy8g5a6a5LmJ562b6YCJ6KeE5YiZ55qE57G75Z6LXG50eXBlIEZpbHRlclJ1bGVUeXBlID0gJ2luY2x1ZGUnIHwgJ2V4Y2x1ZGUnO1xuXG4vLyDlrprkuYnnrZvpgInop4TliJlcbmV4cG9ydCBpbnRlcmZhY2UgRmlsdGVyUnVsZSB7XG4gICAgdHlwZTogRmlsdGVyUnVsZVR5cGU7XG4gICAgdmFsdWU6IHN0cmluZztcbiAgICBpc1RhZzogYm9vbGVhbjtcbn1cblxuLy8g5a6a5LmJ6YC76L6R6L+Q566X56ym57G75Z6LXG50eXBlIExvZ2ljYWxPcGVyYXRvciA9ICdhbmQnIHwgJ29yJztcblxuLy8g5a6a5LmJ6KGo6L6+5byP6IqC54K557G75Z6LXG5leHBvcnQgaW50ZXJmYWNlIEV4cHJlc3Npb25Ob2RlIHtcbiAgICB0eXBlOiAncnVsZScgfCAnbG9naWNhbCcgfCAnZ3JvdXAnO1xuICAgIHJ1bGU/OiBGaWx0ZXJSdWxlO1xuICAgIG9wZXJhdG9yPzogTG9naWNhbE9wZXJhdG9yO1xuICAgIGxlZnQ/OiBFeHByZXNzaW9uTm9kZTtcbiAgICByaWdodD86IEV4cHJlc3Npb25Ob2RlO1xuICAgIGV4cHJlc3Npb25zPzogRXhwcmVzc2lvbk5vZGVbXTtcbn1cblxuLy8g6K+N5rOV5YiG5p6Q5Zmo77ya5bCG562b6YCJ5a2X56ym5Liy6L2s5o2i5Li65qCH6K6wXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemVGaWx0ZXIoZmlsdGVyU3RyaW5nOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgLy8g5pu/5o2i5ous5Y+35Li656m65qC85YyF5Zu055qE5ous5Y+377yM5Lul5L6/5LqO5YiG5YmyXG4gICAgY29uc3Qgbm9ybWFsaXplZFN0cmluZyA9IGZpbHRlclN0cmluZy5yZXBsYWNlKC9cXCgvZywgJyAoICcpLnJlcGxhY2UoL1xcKS9nLCAnICkgJyk7XG4gICAgLy8g5YiG5Ymy5Li65qCH6K6wXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWRTdHJpbmcuc3BsaXQoL1xccysvKS5maWx0ZXIodG9rZW4gPT4gdG9rZW4udHJpbSgpKTtcbn1cblxuLy8g6K+t5rOV5YiG5p6Q5Zmo77ya5bCG5qCH6K6w6L2s5o2i5Li65oq96LGh6K+t5rOV5qCRXG5mdW5jdGlvbiBwYXJzZVRva2Vucyh0b2tlbnM6IHN0cmluZ1tdKTogRXhwcmVzc2lvbk5vZGUge1xuICAgIGxldCBpbmRleCA9IDA7XG5cbiAgICBmdW5jdGlvbiBwYXJzZUV4cHJlc3Npb24oKTogRXhwcmVzc2lvbk5vZGUge1xuICAgICAgICByZXR1cm4gcGFyc2VMb2dpY2FsRXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTG9naWNhbEV4cHJlc3Npb24oKTogRXhwcmVzc2lvbk5vZGUge1xuICAgICAgICBsZXQgbGVmdCA9IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCB0b2tlbnMubGVuZ3RoICYmICh0b2tlbnNbaW5kZXhdID09PSAnYW5kJyB8fCB0b2tlbnNbaW5kZXhdID09PSAnb3InKSkge1xuICAgICAgICAgICAgY29uc3Qgb3BlcmF0b3IgPSB0b2tlbnNbaW5kZXhdIGFzIExvZ2ljYWxPcGVyYXRvcjtcbiAgICAgICAgICAgIGluZGV4Kys7XG4gICAgICAgICAgICBjb25zdCByaWdodCA9IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIGxlZnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2xvZ2ljYWwnLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGxlZnQsXG4gICAgICAgICAgICAgICAgcmlnaHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGVmdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk6IEV4cHJlc3Npb25Ob2RlIHtcbiAgICAgICAgaWYgKHRva2Vuc1tpbmRleF0gPT09ICcoJykge1xuICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIGNvbnN0IGV4cHJlc3Npb25zOiBFeHByZXNzaW9uTm9kZVtdID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IHRva2Vucy5sZW5ndGggJiYgdG9rZW5zW2luZGV4XSAhPT0gJyknKSB7XG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChwYXJzZUV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpbmRleCA8IHRva2Vucy5sZW5ndGggJiYgdG9rZW5zW2luZGV4XSA9PT0gJyknKSB7XG4gICAgICAgICAgICAgICAgaW5kZXgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZ3JvdXAnLFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlUnVsZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VSdWxlKCk6IEV4cHJlc3Npb25Ob2RlIHtcbiAgICAgICAgbGV0IHRva2VuID0gdG9rZW5zW2luZGV4XTtcbiAgICAgICAgbGV0IHR5cGU6IEZpbHRlclJ1bGVUeXBlID0gJ2luY2x1ZGUnO1xuICAgICAgICBsZXQgdmFsdWUgPSB0b2tlbiB8fCAnJztcbiAgICAgICAgbGV0IGlzVGFnID0gZmFsc2U7XG5cbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5o6S6Zmk6KeE5YiZXG4gICAgICAgIGlmICh0b2tlbiAmJiB0b2tlbi5zdGFydHNXaXRoKCchJykpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnZXhjbHVkZSc7XG4gICAgICAgICAgICB2YWx1ZSA9IHRva2VuLnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOajgOafpeaYr+WQpuaYr+agh+etvlxuICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuc3RhcnRzV2l0aCgnIycpKSB7XG4gICAgICAgICAgICBpc1RhZyA9IHRydWU7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cmluZygxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6ICdydWxlJyxcbiAgICAgICAgICAgIHJ1bGU6IHtcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBpc1RhZ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZUV4cHJlc3Npb24oKTtcbn1cblxuLy8g6Kej5p6Q6Ieq5a6a5LmJ562b6YCJ6KeE5YiZXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDdXN0b21GaWx0ZXIoZmlsdGVyU3RyaW5nOiBzdHJpbmcpOiBFeHByZXNzaW9uTm9kZSB8IG51bGwge1xuICAgIGlmICghZmlsdGVyU3RyaW5nLnRyaW0oKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZUZpbHRlcihmaWx0ZXJTdHJpbmcpO1xuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJzZVRva2Vucyh0b2tlbnMpO1xufVxuXG4vLyDmo4Dmn6Xku7vliqHmmK/lkKbljLnphY3nrZvpgInop4TliJlcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaEZpbHRlclJ1bGUodGFzazogVGFzaywgcnVsZTogRmlsdGVyUnVsZSk6IGJvb2xlYW4ge1xuICAgIGlmIChydWxlLmlzVGFnKSB7XG4gICAgICAgIC8vIOajgOafpeS7u+WKoeaWh+acrOaYr+WQpuWMheWQq+agh+etvlxuICAgICAgICByZXR1cm4gdGFzay5yYXdUZXh0LmluY2x1ZGVzKGAjJHtydWxlLnZhbHVlfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIOajgOafpeS7u+WKoeaWh+S7tui3r+W+hOaYr+WQpuWcqOaMh+Wumui3r+W+hOS4rVxuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHRhc2suZmlsZVBhdGg7XG4gICAgICAgIHJldHVybiBmaWxlUGF0aC5zdGFydHNXaXRoKHJ1bGUudmFsdWUgKyBcIi9cIikgfHwgZmlsZVBhdGggPT09IHJ1bGUudmFsdWU7XG4gICAgfVxufVxuXG4vLyDor4TkvLDooajovr7lvI/oioLngrlcbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZUV4cHJlc3Npb24odGFzazogVGFzaywgbm9kZTogRXhwcmVzc2lvbk5vZGUpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICBjYXNlICdydWxlJzpcbiAgICAgICAgICAgIGlmIChub2RlLnJ1bGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gbWF0Y2hGaWx0ZXJSdWxlKHRhc2ssIG5vZGUucnVsZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucnVsZS50eXBlID09PSAnaW5jbHVkZScgPyBtYXRjaGVzIDogIW1hdGNoZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIGNhc2UgJ2xvZ2ljYWwnOlxuICAgICAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgJiYgbm9kZS5sZWZ0ICYmIG5vZGUucmlnaHQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZWZ0UmVzdWx0ID0gZXZhbHVhdGVFeHByZXNzaW9uKHRhc2ssIG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmlnaHRSZXN1bHQgPSBldmFsdWF0ZUV4cHJlc3Npb24odGFzaywgbm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUub3BlcmF0b3IgPT09ICdhbmQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0UmVzdWx0ICYmIHJpZ2h0UmVzdWx0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7IC8vIG9yXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0UmVzdWx0IHx8IHJpZ2h0UmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgY2FzZSAnZ3JvdXAnOlxuICAgICAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbnMgJiYgbm9kZS5leHByZXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8g5a+55LqO5YiG57uE6KGo6L6+5byP77yM6buY6K6k5L2/55SoIE9SIOmAu+i+kVxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLmV4cHJlc3Npb25zLnNvbWUoZXhwciA9PiBldmFsdWF0ZUV4cHJlc3Npb24odGFzaywgZXhwcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufVxuXG4vLyDnrZvpgInku7vliqFcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJUYXNrcyh0YXNrczogVGFza1tdLCBzZXR0aW5nczogTXlQbHVnaW5TZXR0aW5ncywgZmlsdGVyRGF0ZTogRGF0ZSk6IFRhc2tbXSB7XG4gICAgY29uc3QgY3VzdG9tRmlsdGVyID0gc2V0dGluZ3MudGFza0ZpbHRlci5jdXN0b21GaWx0ZXI7XG4gICAgY29uc3QgZXhwcmVzc2lvbiA9IHBhcnNlQ3VzdG9tRmlsdGVyKGN1c3RvbUZpbHRlcik7XG4gICAgXG4gICAgLy8g55Sf5oiQ5b2T5aSp5pel6K6w55qE6Lev5b6EXG4gICAgY29uc3QgZGFpbHlTZXR0aW5ncyA9IHNldHRpbmdzLmRhaWx5Tm90ZTtcbiAgICBjb25zdCBkYWlseUZpbGVOYW1lID0gZm9ybWF0RGF0ZShmaWx0ZXJEYXRlLCBkYWlseVNldHRpbmdzLmZpbGVOYW1lRm9ybWF0KTtcbiAgICBjb25zdCBkYWlseU5vdGVQYXRoID0gYCR7ZGFpbHlTZXR0aW5ncy5zYXZlUGF0aH0vJHtkYWlseUZpbGVOYW1lfS5tZGA7XG4gICAgXG4gICAgcmV0dXJuIHRhc2tzLmZpbHRlcih0YXNrID0+IHtcbiAgICAgICAgbGV0IGlzVGFza0ZvclRvZGF5ID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyDmo4Dmn6UxOiDmnInmiKrmraLml6XmnJ/kuJTmiKrmraLml6XmnJ/mmK/lvZPlpKnnmoTku7vliqFcbiAgICAgICAgaWYgKHRhc2suZHVlRGF0ZSkge1xuICAgICAgICAgICAgLy8g6K6+572u5b2T5aSp55qE5byA5aeL5pe26Ze0XG4gICAgICAgICAgICBjb25zdCBzdGFydE9mRGF5ID0gbmV3IERhdGUoZmlsdGVyRGF0ZSk7XG4gICAgICAgICAgICBzdGFydE9mRGF5LnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDorr7nva7lvZPlpKnnmoTnu5PmnZ/ml7bpl7RcbiAgICAgICAgICAgIGNvbnN0IGVuZE9mRGF5ID0gbmV3IERhdGUoZmlsdGVyRGF0ZSk7XG4gICAgICAgICAgICBlbmRPZkRheS5zZXRIb3VycygyMywgNTksIDU5LCA5OTkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDlj6rmmL7npLrmiKrmraLml6XmnJ/lnKjlvZPlpKnojIPlm7TlhoXnmoTku7vliqFcbiAgICAgICAgICAgIGlmICh0YXNrLmR1ZURhdGUgPj0gc3RhcnRPZkRheSAmJiB0YXNrLmR1ZURhdGUgPD0gZW5kT2ZEYXkpIHtcbiAgICAgICAgICAgICAgICBpc1Rhc2tGb3JUb2RheSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIOajgOafpTI6IOayoeacieaIquatouaXpeacn+S9huWcqOW9k+WkqeeslOiusOS4reeahOS7u+WKoVxuICAgICAgICBpZiAoIWlzVGFza0ZvclRvZGF5ICYmICF0YXNrLmR1ZURhdGUpIHtcbiAgICAgICAgICAgIC8vIOavlOi+g+S7u+WKoeeahOaWh+S7tui3r+W+hOS4juW9k+WkqeaXpeiusOeahOi3r+W+hFxuICAgICAgICAgICAgaWYgKHRhc2suZmlsZVBhdGggPT09IGRhaWx5Tm90ZVBhdGgpIHtcbiAgICAgICAgICAgICAgICBpc1Rhc2tGb3JUb2RheSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIOWmguaenOS7u+WKoeS4jeespuWQiOW9k+WkqeS7u+WKoeeahOadoeS7tu+8jOebtOaOpei/h+a7pOaOiVxuICAgICAgICBpZiAoIWlzVGFza0ZvclRvZGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIOWmguaenOayoeacieetm+mAieinhOWIme+8jOm7mOiupOmAmui/h1xuICAgICAgICBpZiAoIWV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDor4TkvLDooajovr7lvI9cbiAgICAgICAgcmV0dXJuIGV2YWx1YXRlRXhwcmVzc2lvbih0YXNrLCBleHByZXNzaW9uKTtcbiAgICB9KTtcbn1cblxuLy8g5pu05paw56yU6K6w5Lit55qE5Lu75Yqh54q25oCBXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlVGFza0luTm90ZShhcHA6IEFwcCwgdGFzazogVGFzaywgY29tcGxldGVkOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8g6K+75Y+W56yU6K6w5YaF5a65XG4gICAgICAgIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOaehOW7uuS7u+WKoeeahOato+WImeihqOi+vuW8j++8jOWMuemFjeWOn+Wni+S7u+WKoeihjFxuICAgICAgICAgICAgY29uc3QgdGFza1JlZ2V4ID0gbmV3IFJlZ0V4cChgXlxccyotXFxzKlxcWyguKVxcXVxccyooJHtlc2NhcGVSZWdFeHAodGFzay5yYXdUZXh0KX0pYCwgJ20nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5pu/5o2i5Lu75Yqh54q25oCB5ZKM5a6M5oiQ5pel5pyfXG4gICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gY29udGVudC5yZXBsYWNlKHRhc2tSZWdleCwgKG1hdGNoLCBzdGF0dXMsIHRhc2tUZXh0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hlY2tib3ggPSBjb21wbGV0ZWQgPyAnW3hdJyA6ICdbIF0nO1xuICAgICAgICAgICAgICAgIGxldCB1cGRhdGVkVGFza1RleHQgPSB0YXNrVGV4dDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDmoLnmja5UYXNrc+aPkuS7tuagvOW8j++8jOWkhOeQhuWujOaIkOaXpeacn1xuICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5Lu75Yqh5bey5a6M5oiQ77yM5re75Yqg5a6M5oiQ5pel5pyf5qCH6K6wIOKchSBZWVlZLU1NLUREXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRvbmVEYXRlUmVnZXggPSAvXFxzKuKchVxccypcXGR7NH0tXFxkezJ9LVxcZHsyfS87XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9uZURhdGVSZWdleC50ZXN0KHVwZGF0ZWRUYXNrVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOW3sue7j+acieWujOaIkOaXpeacn++8jOabtOaWsOWug1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlZFRhc2tUZXh0ID0gdXBkYXRlZFRhc2tUZXh0LnJlcGxhY2UoZG9uZURhdGVSZWdleCwgYCDinIUgJHt0b2RheX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOayoeacieWujOaIkOaXpeacn++8jOa3u+WKoOWug1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlZFRhc2tUZXh0ICs9IGAg4pyFICR7dG9kYXl9YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOS7u+WKoeacquWujOaIkO+8jOenu+mZpOWujOaIkOaXpeacn+agh+iusFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkb25lRGF0ZVJlZ2V4ID0gL1xccyrinIVcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vO1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkVGFza1RleHQgPSB1cGRhdGVkVGFza1RleHQucmVwbGFjZShkb25lRGF0ZVJlZ2V4LCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyDkv53mjIHljp/lp4vnmoTnvKnov5tcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRlbnRNYXRjaCA9IG1hdGNoLm1hdGNoKC9eKFxccyopLyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5kZW50ID0gaW5kZW50TWF0Y2ggPyBpbmRlbnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBgJHtpbmRlbnR9LSAke2NoZWNrYm94fSAke3VwZGF0ZWRUYXNrVGV4dH1gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOS/neWtmOS/ruaUueWQjueahOWGheWuuVxuICAgICAgICAgICAgYXdhaXQgYXBwLnZhdWx0Lm1vZGlmeShmaWxlLCBuZXdDb250ZW50KTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdGFzayBpbiBub3RlOiAke3Rhc2suZmlsZVBhdGh9YCwgZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG59XG5cbi8vIOWcqOeslOiusOS4reWIm+W7uuS7u+WKoVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVRhc2tJbk5vdGUoXG4gICAgYXBwOiBBcHAsIFxuICAgIHRhc2tUZXh0OiBzdHJpbmcsIFxuICAgIGRhdGU6IERhdGUsIFxuICAgIHNldHRpbmdzOiBNeVBsdWdpblNldHRpbmdzLFxuICAgIGluc2VydFRhcmdldDogXCJkYWlseVwiIHwgXCJub3RlXCIgfCBcImN1cnJlbnRcIixcbiAgICBjdXN0b21Ob3RlUGF0aD86IHN0cmluZyxcbiAgICBjb25maWdJZD86IHN0cmluZ1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8g5L2/55SoIGNhcHR1cmUgdG8g5Yqf6IO9XG4gICAgICAgIGNvbnN0IHsgQ2FwdHVyZUNob2ljZUVuZ2luZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9lbmdpbmUvQ2FwdHVyZUNob2ljZUVuZ2luZScpO1xuICAgICAgICBjb25zdCBNeVBsdWdpbiA9ICh3aW5kb3cgYXMgYW55KS5qaXVqaXVPYnNpZGlhbkNhbGVuZGFyUGx1Z2luO1xuICAgICAgICBcbiAgICAgICAgaWYgKE15UGx1Z2luICYmIE15UGx1Z2luLmluc3RhbmNlKSB7XG4gICAgICAgICAgICAvLyDliJvlu7ogY2hvaWNlIGV4ZWN1dG9yXG4gICAgICAgICAgICBjb25zdCBjaG9pY2VFeGVjdXRvcjogSUNob2ljZUV4ZWN1dG9yID0ge1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlczogbmV3IE1hcCgpLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6I635Y+WIGNhcHR1cmUgdG8g6K6+572u77yM56Gu5L+ddGFza1NldHRpbmdz5ZKMY2FwdHVyZVRvU2V0dGluZ3PlrZjlnKhcbiAgICAgICAgICAgIGNvbnN0IHRhc2tTZXR0aW5ncyA9IHNldHRpbmdzLnRhc2tTZXR0aW5ncyB8fCB7IGNhcHR1cmVUb1NldHRpbmdzOiB7IGVuYWJsZWQ6IGZhbHNlLCBjb25maWdzOiBbXSB9IH07XG4gICAgICAgICAgICBjb25zdCBjYXB0dXJlU2V0dGluZ3MgPSB0YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3MgfHwgeyBlbmFibGVkOiBmYWxzZSwgY29uZmlnczogW10gfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g6YCJ5oup6YWN572uXG4gICAgICAgICAgICBsZXQgc2VsZWN0ZWRDb25maWdJZDogc3RyaW5nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ0lkKSB7XG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRDb25maWdJZCA9IGNvbmZpZ0lkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbnNlcnRUYXJnZXQgPT09IFwiZGFpbHlcIikge1xuICAgICAgICAgICAgICAgIC8vIOWvueS6juavj+aXpeeslOiusO+8jOS9v+eUqOm7mOiupOmFjee9rlxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQ29uZmlnSWQgPSBjYXB0dXJlU2V0dGluZ3MudGFza0NvbmZpZ0lkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpbnNlcnRUYXJnZXQgPT09IFwibm90ZVwiKSB7XG4gICAgICAgICAgICAgICAgLy8g5a+55LqO5pmu6YCa56yU6K6w77yM5L2/55So6buY6K6k6YWN572uXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRDb25maWdJZCA9IGNhcHR1cmVTZXR0aW5ncy50YXNrQ29uZmlnSWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIOWvueS6juW9k+WJjeeslOiusO+8jOS9v+eUqOm7mOiupOmFjee9rlxuICAgICAgICAgICAgICAgIHNlbGVjdGVkQ29uZmlnSWQgPSBjYXB0dXJlU2V0dGluZ3MudGFza0NvbmZpZ0lkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzZWxlY3RlZENvbmZpZyA9IGNhcHR1cmVTZXR0aW5ncy5jb25maWdzLmZpbmQoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gc2VsZWN0ZWRDb25maWdJZCAmJiBjb25maWcuZW5hYmxlZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOWmguaenOayoeacieaJvuWIsOWQr+eUqOeahOmFjee9ru+8jOS9v+eUqOesrOS4gOS4quWQr+eUqOeahOmFjee9rlxuICAgICAgICAgICAgbGV0IGNvbmZpZ1RvVXNlID0gc2VsZWN0ZWRDb25maWcgfHwgY2FwdHVyZVNldHRpbmdzLmNvbmZpZ3MuZmluZChjb25maWcgPT4gY29uZmlnLmVuYWJsZWQpIHx8IGNhcHR1cmVTZXR0aW5ncy5jb25maWdzWzBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDlpoLmnpzmsqHmnInphY3nva7vvIzkvb/nlKjpu5jorqTphY3nva5cbiAgICAgICAgaWYgKCFjb25maWdUb1VzZSkge1xuICAgICAgICAgICAgY29uZmlnVG9Vc2UgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IFwiZGVmYXVsdFwiLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwi6buY6K6k6YWN572uXCIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwi6buY6K6k55qEIENhcHR1cmUgVG8g6YWN572uXCIsXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0Q2FwdHVyZVBhdGg6IFwie3vml6XorrB9fVwiLFxuICAgICAgICAgICAgICAgIGNhcHR1cmVUb0FjdGl2ZUZpbGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGhvdGtleTogbnVsbCxcbiAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogXCJzaW5nbGUtbGluZVwiLFxuICAgICAgICAgICAgICAgIGNyZWF0ZUZpbGVJZkl0RG9lc250RXhpc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlV2l0aFRlbXBsYXRlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogXCJ7e+aXpeiusOaooeadv319XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IFwie3tUQVNLX1RFWFR9fVxcblwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0FkZER1ZURhdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGR1ZURhdGVPcHRpb246IFwidG9kYXlcIixcbiAgICAgICAgICAgICAgICBjdXN0b21EdWVEYXlzOiAxLFxuICAgICAgICAgICAgICAgIHByZXBlbmQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFwcGVuZExpbms6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHRhc2s6IHRydWUsXG4gICAgICAgICAgICAgICAgaW5zZXJ0QWZ0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYWZ0ZXI6IFwiIyMg5pel5bi46K6w5b2VXCIsXG4gICAgICAgICAgICAgICAgICAgIGluc2VydEF0RW5kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlSWZOb3RGb3VuZExvY2F0aW9uOiBcImJvdHRvbVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBuZXdMaW5lQ2FwdHVyZToge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcImJlbG93XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9wZW5GaWxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBmaWxlT3BlbmluZzoge1xuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbjogXCJ0YWJcIixcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBcInZlcnRpY2FsXCIsXG4gICAgICAgICAgICAgICAgICAgIG1vZGU6IFwiZGVmYXVsdFwiLFxuICAgICAgICAgICAgICAgICAgICBmb2N1czogdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8g5p6E5bu6IGNhcHR1cmUgY2hvaWNlXG4gICAgICAgICAgICBsZXQgY2FwdHVyZVRvUGF0aCA9IFwiXCI7XG4gICAgICAgICAgICBpZiAoY3VzdG9tTm90ZVBhdGgpIHtcbiAgICAgICAgICAgICAgICBjYXB0dXJlVG9QYXRoID0gY3VzdG9tTm90ZVBhdGg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGluc2VydFRhcmdldCA9PT0gXCJkYWlseVwiKSB7XG4gICAgICAgICAgICAgICAgY2FwdHVyZVRvUGF0aCA9IFwie3vml6XorrB9fVwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYXB0dXJlVG9QYXRoID0gY29uZmlnVG9Vc2UuZGVmYXVsdENhcHR1cmVQYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDnlJ/miJAgVGFza3Mg5qC85byP55qE5Lu75Yqh5paH5pysXG4gICAgICAgICAgICBsZXQgZmluYWxUYXNrVGV4dDogc3RyaW5nO1xuICAgICAgICAgICAgLy8g5omA5pyJ6YWN572u6YO95L2/55SoVGFza3Pmj5Lku7bmoLzlvI9cbiAgICAgICAgICAgIC8vIOWvvOWFpSBUYXNrVGV4dEJ1aWxkZXJcbiAgICAgICAgICAgIGNvbnN0IHsgVGFza1RleHRCdWlsZGVyIH0gPSBhd2FpdCBpbXBvcnQoJy4vdGFza3NGb3JtYXRCdWlsZGVyJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOino+aekOeOsOacieeahOS7u+WKoeaWh+acrO+8jOS/neeVmeWFtuS4reeahOWxnuaAp1xuICAgICAgICAgICAgY29uc3QgdGFza0J1aWxkZXIgPSBUYXNrVGV4dEJ1aWxkZXIucGFyc2UodGFza1RleHQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmo4Dmn6Xku7vliqHmlofmnKzkuK3mmK/lkKblt7Lnu4/ljIXlkKvliJvlu7rml6XmnJ9cbiAgICAgICAgICAgIGNvbnN0IGhhc0NyZWF0ZWREYXRlID0gL1xccyooXFwrfOKelSlcXHMqKFxcZHs0fS1cXGR7Mn0tXFxkezJ9KVxccyovLnRlc3QodGFza1RleHQpO1xuICAgICAgICAgICAgLy8g5Y+q5pyJ5b2T5Lu75Yqh5paH5pys5Lit5rKh5pyJ5Yib5bu65pel5pyf77yM5LiU6YWN572u5YWB6K646Ieq5Yqo5re75Yqg5pe277yM5omN5re75Yqg5Yib5bu65pel5pyfXG4gICAgICAgICAgICBpZiAoY29uZmlnVG9Vc2UuYXV0b0FkZENyZWF0ZWREYXRlICYmICFoYXNDcmVhdGVkRGF0ZSkge1xuICAgICAgICAgICAgICAgIHRhc2tCdWlsZGVyLnNldENyZWF0ZWREYXRlKGRhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDmo4Dmn6Xku7vliqHmlofmnKzkuK3mmK/lkKblt7Lnu4/ljIXlkKvmiKrmraLml6XmnJ9cbiAgICAgICAgICAgIGNvbnN0IGhhc0R1ZURhdGUgPSAvXFxzKijwn5OFfGR1ZTopXFxzKihcXGR7NH0tXFxkezJ9LVxcZHsyfSlcXHMqLy50ZXN0KHRhc2tUZXh0KTtcbiAgICAgICAgICAgIC8vIOWPquacieW9k+S7u+WKoeaWh+acrOS4reayoeacieaIquatouaXpeacn++8jOS4lOmFjee9ruWFgeiuuOiHquWKqOa3u+WKoOaXtu+8jOaJjea3u+WKoOaIquatouaXpeacn1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1RvVXNlLmF1dG9BZGREdWVEYXRlICYmICFoYXNEdWVEYXRlKSB7XG4gICAgICAgICAgICAgICAgLy8g6K6h566X5oiq5q2i5pel5pyf55qE6L6F5Yqp5Ye95pWwXG4gICAgICAgICAgICAgICAgY29uc3QgY2FsY3VsYXRlRHVlRGF0ZSA9IChiYXNlRGF0ZTogRGF0ZSwgb3B0aW9uOiBzdHJpbmcsIGN1c3RvbURheXM6IG51bWJlcik6IERhdGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBuZXcgRGF0ZShiYXNlRGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG9wdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRvZGF5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjdXN0b21cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0RGF0ZShyZXN1bHQuZ2V0RGF0ZSgpICsgY3VzdG9tRGF5cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ3ZWVrZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6K6h566X5pys5ZGo5pyr77yI5ZGo5YWt77yJXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF5T2ZXZWVrID0gcmVzdWx0LmdldERheSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheXNUb1NhdHVyZGF5ID0gNiAtIGRheU9mV2VlaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0RGF0ZShyZXN1bHQuZ2V0RGF0ZSgpICsgZGF5c1RvU2F0dXJkYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwibW9udGhFbmRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDorqHnrpfmnKzmnIjlupVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0TW9udGgocmVzdWx0LmdldE1vbnRoKCkgKyAxLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInllYXJFbmRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDorqHnrpfmnKzlubTlupVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0TW9udGgoMTEsIDMxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBkdWVEYXRlID0gY2FsY3VsYXRlRHVlRGF0ZShcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnVG9Vc2UuZHVlRGF0ZU9wdGlvbixcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnVG9Vc2UuY3VzdG9tRHVlRGF5c1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgdGFza0J1aWxkZXIuc2V0RHVlRGF0ZShkdWVEYXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZmluYWxUYXNrVGV4dCA9IHRhc2tCdWlsZGVyLmJ1aWxkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGNhcHR1cmVDaG9pY2UgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogXCJDcmVhdGUgVGFza1wiLFxuICAgICAgICAgICAgICAgIGlkOiBcImNyZWF0ZS10YXNrXCIsXG4gICAgICAgICAgICAgICAgdHlwZTogQ2hvaWNlVHlwZS5DYXB0dXJlLFxuICAgICAgICAgICAgICAgIGNvbW1hbmQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGNhcHR1cmVUbzogY2FwdHVyZVRvUGF0aCxcbiAgICAgICAgICAgICAgICBjYXB0dXJlVG9BY3RpdmVGaWxlOiBpbnNlcnRUYXJnZXQgPT09IFwiY3VycmVudFwiIHx8IGNvbmZpZ1RvVXNlLmNhcHR1cmVUb0FjdGl2ZUZpbGUsXG4gICAgICAgICAgICAgICAgY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdDoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb25maWdUb1VzZS5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LmVuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVdpdGhUZW1wbGF0ZTogY29uZmlnVG9Vc2UuY3JlYXRlRmlsZUlmSXREb2VzbnRFeGlzdC5jcmVhdGVXaXRoVGVtcGxhdGUsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBjb25maWdUb1VzZS5jcmVhdGVGaWxlSWZJdERvZXNudEV4aXN0LnRlbXBsYXRlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZm9ybWF0OiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbmZpZ1RvVXNlLmZvcm1hdC5lbmFibGVkLFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGNvbmZpZ1RvVXNlLmZvcm1hdC5mb3JtYXQucmVwbGFjZShcInt7VEFTS19URVhUfX1cIiwgZmluYWxUYXNrVGV4dCkucmVwbGFjZShcInt7REFURX19XCIsIGZvcm1hdERhdGUoZGF0ZSwgXCJZWVlZLU1NLUREXCIpKSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHByZXBlbmQ6IGNvbmZpZ1RvVXNlLnByZXBlbmQsXG4gICAgICAgICAgICAgICAgYXBwZW5kTGluazogY29uZmlnVG9Vc2UuYXBwZW5kTGluayxcbiAgICAgICAgICAgICAgICB0YXNrOiBjb25maWdUb1VzZS50YXNrLFxuICAgICAgICAgICAgICAgIGluc2VydEFmdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbmZpZ1RvVXNlLmluc2VydEFmdGVyLmVuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGFmdGVyOiBjb25maWdUb1VzZS5pbnNlcnRBZnRlci5hZnRlcixcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0QXRFbmQ6IGNvbmZpZ1RvVXNlLmluc2VydEFmdGVyLmluc2VydEF0RW5kLFxuICAgICAgICAgICAgICAgICAgICBjb25zaWRlclN1YnNlY3Rpb25zOiBjb25maWdUb1VzZS5pbnNlcnRBZnRlci5jb25zaWRlclN1YnNlY3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kOiBjb25maWdUb1VzZS5pbnNlcnRBZnRlci5jcmVhdGVJZk5vdEZvdW5kLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVJZk5vdEZvdW5kTG9jYXRpb246IGNvbmZpZ1RvVXNlLmluc2VydEFmdGVyLmNyZWF0ZUlmTm90Rm91bmRMb2NhdGlvbixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5ld0xpbmVDYXB0dXJlOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbmZpZ1RvVXNlLm5ld0xpbmVDYXB0dXJlLmVuYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogY29uZmlnVG9Vc2UubmV3TGluZUNhcHR1cmUuZGlyZWN0aW9uLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb3BlbkZpbGU6IGNvbmZpZ1RvVXNlLm9wZW5GaWxlLFxuICAgICAgICAgICAgICAgIGZpbGVPcGVuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBjb25maWdUb1VzZS5maWxlT3BlbmluZy5sb2NhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBjb25maWdUb1VzZS5maWxlT3BlbmluZy5kaXJlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG1vZGU6IGNvbmZpZ1RvVXNlLmZpbGVPcGVuaW5nLm1vZGUsXG4gICAgICAgICAgICAgICAgICAgIGZvY3VzOiBjb25maWdUb1VzZS5maWxlT3BlbmluZy5mb2N1cyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBjb25maWdUb1VzZS5pbnB1dE1ldGhvZCxcbiAgICAgICAgICAgICAgICBhdXRvQWRkQ3JlYXRlZERhdGU6IGNvbmZpZ1RvVXNlLmF1dG9BZGRDcmVhdGVkRGF0ZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRkRHVlRGF0ZTogY29uZmlnVG9Vc2UuYXV0b0FkZER1ZURhdGUsXG4gICAgICAgICAgICAgICAgZHVlRGF0ZU9wdGlvbjogY29uZmlnVG9Vc2UuZHVlRGF0ZU9wdGlvbixcbiAgICAgICAgICAgICAgICBjdXN0b21EdWVEYXlzOiBjb25maWdUb1VzZS5jdXN0b21EdWVEYXlzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDliJvlu7rlubbov5DooYwgQ2FwdHVyZUNob2ljZUVuZ2luZVxuICAgICAgICAgICAgY29uc3QgZW5naW5lID0gbmV3IENhcHR1cmVDaG9pY2VFbmdpbmUoYXBwLCBNeVBsdWdpbi5pbnN0YW5jZSwgY2FwdHVyZUNob2ljZSwgY2hvaWNlRXhlY3V0b3IpO1xuICAgICAgICAgICAgYXdhaXQgZW5naW5lLnJ1bigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXlQbHVnaW4gaW5zdGFuY2Ugbm90IGZvdW5kXCIpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSB0YXNrIGluIG5vdGU6YCwgZXJyb3IpO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG59Il19