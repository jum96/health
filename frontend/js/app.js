// 岭南康养·灵境向导 - 主应用逻辑

class LingnanHealthAgent {
    constructor() {
        this.currentTab = 'chat';
        this.currentPersona = 'default';
        this.conversationHistory = [];
        this.favorites = JSON.parse(localStorage.getItem('lingnanFavorites') || '[]');
        this.recognizing = false;
        this.recognition = null;
        this.dialectResponded = false;
        this.checkinData = JSON.parse(localStorage.getItem('lingnanCheckin') || '{}');
        this.reminders = JSON.parse(localStorage.getItem('lingnanReminders') || JSON.stringify(REMINDER_PRESETS));
        this.familyMembers = JSON.parse(localStorage.getItem('lingnanFamily') || '[]');
        this.currentTool = 'heritage-calendar';
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderSolarTerms();
        this.renderCultureContent('heritage');
        this.renderHealthContent('seasonal');
        this.showDailyTip();
        this.updateSolarCountdown();
        this.initVoiceRecognition();
        this.renderFavorites();
        this.renderToolsContent(this.currentTool);
    }

    bindEvents() {
        // 导航标签切换
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // 人格化切换
        document.querySelectorAll('.persona-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPersona(btn.dataset.persona));
        });

        // 发送消息
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('user-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 语音输入
        document.getElementById('voice-btn').addEventListener('click', () => this.startVoiceInput());

        // 快捷问题按钮
        document.querySelectorAll('.question-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('user-input').value = btn.dataset.question;
                this.sendMessage();
            });
        });

        // 文化分类切换
        document.querySelectorAll('#culture-panel .health-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#culture-panel .health-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCultureContent(btn.dataset.category);
            });
        });

        // 养生方案切换
        document.querySelectorAll('#health-panel .health-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#health-panel .health-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderHealthContent(btn.dataset.type);
            });
        });

        // 工具选项切换
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tool-option')) {
                document.querySelectorAll('.tool-option').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderToolsContent(e.target.dataset.type);
            }
        });

        // 体质测试
        document.getElementById('start-constitution-test').addEventListener('click', () => this.startConstitutionTest());

        // 模态框关闭 - 体质测试
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal('constitution-modal'));
        document.getElementById('constitution-modal').addEventListener('click', (e) => {
            if (e.target.id === 'constitution-modal') this.closeModal('constitution-modal');
        });

        // 模态框关闭 - 详情
        document.getElementById('detail-modal-close').addEventListener('click', () => this.closeModal('detail-modal'));
        document.getElementById('detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') this.closeModal('detail-modal');
        });

        // 年份选择
        document.getElementById('prev-year').addEventListener('click', () => this.changeYear(-1));
        document.getElementById('next-year').addEventListener('click', () => this.changeYear(1));
    }

    // ========== 人格化切换功能 ==========
    switchPersona(persona) {
        this.currentPersona = persona;
        document.querySelectorAll('.persona-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.persona === persona) {
                btn.classList.add('active');
            }
        });

        const config = PERSONA_CONFIG[persona];
        this.addMessage(config.greeting, 'assistant');
    }

    // ========== 方言检测功能 ==========
    detectDialect(message) {
        for (const [dialect, keywords] of Object.entries(DIALECT_KEYWORDS)) {
            for (const keyword of keywords) {
                if (message.includes(keyword)) {
                    return dialect;
                }
            }
        }
        return null;
    }

    applyPersonaStyle(text, persona) {
        switch (persona) {
            case 'mom':
                return `👵 阿仔/阿女，${text}\n\n记得保重身体啊！`;
            case 'doctor':
                return `👨‍⚕️ 【专业建议】\n\n${text}\n\n---\n*以上建议仅供参考，如有不适请及时就医*`;
            case 'young':
                return `😎 Hey！${text}\n\n有咩问题随时问我啦！`;
            default:
                return text;
        }
    }

    // ========== 功效卡生成功能 ==========
    generateEfficacyCard(type) {
        const card = EFFICACY_CARDS[type] || EFFICACY_CARDS.tea;
        return `
            <div class="efficacy-card">
                <div class="efficacy-card-header">
                    <div class="efficacy-card-icon">${card.icon}</div>
                    <div class="efficacy-card-title">
                        <h4>${card.name}</h4>
                        <p>${card.type}</p>
                    </div>
                </div>
                <div class="efficacy-tags">
                    ${card.tags.map(tag => `<span class="efficacy-tag">${tag}</span>`).join('')}
                </div>
                <div class="efficacy-section">
                    <h5>📋 配方</h5>
                    <p>${card.ingredients}</p>
                </div>
                <div class="efficacy-section">
                    <h5>✨ 功效</h5>
                    <ul>${card.effects.map(e => `<li>${e}</li>`).join('')}</ul>
                </div>
                <div class="efficacy-section">
                    <h5>👥 适合人群</h5>
                    <ul>${card.suitable.map(s => `<li>${s}</li>`).join('')}</ul>
                </div>
                <div class="warning-box">
                    <h6>⚠️ 禁忌</h6>
                    <p>${card.taboo.join('、')}</p>
                    <p style="margin-top: 0.5rem;">💡 ${card.tips}</p>
                </div>
            </div>
        `;
    }

    // ========== 养生工具箱功能 ==========
    renderToolsContent(type) {
        this.currentTool = type;
        const container = document.getElementById('tools-content');

        switch (type) {
            case 'heritage-calendar':
                this.renderHeritageCalendar(container);
                break;
            case 'checkin':
                this.renderCheckin(container);
                break;
            case 'music':
                this.renderMusic(container);
                break;
            case 'reminder':
                this.renderReminder(container);
                break;
            case 'family':
                this.renderFamily(container);
                break;
            case 'ingredients':
                this.renderIngredients(container);
                break;
        }
    }

    // 非遗日历
    renderHeritageCalendar(container) {
        const today = new Date();
        const monthDay = `${today.getMonth() + 1}-${today.getDate()}`;
        const todayEvent = HERITAGE_EVENTS.find(e => e.date === monthDay);

        container.innerHTML = `
            <div class="heritage-calendar-content">
                <div class="heritage-calendar-header">
                    <div class="heritage-date">${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日</div>
                </div>
                <div class="heritage-calendar-content">
                    ${todayEvent ? `
                        <div class="heritage-event-card">
                            <div class="heritage-event-year">${todayEvent.year}</div>
                            <div class="heritage-event-title">${todayEvent.title}</div>
                            <div class="heritage-event-desc">${todayEvent.desc}</div>
                        </div>
                    ` : `
                        <div class="heritage-event-card">
                            <div class="heritage-event-title">历史上的今天</div>
                            <div class="heritage-event-desc">暂无记录的非遗事件</div>
                        </div>
                    `}
                    <h4 style="margin-top: 2rem; margin-bottom: 1rem;">📜 更多历史事件</h4>
                    ${HERITAGE_EVENTS.map(event => `
                        <div class="heritage-event-card" style="margin-top: 0.75rem;">
                            <div class="heritage-event-year">${event.date} · ${event.year}</div>
                            <div class="heritage-event-title">${event.title}</div>
                            <div class="heritage-event-desc">${event.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // 养生打卡
    renderCheckin(container) {
        const today = new Date().toDateString();
        const todayCheckin = this.checkinData[today] || [];

        // 计算连续打卡天数
        let streak = 0;
        const sortedDates = Object.keys(this.checkinData).sort().reverse();
        for (let i = 0; i < sortedDates.length; i++) {
            const checkDate = new Date(sortedDates[i]);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            if (checkDate.toDateString() === expectedDate.toDateString()) {
                streak++;
            } else {
                break;
            }
        }

        container.innerHTML = `
            <div class="checkin-header">
                <h3>✅ 今日养生打卡</h3>
                <div class="checkin-streak">🔥 连续 ${streak} 天</div>
            </div>
            <div class="checkin-grid">
                ${CHECKIN_ITEMS.map(item => `
                    <div class="checkin-item ${todayCheckin.includes(item.id) ? 'checked' : ''}" data-checkin-id="${item.id}">
                        <div class="checkin-icon">${item.icon}</div>
                        <div class="checkin-label">${item.label}</div>
                    </div>
                `).join('')}
            </div>
            <div class="checkin-calendar">
                <div class="calendar-month">${new Date().getFullYear()}年${new Date().getMonth() + 1}月</div>
                <div class="calendar-grid">
                    ${this.renderCalendarDays()}
                </div>
            </div>
        `;

        // 绑定打卡事件
        container.querySelectorAll('.checkin-item').forEach(item => {
            item.addEventListener('click', () => this.toggleCheckin(item.dataset.checkinId));
        });
    }

    renderCalendarDays() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        let html = weekDays.map(d => `<div class="calendar-day header">${d}</div>`).join('');

        // 空白天数
        for (let i = 0; i < startDay; i++) {
            html += '<div class="calendar-day"></div>';
        }

        // 日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toDateString();
            const hasCheckin = this.checkinData[dateStr] && this.checkinData[dateStr].length > 0;
            const isToday = day === today.getDate();
            html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasCheckin ? 'checked' : ''}">${day}</div>`;
        }

        return html;
    }

    toggleCheckin(itemId) {
        const today = new Date().toDateString();
        if (!this.checkinData[today]) {
            this.checkinData[today] = [];
        }

        const index = this.checkinData[today].indexOf(itemId);
        if (index >= 0) {
            this.checkinData[today].splice(index, 1);
        } else {
            this.checkinData[today].push(itemId);
        }

        localStorage.setItem('lingnanCheckin', JSON.stringify(this.checkinData));
        this.renderToolsContent('checkin');
    }

    // 养生音乐
    renderMusic(container) {
        container.innerHTML = `
            <div class="music-category">
                <h4>😌 舒缓静心</h4>
                <div class="music-list">
                    ${HEALTH_MUSIC.calming.map((music, i) => this.renderMusicItem(music, 'calming', i)).join('')}
                </div>
            </div>
            <div class="music-category">
                <h4>💪 提神活力</h4>
                <div class="music-list">
                    ${HEALTH_MUSIC.energizing.map((music, i) => this.renderMusicItem(music, 'energizing', i)).join('')}
                </div>
            </div>
            <div class="music-category">
                <h4>😴 助眠安神</h4>
                <div class="music-list">
                    ${HEALTH_MUSIC.sleeping.map((music, i) => this.renderMusicItem(music, 'sleeping', i)).join('')}
                </div>
            </div>
            <div class="music-category">
                <h4>🧘 冥想禅修</h4>
                <div class="music-list">
                    ${HEALTH_MUSIC.meditation.map((music, i) => this.renderMusicItem(music, 'meditation', i)).join('')}
                </div>
            </div>
        `;

        container.querySelectorAll('.music-item').forEach(item => {
            item.addEventListener('click', () => {
                container.querySelectorAll('.music-item').forEach(i => i.classList.remove('playing'));
                item.classList.add('playing');
                alert(`🎵 正在播放：${item.querySelector('.music-title').textContent}\n\n（这是演示功能，实际需要音频文件）`);
            });
        });
    }

    renderMusicItem(music, category, index) {
        return `
            <div class="music-item" data-category="${category}" data-index="${index}">
                <div class="music-icon">${music.icon}</div>
                <div class="music-info">
                    <div class="music-title">${music.title}</div>
                    <div class="music-desc">${music.desc}</div>
                </div>
                <button class="music-play-btn">▶</button>
            </div>
        `;
    }

    // 养生提醒
    renderReminder(container) {
        container.innerHTML = `
            <div class="reminder-list">
                ${this.reminders.map((reminder, i) => `
                    <div class="reminder-item">
                        <div class="reminder-toggle ${reminder.active !== false ? 'active' : ''}" data-reminder-index="${i}"></div>
                        <div class="reminder-icon">${reminder.icon}</div>
                        <div class="reminder-info">
                            <div class="reminder-title">${reminder.title}</div>
                            <div class="reminder-time">${reminder.time} ${reminder.repeat ? '· 每日重复' : ''}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="add-reminder-btn">
                ➕ 添加新提醒
            </button>
        `;

        container.querySelectorAll('.reminder-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const index = parseInt(toggle.dataset.reminderIndex);
                this.reminders[index].active = !this.reminders[index].active;
                localStorage.setItem('lingnanReminders', JSON.stringify(this.reminders));
                this.renderToolsContent('reminder');
            });
        });

        container.querySelector('.add-reminder-btn').addEventListener('click', () => {
            const title = prompt('请输入提醒标题：');
            if (title) {
                const time = prompt('请输入提醒时间（如 08:00）：', '08:00');
                if (time) {
                    this.reminders.push({
                        id: Date.now(),
                        icon: '⏰',
                        title: title,
                        time: time,
                        repeat: true,
                        active: true
                    });
                    localStorage.setItem('lingnanReminders', JSON.stringify(this.reminders));
                    this.renderToolsContent('reminder');
                }
            }
        });
    }

    // 家庭健康档案
    renderFamily(container) {
        container.innerHTML = `
            <div class="family-members">
                ${this.familyMembers.map((member, i) => `
                    <div class="family-member-card" data-member-index="${i}">
                        <div class="member-avatar">${member.avatar}</div>
                        <div class="member-name">${member.name}</div>
                        <div class="member-info">${member.age}岁 · ${member.constitution}</div>
                    </div>
                `).join('')}
                <div class="family-member-card add-member-btn" id="add-family-member">
                    <div class="member-avatar">➕</div>
                    <div class="member-name">添加家人</div>
                </div>
            </div>
            ${this.familyMembers.length > 0 ? `
                <div class="health-record-section">
                    <h4>📋 健康记录</h4>
                    <div class="record-item">
                        <span class="record-label">最近更新</span>
                        <span class="record-value">${new Date().toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div class="record-item">
                        <span class="record-label">家人数量</span>
                        <span class="record-value">${this.familyMembers.length}人</span>
                    </div>
                </div>
            ` : ''}
        `;

        container.querySelectorAll('.family-member-card').forEach(card => {
            if (!card.id) {
                card.addEventListener('click', () => {
                    const index = parseInt(card.dataset.memberIndex);
                    const member = this.familyMembers[index];
                    alert(`👤 ${member.name}\n\n年龄：${member.age}岁\n体质：${member.constitution}\n备注：${member.notes || '无'}`);
                });
            }
        });

        const addBtn = container.getElementById('add-family-member');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const name = prompt('请输入家人姓名：');
                if (name) {
                    const age = prompt('请输入年龄：', '30');
                    const constitution = prompt('请输入体质类型（如平和质）：', '平和质');
                    const avatars = ['👨', '👩', '👦', '👧', '👴', '👵'];
                    this.familyMembers.push({
                        id: Date.now(),
                        name: name,
                        age: age || 30,
                        constitution: constitution || '平和质',
                        avatar: avatars[Math.floor(Math.random() * avatars.length)],
                        notes: ''
                    });
                    localStorage.setItem('lingnanFamily', JSON.stringify(this.familyMembers));
                    this.renderToolsContent('family');
                }
            });
        }
    }

    // 食材指南
    renderIngredients(container) {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const seasonNames = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };

        container.innerHTML = `
            <div class="ingredient-search">
                <input type="text" id="ingredient-search-input" placeholder="搜索食材...">
            </div>
            ${seasons.map(season => `
                <div class="ingredient-category">
                    <h4>🍃 ${seasonNames[season]}应季食材</h4>
                    <div class="ingredient-grid">
                        ${INGREDIENTS[season].map((ing, i) => `
                            <div class="ingredient-card" data-season="${season}" data-index="${i}">
                                <div class="ingredient-card-icon">${ing.icon}</div>
                                <div class="ingredient-card-name">${ing.name}</div>
                                <div class="ingredient-card-season">${ing.effect}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        container.querySelectorAll('.ingredient-card').forEach(card => {
            card.addEventListener('click', () => {
                const season = card.dataset.season;
                const index = parseInt(card.dataset.index);
                const ing = INGREDIENTS[season][index];
                this.showIngredientDetail(ing);
            });
        });
    }

    showIngredientDetail(ing) {
        document.getElementById('detail-modal-title').innerText = ing.icon + ' ' + ing.name;
        document.getElementById('detail-modal-body').innerHTML = `
            <div class="ingredient-detail-header">
                <div class="ingredient-detail-icon">${ing.icon}</div>
                <div>
                    <h3 style="margin-bottom: 0.5rem;">${ing.name}</h3>
                    <p style="color: var(--accent-color);">${ing.season}应季食材</p>
                </div>
            </div>
            <h4 style="color: var(--primary-color); margin: 1.5rem 0 0.75rem;">✨ 功效</h4>
            <p style="margin-bottom: 1rem;">${ing.effect}</p>
            <h4 style="color: var(--primary-color); margin-bottom: 0.75rem;">🛒 购买渠道</h4>
            <p style="margin-bottom: 1rem;">${ing.purchase}</p>
            <h4 style="color: var(--primary-color); margin-bottom: 0.75rem;">💡 选购贴士</h4>
            <p>${ing.tips}</p>
        `;
        document.getElementById('detail-modal').classList.add('active');
    }

    // ========== 原有的语音识别功能 ==========
    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'zh-CN';

            this.recognition.onstart = () => {
                this.recognizing = true;
                document.getElementById('voice-btn').classList.add('listening');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('user-input').value = transcript;
            };

            this.recognition.onend = () => {
                this.recognizing = false;
                document.getElementById('voice-btn').classList.remove('listening');
            };

            this.recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                this.recognizing = false;
                document.getElementById('voice-btn').classList.remove('listening');
            };
        }
    }

    startVoiceInput() {
        if (!this.recognition) {
            alert('您的浏览器不支持语音输入功能，请使用Chrome浏览器');
            return;
        }

        if (this.recognizing) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    // ========== 原有的每日贴士功能 ==========
    showDailyTip() {
        const tips = [
            '今日回南天，宜饮陈皮薏米水，健脾祛湿',
            '春夏养阳，早起晨练，舒展筋骨',
            '岭南气候湿热，少食辛辣油腻，多食清淡',
            '木棉花盛开，正是祛湿好时节',
            '饮早茶，一盅两件，享悠闲时光',
            '睡前泡脚，促进血液循环，助于睡眠',
            '三伏天宜艾灸，温阳散寒',
            '秋季干燥，多食雪梨、银耳，滋阴润燥',
            '冬季进补，宜温补不宜燥热',
            '每日八杯水，促进新陈代谢',
            '久坐伤肉，每隔一小时起身活动',
            '保持心情舒畅，肝气调达',
            '饭后百步走，活到九十九',
            '岭南凉茶，清热祛湿，但不宜过量',
            '春捂秋冻，顺应自然'
        ];

        const today = new Date().getDate();
        const tip = tips[today % tips.length];
        document.getElementById('daily-tip-content').innerText = tip;
    }

    updateSolarCountdown() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        const solarTermsWithDates = [
            { name: '立春', month: 2, day: 4 },
            { name: '雨水', month: 2, day: 19 },
            { name: '惊蛰', month: 3, day: 6 },
            { name: '春分', month: 3, day: 21 },
            { name: '清明', month: 4, day: 5 },
            { name: '谷雨', month: 4, day: 20 },
            { name: '立夏', month: 5, day: 6 },
            { name: '小满', month: 5, day: 21 },
            { name: '芒种', month: 6, day: 6 },
            { name: '夏至', month: 6, day: 22 },
            { name: '小暑', month: 7, day: 7 },
            { name: '大暑', month: 7, day: 23 },
            { name: '立秋', month: 8, day: 8 },
            { name: '处暑', month: 8, day: 23 },
            { name: '白露', month: 9, day: 8 },
            { name: '秋分', month: 9, day: 23 },
            { name: '寒露', month: 10, day: 8 },
            { name: '霜降', month: 10, day: 24 },
            { name: '立冬', month: 11, day: 8 },
            { name: '小雪', month: 11, day: 22 },
            { name: '大雪', month: 12, day: 7 },
            { name: '冬至', month: 12, day: 22 },
            { name: '小寒', month: 1, day: 6 },
            { name: '大寒', month: 1, day: 20 }
        ];

        let nextTerm = null;
        for (let i = 0; i < solarTermsWithDates.length; i++) {
            const term = solarTermsWithDates[i];
            if (term.month > currentMonth || (term.month === currentMonth && term.day >= currentDay)) {
                nextTerm = term;
                break;
            }
        }

        if (!nextTerm) {
            nextTerm = solarTermsWithDates[0];
        }

        let daysToTerm = 0;
        if (nextTerm.month === currentMonth) {
            daysToTerm = nextTerm.day - currentDay;
        } else {
            const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            daysToTerm = (daysInMonth[currentMonth - 1] - currentDay) + nextTerm.day;
        }

        if (daysToTerm === 0) {
            document.getElementById('solar-countdown').innerHTML = `🎉 今天是 <strong>${nextTerm.name}</strong>！`;
        } else {
            document.getElementById('countdown-days').innerText = daysToTerm;
            const countdownEl = document.getElementById('solar-countdown');
            countdownEl.innerHTML = `距 <strong>${nextTerm.name}</strong> 还有 <span id="countdown-days">${daysToTerm}</span> 天`;
        }
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

        // 方言检测
        if (!this.dialectResponded) {
            const dialect = this.detectDialect(message);
            if (dialect) {
                this.addMessage(message, 'user');
                input.value = '';
                this.addMessage(DIALECT_RESPONSES[dialect], 'assistant');
                this.dialectResponded = true;
                return;
            }
        }

        // 功效卡触发检测
        if (message.includes('五花茶') || message.includes('凉茶')) {
            this.addMessage(message, 'user');
            input.value = '';
            const cardHtml = this.generateEfficacyCard('liangcha');
            this.addMessageWithCard('这是五花茶的详细介绍：', cardHtml, 'assistant');
            return;
        }
        if (message.includes('冬瓜') || message.includes('汤')) {
            this.addMessage(message, 'user');
            input.value = '';
            const cardHtml = this.generateEfficacyCard('soup');
            this.addMessageWithCard('这是冬瓜薏米排骨汤的详细介绍：', cardHtml, 'assistant');
            return;
        }

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
                const styledResponse = this.applyPersonaStyle(data.message, this.currentPersona);
                this.addMessage(styledResponse, 'assistant');
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
        const styledResponse = this.applyPersonaStyle(localResponse, this.currentPersona);
        this.addMessage(styledResponse, 'assistant');
        this.conversationHistory.push({ role: 'user', content: message });
        this.conversationHistory.push({ role: 'assistant', content: localResponse });
    }

    addMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = type === 'assistant' ? (PERSONA_CONFIG[this.currentPersona]?.icon || '🏮') : '👤';
        const formattedText = this.formatMessage(text);
        const messageId = Date.now();

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formattedText}</div>
                ${type === 'assistant' ? `
                    <div class="message-actions">
                        <button class="action-btn copy-btn" data-id="${messageId}">📋 复制</button>
                        <button class="action-btn favorite-btn" data-id="${messageId}" data-text="${encodeURIComponent(text)}">⭐ 收藏</button>
                    </div>
                ` : ''}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // 绑定复制和收藏按钮事件
        if (type === 'assistant') {
            messageDiv.querySelector('.copy-btn').addEventListener('click', (e) => {
                this.copyMessage(text);
                e.target.innerText = '✅ 已复制';
                setTimeout(() => {
                    e.target.innerText = '📋 复制';
                }, 2000);
            });

            messageDiv.querySelector('.favorite-btn').addEventListener('click', (e) => {
                const textToSave = decodeURIComponent(e.target.dataset.text);
                this.toggleFavorite(textToSave, e.target);
            });
        }
    }

    addMessageWithCard(text, cardHtml, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = type === 'assistant' ? (PERSONA_CONFIG[this.currentPersona]?.icon || '🏮') : '👤';
        const formattedText = this.formatMessage(text);
        const messageId = Date.now();

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${formattedText}</div>
                ${cardHtml}
                ${type === 'assistant' ? `
                    <div class="message-actions">
                        <button class="action-btn copy-btn" data-id="${messageId}">📋 复制</button>
                        <button class="action-btn favorite-btn" data-id="${messageId}" data-text="${encodeURIComponent(text)}">⭐ 收藏</button>
                    </div>
                ` : ''}
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    copyMessage(text) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('复制成功');
        }).catch(err => {
            console.error('复制失败:', err);
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }

    toggleFavorite(text, btn) {
        const existingIndex = this.favorites.findIndex(f => f.text === text);
        if (existingIndex >= 0) {
            this.favorites.splice(existingIndex, 1);
            btn.classList.remove('favorited');
            btn.innerHTML = '⭐ 收藏';
        } else {
            this.favorites.push({
                id: Date.now(),
                text: text,
                date: new Date().toLocaleDateString('zh-CN')
            });
            btn.classList.add('favorited');
            btn.innerHTML = '⭐ 已收藏';
        }
        localStorage.setItem('lingnanFavorites', JSON.stringify(this.favorites));
        this.renderFavorites();
    }

    renderFavorites() {
        const container = document.getElementById('favorites-section');
        const list = document.getElementById('favorites-list');

        if (this.favorites.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = this.favorites.slice(0, 5).map(f => `
            <div class="favorite-item" data-id="${f.id}">
                ${f.text.substring(0, 30)}${f.text.length > 30 ? '...' : ''}
            </div>
        `).join('');

        list.querySelectorAll('.favorite-item').forEach(item => {
            item.addEventListener('click', () => {
                const fav = this.favorites.find(f => f.id == item.dataset.id);
                if (fav) {
                    document.getElementById('user-input').value = `查看收藏内容：${fav.text.substring(0, 50)}...`;
                }
            });
        });
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
            if (p.trim().startsWith('<h3') || p.trim().startsWith('<h4') || p.trim().startsWith('<div')) {
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

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                ${items.map((item, index) => `
                    <div class="culture-card" data-category="${category}" data-index="${index}">
                        <div class="culture-card-image" style="height: 140px; font-size: 3rem;">${item.icon}</div>
                        <div class="culture-card-content">
                            <h3 class="culture-card-title">${item.title}</h3>
                            <p class="culture-card-desc">${item.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定点击事件
        container.querySelectorAll('.culture-card').forEach(card => {
            card.addEventListener('click', () => {
                const cat = card.dataset.category;
                const idx = parseInt(card.dataset.index);
                this.showCultureDetail(cat, idx);
            });
        });
    }

    showCultureDetail(category, index) {
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

        const item = items[index];
        if (!item) return;

        document.getElementById('detail-modal-title').innerText = item.icon + ' ' + item.title;

        let content = `<p style="font-size: 1.05rem; margin-bottom: 1rem;"><strong>${item.description}</strong></p>`;

        if (item.content) {
            if (typeof item.content === 'string') {
                content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">详细介绍</h3><p>${item.content}</p>`;
            } else {
                if (item.content.history) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">历史渊源</h3><p>${item.content.history}</p>`;
                }
                if (item.content.healthWisdom) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">健康智慧</h3><p>${item.content.healthWisdom}</p>`;
                }
                if (item.content.formulas && Array.isArray(item.content.formulas)) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">经典配方</h3><ul style="margin-left: 1.5rem;">`;
                    item.content.formulas.forEach(f => {
                        content += `<li style="margin-bottom: 0.75rem;"><strong>${f.name}</strong>：${f.ingredients}<br><em style="color: var(--text-secondary);">功效：${f.effect}</em></li>`;
                    });
                    content += `</ul>`;
                }
                if (item.content.healthBenefits && Array.isArray(item.content.healthBenefits)) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">健康价值</h3><ul style="margin-left: 1.5rem;">`;
                    item.content.healthBenefits.forEach(h => content += `<li style="margin-bottom: 0.5rem;">${h}</li>`);
                    content += `</ul>`;
                }
                if (item.content.health) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">健康价值</h3><p>${item.content.health}</p>`;
                }
                if (item.content.culture) {
                    content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">文化内涵</h3><p>${item.content.culture}</p>`;
                }
            }
        }

        document.getElementById('detail-modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    renderHealthContent(type) {
        const container = document.getElementById('health-content');

        switch (type) {
            case 'seasonal':
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                        ${KNOWLEDGE_BASE.seasonalHealth.map((data, idx) => `
                            <div class="culture-card" data-health-type="seasonal" data-index="${idx}">
                                <div class="culture-card-image" style="height: 140px; font-size: 3.5rem;">${data.icon}</div>
                                <div class="culture-card-content">
                                    <h3 class="culture-card-title">${data.title}</h3>
                                    <p style="margin-bottom: 0.5rem;"><strong>原则：</strong>${data.principle}</p>
                                    <p class="culture-card-desc" style="margin-bottom: 0.5rem;">${data.tips.join(' ')}</p>
                                    <p style="font-size: 0.9rem;"><strong>推荐：</strong>${data.foods.slice(0, 5).join('、')}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'constitution':
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
                        ${KNOWLEDGE_BASE.nineConstitutions.map((cons, idx) => `
                            <div class="culture-card" data-health-type="constitution" data-index="${idx}">
                                <div class="culture-card-image" style="height: 100px; font-size: 2.8rem;">${cons.icon}</div>
                                <div class="culture-card-content">
                                    <h3 class="culture-card-title">${cons.name}</h3>
                                    <p class="culture-card-desc">${cons.description}</p>
                                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);"><strong>特点：</strong>${cons.feature}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;

            case 'diet':
                container.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem;">
                        ${KNOWLEDGE_BASE.herbalSoups.map((soup, idx) => `
                            <div class="culture-card" data-health-type="diet" data-index="${idx}">
                                <div class="culture-card-image" style="height: 130px; font-size: 3.2rem;">${soup.icon}</div>
                                <div class="culture-card-content">
                                    <h3 class="culture-card-title">${soup.name}</h3>
                                    <p style="margin-bottom: 0.5rem;"><strong>功效：</strong>${soup.effect}</p>
                                    <p style="margin-bottom: 0.5rem;"><strong>季节：</strong>${soup.season}</p>
                                    <p class="culture-card-desc"><strong>材料：</strong>${soup.ingredients}</p>
                                    ${soup.description ? `<p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">${soup.description}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
        }

        // 绑定点击事件
        container.querySelectorAll('.culture-card').forEach(card => {
            card.addEventListener('click', () => {
                const healthType = card.dataset.healthType;
                const idx = parseInt(card.dataset.index);
                this.showHealthDetail(healthType, idx);
            });
        });
    }

    showHealthDetail(type, index) {
        let content = '';
        let title = '';
        let icon = '';

        if (type === 'seasonal') {
            const data = KNOWLEDGE_BASE.seasonalHealth[index];
            icon = data.icon;
            title = data.title;
            content = `
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">养生原则</h3>
                <p style="margin-bottom: 1rem;">${data.principle}</p>
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">养生要点</h3>
                <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
                    ${data.tips.map(tip => `<li style="margin-bottom: 0.5rem;">${tip}</li>`).join('')}
                </ul>
                ${data.soups ? `<h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">推荐汤品</h3><p style="margin-bottom: 1rem;">${data.soups.join('、')}</p>` : ''}
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">推荐食材</h3>
                <p>${data.foods.join('、')}</p>
            `;
        } else if (type === 'constitution') {
            const data = KNOWLEDGE_BASE.nineConstitutions[index];
            icon = data.icon;
            title = data.name;
            content = `
                <p style="font-size: 1.05rem; margin-bottom: 1rem;"><strong>${data.description}</strong></p>
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">特征</h3>
                <p style="margin-bottom: 1rem;">${data.feature}</p>
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">养生建议</h3>
                <ul style="margin-left: 1.5rem;">
                    ${data.tips.map(tip => `<li style="margin-bottom: 0.5rem;">${tip}</li>`).join('')}
                </ul>
            `;
        } else if (type === 'diet') {
            const data = KNOWLEDGE_BASE.herbalSoups[index];
            icon = data.icon;
            title = data.name;
            content = `
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">功效</h3>
                <p style="margin-bottom: 1rem;">${data.effect}</p>
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">适用季节</h3>
                <p style="margin-bottom: 1rem;">${data.season}</p>
                <h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">材料</h3>
                <p style="margin-bottom: 1rem;">${data.ingredients}</p>
                ${data.description ? `<h3 style="color: var(--primary-color); margin-bottom: 0.75rem;">说明</h3><p>${data.description}</p>` : ''}
            `;
        }

        document.getElementById('detail-modal-title').innerText = icon + ' ' + title;
        document.getElementById('detail-modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    renderSolarTerms() {
        const container = document.getElementById('solar-terms-grid');
        container.innerHTML = KNOWLEDGE_BASE.solarTerms.map((term, idx) => `
            <div class="solar-term-card" data-term-index="${idx}">
                <div class="solar-term-icon">${term.icon}</div>
                <div class="solar-term-name">${term.name}</div>
                <div class="solar-term-date">${term.date}</div>
            </div>
        `).join('');

        // 绑定点击事件
        container.querySelectorAll('.solar-term-card').forEach(card => {
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.termIndex);
                this.showSolarTermDetail(idx);
            });
        });
    }

    showSolarTermDetail(index) {
        const term = KNOWLEDGE_BASE.solarTerms[index];

        document.getElementById('detail-modal-title').innerText = term.icon + ' ' + term.name;

        let content = `<p style="margin-bottom: 1rem;"><strong>日期：</strong>${term.date}</p>`;

        if (term.health) {
            content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">养生要点</h3><p style="margin-bottom: 1rem;">${term.health}</p>`;
        }

        if (term.custom) {
            content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">民俗活动</h3><p style="margin-bottom: 1rem;">${term.custom}</p>`;
        }

        if (term.foods) {
            content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">应节食品</h3><p style="margin-bottom: 1rem;">${term.foods.join('、')}</p>`;
        }

        if (term.tea) {
            content += `<h3 style="color: var(--primary-color); margin: 1rem 0 0.5rem;">推荐茶饮</h3><p style="margin-bottom: 1rem;">${term.tea}</p>`;
        }

        content += `
            <p style="color: #666; font-size: 0.9rem; margin-top: 1.5rem;">
                💡 提示：节气养生应结合岭南气候特点，注重祛湿、清热、润燥的调整。
            </p>
        `;

        document.getElementById('detail-modal-body').innerHTML = content;
        document.getElementById('detail-modal').classList.add('active');
    }

    startConstitutionTest() {
        const modal = document.getElementById('constitution-modal');
        const content = document.getElementById('constitution-test-content');

        content.innerHTML = `
            <div style="text-align: center; padding: 2rem 0;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🧘</div>
                <h3 style="margin-bottom: 1rem;">九种体质自测</h3>
                <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                    通过回答5个简单问题，了解您的体质类型，获取个性化养生建议
                </p>
                <button id="begin-test" style="background: linear-gradient(135deg, var(--primary-color) 0%, #8b0000 100%); color: white; border: none; padding: 1rem 2rem; border-radius: 30px; font-size: 1rem; cursor: pointer;">
                    开始测试
                </button>
            </div>
        `;

        modal.classList.add('active');

        document.getElementById('begin-test').addEventListener('click', () => this.showTestQuestion(1, {}));
    }

    showTestQuestion(step, answers) {
        const content = document.getElementById('constitution-test-content');
        const questions = [
            {
                q: '您的体力如何？',
                key: 'energy',
                options: [
                    { text: '精力充沛，很少感到疲劳', value: 'pinghe' },
                    { text: '容易疲劳，不想多说话', value: 'qixu' },
                    { text: '怕冷，手脚冰凉', value: 'yangxu' },
                    { text: '怕热，手心脚心发热', value: 'yinxu' }
                ]
            },
            {
                q: '您的体型特征是？',
                key: 'body',
                options: [
                    { text: '体型匀称，不胖不瘦', value: 'pinghe' },
                    { text: '体型偏胖，腹部松软', value: 'tanshi' },
                    { text: '体型偏瘦，容易上火', value: 'yinxu' },
                    { text: '不一定，时胖时瘦', value: 'qiyu' }
                ]
            },
            {
                q: '您的面色和皮肤状态？',
                key: 'skin',
                options: [
                    { text: '面色红润，皮肤光泽', value: 'pinghe' },
                    { text: '面色暗沉，容易长痘', value: 'shire' },
                    { text: '皮肤干燥，口干舌燥', value: 'yinxu' },
                    { text: '肤色晦暗，容易有瘀斑', value: 'xueyu' }
                ]
            },
            {
                q: '您的饮食习惯偏好？',
                key: 'diet',
                options: [
                    { text: '饮食均衡，不挑食', value: 'pinghe' },
                    { text: '喜欢喝热饮，怕冷食', value: 'yangxu' },
                    { text: '喜欢喝凉饮，怕热', value: 'yinxu' },
                    { text: '喜欢油腻、甜食', value: 'tanshi' }
                ]
            },
            {
                q: '您的情绪和睡眠状态？',
                key: 'mood',
                options: [
                    { text: '情绪稳定，睡眠良好', value: 'pinghe' },
                    { text: '容易焦虑，睡眠不好', value: 'qiyu' },
                    { text: '容易急躁，睡眠多梦', value: 'ganwang' },
                    { text: '容易健忘，睡眠不安', value: 'xueyu' }
                ]
            }
        ];

        if (step > questions.length) {
            this.showTestResult(answers);
            return;
        }

        const question = questions[step - 1];
        content.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">问题 ${step}/${questions.length}</div>
                <h3 style="margin-bottom: 1.5rem;">${question.q}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${question.options.map((opt, i) => `
                        <button class="test-option-btn" data-key="${question.key}" data-value="${opt.value}" style="background: var(--bg-color); border: 2px solid var(--border-color); padding: 1rem; border-radius: 12px; text-align: left; cursor: pointer; font-size: 1rem; transition: all 0.3s ease; width: 100%;">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        document.querySelectorAll('.test-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newAnswers = { ...answers };
                newAnswers[btn.dataset.key] = btn.dataset.value;
                this.showTestQuestion(step + 1, newAnswers);
            });
        });
    }

    showTestResult(answers) {
        const content = document.getElementById('constitution-test-content');

        // 统计答案
        const counts = {};
        Object.values(answers).forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
        });

        // 找出最多的体质类型
        let maxCount = 0;
        let resultType = 'pinghe';
        Object.entries(counts).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                resultType = type;
            }
        });

        // 找到对应的体质数据
        let resultData = KNOWLEDGE_BASE.nineConstitutions.find(c => c.id === resultType);
        if (!resultData) {
            resultData = KNOWLEDGE_BASE.nineConstitutions[0];
        }

        content.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 5rem; margin-bottom: 1rem;">${resultData.icon}</div>
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">您的体质：${resultData.name}</h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.8;">${resultData.description}</p>
                <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; text-align: left;">
                    <h4 style="margin-bottom: 0.75rem; text-align: center;">🌟 个性化养生建议</h4>
                    <ul style="margin-left: 1.25rem;">
                        ${resultData.tips ? resultData.tips.map(tip => `<li style="margin-bottom: 0.5rem;">${tip}</li>`).join('') : `
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

        document.getElementById('close-test-modal').addEventListener('click', () => this.closeModal('constitution-modal'));
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
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
