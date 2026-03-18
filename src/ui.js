// UI渲染和更新模块
const GameUI = (function() {
    // DOM选择器
    function $(selector) {
        return document.getElementById(selector);
    }

    // 更新玩家属性显示
    function updateUI(player) {
        const xiuyiEl = $('xiuyi');
        if (xiuyiEl) xiuyiEl.innerText = player.Xiuyi;
        const tipaoEl = $('tipao');
        if (tipaoEl) tipaoEl.innerText = player.Tipao;
        const shoumingEl = $('shouming');
        if (shoumingEl) {
            // 显示寿命/上限
            if (typeof GameLogic !== 'undefined' && GameLogic.getLifespanCap) {
                var levelInfo2;
                if (typeof BreakthroughSystem !== 'undefined') {
                    levelInfo2 = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);
                } else {
                    levelInfo2 = LevelCalculator.calculateLevel(player.Xiuyi);
                }
                var cap = GameLogic.getLifespanCap(levelInfo2.level);
                shoumingEl.innerText = player.Shouming + '/' + cap;
            } else {
                shoumingEl.innerText = player.Shouming;
            }
        }
        const qiyunEl = $('qiyun');
        if (qiyunEl) qiyunEl.innerText = player.Qiyun;
        const yuanshenEl = $('yuanshen');
        if (yuanshenEl) yuanshenEl.innerText = player.Yuanshen;
        const ageEl = $('age');
        if (ageEl) ageEl.innerText = player.age;

        // 更新游玩界面顶部境界显示（集成突破系统）
        var levelInfo;
        if (typeof BreakthroughSystem !== 'undefined') {
            levelInfo = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);
        } else {
            levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);
        }
        const levelEl = $('level');
        if (levelEl) levelEl.innerText = levelInfo.levelName;
        const levelDescEl = $('level-desc');
        if (levelDescEl) {
            if (levelInfo.capped) {
                levelDescEl.innerText = '瓶颈！进入雷池渡劫突破';
                levelDescEl.style.color = '#e07830';
            } else {
                levelDescEl.innerText = levelInfo.description;
                levelDescEl.style.color = '';
            }
        }

        // 更新突破提示横幅
        var btBanner = $('breakthroughBanner');
        if (btBanner && typeof BreakthroughSystem !== 'undefined') {
            var btCheck = BreakthroughSystem.checkBreakthroughNeeded(levelInfo.level, player.Xiuyi);
            if (levelInfo.capped || btCheck) {
                var nextRealm = btCheck ? btCheck.nextRealmName : '下一境界';
                var baseRate = btCheck ? Math.round(btCheck.baseRate * 100) : '??';
                btBanner.style.display = 'block';
                btBanner.querySelector('.bt-text').innerText = '⚡ 修为已达瓶颈！点击进入雷池渡劫突破至' + nextRealm + '境界（基础几率' + baseRate + '%）';
            } else {
                btBanner.style.display = 'none';
            }
        }

        // 更新修为进度条
        updateXiuyiProgressBar(player.Xiuyi, levelInfo);

        // 显示/隐藏炼丹按钮和雷池按钮
        var alchemyBtn = $('alchemyBtn');
        if (alchemyBtn) alchemyBtn.style.display = 'inline-block';
        var tribulationBtn = $('tribulationBtn');
        if (tribulationBtn) tribulationBtn.style.display = 'inline-block';
    }

    // 添加日志
    function log(text, content = '') {
        const d = document.createElement('div');
        d.innerHTML = `<span>${text}</span> <span style="color:#f39c12">(${content})</span>`;
        $('log').appendChild(d);
        $('log').scrollTop = $('log').scrollHeight;
    }

    // 更新状态显示
    function updateStatus(text, color = '#fff') {
        $('status').innerText = text;
        $('status').style.color = color;
    }

    // 显示词条选择面板（隐藏人生经历和底部栏）
    function showWordPanel() {
        $('wordPanel').style.display = 'flex';
        $('status').style.display = 'none';
        // 隐藏人生经历面板
        const logPanel = $('log');
        if (logPanel && logPanel.parentElement) logPanel.parentElement.style.display = 'none';
        // 隐藏底部操作栏
        const bottomBar = document.querySelector('.bottom-bar');
        if (bottomBar) bottomBar.style.display = 'none';
        // 清除属性预览加成
        clearAttrPreview();
    }

    // 隐藏词条选择面板（恢复人生经历和底部栏）
    function hideWordPanel() {
        $('wordPanel').style.display = 'none';
        $('status').style.display = '';
        // 恢复人生经历面板
        const logPanel = $('log');
        if (logPanel && logPanel.parentElement) logPanel.parentElement.style.display = '';
        // 恢复底部操作栏
        const bottomBar = document.querySelector('.bottom-bar');
        if (bottomBar) bottomBar.style.display = '';
        // 清除属性预览加成
        clearAttrPreview();
    }

    // 更新属性预览加成（选中天赋时在属性栏显示+xxx）
    function updateAttrPreview(selectedWords) {
        const attrKeys = [
            { key: 'Xiuyi', elId: 'xiuyi' },
            { key: 'Tipao', elId: 'tipao' },
            { key: 'Shouming', elId: 'shouming' },
            { key: 'Qiyun', elId: 'qiyun' },
            { key: 'Yuanshen', elId: 'yuanshen' }
        ];
        // 先计算选中词条的总加成
        const bonus = {};
        attrKeys.forEach(a => bonus[a.key] = 0);
        selectedWords.forEach(w => {
            attrKeys.forEach(a => {
                if (w[a.key]) bonus[a.key] += w[a.key];
            });
        });
        // 在属性值右边显示加成
        attrKeys.forEach(a => {
            const el = $(a.elId);
            if (!el) return;
            // 移除旧的预览标签
            let preview = el.querySelector('.attr-preview');
            if (!preview) {
                preview = document.createElement('span');
                preview.className = 'attr-preview';
                el.appendChild(preview);
            }
            if (bonus[a.key] !== 0) {
                const sign = bonus[a.key] > 0 ? '+' : '';
                preview.innerText = sign + bonus[a.key];
                preview.style.display = '';
            } else {
                preview.style.display = 'none';
            }
        });
    }

    // 清除属性预览加成
    function clearAttrPreview() {
        document.querySelectorAll('.attr-preview').forEach(el => el.remove());
    }

    // 启用下一岁按钮
    function enableNextButton() {
        $('next').disabled = false;
    }

    // 禁用下一岁按钮
    function disableNextButton() {
        $('next').disabled = true;
    }

    // 隐藏下一岁/时钟按钮和其他操作按钮（死亡时调用）
    function hideNextButton() {
        var nextEl = $('next');
        if (nextEl) nextEl.style.display = 'none';
        var nextBtnEl = $('nextBtn');
        if (nextBtnEl) nextBtnEl.style.display = 'none';
        var skipEl = $('skip');
        if (skipEl) skipEl.style.display = 'none';
        // 保留菜单按钮和人物按钮可见
    }

    // 显示重生相关按钮（死亡后可以通过菜单返回主菜单）
    function showRebirthButton() {
        // rebirth按钮已移除，死亡后保持菜单按钮可见
        var menuBtn = $('menuBtn');
        if (menuBtn) menuBtn.style.display = 'inline-block';
    }

    // 隐藏重生相关按钮
    function hideRebirthButton() {
        // 不需要操作，菜单按钮由GameClock管理显示/隐藏
    }

    // 清空日志
    function clearLog() {
        $('log').innerHTML = '';
    }

    // 获取日志HTML（用于存档保存）
    function getLogHTML() {
        return $('log').innerHTML;
    }

    // 恢复日志HTML（用于存档加载）
    function restoreLog(html) {
        if (html) {
            $('log').innerHTML = html;
            $('log').scrollTop = $('log').scrollHeight;
        }
    }

    // 词条品质颜色配置（与装备品质一致）
    const WORD_QUALITY_COLORS = {
        1: { name: '白', color: '#ffffff', bgColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' },
        2: { name: '蓝', color: '#3498db', bgColor: 'rgba(52,152,219,0.2)', borderColor: 'rgba(52,152,219,0.6)' },
        3: { name: '紫', color: '#9b59b6', bgColor: 'rgba(155,89,182,0.25)', borderColor: 'rgba(155,89,182,0.7)' },
        4: { name: '粉', color: '#ff69b4', bgColor: 'rgba(255,105,180,0.25)', borderColor: 'rgba(255,105,180,0.7)' },
        5: { name: '金', color: '#ffd700', bgColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.7)' }
    };

    // 渲染词条列表
    function renderWords(words, onWordClick) {
        const wl = $('wordList');
        if (!wl) {
            console.error('wordList element not found!');
            return;
        }
        wl.innerHTML = '';
        words.forEach((w, i) => {
            // 外层容器（包含卡片+描述框）
            const cell = document.createElement('div');
            cell.className = 'word-cell';

            // 词条卡片（只显示名字，4字大小）
            const d = document.createElement('div');
            d.className = 'word-item';

            // 根据品质设置颜色
            const quality = w.Quality || 1;
            const qConfig = WORD_QUALITY_COLORS[quality] || WORD_QUALITY_COLORS[1];
            d.style.color = qConfig.color;
            d.style.background = qConfig.bgColor;
            d.style.borderColor = qConfig.borderColor;

            const nameSpan = document.createElement('div');
            nameSpan.className = 'word-name';
            nameSpan.innerText = w.Name;
            d.appendChild(nameSpan);
            cell.appendChild(d);

            // 属性描述框（在卡片下方，选中时显示）
            const attrs = [];
            if (w.Xiuyi && w.Xiuyi !== 0) attrs.push(`修为${w.Xiuyi > 0 ? '+' : ''}${w.Xiuyi}`);
            if (w.Tipao && w.Tipao !== 0) attrs.push(`体魄${w.Tipao > 0 ? '+' : ''}${w.Tipao}`);
            if (w.Qiyun && w.Qiyun !== 0) attrs.push(`气运${w.Qiyun > 0 ? '+' : ''}${w.Qiyun}`);
            if (w.Yuanshen && w.Yuanshen !== 0) attrs.push(`元神${w.Yuanshen > 0 ? '+' : ''}${w.Yuanshen}`);

            const descBox = document.createElement('div');
            descBox.className = 'word-desc-box';
            descBox.style.color = qConfig.color;
            descBox.innerText = attrs.length > 0 ? attrs.join(' / ') : ' ';
            cell.appendChild(descBox);

            d.onclick = () => onWordClick(i, d, cell);
            wl.appendChild(cell);
        });
    }

    // 显示人物页面
    function showCharacterPage() {
        $('characterPage').style.display = 'block';
    }

    // 隐藏人物页面
    function hideCharacterPage() {
        destroyTooltip(); // 关闭人物页面时清理悬浮提示
        $('characterPage').style.display = 'none';
    }

    // 更新人物页面属性
    function updateCharacterUI(player) {
        // 更新等级显示（集成突破系统）
        var levelInfo;
        if (typeof BreakthroughSystem !== 'undefined') {
            levelInfo = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);
        } else {
            levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);
        }
        $('char-level').innerText = levelInfo.levelName;
        if (levelInfo.capped) {
            $('char-level-desc').innerText = '瓶颈！需要突破丹药';
            $('char-level-desc').style.color = '#e07830';
        } else {
            $('char-level-desc').innerText = levelInfo.description;
            $('char-level-desc').style.color = '';
        }

        // 计算并显示战斗属性
        const equipments = EquipmentManager.getAllEquipped();
        const combatAttr = AttributeCalculator.calculateTotalAttributes(player, equipments);

        $('char-attack').innerText = formatValue(combatAttr.Attack);
        $('char-defense').innerText = formatValue(combatAttr.Defense);
        $('char-hp').innerText = formatValue(combatAttr.HP);
        $('char-dodge').innerText = formatValue(combatAttr.Dodge) + '%';
        $('char-criticalrate').innerText = formatValue(combatAttr.CriticalRate) + '%';
        $('char-mastery').innerText = formatValue(combatAttr.Mastery);
    }

    // 格式化数值（最大999999）
    function formatValue(value) {
        if (value === undefined || value === null) return '0';
        const num = parseInt(value) || 0;
        return Math.min(num, 999999).toString();
    }

    // 更新装备栏
    function updateEquipmentSlots(equipments) {
        for (let i = 1; i <= 6; i++) {
            const slot = $(`slot${i}`);
            if (!slot) continue;

            const number = slot.querySelector('.slot-number');
            const content = slot.querySelector('.slot-content');
            const equip = equipments.find(e => e.Column === i);

            // 移除旧图片
            const oldImage = slot.querySelector('.slot-image');
            if (oldImage) {
                oldImage.remove();
            }

            if (equip) {
                const info = EquipmentSystem.formatEquipmentInfo(equip);

                // 有装备时隐藏号位logo
                if (number) {
                    number.style.display = 'none';
                }

                // 添加装备图标
                if (equip.IconPath && equip.IconPath.trim() !== '') {
                    const img = document.createElement('img');
                    img.className = 'slot-image';
                    img.src = equip.IconPath;
                    img.onerror = function() {
                        this.style.display = 'none';
                        // 图标加载失败，显示文字
                        content.style.display = 'block';
                        content.innerText = info.name;
                        content.style.color = info.color;
                        // 绑定tooltip到文字内容
                        bindTooltipEvents(content, equip);
                    };
                    slot.insertBefore(img, content);
                    // 隐藏文字
                    content.style.display = 'none';
                    // 绑定tooltip到图标
                    bindTooltipEvents(img, equip);
                } else {
                    // 没有图标则显示文字
                    content.style.display = 'block';
                    content.innerText = info.name;
                    content.style.color = info.color;
                    // 绑定tooltip到文字内容
                    bindTooltipEvents(content, equip);
                }
                slot.style.borderColor = info.borderColor;
            } else {
                // 空栏位时显示号位logo
                if (number) {
                    number.style.display = 'block';
                }

                content.style.display = 'block';
                content.innerText = '空';
                content.style.color = '#aaa';
                slot.style.borderColor = '#3498db';
            }
        }
    }

    // 显示跳过按钮
    function showSkipButton() {
        $('skip').style.display = 'inline-block';
    }

    // 隐藏跳过按钮
    function hideSkipButton() {
        $('skip').style.display = 'none';
    }

    // 显示人物按钮
    function showCharacterButton() {
        $('character').style.display = 'inline-block';
    }

    // 隐藏人物按钮
    function hideCharacterButton() {
        $('character').style.display = 'none';
    }

    // 初始化背包界面
    function initBackpack() {
        const grid = $('backpack-grid');
        grid.innerHTML = '';
        for (let i = 0; i < 40; i++) {
            const slot = document.createElement('div');
            slot.className = 'backpack-slot';
            slot.id = `backpack-slot-${i}`;
            slot.textContent = '空';
            grid.appendChild(slot);
        }
    }

    // 更新背包显示
    function updateBackpack(items) {
        // 安全检查
        if (!items || !Array.isArray(items)) {
            console.error('updateBackpack: invalid items', items);
            return;
        }

        for (let i = 0; i < 40; i++) {
            const slot = $(`backpack-slot-${i}`);
            if (slot) {
                // 清空slot内容（包括文字和图片）
                slot.innerHTML = '';

                if (items[i]) {
                    const slotData = items[i];
                    // 用于收集需要绑定tooltip的元素
                    var tooltipTargets = [];

                    // 判断是物品还是装备
                    if (slotData.type === 'item') {
                        // ===== 物品类型 =====
                        slot.style.color = '#f1c40f';
                        slot.style.borderColor = '#f39c12';
                        slot.classList.add('has-item');

                        // 添加物品图标
                        if (slotData.iconPath && slotData.iconPath.trim() !== '') {
                            const img = document.createElement('img');
                            img.className = 'slot-image';
                            img.src = slotData.iconPath;
                            img.onerror = function() {
                                this.style.display = 'none';
                                // 图标加载失败，显示文字名称
                                const nameSpan = document.createElement('span');
                                nameSpan.className = 'slot-item-name';
                                nameSpan.textContent = slotData.itemName;
                                slot.appendChild(nameSpan);
                                // 绑定tooltip到新的文字元素
                                bindTooltipEvents(nameSpan, slotData);
                            };
                            slot.appendChild(img);
                            tooltipTargets.push(img);
                        } else {
                            // 没有图标，显示文字名称
                            const nameSpan = document.createElement('span');
                            nameSpan.className = 'slot-item-name';
                            nameSpan.textContent = slotData.itemName;
                            slot.appendChild(nameSpan);
                            tooltipTargets.push(nameSpan);
                        }

                        // 叠加数量
                        if (slotData.count > 1) {
                            const countSpan = document.createElement('span');
                            countSpan.className = 'slot-item-count';
                            countSpan.textContent = slotData.count;
                            slot.appendChild(countSpan);
                        }

                    } else {
                        // ===== 装备类型 =====
                        const info = EquipmentSystem.formatEquipmentInfo(slotData);
                        slot.style.color = info.color;
                        slot.style.borderColor = info.borderColor;
                        slot.classList.add('has-item');

                        // 添加装备图标
                        if (slotData.IconPath && slotData.IconPath.trim() !== '') {
                            const img = document.createElement('img');
                            img.className = 'slot-image';
                            img.src = slotData.IconPath;
                            img.onerror = function() {
                                this.style.display = 'none';
                                const text = document.createElement('span');
                                text.className = 'slot-item-name';
                                text.textContent = info.name;
                                slot.appendChild(text);
                                bindTooltipEvents(text, slotData);
                            };
                            slot.appendChild(img);
                            tooltipTargets.push(img);
                        } else {
                            const text = document.createElement('span');
                            text.className = 'slot-item-name';
                            text.textContent = info.name;
                            slot.appendChild(text);
                            tooltipTargets.push(text);
                        }
                    }

                    // 绑定悬浮提示事件到物品图标/文字而非格子
                    for (var t = 0; t < tooltipTargets.length; t++) {
                        bindTooltipEvents(tooltipTargets[t], slotData);
                    }
                } else {
                    slot.textContent = '空';
                    slot.style.color = '#aaa';
                    slot.style.borderColor = '#555';
                    slot.classList.remove('has-item');
                }
            }
        }
        // 更新背包计数
        const count = items.filter(item => item !== undefined && item !== null).length;
        $('backpack-count').textContent = `${count}/40`;
    }

    // ===== 背包悬浮提示窗系统 =====
    let activeTooltip = null;

    /**
     * 根据等级ID获取境界名称（如"练气1层"）
     */
    function getLevelNameById(levelId) {
        if (typeof LevelCalculator !== 'undefined') {
            var info = LevelCalculator.getLevelById(levelId);
            if (info && info.levelName) return info.levelName;
        }
        return '等级' + levelId;
    }

    // 绑定tooltip事件到指定元素
    function bindTooltipEvents(element, data) {
        element.addEventListener('mouseenter', function(e) {
            showTooltip(data, e);
        });
        element.addEventListener('mousemove', function(e) {
            positionTooltip(e);
        });
        element.addEventListener('mouseleave', function() {
            destroyTooltip();
        });
    }

    function destroyTooltip() {
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }
    }

    function showTooltip(slotData, event) {
        destroyTooltip();

        var tip = document.createElement('div');
        tip.className = 'bp-tooltip';

        var html = '';

        if (slotData.type === 'item') {
            // ===== 物品类型提示 =====
            html += '<div class="bp-tooltip-name" style="color:#f39c12">' + (slotData.itemName || '未知物品') + '</div>';
            html += '<div class="bp-tooltip-type">📦 物品</div>';
            if (slotData.itemDesc) {
                html += '<div class="bp-tooltip-desc">' + slotData.itemDesc + '</div>';
            }
            html += '<div class="bp-tooltip-count">数量：' + (slotData.count || 1) + ' / ' + (slotData.stackLimit || 99) + '</div>';
            // 辅助丹药使用效果提示
            if (slotData.itemId === 40101) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-desc" style="color:#2ecc71">🌿 使用效果：修为 +50</div>';
                html += '<div class="bp-tooltip-desc" style="color:#f39c12;font-size:11px">💡 点击即可使用</div>';
            } else if (slotData.itemId === 40102) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-desc" style="color:#00bcd4">💎 使用效果：体魄 +30</div>';
                html += '<div class="bp-tooltip-desc" style="color:#f39c12;font-size:11px">💡 点击即可使用</div>';
            } else if (slotData.itemId === 40103) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-desc" style="color:#e67e22">🔥 使用效果：修为 +30</div>';
                html += '<div class="bp-tooltip-desc" style="color:#f39c12;font-size:11px">💡 点击即可使用</div>';
            }
            // 查找物品价值
            var itemInfo = null;
            try { itemInfo = ShopSystem.getItemById(slotData.itemId); } catch(e) {}
            if (!itemInfo) {
                try { itemInfo = ItemSystem.getItemById(slotData.itemId); } catch(e) {}
            }
            if (itemInfo && itemInfo.Value) {
                html += '<div class="bp-tooltip-value">💰 价值：' + itemInfo.Value + ' / 个</div>';
            }
        } else {
            // ===== 装备类型提示 =====
            var info = EquipmentSystem.formatEquipmentInfo(slotData);
            html += '<div class="bp-tooltip-name" style="color:' + info.color + '">' + info.name + '</div>';
            html += '<div class="bp-tooltip-type">⚔️ 装备</div>';
            html += '<div class="bp-tooltip-quality" style="color:' + info.color + '">品质：' + (info.qualityName || '白') + '品</div>';
            html += '<div class="bp-tooltip-slot">栏位：' + (info.slotName || '未知') + '</div>';
            if (info.desc) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-desc">' + info.desc + '</div>';
            }
            // 基础属性（修为/体魄/寿命/气运/元神）
            var baseAttrs = [];
            if (slotData.Xiuyi) baseAttrs.push({ label: '修为', val: '+' + slotData.Xiuyi });
            if (slotData.Tipao) baseAttrs.push({ label: '体魄', val: '+' + slotData.Tipao });
            if (slotData.Shouming) baseAttrs.push({ label: '寿命', val: '+' + slotData.Shouming });
            if (slotData.Qiyun) baseAttrs.push({ label: '气运', val: '+' + slotData.Qiyun });
            if (slotData.Yuanshen) baseAttrs.push({ label: '元神', val: '+' + slotData.Yuanshen });
            if (baseAttrs.length > 0) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-section-title">📊 基础属性</div>';
                html += '<div class="bp-tooltip-attrs">';
                for (var ba = 0; ba < baseAttrs.length; ba++) {
                    html += '<div class="bp-tooltip-attr"><span class="attr-label">' + baseAttrs[ba].label + '</span><span class="attr-val" style="color:#2ecc71">' + baseAttrs[ba].val + '</span></div>';
                }
                html += '</div>';
            }
            // 战斗属性
            var attrs = [];
            if (slotData.Attack) attrs.push({ label: '攻击', val: '+' + slotData.Attack });
            if (slotData.Defense) attrs.push({ label: '防御', val: '+' + slotData.Defense });
            if (slotData.HP) attrs.push({ label: '生命', val: '+' + slotData.HP });
            if (slotData.Dodge) attrs.push({ label: '闪避', val: '+' + slotData.Dodge + '%' });
            if (slotData.CriticalRate) attrs.push({ label: '暴击率', val: '+' + slotData.CriticalRate + '%' });
            if (slotData.Mastery) attrs.push({ label: '精通', val: '+' + slotData.Mastery });
            if (attrs.length > 0) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-section-title">⚔️ 战斗属性</div>';
                html += '<div class="bp-tooltip-attrs">';
                for (var a = 0; a < attrs.length; a++) {
                    html += '<div class="bp-tooltip-attr"><span class="attr-label">' + attrs[a].label + '</span><span class="attr-val">' + attrs[a].val + '</span></div>';
                }
                html += '</div>';
            }
            // 等级要求（转为境界描述）
            if (slotData.LevelMin || slotData.LevelMax) {
                html += '<div class="bp-tooltip-divider"></div>';
                var minName = getLevelNameById(slotData.LevelMin || 1);
                var maxName = slotData.LevelMax ? getLevelNameById(slotData.LevelMax) : '无上限';
                html += '<div class="bp-tooltip-level">📏 等级要求：' + minName + ' ~ ' + maxName + '</div>';
            }
            if (slotData.Value) {
                html += '<div class="bp-tooltip-value">💰 价值：' + slotData.Value + '</div>';
            }
        }

        tip.innerHTML = html;
        document.body.appendChild(tip);
        activeTooltip = tip;

        // 定位：跟随鼠标位置，显示在右下方，超出屏幕则翻转
        positionTooltip(event);
    }

    function positionTooltip(event) {
        if (!activeTooltip) return;
        var tip = activeTooltip;
        var mx = event.clientX;
        var my = event.clientY;
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        var offsetX = 16, offsetY = 16;

        var left = mx + offsetX;
        var top = my + offsetY;

        // 超出右边界则翻到左边
        if (left + tw > ww - 10) {
            left = mx - tw - offsetX;
        }
        // 超出下边界则翻到上面
        if (top + th > wh - 10) {
            top = my - th - offsetY;
        }
        // 保证不超出左上角
        if (left < 5) left = 5;
        if (top < 5) top = 5;

        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    /**
     * 更新修为进度条
     */
    function updateXiuyiProgressBar(xiuyi, levelInfo) {
        var bar = $('xiuyiProgressBar');
        var fill = $('xiuyiProgressFill');
        var text = $('xiuyiProgressText');
        if (!bar || !fill || !text) return;

        if (levelInfo.capped) {
            // 瓶颈状态 - 满进度，闪烁提示
            fill.style.width = '100%';
            fill.style.background = 'linear-gradient(90deg, #e07830, #ff9800)';
            text.innerText = '瓶颈！需渡劫突破';
            text.style.color = '#fff';
            bar.style.display = 'block';
            return;
        }

        var nextLevel = LevelCalculator.getNextLevel(levelInfo.level);
        if (!nextLevel) {
            // 最高等级
            fill.style.width = '100%';
            fill.style.background = 'linear-gradient(90deg, #ffd700, #ff6b00)';
            text.innerText = '已达最高境界';
            text.style.color = '#fff';
            bar.style.display = 'block';
            return;
        }

        var currentReq = levelInfo.requiredXiuyi;
        var nextReq = nextLevel.requiredXiuyi;
        var range = nextReq - currentReq;
        var progress = xiuyi - currentReq;
        var percent = range > 0 ? Math.min(100, Math.max(0, (progress / range) * 100)) : 0;

        fill.style.width = percent.toFixed(1) + '%';
        fill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        text.innerText = formatLargeNumber(xiuyi) + ' / ' + formatLargeNumber(nextReq) + '（' + nextLevel.levelName + '）';
        text.style.color = 'rgba(255,255,255,0.9)';
        bar.style.display = 'block';
    }

    /**
     * 格式化大数字（万/亿/兆）
     */
    function formatLargeNumber(num) {
        if (num >= 1000000000000) {
            return (num / 1000000000000).toFixed(1) + '兆';
        } else if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        } else if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }

    // 显示通知消息
    function showNotification(message, duration = 2000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: rgba(231, 76, 60, 0.9);
            color: #fff;
            border-radius: 8px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // 暴露公共接口
    return {
        updateUI: updateUI,
        log: log,
        updateStatus: updateStatus,
        showWordPanel: showWordPanel,
        hideWordPanel: hideWordPanel,
        enableNextButton: enableNextButton,
        disableNextButton: disableNextButton,
        hideNextButton: hideNextButton,
        showRebirthButton: showRebirthButton,
        hideRebirthButton: hideRebirthButton,
        clearLog: clearLog,
        getLogHTML: getLogHTML,
        restoreLog: restoreLog,
        renderWords: renderWords,
        showCharacterPage: showCharacterPage,
        hideCharacterPage: hideCharacterPage,
        updateCharacterUI: updateCharacterUI,
        updateEquipmentSlots: updateEquipmentSlots,
        showSkipButton: showSkipButton,
        hideSkipButton: hideSkipButton,
        showCharacterButton: showCharacterButton,
        hideCharacterButton: hideCharacterButton,
        initBackpack: initBackpack,
        updateBackpack: updateBackpack,
        showNotification: showNotification,
        updateAttrPreview: updateAttrPreview,
        destroyTooltip: destroyTooltip
    };
})();
