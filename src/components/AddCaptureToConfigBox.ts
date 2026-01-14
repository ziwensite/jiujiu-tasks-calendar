import { App, Notice } from "obsidian";

export class AddCaptureToConfigBox {
    private containerEl: HTMLElement;
    private onAddConfig: (name: string, description: string) => void;
    private app: App;

    constructor(app: App, containerEl: HTMLElement, onAddConfig: (name: string, description: string) => void) {
        this.app = app;
        this.containerEl = containerEl;
        this.onAddConfig = onAddConfig;
        this.render();
    }

    private render(): void {
        const addConfigBox = this.containerEl.createEl("div", {
            cls: "add-capture-config-box"
        });

        addConfigBox.style.display = "flex";
        addConfigBox.style.flexDirection = "row";
        addConfigBox.style.alignItems = "center";
        addConfigBox.style.gap = "10px";
        addConfigBox.style.marginTop = "10px";
        addConfigBox.style.padding = "10px";
        addConfigBox.style.border = "1px dashed var(--background-modifier-border)";
        addConfigBox.style.borderRadius = "4px";

        // 名称输入
        const nameInput = addConfigBox.createEl("input", {
            type: "text",
            placeholder: "配置名称"
        });
        nameInput.style.flex = "1";
        nameInput.style.padding = "8px";
        nameInput.style.borderRadius = "4px";
        nameInput.style.border = "1px solid var(--background-modifier-border)";

        // 描述输入
        const descriptionInput = addConfigBox.createEl("input", {
            type: "text",
            placeholder: "描述"
        });
        descriptionInput.style.flex = "1";
        descriptionInput.style.padding = "8px";
        descriptionInput.style.borderRadius = "4px";
        descriptionInput.style.border = "1px solid var(--background-modifier-border)";

        // 添加按钮
        const addButton = addConfigBox.createEl("button", {
            text: "添加配置",
            cls: "mod-cta"
        });
        addButton.style.padding = "8px 16px";
        addButton.addEventListener("click", () => this.addConfig(nameInput.value, descriptionInput.value));

        // 回车键添加
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.addConfig(nameInput.value, descriptionInput.value);
            }
        });

        descriptionInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                this.addConfig(nameInput.value, descriptionInput.value);
            }
        });
    }

    private addConfig(name: string, description: string): void {
        if (!name || name.trim() === "") {
            new Notice("配置名称不能为空");
            return;
        }

        this.onAddConfig(name.trim(), description.trim());
    }
}
