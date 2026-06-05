/**
 * 简单的事件发射器类，用于实现事件驱动的刷新机制
 * 支持事件去重
 */
export class EventEmitter {
    private events: Map<string, Array<(...args: any[]) => void>> = new Map();
    private lastEventArgs: Map<string, any[]> = new Map();

    constructor() {
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
     * 触发事件（带参数去重）
     * @param event 事件名称
     * @param args 事件参数
     */
    public emit(event: string, ...args: any[]): void {
        if (!this.events.has(event)) {
            return;
        }

        const lastArgs = this.lastEventArgs.get(event);
        const argsEqual = lastArgs && this.areArgsEqual(args, lastArgs);

        if (argsEqual) {
            return;
        }

        this.lastEventArgs.set(event, args);

        this.events.get(event)!.forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * 清除所有事件监听器
     * @param event 事件名称，不提供则清除所有事件
     */
    public clear(event?: string): void {
        if (event) {
            this.events.delete(event);
            this.lastEventArgs.delete(event);
        } else {
            this.events.clear();
            this.lastEventArgs.clear();
        }
    }

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