export interface Task {
    text: string;
    completed: boolean;
    status?: string;
    priority?: string;
    recurrenceRule?: string;
    filePath: string;
    dueDate?: Date;
    createdAt?: Date;
    startDate?: Date;
    plannedDate?: Date;
    cancelledDate?: Date;
    completedDate?: Date;
    rawText: string;
    fullDay?: boolean;
    timeRange?: {
        startTime: string;
        endTime: string;
    };
    location?: string;
    line?: number;
    lineCount?: number;
    position?: {
        start: {
            line: number;
            col: number;
        };
        end: {
            line: number;
            col: number;
        };
    };
}