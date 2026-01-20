// 导入lunar-typescript库
import { Solar, HolidayUtil } from 'lunar-typescript';
// 导入dayjs库及其插件
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekday from 'dayjs/plugin/weekday';
import customParseFormat from 'dayjs/plugin/customParseFormat';
// 扩展dayjs功能
dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(weekday);
dayjs.extend(customParseFormat);
// 农历月份名称
export const lunarMonthNames = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
// 农历日期名称
export const lunarDayNames = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
// 计算农历日期
export function getLunarDate(date) {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    // 阴历信息显示优先级：节日 > 节气 > 月份 > 日期
    // 1. 检查是否有节日（包括法定节假日、国际节日和传统节日）
    let festivals = [...lunar.getFestivals(), ...solar.getFestivals()];
    // 去重
    festivals = [...new Set(festivals)];
    if (festivals && festivals.length > 0 && festivals[0]) {
        return {
            text: festivals[0].substring(0, 3), // 最多显示3个字符
            type: 'festival'
        };
    }
    // 2. 检查是否有法定节假日名称（只在当天显示）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const holiday = HolidayUtil.getHoliday(dateStr);
    if (holiday) {
        const holidayName = holiday.getName();
        const target = holiday.getTarget();
        // 只有当日期是节假日的第一天（target 等于当前日期）时才显示节日名称
        if (holidayName && holidayName !== '休' && holidayName !== '班' && target === dateStr) {
            return {
                text: holidayName.substring(0, 3), // 最多显示3个字符
                type: 'festival'
            };
        }
    }
    // 3. 检查是否有节气
    const jieQi = lunar.getJieQi();
    if (jieQi) {
        return {
            text: jieQi.substring(0, 3), // 最多显示3个字符
            type: 'solarTerm'
        };
    }
    // 4. 检查是否是初一
    if (lunar.getDay() === 1) {
        // 显示农历月份
        const month = lunar.getMonth();
        return {
            text: lunarMonthNames[month] || '',
            type: 'month'
        };
    }
    // 5. 显示农历日期
    const dayNum = lunar.getDay();
    return {
        text: lunarDayNames[dayNum] || '',
        type: 'day'
    };
}
// 获取节假日信息（传统节日、法定节假日、国际节日和24节气）
export function getHolidayInfo(date) {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    // 1. 合并所有节日信息
    let festivals = [...lunar.getFestivals(), ...solar.getFestivals()];
    // 2. 去重
    festivals = [...new Set(festivals)];
    // 3. 优先返回主要节日
    if (festivals && festivals.length > 0 && festivals[0]) {
        return festivals[0];
    }
    // 4. 检查是否有法定节假日名称（只在当天显示）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const holiday = HolidayUtil.getHoliday(dateStr);
    if (holiday) {
        const holidayName = holiday.getName();
        const target = holiday.getTarget();
        // 只有当日期是节假日的第一天（target 等于当前日期）时才显示节日名称
        if (holidayName && holidayName !== '休' && holidayName !== '班' && target === dateStr) {
            return holidayName;
        }
    }
    return "";
}
// 获取法定节假日状态
export function getHolidayStatus(date) {
    // 将Date对象转换为YYYY-MM-DD格式的字符串
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const holiday = HolidayUtil.getHoliday(dateStr);
    if (holiday) {
        if (holiday.isWork()) {
            // 周六周日改为工作日，显示"班"
            return "班";
        }
        else {
            // 休息，显示"休"
            return "休";
        }
    }
    return "";
}
// 默认使用 ISO 8601 标准：周一为第一天，包含该年第一个周四的周为第1周
export function getWeekInfo(date) {
    const d = dayjs(date);
    // ISO 8601: 周一为第一天，包含该年第一个周四的周为第1周
    return {
        week: d.isoWeek(),
        year: d.isoWeekYear(),
    };
}
// 获取周数（保持向后兼容）
export function getWeekNumber(date) {
    return getWeekInfo(date).week;
}
// 获取季度
export function getQuarter(date) {
    // 使用dayjs计算季度
    return Math.floor((dayjs(date).month() + 3) / 3);
}
// 日期格式化函数
export function formatDate(date, format) {
    // 使用dayjs格式化日期
    const d = dayjs(date);
    // 获取周数和周年份
    const weekInfo = getWeekInfo(date);
    const week = String(weekInfo.week).padStart(2, '0');
    const weekYear = weekInfo.year;
    // 处理周数和周年份
    let result = format
        // 替换周年份
        .replace('GGGG', String(weekYear))
        // 替换周数（两位数）
        .replace('WW', week)
        // 替换季度
        .replace('Q', String(getQuarter(date)));
    // 使用dayjs的format方法处理其他占位符
    result = d.format(result);
    return result;
}
/**
 * 获取月份的第一天是星期几
 * @param date 日期
 * @returns 星期几（0-6，0表示周日）
 */
export function getFirstDayOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return firstDay.getDay();
}
/**
 * 获取月份的总天数
 * @param date 日期
 * @returns 月份总天数
 */
export function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
/**
 * 计算需要显示的上个月天数
 * @param firstDayOfMonth 月份第一天是星期几
 * @returns 需要显示的上个月天数
 */
export function getPrevMonthDaysToShow(firstDayOfMonth) {
    // 周一为第一天：如果第一天是周日，需要显示6天上个月的日期，否则显示startDay-1天
    return firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
}
/**
 * 计算日历需要显示的行数
 * @param prevMonthDaysToShow 需要显示的上个月天数
 * @param daysInMonth 本月总天数
 * @returns 需要的行数
 */
export function getCalendarRows(prevMonthDaysToShow, daysInMonth) {
    // 计算需要的行数：(上个月需要显示的天数 + 本月天数 + 7 - 1) / 7 向上取整
    return Math.ceil((prevMonthDaysToShow + daysInMonth) / 7);
}
/**
 * 计算指定单元格对应的日期
 * @param rowIndex 行索引
 * @param dayIndex 列索引
 * @param currentDate 当前日期
 * @returns 单元格对应的日期和是否为其他月份
 */
export function getCellDate(rowIndex, dayIndex, currentDate) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    // 计算月份第一天是星期几
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    // 计算需要显示的上个月天数
    const prevMonthDaysToShow = getPrevMonthDaysToShow(firstDayOfMonth);
    // 计算本月总天数
    const daysInMonth = getDaysInMonth(currentDate);
    // 计算当前单元格在所有单元格中的位置
    const totalCells = rowIndex * 7 + dayIndex;
    let date;
    let isOtherMonth = false;
    if (totalCells < prevMonthDaysToShow) {
        // 上个月的日期
        const prevMonth = currentMonth - 1;
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthDays = getDaysInMonth(new Date(prevMonthYear, prevMonth));
        const day = prevMonthDays - prevMonthDaysToShow + totalCells + 1;
        date = new Date(prevMonthYear, prevMonth, day);
        isOtherMonth = true;
    }
    else if (totalCells < prevMonthDaysToShow + daysInMonth) {
        // 当前月的日期
        const day = totalCells - prevMonthDaysToShow + 1;
        date = new Date(currentYear, currentMonth, day);
    }
    else {
        // 下个月的日期
        const nextMonth = currentMonth + 1;
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const day = totalCells - prevMonthDaysToShow - daysInMonth + 1;
        date = new Date(nextMonthYear, nextMonth, day);
        isOtherMonth = true;
    }
    return { date, isOtherMonth };
}
/**
 * 计算日历月份数据
 * @param currentDate 当前日期
 * @returns 日历月份数据
 */
export function getCalendarMonthData(currentDate) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    // 计算月份第一天是星期几
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    // 计算本月总天数
    const daysInMonth = getDaysInMonth(currentDate);
    // 计算需要显示的上个月天数
    const prevMonthDaysToShow = getPrevMonthDaysToShow(firstDayOfMonth);
    // 计算需要的行数
    const rowsNeeded = getCalendarRows(prevMonthDaysToShow, daysInMonth);
    // 计算上个月的最后一天
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0);
    // 计算下个月的第一天
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    return {
        currentYear,
        currentMonth,
        firstDayOfMonth,
        daysInMonth,
        prevMonthDaysToShow,
        rowsNeeded,
        lastDayOfPrevMonth,
        firstDayOfNextMonth
    };
}
/**
 * 获取当前月份的所有日期数据
 * @param currentDate 当前日期
 * @returns 日期数据数组
 */
export function getMonthDates(currentDate) {
    const data = getCalendarMonthData(currentDate);
    const dates = [];
    for (let row = 0; row < data.rowsNeeded; row++) {
        const rowDates = [];
        for (let day = 0; day < 7; day++) {
            const { date, isOtherMonth } = getCellDate(row, day, currentDate);
            rowDates.push({ date, isOtherMonth });
        }
        dates.push(rowDates);
    }
    return dates;
}
/**
 * 检查日期是否为今天
 * @param date 要检查的日期
 * @returns 是否为今天
 */
export function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}
/**
 * 检查日期是否为周末
 * @param date 要检查的日期
 * @returns 是否为周末
 */
export function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
/**
 * 计算给定日期所在行的所有日期
 * @param date 日期
 * @returns 该行的所有日期
 */
export function getWeekDates(date) {
    const dayOfWeek = date.getDay();
    // 计算本周一的日期
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    // 生成本周的所有日期
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        weekDates.push(currentDate);
    }
    return weekDates;
}
/**
 * 获取上个月的日期
 * @param date 当前日期
 * @returns 上个月的日期
 */
export function getPrevMonthDate(date) {
    const prevMonth = date.getMonth() - 1;
    const prevMonthYear = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
    return new Date(prevMonthYear, prevMonth, date.getDate());
}
/**
 * 获取下个月的日期
 * @param date 当前日期
 * @returns 下个月的日期
 */
export function getNextMonthDate(date) {
    const nextMonth = date.getMonth() + 1;
    const nextMonthYear = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
    return new Date(nextMonthYear, nextMonth, date.getDate());
}
/**
 * 获取上一年的日期
 * @param date 当前日期
 * @returns 上一年的日期
 */
export function getPrevYearDate(date) {
    return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
}
/**
 * 获取下一年的日期
 * @param date 当前日期
 * @returns 下一年的日期
 */
export function getNextYearDate(date) {
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
}
/**
 * 获取当前日期所在季度的开始日期
 * @param date 当前日期
 * @returns 季度开始日期
 */
export function getQuarterStartDate(date) {
    const quarter = getQuarter(date);
    const startMonth = (quarter - 1) * 3;
    return new Date(date.getFullYear(), startMonth, 1);
}
/**
 * 获取当前日期所在季度的结束日期
 * @param date 当前日期
 * @returns 季度结束日期
 */
export function getQuarterEndDate(date) {
    const quarter = getQuarter(date);
    const endMonth = quarter * 3;
    return new Date(date.getFullYear(), endMonth, 0);
}
/**
 * 计算指定行和列的日期
 * @param rowIndex 行索引
 * @param colIndex 列索引
 * @param currentYear 当前年份
 * @param currentMonth 当前月份
 * @param prevMonthDaysToShow 需要显示的上个月天数
 * @param daysInMonth 本月总天数
 * @returns 计算出的日期和是否为其他月份
 */
export function calculateCellDate(rowIndex, colIndex, currentYear, currentMonth, prevMonthDaysToShow, daysInMonth) {
    const totalCells = rowIndex * 7 + colIndex;
    let date;
    let isOtherMonth = false;
    if (totalCells < prevMonthDaysToShow) {
        // 上个月的日期
        const prevMonth = currentMonth - 1;
        const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const prevMonthDays = getDaysInMonth(new Date(prevMonthYear, prevMonth));
        const day = prevMonthDays - prevMonthDaysToShow + totalCells + 1;
        date = new Date(prevMonthYear, prevMonth, day);
        isOtherMonth = true;
    }
    else if (totalCells < prevMonthDaysToShow + daysInMonth) {
        // 当前月的日期
        const day = totalCells - prevMonthDaysToShow + 1;
        date = new Date(currentYear, currentMonth, day);
    }
    else {
        // 下个月的日期
        const nextMonth = currentMonth + 1;
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const day = totalCells - prevMonthDaysToShow - daysInMonth + 1;
        date = new Date(nextMonthYear, nextMonth, day);
        isOtherMonth = true;
    }
    return { date, isOtherMonth };
}
/**
 * 计算当前周的起始日期（周一）
 * @param rowIndex 行索引
 * @param currentYear 当前年份
 * @param currentMonth 当前月份
 * @param prevMonthDaysToShow 需要显示的上个月天数
 * @returns 周起始日期
 */
export function calculateWeekStartDate(rowIndex, currentYear, currentMonth, prevMonthDaysToShow) {
    // 计算当前周的起始日期
    const daysPassed = rowIndex * 7 - prevMonthDaysToShow;
    const weekStartDate = new Date(currentYear, currentMonth, 1 + daysPassed);
    // 调整到周一
    const adjustedWeekStartDate = new Date(weekStartDate);
    const weekStartDayOfWeek = adjustedWeekStartDate.getDay();
    const daysToMonday = weekStartDayOfWeek === 0 ? 6 : weekStartDayOfWeek - 1;
    adjustedWeekStartDate.setDate(adjustedWeekStartDate.getDate() - daysToMonday);
    return adjustedWeekStartDate;
}
/**
 * 计算日历月份的完整数据
 * @param currentDate 当前日期
 * @returns 日历月份数据
 */
export function calculateCalendarMonthData(currentDate) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    // 计算月份第一天是星期几
    const firstDay = new Date(currentYear, currentMonth, 1);
    let startDay = firstDay.getDay();
    const daysInMonth = getDaysInMonth(currentDate);
    // 周一为第一天：如果第一天是周日，需要显示6天上个月的日期，否则显示startDay-1天
    const prevMonthDaysToShow = startDay === 0 ? 6 : startDay - 1;
    // 计算需要的行数：(上个月需要显示的天数 + 本月天数 + 7 - 1) / 7 向上取整
    const currentRows = Math.ceil((prevMonthDaysToShow + daysInMonth) / 7);
    // 计算上个月的最后一天
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0);
    const prevMonthDays = lastDayOfPrevMonth.getDate();
    const prevMonth = lastDayOfPrevMonth.getMonth();
    const prevMonthYear = lastDayOfPrevMonth.getFullYear();
    // 计算下个月的第一天
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = firstDayOfNextMonth.getMonth();
    const nextMonthYear = firstDayOfNextMonth.getFullYear();
    return {
        currentYear,
        currentMonth,
        firstDay,
        startDay,
        daysInMonth,
        prevMonthDaysToShow,
        currentRows,
        lastDayOfPrevMonth,
        prevMonthDays,
        prevMonth,
        prevMonthYear,
        firstDayOfNextMonth,
        nextMonth,
        nextMonthYear
    };
}
/**
 * 计算月视图中当前行的所有日期
 * @param rowIndex 行索引
 * @param currentYear 当前年份
 * @param currentMonth 当前月份
 * @param prevMonthDaysToShow 需要显示的上个月天数
 * @param daysInMonth 本月总天数
 * @returns 当前行的所有日期
 */
export function calculateMonthRowDates(rowIndex, currentYear, currentMonth, prevMonthDaysToShow, daysInMonth) {
    const rowDates = [];
    for (let colIndex = 0; colIndex < 7; colIndex++) {
        const { date, isOtherMonth } = calculateCellDate(rowIndex, colIndex, currentYear, currentMonth, prevMonthDaysToShow, daysInMonth);
        rowDates.push({ date, isOtherMonth });
    }
    return rowDates;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZVV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0ZVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHNCQUFzQjtBQUN0QixPQUFPLEVBQVMsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRTdELGVBQWU7QUFDZixPQUFPLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDMUIsT0FBTyxPQUFPLE1BQU0sc0JBQXNCLENBQUM7QUFDM0MsT0FBTyxVQUFVLE1BQU0seUJBQXlCLENBQUM7QUFDakQsT0FBTyxPQUFPLE1BQU0sc0JBQXNCLENBQUM7QUFDM0MsT0FBTyxpQkFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUvRCxZQUFZO0FBQ1osS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0QixLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pCLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRWhDLFNBQVM7QUFDVCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUU1RyxTQUFTO0FBQ1QsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUk7SUFDeEYsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUks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QUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDOUMsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQztBQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8g5a+85YWlbHVuYXItdHlwZXNjcmlwdOW6k1xyXG5pbXBvcnQgeyBMdW5hciwgU29sYXIsIEhvbGlkYXlVdGlsIH0gZnJvbSAnbHVuYXItdHlwZXNjcmlwdCc7XHJcblxyXG4vLyDlr7zlhaVkYXlqc+W6k+WPiuWFtuaPkuS7tlxyXG5pbXBvcnQgZGF5anMgZnJvbSAnZGF5anMnO1xyXG5pbXBvcnQgaXNvV2VlayBmcm9tICdkYXlqcy9wbHVnaW4vaXNvV2Vlayc7XHJcbmltcG9ydCB3ZWVrT2ZZZWFyIGZyb20gJ2RheWpzL3BsdWdpbi93ZWVrT2ZZZWFyJztcclxuaW1wb3J0IHdlZWtkYXkgZnJvbSAnZGF5anMvcGx1Z2luL3dlZWtkYXknO1xyXG5pbXBvcnQgY3VzdG9tUGFyc2VGb3JtYXQgZnJvbSAnZGF5anMvcGx1Z2luL2N1c3RvbVBhcnNlRm9ybWF0JztcclxuXHJcbi8vIOaJqeWxlWRheWpz5Yqf6IO9XHJcbmRheWpzLmV4dGVuZChpc29XZWVrKTtcclxuZGF5anMuZXh0ZW5kKHdlZWtPZlllYXIpO1xyXG5kYXlqcy5leHRlbmQod2Vla2RheSk7XHJcbmRheWpzLmV4dGVuZChjdXN0b21QYXJzZUZvcm1hdCk7XHJcblxyXG4vLyDlhpzljobmnIjku73lkI3np7BcclxuZXhwb3J0IGNvbnN0IGx1bmFyTW9udGhOYW1lcyA9IFsnJywgJ+ato+aciCcsICfkuozmnIgnLCAn5LiJ5pyIJywgJ+Wbm+aciCcsICfkupTmnIgnLCAn5YWt5pyIJywgJ+S4g+aciCcsICflhavmnIgnLCAn5Lmd5pyIJywgJ+WNgeaciCcsICflhqzmnIgnLCAn6IWK5pyIJ107XHJcblxyXG4vLyDlhpzljobml6XmnJ/lkI3np7BcclxuZXhwb3J0IGNvbnN0IGx1bmFyRGF5TmFtZXMgPSBbJycsICfliJ3kuIAnLCAn5Yid5LqMJywgJ+WIneS4iScsICfliJ3lm5snLCAn5Yid5LqUJywgJ+WIneWFrScsICfliJ3kuIMnLCAn5Yid5YWrJywgJ+WIneS5nScsICfliJ3ljYEnLFxyXG4gICAgJ+WNgeS4gCcsICfljYHkuownLCAn5Y2B5LiJJywgJ+WNgeWbmycsICfljYHkupQnLCAn5Y2B5YWtJywgJ+WNgeS4gycsICfljYHlhasnLCAn5Y2B5LmdJywgJ+S6jOWNgScsXHJcbiAgICAn5bu/5LiAJywgJ+W7v+S6jCcsICflu7/kuIknLCAn5bu/5ZubJywgJ+W7v+S6lCcsICflu7/lha0nLCAn5bu/5LiDJywgJ+W7v+WFqycsICflu7/kuZ0nLCAn5LiJ5Y2BJ107XHJcblxyXG4vLyDlrprkuYnpmLTljobml6XmnJ/nsbvlnotcclxuZXhwb3J0IHR5cGUgTHVuYXJEYXRlVHlwZSA9ICdmZXN0aXZhbCcgfCAnc29sYXJUZXJtJyB8ICdtb250aCcgfCAnZGF5JztcclxuXHJcbi8vIOWumuS5iemYtOWOhuaXpeacn+e7k+aenFxyXG5leHBvcnQgaW50ZXJmYWNlIEx1bmFyRGF0ZVJlc3VsdCB7XHJcbiAgICB0ZXh0OiBzdHJpbmc7XHJcbiAgICB0eXBlOiBMdW5hckRhdGVUeXBlO1xyXG59XHJcblxyXG4vLyDorqHnrpflhpzljobml6XmnJ9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEx1bmFyRGF0ZShkYXRlOiBEYXRlKTogTHVuYXJEYXRlUmVzdWx0IHtcclxuICAgIGNvbnN0IHNvbGFyID0gU29sYXIuZnJvbURhdGUoZGF0ZSk7XHJcbiAgICBjb25zdCBsdW5hciA9IHNvbGFyLmdldEx1bmFyKCk7XHJcbiAgICBcclxuICAgIC8vIOmYtOWOhuS/oeaBr+aYvuekuuS8mOWFiOe6p++8muiKguaXpSA+IOiKguawlCA+IOaciOS7vSA+IOaXpeacn1xyXG4gICAgXHJcbiAgICAvLyAxLiDmo4Dmn6XmmK/lkKbmnInoioLml6XvvIjljIXmi6zms5XlrproioLlgYfml6XjgIHlm73pmYXoioLml6XlkozkvKDnu5/oioLml6XvvIlcclxuICAgIGxldCBmZXN0aXZhbHMgPSBbLi4ubHVuYXIuZ2V0RmVzdGl2YWxzKCksIC4uLnNvbGFyLmdldEZlc3RpdmFscygpXTtcclxuICAgIC8vIOWOu+mHjVxyXG4gICAgZmVzdGl2YWxzID0gWy4uLm5ldyBTZXQoZmVzdGl2YWxzKV07XHJcbiAgICBcclxuICAgIGlmIChmZXN0aXZhbHMgJiYgZmVzdGl2YWxzLmxlbmd0aCA+IDAgJiYgZmVzdGl2YWxzWzBdKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdGV4dDogZmVzdGl2YWxzWzBdLnN1YnN0cmluZygwLCAzKSwgLy8g5pyA5aSa5pi+56S6M+S4quWtl+esplxyXG4gICAgICAgICAgICB0eXBlOiAnZmVzdGl2YWwnXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gMi4g5qOA5p+l5piv5ZCm5pyJ5rOV5a6a6IqC5YGH5pel5ZCN56ew77yI5Y+q5Zyo5b2T5aSp5pi+56S677yJXHJcbiAgICBjb25zdCB5ZWFyID0gZGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgY29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgIGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgIGNvbnN0IGRhdGVTdHIgPSBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xyXG4gICAgXHJcbiAgICBjb25zdCBob2xpZGF5ID0gSG9saWRheVV0aWwuZ2V0SG9saWRheShkYXRlU3RyKTtcclxuICAgIGlmIChob2xpZGF5KSB7XHJcbiAgICAgICAgY29uc3QgaG9saWRheU5hbWUgPSBob2xpZGF5LmdldE5hbWUoKTtcclxuICAgICAgICBjb25zdCB0YXJnZXQgPSBob2xpZGF5LmdldFRhcmdldCgpO1xyXG4gICAgICAgIC8vIOWPquacieW9k+aXpeacn+aYr+iKguWBh+aXpeeahOesrOS4gOWkqe+8iHRhcmdldCDnrYnkuo7lvZPliY3ml6XmnJ/vvInml7bmiY3mmL7npLroioLml6XlkI3np7BcclxuICAgICAgICBpZiAoaG9saWRheU5hbWUgJiYgaG9saWRheU5hbWUgIT09ICfkvJEnICYmIGhvbGlkYXlOYW1lICE9PSAn54+tJyAmJiB0YXJnZXQgPT09IGRhdGVTdHIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHRleHQ6IGhvbGlkYXlOYW1lLnN1YnN0cmluZygwLCAzKSwgLy8g5pyA5aSa5pi+56S6M+S4quWtl+esplxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ2Zlc3RpdmFsJ1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gMy4g5qOA5p+l5piv5ZCm5pyJ6IqC5rCUXHJcbiAgICBjb25zdCBqaWVRaSA9IGx1bmFyLmdldEppZVFpKCk7XHJcbiAgICBpZiAoamllUWkpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0ZXh0OiBqaWVRaS5zdWJzdHJpbmcoMCwgMyksIC8vIOacgOWkmuaYvuekujPkuKrlrZfnrKZcclxuICAgICAgICAgICAgdHlwZTogJ3NvbGFyVGVybSdcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyA0LiDmo4Dmn6XmmK/lkKbmmK/liJ3kuIBcclxuICAgIGlmIChsdW5hci5nZXREYXkoKSA9PT0gMSkge1xyXG4gICAgICAgIC8vIOaYvuekuuWGnOWOhuaciOS7vVxyXG4gICAgICAgIGNvbnN0IG1vbnRoID0gbHVuYXIuZ2V0TW9udGgoKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0ZXh0OiBsdW5hck1vbnRoTmFtZXNbbW9udGhdIHx8ICcnLFxyXG4gICAgICAgICAgICB0eXBlOiAnbW9udGgnXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gNS4g5pi+56S65Yac5Y6G5pel5pyfXHJcbiAgICBjb25zdCBkYXlOdW0gPSBsdW5hci5nZXREYXkoKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgdGV4dDogbHVuYXJEYXlOYW1lc1tkYXlOdW1dIHx8ICcnLFxyXG4gICAgICAgIHR5cGU6ICdkYXknXHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyDojrflj5boioLlgYfml6Xkv6Hmga/vvIjkvKDnu5/oioLml6XjgIHms5XlrproioLlgYfml6XjgIHlm73pmYXoioLml6XlkowyNOiKguawlO+8iVxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0SG9saWRheUluZm8oZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzb2xhciA9IFNvbGFyLmZyb21EYXRlKGRhdGUpO1xyXG4gICAgY29uc3QgbHVuYXIgPSBzb2xhci5nZXRMdW5hcigpO1xyXG4gICAgXHJcbiAgICAvLyAxLiDlkIjlubbmiYDmnInoioLml6Xkv6Hmga9cclxuICAgIGxldCBmZXN0aXZhbHMgPSBbLi4ubHVuYXIuZ2V0RmVzdGl2YWxzKCksIC4uLnNvbGFyLmdldEZlc3RpdmFscygpXTtcclxuICAgIFxyXG4gICAgLy8gMi4g5Y676YeNXHJcbiAgICBmZXN0aXZhbHMgPSBbLi4ubmV3IFNldChmZXN0aXZhbHMpXTtcclxuICAgIFxyXG4gICAgLy8gMy4g5LyY5YWI6L+U5Zue5Li76KaB6IqC5pelXHJcbiAgICBpZiAoZmVzdGl2YWxzICYmIGZlc3RpdmFscy5sZW5ndGggPiAwICYmIGZlc3RpdmFsc1swXSkge1xyXG4gICAgICAgIHJldHVybiBmZXN0aXZhbHNbMF07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIDQuIOajgOafpeaYr+WQpuacieazleWumuiKguWBh+aXpeWQjeensO+8iOWPquWcqOW9k+WkqeaYvuekuu+8iVxyXG4gICAgY29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgIGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICBjb25zdCBkYXRlU3RyID0gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcclxuICAgIFxyXG4gICAgY29uc3QgaG9saWRheSA9IEhvbGlkYXlVdGlsLmdldEhvbGlkYXkoZGF0ZVN0cik7XHJcbiAgICBpZiAoaG9saWRheSkge1xyXG4gICAgICAgIGNvbnN0IGhvbGlkYXlOYW1lID0gaG9saWRheS5nZXROYW1lKCk7XHJcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gaG9saWRheS5nZXRUYXJnZXQoKTtcclxuICAgICAgICAvLyDlj6rmnInlvZPml6XmnJ/mmK/oioLlgYfml6XnmoTnrKzkuIDlpKnvvIh0YXJnZXQg562J5LqO5b2T5YmN5pel5pyf77yJ5pe25omN5pi+56S66IqC5pel5ZCN56ewXHJcbiAgICAgICAgaWYgKGhvbGlkYXlOYW1lICYmIGhvbGlkYXlOYW1lICE9PSAn5LyRJyAmJiBob2xpZGF5TmFtZSAhPT0gJ+ePrScgJiYgdGFyZ2V0ID09PSBkYXRlU3RyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBob2xpZGF5TmFtZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBcIlwiO1xyXG59XHJcblxyXG4vLyDojrflj5bms5XlrproioLlgYfml6XnirbmgIFcclxuZXhwb3J0IGZ1bmN0aW9uIGdldEhvbGlkYXlTdGF0dXMoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcbiAgICAvLyDlsIZEYXRl5a+56LGh6L2s5o2i5Li6WVlZWS1NTS1EROagvOW8j+eahOWtl+espuS4slxyXG4gICAgY29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgIGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICBjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XHJcbiAgICBjb25zdCBkYXRlU3RyID0gYCR7eWVhcn0tJHttb250aH0tJHtkYXl9YDtcclxuICAgIFxyXG4gICAgY29uc3QgaG9saWRheSA9IEhvbGlkYXlVdGlsLmdldEhvbGlkYXkoZGF0ZVN0cik7XHJcbiAgICBcclxuICAgIGlmIChob2xpZGF5KSB7XHJcbiAgICAgICAgaWYgKGhvbGlkYXkuaXNXb3JrKCkpIHtcclxuICAgICAgICAgICAgLy8g5ZGo5YWt5ZGo5pel5pS55Li65bel5L2c5pel77yM5pi+56S6XCLnj61cIlxyXG4gICAgICAgICAgICByZXR1cm4gXCLnj61cIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyDkvJHmga/vvIzmmL7npLpcIuS8kVwiXHJcbiAgICAgICAgICAgIHJldHVybiBcIuS8kVwiO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIFwiXCI7XHJcbn1cclxuXHJcbi8vIOm7mOiupOS9v+eUqCBJU08gODYwMSDmoIflh4bvvJrlkajkuIDkuLrnrKzkuIDlpKnvvIzljIXlkKvor6XlubTnrKzkuIDkuKrlkajlm5vnmoTlkajkuLrnrKwx5ZGoXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRXZWVrSW5mbyhcclxuICBkYXRlOiBEYXRlXHJcbik6IHsgd2VlazogbnVtYmVyOyB5ZWFyOiBudW1iZXIgfSB7XHJcbiAgY29uc3QgZCA9IGRheWpzKGRhdGUpO1xyXG5cclxuICAvLyBJU08gODYwMTog5ZGo5LiA5Li656ys5LiA5aSp77yM5YyF5ZCr6K+l5bm056ys5LiA5Liq5ZGo5Zub55qE5ZGo5Li656ysMeWRqFxyXG4gIHJldHVybiB7XHJcbiAgICB3ZWVrOiBkLmlzb1dlZWsoKSxcclxuICAgIHllYXI6IGQuaXNvV2Vla1llYXIoKSxcclxuICB9O1xyXG59XHJcblxyXG4vLyDojrflj5blkajmlbDvvIjkv53mjIHlkJHlkI7lhbzlrrnvvIlcclxuZXhwb3J0IGZ1bmN0aW9uIGdldFdlZWtOdW1iZXIoZGF0ZTogRGF0ZSk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gZ2V0V2Vla0luZm8oZGF0ZSkud2VlaztcclxufVxyXG5cclxuLy8g6I635Y+W5a2j5bqmXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRRdWFydGVyKGRhdGU6IERhdGUpOiBudW1iZXIge1xyXG4gICAgLy8g5L2/55SoZGF5anPorqHnrpflraPluqZcclxuICAgIHJldHVybiBNYXRoLmZsb29yKChkYXlqcyhkYXRlKS5tb250aCgpICsgMykgLyAzKTtcclxufVxyXG5cclxuLy8g5pel5pyf5qC85byP5YyW5Ye95pWwXHJcbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGU6IERhdGUsIGZvcm1hdDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIOS9v+eUqGRheWpz5qC85byP5YyW5pel5pyfXHJcbiAgICBjb25zdCBkID0gZGF5anMoZGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIOiOt+WPluWRqOaVsOWSjOWRqOW5tOS7vVxyXG4gICAgY29uc3Qgd2Vla0luZm8gPSBnZXRXZWVrSW5mbyhkYXRlKTtcclxuICAgIGNvbnN0IHdlZWsgPSBTdHJpbmcod2Vla0luZm8ud2VlaykucGFkU3RhcnQoMiwgJzAnKTtcclxuICAgIGNvbnN0IHdlZWtZZWFyID0gd2Vla0luZm8ueWVhcjtcclxuICAgIFxyXG4gICAgLy8g5aSE55CG5ZGo5pWw5ZKM5ZGo5bm05Lu9XHJcbiAgICBsZXQgcmVzdWx0ID0gZm9ybWF0XHJcbiAgICAgICAgLy8g5pu/5o2i5ZGo5bm05Lu9XHJcbiAgICAgICAgLnJlcGxhY2UoJ0dHR0cnLCBTdHJpbmcod2Vla1llYXIpKVxyXG4gICAgICAgIC8vIOabv+aNouWRqOaVsO+8iOS4pOS9jeaVsO+8iVxyXG4gICAgICAgIC5yZXBsYWNlKCdXVycsIHdlZWspXHJcbiAgICAgICAgLy8g5pu/5o2i5a2j5bqmXHJcbiAgICAgICAgLnJlcGxhY2UoJ1EnLCBTdHJpbmcoZ2V0UXVhcnRlcihkYXRlKSkpO1xyXG4gICAgXHJcbiAgICAvLyDkvb/nlKhkYXlqc+eahGZvcm1hdOaWueazleWkhOeQhuWFtuS7luWNoOS9jeesplxyXG4gICAgcmVzdWx0ID0gZC5mb3JtYXQocmVzdWx0KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiOt+WPluaciOS7veeahOesrOS4gOWkqeaYr+aYn+acn+WHoFxyXG4gKiBAcGFyYW0gZGF0ZSDml6XmnJ9cclxuICogQHJldHVybnMg5pif5pyf5Yeg77yIMC0277yMMOihqOekuuWRqOaXpe+8iVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpcnN0RGF5T2ZNb250aChkYXRlOiBEYXRlKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIDEpO1xyXG4gICAgcmV0dXJuIGZpcnN0RGF5LmdldERheSgpO1xyXG59XHJcblxyXG4vKipcclxuICog6I635Y+W5pyI5Lu955qE5oC75aSp5pWwXHJcbiAqIEBwYXJhbSBkYXRlIOaXpeacn1xyXG4gKiBAcmV0dXJucyDmnIjku73mgLvlpKnmlbBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXREYXlzSW5Nb250aChkYXRlOiBEYXRlKTogbnVtYmVyIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSArIDEsIDApLmdldERhdGUoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiuoeeul+mcgOimgeaYvuekuueahOS4iuS4quaciOWkqeaVsFxyXG4gKiBAcGFyYW0gZmlyc3REYXlPZk1vbnRoIOaciOS7veesrOS4gOWkqeaYr+aYn+acn+WHoFxyXG4gKiBAcmV0dXJucyDpnIDopoHmmL7npLrnmoTkuIrkuKrmnIjlpKnmlbBcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQcmV2TW9udGhEYXlzVG9TaG93KGZpcnN0RGF5T2ZNb250aDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgIC8vIOWRqOS4gOS4uuesrOS4gOWkqe+8muWmguaenOesrOS4gOWkqeaYr+WRqOaXpe+8jOmcgOimgeaYvuekujblpKnkuIrkuKrmnIjnmoTml6XmnJ/vvIzlkKbliJnmmL7npLpzdGFydERheS0x5aSpXHJcbiAgICByZXR1cm4gZmlyc3REYXlPZk1vbnRoID09PSAwID8gNiA6IGZpcnN0RGF5T2ZNb250aCAtIDE7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDorqHnrpfml6XljobpnIDopoHmmL7npLrnmoTooYzmlbBcclxuICogQHBhcmFtIHByZXZNb250aERheXNUb1Nob3cg6ZyA6KaB5pi+56S655qE5LiK5Liq5pyI5aSp5pWwXHJcbiAqIEBwYXJhbSBkYXlzSW5Nb250aCDmnKzmnIjmgLvlpKnmlbBcclxuICogQHJldHVybnMg6ZyA6KaB55qE6KGM5pWwXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FsZW5kYXJSb3dzKHByZXZNb250aERheXNUb1Nob3c6IG51bWJlciwgZGF5c0luTW9udGg6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAvLyDorqHnrpfpnIDopoHnmoTooYzmlbDvvJoo5LiK5Liq5pyI6ZyA6KaB5pi+56S655qE5aSp5pWwICsg5pys5pyI5aSp5pWwICsgNyAtIDEpIC8gNyDlkJHkuIrlj5bmlbRcclxuICAgIHJldHVybiBNYXRoLmNlaWwoKHByZXZNb250aERheXNUb1Nob3cgKyBkYXlzSW5Nb250aCkgLyA3KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiuoeeul+aMh+WumuWNleWFg+agvOWvueW6lOeahOaXpeacn1xyXG4gKiBAcGFyYW0gcm93SW5kZXgg6KGM57Si5byVXHJcbiAqIEBwYXJhbSBkYXlJbmRleCDliJfntKLlvJVcclxuICogQHBhcmFtIGN1cnJlbnREYXRlIOW9k+WJjeaXpeacn1xyXG4gKiBAcmV0dXJucyDljZXlhYPmoLzlr7nlupTnmoTml6XmnJ/lkozmmK/lkKbkuLrlhbbku5bmnIjku71cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDZWxsRGF0ZShyb3dJbmRleDogbnVtYmVyLCBkYXlJbmRleDogbnVtYmVyLCBjdXJyZW50RGF0ZTogRGF0ZSk6IHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0ge1xyXG4gICAgY29uc3QgY3VycmVudFllYXIgPSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgY29uc3QgY3VycmVudE1vbnRoID0gY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuICAgIFxyXG4gICAgLy8g6K6h566X5pyI5Lu956ys5LiA5aSp5piv5pif5pyf5YegXHJcbiAgICBjb25zdCBmaXJzdERheU9mTW9udGggPSBnZXRGaXJzdERheU9mTW9udGgoY3VycmVudERhdGUpO1xyXG4gICAgXHJcbiAgICAvLyDorqHnrpfpnIDopoHmmL7npLrnmoTkuIrkuKrmnIjlpKnmlbBcclxuICAgIGNvbnN0IHByZXZNb250aERheXNUb1Nob3cgPSBnZXRQcmV2TW9udGhEYXlzVG9TaG93KGZpcnN0RGF5T2ZNb250aCk7XHJcbiAgICBcclxuICAgIC8vIOiuoeeul+acrOaciOaAu+WkqeaVsFxyXG4gICAgY29uc3QgZGF5c0luTW9udGggPSBnZXREYXlzSW5Nb250aChjdXJyZW50RGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIOiuoeeul+W9k+WJjeWNleWFg+agvOWcqOaJgOacieWNleWFg+agvOS4reeahOS9jee9rlxyXG4gICAgY29uc3QgdG90YWxDZWxscyA9IHJvd0luZGV4ICogNyArIGRheUluZGV4O1xyXG4gICAgXHJcbiAgICBsZXQgZGF0ZTogRGF0ZTtcclxuICAgIGxldCBpc090aGVyTW9udGggPSBmYWxzZTtcclxuICAgIFxyXG4gICAgaWYgKHRvdGFsQ2VsbHMgPCBwcmV2TW9udGhEYXlzVG9TaG93KSB7XHJcbiAgICAgICAgLy8g5LiK5Liq5pyI55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgcHJldk1vbnRoID0gY3VycmVudE1vbnRoIC0gMTtcclxuICAgICAgICBjb25zdCBwcmV2TW9udGhZZWFyID0gY3VycmVudE1vbnRoID09PSAwID8gY3VycmVudFllYXIgLSAxIDogY3VycmVudFllYXI7XHJcbiAgICAgICAgY29uc3QgcHJldk1vbnRoRGF5cyA9IGdldERheXNJbk1vbnRoKG5ldyBEYXRlKHByZXZNb250aFllYXIsIHByZXZNb250aCkpO1xyXG4gICAgICAgIGNvbnN0IGRheSA9IHByZXZNb250aERheXMgLSBwcmV2TW9udGhEYXlzVG9TaG93ICsgdG90YWxDZWxscyArIDE7XHJcbiAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKHByZXZNb250aFllYXIsIHByZXZNb250aCwgZGF5KTtcclxuICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmICh0b3RhbENlbGxzIDwgcHJldk1vbnRoRGF5c1RvU2hvdyArIGRheXNJbk1vbnRoKSB7XHJcbiAgICAgICAgLy8g5b2T5YmN5pyI55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgZGF5ID0gdG90YWxDZWxscyAtIHByZXZNb250aERheXNUb1Nob3cgKyAxO1xyXG4gICAgICAgIGRhdGUgPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBkYXkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyDkuIvkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICBjb25zdCBuZXh0TW9udGggPSBjdXJyZW50TW9udGggKyAxO1xyXG4gICAgICAgIGNvbnN0IG5leHRNb250aFllYXIgPSBjdXJyZW50TW9udGggPT09IDExID8gY3VycmVudFllYXIgKyAxIDogY3VycmVudFllYXI7XHJcbiAgICAgICAgY29uc3QgZGF5ID0gdG90YWxDZWxscyAtIHByZXZNb250aERheXNUb1Nob3cgLSBkYXlzSW5Nb250aCArIDE7XHJcbiAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKG5leHRNb250aFllYXIsIG5leHRNb250aCwgZGF5KTtcclxuICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4geyBkYXRlLCBpc090aGVyTW9udGggfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiuoeeul+aXpeWOhuaciOS7veaVsOaNrlxyXG4gKiBAcGFyYW0gY3VycmVudERhdGUg5b2T5YmN5pel5pyfXHJcbiAqIEByZXR1cm5zIOaXpeWOhuaciOS7veaVsOaNrlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENhbGVuZGFyTW9udGhEYXRhKGN1cnJlbnREYXRlOiBEYXRlKToge1xyXG4gICAgY3VycmVudFllYXI6IG51bWJlcjtcclxuICAgIGN1cnJlbnRNb250aDogbnVtYmVyO1xyXG4gICAgZmlyc3REYXlPZk1vbnRoOiBudW1iZXI7XHJcbiAgICBkYXlzSW5Nb250aDogbnVtYmVyO1xyXG4gICAgcHJldk1vbnRoRGF5c1RvU2hvdzogbnVtYmVyO1xyXG4gICAgcm93c05lZWRlZDogbnVtYmVyO1xyXG4gICAgbGFzdERheU9mUHJldk1vbnRoOiBEYXRlO1xyXG4gICAgZmlyc3REYXlPZk5leHRNb250aDogRGF0ZTtcclxufSB7XHJcbiAgICBjb25zdCBjdXJyZW50WWVhciA9IGN1cnJlbnREYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICBjb25zdCBjdXJyZW50TW9udGggPSBjdXJyZW50RGF0ZS5nZXRNb250aCgpO1xyXG4gICAgXHJcbiAgICAvLyDorqHnrpfmnIjku73nrKzkuIDlpKnmmK/mmJ/mnJ/lh6BcclxuICAgIGNvbnN0IGZpcnN0RGF5T2ZNb250aCA9IGdldEZpcnN0RGF5T2ZNb250aChjdXJyZW50RGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIOiuoeeul+acrOaciOaAu+WkqeaVsFxyXG4gICAgY29uc3QgZGF5c0luTW9udGggPSBnZXREYXlzSW5Nb250aChjdXJyZW50RGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIOiuoeeul+mcgOimgeaYvuekuueahOS4iuS4quaciOWkqeaVsFxyXG4gICAgY29uc3QgcHJldk1vbnRoRGF5c1RvU2hvdyA9IGdldFByZXZNb250aERheXNUb1Nob3coZmlyc3REYXlPZk1vbnRoKTtcclxuICAgIFxyXG4gICAgLy8g6K6h566X6ZyA6KaB55qE6KGM5pWwXHJcbiAgICBjb25zdCByb3dzTmVlZGVkID0gZ2V0Q2FsZW5kYXJSb3dzKHByZXZNb250aERheXNUb1Nob3csIGRheXNJbk1vbnRoKTtcclxuICAgIFxyXG4gICAgLy8g6K6h566X5LiK5Liq5pyI55qE5pyA5ZCO5LiA5aSpXHJcbiAgICBjb25zdCBsYXN0RGF5T2ZQcmV2TW9udGggPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCAwKTtcclxuICAgIFxyXG4gICAgLy8g6K6h566X5LiL5Liq5pyI55qE56ys5LiA5aSpXHJcbiAgICBjb25zdCBmaXJzdERheU9mTmV4dE1vbnRoID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCArIDEsIDEpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGN1cnJlbnRZZWFyLFxyXG4gICAgICAgIGN1cnJlbnRNb250aCxcclxuICAgICAgICBmaXJzdERheU9mTW9udGgsXHJcbiAgICAgICAgZGF5c0luTW9udGgsXHJcbiAgICAgICAgcHJldk1vbnRoRGF5c1RvU2hvdyxcclxuICAgICAgICByb3dzTmVlZGVkLFxyXG4gICAgICAgIGxhc3REYXlPZlByZXZNb250aCxcclxuICAgICAgICBmaXJzdERheU9mTmV4dE1vbnRoXHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICog6I635Y+W5b2T5YmN5pyI5Lu955qE5omA5pyJ5pel5pyf5pWw5o2uXHJcbiAqIEBwYXJhbSBjdXJyZW50RGF0ZSDlvZPliY3ml6XmnJ9cclxuICogQHJldHVybnMg5pel5pyf5pWw5o2u5pWw57uEXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9udGhEYXRlcyhjdXJyZW50RGF0ZTogRGF0ZSk6IEFycmF5PEFycmF5PHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0+PiB7XHJcbiAgICBjb25zdCBkYXRhID0gZ2V0Q2FsZW5kYXJNb250aERhdGEoY3VycmVudERhdGUpO1xyXG4gICAgY29uc3QgZGF0ZXM6IEFycmF5PEFycmF5PHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0+PiA9IFtdO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCByb3cgPSAwOyByb3cgPCBkYXRhLnJvd3NOZWVkZWQ7IHJvdysrKSB7XHJcbiAgICAgICAgY29uc3Qgcm93RGF0ZXM6IEFycmF5PHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0+ID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgZGF5ID0gMDsgZGF5IDwgNzsgZGF5KyspIHtcclxuICAgICAgICAgICAgY29uc3QgeyBkYXRlLCBpc090aGVyTW9udGggfSA9IGdldENlbGxEYXRlKHJvdywgZGF5LCBjdXJyZW50RGF0ZSk7XHJcbiAgICAgICAgICAgIHJvd0RhdGVzLnB1c2goeyBkYXRlLCBpc090aGVyTW9udGggfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRhdGVzLnB1c2gocm93RGF0ZXMpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gZGF0ZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDmo4Dmn6Xml6XmnJ/mmK/lkKbkuLrku4rlpKlcclxuICogQHBhcmFtIGRhdGUg6KaB5qOA5p+l55qE5pel5pyfXHJcbiAqIEByZXR1cm5zIOaYr+WQpuS4uuS7iuWkqVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVG9kYXkoZGF0ZTogRGF0ZSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgcmV0dXJuIGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IHRvZGF5LnRvRGF0ZVN0cmluZygpO1xyXG59XHJcblxyXG4vKipcclxuICog5qOA5p+l5pel5pyf5piv5ZCm5Li65ZGo5pyrXHJcbiAqIEBwYXJhbSBkYXRlIOimgeajgOafpeeahOaXpeacn1xyXG4gKiBAcmV0dXJucyDmmK/lkKbkuLrlkajmnKtcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1dlZWtlbmQoZGF0ZTogRGF0ZSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgZGF5ID0gZGF0ZS5nZXREYXkoKTtcclxuICAgIHJldHVybiBkYXkgPT09IDAgfHwgZGF5ID09PSA2O1xyXG59XHJcblxyXG4vKipcclxuICog6K6h566X57uZ5a6a5pel5pyf5omA5Zyo6KGM55qE5omA5pyJ5pel5pyfXHJcbiAqIEBwYXJhbSBkYXRlIOaXpeacn1xyXG4gKiBAcmV0dXJucyDor6XooYznmoTmiYDmnInml6XmnJ9cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRXZWVrRGF0ZXMoZGF0ZTogRGF0ZSk6IERhdGVbXSB7XHJcbiAgICBjb25zdCBkYXlPZldlZWsgPSBkYXRlLmdldERheSgpO1xyXG4gICAgLy8g6K6h566X5pys5ZGo5LiA55qE5pel5pyfXHJcbiAgICBjb25zdCBtb25kYXkgPSBuZXcgRGF0ZShkYXRlKTtcclxuICAgIG1vbmRheS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRheU9mV2VlayA9PT0gMCA/IDYgOiBkYXlPZldlZWsgLSAxKSk7XHJcbiAgICBcclxuICAgIC8vIOeUn+aIkOacrOWRqOeahOaJgOacieaXpeacn1xyXG4gICAgY29uc3Qgd2Vla0RhdGVzOiBEYXRlW10gPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNzsgaSsrKSB7XHJcbiAgICAgICAgY29uc3QgY3VycmVudERhdGUgPSBuZXcgRGF0ZShtb25kYXkpO1xyXG4gICAgICAgIGN1cnJlbnREYXRlLnNldERhdGUobW9uZGF5LmdldERhdGUoKSArIGkpO1xyXG4gICAgICAgIHdlZWtEYXRlcy5wdXNoKGN1cnJlbnREYXRlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHdlZWtEYXRlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIOiOt+WPluS4iuS4quaciOeahOaXpeacn1xyXG4gKiBAcGFyYW0gZGF0ZSDlvZPliY3ml6XmnJ9cclxuICogQHJldHVybnMg5LiK5Liq5pyI55qE5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJldk1vbnRoRGF0ZShkYXRlOiBEYXRlKTogRGF0ZSB7XHJcbiAgICBjb25zdCBwcmV2TW9udGggPSBkYXRlLmdldE1vbnRoKCkgLSAxO1xyXG4gICAgY29uc3QgcHJldk1vbnRoWWVhciA9IGRhdGUuZ2V0TW9udGgoKSA9PT0gMCA/IGRhdGUuZ2V0RnVsbFllYXIoKSAtIDEgOiBkYXRlLmdldEZ1bGxZZWFyKCk7XHJcbiAgICByZXR1cm4gbmV3IERhdGUocHJldk1vbnRoWWVhciwgcHJldk1vbnRoLCBkYXRlLmdldERhdGUoKSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDojrflj5bkuIvkuKrmnIjnmoTml6XmnJ9cclxuICogQHBhcmFtIGRhdGUg5b2T5YmN5pel5pyfXHJcbiAqIEByZXR1cm5zIOS4i+S4quaciOeahOaXpeacn1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldE5leHRNb250aERhdGUoZGF0ZTogRGF0ZSk6IERhdGUge1xyXG4gICAgY29uc3QgbmV4dE1vbnRoID0gZGF0ZS5nZXRNb250aCgpICsgMTtcclxuICAgIGNvbnN0IG5leHRNb250aFllYXIgPSBkYXRlLmdldE1vbnRoKCkgPT09IDExID8gZGF0ZS5nZXRGdWxsWWVhcigpICsgMSA6IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuICAgIHJldHVybiBuZXcgRGF0ZShuZXh0TW9udGhZZWFyLCBuZXh0TW9udGgsIGRhdGUuZ2V0RGF0ZSgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiOt+WPluS4iuS4gOW5tOeahOaXpeacn1xyXG4gKiBAcGFyYW0gZGF0ZSDlvZPliY3ml6XmnJ9cclxuICogQHJldHVybnMg5LiK5LiA5bm055qE5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJldlllYXJEYXRlKGRhdGU6IERhdGUpOiBEYXRlIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCkgLSAxLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiOt+WPluS4i+S4gOW5tOeahOaXpeacn1xyXG4gKiBAcGFyYW0gZGF0ZSDlvZPliY3ml6XmnJ9cclxuICogQHJldHVybnMg5LiL5LiA5bm055qE5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0TmV4dFllYXJEYXRlKGRhdGU6IERhdGUpOiBEYXRlIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCkgKyAxLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiOt+WPluW9k+WJjeaXpeacn+aJgOWcqOWto+W6pueahOW8gOWni+aXpeacn1xyXG4gKiBAcGFyYW0gZGF0ZSDlvZPliY3ml6XmnJ9cclxuICogQHJldHVybnMg5a2j5bqm5byA5aeL5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UXVhcnRlclN0YXJ0RGF0ZShkYXRlOiBEYXRlKTogRGF0ZSB7XHJcbiAgICBjb25zdCBxdWFydGVyID0gZ2V0UXVhcnRlcihkYXRlKTtcclxuICAgIGNvbnN0IHN0YXJ0TW9udGggPSAocXVhcnRlciAtIDEpICogMztcclxuICAgIHJldHVybiBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIHN0YXJ0TW9udGgsIDEpO1xyXG59XHJcblxyXG4vKipcclxuICog6I635Y+W5b2T5YmN5pel5pyf5omA5Zyo5a2j5bqm55qE57uT5p2f5pel5pyfXHJcbiAqIEBwYXJhbSBkYXRlIOW9k+WJjeaXpeacn1xyXG4gKiBAcmV0dXJucyDlraPluqbnu5PmnZ/ml6XmnJ9cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRRdWFydGVyRW5kRGF0ZShkYXRlOiBEYXRlKTogRGF0ZSB7XHJcbiAgICBjb25zdCBxdWFydGVyID0gZ2V0UXVhcnRlcihkYXRlKTtcclxuICAgIGNvbnN0IGVuZE1vbnRoID0gcXVhcnRlciAqIDM7XHJcbiAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBlbmRNb250aCwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDorqHnrpfmjIflrprooYzlkozliJfnmoTml6XmnJ9cclxuICogQHBhcmFtIHJvd0luZGV4IOihjOe0ouW8lVxyXG4gKiBAcGFyYW0gY29sSW5kZXgg5YiX57Si5byVXHJcbiAqIEBwYXJhbSBjdXJyZW50WWVhciDlvZPliY3lubTku71cclxuICogQHBhcmFtIGN1cnJlbnRNb250aCDlvZPliY3mnIjku71cclxuICogQHBhcmFtIHByZXZNb250aERheXNUb1Nob3cg6ZyA6KaB5pi+56S655qE5LiK5Liq5pyI5aSp5pWwXHJcbiAqIEBwYXJhbSBkYXlzSW5Nb250aCDmnKzmnIjmgLvlpKnmlbBcclxuICogQHJldHVybnMg6K6h566X5Ye655qE5pel5pyf5ZKM5piv5ZCm5Li65YW25LuW5pyI5Lu9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlQ2VsbERhdGUocm93SW5kZXg6IG51bWJlciwgY29sSW5kZXg6IG51bWJlciwgY3VycmVudFllYXI6IG51bWJlciwgY3VycmVudE1vbnRoOiBudW1iZXIsIHByZXZNb250aERheXNUb1Nob3c6IG51bWJlciwgZGF5c0luTW9udGg6IG51bWJlcik6IHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0ge1xyXG4gICAgY29uc3QgdG90YWxDZWxscyA9IHJvd0luZGV4ICogNyArIGNvbEluZGV4O1xyXG4gICAgbGV0IGRhdGU6IERhdGU7XHJcbiAgICBsZXQgaXNPdGhlck1vbnRoID0gZmFsc2U7XHJcblxyXG4gICAgaWYgKHRvdGFsQ2VsbHMgPCBwcmV2TW9udGhEYXlzVG9TaG93KSB7XHJcbiAgICAgICAgLy8g5LiK5Liq5pyI55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgcHJldk1vbnRoID0gY3VycmVudE1vbnRoIC0gMTtcclxuICAgICAgICBjb25zdCBwcmV2TW9udGhZZWFyID0gY3VycmVudE1vbnRoID09PSAwID8gY3VycmVudFllYXIgLSAxIDogY3VycmVudFllYXI7XHJcbiAgICAgICAgY29uc3QgcHJldk1vbnRoRGF5cyA9IGdldERheXNJbk1vbnRoKG5ldyBEYXRlKHByZXZNb250aFllYXIsIHByZXZNb250aCkpO1xyXG4gICAgICAgIGNvbnN0IGRheSA9IHByZXZNb250aERheXMgLSBwcmV2TW9udGhEYXlzVG9TaG93ICsgdG90YWxDZWxscyArIDE7XHJcbiAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKHByZXZNb250aFllYXIsIHByZXZNb250aCwgZGF5KTtcclxuICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgfSBlbHNlIGlmICh0b3RhbENlbGxzIDwgcHJldk1vbnRoRGF5c1RvU2hvdyArIGRheXNJbk1vbnRoKSB7XHJcbiAgICAgICAgLy8g5b2T5YmN5pyI55qE5pel5pyfXHJcbiAgICAgICAgY29uc3QgZGF5ID0gdG90YWxDZWxscyAtIHByZXZNb250aERheXNUb1Nob3cgKyAxO1xyXG4gICAgICAgIGRhdGUgPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoLCBkYXkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyDkuIvkuKrmnIjnmoTml6XmnJ9cclxuICAgICAgICBjb25zdCBuZXh0TW9udGggPSBjdXJyZW50TW9udGggKyAxO1xyXG4gICAgICAgIGNvbnN0IG5leHRNb250aFllYXIgPSBjdXJyZW50TW9udGggPT09IDExID8gY3VycmVudFllYXIgKyAxIDogY3VycmVudFllYXI7XHJcbiAgICAgICAgY29uc3QgZGF5ID0gdG90YWxDZWxscyAtIHByZXZNb250aERheXNUb1Nob3cgLSBkYXlzSW5Nb250aCArIDE7XHJcbiAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKG5leHRNb250aFllYXIsIG5leHRNb250aCwgZGF5KTtcclxuICAgICAgICBpc090aGVyTW9udGggPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IGRhdGUsIGlzT3RoZXJNb250aCB9O1xyXG59XHJcblxyXG4vKipcclxuICog6K6h566X5b2T5YmN5ZGo55qE6LW35aeL5pel5pyf77yI5ZGo5LiA77yJXHJcbiAqIEBwYXJhbSByb3dJbmRleCDooYzntKLlvJVcclxuICogQHBhcmFtIGN1cnJlbnRZZWFyIOW9k+WJjeW5tOS7vVxyXG4gKiBAcGFyYW0gY3VycmVudE1vbnRoIOW9k+WJjeaciOS7vVxyXG4gKiBAcGFyYW0gcHJldk1vbnRoRGF5c1RvU2hvdyDpnIDopoHmmL7npLrnmoTkuIrkuKrmnIjlpKnmlbBcclxuICogQHJldHVybnMg5ZGo6LW35aeL5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlV2Vla1N0YXJ0RGF0ZShyb3dJbmRleDogbnVtYmVyLCBjdXJyZW50WWVhcjogbnVtYmVyLCBjdXJyZW50TW9udGg6IG51bWJlciwgcHJldk1vbnRoRGF5c1RvU2hvdzogbnVtYmVyKTogRGF0ZSB7XHJcbiAgICAvLyDorqHnrpflvZPliY3lkajnmoTotbflp4vml6XmnJ9cclxuICAgIGNvbnN0IGRheXNQYXNzZWQgPSByb3dJbmRleCAqIDcgLSBwcmV2TW9udGhEYXlzVG9TaG93O1xyXG4gICAgY29uc3Qgd2Vla1N0YXJ0RGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnRZZWFyLCBjdXJyZW50TW9udGgsIDEgKyBkYXlzUGFzc2VkKTtcclxuICAgIFxyXG4gICAgLy8g6LCD5pW05Yiw5ZGo5LiAXHJcbiAgICBjb25zdCBhZGp1c3RlZFdlZWtTdGFydERhdGUgPSBuZXcgRGF0ZSh3ZWVrU3RhcnREYXRlKTtcclxuICAgIGNvbnN0IHdlZWtTdGFydERheU9mV2VlayA9IGFkanVzdGVkV2Vla1N0YXJ0RGF0ZS5nZXREYXkoKTtcclxuICAgIGNvbnN0IGRheXNUb01vbmRheSA9IHdlZWtTdGFydERheU9mV2VlayA9PT0gMCA/IDYgOiB3ZWVrU3RhcnREYXlPZldlZWsgLSAxO1xyXG4gICAgYWRqdXN0ZWRXZWVrU3RhcnREYXRlLnNldERhdGUoYWRqdXN0ZWRXZWVrU3RhcnREYXRlLmdldERhdGUoKSAtIGRheXNUb01vbmRheSk7XHJcbiAgICBcclxuICAgIHJldHVybiBhZGp1c3RlZFdlZWtTdGFydERhdGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDorqHnrpfml6XljobmnIjku73nmoTlrozmlbTmlbDmja5cclxuICogQHBhcmFtIGN1cnJlbnREYXRlIOW9k+WJjeaXpeacn1xyXG4gKiBAcmV0dXJucyDml6XljobmnIjku73mlbDmja5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjdWxhdGVDYWxlbmRhck1vbnRoRGF0YShjdXJyZW50RGF0ZTogRGF0ZSk6IHtcclxuICAgIGN1cnJlbnRZZWFyOiBudW1iZXI7XHJcbiAgICBjdXJyZW50TW9udGg6IG51bWJlcjtcclxuICAgIGZpcnN0RGF5OiBEYXRlO1xyXG4gICAgc3RhcnREYXk6IG51bWJlcjtcclxuICAgIGRheXNJbk1vbnRoOiBudW1iZXI7XHJcbiAgICBwcmV2TW9udGhEYXlzVG9TaG93OiBudW1iZXI7XHJcbiAgICBjdXJyZW50Um93czogbnVtYmVyO1xyXG4gICAgbGFzdERheU9mUHJldk1vbnRoOiBEYXRlO1xyXG4gICAgcHJldk1vbnRoRGF5czogbnVtYmVyO1xyXG4gICAgcHJldk1vbnRoOiBudW1iZXI7XHJcbiAgICBwcmV2TW9udGhZZWFyOiBudW1iZXI7XHJcbiAgICBmaXJzdERheU9mTmV4dE1vbnRoOiBEYXRlO1xyXG4gICAgbmV4dE1vbnRoOiBudW1iZXI7XHJcbiAgICBuZXh0TW9udGhZZWFyOiBudW1iZXI7XHJcbn0ge1xyXG4gICAgY29uc3QgY3VycmVudFllYXIgPSBjdXJyZW50RGF0ZS5nZXRGdWxsWWVhcigpO1xyXG4gICAgY29uc3QgY3VycmVudE1vbnRoID0gY3VycmVudERhdGUuZ2V0TW9udGgoKTtcclxuXHJcbiAgICAvLyDorqHnrpfmnIjku73nrKzkuIDlpKnmmK/mmJ/mnJ/lh6BcclxuICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgMSk7XHJcbiAgICBsZXQgc3RhcnREYXkgPSBmaXJzdERheS5nZXREYXkoKTtcclxuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gZ2V0RGF5c0luTW9udGgoY3VycmVudERhdGUpO1xyXG4gICAgXHJcbiAgICAvLyDlkajkuIDkuLrnrKzkuIDlpKnvvJrlpoLmnpznrKzkuIDlpKnmmK/lkajml6XvvIzpnIDopoHmmL7npLo25aSp5LiK5Liq5pyI55qE5pel5pyf77yM5ZCm5YiZ5pi+56S6c3RhcnREYXktMeWkqVxyXG4gICAgY29uc3QgcHJldk1vbnRoRGF5c1RvU2hvdyA9IHN0YXJ0RGF5ID09PSAwID8gNiA6IHN0YXJ0RGF5IC0gMTtcclxuICAgIFxyXG4gICAgLy8g6K6h566X6ZyA6KaB55qE6KGM5pWw77yaKOS4iuS4quaciOmcgOimgeaYvuekuueahOWkqeaVsCArIOacrOaciOWkqeaVsCArIDcgLSAxKSAvIDcg5ZCR5LiK5Y+W5pW0XHJcbiAgICBjb25zdCBjdXJyZW50Um93cyA9IE1hdGguY2VpbCgocHJldk1vbnRoRGF5c1RvU2hvdyArIGRheXNJbk1vbnRoKSAvIDcpO1xyXG5cclxuICAgIC8vIOiuoeeul+S4iuS4quaciOeahOacgOWQjuS4gOWkqVxyXG4gICAgY29uc3QgbGFzdERheU9mUHJldk1vbnRoID0gbmV3IERhdGUoY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgMCk7XHJcbiAgICBjb25zdCBwcmV2TW9udGhEYXlzID0gbGFzdERheU9mUHJldk1vbnRoLmdldERhdGUoKTtcclxuICAgIGNvbnN0IHByZXZNb250aCA9IGxhc3REYXlPZlByZXZNb250aC5nZXRNb250aCgpO1xyXG4gICAgY29uc3QgcHJldk1vbnRoWWVhciA9IGxhc3REYXlPZlByZXZNb250aC5nZXRGdWxsWWVhcigpO1xyXG4gICAgXHJcbiAgICAvLyDorqHnrpfkuIvkuKrmnIjnmoTnrKzkuIDlpKlcclxuICAgIGNvbnN0IGZpcnN0RGF5T2ZOZXh0TW9udGggPSBuZXcgRGF0ZShjdXJyZW50WWVhciwgY3VycmVudE1vbnRoICsgMSwgMSk7XHJcbiAgICBjb25zdCBuZXh0TW9udGggPSBmaXJzdERheU9mTmV4dE1vbnRoLmdldE1vbnRoKCk7XHJcbiAgICBjb25zdCBuZXh0TW9udGhZZWFyID0gZmlyc3REYXlPZk5leHRNb250aC5nZXRGdWxsWWVhcigpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgY3VycmVudFllYXIsXHJcbiAgICAgICAgY3VycmVudE1vbnRoLFxyXG4gICAgICAgIGZpcnN0RGF5LFxyXG4gICAgICAgIHN0YXJ0RGF5LFxyXG4gICAgICAgIGRheXNJbk1vbnRoLFxyXG4gICAgICAgIHByZXZNb250aERheXNUb1Nob3csXHJcbiAgICAgICAgY3VycmVudFJvd3MsXHJcbiAgICAgICAgbGFzdERheU9mUHJldk1vbnRoLFxyXG4gICAgICAgIHByZXZNb250aERheXMsXHJcbiAgICAgICAgcHJldk1vbnRoLFxyXG4gICAgICAgIHByZXZNb250aFllYXIsXHJcbiAgICAgICAgZmlyc3REYXlPZk5leHRNb250aCxcclxuICAgICAgICBuZXh0TW9udGgsXHJcbiAgICAgICAgbmV4dE1vbnRoWWVhclxyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIOiuoeeul+aciOinhuWbvuS4reW9k+WJjeihjOeahOaJgOacieaXpeacn1xyXG4gKiBAcGFyYW0gcm93SW5kZXgg6KGM57Si5byVXHJcbiAqIEBwYXJhbSBjdXJyZW50WWVhciDlvZPliY3lubTku71cclxuICogQHBhcmFtIGN1cnJlbnRNb250aCDlvZPliY3mnIjku71cclxuICogQHBhcmFtIHByZXZNb250aERheXNUb1Nob3cg6ZyA6KaB5pi+56S655qE5LiK5Liq5pyI5aSp5pWwXHJcbiAqIEBwYXJhbSBkYXlzSW5Nb250aCDmnKzmnIjmgLvlpKnmlbBcclxuICogQHJldHVybnMg5b2T5YmN6KGM55qE5omA5pyJ5pel5pyfXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlTW9udGhSb3dEYXRlcyhyb3dJbmRleDogbnVtYmVyLCBjdXJyZW50WWVhcjogbnVtYmVyLCBjdXJyZW50TW9udGg6IG51bWJlciwgcHJldk1vbnRoRGF5c1RvU2hvdzogbnVtYmVyLCBkYXlzSW5Nb250aDogbnVtYmVyKTogQXJyYXk8eyBkYXRlOiBEYXRlOyBpc090aGVyTW9udGg6IGJvb2xlYW4gfT4ge1xyXG4gICAgY29uc3Qgcm93RGF0ZXM6IEFycmF5PHsgZGF0ZTogRGF0ZTsgaXNPdGhlck1vbnRoOiBib29sZWFuIH0+ID0gW107XHJcbiAgICBcclxuICAgIGZvciAobGV0IGNvbEluZGV4ID0gMDsgY29sSW5kZXggPCA3OyBjb2xJbmRleCsrKSB7XHJcbiAgICAgICAgY29uc3QgeyBkYXRlLCBpc090aGVyTW9udGggfSA9IGNhbGN1bGF0ZUNlbGxEYXRlKHJvd0luZGV4LCBjb2xJbmRleCwgY3VycmVudFllYXIsIGN1cnJlbnRNb250aCwgcHJldk1vbnRoRGF5c1RvU2hvdywgZGF5c0luTW9udGgpO1xyXG4gICAgICAgIHJvd0RhdGVzLnB1c2goeyBkYXRlLCBpc090aGVyTW9udGggfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiByb3dEYXRlcztcclxufSJdfQ==