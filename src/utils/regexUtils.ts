// 辅助函数：转义正则表达式中的特殊字符
export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// 支持tasks插件的多种任务格式
export const taskRegex = /^\s*-\s*\[(.)\]\s*(.+)$/gm;

// 支持多种日期格式，包括tasks插件的格式
// 匹配：@YYYY-MM-DD, #YYYY-MM-DD, 📅 YYYY-MM-DD, 📅YYYY-MM-DD, due: YYYY-MM-DD, due:YYYY-MM-DD
export const dueDateRegex = /(?:[@#]|due:\s?|📅\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配创建日期，如：➕ 2026-01-06, + 2026-01-06, created: 2026-01-06, created:2026-01-06
export const createdAtRegex = /(?:[➕+]\s?|created:\s?|🗓️\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配开始日期，如：🛫 2021-04-09, 🛫2021-04-09, start: 2021-04-09, start:2021-04-09
export const startDateRegex = /(?:🛫\s?|start:\s?|🔄\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配计划日期，如：⏳ 2026-02-09, ⏳2026-02-09, planned: 2026-02-09, planned:2026-02-09
export const plannedDateRegex = /(?:⏳\s?|planned:\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配取消日期，如：❌ 2026-02-06, ❌2026-02-06, cancelled: 2026-02-06, cancelled:2026-02-06
export const cancelledDateRegex = /(?:❌\s?|cancelled:\s?|cancel:\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配完成日期，如：✅ 2026-02-06, ✅2026-02-06, done: 2026-02-06, done:2026-02-06
export const completedDateRegex = /(?:✅\s?|done:\s?|completed:\s?)(\d{4}-\d{2}-\d{2})/i;

// 匹配全天标记，如：全天, all day, full day, 🔄
export const fullDayRegex = /(?:\b|^)(全天|all\s+day|full\s+day|🔄)(?:\b|$)/i;

// 匹配时间范围，如：10:00-12:00, 10:00 ~ 12:00, 10:00 - 12:00
export const timeRangeRegex = /(\d{1,2}:\d{2})\s*(?:-|~|——)\s*(\d{1,2}:\d{2})/;

// 匹配单个时间点，如：10:00, 10:00 AM, 10:00 PM
export const singleTimeRegex = /\b(\d{1,2}:\d{2})(?:\s*(?:AM|PM))?\b/i;

// 匹配优先级标记，如：🔺 最高, ⏫ 高, 🔼 中, 🔽 低, ⏬️ 最低
export const priorityRegex = /(🔺|⏫|🔼|🔽|⏬️)/;

// 匹配重复规则，如：🔁 every day, 🔁 every week on Monday
// 这里匹配 🔁 后面的重复规则内容，直到遇到另一个标记或行尾
export const recurrenceRegex = /🔁\s*([^🔁📅🛫⏳➕✅❌]+)/;