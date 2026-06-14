import type { Task } from '../services/taskService';
import { PROPERTY_EMOJI_ORDER } from '../suggest/taskProperties';

const PRIORITY_MAP: Record<string, string> = {
    '⏬️': 'lowest',
    '🔽': 'low',
    '🔼': 'medium',
    '⏫': 'high',
    '🔺': 'highest',
};

export function generateTaskDateMarkers(task: Task): string {
    const parts: string[] = [];

    for (const emoji of PROPERTY_EMOJI_ORDER) {
        if (emoji === '✅' && task.completedDate) {
            parts.push(`✅ ${formatLocalDate(task.completedDate)}`);
        } else if (emoji === '❌' && !task.completedDate && task.cancelledDate) {
            parts.push(`❌ ${formatLocalDate(task.cancelledDate)}`);
        } else if (emoji === '🔁' && task.recurrenceRule) {
            parts.push(`🔁 ${task.recurrenceRule}`);
        } else if (emoji === '📅' && task.dueDate) {
            parts.push(`📅 ${formatLocalDate(task.dueDate)}`);
        } else if (emoji === '⏳' && task.plannedDate) {
            parts.push(`⏳ ${formatLocalDate(task.plannedDate)}`);
        } else if (emoji === '🛫' && task.startDate) {
            parts.push(`🛫 ${formatLocalDate(task.startDate)}`);
        } else if (emoji === '➕' && task.createdAt) {
            parts.push(`➕ ${formatLocalDate(task.createdAt)}`);
        } else if (PRIORITY_MAP[emoji] && task.priority === PRIORITY_MAP[emoji]) {
            parts.push(emoji);
        }
    }

    return parts.length ? ' ' + parts.join(' ') : '';
}

/**
 * 生成任务的完成标记
 * @param completed 任务是否完成
 * @returns 完成标记
 */
export function generateTaskCompletionMarker(completed: boolean): string {
    return '';
}

/**
 * 构建完整的任务文本，包括日期标记和完成标记
 * @param task 任务对象
 * @returns 完整的任务文本
 */
export function buildTaskText(task: Task): string {
    let result = task.text;
    
    // 添加日期标记
    result += generateTaskDateMarkers(task);
    
    // 添加完成标记
    result += generateTaskCompletionMarker(task.completed);
    
    return result;
}

/**
 * 格式化日期为本地日期字符串，避免时区问题
 * @param date 日期对象
 * @returns 格式化后的日期字符串，格式为 YYYY-MM-DD
 */
function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
