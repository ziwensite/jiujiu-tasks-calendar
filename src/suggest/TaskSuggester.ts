import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import { getDateSuggestions, getRecurrenceMenuItems, getEmojiMenuItems, isPriorityEmoji, extractMarkers, removeMarkersFromText, buildSortedMarkers } from './taskProperties';
import type { SuggesterItem } from './taskProperties';
import { parseRelativeDate } from './dateCalculator';

const TRIGGER_PATTERNS: { regex: RegExp; type: string }[] = [
    { regex: /📅\s{0,1}$/, type: 'date' },
    { regex: /🛫\s{0,1}$/, type: 'date' },
    { regex: /⏳\s{0,1}$/, type: 'date' },
    { regex: /➕\s{0,1}$/, type: 'date' },
    { regex: /🔁\s{0,1}$/, type: 'recurrence' },
    { regex: /due|截止/i, type: 'date' },
    { regex: /start|开始/i, type: 'date' },
    { regex: /recur|重复/i, type: 'recurrence' },
    { regex: /#\S*$/, type: 'tag' },
];

export class TaskSuggester extends EditorSuggest<SuggesterItem> {
    private triggerType: string = '';
    private triggerStart: EditorPosition = { line: 0, ch: 0 };

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const linePrefix = line.substring(0, cursor.ch);

        const taskMatch = line.match(/^\s*-\s*\[(.)\]\s*/);
        if (!taskMatch) return null;

        const afterPrefix = linePrefix.substring(taskMatch[0].length);

        for (const pattern of TRIGGER_PATTERNS) {
            const match = afterPrefix.match(pattern.regex);
            if (match) {
                this.triggerType = pattern.type;
                if (pattern.type === 'tag') {
                    this.triggerStart = { line: cursor.line, ch: cursor.ch - match[0].length };
                    return { start: this.triggerStart, end: cursor, query: match[0] };
                }
                this.triggerStart = cursor;
                return { start: cursor, end: cursor, query: match[0] };
            }
        }

        if (afterPrefix.trim() === '' || afterPrefix.match(/\s$/)) {
            this.triggerType = 'emoji';
            this.triggerStart = cursor;
            return { start: cursor, end: cursor, query: '' };
        }

        return null;
    }

    async getSuggestions(context: EditorSuggestContext): Promise<SuggesterItem[]> {
        const query = context.query;

        switch (this.triggerType) {
            case 'date': {
                const suggestions = getDateSuggestions();
                if (query.length > 2) {
                    const parsed = parseRelativeDate(query);
                    if (parsed && !suggestions.some(s => s.value === parsed)) {
                        suggestions.unshift({ label: query, value: parsed });
                    }
                    return suggestions.filter(s => s.label.includes(query) || s.value.includes(query));
                }
                return suggestions;
            }
            case 'recurrence':
                return getRecurrenceMenuItems(query);
            case 'tag':
                return this.getTagSuggestions(query);
            case 'emoji': {
                const line = context.editor.getLine(context.start.line);
                const taskMatch = line.match(/^\s*-\s*\[(.)\]\s*/);
                const afterPrefix = taskMatch ? line.substring(taskMatch[0].length) : '';
                const used = extractMarkers(afterPrefix);
                return getEmojiMenuItems(query).filter(item => !used.has(item.value));
            }
            default:
                return [];
        }
    }

    renderSuggestion(value: SuggesterItem, el: HTMLElement): void {
        el.createDiv({ text: value.label, cls: 'suggestion-title' });
    }

    selectSuggestion(value: SuggesterItem, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const editor = this.context.editor;
        const line = editor.getLine(this.triggerStart.line);
        const endPos = { line: this.triggerStart.line, ch: line.length };

        if (this.triggerType === 'emoji') {
            const taskMatch = line.match(/^\s*-\s*\[(.)\]\s*/);
            const prefixLen = taskMatch ? taskMatch[0].length : 0;
            const afterPrefix = line.substring(prefixLen);

            const existing = extractMarkers(afterPrefix);
            const content = removeMarkersFromText(afterPrefix);
            existing.set(value.value, '');

            const sorted = buildSortedMarkers(existing);
            const gap = content && sorted ? ' ' : '';
            const newAfterPrefix = content + gap + sorted;
            const newCursorCh = prefixLen + content.length + gap.length + sorted.indexOf(value.value) + value.value.length;

            editor.replaceRange(newAfterPrefix, { line: endPos.line, ch: prefixLen }, endPos);

            if (isPriorityEmoji(value.value)) {
                editor.setCursor({ line: endPos.line, ch: newCursorCh });
                this.close();
                return;
            }

            editor.setCursor({ line: endPos.line, ch: newCursorCh });
            return;
        }

        if (this.triggerType === 'tag') {
            editor.replaceRange(value.value, this.context.start, this.context.end);
            editor.setCursor({ line: this.triggerStart.line, ch: this.context.start.ch + value.value.length });
            this.close();
            return;
        }

        const prefix = editor.getLine(this.triggerStart.line).substring(0, this.triggerStart.ch);
        const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix);
        const insertValue = needsLeadingSpace ? ` ${value.value}` : value.value;
        editor.replaceRange(insertValue, this.triggerStart);
        editor.setCursor({ line: this.triggerStart.line, ch: this.triggerStart.ch + insertValue.length });
        this.close();
    }

    private getTagSuggestions(prefix: string): SuggesterItem[] {
        try {
            // @ts-expect-error - getTags() is available but not in type definitions
            const tagsWithCount: Record<string, number> = this.app.metadataCache.getTags();
            const cleanPrefix = prefix.startsWith('#') ? prefix : `#${prefix}`;
            const lowerPrefix = cleanPrefix.toLowerCase();

            const tags: SuggesterItem[] = [];
            for (const [tag, count] of Object.entries(tagsWithCount)) {
                const tagName = tag.startsWith('#') ? tag : `#${tag}`;
                if (tagName.toLowerCase().includes(lowerPrefix)) {
                    tags.push({
                        label: `${tagName} (${count})`,
                        value: tagName
                    });
                }
            }

            tags.sort((a, b) => a.label.localeCompare(b.label));
            return tags.slice(0, 10);
        } catch {
            return [];
        }
    }
}