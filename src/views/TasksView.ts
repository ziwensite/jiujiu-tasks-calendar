import { ItemView, WorkspaceLeaf, App } from 'obsidian';
import { MyPlugin } from '../main';
import { extractTasks, filterTasks, Task } from '../services/taskService';
import { formatDate } from '../utils/dateUtils';

const VIEW_TYPE_TASKS = "jiujiu-tasks-view";

export class TasksView extends ItemView {
    private plugin: MyPlugin;
    private currentTab: 'all' | 'year' | 'month' | 'week' | 'schedule' = 'all';
    private currentDate: Date;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentDate = new Date();
    }

    getViewType(): string {
        return VIEW_TYPE_TASKS;
    }

    getDisplayText(): string {
        return "任务视图";
    }

    getIcon(): string {
        return "check-square";
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;

        container.empty();
        this.buildTasksView(container);
    }

    async onClose() {
        // 清理资源
    }

    private async buildTasksView(container: HTMLElement) {
        // 任务视图容器
        const tasksViewContainer = container.createEl("div", {cls: "tasks-view-container"});
        
        // 任务视图标签行
        const tabsContainer = tasksViewContainer.createEl("div", {cls: "tasks-view-tabs"});
        
        // 创建五个标签：所有任务、年、月、周、日程
        const tabs = [
            { name: "所有任务", value: "all" },
            { name: "年", value: "year" },
            { name: "月", value: "month" },
            { name: "周", value: "week" },
            { name: "日程", value: "schedule" }
        ];
        
        tabs.forEach((tab, index) => {
            const tabElement = tabsContainer.createEl("div", {
                text: tab.name,
                cls: `tasks-view-tab ${index === 0 ? 'active' : ''}`
            });
            tabElement.dataset.tabValue = tab.value;
            tabElement.addEventListener("click", async () => {
                this.switchTab(tab.value as 'all' | 'year' | 'month' | 'week' | 'schedule', tabElement as HTMLElement);
            });
        });
        
        // 任务视图内容区域
        const contentContainer = tasksViewContainer.createEl("div", {cls: "tasks-view-content"});
        this.renderTasksList(contentContainer);
    }

    private async switchTab(tabValue: 'all' | 'year' | 'month' | 'week' | 'schedule', tabElement: HTMLElement) {
        // 更新当前标签
        this.currentTab = tabValue;
        
        // 更新标签样式
        const tabs = this.containerEl.querySelectorAll(".tasks-view-tab");
        tabs.forEach((tab) => tab.classList.remove("active"));
        tabElement.classList.add("active");
        
        // 重新渲染任务列表
        const contentContainer = this.containerEl.querySelector(".tasks-view-content") as HTMLElement;
        if (contentContainer) {
            await this.renderTasksList(contentContainer);
        }
    }

    private async renderTasksList(container: HTMLElement) {
        container.empty();
        
        // 获取所有任务
        const allTasks = await extractTasks(this.app, this.plugin.settings);
        
        let filteredTasks: Task[] = [];
        
        // 根据当前标签过滤任务
        switch (this.currentTab) {
            case 'all':
                filteredTasks = allTasks;
                break;
            case 'year':
                const year = this.currentDate.getFullYear();
                const startDate = new Date(year, 0, 1);
                const endDate = new Date(year + 1, 0, 0);
                filteredTasks = allTasks.filter(task => {
                    if (task.dueDate) {
                        return task.dueDate >= startDate && task.dueDate <= endDate;
                    }
                    return false;
                });
                break;
            case 'month':
                const yearMonth = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                const startMonth = new Date(yearMonth, month, 1);
                const endMonth = new Date(yearMonth, month + 1, 0);
                filteredTasks = allTasks.filter(task => {
                    if (task.dueDate) {
                        return task.dueDate >= startMonth && task.dueDate <= endMonth;
                    }
                    return false;
                });
                break;
            case 'week':
                const today = new Date();
                const dayOfWeek = today.getDay();
                const monday = new Date(today);
                monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                filteredTasks = allTasks.filter(task => {
                    if (task.dueDate) {
                        return task.dueDate >= monday && task.dueDate <= sunday;
                    }
                    return false;
                });
                break;
            case 'schedule':
                filteredTasks = allTasks.filter(task => task.timeRange !== undefined);
                break;
        }
        
        // 渲染任务列表
        if (filteredTasks.length === 0) {
            container.createEl("div", {text: "暂无任务", cls: "empty-tasks-message"});
        } else {
            const taskList = container.createEl("div", {cls: "task-list"});
            filteredTasks.forEach(task => {
                const taskItem = taskList.createEl("div", {cls: "task-item"});
                
                // 任务复选框
                const checkbox = taskItem.createEl("input", {
                    type: "checkbox",
                    cls: "task-checkbox"
                });
                checkbox.checked = task.completed;
                checkbox.addEventListener("change", async () => {
                    await this.toggleTask(task, checkbox.checked);
                });
                
                // 任务内容
                const taskContent = taskItem.createEl("div", {cls: "task-content"});
                taskContent.createEl("div", {text: task.text, cls: "task-text"});
                
                if (task.dueDate) {
                    const dueDate = taskContent.createEl("div", {cls: "task-due-date"});
                    dueDate.textContent = formatDate(task.dueDate, "YYYY-MM-DD");
                }
                
                if (task.timeRange) {
                    const timeRange = taskContent.createEl("div", {cls: "task-time-range"});
                    timeRange.textContent = `${task.timeRange.startTime} - ${task.timeRange.endTime}`;
                }
            });
        }
    }

    private async toggleTask(task: Task, completed: boolean) {
        // 这里可以实现任务状态切换逻辑
        // 暂时只更新本地状态
        console.log(`Toggle task: ${task.text}, completed: ${completed}`);
    }
}
