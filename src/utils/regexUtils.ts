// 辅助函数：转义正则表达式中的特殊字符
export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// 支持tasks插件的多种任务格式
export const taskRegex = /^\s*-\s*\[(.)\]\s*(.+)$/gm;

// 支持多种日期格式，包括tasks插件的格式
// 匹配：@YYYY-MM-DD, #YYYY-MM-DD, 📅 YYYY-MM-DD, 📅YYYY-MM-DD, due: YYYY-MM-DD, due:YYYY-MM-DD
export const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配全天标记，如：全天, all day, full day, 🔄
export const fullDayRegex = /(?:\b|^)(全天|all\s+day|full\s+day|🔄)(?:\b|$)/i;

// 匹配时间范围，如：10:00-12:00, 10:00 ~ 12:00, 10:00 - 12:00
export const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:-|~|——)\s*(\d{1,2}:\d{2})/;

// 匹配单个时间点，如：10:00, 10:00 AM, 10:00 PM
export const singleTimeRegex = /\b(\d{1,2}:\d{2})(?:\s*(?:AM|PM))?\b/i;