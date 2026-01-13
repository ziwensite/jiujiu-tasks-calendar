import {App, TFolder} from "obsidian";

/**
 * 路径自动完成组件
 * 用于在设置页面中提供文件路径的自动补全功能
 */
export class PathAutocomplete {
    private container: HTMLElement;
    private inputEl: HTMLInputElement;
    private dropdownEl: HTMLElement;
    private app: App;
    private onPathChange: (path: string) => void;
    private currentPaths: string[] = [];
    
    constructor(app: App, container: HTMLElement, initialValue: string, onPathChange: (path: string) => void) {
        this.app = app;
        this.container = container;
        this.onPathChange = onPathChange;
        
        // 创建输入框
        this.inputEl = container.createEl("input", {
            type: "text",
            value: initialValue,
            placeholder: "输入路径"
        });
        this.inputEl.className = "setting-item-input";
        
        // 创建下拉列表容器
        this.dropdownEl = container.createEl("div", {
            cls: "path-autocomplete-dropdown"
        });
        this.dropdownEl.style.display = "none";
        this.dropdownEl.style.textAlign = "left";
        this.dropdownEl.style.padding = "8px 0";
        
        // 监听输入事件
        this.inputEl.addEventListener("input", this.handleInput.bind(this));
        
        // 监听焦点事件
        this.inputEl.addEventListener("focus", this.handleFocus.bind(this));
        
        // 监听点击事件，防止冒泡
        this.inputEl.addEventListener("click", (e) => e.stopPropagation());
        
        // 监听键盘事件
        this.inputEl.addEventListener("keydown", this.handleKeyDown.bind(this));
        
        // 监听外部点击，关闭下拉列表
        document.addEventListener("click", this.handleOutsideClick.bind(this));
        
        // 初始化路径列表
        this.updatePaths();
    }
    
    // 更新路径列表
    private updatePaths() {
        const allFiles = this.app.vault.getAllLoadedFiles();
        
        // 获取所有文件和文件夹路径
        this.currentPaths = allFiles.map(file => file.path);
        
        // 添加根路径
        this.currentPaths.unshift("");
    }
    
    // 处理输入事件
    private handleInput() {
        const inputValue = this.inputEl.value;
        this.onPathChange(inputValue);
        this.filterPaths(inputValue);
    }
    
    // 处理焦点事件
    private handleFocus() {
        this.filterPaths(this.inputEl.value);
    }
    
    // 处理外部点击
    private handleOutsideClick(e: MouseEvent) {
        if (!this.container.contains(e.target as Node)) {
            this.dropdownEl.style.display = "none";
        }
    }
    
    // 处理键盘事件
    private handleKeyDown(e: KeyboardEvent) {
        const items = this.dropdownEl.querySelectorAll(".path-item");
        const activeItem = this.dropdownEl.querySelector(".path-item.active") as HTMLElement;
        let activeIndex = Array.from(items).indexOf(activeItem);
        
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (activeIndex < items.length - 1) {
                    activeItem?.classList.remove("active");
                    (items[activeIndex + 1] as HTMLElement).classList.add("active");
                } else if (items.length > 0) {
                    activeItem?.classList.remove("active");
                    (items[0] as HTMLElement).classList.add("active");
                }
                break;
            case "ArrowUp":
                e.preventDefault();
                if (activeIndex > 0) {
                    activeItem?.classList.remove("active");
                    (items[activeIndex - 1] as HTMLElement).classList.add("active");
                } else if (items.length > 0) {
                    activeItem?.classList.remove("active");
                    (items[items.length - 1] as HTMLElement).classList.add("active");
                }
                break;
            case "Enter":
                e.preventDefault();
                if (activeItem) {
                    this.selectPath(activeItem.dataset.path || "");
                }
                break;
            case "Escape":
                this.dropdownEl.style.display = "none";
                break;
        }
    }
    
    // 过滤路径
    private filterPaths(inputValue: string) {
        this.dropdownEl.empty();
        
        if (!inputValue) {
            this.dropdownEl.style.display = "none";
            return;
        }
        
        // 过滤匹配的路径
        const matchedPaths = this.currentPaths.filter(path => 
            path.toLowerCase().includes(inputValue.toLowerCase())
        ).slice(0, 10); // 限制显示10个结果
        
        if (matchedPaths.length === 0) {
            this.dropdownEl.style.display = "none";
            return;
        }
        
        // 创建下拉列表项
            matchedPaths.forEach(path => {
                const itemEl = this.dropdownEl.createEl("div", {
                    cls: "path-item"
                });
                itemEl.dataset.path = path;
                itemEl.style.display = "flex";
                itemEl.style.alignItems = "center";
                itemEl.style.padding = "4px 12px";
                itemEl.style.cursor = "pointer";
                itemEl.style.textAlign = "left";
                
                // 判断是否为文件夹
                const file = this.app.vault.getAbstractFileByPath(path);
                const isFolder = file instanceof TFolder;
                
                // 添加文件/文件夹图标
                const iconSpan = itemEl.createEl("span", {
                    cls: `path-item-icon ${isFolder ? "folder" : "file"}`
                });
                iconSpan.textContent = isFolder ? "📁" : "📄";
                iconSpan.style.marginRight = "8px";
                iconSpan.style.width = "16px";
                iconSpan.style.textAlign = "center";
                
                // 添加路径文本
                const textSpan = itemEl.createEl("span", {
                    text: path || "(根目录)"
                });
                textSpan.style.flex = "1";
                textSpan.style.textAlign = "left";
            
            // 高亮匹配的部分
            const matchIndex = path.toLowerCase().indexOf(inputValue.toLowerCase());
            if (matchIndex !== -1 && path) {
                // 清空现有内容，重新构建
                itemEl.empty();
                
                // 重新添加图标
                const newIconSpan = itemEl.createEl("span", {
                    cls: `path-item-icon ${isFolder ? "folder" : "file"}`
                });
                newIconSpan.textContent = isFolder ? "📁" : "📄";
                newIconSpan.style.marginRight = "8px";
                newIconSpan.style.width = "16px";
                newIconSpan.style.textAlign = "center";
                
                // 添加高亮文本
                const textContainer = itemEl.createEl("span");
                textContainer.style.flex = "1";
                textContainer.style.textAlign = "left";
                
                textContainer.createEl("span", { text: path.slice(0, matchIndex) });
                textContainer.createEl("strong", { 
                    text: path.slice(matchIndex, matchIndex + inputValue.length)
                });
                textContainer.createEl("span", { text: path.slice(matchIndex + inputValue.length) });
            } else if (matchIndex === -1 && !path) {
                // 处理根目录的情况
                itemEl.empty();
                
                // 重新添加图标
                const newIconSpan = itemEl.createEl("span", {
                    cls: `path-item-icon folder`
                });
                newIconSpan.textContent = "📁";
                newIconSpan.style.marginRight = "8px";
                newIconSpan.style.width = "16px";
                newIconSpan.style.textAlign = "center";
                
                // 添加根目录文本
                const textContainer = itemEl.createEl("span");
                textContainer.style.flex = "1";
                textContainer.style.textAlign = "left";
                textContainer.textContent = "(根目录)";
            }
            
            // 监听鼠标点击
            itemEl.addEventListener("mousedown", () => {
                this.selectPath(path);
            });
            
            // 监听鼠标悬停
            itemEl.addEventListener("mouseenter", () => {
                this.dropdownEl.querySelectorAll(".path-item").forEach(el => 
                    el.classList.remove("active")
                );
                itemEl.classList.add("active");
            });
        });
        
        // 显示第一个结果为激活状态
        if (matchedPaths.length > 0) {
            (this.dropdownEl.firstChild as HTMLElement).classList.add("active");
        }
        
        this.dropdownEl.style.display = "block";
    }
    
    // 选择路径
    private selectPath(path: string) {
        this.inputEl.value = path;
        this.onPathChange(path);
        this.dropdownEl.style.display = "none";
    }
    
    // 获取当前值
    getValue(): string {
        return this.inputEl.value;
    }
    
    // 设置值
    setValue(value: string) {
        this.inputEl.value = value;
    }
    
    // 销毁组件
    destroy() {
        document.removeEventListener("click", this.handleOutsideClick.bind(this));
    }
}
