import { __awaiter } from "tslib";
import { MarkdownView } from 'obsidian';
import { updateTaskInNote } from '../../../services/taskService';
export class EventHandler {
    constructor(plugin) {
        this.plugin = plugin;
    }
    /**
     * 处理文件变化事件
     */
    handleFileChange(file, onUpdateIndicator, onUpdateWeekIndicator, onRefreshTaskList) {
        return __awaiter(this, void 0, void 0, function* () {
            // 检查是否是文件且是Markdown文件
            if (!file || !('extension' in file) || file.extension !== 'md')
                return;
            // 尝试从文件路径中解析日期
            const date = this.parseDateFromFilePath(file.path);
            if (date) {
                // 如果文件对应到一个具体日期，只更新该日期的指示器
                yield onUpdateIndicator(date);
                // 同时更新该日期所在周的周数指示器
                yield onUpdateWeekIndicator(date);
            }
            // 如果文件可能影响当前选中日期的任务列表，更新任务列表
            if (this.isFileRelatedToSelectedDate(file)) {
                yield onRefreshTaskList();
            }
        });
    }
    /**
     * 处理任务双击事件：打开文件并高亮选中任务
     */
    handleTaskDoubleClick(task) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[TaskDoubleClick] Task clicked:', task);
            console.log('[TaskDoubleClick] Task filePath:', task.filePath);
            console.log('[TaskDoubleClick] Task text:', task.text);
            const file = this.plugin.app.vault.getAbstractFileByPath(task.filePath);
            console.log('[TaskDoubleClick] File found:', file);
            if (!file || !('stat' in file)) {
                console.warn('[TaskDoubleClick] File not found or invalid');
                return;
            }
            try {
                // 1. 打开文件
                const leaf = this.plugin.app.workspace.getLeaf(false);
                yield leaf.openFile(file);
                console.log('[TaskDoubleClick] File opened');
                // 2. 等待文件完全打开和渲染
                yield new Promise(resolve => setTimeout(resolve, 200));
                const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                console.log('[TaskDoubleClick] Active view:', activeView);
                if (!activeView) {
                    console.warn('[TaskDoubleClick] No active view');
                    return;
                }
                const editor = activeView.editor;
                const content = editor.getValue();
                console.log('[TaskDoubleClick] Content length:', content.length);
                // 3. 查找任务在文件中的位置
                const taskIndex = content.indexOf(task.text);
                console.log('[TaskDoubleClick] Task index:', taskIndex);
                if (taskIndex === -1) {
                    console.warn('[TaskDoubleClick] Task text not found in file, trying to find by raw text');
                    // 尝试使用原始任务文本查找
                    const rawTaskIndex = content.indexOf(task.rawText || '');
                    console.log('[TaskDoubleClick] Raw task index:', rawTaskIndex);
                    if (rawTaskIndex === -1) {
                        console.warn('[TaskDoubleClick] Raw task text not found either');
                        return;
                    }
                    // 4. 计算任务所在行（使用原始文本）
                    const line = content.substring(0, rawTaskIndex).split('\n').length - 1;
                    const lineText = editor.getLine(line);
                    console.log('[TaskDoubleClick] Line:', line, 'Line text:', lineText);
                    if (!lineText) {
                        console.warn('[TaskDoubleClick] Line text is empty');
                        return;
                    }
                    // 5. 只选中该行的开头，不尝试精确匹配完整文本
                    const startPos = { line, ch: 0 };
                    const endPos = { line, ch: lineText.length };
                    console.log('[TaskDoubleClick] Selection:', startPos, 'to', endPos);
                    // 6. 选中整行
                    editor.setSelection(startPos, endPos);
                    // 7. 滚动到视口中间
                    editor.scrollIntoView({ from: startPos, to: endPos }, true);
                    console.log('[TaskDoubleClick] Task line highlighted and scrolled');
                    return;
                }
                // 4. 计算任务所在行
                const line = content.substring(0, taskIndex).split('\n').length - 1;
                const lineText = editor.getLine(line);
                console.log('[TaskDoubleClick] Line:', line, 'Line text:', lineText);
                if (!lineText) {
                    console.warn('[TaskDoubleClick] Line text is empty');
                    return;
                }
                // 5. 只选中该行的开头，不尝试精确匹配完整文本
                const startPos = { line, ch: 0 };
                const endPos = { line, ch: lineText.length };
                console.log('[TaskDoubleClick] Selection:', startPos, 'to', endPos);
                // 6. 选中整行
                editor.setSelection(startPos, endPos);
                // 7. 滚动到视口中间
                editor.scrollIntoView({ from: startPos, to: endPos }, true);
                console.log('[TaskDoubleClick] Task highlighted and scrolled');
            }
            catch (error) {
                console.warn('Failed to highlight and center task:', error);
            }
        });
    }
    /**
     * 处理日期点击事件
     */
    handleDayClick(date, onUpdateSelection, onUpdateTaskList) {
        // 更新选中状态
        onUpdateSelection();
        // 更新任务列表
        onUpdateTaskList(date);
    }
    /**
     * 处理任务状态切换事件
     */
    handleTaskToggle(task, completed, onRefreshTaskList) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 更新笔记中的任务状态
                yield updateTaskInNote(this.plugin.app, task, completed);
                // 重新渲染任务列表，显示最新状态
                yield onRefreshTaskList();
            }
            catch (error) {
                console.error('Failed to update task:', error);
            }
        });
    }
    /**
     * 从文件路径中解析日期
     */
    parseDateFromFilePath(filePath) {
        const dailySettings = this.plugin.settings.dailyNote;
        const savePath = dailySettings.savePath;
        // 检查文件是否在日记保存路径中
        if (!filePath.startsWith(savePath))
            return null;
        // 提取文件名（不含扩展名）
        const fileName = filePath.substring(savePath.length + 1, filePath.length - 3);
        // 尝试使用日记的日期格式解析日期
        try {
            const dateRegex = /(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/;
            const match = fileName.match(dateRegex);
            if (match && match[1] && match[2] && match[3]) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1; // 月份从0开始
                const day = parseInt(match[3]);
                return new Date(year, month, day);
            }
        }
        catch (error) {
            console.error('Failed to parse date from file path:', error);
        }
        return null;
    }
    /**
     * 检查文件是否与选中日期相关
     */
    isFileRelatedToSelectedDate(file) {
        // 这里需要根据实际的选中日期逻辑进行实现
        // 暂时返回true，后续可以根据具体需求修改
        return true;
    }
    /**
     * 处理导航按钮点击事件
     */
    handleNavigationClick(direction, unit, currentDate, onUpdateDate) {
        const newDate = new Date(currentDate);
        switch (unit) {
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
                break;
            case 'quarter':
                newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -3 : 3));
                break;
        }
        onUpdateDate(newDate);
    }
    /**
     * 处理视图切换事件
     */
    handleViewToggle(currentViewType, onUpdateViewType) {
        const newViewType = currentViewType === 'month' ? 'year' : 'month';
        onUpdateViewType(newViewType);
    }
    /**
     * 处理今日按钮点击事件
     */
    handleTodayClick(onUpdateDate) {
        const today = new Date();
        onUpdateDate(today);
    }
    /**
     * 处理日期双击事件
     */
    handleDayDoubleClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 只使用 captureTo 配置创建笔记
            yield this.executeCaptureToConfig(date, 'daily');
        });
    }
    /**
     * 处理周数双击事件
     */
    handleWeekDoubleClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 只使用 captureTo 配置创建笔记
            yield this.executeCaptureToConfig(date, 'weekly');
        });
    }
    /**
     * 处理月份双击事件
     */
    handleMonthDoubleClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 只使用 captureTo 配置创建笔记
            yield this.executeCaptureToConfig(date, 'monthly');
        });
    }
    /**
     * 处理季度双击事件
     */
    handleQuarterDoubleClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 只使用 captureTo 配置创建笔记
            yield this.executeCaptureToConfig(date, 'quarterly');
        });
    }
    /**
     * 处理年份双击事件
     */
    handleYearDoubleClick(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // 只使用 captureTo 配置创建笔记
            yield this.executeCaptureToConfig(date, 'yearly');
        });
    }
    /**
     * 执行 captureTo 配置
     * @param date 日期
     * @param type 类型：daily, weekly, monthly, quarterly, yearly
     * @returns 是否成功执行 captureTo 配置
     */
    executeCaptureToConfig(date, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 获取 captureTo 配置
                const captureSettings = this.plugin.settings.taskSettings.captureToSettings;
                if (!captureSettings.enabled || !captureSettings.configs || captureSettings.configs.length === 0) {
                    return false;
                }
                // 尝试找到匹配类型的配置
                let targetConfig = captureSettings.configs.find(config => config.name.toLowerCase().includes(type));
                // 如果没有找到匹配的配置，使用默认配置
                if (!targetConfig) {
                    targetConfig = captureSettings.configs.find(config => config.id === captureSettings.taskConfigId);
                }
                // 如果仍然没有找到配置，返回 false
                if (!targetConfig) {
                    return false;
                }
                // 执行 captureTo 配置，并传递目标日期
                yield this.plugin.executeCaptureToConfig(Object.assign(Object.assign({}, targetConfig), { _targetDate: date // 添加目标日期
                 }));
                return true;
            }
            catch (error) {
                console.error(`Failed to execute captureTo config for ${type}:`, error);
                return false;
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRIYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnRIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsWUFBWSxFQUFTLE1BQU0sVUFBVSxDQUFDO0FBRS9DLE9BQU8sRUFBUSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3ZFLE1BQU0sT0FBTyxZQUFZO0lBR3JCLFlBQVksTUFBZ0I7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0csZ0JBQWdCLENBQUMsSUFBUyxFQUFFLGlCQUFnRCxFQUFFLHFCQUFvRCxFQUFFLGlCQUFzQzs7WUFDNUssc0JBQXNCO1lBQ3RCLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUk7Z0JBQUUsT0FBTztZQUV2RSxlQUFlO1lBQ2YsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNQLDJCQUEyQjtnQkFDM0IsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUIsbUJBQW1CO2dCQUNuQixNQUFNLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLENBQUM7WUFFRCw2QkFBNkI7WUFDN0IsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsTUFBTSxpQkFBaUIsRUFBRSxDQUFDO1lBQzlCLENBQUM7UUFDTCxDQUFDO0tBQUE7SUFFRDs7T0FFRztJQUNHLHFCQUFxQixDQUFDLElBQVU7O1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFD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T0FBTyxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsSUFBSSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3hFLE9BQU8sS0FBSyxDQUFDO1lBQ2pCLENBQUM7UUFDTCxDQUFDO0tBQUE7Q0FDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1hcmtkb3duVmlldywgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XHJcbmltcG9ydCB7IE15UGx1Z2luIH0gZnJvbSAnLi4vLi4vLi4vbWFpbic7XHJcbmltcG9ydCB7IFRhc2ssIHVwZGF0ZVRhc2tJbk5vdGUgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90YXNrU2VydmljZSc7XHJcbmltcG9ydCB7IGZvcm1hdERhdGUgfSBmcm9tICcuLi8uLi8uLi91dGlscy9kYXRlVXRpbHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEV2ZW50SGFuZGxlciB7XHJcbiAgICBwcml2YXRlIHBsdWdpbjogTXlQbHVnaW47XHJcblxyXG4gICAgY29uc3RydWN0b3IocGx1Z2luOiBNeVBsdWdpbikge1xyXG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5paH5Lu25Y+Y5YyW5LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGhhbmRsZUZpbGVDaGFuZ2UoZmlsZTogYW55LCBvblVwZGF0ZUluZGljYXRvcjogKGRhdGU6IERhdGUpID0+IFByb21pc2U8dm9pZD4sIG9uVXBkYXRlV2Vla0luZGljYXRvcjogKGRhdGU6IERhdGUpID0+IFByb21pc2U8dm9pZD4sIG9uUmVmcmVzaFRhc2tMaXN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7XHJcbiAgICAgICAgLy8g5qOA5p+l5piv5ZCm5piv5paH5Lu25LiU5pivTWFya2Rvd27mlofku7ZcclxuICAgICAgICBpZiAoIWZpbGUgfHwgISgnZXh0ZW5zaW9uJyBpbiBmaWxlKSB8fCBmaWxlLmV4dGVuc2lvbiAhPT0gJ21kJykgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWwneivleS7juaWh+S7tui3r+W+hOS4reino+aekOaXpeacn1xyXG4gICAgICAgIGNvbnN0IGRhdGUgPSB0aGlzLnBhcnNlRGF0ZUZyb21GaWxlUGF0aChmaWxlLnBhdGgpO1xyXG4gICAgICAgIGlmIChkYXRlKSB7XHJcbiAgICAgICAgICAgIC8vIOWmguaenOaWh+S7tuWvueW6lOWIsOS4gOS4quWFt+S9k+aXpeacn++8jOWPquabtOaWsOivpeaXpeacn+eahOaMh+ekuuWZqFxyXG4gICAgICAgICAgICBhd2FpdCBvblVwZGF0ZUluZGljYXRvcihkYXRlKTtcclxuICAgICAgICAgICAgLy8g5ZCM5pe25pu05paw6K+l5pel5pyf5omA5Zyo5ZGo55qE5ZGo5pWw5oyH56S65ZmoXHJcbiAgICAgICAgICAgIGF3YWl0IG9uVXBkYXRlV2Vla0luZGljYXRvcihkYXRlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5aaC5p6c5paH5Lu25Y+v6IO95b2x5ZON5b2T5YmN6YCJ5Lit5pel5pyf55qE5Lu75Yqh5YiX6KGo77yM5pu05paw5Lu75Yqh5YiX6KGoXHJcbiAgICAgICAgaWYgKHRoaXMuaXNGaWxlUmVsYXRlZFRvU2VsZWN0ZWREYXRlKGZpbGUpKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IG9uUmVmcmVzaFRhc2tMaXN0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5Lu75Yqh5Y+M5Ye75LqL5Lu277ya5omT5byA5paH5Lu25bm26auY5Lqu6YCJ5Lit5Lu75YqhXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGhhbmRsZVRhc2tEb3VibGVDbGljayh0YXNrOiBUYXNrKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIFRhc2sgY2xpY2tlZDonLCB0YXNrKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnW1Rhc2tEb3VibGVDbGlja10gVGFzayBmaWxlUGF0aDonLCB0YXNrLmZpbGVQYXRoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnW1Rhc2tEb3VibGVDbGlja10gVGFzayB0ZXh0OicsIHRhc2sudGV4dCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMucGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFzay5maWxlUGF0aCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIEZpbGUgZm91bmQ6JywgZmlsZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCFmaWxlIHx8ICEoJ3N0YXQnIGluIGZpbGUpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW1Rhc2tEb3VibGVDbGlja10gRmlsZSBub3QgZm91bmQgb3IgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyAxLiDmiZPlvIDmlofku7ZcclxuICAgICAgICAgICAgY29uc3QgbGVhZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihmYWxzZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IGxlYWYub3BlbkZpbGUoZmlsZSBhcyBURmlsZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVGFza0RvdWJsZUNsaWNrXSBGaWxlIG9wZW5lZCcpO1xyXG5cclxuICAgICAgICAgICAgLy8gMi4g562J5b6F5paH5Lu25a6M5YWo5omT5byA5ZKM5riy5p+TXHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDApKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIEFjdGl2ZSB2aWV3OicsIGFjdGl2ZVZpZXcpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKCFhY3RpdmVWaWV3KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tUYXNrRG91YmxlQ2xpY2tdIE5vIGFjdGl2ZSB2aWV3Jyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGVkaXRvciA9IGFjdGl2ZVZpZXcuZWRpdG9yO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZWRpdG9yLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVGFza0RvdWJsZUNsaWNrXSBDb250ZW50IGxlbmd0aDonLCBjb250ZW50Lmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICAvLyAzLiDmn6Xmib7ku7vliqHlnKjmlofku7bkuK3nmoTkvY3nva5cclxuICAgICAgICAgICAgY29uc3QgdGFza0luZGV4ID0gY29udGVudC5pbmRleE9mKHRhc2sudGV4dCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVGFza0RvdWJsZUNsaWNrXSBUYXNrIGluZGV4OicsIHRhc2tJbmRleCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAodGFza0luZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbVGFza0RvdWJsZUNsaWNrXSBUYXNrIHRleHQgbm90IGZvdW5kIGluIGZpbGUsIHRyeWluZyB0byBmaW5kIGJ5IHJhdyB0ZXh0Jyk7XHJcbiAgICAgICAgICAgICAgICAvLyDlsJ3or5Xkvb/nlKjljp/lp4vku7vliqHmlofmnKzmn6Xmib5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJhd1Rhc2tJbmRleCA9IGNvbnRlbnQuaW5kZXhPZih0YXNrLnJhd1RleHQgfHwgJycpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIFJhdyB0YXNrIGluZGV4OicsIHJhd1Rhc2tJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChyYXdUYXNrSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbVGFza0RvdWJsZUNsaWNrXSBSYXcgdGFzayB0ZXh0IG5vdCBmb3VuZCBlaXRoZXInKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIDQuIOiuoeeul+S7u+WKoeaJgOWcqOihjO+8iOS9v+eUqOWOn+Wni+aWh+acrO+8iVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGNvbnRlbnQuc3Vic3RyaW5nKDAsIHJhd1Rhc2tJbmRleCkuc3BsaXQoJ1xcbicpLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5lVGV4dCA9IGVkaXRvci5nZXRMaW5lKGxpbmUpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIExpbmU6JywgbGluZSwgJ0xpbmUgdGV4dDonLCBsaW5lVGV4dCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghbGluZVRleHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tUYXNrRG91YmxlQ2xpY2tdIExpbmUgdGV4dCBpcyBlbXB0eScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyA1LiDlj6rpgInkuK3or6XooYznmoTlvIDlpLTvvIzkuI3lsJ3or5Xnsr7noa7ljLnphY3lrozmlbTmlofmnKxcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0UG9zID0geyBsaW5lLCBjaDogMCB9O1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5kUG9zID0geyBsaW5lLCBjaDogbGluZVRleHQubGVuZ3RoIH07XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rhc2tEb3VibGVDbGlja10gU2VsZWN0aW9uOicsIHN0YXJ0UG9zLCAndG8nLCBlbmRQb3MpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIDYuIOmAieS4reaVtOihjFxyXG4gICAgICAgICAgICAgICAgZWRpdG9yLnNldFNlbGVjdGlvbihzdGFydFBvcywgZW5kUG9zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyA3LiDmu5rliqjliLDop4blj6PkuK3pl7RcclxuICAgICAgICAgICAgICAgIGVkaXRvci5zY3JvbGxJbnRvVmlldyhcclxuICAgICAgICAgICAgICAgICAgICB7IGZyb206IHN0YXJ0UG9zLCB0bzogZW5kUG9zIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHJ1ZVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVGFza0RvdWJsZUNsaWNrXSBUYXNrIGxpbmUgaGlnaGxpZ2h0ZWQgYW5kIHNjcm9sbGVkJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDQuIOiuoeeul+S7u+WKoeaJgOWcqOihjFxyXG4gICAgICAgICAgICBjb25zdCBsaW5lID0gY29udGVudC5zdWJzdHJpbmcoMCwgdGFza0luZGV4KS5zcGxpdCgnXFxuJykubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgY29uc3QgbGluZVRleHQgPSBlZGl0b3IuZ2V0TGluZShsaW5lKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tUYXNrRG91YmxlQ2xpY2tdIExpbmU6JywgbGluZSwgJ0xpbmUgdGV4dDonLCBsaW5lVGV4dCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoIWxpbmVUZXh0KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tUYXNrRG91YmxlQ2xpY2tdIExpbmUgdGV4dCBpcyBlbXB0eScpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyA1LiDlj6rpgInkuK3or6XooYznmoTlvIDlpLTvvIzkuI3lsJ3or5Xnsr7noa7ljLnphY3lrozmlbTmlofmnKxcclxuICAgICAgICAgICAgY29uc3Qgc3RhcnRQb3MgPSB7IGxpbmUsIGNoOiAwIH07XHJcbiAgICAgICAgICAgIGNvbnN0IGVuZFBvcyA9IHsgbGluZSwgY2g6IGxpbmVUZXh0Lmxlbmd0aCB9O1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rhc2tEb3VibGVDbGlja10gU2VsZWN0aW9uOicsIHN0YXJ0UG9zLCAndG8nLCBlbmRQb3MpO1xyXG5cclxuICAgICAgICAgICAgLy8gNi4g6YCJ5Lit5pW06KGMXHJcbiAgICAgICAgICAgIGVkaXRvci5zZXRTZWxlY3Rpb24oc3RhcnRQb3MsIGVuZFBvcyk7XHJcblxyXG4gICAgICAgICAgICAvLyA3LiDmu5rliqjliLDop4blj6PkuK3pl7RcclxuICAgICAgICAgICAgZWRpdG9yLnNjcm9sbEludG9WaWV3KFxyXG4gICAgICAgICAgICAgICAgeyBmcm9tOiBzdGFydFBvcywgdG86IGVuZFBvcyB9LFxyXG4gICAgICAgICAgICAgICAgdHJ1ZVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rhc2tEb3VibGVDbGlja10gVGFzayBoaWdobGlnaHRlZCBhbmQgc2Nyb2xsZWQnKTtcclxuXHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gaGlnaGxpZ2h0IGFuZCBjZW50ZXIgdGFzazonLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5pel5pyf54K55Ye75LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGhhbmRsZURheUNsaWNrKGRhdGU6IERhdGUsIG9uVXBkYXRlU2VsZWN0aW9uOiAoKSA9PiB2b2lkLCBvblVwZGF0ZVRhc2tMaXN0OiAoZGF0ZTogRGF0ZSkgPT4gUHJvbWlzZTx2b2lkPikge1xyXG4gICAgICAgIC8vIOabtOaWsOmAieS4reeKtuaAgVxyXG4gICAgICAgIG9uVXBkYXRlU2VsZWN0aW9uKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5pu05paw5Lu75Yqh5YiX6KGoXHJcbiAgICAgICAgb25VcGRhdGVUYXNrTGlzdChkYXRlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuS7u+WKoeeKtuaAgeWIh+aNouS6i+S7tlxyXG4gICAgICovXHJcbiAgICBhc3luYyBoYW5kbGVUYXNrVG9nZ2xlKHRhc2s6IFRhc2ssIGNvbXBsZXRlZDogYm9vbGVhbiwgb25SZWZyZXNoVGFza0xpc3Q6ICgpID0+IFByb21pc2U8dm9pZD4pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDmm7TmlrDnrJTorrDkuK3nmoTku7vliqHnirbmgIFcclxuICAgICAgICAgICAgYXdhaXQgdXBkYXRlVGFza0luTm90ZSh0aGlzLnBsdWdpbi5hcHAsIHRhc2ssIGNvbXBsZXRlZCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDph43mlrDmuLLmn5Pku7vliqHliJfooajvvIzmmL7npLrmnIDmlrDnirbmgIFcclxuICAgICAgICAgICAgYXdhaXQgb25SZWZyZXNoVGFza0xpc3QoKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHRhc2s6JywgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOS7juaWh+S7tui3r+W+hOS4reino+aekOaXpeacn1xyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHBhcnNlRGF0ZUZyb21GaWxlUGF0aChmaWxlUGF0aDogc3RyaW5nKTogRGF0ZSB8IG51bGwge1xyXG4gICAgICAgIGNvbnN0IGRhaWx5U2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU5vdGU7XHJcbiAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBkYWlseVNldHRpbmdzLnNhdmVQYXRoO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeaWh+S7tuaYr+WQpuWcqOaXpeiusOS/neWtmOi3r+W+hOS4rVxyXG4gICAgICAgIGlmICghZmlsZVBhdGguc3RhcnRzV2l0aChzYXZlUGF0aCkpIHJldHVybiBudWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOaPkOWPluaWh+S7tuWQje+8iOS4jeWQq+aJqeWxleWQje+8iVxyXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gZmlsZVBhdGguc3Vic3RyaW5nKHNhdmVQYXRoLmxlbmd0aCArIDEsIGZpbGVQYXRoLmxlbmd0aCAtIDMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWwneivleS9v+eUqOaXpeiusOeahOaXpeacn+agvOW8j+ino+aekOaXpeacn1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGVSZWdleCA9IC8oXFxkezR9KVtcXC1cXC9cXC5dKFxcZHsxLDJ9KVtcXC1cXC9cXC5dKFxcZHsxLDJ9KS87XHJcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZmlsZU5hbWUubWF0Y2goZGF0ZVJlZ2V4KTtcclxuICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoWzFdICYmIG1hdGNoWzJdICYmIG1hdGNoWzNdKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5ZWFyID0gcGFyc2VJbnQobWF0Y2hbMV0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbW9udGggPSBwYXJzZUludChtYXRjaFsyXSkgLSAxOyAvLyDmnIjku73ku44w5byA5aeLXHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXkgPSBwYXJzZUludChtYXRjaFszXSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoeWVhciwgbW9udGgsIGRheSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgZGF0ZSBmcm9tIGZpbGUgcGF0aDonLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5qOA5p+l5paH5Lu25piv5ZCm5LiO6YCJ5Lit5pel5pyf55u45YWzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgaXNGaWxlUmVsYXRlZFRvU2VsZWN0ZWREYXRlKGZpbGU6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIC8vIOi/memHjOmcgOimgeagueaNruWunumZheeahOmAieS4reaXpeacn+mAu+i+kei/m+ihjOWunueOsFxyXG4gICAgICAgIC8vIOaaguaXtui/lOWbnnRydWXvvIzlkI7nu63lj6/ku6XmoLnmja7lhbfkvZPpnIDmsYLkv67mlLlcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuWvvOiIquaMiemSrueCueWHu+S6i+S7tlxyXG4gICAgICovXHJcbiAgICBoYW5kbGVOYXZpZ2F0aW9uQ2xpY2soZGlyZWN0aW9uOiAncHJldicgfCAnbmV4dCcsIHVuaXQ6ICd5ZWFyJyB8ICdtb250aCcgfCAncXVhcnRlcicsIGN1cnJlbnREYXRlOiBEYXRlLCBvblVwZGF0ZURhdGU6IChuZXdEYXRlOiBEYXRlKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY29uc3QgbmV3RGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnREYXRlKTtcclxuICAgICAgICBcclxuICAgICAgICBzd2l0Y2ggKHVuaXQpIHtcclxuICAgICAgICAgICAgY2FzZSAneWVhcic6XHJcbiAgICAgICAgICAgICAgICBuZXdEYXRlLnNldEZ1bGxZZWFyKG5ld0RhdGUuZ2V0RnVsbFllYXIoKSArIChkaXJlY3Rpb24gPT09ICdwcmV2JyA/IC0xIDogMSkpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ21vbnRoJzpcclxuICAgICAgICAgICAgICAgIG5ld0RhdGUuc2V0TW9udGgobmV3RGF0ZS5nZXRNb250aCgpICsgKGRpcmVjdGlvbiA9PT0gJ3ByZXYnID8gLTEgOiAxKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAncXVhcnRlcic6XHJcbiAgICAgICAgICAgICAgICBuZXdEYXRlLnNldE1vbnRoKG5ld0RhdGUuZ2V0TW9udGgoKSArIChkaXJlY3Rpb24gPT09ICdwcmV2JyA/IC0zIDogMykpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIG9uVXBkYXRlRGF0ZShuZXdEYXRlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuinhuWbvuWIh+aNouS6i+S7tlxyXG4gICAgICovXHJcbiAgICBoYW5kbGVWaWV3VG9nZ2xlKGN1cnJlbnRWaWV3VHlwZTogJ21vbnRoJyB8ICd5ZWFyJywgb25VcGRhdGVWaWV3VHlwZTogKG5ld1ZpZXdUeXBlOiAnbW9udGgnIHwgJ3llYXInKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgY29uc3QgbmV3Vmlld1R5cGUgPSBjdXJyZW50Vmlld1R5cGUgPT09ICdtb250aCcgPyAneWVhcicgOiAnbW9udGgnO1xyXG4gICAgICAgIG9uVXBkYXRlVmlld1R5cGUobmV3Vmlld1R5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5LuK5pel5oyJ6ZKu54K55Ye75LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGhhbmRsZVRvZGF5Q2xpY2sob25VcGRhdGVEYXRlOiAobmV3RGF0ZTogRGF0ZSkgPT4gdm9pZCkge1xyXG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgICAgICBvblVwZGF0ZURhdGUodG9kYXkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5pel5pyf5Y+M5Ye75LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGhhbmRsZURheURvdWJsZUNsaWNrKGRhdGU6IERhdGUpIHtcclxuICAgICAgICAvLyDlj6rkvb/nlKggY2FwdHVyZVRvIOmFjee9ruWIm+W7uueslOiusFxyXG4gICAgICAgIGF3YWl0IHRoaXMuZXhlY3V0ZUNhcHR1cmVUb0NvbmZpZyhkYXRlLCAnZGFpbHknKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuWRqOaVsOWPjOWHu+S6i+S7tlxyXG4gICAgICovXHJcbiAgICBhc3luYyBoYW5kbGVXZWVrRG91YmxlQ2xpY2soZGF0ZTogRGF0ZSkge1xyXG4gICAgICAgIC8vIOWPquS9v+eUqCBjYXB0dXJlVG8g6YWN572u5Yib5bu656yU6K6wXHJcbiAgICAgICAgYXdhaXQgdGhpcy5leGVjdXRlQ2FwdHVyZVRvQ29uZmlnKGRhdGUsICd3ZWVrbHknKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuaciOS7veWPjOWHu+S6i+S7tlxyXG4gICAgICovXHJcbiAgICBhc3luYyBoYW5kbGVNb250aERvdWJsZUNsaWNrKGRhdGU6IERhdGUpIHtcclxuICAgICAgICAvLyDlj6rkvb/nlKggY2FwdHVyZVRvIOmFjee9ruWIm+W7uueslOiusFxyXG4gICAgICAgIGF3YWl0IHRoaXMuZXhlY3V0ZUNhcHR1cmVUb0NvbmZpZyhkYXRlLCAnbW9udGhseScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5a2j5bqm5Y+M5Ye75LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGhhbmRsZVF1YXJ0ZXJEb3VibGVDbGljayhkYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgLy8g5Y+q5L2/55SoIGNhcHR1cmVUbyDphY3nva7liJvlu7rnrJTorrBcclxuICAgICAgICBhd2FpdCB0aGlzLmV4ZWN1dGVDYXB0dXJlVG9Db25maWcoZGF0ZSwgJ3F1YXJ0ZXJseScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5bm05Lu95Y+M5Ye75LqL5Lu2XHJcbiAgICAgKi9cclxuICAgIGFzeW5jIGhhbmRsZVllYXJEb3VibGVDbGljayhkYXRlOiBEYXRlKSB7XHJcbiAgICAgICAgLy8g5Y+q5L2/55SoIGNhcHR1cmVUbyDphY3nva7liJvlu7rnrJTorrBcclxuICAgICAgICBhd2FpdCB0aGlzLmV4ZWN1dGVDYXB0dXJlVG9Db25maWcoZGF0ZSwgJ3llYXJseScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5omn6KGMIGNhcHR1cmVUbyDphY3nva5cclxuICAgICAqIEBwYXJhbSBkYXRlIOaXpeacn1xyXG4gICAgICogQHBhcmFtIHR5cGUg57G75Z6L77yaZGFpbHksIHdlZWtseSwgbW9udGhseSwgcXVhcnRlcmx5LCB5ZWFybHlcclxuICAgICAqIEByZXR1cm5zIOaYr+WQpuaIkOWKn+aJp+ihjCBjYXB0dXJlVG8g6YWN572uXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZUNhcHR1cmVUb0NvbmZpZyhkYXRlOiBEYXRlLCB0eXBlOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyDojrflj5YgY2FwdHVyZVRvIOmFjee9rlxyXG4gICAgICAgICAgICBjb25zdCBjYXB0dXJlU2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU2V0dGluZ3MuY2FwdHVyZVRvU2V0dGluZ3M7XHJcbiAgICAgICAgICAgIGlmICghY2FwdHVyZVNldHRpbmdzLmVuYWJsZWQgfHwgIWNhcHR1cmVTZXR0aW5ncy5jb25maWdzIHx8IGNhcHR1cmVTZXR0aW5ncy5jb25maWdzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyDlsJ3or5Xmib7liLDljLnphY3nsbvlnovnmoTphY3nva5cclxuICAgICAgICAgICAgbGV0IHRhcmdldENvbmZpZyA9IGNhcHR1cmVTZXR0aW5ncy5jb25maWdzLmZpbmQoY29uZmlnID0+IFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0eXBlKVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgLy8g5aaC5p6c5rKh5pyJ5om+5Yiw5Yy56YWN55qE6YWN572u77yM5L2/55So6buY6K6k6YWN572uXG4gICAgICAgICAgICBpZiAoIXRhcmdldENvbmZpZykge1xuICAgICAgICAgICAgICAgIHRhcmdldENvbmZpZyA9IGNhcHR1cmVTZXR0aW5ncy5jb25maWdzLmZpbmQoY29uZmlnID0+IFxuICAgICAgICAgICAgICAgICAgICBjb25maWcuaWQgPT09IGNhcHR1cmVTZXR0aW5ncy50YXNrQ29uZmlnSWRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8g5aaC5p6c5LuN54S25rKh5pyJ5om+5Yiw6YWN572u77yM6L+U5ZueIGZhbHNlXHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0Q29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIOaJp+ihjCBjYXB0dXJlVG8g6YWN572u77yM5bm25Lyg6YCS55uu5qCH5pel5pyfXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmV4ZWN1dGVDYXB0dXJlVG9Db25maWcoe1xyXG4gICAgICAgICAgICAgICAgLi4udGFyZ2V0Q29uZmlnLFxyXG4gICAgICAgICAgICAgICAgX3RhcmdldERhdGU6IGRhdGUgLy8g5re75Yqg55uu5qCH5pel5pyfXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZXhlY3V0ZSBjYXB0dXJlVG8gY29uZmlnIGZvciAke3R5cGV9OmAsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=