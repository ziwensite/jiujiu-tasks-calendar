import { App } from 'obsidian';

// 标签信息接口
export interface TagInfo {
    name: string; // 标签名称（包含#前缀）
    count: number; // 使用次数
}

export class TagManager {
    private app: App;
    private tags: TagInfo[];

    constructor(app: App) {
        this.app = app;
        this.tags = [];
        this.updateTags();
    }

    /**
     * 更新标签列表，从Obsidian的元数据缓存中获取所有标签
     */
    public updateTags(): void {
        // 使用app.metadataCache.getTags()获取所有标签及其使用次数
        // @ts-expect-error - getTags() is available but not in the type definitions
        const tagsWithCount = this.app.metadataCache.getTags();
        
        const tagInfoList: TagInfo[] = [];
        
        Object.entries(tagsWithCount).forEach(([tag, count]) => {
            // 确保标签以#开头
            const tagName = tag.startsWith('#') ? tag : `#${tag}`;
            tagInfoList.push({
                name: tagName,
                count: typeof count === 'number' ? count : 0
            });
        });

        // 从所有文件中获取frontmatter标签
        const files = this.app.vault.getMarkdownFiles();
        const frontmatterTagMap = new Map<string, number>();
        
        files.forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache && cache.frontmatter && cache.frontmatter.tags) {
                const frontmatterTags = cache.frontmatter.tags;
                if (Array.isArray(frontmatterTags)) {
                    frontmatterTags.forEach(tag => {
                        if (typeof tag === 'string') {
                            const tagName = tag.startsWith('#') ? tag : `#${tag}`;
                            frontmatterTagMap.set(tagName, (frontmatterTagMap.get(tagName) || 0) + 1);
                        }
                    });
                } else if (typeof frontmatterTags === 'string') {
                    const tagName = frontmatterTags.startsWith('#') ? frontmatterTags : `#${frontmatterTags}`;
                    frontmatterTagMap.set(tagName, (frontmatterTagMap.get(tagName) || 0) + 1);
                }
            }
        });
        
        // 合并frontmatter标签到主标签列表
        frontmatterTagMap.forEach((count, tagName) => {
            const existingTag = tagInfoList.find(tag => tag.name === tagName);
            if (existingTag) {
                existingTag.count += count;
            } else {
                tagInfoList.push({
                    name: tagName,
                    count: count
                });
            }
        });

        this.tags = tagInfoList.sort((a, b) => {
            // 按名称排序
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * 根据前缀获取标签建议
     * @param prefix 标签前缀
     * @returns 匹配的标签列表
     */
    public getTagsByPrefix(prefix: string): TagInfo[] {
        if (!prefix) return [];

        const lowerPrefix = prefix.toLowerCase();
        let filteredTags: TagInfo[];

        if (lowerPrefix === '#') {
            filteredTags = this.tags;
        } else if (lowerPrefix.startsWith('#')) {
            const tagPart = lowerPrefix.substring(1);
            filteredTags = this.tags.filter(tag => {
                const lowerTag = tag.name.toLowerCase();
                return lowerTag.startsWith(lowerPrefix) || lowerTag.includes(tagPart);
            });
        } else {
            filteredTags = this.tags.filter(tag => tag.name.toLowerCase().includes(lowerPrefix));
        }

        return filteredTags
            .sort((a, b) => {
                // 先按匹配程度排序（完全匹配在前）
                const aExactMatch = a.name.toLowerCase().startsWith(lowerPrefix) ? 0 : 1;
                const bExactMatch = b.name.toLowerCase().startsWith(lowerPrefix) ? 0 : 1;
                if (aExactMatch !== bExactMatch) return aExactMatch - bExactMatch;
                
                // 再按标签层级深度排序（层级浅的在前）
                const aDepth = a.name.split('/').length;
                const bDepth = b.name.split('/').length;
                if (aDepth !== bDepth) return aDepth - bDepth;
                
                // 最后按使用次数排序（使用次数多的在前）
                return b.count - a.count;
            })
            .slice(0, 10); // 限制为10个建议
    }

    /**
     * 获取所有标签
     * @returns 所有标签列表
     */
    public getAllTags(): TagInfo[] {
        return [...this.tags];
    }

    /**
     * 获取标签使用次数
     * @param tagName 标签名称
     * @returns 使用次数
     */
    public getTagCount(tagName: string): number {
        const tag = this.tags.find(tag => tag.name === tagName);
        return tag ? tag.count : 0;
    }
}