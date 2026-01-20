import { App, FuzzySuggestModal, TFolder } from 'obsidian';

export class FolderSelectModal extends FuzzySuggestModal<TFolder> {
    onFolderSelected: (folder: TFolder) => void;

    constructor(app: App, onFolderSelected: (folder: TFolder) => void) {
        super(app);
        this.onFolderSelected = onFolderSelected;
    }

    getItems(): TFolder[] {
        return this.app.vault.getAllLoadedFiles().filter(file => file instanceof TFolder) as TFolder[];
    }

    getItemText(item: TFolder): string {
        return item.path;
    }

    onChooseItem(item: TFolder, evt: MouseEvent | KeyboardEvent) {
        this.onFolderSelected(item);
    }
}