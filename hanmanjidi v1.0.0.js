/** @type {import('./_venera_.js')} */

class HanmanJidi extends ComicSource {
    name = "韩漫基地"
    key = "hanmanjidi"
    version = "1.0.0"
    minAppVersion = "1.6.0"
    url = ""

    static defaultUa = 
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"

    static defaultDomains = [
        "https://hmjd8.com",
        "https://hmjd9.com"
    ]

    // 分类标签列表（供多处使用）
    static categoryList = [
        "正妹", "恋爱", "出版漫画", "肉慾", "浪漫", "大尺度",
        "巨乳", "有夫之婦", "女大生", "狗血劇", "同居", "好友",
        "調教", "动作", "後宮", "不倫", "3D", "校園", "耽美", "日漫"
    ]

    settings = {
        useMobileUA: {
            title: "使用移动端UA (绕过限制)",
            type: "switch",
            default: true,
        },
        domain: {
            title: "线路域名",
            type: "select",
            options: [
                { value: "https://hmjd8.com", text: "hmjd8.com" },
                { value: "https://hmjd9.com", text: "hmjd9.com" },
            ],
            default: "https://hmjd8.com",
        },
        domainCheck: {
            title: "检测当前域名",
            type: "callback",
            buttonText: "检测",
            callback: () => {
                const currentDomain = this.loadSetting("domain");
                const startTime = Date.now();
                let isCompleted = false;
                
                const loadingId = UI.showLoading(() => {
                    UI.showMessage("检测已取消");
                    isCompleted = true;
                });
                
                setTimeout(() => {
                    if (!isCompleted) {
                        UI.cancelLoading(loadingId);
                        UI.showMessage("❌ 连接超时，可能需要代理");
                        isCompleted = true;
                    }
                }, 10000);
                
                Network.get(currentDomain).then(res => {
                    if (isCompleted) return;
                    const delay = Date.now() - startTime;
                    UI.cancelLoading(loadingId);
                    UI.showMessage(`✅ 连接正常，延迟: ${delay}ms`);
                    isCompleted = true;
                }).catch(() => {
                    if (isCompleted) return;
                    UI.cancelLoading(loadingId);
                    UI.showMessage("❌ 连接失败，可能需要代理");
                    isCompleted = true;
                });
            }
        },
    }

    get domain() {
        return this.loadSetting("domain") || HanmanJidi.defaultDomains[0]
    }

    get ua() {
        if (this.loadSetting("useMobileUA") !== false) {
            return "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        }
        return HanmanJidi.defaultUa
    }

    get headers() {
        return {
            "User-Agent": this.ua,
            "Referer": this.domain + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Connection": "keep-alive",
            "Cookie": "PHPSESSID=1; __cf_bm=1",
        }
    }

    get imgHeaders() {
        return {
            "User-Agent": this.ua,
            "Referer": this.domain + "/",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }
    }

    buildUrl(path) {
        if (!path) return this.domain
        if (path.indexOf("http") === 0) return path
        return this.domain + (path.indexOf("/") === 0 ? path : "/" + path)
    }

    attr(el, name) {
        if (!el) return ""
        return (el.attributes && el.attributes[name]) || ""
    }

    async fetchDocument(url) {
        const fullUrl = this.buildUrl(url);
        const res = await Network.get(fullUrl, this.headers);
        if (res.status !== 200) {
            throw `请求失败: HTTP ${res.status}`;
        }
        return new HtmlDocument(res.body);
    }

    parseComicsFromDoc(doc) {
        let items = doc.querySelectorAll("li.hl-list-item, .hl-list-item, .hl-item, .comic-item, .book-item, .mh-item, .vodlist-item, li[class*='item']");
        
        if (items.length === 0) {
            items = doc.querySelectorAll("a[href*='/manhua-']").map(el => el.parentElement).filter(el => el);
        }

        let comics = [];
        let seen = {};

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            let link = item.querySelector("a[href*='/manhua-']") || item.querySelector("a");
            if (!link) continue;
            
            let href = this.attr(link, "href") || "";
            let id = "";
            let m = href.match(/\/manhua-(\d+)\.html/);
            if (m) id = m[1];
            if (!id) {
                let parts = href.split("/").filter(Boolean);
                let last = parts[parts.length - 1] || "";
                let num = last.match(/^(\d+)/);
                if (num) id = num[1];
            }
            if (!id) continue;
            if (seen[id]) continue;
            seen[id] = true;

            let cover = "";
            let img = item.querySelector("img");
            if (img) {
                cover = this.attr(img, "data-original") || this.attr(img, "data-src") || this.attr(img, "src") || "";
            }
            if (!cover) {
                let thumb = item.querySelector("[data-original]");
                if (thumb) cover = this.attr(thumb, "data-original");
            }
            if (cover && cover.indexOf("http") !== 0) {
                cover = this.buildUrl(cover);
            }

            let titleEl = item.querySelector(".hl-item-title a, .title a, .comic-title, .book-title, .name");
            let title = titleEl ? String(titleEl.text || "").trim() : link.text.trim();

            comics.push({ id, title, cover, subTitle: "" });
        }

        return comics;
    }

    // ==================== 首页探索 ====================
    explore = [
        {
            title: "韩漫基地",
            type: "multiPartPage",
            load: async () => {
                let results = [];

                // 推荐漫画
                try {
                    const doc = await this.fetchDocument("/update/recommend");
                    const comics = this.parseComicsFromDoc(doc);
                    doc.dispose();
                    results.push({
                        title: "推荐漫画",
                        comics: comics.slice(0, 20),
                        viewMore: { page: "category", attributes: { category: "推荐漫画" } }
                    });
                } catch (e) {}

                // 全部漫画
                try {
                    const doc = await this.fetchDocument("/manhua/all/ob/time/st/all");
                    const comics = this.parseComicsFromDoc(doc);
                    doc.dispose();
                    results.push({
                        title: "全部漫画",
                        comics: comics.slice(0, 20),
                        viewMore: { page: "category", attributes: { category: "全部漫画" } }
                    });
                } catch (e) {}

                return results.length > 0 ? results : [{ title: "暂无数据", comics: [] }];
            }
        }
    ]

    // ==================== 分类功能 ====================
    category = {
        title: "韩漫基地",
        parts: [
            {
                name: "更新",
                type: "fixed",
                categories: ["最近更新", "新作发布", "推荐漫画"],
                itemType: "category"
            },
            {
                name: "排行",
                type: "fixed",
                categories: ["日榜", "周榜", "月榜", "总榜"],
                itemType: "category"
            },
            {
                name: "进度",
                type: "fixed",
                categories: ["全部漫画", "连载中", "已完结"],
                itemType: "category"
            },
            {
                name: "分类",
                type: "fixed",
                categories: [
                    "正妹", "恋爱", "出版漫画", "肉慾", "浪漫", "大尺度",
                    "巨乳", "有夫之婦", "女大生", "狗血劇", "同居", "好友",
                    "調教", "动作", "後宮", "不倫", "3D", "校園", "耽美", "日漫"
                ],
                itemType: "category"
            }
        ],
        enableRankingPage: false,
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            
            // ========== 更新标签 ==========
            if (category === "最近更新") {
                const url = `/update${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "新作发布") {
                const url = `/update/newbook${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "推荐漫画") {
                const url = `/update/recommend${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            // ========== 排行标签 ==========
            if (category === "日榜") {
                const url = `/ranking/daily${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "周榜") {
                const url = `/ranking/weekly${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "月榜") {
                const url = `/ranking/monthly${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "总榜") {
                const url = `/ranking/all${page > 1 ? `?page=${page}` : ""}`;
                const doc = await this.fetchDocument(url);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='?page=']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            // ========== 进度标签 ==========
            if (category === "全部漫画") {
                const path = `/manhua/all/ob/time/st/all${page > 1 ? `/page/${page}` : ""}`;
                const doc = await this.fetchDocument(path);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='/page/']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "连载中") {
                const path = `/manhua/all/ob/time/st/serialized${page > 1 ? `/page/${page}` : ""}`;
                const doc = await this.fetchDocument(path);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='/page/']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            if (category === "已完结") {
                const path = `/manhua/all/ob/time/st/completed${page > 1 ? `/page/${page}` : ""}`;
                const doc = await this.fetchDocument(path);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='/page/']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            // ========== 分类标签 ==========
            if (HanmanJidi.categoryList.includes(category)) {
                const path = `/manhua/${encodeURIComponent(category)}/ob/time/st/all${page > 1 ? `/page/${page}` : ""}`;
                const doc = await this.fetchDocument(path);
                const comics = this.parseComicsFromDoc(doc);
                
                let next = false;
                let pageLinks = doc.querySelectorAll("a[href*='/page/']");
                for (let i = 0; i < pageLinks.length; i++) {
                    let t = (pageLinks[i].text || "").trim();
                    if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                        next = true;
                        break;
                    }
                }
                
                doc.dispose();
                return { comics, maxPage: next ? page + 1 : page };
            }

            // ========== 兜底逻辑 ==========
            const path = `/manhua/all/ob/time/st/all${page > 1 ? `/page/${page}` : ""}`;
            const doc = await this.fetchDocument(path);
            const comics = this.parseComicsFromDoc(doc);
            
            let next = false;
            let pageLinks = doc.querySelectorAll("a[href*='/page/']");
            for (let i = 0; i < pageLinks.length; i++) {
                let t = (pageLinks[i].text || "").trim();
                if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                    next = true;
                    break;
                }
            }
            
            doc.dispose();

            return {
                comics: comics,
                maxPage: next ? page + 1 : page
            };
        },

        optionLoader: async (category, param) => {
            const allCategories = [
                "最近更新", "新作发布", "推荐漫画", 
                "全部漫画", "全部", "连载中", "已完结", 
                "日榜", "周榜", "月榜", "总榜",
                "正妹", "恋爱", "出版漫画", "肉慾", "浪漫", "大尺度",
                "巨乳", "有夫之婦", "女大生", "狗血劇", "同居", "好友",
                "調教", "动作", "後宮", "不倫", "3D", "校園", "耽美", "日漫"
            ];
            if (allCategories.includes(category)) {
                return [];
            }
            return null;
        },

        ranking: {
            options: ["hot-热门榜"],
            load: async (option, page) => {
                const doc = await this.fetchDocument("/ranking");
                const comics = this.parseComicsFromDoc(doc);
                doc.dispose();
                return { comics, maxPage: 1 };
            }
        }
    }

    // ==================== 搜索功能 ====================
    search = {
        load: async (keyword, options, page) => {
            try {
                let url = `/catalog.php?key=${encodeURIComponent(keyword)}&submit=`;
                if (page > 1) url += `&page=${page}`;

                const fullUrl = this.buildUrl(url);
                const res = await Network.get(fullUrl, this.headers);
                if (res.status !== 200) {
                    throw `搜索请求失败: HTTP ${res.status}`;
                }

                let doc = new HtmlDocument(res.body);
                if (!doc) {
                    return { comics: [], maxPage: 1 };
                }

                const comics = this.parseComicsFromDoc(doc);

                let next = false;
                try {
                    const pageLinks = doc.querySelectorAll("a[href*='&page='], a[href*='?page=']");
                    if (pageLinks && pageLinks.length > 0) {
                        for (let i = 0; i < pageLinks.length; i++) {
                            const el = pageLinks[i];
                            if (!el) continue;
                            const text = String(el.text || "").trim();
                            if (text === "下一页" || text === "»" || text.includes("下一") || text.includes("下頁")) {
                                next = true;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    next = false;
                }

                if (doc && typeof doc.dispose === 'function') {
                    doc.dispose();
                }

                return {
                    comics: comics,
                    maxPage: next ? page + 1 : page
                };
            } catch (error) {
                return { comics: [], maxPage: 1 };
            }
        },
        optionList: []
    }

    // ==================== 漫画详情与阅读 ====================
    comic = {
        loadInfo: async (id) => {
            let url = `/manhua-${id}.html`;
            let res = await Network.get(this.buildUrl(url), this.headers);
            
            if (res.status !== 200) {
                throw `详情页加载失败，ID: ${id}`;
            }

            let doc = new HtmlDocument(res.body);

            // ---- 提取标题 ----
            let titleEl = doc.querySelector("h1.hl-dc-title") || doc.querySelector("h1") || doc.querySelector(".hl-dc-title");
            let title = titleEl ? String(titleEl.text || "").trim() : ("漫画 " + id);

            // ---- 提取封面 ----
            let coverEl = doc.querySelector(".hl-dc-pic span.hl-item-thumb");
            let cover = "";
            if (coverEl) {
                cover = this.attr(coverEl, "data-original") || "";
            }
            if (!cover) {
                let coverEl2 = doc.querySelector(".hl-dc-pic img, .hl-item-thumb, img[data-original]");
                if (coverEl2) {
                    cover = this.attr(coverEl2, "data-original") || this.attr(coverEl2, "src") || "";
                }
            }
            if (cover && cover.indexOf("http") !== 0) {
                cover = this.buildUrl(cover);
            }

            // ---- 提取作者（支持多个作者，用 & 分割） ----
            let authors = [];
            let authorEls = doc.querySelectorAll(".hl-vod-data .hl-data-sm li a[href*='/search/']");
            for (let el of authorEls) {
                let text = String(el.text || "").trim();
                if (text) {
                    // 用 & 分割多个作者
                    let parts = text.split(/[&＆]/);
                    for (let p of parts) {
                        let name = p.trim();
                        if (name && authors.indexOf(name) < 0) {
                            authors.push(name);
                        }
                    }
                }
            }
            // 兜底：如果没找到作者
            if (authors.length === 0) {
                let authorEl2 = doc.querySelector(".hl-data-xs a[href*='/search/']");
                if (authorEl2) {
                    let text = String(authorEl2.text || "").trim();
                    if (text) {
                        let parts = text.split(/[&＆]/);
                        for (let p of parts) {
                            let name = p.trim();
                            if (name && authors.indexOf(name) < 0) {
                                authors.push(name);
                            }
                        }
                    }
                }
            }

            // ---- 提取标签 ----
            let tags = [];
            let tagEls = doc.querySelectorAll(".hl-vod-data .hl-data-sm li a[href*='/manhua/']");
            for (let el of tagEls) {
                let tag = String(el.text || "").trim();
                if (tag && tag !== "作者" && tag !== "TAG" && tag !== "标签" && tag !== "進度" && tag !== "进度") {
                    tags.push(tag);
                }
            }

            // ---- 提取状态 ----
            let status = "";
            let statusItems = doc.querySelectorAll(".hl-vod-data .hl-data-sm li");
            for (let item of statusItems) {
                let text = String(item.text || "").trim();
                if (text.includes("進度：") || text.includes("进度：")) {
                    let match = text.match(/进[度度]：([^，,\s]+)/);
                    if (match) {
                        let rawStatus = match[1].trim();
                        if (rawStatus.includes("已完结")) {
                            status = "已完结";
                        } else if (rawStatus.includes("连载中") || rawStatus.includes("連載中")) {
                            status = "连载中";
                        }
                        break;
                    }
                    let parts = text.split(/[：:]/);
                    if (parts.length > 1) {
                        let rawStatus = parts[1].trim();
                        if (rawStatus.includes("已完结")) {
                            status = "已完结";
                        } else if (rawStatus.includes("连载中") || rawStatus.includes("連載中")) {
                            status = "连载中";
                        }
                        break;
                    }
                }
            }
            if (!status) {
                let xsItems = doc.querySelectorAll(".hl-data-xs");
                for (let item of xsItems) {
                    let text = String(item.text || "").trim();
                    if (text.includes("進度：") || text.includes("进度：")) {
                        let match = text.match(/进[度度]：([^，,\s]+)/);
                        if (match) {
                            let rawStatus = match[1].trim();
                            if (rawStatus.includes("已完结")) {
                                status = "已完结";
                            } else if (rawStatus.includes("连载中") || rawStatus.includes("連載中")) {
                                status = "连载中";
                            }
                            break;
                        }
                    }
                }
            }
            if (!status) {
                let contentText = String(doc.querySelector(".hl-dc-content")?.text || "").trim();
                let match = contentText.match(/进[度度]：([^，,\s]+)/);
                if (match) {
                    let rawStatus = match[1].trim();
                    if (rawStatus.includes("已完结")) {
                        status = "已完结";
                    } else if (rawStatus.includes("连载中") || rawStatus.includes("連載中")) {
                        status = "连载中";
                    }
                }
            }

            // ---- 提取简介 ----
            let description = "";
            let descEl = doc.querySelector(".blurb");
            if (descEl) {
                let text = String(descEl.text || "").trim();
                if (text.startsWith("简介：") || text.startsWith("簡介：")) {
                    description = text.substring(3).trim();
                } else {
                    description = text;
                }
            }

            // ---- 提取章节列表 ----
            let chapters = new Map();
            let chapterContainer = doc.querySelector(".hl-plays-list");
            if (!chapterContainer) {
                chapterContainer = doc.querySelector(".hl-play-source .hl-list-wrap ul");
            }
            if (!chapterContainer) {
                chapterContainer = doc.querySelector("ul.hl-plays-list");
            }
            
            let chapterEls = chapterContainer ? chapterContainer.querySelectorAll("a") : [];
            
            if (chapterContainer) {
                let seen = {};
                for (let i = 0; i < chapterEls.length; i++) {
                    let el = chapterEls[i];
                    let href = this.attr(el, "href") || "";
                    if (!href.includes("/manhua-") && !href.includes("/comics-reading/")) continue;
                    let m = href.match(/\/manhua-\d+\/([a-zA-Z0-9]+)\.html/) || href.match(/\/comics-reading\/\d+\/([a-zA-Z0-9]+)\.html/);
                    if (!m) continue;
                    let cid = m[1];
                    if (seen[cid]) continue;
                    seen[cid] = true;
                    
                    let name = this.attr(el, "title") || "";
                    if (!name || name.length === 0) {
                        name = String(el.text || "").trim();
                    }
                    name = name.replace(/\s+/g, " ").trim();
                    
                    if (title && name.indexOf(title) === 0) {
                        name = name.substring(title.length).trim();
                    }
                    if (name.startsWith("-") || name.startsWith("—") || name.startsWith("|")) {
                        name = name.substring(1).trim();
                    }
                    if (name.startsWith(" ")) {
                        name = name.substring(1).trim();
                    }
                    
                    if (!name || name.length === 0) {
                        name = "第" + (chapters.size + 1) + "话";
                    }
                    
                    chapters.set(cid, name);
                }
            }
            
            if (chapters.size === 0) {
                let fallbackEls = doc.querySelectorAll(".hl-plays-list a, .chapter-item a, .episode-item a, a[href*='.html']");
                let seen = {};
                for (let i = 0; i < fallbackEls.length; i++) {
                    let el = fallbackEls[i];
                    let href = this.attr(el, "href") || "";
                    if (!href.includes("/manhua-") && !href.includes("/comics-reading/")) continue;
                    let m = href.match(/\/manhua-\d+\/([a-zA-Z0-9]+)\.html/) || href.match(/\/comics-reading\/\d+\/([a-zA-Z0-9]+)\.html/);
                    if (!m) continue;
                    let cid = m[1];
                    if (seen[cid]) continue;
                    seen[cid] = true;
                    
                    let name = this.attr(el, "title") || "";
                    if (!name || name.length === 0) {
                        name = String(el.text || "").trim();
                    }
                    name = name.replace(/\s+/g, " ").trim();
                    
                    if (name === "开始阅读" || name === "首頁") continue;
                    
                    if (title && name.indexOf(title) === 0) {
                        name = name.substring(title.length).trim();
                    }
                    if (name.startsWith("-") || name.startsWith("—") || name.startsWith("|")) {
                        name = name.substring(1).trim();
                    }
                    if (name.startsWith(" ")) {
                        name = name.substring(1).trim();
                    }
                    
                    if (!name || name.length === 0) {
                        name = "第" + (chapters.size + 1) + "话";
                    }
                    
                    chapters.set(cid, name);
                }
            }

            // ---- 反转章节顺序（最新在前） ----
            let reversedChapters = new Map();
            let entries = Array.from(chapters.entries());
            for (let i = entries.length - 1; i >= 0; i--) {
                reversedChapters.set(entries[i][0], entries[i][1]);
            }

            doc.dispose();

            // ---- 构建 tags 对象 ----
            let tagObject = {};
            if (authors.length > 0) {
                tagObject["作者"] = authors;
            } else {
                tagObject["作者"] = ["未知"];
            }
            if (status) {
                tagObject["状态"] = [status];
            }
            if (tags.length > 0) {
                tagObject["标签"] = tags;
            }

            return {
                title: title,
                cover: cover,
                description: description,
                tags: tagObject,
                chapters: reversedChapters,
                isFavorite: false,
                subId: id
            };
        },

        loadEp: async (comicId, epId) => {
            let urls = [
                `/manhua-${comicId}/${epId}.html`,
                `/comics-reading/${comicId}/${epId}.html`
            ];
            
            let res = null;
            for (let url of urls) {
                try {
                    let testRes = await Network.get(this.buildUrl(url), this.headers);
                    if (testRes.status === 200) {
                        res = testRes;
                        break;
                    }
                } catch (e) {}
            }
            
            if (!res) {
                throw `章节加载失败，comicId: ${comicId}, epId: ${epId}`;
            }

            let doc = new HtmlDocument(res.body);
            let images = [];

            let imgs = doc.querySelectorAll("[data-original], img[data-src], img[data-original]");
            for (let i = 0; i < imgs.length; i++) {
                let u = this.attr(imgs[i], "data-original") || this.attr(imgs[i], "data-src") || this.attr(imgs[i], "src") || "";
                if (u && u.indexOf("http") === 0 && u.indexOf("loading") < 0 && u.indexOf("logo") < 0) {
                    images.push(u);
                }
            }

            if (images.length === 0) {
                let html = String(res.body || "");
                let chunks = html.split('data-original="');
                for (let i = 1; i < chunks.length; i++) {
                    let u = chunks[i].split('"')[0].trim();
                    if (u && u.indexOf("http") === 0) {
                        images.push(u);
                    }
                }
            }

            doc.dispose();

            if (images.length === 0) {
                throw `未解析到图片 | ep=${epId}`;
            }

            return { images };
        },

        onImageLoad: (url, comicId, epId) => {
            return { url, headers: this.imgHeaders };
        },

        onThumbnailLoad: (url) => {
            return { headers: this.imgHeaders };
        },

        onClickTag: (namespace, tag) => {
            // 状态标签：跳转到"连载中"或"已完结"分类
            if (namespace === "状态") {
                if (tag === "连载中" || tag === "已完结") {
                    return {
                        action: "category",
                        keyword: tag,
                        param: tag
                    }
                }
            }

            // 标签：跳转到对应分类
            if (namespace === "标签") {
                if (HanmanJidi.categoryList.includes(tag)) {
                    return {
                        action: "category",
                        keyword: tag,
                        param: tag
                    }
                }
            }

            // 作者等其他标签：走搜索
            return { action: "search", keyword: tag }
        }
    }
}