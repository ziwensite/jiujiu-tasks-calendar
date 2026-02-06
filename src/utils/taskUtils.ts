import type { Task } from '../services/taskService';

/**
 * 生成任务的日期标记
 * @param task 任务对象
 * @returns 带有日期标记的任务文本
 */
export function generateTaskDateMarkers(task: Task): string {
    let result = '';
    
    // 添加优先级标记
    if (task.priority) {
        switch (task.priority) {
            case 'lowest':
                result += ' ⏬️';
                break;
            case 'low':
                result += ' 🔽';
                break;
            case 'medium':
                result += ' 🔼';
                break;
            case 'high':
                result += ' ⏫';
                break;
            case 'highest':
                result += ' 🔺';
                break;
        }
    }
    
    // 添加重复规则标记
    if (task.recurrenceRule) {
        result += ` 🔁 ${task.recurrenceRule}`;
    }
    
    // 添加创建日期标记
    if (task.createdAt) {
        const createdAtStr = formatLocalDate(task.createdAt);
        result += ` ➕ ${createdAtStr}`;
    }
    
    // 添加开始日期标记
    if (task.startDate) {
        const startDateStr = formatLocalDate(task.startDate);
        result += ` 🛫 ${startDateStr}`;
    }
    
    // 添加计划日期标记
    if (task.plannedDate) {
        const plannedDateStr = formatLocalDate(task.plannedDate);
        result += ` ⏳ ${plannedDateStr}`;
    }
    
    // 添加截止日期标记
    if (task.dueDate) {
        const dueDateStr = formatLocalDate(task.dueDate);
        result += ` 📅 ${dueDateStr}`;
    }
    
    // 添加完成日期或取消日期标记（排在最后）
    if (task.completedDate) {
        const completedDateStr = formatLocalDate(task.completedDate);
        result += ` ✅ ${completedDateStr}`;
    } else if (task.cancelledDate) {
        const cancelledDateStr = formatLocalDate(task.cancelledDate);
        result += ` ❌ ${cancelledDateStr}`;
    }
    
    return result;
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
