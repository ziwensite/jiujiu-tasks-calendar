import { MyPlugin } from '../../../main';
import { Task } from '../../../services/taskService';
import { TaskEditModal } from '../../../modals/TaskEditModal';

export class TaskListRenderer {
    private plugin: MyPlugin;

    constructor(plugin: MyPlugin) {
        this.plugin = plugin;
    }

    /**
     * 渲染任务列表
     */
    renderTaskList(container: HTMLElement, tasks: Task[], onTaskToggle: (index: number, updatedTask: Task) => void, onTaskDoubleClick: (task: Task) => void) {
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
    private renderTaskItem(container: HTMLElement, task: Task, index: number, onTaskToggle: (index: number, updatedTask: Task) => void, onTaskDoubleClick: (task: Task) => void) {
        const taskItem = container.createEl("div", { cls: "task-item" });
        
        const checkbox = taskItem.createEl("input", { type: "checkbox" });
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.addEventListener("click", (e) => {
            e.stopPropagation(); // 阻止事件冒泡，避免触发任务项的点击事件
            // 打开任务编辑模态框
            const modal = new TaskEditModal({
                app: this.plugin.app,
                task: task,
                onSubmit: (updatedTask) => {

                    // 更新任务状态和其他属性
                    onTaskToggle(index, updatedTask);
                }
            });
            modal.open();
        });
        
        const taskContent = taskItem.createEl("div", { cls: "task-content" });
        
        const taskText = taskContent.createEl("span", { text: task.text });
        taskText.className = "task-text";
        taskText.dataset.text = task.text;
        if (task.completed) {
            taskText.addClass("completed");
        }
        
        // 显示日期和时间信息在同一行
        if (task.dueDate || task.startDate || task.timeRange) {
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
            
            // 显示时间范围（如果有），排列在截止日期和开始日期的中间
            if (task.timeRange) {
                // 如果前面有截止日期，添加一个空格
                if (task.dueDate) {
                    datesContainer.createEl("span", { text: " " });
                }
                
                // 格式化时间范围
                let timeText = `${task.timeRange.startTime}`;
                if (task.timeRange.endTime) {
                    timeText += ` - ${task.timeRange.endTime}`;
                }
                
                const timeRangeEl = datesContainer.createEl("span", { 
                    text: `${timeText}`,
                    cls: "task-time-range" 
                });
                if (task.completed) {
                    timeRangeEl.addClass("completed");
                }
            }
            
            // 显示开始日期（如果有），排列在时间范围的后面
            if (task.startDate) {
                // 如果前面有截止日期或时间范围，添加一个空格
                if (task.dueDate || task.timeRange) {
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
        
        // 为任务项添加点击事件监听器，实现选中/取消选中和展开/折叠功能
        taskItem.addEventListener("click", (e) => {
            // 如果点击的是复选框，不处理选中逻辑
            if ((e.target as HTMLElement).closest(".task-checkbox")) {
                return;
            }
            
            // 检查当前任务项是否已经被选中
            const isSelected = taskItem.hasClass("selected");
            
            // 移除所有任务项的选中状态
            container.querySelectorAll(".task-item").forEach((item) => {
                item.removeClass("selected");
            });
            
            if (isSelected) {
                // 如果已经被选中，取消选中
                taskItem.removeClass("selected");
                taskItem.removeClass("expanded");
            } else {
                // 如果未被选中，添加选中状态
                taskItem.addClass("selected");
                
                // 检查任务文本是否超过2行，如果是则展开
                if (taskText.offsetHeight > 36) { // 假设每行高度为18px
                    taskItem.addClass("expanded");
                }
            }
        });
        
        // 为任务项添加双击事件监听器
        taskItem.addEventListener("dblclick", () => {
            onTaskDoubleClick(task);
        });
        
    }
}

