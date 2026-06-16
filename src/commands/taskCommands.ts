import { Editor, MarkdownView, Notice } from 'obsidian';
import { t } from '../i18n';
import type MyPlugin from '../main';
import { TaskEditModal } from '../modals/TaskEditModal';
import type { Task } from '../types/task';
import { extractMarkers, removeMarkersFromText } from '../suggest/taskProperties';
import { generateTaskDateMarkers } from '../utils/taskUtils';

const PRIORITY_EMOJI_TO_VALUE: Record<string, string> = {
    '⏬️': 'lowest',
    '🔽': 'low',
    '🔼': 'medium',
    '⏫': 'high',
    '🔺': 'highest',
};

const DUE_DATE_EMOJIS = new Set(['📅', '⏳', '🛫', '➕', '✅', '❌']);

export function registerTaskCommands(plugin: MyPlugin) {
    plugin.addCommand({
        id: 'create-edit-task',
        name: 'Create or edit task',
        editorCallback: (editor: Editor) => handleTaskCommand(plugin, editor),
    });
}

function handleTaskCommand(plugin: MyPlugin, editor: Editor) {
    const cursor = editor.getCursor();
    const lineContent = editor.getLine(cursor.line);

    const task = buildTaskFromLine(lineContent);
    const lineStart = { line: cursor.line, ch: 0 };
    const lineEnd = { line: cursor.line, ch: lineContent.length };

    const modal = new TaskEditModal({
        app: plugin.app,
        task,
        onSubmit: (updatedTask: Task) => {
            const status = updatedTask.status || ' ';
            const markers = generateTaskDateMarkers(updatedTask);
            const taskLine = `- [${status}] ${updatedTask.text}${markers}`;
            editor.replaceRange(taskLine, lineStart, lineEnd);
        },
    });
    modal.open();
}

function buildTaskFromLine(line: string): Task {
    const taskMatch = line.match(/^\s*-\s*\[(.)\]\s*(.*)$/);
    if (taskMatch) {
        const status = taskMatch[1] || ' ';
        const rawText = (taskMatch[2] || '').trim();
        const markers = extractMarkers(rawText);
        const cleanText = removeMarkersFromText(rawText);

        return {
            text: cleanText,
            completed: status.toLowerCase() === 'x',
            status,
            filePath: '',
            rawText: line,
            ...parseMarkersToTask(markers),
        };
    }

    const trimmed = line.trim();
    if (!trimmed) {
        return {
            text: '',
            completed: false,
            status: ' ',
            filePath: '',
            rawText: '',
        };
    }

    const markers = extractMarkers(trimmed);
    const cleanText = removeMarkersFromText(trimmed);

    return {
        text: cleanText,
        completed: false,
        status: ' ',
        filePath: '',
        rawText: trimmed,
        ...parseMarkersToTask(markers),
    };
}

function parseMarkersToTask(markers: Map<string, string>): Partial<Task> {
    const task: Partial<Task> = {};

    for (const [emoji, value] of markers) {
        if (emoji === '📅' && value) task.dueDate = new Date(value);
        else if (emoji === '⏳' && value) task.plannedDate = new Date(value);
        else if (emoji === '🛫' && value) task.startDate = new Date(value);
        else if (emoji === '➕' && value) task.createdAt = new Date(value);
        else if (emoji === '✅' && value) task.completedDate = new Date(value);
        else if (emoji === '❌' && value) task.cancelledDate = new Date(value);
        else if (emoji === '🔁' && value) task.recurrenceRule = value;
        else if (PRIORITY_EMOJI_TO_VALUE[emoji]) task.priority = PRIORITY_EMOJI_TO_VALUE[emoji];
    }

    return task;
}
