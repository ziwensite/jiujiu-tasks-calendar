import { App, Modal, TFile, FuzzySuggestModal } from 'obsidian';

export class FileSelectModal extends FuzzySuggestModal<TFile> {
    onFileSelected: (file: TFile) => void;

    constructor(app: App, onFileSelected: (file: TFile) => void) {
        super(app);
        this.onFileSelected = onFileSelected;
    }

    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent) {
        this.onFileSelected(item);
    }
}
