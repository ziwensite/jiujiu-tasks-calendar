import { App, TFile } from 'obsidian';
import { taskRegex, dueDateRegex, createdAtRegex, startDateRegex, cancelledDateRegex, completedDateRegex, plannedDateRegex, fullDayRegex, timeRangeRegex, singleTimeRegex, priorityRegex, recurrenceRegex } from '../utils/regexUtils';
import type { Task } from '../types/task';

interface FileCache {
    mtime: number;
    tasks: Task[];
}

let fileCacheMap: Map<string, FileCache> = new Map();

async function extractBasicTasks(app: App): Promise<Task[]> {
    const allFiles = app.vault.getMarkdownFiles();
    const tasks: Task[] = [];

    const filePromises = allFiles.map(async (file) => {
        try {
            if (!(file instanceof TFile)) return [];

            const cacheKey = file.path;
            const cache = fileCacheMap.get(cacheKey);

            if (cache && file.stat && cache.mtime === file.stat.mtime) {
                return cache.tasks;
            }

            const content = await app.vault.read(file);

            const fileTasks: Task[] = [];
            let match;

            taskRegex.lastIndex = 0;

            while ((match = taskRegex.exec(content)) !== null) {
                if (match[1] && match[2]) {
                    const status = match[1];
                    const completed = status.toLowerCase() === 'x';
                    const rawText = match[2].trim();

                    const matchStart = match.index;
                    const matchEnd = match.index + match[0].length;

                    const beforeMatch = content.substring(0, matchStart);
                    const lines = beforeMatch.split('\n');
                    const startLine = lines.length - 1;
                    const startCol = lines[startLine]?.length || 0;

                    const afterMatch = content.substring(0, matchEnd);
                    const endLines = afterMatch.split('\n');
                    const endLine = endLines.length - 1;
                    const endCol = endLines[endLine]?.length || 0;

                    const lineCount = endLine - startLine + 1;

                    const dateMatch = rawText.match(dueDateRegex);
                    let dueDate: Date | undefined;
                    if (dateMatch && dateMatch[1]) {
                        dueDate = new Date(dateMatch[1]);
                    }

                    const createdAtMatch = rawText.match(createdAtRegex);
                    let createdAt: Date | undefined;
                    if (createdAtMatch && createdAtMatch[1]) {
                        createdAt = new Date(createdAtMatch[1]);
                    }

                    const startDateMatch = rawText.match(startDateRegex);
                    let startDate: Date | undefined;
                    if (startDateMatch && startDateMatch[1]) {
                        startDate = new Date(startDateMatch[1]);
                    }

                    const plannedDateMatch = rawText.match(plannedDateRegex);
                    let plannedDate: Date | undefined;
                    if (plannedDateMatch && plannedDateMatch[1]) {
                        plannedDate = new Date(plannedDateMatch[1]);
                    }

                    const cancelledDateMatch = rawText.match(cancelledDateRegex);
                    let cancelledDate: Date | undefined;
                    if (cancelledDateMatch && cancelledDateMatch[1]) {
                        cancelledDate = new Date(cancelledDateMatch[1]);
                    }

                    const completedDateMatch = rawText.match(completedDateRegex);
                    let completedDate: Date | undefined;
                    if (completedDateMatch && completedDateMatch[1]) {
                        completedDate = new Date(completedDateMatch[1]);
                    }

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

                    const recurrenceMatch = rawText.match(recurrenceRegex);
                    let recurrenceRule: string | undefined;
                    if (recurrenceMatch && recurrenceMatch[1]) {
                        recurrenceRule = recurrenceMatch[1].trim();
                    }

                    const fullDayMatch = rawText.match(fullDayRegex);
                    const fullDay = !!fullDayMatch;

                    let timeRange = undefined;
                    let timeText = rawText;

                    const timeRangeMatch = rawText.match(timeRangeRegex);
                    let singleTimeMatch = null;

                    if (timeRangeMatch && timeRangeMatch[1] && timeRangeMatch[2]) {
                        timeRange = {
                            startTime: timeRangeMatch[1],
                            endTime: timeRangeMatch[2]
                        };
                    } else {
                        singleTimeMatch = rawText.match(singleTimeRegex);
                        if (singleTimeMatch) {
                            let startTime = '';
                            if (singleTimeMatch[1]) {
                                startTime = singleTimeMatch[1];
                            } else if (singleTimeMatch[2]) {
                                startTime = `${singleTimeMatch[2]}:00`;
                            }

                            if (startTime) {
                                timeRange = {
                                    startTime: startTime,
                                    endTime: ''
                                };
                            }
                        }
                    }

                    let taskDescription = rawText;

                    if (dateMatch) {
                        taskDescription = taskDescription.replace(dueDateRegex, '').trim();
                    }
                    if (createdAtMatch) {
                        taskDescription = taskDescription.replace(createdAtRegex, '').trim();
                    }
                    if (startDateMatch) {
                        taskDescription = taskDescription.replace(startDateRegex, '').trim();
                    }
                    if (plannedDateMatch) {
                        taskDescription = taskDescription.replace(plannedDateRegex, '').trim();
                    }
                    if (cancelledDateMatch) {
                        taskDescription = taskDescription.replace(cancelledDateRegex, '').trim();
                    }
                    if (completedDateMatch) {
                        taskDescription = taskDescription.replace(completedDateRegex, '').trim();
                    }
                    if (priorityMatch) {
                        taskDescription = taskDescription.replace(priorityRegex, '').trim();
                    }
                    if (recurrenceMatch) {
                        taskDescription = taskDescription.replace(recurrenceRegex, '').trim();
                    }
                    if (fullDayMatch) {
                        taskDescription = taskDescription.replace(fullDayRegex, '').trim();
                    }
                    if (timeRangeMatch) {
                        taskDescription = taskDescription.replace(timeRangeRegex, '').trim();
                    } else if (singleTimeMatch) {
                        taskDescription = taskDescription.replace(singleTimeRegex, '').trim();
                    }

                    taskDescription = taskDescription.replace(/\s+/g, ' ').trim();

                    fileTasks.push({
                        text: taskDescription,
                        completed: completed,
                        status: status,
                        priority: priority,
                        recurrenceRule: recurrenceRule,
                        filePath: file.path,
                        dueDate: dueDate,
                        createdAt: createdAt,
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

            fileCacheMap.set(cacheKey, {
                mtime: file.stat.mtime,
                tasks: fileTasks
            });

            return fileTasks;
        } catch (error) {
            console.error(`Failed to read file ${file.path}:`, error);
            return [];
        }
    });

    const results = await Promise.allSettled(filePromises);

    for (const result of results) {
        if (result.status === 'fulfilled') {
            tasks.push(...result.value);
        }
    }

    return tasks;
}

export function parseTaskFromLine(line: string, filePath: string, lineNumber: number): Task | null {
    const match = line.match(/^\s*-\s*\[(.)\]\s*(.*)$/);
    if (!match || !match[1] || match[2] === undefined) return null;

    const status = match[1];
    const completed = status.toLowerCase() === 'x';
    const rawText = match[2].trim();

    const dateMatch = rawText.match(dueDateRegex);
    let dueDate: Date | undefined;
    if (dateMatch && dateMatch[1]) {
        dueDate = new Date(dateMatch[1]);
    }

    const createdAtMatch = rawText.match(createdAtRegex);
    let createdAt: Date | undefined;
    if (createdAtMatch && createdAtMatch[1]) {
        createdAt = new Date(createdAtMatch[1]);
    }

    const startDateMatch = rawText.match(startDateRegex);
    let startDate: Date | undefined;
    if (startDateMatch && startDateMatch[1]) {
        startDate = new Date(startDateMatch[1]);
    }

    const plannedDateMatch = rawText.match(plannedDateRegex);
    let plannedDate: Date | undefined;
    if (plannedDateMatch && plannedDateMatch[1]) {
        plannedDate = new Date(plannedDateMatch[1]);
    }

    const cancelledDateMatch = rawText.match(cancelledDateRegex);
    let cancelledDate: Date | undefined;
    if (cancelledDateMatch && cancelledDateMatch[1]) {
        cancelledDate = new Date(cancelledDateMatch[1]);
    }

    const completedDateMatch = rawText.match(completedDateRegex);
    let completedDate: Date | undefined;
    if (completedDateMatch && completedDateMatch[1]) {
        completedDate = new Date(completedDateMatch[1]);
    }

    const priorityMatch = rawText.match(priorityRegex);
    let priority: string | undefined;
    if (priorityMatch && priorityMatch[1]) {
        switch (priorityMatch[1]) {
            case '🔺': priority = 'highest'; break;
            case '⏫': priority = 'high'; break;
            case '🔼': priority = 'medium'; break;
            case '🔽': priority = 'low'; break;
            case '⏬️': priority = 'lowest'; break;
        }
    }

    const recurrenceMatch = rawText.match(recurrenceRegex);
    let recurrenceRule: string | undefined;
    if (recurrenceMatch && recurrenceMatch[1]) {
        recurrenceRule = recurrenceMatch[1].trim();
    }

    const fullDayMatch = rawText.match(fullDayRegex);
    const fullDay = !!fullDayMatch;

    let timeRange = undefined;

    const timeRangeMatch = rawText.match(timeRangeRegex);
    let singleTimeMatch = null;

    if (timeRangeMatch && timeRangeMatch[1] && timeRangeMatch[2]) {
        timeRange = {
            startTime: timeRangeMatch[1],
            endTime: timeRangeMatch[2]
        };
    } else {
        singleTimeMatch = rawText.match(singleTimeRegex);
        if (singleTimeMatch) {
            let startTime = '';
            if (singleTimeMatch[1]) {
                startTime = singleTimeMatch[1];
            } else if (singleTimeMatch[2]) {
                startTime = `${singleTimeMatch[2]}:00`;
            }

            if (startTime) {
                timeRange = {
                    startTime: startTime,
                    endTime: ''
                };
            }
        }
    }

    let taskDescription = rawText;

    if (dateMatch) taskDescription = taskDescription.replace(dueDateRegex, '').trim();
    if (createdAtMatch) taskDescription = taskDescription.replace(createdAtRegex, '').trim();
    if (startDateMatch) taskDescription = taskDescription.replace(startDateRegex, '').trim();
    if (plannedDateMatch) taskDescription = taskDescription.replace(plannedDateRegex, '').trim();
    if (cancelledDateMatch) taskDescription = taskDescription.replace(cancelledDateRegex, '').trim();
    if (completedDateMatch) taskDescription = taskDescription.replace(completedDateRegex, '').trim();
    if (priorityMatch) taskDescription = taskDescription.replace(priorityRegex, '').trim();
    if (recurrenceMatch) taskDescription = taskDescription.replace(recurrenceRegex, '').trim();
    if (fullDayMatch) taskDescription = taskDescription.replace(fullDayRegex, '').trim();
    if (timeRangeMatch) {
        taskDescription = taskDescription.replace(timeRangeRegex, '').trim();
    } else if (singleTimeMatch) {
        taskDescription = taskDescription.replace(singleTimeRegex, '').trim();
    }

    taskDescription = taskDescription.replace(/\s+/g, ' ').trim();

    return {
        text: taskDescription,
        completed,
        status,
        priority,
        recurrenceRule,
        filePath,
        dueDate,
        createdAt,
        startDate,
        plannedDate,
        cancelledDate,
        completedDate,
        rawText,
        fullDay,
        timeRange,
        line: lineNumber,
        lineCount: 1,
        position: {
            start: {
                line: lineNumber,
                col: 0
            },
            end: {
                line: lineNumber,
                col: line.length
            }
        }
    };
}

export async function extractTasks(app: App): Promise<Task[]> {
    return await extractBasicTasks(app);
}

export function clearTaskCache(): void {
    fileCacheMap.clear();
}