export function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function getWeekend(from: Date): Date {
    const r = new Date(from);
    const daysToSat = 6 - r.getDay();
    r.setDate(r.getDate() + (daysToSat <= 0 ? 7 : daysToSat));
    return r;
}

export function getMonthEnd(from: Date): Date {
    return new Date(from.getFullYear(), from.getMonth() + 1, 0);
}

export function getNextMonth(from: Date): Date {
    return new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

export function getYearEnd(from: Date): Date {
    return new Date(from.getFullYear(), 11, 31);
}

function getNextWeekday(from: Date, targetDay: number): Date {
    const result = new Date(from);
    const currentDay = result.getDay();
    const target = targetDay === 7 ? 0 : targetDay;
    let diff = target - currentDay;
    if (diff <= 0) diff += 7;
    result.setDate(result.getDate() + diff);
    return result;
}

export function parseRelativeDate(text: string): string | null {
    const lower = text.toLowerCase().trim();
    const today = new Date();

    if (lower === 'today' || lower === '今天') return formatLocalDate(today);
    if (lower === 'tomorrow' || lower === '明天') return formatLocalDate(addDays(today, 1));
    if (lower === 'yesterday' || lower === '昨天') return formatLocalDate(addDays(today, -1));

    const plusDays = lower.match(/^\+(\d+)(?:d|天)?$/);
    if (plusDays && plusDays[1]) return formatLocalDate(addDays(today, parseInt(plusDays[1])));

    const plusWeeks = lower.match(/^\+(\d+)w(?:eek)?s?$/);
    if (plusWeeks && plusWeeks[1]) return formatLocalDate(addDays(today, parseInt(plusWeeks[1]) * 7));

    const plusMonths = lower.match(/^\+(\d+)m(?:onth)?s?$/);
    if (plusMonths && plusMonths[1]) {
        const result = new Date(today);
        result.setMonth(result.getMonth() + parseInt(plusMonths[1]));
        return formatLocalDate(result);
    }

    const nextWeekday = lower.match(/^next\s+(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)$/i);
    if (nextWeekday && nextWeekday[1]) {
        const dayMap: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7 };
        const key = nextWeekday[1].substring(0, 3).toLowerCase();
        const targetDay = dayMap[key];
        if (targetDay !== undefined) {
            return formatLocalDate(getNextWeekday(today, targetDay));
        }
    }

    return null;
}