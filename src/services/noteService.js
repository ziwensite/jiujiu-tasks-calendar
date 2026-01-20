import { __awaiter } from "tslib";
// 检查笔记是否存在
export function noteExists(app, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = app.vault.getAbstractFileByPath(path);
        return file !== null;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsV0FBVztBQUNYLE1BQU0sVUFBZ0IsVUFBVSxDQUFDLEdBQVEsRUFBRSxJQUFZOztRQUNuRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSxLQUFLLElBQUksQ0FBQztJQUN6QixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIOajgOafpeeslOiusOaYr+WQpuWtmOWcqFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5vdGVFeGlzdHMoYXBwOiBBcHAsIHBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHBhdGgpO1xuICAgIHJldHVybiBmaWxlICE9PSBudWxsO1xufSJdfQ==