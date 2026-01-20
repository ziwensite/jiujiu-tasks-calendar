import { MyPlugin } from '../../../main';
import { Task } from '../../../services/taskService';

export class TaskListRenderer {
    private plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    /**
     * 渲染任务列表
     */
    renderTaskList(container: HTMLElement, tasks: Task[], onTaskToggle: (index: number, completed: boolean) => void, onTaskDoubleClick: (task: Task) => void) {
        // 清空现有任务列表
        const taskList = container.querySelector(".task-list") as HTMLElement;
        if (!taskList) return;
        
        taskList.empty();

        // 渲染任务列表
        tasks.forEach((task, index) => {
            this.renderTaskItem(taskList, task, index, onTaskToggle, onTaskDoubleClick);
        });
    }

    /**
     * 渲染单个任务项
     */
    private renderTaskItem(container: HTMLElement, task: Task, index: number, onTaskToggle: (index: number, completed: boolean) => void, onTaskDoubleClick: (task: Task) => void) {
        const taskItem = container.createEl("div", { cls: "task-item" });
        
        const checkbox = taskItem.createEl("input", { type: "checkbox" });
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.addEventListener("change", () => {
            onTaskToggle(index, checkbox.checked);
        });
        
        const taskContent = taskItem.createEl("div", { cls: "task-content" });
        
        const taskText = taskContent.createEl("span", { text: task.text });
        taskText.className = "task-text";
        taskText.dataset.text = task.text;
        if (task.completed) {
            taskText.addClass("completed");
        }
        
        // 显示日期信息（截止日期和开始日期）在同一行
        if (task.dueDate || task.startDate) {
            const datesContainer = taskContent.createEl("div", { 
                cls: "task-dates-container" 
            });
            
            // 显示截止日期（如果有）
            if (task.dueDate) {
                const dueDateEl = datesContainer.createEl("span", { 
                    text: `截止: ${task.dueDate.toLocaleDateString('zh-CN')}`,
                    cls: "task-due-date" 
                });
                if (task.completed) {
                    dueDateEl.addClass("completed");
                }
            }
            
            // 显示开始日期（如果有），排列在截止日期的后面，中间添加空格
            if (task.startDate) {
                if (task.dueDate) {
                    // 如果同时有截止日期和开始日期，在它们之间添加一个空格
                    datesContainer.createEl("span", { text: " " });
                }
                const startDateEl = datesContainer.createEl("span", { 
                    text: `开始: ${task.startDate.toLocaleDateString('zh-CN')}`,
                    cls: "task-start-date" 
                });
                if (task.completed) {
                    startDateEl.addClass("completed");
                }
            }
        }
        
        // 为任务项添加点击事件监听器，实现选中功能
        taskItem.addEventListener("click", (e) => {
            // 如果点击的是复选框，不处理选中逻辑
            if ((e.target as HTMLElement).closest(".task-checkbox")) {
                return;
            }
            
            // 移除所有任务项的选中状态
            container.querySelectorAll(".task-item").forEach((item) => {
                item.removeClass("selected");
            });
            
            // 为当前任务项添加选中状态
            taskItem.addClass("selected");
        });
        
        // 为任务项添加双击事件监听器
        taskItem.addEventListener("dblclick", () => {
            onTaskDoubleClick(task);
        });
        
    }
}

