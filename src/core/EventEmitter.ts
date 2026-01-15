/**
 * 简单的事件发射器类，用于实现事件驱动的刷新机制
 * 支持事件节流和去重
 */
export class EventEmitter {
    private events: Map<string, Array<(...args: any[]) => void>> = new Map();
    private eventTimers: Map<string, number> = new Map();
    private lastEventArgs: Map<string, any[]> = new Map();
    private defaultThrottleTime: number = 200; // 默认节流时间，200ms

    constructor(defaultThrottleTime: number = 200) {
        this.defaultThrottleTime = defaultThrottleTime;
    }

    /**
     * 订阅事件
     * @param event 事件名称
     * @param listener 事件监听器
     */
    public on(event: string, listener: (...args: any[]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
    }

    /**
     * 取消订阅事件
     * @param event 事件名称
     * @param listener 事件监听器
     */
    public off(event: string, listener: (...args: any[]) => void): void {
        if (this.events.has(event)) {
            const listeners = this.events.get(event)!;
            this.events.set(event, listeners.filter(l => l !== listener));
        }
    }

    /**
     * 触发事件
     * @param event 事件名称
     * @param args 事件参数
     * @param throttleTime 节流时间（毫秒），0表示不节流
     */
    public emit(event: string, ...args: any[]): void {
        // 如果没有监听器，直接返回
        if (!this.events.has(event)) {
            return;
        }

        // 检查参数是否与上次相同，如果相同则跳过
        const lastArgs = this.lastEventArgs.get(event);
        const argsEqual = lastArgs && this.areArgsEqual(args, lastArgs);
        
        if (argsEqual) {
            return; // 参数相同，跳过事件触发
        }

        // 更新上次事件参数
        this.lastEventArgs.set(event, args);

        // 执行事件监听器
        this.events.get(event)!.forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * 触发事件（节流版）
     * @param event 事件名称
     * @param args 事件参数
     * @param throttleTime 节流时间（毫秒）
     */
    public emitThrottled(event: string, ...args: any[]): void {
        // 如果没有监听器，直接返回
        if (!this.events.has(event)) {
            return;
        }

        // 检查参数是否与上次相同，如果相同则跳过
        const lastArgs = this.lastEventArgs.get(event);
        const argsEqual = lastArgs && this.areArgsEqual(args, lastArgs);
        
        if (argsEqual) {
            return; // 参数相同，跳过事件触发
        }

        // 如果已经有定时器，直接返回
        if (this.eventTimers.has(event)) {
            return;
        }

        // 更新上次事件参数
        this.lastEventArgs.set(event, args);

        // 执行事件监听器
        this.events.get(event)!.forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });

        // 设置定时器，在节流时间后清除
        const timerId = window.setTimeout(() => {
            this.eventTimers.delete(event);
        }, this.defaultThrottleTime);
        
        this.eventTimers.set(event, timerId);
    }

    /**
     * 清除所有事件监听器
     * @param event 事件名称，不提供则清除所有事件
     */
    public clear(event?: string): void {
        if (event) {
            this.events.delete(event);
            this.eventTimers.delete(event);
            this.lastEventArgs.delete(event);
        } else {
            this.events.clear();
            this.eventTimers.clear();
            this.lastEventArgs.clear();
        }
    }

    /**
     * 检查两个参数数组是否相等
     * @param args1 参数数组1
     * @param args2 参数数组2
     * @returns 是否相等
     */
    private areArgsEqual(args1: any[], args2: any[]): boolean {
        if (args1.length !== args2.length) {
            return false;
        }
        
        for (let i = 0; i < args1.length; i++) {
            const arg1 = args1[i];
            const arg2 = args2[i];
            
            // 处理不同类型的比较
            if (typeof arg1 !== typeof arg2) {
                return false;
            }
            
            // 处理对象比较
            if (arg1 === arg2) {
                continue;
            }
            
            // 处理Date对象比较
            if (arg1 instanceof Date && arg2 instanceof Date) {
                if (arg1.getTime() !== arg2.getTime()) {
                    return false;
                }
                continue;
            }
            
            // 处理数组比较
            if (Array.isArray(arg1) && Array.isArray(arg2)) {
                if (!this.areArgsEqual(arg1, arg2)) {
                    return false;
                }
                continue;
            }
            
            // 处理对象比较
            if (typeof arg1 === 'object' && arg1 !== null && arg2 !== null) {
                const keys1 = Object.keys(arg1);
                const keys2 = Object.keys(arg2);
                
                if (keys1.length !== keys2.length) {
                    return false;
                }
                
                for (const key of keys1) {
                    if (!this.areArgsEqual([arg1[key]], [arg2[key]])) {
                        return false;
                    }
                }
                continue;
            }
            
            // 其他类型，直接比较
            if (arg1 !== arg2) {
                return false;
            }
        }
        
        return true;
    }
}

/**
 * 事件类型枚举
 */
export enum CalendarEvent {
    /** 任务数据更新事件 */
    TASK_DATA_UPDATED = 'task-data-updated',
    /** 日历视图更新事件 */
    CALENDAR_VIEW_UPDATED = 'calendar-view-updated',
    /** 选择日期变化事件 */
    SELECTED_DATE_CHANGED = 'selected-date-changed',
    /** 视图类型变化事件 */
    VIEW_TYPE_CHANGED = 'view-type-changed',
    /** 导航类型变化事件 */
    NAVIGATION_TYPE_CHANGED = 'navigation-type-changed',
    /** 设置更新事件 */
    SETTINGS_UPDATED = 'settings-updated',
    /** 文件变化事件 */
    FILE_CHANGED = 'file-changed'
}