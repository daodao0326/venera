/** @type {import('./_venera_.js')} */

class Niaoniao extends ComicSource {
    name = "鸟鸟韩漫"
    key = "niaoniao"
    version = "1.0.0"
    minAppVersion = "1.6.0"
    url = ""

    static defaultUa =
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"

    static defaultDomains = [
        "https://nnhm5.org",
        "https://nnhm95.com",
        "https://nnhm93.com",
        "https://nnhm91.com",
        "https://nnhm92.com",
        "https://nnhm81.com",
        "https://nnhm7.com",
    ]

    // 分类标签列表（供多处使用）
    static categoryList = [
        "正妹", "恋爱", "出版漫画", "肉慾", "浪漫", "大尺度",
        "巨乳", "有夫之婦", "女大生", "狗血劇", "同居", "好友",
        "調教", "动作", "後宮", "不倫", "3D", "校園", "耽美", "日漫"
    ]

    settings = {
        domain: {
            title: "线路域名",
            type: "select",
            options: [
                { value: "https://nnhm5.org", text: "nnhm5.org" },
                { value: "https://nnhm95.com", text: "nnhm95.com" },
                { value: "https://nnhm93.com", text: "nnhm93.com" },
                { value: "https://nnhm91.com", text: "nnhm91.com" },
                { value: "https://nnhm92.com", text: "nnhm92.com" },
                { value: "https://nnhm81.com", text: "nnhm81.com" },
                { value: "https://nnhm7.com", text: "nnhm7.com" },
            ],
            default: "https://nnhm5.org",
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

                Network.get(currentDomain, this.headers).then(res => {
                    if (isCompleted) return;
                    const delay = Date.now() - startTime;
                    UI.cancelLoading(loadingId);
                    if (res.status === 200) {
                        UI.showMessage(`✅ 连接正常，延迟: ${delay}ms`);
                    } else {
                        UI.showMessage(`⚠️ 连接异常，状态码: ${res.status}`);
                    }
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
        let d = this.loadSetting("domain") || this.loadData("niaoniao_domain") || Niaoniao.defaultDomains[0]
        return String(d).replace(/\/$/, "")
    }

    get ua() {
        return Niaoniao.defaultUa
    }

    get headers() {
        return {
            "User-Agent": this.ua,
            "Referer": this.domain + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
    }

    get imgHeaders() {
        return {
            "User-Agent": this.ua,
            "Referer": this.domain + "/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Pragma": "no-cache",
        }
    }

    buildUrl(path) {
        if (!path) return this.domain
        if (path.indexOf("http") === 0) return path
        return this.domain + (path.indexOf("/") === 0 ? path : "/" + path)
    }

    // 兼容首页 col_3_1 和 更新/排行 itemBox 两种结构
    parseListItem(el) {
        let link =
            el.querySelector("a.ImgA") ||
            el.querySelector("a.txtA") ||
            el.querySelector(".itemImg a") ||
            el.querySelector(".itemTxt a") ||
            el.querySelector("a[href*='/comic/']")

        let href = (link && link.attributes["href"]) || ""
        let id = ""
        let m = href.match(/\/comic\/([^\/\.]+)/)
        if (m) id = m[1]
        else id = href.split("/").filter(Boolean).pop()?.replace(/\.html$/, "") || ""

        let img = el.querySelector("img")
        let cover =
            (img && (img.attributes["data-original"] || img.attributes["data-src"] || img.attributes["src"])) || ""
        let source = el.querySelector("source[srcset]")
        if (source && source.attributes["srcset"]) {
            cover = source.attributes["srcset"]
        }

        let titleEl =
            el.querySelector("a.txtA") ||
            el.querySelector(".itemTxt .title") ||
            el.querySelector(".title") ||
            link
        let title =
            (titleEl && titleEl.text && titleEl.text.trim()) ||
            (link && link.attributes["title"]) ||
            (img && img.attributes["alt"]) ||
            ""

        return {
            id: id,
            title: title,
            cover: cover.indexOf("http") === 0 ? cover : (cover ? this.buildUrl(cover) : ""),
            subTitle: "",
        }
    }

    // 从页面统一提取漫画列表
    parseComicsFromDoc(doc) {
        let items =
            doc.querySelectorAll("ul.col_3_1 > li") ||
            doc.querySelectorAll(".UpdateList .itemBox") ||
            doc.querySelectorAll(".itemBox") ||
            []
        let comics = []
        let seen = {}
        for (let i = 0; i < items.length; i++) {
            let item = this.parseListItem(items[i])
            if (item.id && !seen[item.id]) {
                seen[item.id] = true
                comics.push(item)
            }
        }
        // 兜底：直接扫所有 /comic/ 链接
        if (comics.length === 0) {
            let links = doc.querySelectorAll("a[href*='/comic/']")
            for (let i = 0; i < links.length; i++) {
                let href = links[i].attributes["href"] || ""
                if (href.indexOf("/chapter-") >= 0) continue
                let m = href.match(/\/comic\/([^\/\.]+)/)
                if (!m) continue
                let id = m[1]
                if (seen[id]) continue
                seen[id] = true
                let title = links[i].attributes["title"] || (links[i].text || "").trim() || id
                let img = links[i].querySelector("img")
                let cover = ""
                if (img) {
                    cover = img.attributes["data-original"] || img.attributes["src"] || ""
                }
                let source = links[i].querySelector("source[srcset]")
                if (source) cover = source.attributes["srcset"] || cover
                comics.push({
                    id: id,
                    title: title,
                    cover: cover.indexOf("http") === 0 ? cover : (cover ? this.buildUrl(cover) : ""),
                    subTitle: "",
                })
            }
        }
        return comics
    }

    // 通用分页解析
    parseMaxPage(doc) {
        let maxPage = 1
        let pageLinks = doc.querySelectorAll("a[href*='/page/']")
        for (let i = 0; i < pageLinks.length; i++) {
            let href = pageLinks[i].attributes["href"] || ""
            let m = href.match(/\/page\/(\d+)/)
            if (m) {
                let num = parseInt(m[1])
                if (num > maxPage) maxPage = num
            }
        }
        // 如果有"下一页"链接，至少还有下一页
        if (maxPage === 1) {
            let nextLinks = doc.querySelectorAll("a")
            for (let i = 0; i < nextLinks.length; i++) {
                let t = (nextLinks[i].text || "").trim()
                if (t === "下一页" || t === "»" || t.indexOf("下一") >= 0) {
                    maxPage = 2
                    break
                }
            }
        }
        return maxPage
    }

    explore = [
        {
            title: "鸟鸟韩漫",
            type: "multiPartPage",
            load: async () => {
                // 推荐漫画
                let recommendComics = []
                try {
                    let res2 = await Network.get(this.buildUrl("/update/recommend"), this.headers)
                    if (res2.status === 200) {
                        let doc2 = new HtmlDocument(res2.body)
                        recommendComics = this.parseComicsFromDoc(doc2)
                    }
                } catch (e) {}

                // 全部漫画
                let allComics = []
                try {
                    let resAll = await Network.get(this.buildUrl("/comics/all/ob/time/st/all"), this.headers)
                    if (resAll.status === 200) {
                        let docAll = new HtmlDocument(resAll.body)
                        allComics = this.parseComicsFromDoc(docAll)
                    }
                } catch (e) {}

                return [
                    {
                        title: "推荐漫画",
                        comics: recommendComics.slice(0, 20),
                        viewMore: {
                            page: "category",
                            attributes: {
                                category: "推荐漫画"
                            }
                        }
                    },
                    {
                        title: "全部漫画",
                        comics: allComics.slice(0, 20),
                        viewMore: {
                            page: "category",
                            attributes: {
                                category: "全部漫画"
                            }
                        }
                    },
                ]
            }
        }
    ]

    // ==================== 分类功能 ====================
    category = {
        title: "鸟鸟韩漫",
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const url = `/ranking${page > 1 ? `?page=${page}` : ""}`;
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const doc = new HtmlDocument((await Network.get(this.buildUrl(url), this.headers)).body);
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
                const path = `/comics/all/ob/time/st/all${page > 1 ? `/page/${page}` : ""}`;
                const doc = new HtmlDocument((await Network.get(this.buildUrl(path), this.headers)).body);
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
                const path = `/comics/all/ob/time/st/serialized${page > 1 ? `/page/${page}` : ""}`;
                const doc = new HtmlDocument((await Network.get(this.buildUrl(path), this.headers)).body);
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
                const path = `/comics/all/ob/time/st/completed${page > 1 ? `/page/${page}` : ""}`;
                const doc = new HtmlDocument((await Network.get(this.buildUrl(path), this.headers)).body);
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
            if (Niaoniao.categoryList.includes(category)) {
                const encodedCategory = encodeURIComponent(category);
                const path = `/comics/${encodedCategory}/ob/time/st/completed${page > 1 ? `/page/${page}` : ""}`;
                const doc = new HtmlDocument((await Network.get(this.buildUrl(path), this.headers)).body);
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
            const path = `/comics/all/ob/time/st/all${page > 1 ? `/page/${page}` : ""}`;
            const doc = new HtmlDocument((await Network.get(this.buildUrl(path), this.headers)).body);
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
            // 所有分类都已经处理完毕，不需要额外选项
            return [];
        },

        ranking: {
            options: ["week-周榜", "all-总榜"],
            load: async (option, page) => {
                let path = "/ranking"
                if (option === "all") path = "/ranking/all"

                let res = await Network.get(this.buildUrl(path), this.headers)
                if (res.status !== 200) throw `排行失败: HTTP ${res.status}`
                let doc = new HtmlDocument(res.body)
                let comics = this.parseComicsFromDoc(doc)
                return { comics: comics, maxPage: 1 }
            }
        }
    }

    search = {
        load: async (keyword, options, page) => {
            let url = this.buildUrl(`/catalog.php?key=${encodeURIComponent(keyword)}`)
            if (page > 1) url += `&page=${page}`

            let res = await Network.get(url, this.headers)
            if (res.status !== 200) throw `搜索失败: HTTP ${res.status}`

            let doc = new HtmlDocument(res.body)
            let comics = this.parseComicsFromDoc(doc)
            let maxPage = this.parseMaxPage(doc)

            return {
                comics: comics,
                maxPage: maxPage
            }
        },
        optionList: []
    }

    comic = {
        loadInfo: async (id) => {
            let res = await Network.get(this.buildUrl(`/comic/${id}.html`), this.headers)
            if (res.status !== 200) throw `详情失败: HTTP ${res.status}`
            let doc = new HtmlDocument(res.body)

            let titleEl = doc.querySelector("h1") || doc.querySelector(".txtItme2")
            let title = titleEl ? String(titleEl.text || "").trim() : ("漫画 " + id)

            let coverEl = doc.querySelector(".pic img") || doc.querySelector(".Introduct img") || doc.querySelector("img")
            let cover =
                (coverEl && (coverEl.attributes["data-original"] || coverEl.attributes["data-src"] || coverEl.attributes["src"])) || ""
            let source = doc.querySelector(".pic source[srcset], .Introduct source[srcset]")
            if (source && source.attributes["srcset"]) cover = source.attributes["srcset"]
            if (cover && cover.indexOf("http") !== 0) cover = this.buildUrl(cover)

            // ---- 提取作者、标签、状态 ----
            let authors = []
            let tags = []
            let statusText = ""

            let infoItems = doc.querySelectorAll(".txtItme")
            for (let i = 0; i < infoItems.length; i++) {
                let item = infoItems[i]
                let txt = String(item.text || "").trim()

                let icon = item.querySelector(".icon")
                let iconClass = icon ? (icon.attributes["class"] || "") : ""

                // ---- 作者信息：icon02 且没有 <a> 标签 ----
                if (iconClass.indexOf("icon02") >= 0 && item.querySelectorAll("a").length === 0) {
                    let authorText = txt.trim()
                    if (authorText) {
                        let parts = authorText.split(/[&,，、\/\\|]/)
                        for (let p of parts) {
                            let name = p.trim()
                            if (name && authors.indexOf(name) < 0) authors.push(name)
                        }
                    }
                }

                // ---- 标签信息：icon02 且有 <a> 标签 ----
                if (iconClass.indexOf("icon02") >= 0 && item.querySelectorAll("a").length > 0) {
                    let tagLinks = item.querySelectorAll("a")
                    for (let j = 0; j < tagLinks.length; j++) {
                        let t = (tagLinks[j].text || "").trim()
                        if (t && tags.indexOf(t) < 0) tags.push(t)
                    }
                }

                // ---- 状态信息：icon03，只保留连载中/已完结 ----
                if (iconClass.indexOf("icon03") >= 0) {
                    let dateEl = item.querySelector(".date")
                    let dateText = dateEl ? String(dateEl.text || "").trim() : txt

                    if (dateText.indexOf("连载中") >= 0 || dateText.indexOf("連載中") >= 0) {
                        statusText = "连载中"
                    } else if (dateText.indexOf("已完结") >= 0 || dateText.indexOf("已完結") >= 0) {
                        statusText = "已完结"
                    }
                }
            }

            // 兜底：如果作者没提取到
            if (authors.length === 0) {
                let firstIcon02 = doc.querySelector(".txtItme .icon02")
                if (firstIcon02 && firstIcon02.parentElement) {
                    let parentText = String(firstIcon02.parentElement.text || "").trim()
                    if (parentText && parentText.length < 50 && parentText.indexOf("连载") < 0) {
                        let parts = parentText.split(/[&,，、\/\\|]/)
                        for (let p of parts) {
                            let name = p.trim()
                            if (name && authors.indexOf(name) < 0) authors.push(name)
                        }
                    }
                }
            }

            let descEl = doc.querySelector(".desc") || doc.querySelector(".Introduct p") || doc.querySelector(".comic-desc")
            let description = descEl ? String(descEl.text || "").trim() : ""

            // ---- 提取章节列表 ----
            let chapters = new Map()
            let chapterEls = doc.querySelectorAll("#mh-chapter-list-ol-0 > li > a, ul.Drama > li > a, .chapter-list a")
            let seen = {}
            for (let i = 0; i < chapterEls.length; i++) {
                let el = chapterEls[i]
                let href = el.attributes["href"] || ""
                let m = href.match(/chapter-([a-zA-Z0-9]+)\.html/)
                if (!m) continue
                let cid = m[1]
                if (seen[cid]) continue
                seen[cid] = true
                let name = String(el.text || "").trim() || ("第" + cid + "话")
                chapters.set(cid, name)
            }

            // ---- 反转章节顺序（最新在前） ----
            let reversedChapters = new Map()
            let entries = Array.from(chapters.entries())
            for (let i = entries.length - 1; i >= 0; i--) {
                reversedChapters.set(entries[i][0], entries[i][1])
            }

            // ---- 构建 tags 对象 ----
            let tagObject = {}
            if (authors.length > 0) {
                tagObject["作者"] = authors
            } else {
                tagObject["作者"] = ["未知"]
            }
            if (statusText) {
                tagObject["状态"] = [statusText]
            }
            if (tags.length > 0) {
                tagObject["标签"] = tags
            }

            return {
                title: title,
                cover: cover,
                description: description,
                tags: tagObject,
                chapters: reversedChapters,
                isFavorite: false,
                subId: id
            }
        },

        loadEp: async (comicId, epId) => {
            let url = this.buildUrl(`/comic/${comicId}/chapter-${epId}.html`)
            let res = await Network.get(url, this.headers)
            if (res.status !== 200) {
                throw `章节失败: HTTP ${res.status} | ep=${epId}`
            }

            let doc = new HtmlDocument(res.body)
            let images = []

            let imgs = doc.querySelectorAll("img[data-src]")
            for (let i = 0; i < imgs.length; i++) {
                let u = imgs[i].attributes["data-src"] || ""
                if (u && u.indexOf("http") === 0 && u.indexOf("loading") < 0 && u.indexOf("icon") < 0) {
                    images.push(u)
                }
            }

            if (images.length === 0) {
                let all = doc.querySelectorAll(".img-wrap img, .view-imgBox img, .image-list img")
                for (let i = 0; i < all.length; i++) {
                    let u =
                        all[i].attributes["data-src"] ||
                        all[i].attributes["data-original"] ||
                        all[i].attributes["src"] ||
                        ""
                    if (u && u.indexOf("http") === 0 && u.indexOf("loading") < 0) {
                        images.push(u)
                    }
                }
            }

            if (images.length === 0) {
                let html = String(res.body || "")
                let chunks = html.split('data-src="')
                for (let i = 1; i < chunks.length; i++) {
                    let u = chunks[i].split('"')[0].trim()
                    if (u && u.indexOf("http") === 0) images.push(u)
                }
            }

            if (images.length === 0) {
                throw `未解析到图片 | ep=${epId} 长度=${(res.body || "").length} 域名=${this.domain}`
            }

            return { images }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: url,
                headers: this.imgHeaders,
            }
        },

        onThumbnailLoad: (url) => {
            return { headers: this.imgHeaders }
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
                if (Niaoniao.categoryList.includes(tag)) {
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