/**
 * 中央控制器，统一管理刷新请求，避免频繁刷新带来的性能问题
 */
export class CalendarViewController {
    constructor(plugin) {
        this.flushTimeoutId = null;
        this.plugin = plugin;
        this.requestCounter = 0;
        this.lastRequestTime = 0;
    }
    /**
     * 立即刷新所有日历视图
     */
    forceFlush() {
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
            const view = leaf.view;
            view.renderCalendar();
        });
    }
    /**
     * 请求刷新，防抖处理
     * 默认在1秒后刷新，如果在此期间再次调用，刷新时间会顺延
     */
    requestFlush() {
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
    requestRefreshTaskList() {
        this.plugin.app.workspace.getLeavesOfType("jiujiu-calendar-view").forEach(leaf => {
            const view = leaf.view;
            view.refreshTaskList();
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2FsZW5kYXJWaWV3Q29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNhbGVuZGFyVmlld0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0E7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBTS9CLFlBQVksTUFBZ0I7UUFGcEIsbUJBQWMsR0FBa0IsSUFBSSxDQUFDO1FBR3pDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNJLFVBQVU7UUFDYixhQUFhO1FBQ2IsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQy9CLENBQUM7UUFFRCxXQUFXO1FBQ1gsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7UUFFekIsV0FBVztRQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQW9CLENBQUM7WUFDdkMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVEOzs7T0FHRztJQUNJLFlBQVk7UUFDZixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFekMsVUFBVTtRQUNWLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMvQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUMvQixDQUFDO1FBRUQsVUFBVTtRQUNWLElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDekMsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzlCLDZCQUE2QjtZQUM3QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUNuQyxPQUFPO1lBQ1gsQ0FBQztZQUVELE9BQU87WUFDUCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDdEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksc0JBQXNCO1FBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDN0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQW9CLENBQUM7WUFDdkMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2FsZW5kYXJWaWV3IH0gZnJvbSAnLi4vdmlld3MvQ2FsZW5kYXJWaWV3JztcbmltcG9ydCB7IE15UGx1Z2luIH0gZnJvbSAnLi4vbWFpbic7XG5cbi8qKlxuICog5Lit5aSu5o6n5Yi25Zmo77yM57uf5LiA566h55CG5Yi35paw6K+35rGC77yM6YG/5YWN6aKR57mB5Yi35paw5bim5p2l55qE5oCn6IO96Zeu6aKYXG4gKi9cbmV4cG9ydCBjbGFzcyBDYWxlbmRhclZpZXdDb250cm9sbGVyIHtcbiAgICBwcml2YXRlIHBsdWdpbjogTXlQbHVnaW47XG4gICAgcHJpdmF0ZSByZXF1ZXN0Q291bnRlcjogbnVtYmVyO1xuICAgIHByaXZhdGUgbGFzdFJlcXVlc3RUaW1lOiBudW1iZXI7XG4gICAgcHJpdmF0ZSBmbHVzaFRpbWVvdXRJZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdHJ1Y3RvcihwbHVnaW46IE15UGx1Z2luKSB7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLnJlcXVlc3RDb3VudGVyID0gMDtcbiAgICAgICAgdGhpcy5sYXN0UmVxdWVzdFRpbWUgPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeri+WNs+WIt+aWsOaJgOacieaXpeWOhuinhuWbvlxuICAgICAqL1xuICAgIHB1YmxpYyBmb3JjZUZsdXNoKCk6IHZvaWQge1xuICAgICAgICAvLyDmuIXpmaTlj6/og73lrZjlnKjnmoTlrprml7blmahcbiAgICAgICAgaWYgKHRoaXMuZmx1c2hUaW1lb3V0SWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5mbHVzaFRpbWVvdXRJZCk7XG4gICAgICAgICAgICB0aGlzLmZsdXNoVGltZW91dElkID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOmHjee9ruiuoeaVsOWZqOWSjOaXtumXtFxuICAgICAgICB0aGlzLnJlcXVlc3RDb3VudGVyID0gMDtcbiAgICAgICAgdGhpcy5sYXN0UmVxdWVzdFRpbWUgPSAwO1xuXG4gICAgICAgIC8vIOWIt+aWsOaJgOacieaXpeWOhuinhuWbvlxuICAgICAgICB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShcImppdWppdS1jYWxlbmRhci12aWV3XCIpLmZvckVhY2gobGVhZiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2aWV3ID0gbGVhZi52aWV3IGFzIENhbGVuZGFyVmlldztcbiAgICAgICAgICAgIHZpZXcucmVuZGVyQ2FsZW5kYXIoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6K+35rGC5Yi35paw77yM6Ziy5oqW5aSE55CGXG4gICAgICog6buY6K6k5ZyoMeenkuWQjuWIt+aWsO+8jOWmguaenOWcqOatpOacn+mXtOWGjeasoeiwg+eUqO+8jOWIt+aWsOaXtumXtOS8mumhuuW7tlxuICAgICAqL1xuICAgIHB1YmxpYyByZXF1ZXN0Rmx1c2goKTogdm9pZCB7XG4gICAgICAgIHRoaXMucmVxdWVzdENvdW50ZXIrKztcbiAgICAgICAgdGhpcy5sYXN0UmVxdWVzdFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgICAgICAvLyDmuIXpmaTml6fnmoTlrprml7blmahcbiAgICAgICAgaWYgKHRoaXMuZmx1c2hUaW1lb3V0SWQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5mbHVzaFRpbWVvdXRJZCk7XG4gICAgICAgICAgICB0aGlzLmZsdXNoVGltZW91dElkID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOiuvue9ruaWsOeahOWumuaXtuWZqFxuICAgICAgICB0aGlzLmZsdXNoVGltZW91dElkID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgICAgICAvLyDmo4Dmn6XmmK/lkKblnKjpmLLmipbml7bpl7TlhoXvvIg5OTBtc++8jOmBv+WFjeeyvuehruiuoeaXtumXrumimO+8iVxuICAgICAgICAgICAgaWYgKG5vdyAtIHRoaXMubGFzdFJlcXVlc3RUaW1lIDwgOTkwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDmiafooYzliLfmlrBcbiAgICAgICAgICAgIHRoaXMuZm9yY2VGbHVzaCgpO1xuICAgICAgICB9LCAxMDAwKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDor7fmsYLliLfmlrDku7vliqHliJfooajvvIzljZXni6zlpITnkIbvvIzpgb/lhY3lvbHlk43mlbTkuKrml6Xljobop4blm75cbiAgICAgKi9cbiAgICBwdWJsaWMgcmVxdWVzdFJlZnJlc2hUYXNrTGlzdCgpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoXCJqaXVqaXUtY2FsZW5kYXItdmlld1wiKS5mb3JFYWNoKGxlYWYgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmlldyA9IGxlYWYudmlldyBhcyBDYWxlbmRhclZpZXc7XG4gICAgICAgICAgICB2aWV3LnJlZnJlc2hUYXNrTGlzdCgpO1xuICAgICAgICB9KTtcbiAgICB9XG59Il19