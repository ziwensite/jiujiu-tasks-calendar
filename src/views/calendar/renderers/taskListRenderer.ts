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
        
        // 为任务项添加双击事件监听器
        taskItem.addEventListener("dblclick", () => {
            onTaskDoubleClick(task);
        });
        
    }
}

