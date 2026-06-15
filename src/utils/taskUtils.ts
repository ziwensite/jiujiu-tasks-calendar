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

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
