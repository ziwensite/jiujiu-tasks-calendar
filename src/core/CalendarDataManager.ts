import { MyPlugin } from '../main';
import { extractTasks, clearTaskCache, Task } from '../services/taskService';
import { calculateCalendarMonthData, formatDate } from '../utils/dateUtils';

/**
 * 日历数据管理类，集中管理日历相关数据
 */
export class CalendarDataManager {
    private plugin: MyPlugin;
    
    // 任务数据缓存
    private tasks: Task[] = [];
    private lastTaskUpdateTime: number = 0;
    private taskUpdateInterval: number = 5000; // 任务数据缓存时间，5秒
    
    // 日历月份数据缓存
    private calendarMonthCache: Map<string, { data: any; timestamp: number }> = new Map();
    private calendarMonthCacheInterval: number = 30000; // 日历月份数据缓存时间，30秒

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    /**
     * 获取日历月份数据，带缓存机制
     * @param date 当前日期
     * @returns 日历月份数据
     */
    public getCalendarMonthData(date: Date) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const now = Date.now();
        
        const cached = this.calendarMonthCache.get(key);
        if (cached && now - cached.timestamp < this.calendarMonthCacheInterval) {
            return cached.data;
        }
        
        const data = calculateCalendarMonthData(date);
        
        this.calendarMonthCache.set(key, { data, timestamp: now });
        
        this.cleanupCalendarMonthCache(date);
        
        return data;
    }

    /**
     * 获取任务数据，带缓存机制
     * @param forceRefresh 是否强制刷新数据
     * @returns 任务数据数组
     */
    public async getTasks(forceRefresh: boolean = false): Promise<Task[]> {
        const now = Date.now();
        
        // 如果距离上次更新时间超过缓存时间，或者强制刷新，则重新提取任务
        if (forceRefresh || now - this.lastTaskUpdateTime > this.taskUpdateInterval) {
            this.tasks = await extractTasks(this.plugin.app, this.plugin.settings);
            this.lastTaskUpdateTime = now;
        }
        
        return this.tasks;
    }

    /**
     * 获取过滤后的任务数据
     * @param date 过滤日期
     * @returns 过滤后的任务数据数组
     */
    public async getFilteredTasks(date: Date): Promise<Task[]> {
        // 先获取所有任务（带缓存）
        const allTasks = await this.getTasks();
        
        // 创建当天的开始和结束时间
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // 过滤任务
        return allTasks.filter(task => {
            // 检查1: 有截止日期且截止日期是当天的任务
            if (task.dueDate) {
                return task.dueDate >= startOfDay && task.dueDate <= endOfDay;
            }
            
            // 检查2: 没有截止日期但在当天笔记中的任务
            const dailySettings = this.plugin.settings.dailyNote;
            const dailyFileName = formatDate(date, dailySettings.fileNameFormat);
            const dailyNotePath = `${dailySettings.savePath}/${dailyFileName}.md`;
            
            return task.filePath === dailyNotePath;
        });
    }

    /**
     * 刷新任务数据
     */
    public async refreshTasks(): Promise<void> {
        clearTaskCache();
        this.tasks = await extractTasks(this.plugin.app, this.plugin.settings);
        this.lastTaskUpdateTime = Date.now();
    }

    /**
     * 清除任务缓存
     */
    public clearTaskCache(): void {
        this.tasks = [];
        this.lastTaskUpdateTime = 0;
    }

    /**
     * 清除日历月份数据缓存
     */
    public clearCalendarMonthCache(): void {
        this.calendarMonthCache.clear();
    }

    /**
     * 清除所有缓存
     */
    public clearAllCache(): void {
        this.clearTaskCache();
        this.clearCalendarMonthCache();
    }

    /**
     * 设置任务缓存时间
     * @param interval 缓存时间（毫秒）
     */
    public setTaskCacheInterval(interval: number): void {
        this.taskUpdateInterval = interval;
    }

    /**
     * 设置日历月份数据缓存时间
     * @param interval 缓存时间（毫秒）
     */
    public setCalendarMonthCacheInterval(interval: number): void {
        this.calendarMonthCacheInterval = interval;
    }

    /**
     * 清理过期的日历月份缓存
     * @param currentDate 当前日期
     */
    private cleanupCalendarMonthCache(currentDate: Date): void {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        // 只保留最近3个月的数据
        const monthsToKeep = 3;
        
        // 遍历所有缓存键
        for (const key of this.calendarMonthCache.keys()) {
            const [yearStr, monthStr] = key.split('-');
            // 确保yearStr和monthStr不是undefined
            if (!yearStr || !monthStr) {
                continue;
            }
            const cacheYear = parseInt(yearStr);
            const cacheMonth = parseInt(monthStr);
            
            // 计算月份差
            const monthDiff = (cacheYear - currentYear) * 12 + (cacheMonth - currentMonth);
            
            // 如果缓存超过3个月，删除
            if (Math.abs(monthDiff) > monthsToKeep) {
                this.calendarMonthCache.delete(key);
            }
        }
    }
}