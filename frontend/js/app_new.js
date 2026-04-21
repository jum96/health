// 岭南康养·灵境向导 - 新版应用逻辑
class HealthAgentApp {
    constructor() {
        this.currentTab = 'chat';
        this.currentCultureCategory = 'heritage';
        this.currentHealthType = 'seasonal';
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    init() {
        this.bindNavEvents();
        this.bindChatEvents();
        this.bindCultureEvents();
        this.bindHealthEvents();
        this.bindCalendarEvents();
        this.bindModalEvents();
        this.renderCultureCards();
        this.renderHealthContent();
        this.renderSolarTerms();
        console.log('🏮 岭南康养·灵境向导已启动！');
    }

    // ========== 导航切换 ==========
    bindNavEvents() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        // 更新导航标签
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');

        // 更新面板显示
        document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tabName}-panel`).classList.add('active');

        this.currentTab = tabName;
    }

    // ========== 聊天功能 ==========
    bindChatEvents() {
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');

        sendBtn.addEventListener('click', () => this.handleSend());
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        // 快捷按钮
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const msg = btn.dataset.msg;
                if (msg) this.sendMessage(msg);
            });
        });
    }

    handleSend() {
        const input = document.getElementById('user-input');
        const msg = input.value.trim();
        if (msg) {
            this.sendMessage(msg);
            input.value = '';
        }
    }

    sendMessage(userMsg) {
        // 添加用户消息
        this.appendMessage(userMsg, true);

        // 先尝试后端API，失败用本地
        this.getAIResponse(userMsg).then(aiMsg => {
            this.appendMessage(aiMsg, false);
        });
    }

    async getAIResponse(userMsg) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const data = await response.json();
            if (data.success) return data.message;
        } catch (e) {
            console.log('使用本地知识库');
        }
        return this.getLocalResponse(userMsg);
    }

    getLocalResponse(userMsg) {
        const lowerMsg = userMsg.toLowerCase();

        // 关键词匹配
        for (const entry of this.getLocalKnowledgeBase()) {
            for (const kw of entry.keywords) {
                if (lowerMsg.includes(kw)) {
                    return entry.answer + ' 🌟（根据岭南康养知识库）';
                }
            }
        }

        // 默认回复
        return `🌾 感谢您的提问！作为岭南康养向导，我可以为您提供：

• 岭南文化科普（凉茶、醒狮、粤剧、木棉、工夫茶）
• 健康养生建议（祛湿、清热、痰湿/阴虚体质调理）
• 节气养生方案（24节气应季调养）

试试问我："木棉花有什么功效？" 或 "清明节气怎样养生？"`;
    }

    getLocalKnowledgeBase() {
        return [
            { keywords: ["木棉花", "木棉", "英雄花"], answer: "🌸 木棉花是广州市花，岭南湿热气候中，民间常采干木棉花入膳。《岭南采药录》载其清热、利湿、解毒。经典搭配：木棉花薏米猪骨汤，祛湿健脾，适合春季回南天。注意：路边鲜木棉花可能污染，建议使用干品。" },
            { keywords: ["凉茶", "廿四味", "癍痧", "清热"], answer: "🍵 岭南凉茶源于湿热气候，以中草药熬制，清热祛湿。例如「癍痧」清热解毒、「罗汉果五花茶」润肺。上火舌尖红多属心火亢盛，推荐「竹叶茅根水」或「夏桑菊」。日常可饮淡竹叶、金银花、甘草轻清之品。" },
            { keywords: ["醒狮", "舞狮", "狮子"], answer: "🦁 广东醒狮是国家级非遗，不仅驱邪纳吉，更蕴含康养智慧——腾挪跳跃锻炼筋骨，鼓乐振奋阳气。岭南医家认为醒狮活动可疏肝解郁、增强心肺，与“动则生阳”契合。" },
            { keywords: ["潮汕", "工夫茶", "功夫茶"], answer: "🍃 潮汕工夫茶讲究‘和、敬、精、乐’，茶叶多用单丛/普洱，高温冲泡分茶。养生上：单丛茶半发酵，消食解腻，提神醒脑；‘关公巡城’‘韩信点兵’仪式令人静心，调和情志，非常适合湿热地区化浊。" },
            { keywords: ["湿气重", "舌苔厚", "困倦", "乏力", "湿困"], answer: "🌧️ 岭南多湿，脾虚湿困常见。推荐食疗：赤小豆薏米陈皮水（薏米炒后减寒）。穴位：阴陵泉、足三里按揉。忌生冷甜腻。若舌苔黄腻为湿热，可加土茯苓、绵茵陈。" },
            { keywords: ["上火", "舌尖红", "喉咙痛", "口干"], answer: "🔥 岭南地域‘上火’多属湿热/实火。推荐轻清凉茶：金银花+菊花+甘草，或雪梨干+芦根。饮食宜冬瓜、苦瓜。忌辛辣烧烤。" },
            { keywords: ["清明", "节气", "清明养生"], answer: "🌿 清明岭南湿气渐盛：推荐「木棉花薏米瘦肉粥」祛湿。起居早起散步，按揉太冲穴疏肝。防春瘟，可用艾草煮水泡脚。祭祖踏青舒缓肝气。" },
            { keywords: ["痰湿", "痰湿体质"], answer: "🥣 痰湿体质建议：陈皮薏米冬瓜汤（陈皮1瓣，薏米30g，冬瓜带皮）。穴位：丰隆穴（化痰要穴），每日按揉3分钟。运动：八段锦‘调理脾胃须单举’，每周4次。少食肥甘。" },
            { keywords: ["老火靓汤", "煲汤", "广式汤"], answer: "🍲 广府老火汤药食同源，如「淮山杞子响螺汤」养阴，「粉葛赤小豆鲮鱼汤」解肌祛湿。煲汤讲究君臣佐使，岭南湿热地区以清补凉为代表。" }
        ];
    }

    appendMessage(content, isUser) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        bubbleDiv.innerHTML = content.replace(/\n/g, '<br>');
        messageDiv.appendChild(bubbleDiv);

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerText = isUser ? '您' : '🪶 灵境向导';
        messageDiv.appendChild(avatarDiv);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // ========== 文化科普卡片 ==========
    bindCultureEvents() {
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCultureCategory = tab.dataset.category;
                this.renderCultureCards();
            });
        });
    }

    renderCultureCards() {
        const grid = document.getElementById('culture-cards');
        const data = this.getCultureData(this.currentCultureCategory);

        grid.innerHTML = data.map((item, index) => `
            <div class="knowledge-card" data-index="${index}" data-category="${this.currentCultureCategory}">
                <div class="card-header">${item.icon}</div>
                <div class="card-body">
                    <div class="card-title">${item.title}</div>
                    <div class="card-desc">${item.description}</div>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        grid.querySelectorAll('.knowledge-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index);
                const category = card.dataset.category;
                this.showCultureDetail(category, idx);
            });
        });
    }

    getCultureData(category) {
        const kb = KNOWLEDGE_BASE || {};
        const mapping = {
            'heritage': kb.intangibleHeritage || [],
            'architecture': kb.architecture || [],
            'food': kb.foodCulture || [],
            'customs': kb.folkCustoms || []
        };
        return mapping[category] || [];
    }

    showCultureDetail(category, index) {
        const data = this.getCultureData(category)[index];
        if (!data) return;

        const modal = document.getElementById('detail-modal');
        document.getElementById('modal-title').innerText = data.icon + ' ' + data.title;

        let content = `<p>${data.description}</p>`;

        // 根据数据类型显示详情
        if (data.content) {
            if (typeof data.content === 'string') {
                content += `<h3>详细介绍</h3><p>${data.content}</p>`;
            } else if (data.content.history) {
                content += `<h3>历史渊源</h3><p>${data.content.history}</p>`;
            }
            if (data.content.formulas && Array.isArray(data.content.formulas)) {
                content += `<h3>经典配方</h3><ul>`;
                data.content.formulas.forEach(f => {
                    content += `<li><strong>${f.name}</strong>：${f.ingredients}<br>功效：${f.effect}</li>`;
                });
                content += `</ul>`;
            }
            if (data.content.healthBenefits && Array.isArray(data.content.healthBenefits)) {
                content += `<h3>健康价值</h3><ul>`;
                data.content.healthBenefits.forEach(h => content += `<li>${h}</li>`);
                content += `</ul>`;
            }
        }

        document.getElementById('modal-body').innerHTML = content;
        modal.classList.add('active');
    }

    // ========== 养生方案 ==========
    bindHealthEvents() {
        document.querySelectorAll('.health-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.health-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.currentHealthType = opt.dataset.type;
                this.renderHealthContent();
            });
        });
    }

    renderHealthContent() {
        const container = document.getElementById('health-content');
        const kb = KNOWLEDGE_BASE || {};

        let content = '';

        if (this.currentHealthType === 'seasonal' && kb.seasonalHealth) {
            const seasons = ['spring', 'summer', 'autumn', 'winter'];
            const seasonNames = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };

            content = '<div class="health-section">';
            seasons.forEach(season => {
                const data = kb.seasonalHealth[season];
                if (!data) return;
                content += `
                    <div class="knowledge-card" style="margin-bottom: 16px; cursor: pointer;" onclick="app.showSeasonDetail('${season}')">
                        <div class="card-header">${data.icon}</div>
                        <div class="card-body">
                            <div class="card-title">${data.title}</div>
                            <div class="card-desc">${data.principle}</div>
                        </div>
                    </div>
                `;
            });
            content += '</div>';

        } else if (this.currentHealthType === 'constitution' && kb.nineConstitutions) {
            content = '<div class="health-section"><div class="cards-grid">';
            kb.nineConstitutions.forEach((cons, idx) => {
                content += `
                    <div class="knowledge-card" onclick="app.showConstitutionDetail(${idx})">
                        <div class="card-header">${cons.icon}</div>
                        <div class="card-body">
                            <div class="card-title">${cons.name}</div>
                            <div class="card-desc">${cons.description}</div>
                        </div>
                    </div>
                `;
            });
            content += '</div></div>';

        } else if (this.currentHealthType === 'diet' && kb.herbalSoups) {
            content = '<div class="health-section"><div class="cards-grid">';
            kb.herbalSoups.forEach((soup, idx) => {
                content += `
                    <div class="knowledge-card" onclick="app.showSoupDetail(${idx})">
                        <div class="card-header">${soup.icon}</div>
                        <div class="card-body">
                            <div class="card-title">${soup.name}</div>
                            <div class="card-desc">${soup.effect}</div>
                        </div>
                    </div>
                `;
            });
            content += '</div></div>';
        }

        container.innerHTML = content || '<p>暂无数据</p>';
    }

    showSeasonDetail(season) {
        const data = KNOWLEDGE_BASE.seasonalHealth[season];
        if (!data) return;

        document.getElementById('modal-title').innerText = data.icon + ' ' + data.title;
        let content = `<h3>养生原则</h3><p>${data.principle}</p>`;
        content += `<h3>养生要点</h3><ul>`;
        data.tips.forEach(t => content += `<li>${t}</li>`);
        content += `</ul>`;
        content += `<h3>推荐汤品</h3><ul>`;
        data.soups.forEach(s => content += `<li>${s}</li>`);
        content += `</ul>`;

        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    showConstitutionDetail(idx) {
        const data = KNOWLEDGE_BASE.nineConstitutions[idx];
        if (!data) return;

        document.getElementById('modal-title').innerText = data.icon + ' ' + data.name;
        let content = `<p>${data.description}</p>`;
        content += `<h3>特征</h3><p>${data.feature}</p>`;
        content += `<h3>养生建议</h3><ul>`;
        data.tips.forEach(t => content += `<li>${t}</li>`);
        content += `</ul>`;

        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    showSoupDetail(idx) {
        const data = KNOWLEDGE_BASE.herbalSoups[idx];
        if (!data) return;

        document.getElementById('modal-title').innerText = data.icon + ' ' + data.name;
        let content = `<h3>功效</h3><p>${data.effect}</p>`;
        content += `<h3>适用季节</h3><p>${data.season}</p>`;
        content += `<h3>食材</h3><p>${data.ingredients}</p>`;

        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    // ========== 节气日历 ==========
    bindCalendarEvents() {
        document.getElementById('prev-year').addEventListener('click', () => {
            this.currentYear--;
            document.getElementById('current-year').innerText = this.currentYear;
        });
        document.getElementById('next-year').addEventListener('click', () => {
            this.currentYear++;
            document.getElementById('current-year').innerText = this.currentYear;
        });
    }

    renderSolarTerms() {
        const grid = document.getElementById('solar-terms-grid');
        const terms = KNOWLEDGE_BASE?.solarTerms || [];

        grid.innerHTML = terms.map((term, idx) => `
            <div class="solar-term-card" onclick="app.showSolarTermDetail(${idx})">
                <div class="solar-term-icon">${term.icon}</div>
                <div class="solar-term-name">${term.name}</div>
                <div class="solar-term-date">${term.date}</div>
            </div>
        `).join('');
    }

    showSolarTermDetail(idx) {
        const term = KNOWLEDGE_BASE.solarTerms[idx];
        if (!term) return;

        document.getElementById('modal-title').innerText = term.icon + ' ' + term.name;

        const seasonHealth = KNOWLEDGE_BASE?.seasonalHealth;
        let seasonTip = '';
        if (term.month >= 3 && term.month <= 5 && seasonHealth?.spring) {
            seasonTip = `<h3>春季养生要点</h3><ul>${seasonHealth.spring.tips.slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul>`;
        } else if (term.month >= 6 && term.month <= 8 && seasonHealth?.summer) {
            seasonTip = `<h3>夏季养生要点</h3><ul>${seasonHealth.summer.tips.slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul>`;
        } else if (term.month >= 9 && term.month <= 11 && seasonHealth?.autumn) {
            seasonTip = `<h3>秋季养生要点</h3><ul>${seasonHealth.autumn.tips.slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul>`;
        } else if (seasonHealth?.winter) {
            seasonTip = `<h3>冬季养生要点</h3><ul>${seasonHealth.winter.tips.slice(0, 3).map(t => `<li>${t}</li>`).join('')}</ul>`;
        }

        document.getElementById('modal-body').innerHTML = `
            <p><strong>日期：</strong>${term.date}</p>
            ${seasonTip}
            <p style="color: #666; font-size: 0.9rem; margin-top: 16px;">
                💡 提示：节气养生应结合岭南气候特点，注重祛湿、清热、润燥的调整。
            </p>
        `;
        document.getElementById('detail-modal').classList.add('active');
    }

    // ========== 弹窗 ==========
    bindModalEvents() {
        document.querySelector('.modal-close').addEventListener('click', () => {
            document.getElementById('detail-modal').classList.remove('active');
        });
        document.getElementById('detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') {
                document.getElementById('detail-modal').classList.remove('active');
            }
        });
    }
}

// 启动应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HealthAgentApp();
});
