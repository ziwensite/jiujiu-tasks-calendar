export interface IChoiceExecutor {
	variables?: Map<string, unknown>;
	signalAbort?: (error: Error) => void;
}
