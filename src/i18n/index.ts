export type Dict = Record<string, string>;

let enDict: Dict = {};

export function loadEn(dict: Dict) {
    enDict = dict;
}

export function t(text: string): string {
    if (window.moment.locale().startsWith('zh')) return text;
    return enDict[text] ?? text;
}
