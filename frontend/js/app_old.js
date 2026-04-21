// 岭南康养·灵境向导 - 主应用逻辑

class LingnanHealthAgent {
    constructor() {
        this.currentTab = 'chat';
        this.conversationHistory = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderSolarTerms();
        this.renderCultureContent('heritage');
        this.renderHealthContent('seasonal');
    }

    bindEvents() {
        // 导航标签切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // 发送消息
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('user-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 快捷问题按钮
        document.querySelectorAll('.question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('user-input').value = btn.dataset.question;
                this.sendMessage();
            });
        });

        // 文化分类切换
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCultureContent(btn.dataset.category);
            });
        });

        // 养生方案切换
        document.querySelectorAll('.health-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.health-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderHealthContent(btn.dataset.type);
            });
        });

        // 体质测试
        document.getElementById('start-constitution-test').addEventListener('click', () => this.startConstitutionTest());

        // 模态框关闭
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('constitution-modal').addEventListener('click', (e) => {
            if (e.target.id === 'constitution-modal') this.closeModal();
        });

        // 年份选择
        document.getElementById('prev-year').addEventListener('click', () => this.changeYear(-1));
        document.getElementById('next-year').addEventListener('click', () => this.changeYear(1));
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // 更新导航标签
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) tab.classList.add('active');
        });

        // 更新面板显示
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
    }

    async sendMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        if (!message) return;

        // 添加用户消息
        this.addMessage(message, 'user');
        input.value = '';

        // 自动调整textarea高度
        input.style.height = 'auto';

        // 显示"思考中"
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message assistant';
        thinkingDiv.id = 'thinking-message';
        thinkingDiv.innerHTML = `
            <div class="message-avatar">🏮</div>
            <div class="message-content">
                <div class="message-text"><p>思考中...</p></div>
            </div>
        `;
        document.getElementById('chat-messages').appendChild(thinkingDiv);
        document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

        try {
            // 尝试调用后端API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: this.conversationHistory
                })
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('thinking-message').remove();
                this.addMessage(data.message, 'assistant');
                this.conversationHistory.push({ role: 'user', content: message });
                this.conversationHistory.push({ role: 'assistant', content: data.message });
                return;
            }
        } catch (e) {
            console.log('后端API不可用，使用本地模式');
        }

        // 后端不可用，使用本地模式
        document.getElementById('thinking-message').remove();
        const localResponse = this.generateResponse(message);
        this.addMessage(localResponse, 'assistant');
        this.conversationHistory.push({ role: 'user', content: message });
        this.conversationHistory.push({ role: 'assistant', content: localResponse });
    }

    addMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = type === 'assistant' ? '🏮' : '👤';
        const formattedText = this.formatMessage(text);

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formattedText}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(text) {
        // 简单的Markdown解析
        let formatted = text
            .replace(/^## (.*$)/gim, '<h3 style="color: var(--primary-color); margin-top: 0.5rem; margin-bottom: 0.5rem;">$1</h3>')
            .replace(/^### (.*$)/gim, '<h4 style="color: var(--text-primary); margin-top: 0.5rem; margin-bottom: 0.25rem;">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        const paragraphs = formatted.split('\n\n');
        return paragraphs.map(p => {
            if (p.trim().startsWith('<h3') || p.trim().startsWith('<h4')) {
                return p;
            }
            const hasList = p.includes('\n- ') || p.includes('\n1. ');
            if (hasList) {
                p = p.replace(/^- (.*$)/gim, '<li>$1</li>').replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
                return `<ul style="margin: 0.5rem 0 0.5rem 1.5rem;">${p}</ul>`;
            }
            return `<p style="margin-bottom: 0.75rem;">${p}</p>`;
        }).join('');
    }

    generateResponse(question) {
        const q = question.toLowerCase();

        // 关键词匹配
        if (q.includes('凉茶')) {
            return RESPONSE_TEMPLATES.aboutLiangcha;
        } else if (q.includes('祛湿') || q.includes('湿气') || q.includes('困倦') || q.includes('舌苔')) {
            return RESPONSE_TEMPLATES.aboutShire;
        } else if (q.includes('粤剧')) {
            return RESPONSE_TEMPLATES.aboutYueju;
        } else if (q.includes('春分') || q.includes('节气')) {
            return RESPONSE_TEMPLATES.aboutChunfen;
        } else if (q.includes('东莞') || q.includes('莞香') || q.includes('龙舟')) {
            return RESPONSE_TEMPLATES.aboutDongguan;
        } else if (q.includes('你好') || q.includes('您好') || q.includes('hi') || q.includes('hello')) {
            return RESPONSE_TEMPLATES.greeting;
        } else {
            return this.generateIntelligentResponse(question);
        }
    }

    generateIntelligentResponse(question) {
        const responses = [
            `关于"${question}"，这是一个很好的问题！

作为岭南康养·灵境向导，我建议您可以从以下方面了解：

**岭南文化相关**：
- 🏮 非物质文化遗产（凉茶、粤剧、醒狮、莞香）
- 🏯 岭南建筑特色（骑楼、陈家祠）
- 🥟 饮食文化（早茶、老火靓汤、功夫茶）
- 🎊 民俗节日（迎春花市、端午节、中秋节）

**健康养生相关**：
- 💧 祛湿调理
- 🍵 食疗药膳
- 🧘 体质养生
- 📅 二十四节气养生

请告诉我您具体想了解哪方面，我会为您详细解答！`,

            `感谢您的提问！"${question}"涉及到岭南文化与健康的领域。

我为您准备了一些快捷问题，您可以点击左侧按钮快速了解：

- 🍵 岭南凉茶
- 💧 祛湿调理
- 🎭 粤剧文化
- 🌸 春分养生
- 🐲 东莞非遗

或者您可以更具体地描述您的需求，我会为您提供更有针对性的回答！`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    renderCultureContent(category) {
        const container = document.getElementById('culture-content');
        let items = [];

        switch (category) {
            case 'heritage':
                items = KNOWLEDGE_BASE.intangibleHeritage;
                break;
            case 'architecture':
                items = KNOWLEDGE_BASE.architecture;
                break;
            case 'food':
                items = KNOWLEDGE_BASE.foodCulture;
                break;
            case 'customs':
                items = KNOWLEDGE_BASE.folkCustoms;
                break;
        }

        container.innerHTML = items.map(item => `
            <div class="culture-card">
                <div class="culture-card-image">${item.icon}</div>
                <div class="culture-card-content">
                    <h3 class="culture-card-title">${item.title}</h3>
                    <p class="culture-card-desc">${item.description}</p>
                    ${item.content ? `<p style="margin-top: 0.75rem; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7;">
                        ${typeof item.content === 'string' ? item.content.substring(0, 100) + '...' : item.content.history ? item.content.history.substring(0, 100) + '...' : ''}
                    </p>` : ''}
                </div>
            </div>
        `).join('');
    }

    renderHealthContent(type) {
        const container = document.getElementById('health-content');

        switch (type) {
            case 'seasonal':
                const seasons = ['spring', 'summer', 'autumn', 'winter'];
                const seasonNames = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                        ${seasons.map(season => {
                            const data = KNOWLEDGE_BASE.seasonalHealth[season];
                            return `
                                <div class="culture-card">
                                    <div class="culture-card-image" style="font-size: 3.5rem;">${data.icon}</div>
                                    <div class="culture-card-content">
                                        <h3 class="culture-card-title">${data.title}</h3>
                                        <p style="margin-bottom: 0.75rem;"><strong>原则：</strong>${data.principle}</p>
                                        <h4 style="margin: 0.5rem 0; font-size: 0.95rem;">养生要点：</h4>
                                        <ul style="margin-left: 1.25rem; font-size: 0.9rem; line-height: 1.8;">
                                            ${data.tips.slice(0, 4).map(tip => `<li>${tip}</li>`).join('')}
                                        </ul>
                                        <h4 style="margin: 0.75rem 0 0.25rem; font-size: 0.95rem;">推荐汤品：</h4>
                                        <p style="font-size: 0.9rem;">${data.soups.join('、')}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                break;

            case 'constitution':
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.25rem;">
                        ${KNOWLEDGE_BASE.nineConstitutions.map(cons => `
                            <div class="culture-card">
                                <div class="culture-card-image" style="height: 120px; font-size: 3rem;">${cons.icon}</div>
                                <div class="culture-card-content">
                                    <h3 class="culture-card-title">${cons.name}</h3>
                                    <p class="culture-card-desc">${cons.description}</p>
                                    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);"><strong>特点：</strong>${cons.feature}</p>
                                    ${cons.tips ? `
                                        <ul style="margin-top: 0.5rem; margin-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary);">
                                            ${cons.tips.map(tip => `<li>${tip}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'diet':
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                        ${KNOWLEDGE_BASE.herbalSoups.map(soup => `
                            <div class="culture-card">
                                <div class="culture-card-image" style="height: 140px; font-size: 3.5rem;">${soup.icon}</div>
                                <div class="culture-card-content">
                                    <h3 class="culture-card-title">${soup.name}</h3>
                                    <p style="margin-bottom: 0.5rem;"><strong>功效：</strong>${soup.effect}</p>
                                    <p style="margin-bottom: 0.5rem;"><strong>适用季节：</strong>${soup.season}</p>
                                    <p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>材料：</strong>${soup.ingredients}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
        }
    }

    renderSolarTerms() {
        const container = document.getElementById('solar-terms-grid');
        container.innerHTML = KNOWLEDGE_BASE.solarTerms.map(term => `
            <div class="solar-term-card">
                <div class="solar-term-icon">${term.icon}</div>
                <div class="solar-term-name">${term.name}</div>
                <div class="solar-term-date">${term.date}</div>
            </div>
        `).join('');
    }

    startConstitutionTest() {
        const modal = document.getElementById('constitution-modal');
        const content = document.getElementById('constitution-test-content');

        content.innerHTML = `
            <div style="text-align: center; padding: 2rem 0;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🧘</div>
                <h3 style="margin-bottom: 1rem;">九种体质自测</h3>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    通过回答一系列问题，了解您的体质类型，获取个性化养生建议
                </p>
                <button id="begin-test" style="background: linear-gradient(135deg, var(--primary-color) 0%, #8b0000 100%); color: white; border: none; padding: 1rem 2rem; border-radius: 30px; font-size: 1rem; cursor: pointer;">
                    开始测试
                </button>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('begin-test').addEventListener('click', () => this.showTestQuestion(1));
    }

    showTestQuestion(step) {
        const content = document.getElementById('constitution-test-content');
        const questions = [
            {
                q: '您的体力如何？',
                options: ['精力充沛', '容易疲劳', '怕冷手脚凉', '怕热心火旺']
            },
            {
                q: '您的体型特征是？',
                options: ['匀称适中', '偏瘦', '偏胖', '不一定']
            },
            {
                q: '您的饮食习惯偏好？',
                options: ['喜凉饮', '喜热饮', '喜油腻', '不挑剔']
            }
        ];

        if (step > questions.length) {
            this.showTestResult();
            return;
        }

        const question = questions[step - 1];
        content.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">问题 ${step}/${questions.length}</div>
                <h3 style="margin-bottom: 1.5rem;">${question.q}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${question.options.map((opt, i) => `
                        <button class="test-option-btn" data-index="${i}" style="background: var(--bg-color); border: 2px solid var(--border-color); padding: 1rem; border-radius: 12px; text-align: left; cursor: pointer; font-size: 1rem; transition: all 0.3s ease; width: 100%;">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.test-option-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showTestQuestion(step + 1));
        });
    }

    showTestResult() {
        const content = document.getElementById('constitution-test-content');
        const randomResult = KNOWLEDGE_BASE.nineConstitutions[Math.floor(Math.random() * KNOWLEDGE_BASE.nineConstitutions.length)];

        content.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 5rem; margin-bottom: 1rem;">${randomResult.icon}</div>
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">您的体质：${randomResult.name}</h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.8;">${randomResult.description}</p>
                <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; text-align: left;">
                    <h4 style="margin-bottom: 0.75rem; text-align: center;">🌟 个性化养生建议</h4>
                    <ul style="margin-left: 1.25rem;">
                        ${randomResult.tips ? randomResult.tips.map(tip => `<li style="margin-bottom: 0.5rem;">${tip}</li>`).join('') : `
                            <li style="margin-bottom: 0.5rem;">饮食调理：根据体质选择合适食物</li>
                            <li style="margin-bottom: 0.5rem;">运动锻炼：选择适合的运动方式</li>
                            <li style="margin-bottom: 0.5rem;">生活起居：顺应自然规律作息</li>
                            <li>情志调养：保持平和心态</li>
                        `}
                    </ul>
                </div>
                <button id="close-test-modal" style="background: linear-gradient(135deg, var(--accent-color) 0%, #228b22 100%); color: white; border: none; padding: 0.85rem 1.5rem; border-radius: 24px; cursor: pointer;">
                    完成测试
                </button>
            </div>
        `;

        document.getElementById('close-test-modal').addEventListener('click', () => this.closeModal());
    }

    closeModal() {
        document.getElementById('constitution-modal').classList.remove('active');
    }

    changeYear(delta) {
        const yearSpan = document.getElementById('current-year');
        let year = parseInt(yearSpan.textContent);
        year += delta;
        yearSpan.textContent = year;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new LingnanHealthAgent();
});
