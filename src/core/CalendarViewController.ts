import { CalendarView } from '../views/CalendarView';
import { MyPlugin } from '../main';

/**
 * 中央控制器，统一管理刷新请求，避免频繁刷新带来的性能问题
 */
export class CalendarViewController {
    private plugin: MyPlugin;
    private requestCounter: number;
    private lastRequestTime: number;
    private flushTimeoutId: number | null = null;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
        this.requestCounter = 0;
        this.lastRequestTime = 0;
    }

    /**
     * 立即刷新所有日历视图
     */
    public forceFlush(): void {
        // 清除可能存在的定时器
        if (this.flushTimeoutId !== null) {
            window.clearTimeout(this.flushTimeoutId);
            this.flushTimeoutId = null;
        }

        // 重置计数器和时间
        this.requestCounter = 0;
        this.lastRequestTime = 0;

        // 刷新所有日历视图
        this.plugin.app.workspace.getLeavesOfType("jiujiu-calendar-view").forEach(leaf => {
            const view = leaf.view as CalendarView;
            view.renderCalendar();
        });
    }

    /**
     * 请求刷新，防抖处理
     * 默认在1秒后刷新，如果在此期间再次调用，刷新时间会顺延
     */
    public requestFlush(): void {
        this.requestCounter++;
        this.lastRequestTime = performance.now();

        // 清除旧的定时器
        if (this.flushTimeoutId !== null) {
            window.clearTimeout(this.flushTimeoutId);
            this.flushTimeoutId = null;
        }

        // 设置新的定时器
        this.flushTimeoutId = window.setTimeout(() => {
            const now = performance.now();
            // 检查是否在防抖时间内（990ms，避免精确计时问题）
            if (now - this.lastRequestTime < 990) {
                return;
            }

            // 执行刷新
            this.forceFlush();
        }, 1000);
    }

    /**
     * 请求刷新任务列表，单独处理，避免影响整个日历视图
     */
    public requestRefreshTaskList(): void {
        this.plugin.app.workspace.getLeavesOfType("jiujiu-calendar-view").forEach(leaf => {
            const view = leaf.view as CalendarView;
            view.refreshTaskList();
        });
    }
}