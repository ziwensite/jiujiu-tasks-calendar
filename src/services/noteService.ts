import { App } from 'obsidian';

// 检查笔记是否存在
export async function noteExists(app: App, path: string): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(path);
    return file !== null;
}