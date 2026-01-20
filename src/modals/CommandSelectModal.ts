import { App, FuzzySuggestModal } from 'obsidian';

interface Command {
    id: string;
    name: string;
}

interface CommandSelectModalOptions {
    app: App;
    onCommandSelected: (commandId: string) => void;
}

export class CommandSelectModal extends FuzzySuggestModal<Command> {
    private onCommandSelected: (commandId: string) => void;

    constructor(options: CommandSelectModalOptions) {
        super(options.app);
        this.onCommandSelected = options.onCommandSelected;
    }

    getItems(): Command[] {
        return (this.app as any).commands.listCommands();
    }

    getItemText(item: Command): string {
        return `${item.name} (${item.id})`;
    }

    onChooseItem(item: Command, evt: MouseEvent | KeyboardEvent) {
        this.onCommandSelected(item.id);
    }
}
