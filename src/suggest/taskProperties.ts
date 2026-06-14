import { addDays, getWeekend, getMonthEnd, getNextMonth, getYearEnd } from './dateCalculator';

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ===== 日期 =====
export const DATE_OPTIONS = [
    { label: '今天', getValue: () => new Date() },
    { label: '明天', getValue: () => addDays(new Date(), 1) },
    { label: '后天', getValue: () => addDays(new Date(), 2) },
    { label: '周末', getValue: () => getWeekend(new Date()) },
    { label: '下周', getValue: () => addDays(new Date(), 7) },
    { label: '月末', getValue: () => getMonthEnd(new Date()) },
    { label: '下月', getValue: () => getNextMonth(new Date()) },
    { label: '年末', getValue: () => getYearEnd(new Date()) },
];

export function getDateSuggestions(): { label: string; value: string }[] {
    return DATE_OPTIONS.map(o => ({ label: o.label, value: formatLocalDate(o.getValue()) }));
}

export function parseDateLabel(label: string): Date | null | undefined {
    if (label === '无') return null;
    const opt = DATE_OPTIONS.find(o => o.label === label);
    if (opt) return opt.getValue();
    return undefined;
}

// ===== 优先级 =====
export const PRIORITY_OPTIONS = [
    { value: 'lowest',  emoji: '⏬️', label: '最低' },
    { value: 'low',     emoji: '🔽', label: '低' },
    { value: 'medium',  emoji: '🔼', label: '中' },
    { value: 'high',    emoji: '⏫', label: '高' },
    { value: 'highest', emoji: '🔺', label: '最高' },
];

export function getPriorityDisplay(opt: typeof PRIORITY_OPTIONS[number]): string {
    return `${opt.label}${opt.emoji}`;
}

// ===== 重复规则 =====
export const RECURRENCE_OPTIONS = [
    'every day', 'every day when done',
    'every week', 'every week when done',
    'every month', 'every month when done',
    'every year', 'every year when done',
    'every 2 days', 'every 2 days when done',
    'every 3 days', 'every 3 days when done',
    'every 2 weeks', 'every 2 weeks when done',
    'every 3 weeks', 'every 3 weeks when done',
    'every 2 months', 'every 2 months when done',
    'every 3 months', 'every 3 months when done',
    'every 6 months', 'every 6 months when done',
    'every 2 years', 'every 2 years when done',
    'every monday', 'every monday when done',
    'every tuesday', 'every tuesday when done',
    'every wednesday', 'every wednesday when done',
    'every thursday', 'every thursday when done',
    'every friday', 'every friday when done',
    'every saturday', 'every saturday when done',
    'every sunday', 'every sunday when done',
    'every monday, wednesday, friday',
    'every monday, wednesday, friday when done',
    'every tuesday, thursday',
    'every tuesday, thursday when done',
    'every monday, tuesday, wednesday, thursday, friday',
    'every monday, tuesday, wednesday, thursday, friday when done',
    'every saturday, sunday',
    'every saturday, sunday when done',
];

export function getRecurrenceSuggestions(input?: string): string[] {
    if (!input) return RECURRENCE_OPTIONS;
    return RECURRENCE_OPTIONS.filter(s => s.toLowerCase().includes(input.toLowerCase()));
}

// ===== Emoji 菜单属性顺序 =====
export const PROPERTY_EMOJI_ORDER = ['📅', '⏳', '🛫', '➕', '🔁', '⏬️', '🔽', '🔼', '⏫', '🔺'] as const;

const PROPERTY_EMOJI_LABELS: Record<string, string> = {
    '📅': '截止日期',
    '⏳': '计划日期',
    '🛫': '开始日期',
    '➕': '创建日期',
    '🔁': '重复规则',
};

export interface SuggesterItem {
    label: string;
    value: string;
}

export function getEmojiMenuItems(): SuggesterItem[] {
    const priorityMap: Record<string, string> = {};
    PRIORITY_OPTIONS.forEach(o => { priorityMap[o.emoji] = o.label; });

    return PROPERTY_EMOJI_ORDER.map(emoji => ({
        label: `${emoji} ${priorityMap[emoji] || PROPERTY_EMOJI_LABELS[emoji] || ''}`,
        value: emoji,
    }));
}

export function getRecurrenceMenuItems(): SuggesterItem[] {
    return RECURRENCE_OPTIONS.map(r => ({
        label: `🔁 ${r}`,
        value: r,
    }));
}