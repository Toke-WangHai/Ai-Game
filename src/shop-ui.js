// ===== 商店系统UI模块 =====
var ShopUI = (function() {

    // 轻量更新：仅更新倒计时和灵石持有量文本，不重建DOM
    function updateShopTimers() {
        var secs = ShopSystem.getRemainingSeconds();
        var m = Math.floor(secs / 60), s = secs % 60;
        var cd = document.getElementById('shopCountdown');
        if (cd) cd.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

        // 更新兑换区域的持有量文本（不重建DOM）
        var exHaveSpans = document.querySelectorAll('#exchangeGrid .exchange-item .exchange-have-count');
        var exConfig = ShopSystem.getExchangeConfig();
        for (var i = 0; i < exHaveSpans.length && i < exConfig.length; i++) {
            var have = ShopSystem.countItemInBP(exConfig[i].from);
            exHaveSpans[i].textContent = have;
            var btn = exHaveSpans[i].closest('.exchange-item').querySelector('.exchange-btn');
            if (btn) {
                if (have < exConfig[i].rate) {
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.opacity = '';
                    btn.style.cursor = '';
                }
            }
        }
    }

    // 完整渲染商店UI
    function renderShopUI() {
        // 倒计时
        var secs = ShopSystem.getRemainingSeconds();
        var m = Math.floor(secs / 60), s = secs % 60;
        var cd = document.getElementById('shopCountdown');
        if (cd) cd.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;

        // 商品栏位
        var grid = document.getElementById('shopGrid');
        var slots = ShopSystem.getCurrentSlots();
        grid.innerHTML = '';
        for (var i = 0; i < 6; i++) {
            var si = slots[i];
            var div = document.createElement('div');
            div.className = 'shop-slot' + (si ? '' : ' sold');
            if (si) {
                var iconHtml = '';
                if (si.iconPath && si.iconPath.trim() !== '') {
                    iconHtml = '<div class="shop-slot-icon"><img src="' + si.iconPath + '" style="width:36px;height:36px;object-fit:contain" onerror="this.parentElement.innerHTML=\'' + (si.itemType === 1 ? '📦' : '⚔️') + '\'"></div>';
                } else {
                    var typeIcon = si.itemType === 1 ? '📦' : '⚔️';
                    iconHtml = '<div class="shop-slot-icon">' + typeIcon + '</div>';
                }
                div.innerHTML = iconHtml +
                    '<div class="shop-slot-name" style="color:' + si.displayColor + '">' + si.displayName + '</div>' +
                    '<div class="shop-slot-desc">' + si.displayDesc + '</div>' +
                    '<div class="shop-slot-price">' + si.price + ' ' + si.currencyName + '</div>';

                // 绑定悬浮提示
                bindShopTooltip(div, si);

                (function(idx) {
                    div.onclick = function() {
                        var result = ShopSystem.buyItem(idx);
                        if (typeof AudioManager !== 'undefined') {
                            if (result.success) AudioManager.playSfxItem();
                            else AudioManager.playSfxFail();
                        }
                        GameDialog.alert({ title: result.success ? '购买成功' : '购买失败', message: result.message, type: result.success ? 'success' : 'warning' });
                        renderShopUI();
                    };
                })(i);
            } else {
                div.innerHTML = '<div class="shop-slot-icon" style="opacity:0.3">🚫</div><div style="color:#666">已售罄</div>';
            }
            grid.appendChild(div);
        }

        // 灵石兑换
        var exGrid = document.getElementById('exchangeGrid');
        var exConfig = ShopSystem.getExchangeConfig();
        exGrid.innerHTML = '';
        exConfig.forEach(function(ex, idx) {
            var have = ShopSystem.countItemInBP(ex.from);
            var div = document.createElement('div');
            div.className = 'exchange-item';
            div.innerHTML = '<div class="exchange-info">' +
                '<span class="highlight">' + ex.rate + '</span> ' + ex.fromName +
                ' → <span class="highlight">1</span> ' + ex.toName +
                '<br><span style="font-size:11px;color:#888">当前持有：<span class="exchange-have-count">' + have + '</span></span></div>' +
                '<button class="exchange-btn" ' + (have < ex.rate ? 'style="opacity:0.5;cursor:not-allowed"' : '') + '>兑换</button>';
            var btn = div.querySelector('.exchange-btn');
            (function(exIdx, canExchange) {
                btn.onclick = function() {
                    if (!canExchange) { GameDialog.alert({ title: '兑换失败', message: '材料不足！', type: 'warning' }); return; }
                    var r = ShopSystem.exchangeStones(exIdx, 1);
                    GameDialog.alert({ title: r.success ? '兑换成功' : '兑换失败', message: r.message, type: r.success ? 'success' : 'warning' });
                    renderShopUI();
                };
            })(idx, have >= ex.rate);
            exGrid.appendChild(div);
        });
    }

    function openShopPage() {
        var page = document.getElementById('shopPage');
        page.style.display = 'block';
        var slots = ShopSystem.getCurrentSlots();
        var allEmpty = slots.every(function(s) { return s === null; });
        if (allEmpty) ShopSystem.refreshShop();
        if (!ShopSystem.isTimerRunning()) {
            ShopSystem.startTimer();
        }
        // 【BUG修复】注册轻量回调：定时器每200ms仅更新倒计时文本，不重建DOM
        ShopSystem.setRefreshCallback(updateShopTimers);
        // 完整渲染一次商品格子
        renderShopUI();
        setTimeout(handleResize, 50);
    }

    function closeShopPage() {
        document.getElementById('shopPage').style.display = 'none';
        ShopSystem.setRefreshCallback(null);
        destroyShopTooltip();
    }

    function openSellDialog() {
        var bp = GameLogic.getBackpack();
        // selMap: key=格子索引, value=出售数量（装备为1，物品可为1~count）
        var selMap = {};
        var overlay = document.createElement('div');
        overlay.className = 'sell-overlay';
        overlay.id = 'sellOverlay';

        var html = '<div class="sell-dialog">' +
            '<div class="sell-dialog-title">💰 选择要贩卖的物品</div>' +
            '<div class="sell-backpack-grid" id="sellBpGrid"></div>' +
            '<div class="sell-total" id="sellTotal">预计收入：0 下品灵石</div>' +
            '<div class="sell-buttons">' +
                '<button class="btn btn-warning" id="confirmSell">确认贩卖</button>' +
                '<button class="btn btn-primary" id="cancelSell">取消</button>' +
            '</div></div>';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        function renderSellGrid() {
            var grid = document.getElementById('sellBpGrid');
            grid.innerHTML = '';
            var totalVal = 0;
            for (var i = 0; i < 40; i++) {
                var slot = document.createElement('div');
                slot.className = 'sell-slot';
                var item = bp[i];
                if (item) {
                    slot.classList.add('has-item');
                    if (item.type === 'item') {
                        var nameS = document.createElement('span');
                        nameS.className = 'slot-item-name';
                        nameS.textContent = item.itemName;
                        slot.appendChild(nameS);
                        if (item.count > 1) {
                            var cS = document.createElement('span');
                            cS.className = 'slot-item-count';
                            cS.textContent = item.count;
                            slot.appendChild(cS);
                        }
                        slot.style.borderColor = '#f39c12';
                    } else {
                        var info = EquipmentSystem.formatEquipmentInfo(item);
                        slot.textContent = info.name;
                        slot.style.color = info.color;
                        slot.style.borderColor = info.borderColor;
                        slot.style.fontSize = '9px';
                    }
                    // 选中状态及价值计算
                    if (selMap[i] !== undefined && selMap[i] > 0) {
                        slot.classList.add('selected-for-sell');
                        if (item.type === 'item') {
                            var itemInfo = ShopSystem.getItemById(item.itemId);
                            var sellCount = selMap[i];
                            totalVal += (itemInfo ? itemInfo.Value : 0) * sellCount;
                            // 如果不是全部出售，显示出售数量标记
                            if (sellCount < item.count) {
                                var sellTag = document.createElement('span');
                                sellTag.className = 'slot-sell-count';
                                sellTag.textContent = '卖' + sellCount;
                                slot.appendChild(sellTag);
                            }
                        } else {
                            totalVal += item.Value || 0;
                        }
                    }
                    (function(idx, slotEl) {
                        slotEl.onclick = function() {
                            var itm = bp[idx];
                            if (!itm) return;
                            if (itm.type === 'item' && itm.count > 1) {
                                // 可叠加物品：弹出数量选择
                                if (selMap[idx] !== undefined) {
                                    // 已选中，再次点击取消选中
                                    delete selMap[idx];
                                    renderSellGrid();
                                } else {
                                    var defaultCount = itm.count;
                                    QuantityDialog.show('出售物品', itm.itemName || '物品', itm.count, function(qty) {
                                        selMap[idx] = qty;
                                        renderSellGrid();
                                    }, { defaultCount: defaultCount });
                                }
                            } else {
                                // 装备或单个物品：直接切换选中
                                if (selMap[idx] !== undefined) {
                                    delete selMap[idx];
                                } else {
                                    selMap[idx] = 1;
                                }
                                renderSellGrid();
                            }
                        };
                    })(i, slot);
                } else {
                    slot.textContent = '空';
                }
                grid.appendChild(slot);
            }
            document.getElementById('sellTotal').textContent = '预计收入：' + totalVal + ' 下品灵石';
        }
        renderSellGrid();

        document.getElementById('confirmSell').onclick = function() {
            var keys = Object.keys(selMap);
            if (keys.length === 0) { GameDialog.alert({ title: '提示', message: '请先选择物品', type: 'warning' }); return; }
            // 构建出售列表：{index, count}
            var sellList = [];
            for (var k = 0; k < keys.length; k++) {
                var idx = parseInt(keys[k]);
                var cnt = selMap[idx];
                if (cnt > 0) sellList.push({ index: idx, count: cnt });
            }
            var result = ShopSystem.sellItems(sellList);
            GameDialog.alert({ title: '贩卖成功', message: '贩卖' + result.count + '件物品，获得' + result.value + '下品灵石', type: 'success' });
            overlay.remove();
            renderShopUI();
        };
        document.getElementById('cancelSell').onclick = function() { overlay.remove(); };
    }

    // ===== 商店悬浮提示 =====
    var shopTooltip = null;

    function bindShopTooltip(element, shopItem) {
        element.addEventListener('mouseenter', function(e) {
            showShopTooltip(shopItem, e);
        });
        element.addEventListener('mousemove', function(e) {
            positionShopTooltip(e);
        });
        element.addEventListener('mouseleave', function() {
            destroyShopTooltip();
        });
    }

    function destroyShopTooltip() {
        if (shopTooltip) {
            shopTooltip.remove();
            shopTooltip = null;
        }
    }

    function showShopTooltip(si, event) {
        destroyShopTooltip();
        var tip = document.createElement('div');
        tip.className = 'bp-tooltip';
        var html = '';

        if (si.itemType === 1 && si.actualData) {
            // 物品类型
            var item = si.actualData;
            html += '<div class="bp-tooltip-name" style="color:#f39c12">' + (item.ItemName || si.displayName) + '</div>';
            html += '<div class="bp-tooltip-type">📦 物品</div>';
            if (item.ItemDesc) html += '<div class="bp-tooltip-desc">' + item.ItemDesc + '</div>';
            if (item.Value) html += '<div class="bp-tooltip-value">💰 价值：' + item.Value + ' / 个</div>';
        } else if (si.itemType === 2 && si.actualData) {
            // 装备类型
            var eq = si.actualData;
            var qualityColors = { 1: '#ffffff', 2: '#3498db', 3: '#9b59b6', 4: '#ff69b4', 5: '#ffd700' };
            var qualityNames = { 1: '白', 2: '蓝', 3: '紫', 4: '粉', 5: '金' };
            var slotNames = { 1: '剑', 2: '甲', 3: '手', 4: '腿', 5: '鞋', 6: '法宝' };
            var q = eq.EquipmentQuality || 1;
            var color = qualityColors[q] || '#fff';

            html += '<div class="bp-tooltip-name" style="color:' + color + '">' + (eq.EquipmentName || si.displayName) + '</div>';
            html += '<div class="bp-tooltip-type">⚔️ 装备</div>';
            html += '<div class="bp-tooltip-quality" style="color:' + color + '">品质：' + (qualityNames[q] || '白') + '品</div>';
            html += '<div class="bp-tooltip-slot">栏位：' + (slotNames[eq.Column] || '未知') + '</div>';
            if (eq.Desc) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-desc">' + eq.Desc + '</div>';
            }
            // 基础属性
            var baseAttrs = [];
            if (eq.Xiuyi) baseAttrs.push({ label: '修为', val: '+' + eq.Xiuyi });
            if (eq.Tipao) baseAttrs.push({ label: '体魄', val: '+' + eq.Tipao });
            if (eq.Shouming) baseAttrs.push({ label: '寿命', val: '+' + eq.Shouming });
            if (eq.Qiyun) baseAttrs.push({ label: '气运', val: '+' + eq.Qiyun });
            if (eq.Yuanshen) baseAttrs.push({ label: '元神', val: '+' + eq.Yuanshen });
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
            if (eq.Attack) attrs.push({ label: '攻击', val: '+' + eq.Attack });
            if (eq.Defense) attrs.push({ label: '防御', val: '+' + eq.Defense });
            if (eq.HP) attrs.push({ label: '生命', val: '+' + eq.HP });
            if (eq.Dodge) attrs.push({ label: '闪避', val: '+' + eq.Dodge + '%' });
            if (eq.CriticalRate) attrs.push({ label: '暴击率', val: '+' + eq.CriticalRate + '%' });
            if (eq.Mastery) attrs.push({ label: '精通', val: '+' + eq.Mastery });
            if (attrs.length > 0) {
                html += '<div class="bp-tooltip-divider"></div>';
                html += '<div class="bp-tooltip-section-title">⚔️ 战斗属性</div>';
                html += '<div class="bp-tooltip-attrs">';
                for (var a = 0; a < attrs.length; a++) {
                    html += '<div class="bp-tooltip-attr"><span class="attr-label">' + attrs[a].label + '</span><span class="attr-val">' + attrs[a].val + '</span></div>';
                }
                html += '</div>';
            }
            if (eq.LevelMin || eq.LevelMax) {
                html += '<div class="bp-tooltip-divider"></div>';
                var minLvl = eq.LevelMin || 1;
                var maxLvl = eq.LevelMax;
                var minName = (typeof LevelCalculator !== 'undefined') ? (LevelCalculator.getLevelById(minLvl) || {}).levelName || ('等级' + minLvl) : ('等级' + minLvl);
                var maxName = maxLvl ? ((typeof LevelCalculator !== 'undefined') ? (LevelCalculator.getLevelById(maxLvl) || {}).levelName || ('等级' + maxLvl) : ('等级' + maxLvl)) : '无上限';
                html += '<div class="bp-tooltip-level">📏 等级要求：' + minName + ' ~ ' + maxName + '</div>';
            }
            if (eq.Value) html += '<div class="bp-tooltip-value">💰 价值：' + eq.Value + '</div>';
        } else {
            html += '<div class="bp-tooltip-name">' + si.displayName + '</div>';
            if (si.displayDesc) html += '<div class="bp-tooltip-desc">' + si.displayDesc + '</div>';
        }

        html += '<div class="bp-tooltip-divider"></div>';
        html += '<div class="bp-tooltip-price">💎 售价：' + si.price + ' ' + si.currencyName + '</div>';

        tip.innerHTML = html;
        document.body.appendChild(tip);
        shopTooltip = tip;
        positionShopTooltip(event);
    }

    function positionShopTooltip(event) {
        if (!shopTooltip) return;
        var tip = shopTooltip;
        var mx = event.clientX;
        var my = event.clientY;
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        var offsetX = 16, offsetY = 16;
        var left = mx + offsetX;
        var top = my + offsetY;
        if (left + tw > ww - 10) left = mx - tw - offsetX;
        if (top + th > wh - 10) top = my - th - offsetY;
        if (left < 5) left = 5;
        if (top < 5) top = 5;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    // 绑定按钮事件
    function init() {
        document.getElementById('shopBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            openShopPage();
        };
        document.getElementById('closeShop').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            closeShopPage();
        };
        document.getElementById('shopSellBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            openSellDialog();
        };
    }

    return {
        init: init,
        openShopPage: openShopPage,
        closeShopPage: closeShopPage,
        renderShopUI: renderShopUI,
        updateShopTimers: updateShopTimers
    };
})();
console.log('[模块] shop-ui.js 加载完成');
