// 雷池UI模块 - 渡劫突破界面
var TribulationUI = (function() {

    var isOpen = false;
    var currentCapLevel = null;
    var usedPills = []; // 本次渡劫已服用的丹药ID列表

    function init() {
        // 绑定雷池按钮
        var btn = document.getElementById('tribulationBtn');
        if (btn) {
            btn.onclick = function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
                openTribulationPage();
            };
        }
        // 绑定关闭按钮
        var closeBtn = document.getElementById('closeTribulation');
        if (closeBtn) {
            closeBtn.onclick = function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
                closeTribulationPage();
            };
        }
    }

    function openTribulationPage() {
        var page = document.getElementById('tribulationPage');
        if (page) {
            page.style.display = 'block';
            isOpen = true;
            usedPills = []; // 每次打开重置已服用丹药
            renderTribulationContent();
        }
    }

    function closeTribulationPage() {
        var page = document.getElementById('tribulationPage');
        if (page) {
            page.style.display = 'none';
            isOpen = false;
            currentCapLevel = null;
            usedPills = [];
        }
    }

    /**
     * 获取玩家下一个需要突破的瓶颈配置（即使还未到大圆满）
     */
    function getNextBreakthroughConfig(player) {
        var rawLevel = LevelCalculator.calculateLevel(player.Xiuyi);
        var currentLevelId = rawLevel.level;
        var configs = BreakthroughSystem.BREAKTHROUGH_CONFIG;
        var capLevels = [];
        for (var key in configs) {
            if (configs.hasOwnProperty(key)) {
                capLevels.push(parseInt(key));
            }
        }
        capLevels.sort(function(a, b) { return a - b; });

        for (var i = 0; i < capLevels.length; i++) {
            var cap = capLevels[i];
            if (!BreakthroughSystem.hasBreakthrough(cap) && currentLevelId <= cap) {
                return { capLevel: cap, config: configs[cap] };
            }
        }
        if (capLevels.length > 0) {
            var lastCap = capLevels[capLevels.length - 1];
            return { capLevel: lastCap, config: configs[lastCap] };
        }
        return null;
    }

    /**
     * 计算当前总突破几率（基础 + 已服用丹药加成），上限100%
     */
    function calcCurrentRate(config) {
        var rate = config.baseRate;
        for (var i = 0; i < usedPills.length; i++) {
            for (var q = 0; q < config.pillIds.length; q++) {
                if (config.pillIds[q] === usedPills[i]) {
                    rate += config.pillBonus[q];
                    break;
                }
            }
        }
        return Math.min(rate, 1.0);
    }

    /**
     * 渲染雷池内容
     */
    function renderTribulationContent() {
        var container = document.getElementById('tribulationContent');
        if (!container) return;

        var player = GameLogic.getPlayer();
        var levelInfo = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);

        container.innerHTML = '';

        var isCapped = !!levelInfo.capped;
        var config = null;
        var capLevel = null;

        if (isCapped) {
            currentCapLevel = levelInfo.capLevel;
            capLevel = currentCapLevel;
            config = BreakthroughSystem.getConfig(currentCapLevel);
        } else {
            currentCapLevel = null;
            var nextInfo = getNextBreakthroughConfig(player);
            if (nextInfo) {
                capLevel = nextInfo.capLevel;
                config = nextInfo.config;
            }
        }

        if (!config) return;

        var currentRate = calcCurrentRate(config);
        var html = '';

        if (isCapped) {
            // === 渡劫状态：显示完整的渡劫信息 ===
            html += '<div class="trib-status-card">';
            html += '<div class="trib-status-realm">' + levelInfo.levelName + '</div>';
            html += '<div class="trib-status-arrow">⚡ 渡劫突破 ⚡</div>';
            html += '<div class="trib-status-next">' + config.realmName + '境界</div>';
            html += '</div>';

            // 突破几率面板（动态显示当前总几率）
            html += '<div class="trib-rate-panel">';
            html += '<div class="trib-rate-title">突破几率</div>';
            html += '<div class="trib-rate-row">';
            html += '<span class="trib-rate-label">基础几率</span>';
            html += '<span class="trib-rate-value">' + Math.round(config.baseRate * 100) + '%</span>';
            html += '</div>';

            // 显示已服用丹药的加成明细
            if (usedPills.length > 0) {
                for (var up = 0; up < usedPills.length; up++) {
                    var upInfo = ItemSystem.getItemById(usedPills[up]);
                    var upName = upInfo ? upInfo.ItemName : '丹药';
                    var upBonus = 0;
                    for (var uq = 0; uq < config.pillIds.length; uq++) {
                        if (config.pillIds[uq] === usedPills[up]) {
                            upBonus = config.pillBonus[uq];
                            break;
                        }
                    }
                    html += '<div class="trib-rate-row">';
                    html += '<span class="trib-rate-label" style="color:#4abd7e">+ ' + upName + '</span>';
                    html += '<span class="trib-rate-value" style="color:#4abd7e">+' + Math.round(upBonus * 100) + '%</span>';
                    html += '</div>';
                }
            }

            // 总几率
            var rateColor = currentRate >= 1.0 ? '#ffd700' : (currentRate >= 0.5 ? '#4abd7e' : '#e8e0d0');
            html += '<div class="trib-rate-row trib-rate-total">';
            html += '<span class="trib-rate-label" style="font-weight:bold">当前总几率</span>';
            html += '<span class="trib-rate-value" style="color:' + rateColor + ';font-size:22px;font-weight:bold">' + Math.round(currentRate * 100) + '%</span>';
            html += '</div>';

            html += '<div class="trib-rate-row">';
            html += '<span class="trib-rate-label">失败惩罚</span>';
            html += '<span class="trib-rate-penalty">寿命-' + Math.round(config.failPenalty.lifeLossRate * 100) + '% 修为-' + Math.round(config.failPenalty.xiuyiLossRate * 100) + '%</span>';
            html += '</div>';
            html += '</div>';
        } else {
            // === 非渡劫状态 ===
            html += '<div class="trib-no-need">';
            html += '<div class="trib-no-need-icon">⚡</div>';
            html += '<div class="trib-no-need-text">当前无需渡劫</div>';
            html += '<div class="trib-no-need-desc">修为达到境界大圆满时，方可进入雷池渡劫突破</div>';
            html += '</div>';
        }

        // === 三个丹药窗口（始终显示）===
        var backpack = GameLogic.getBackpack();
        var qualityNames = { 0: '下品', 1: '中品', 2: '上品' };
        var qualityColors = { 0: '#9b9b9b', 1: '#4abd7e', 2: '#ffd700' };

        html += '<div class="trib-pills-section' + (isCapped ? '' : ' trib-pills-disabled') + '">';
        if (isCapped) {
            html += '<div class="trib-pills-title">突破丹药 <span style="color:#999;font-size:12px">（每种丹药每次渡劫最多服用1次，最多服用3种）</span></div>';
        } else {
            html += '<div class="trib-pills-title">突破丹药 <span style="color:#999;font-size:12px;">（下次渡劫: ' + config.realmName + '境界）</span></div>';
        }
        html += '<div class="trib-pills-grid">';

        for (var q = 0; q < 3; q++) {
            var pillId = config.pillIds[q];
            var pillBonus = config.pillBonus[q];
            var itemInfo = ItemSystem.getItemById(pillId);
            var pillName = itemInfo ? itemInfo.ItemName : (qualityNames[q] + config.realmName + '丹');
            var iconPath = itemInfo ? itemInfo.IconPath : '';

            // 检查背包是否有此丹药
            var count = 0;
            for (var bi = 0; bi < backpack.length; bi++) {
                if (backpack[bi] && backpack[bi].type === 'item' && backpack[bi].itemId === pillId) {
                    count = backpack[bi].count;
                    break;
                }
            }

            // 检查是否已服用此丹药
            var isUsed = usedPills.indexOf(pillId) !== -1;
            var hasStock = count > 0;
            var isRateMax = currentRate >= 1.0;

            var cardClass = 'trib-pill-window';
            if (!isCapped) {
                cardClass += ' trib-pill-locked';
            } else if (isUsed) {
                cardClass += ' trib-pill-used';
            } else if (hasStock) {
                cardClass += ' has-stock';
            } else {
                cardClass += ' no-stock';
            }

            html += '<div class="' + cardClass + '" data-pill-id="' + pillId + '" data-pill-index="' + q + '" data-has-stock="' + (hasStock ? '1' : '0') + '" data-is-used="' + (isUsed ? '1' : '0') + '" data-capped="' + (isCapped ? '1' : '0') + '">';
            // 丹药图标
            if (iconPath) {
                html += '<div class="trib-pill-icon"><img src="' + iconPath + '" style="width:48px;height:48px" onerror="this.parentElement.innerHTML=\'💊\'"></div>';
            } else {
                html += '<div class="trib-pill-icon">💊</div>';
            }
            html += '<div class="trib-pill-name" style="color:' + qualityColors[q] + '">' + pillName + '</div>';
            html += '<div class="trib-pill-quality" style="color:' + qualityColors[q] + '">' + qualityNames[q] + '</div>';
            html += '<div class="trib-pill-bonus">突破几率 +' + Math.round(pillBonus * 100) + '%</div>';
            html += '<div class="trib-pill-stock' + (hasStock ? '' : ' empty') + '">库存: ' + count + '</div>';

            if (!isCapped) {
                html += '<div class="trib-pill-action disabled">未到渡劫时机</div>';
            } else if (isUsed) {
                html += '<div class="trib-pill-action trib-pill-action-cancel">✅ 已服用（点击取消）</div>';
            } else if (isRateMax) {
                html += '<div class="trib-pill-action disabled">几率已达上限</div>';
            } else if (hasStock) {
                html += '<div class="trib-pill-action">💊 点击服用</div>';
            } else {
                html += '<div class="trib-pill-action disabled">背包中没有此丹药</div>';
            }
            html += '</div>';
        }

        html += '</div>';
        html += '</div>';

        // === 渡劫突破按钮 ===
        html += '<div class="trib-force-section">';
        if (isCapped) {
            html += '<button class="trib-breakthrough-btn" id="tribBreakthroughBtn">⚡ 渡劫突破（当前几率 ' + Math.round(currentRate * 100) + '%）</button>';
            if (usedPills.length === 0) {
                html += '<div class="trib-force-warn">⚠ 未服用任何丹药，建议先服用丹药提升几率</div>';
            } else {
                html += '<div class="trib-force-info">已服用 ' + usedPills.length + ' 种丹药，突破几率 ' + Math.round(currentRate * 100) + '%</div>';
            }
            html += '<div class="trib-force-warn">失败惩罚：寿命-' + Math.round(config.failPenalty.lifeLossRate * 100) + '% 修为-' + Math.round(config.failPenalty.xiuyiLossRate * 100) + '%</div>';
        } else {
            html += '<button class="trib-breakthrough-btn trib-breakthrough-btn-disabled" id="tribBreakthroughBtn" disabled>⚡ 渡劫突破（需到达大圆满）</button>';
            html += '<div class="trib-force-warn">⚠ 当前未到大圆满瓶颈，无法渡劫</div>';
        }
        html += '</div>';

        container.innerHTML = html;

        // === 绑定丹药窗口的服用/取消事件 ===
        var pillWindows = container.querySelectorAll('.trib-pill-window');
        for (var j = 0; j < pillWindows.length; j++) {
            (function(win) {
                win.onclick = function() {
                    if (win.getAttribute('data-capped') !== '1') {
                        GameDialog.alert({ title: '无法使用', message: '当前未到大圆满瓶颈，无需渡劫，丹药暂时无法使用。', type: 'info' });
                        return;
                    }
                    var pillId = parseInt(win.getAttribute('data-pill-id'));
                    var isUsedNow = win.getAttribute('data-is-used') === '1';

                    if (isUsedNow) {
                        // 取消服用
                        var idx = usedPills.indexOf(pillId);
                        if (idx !== -1) {
                            usedPills.splice(idx, 1);
                        }
                        renderTribulationContent();
                        return;
                    }

                    // 检查是否已达100%
                    if (calcCurrentRate(config) >= 1.0) {
                        GameDialog.alert({ title: '几率已满', message: '突破几率已达到100%，无需再服用更多丹药！', type: 'info' });
                        return;
                    }

                    var hasStockAttr = win.getAttribute('data-has-stock');
                    if (hasStockAttr !== '1') {
                        GameDialog.alert({ title: '缺少丹药', message: '背包中没有此丹药，请先去炼丹房炼制！', type: 'warning' });
                        return;
                    }

                    // 服用丹药
                    usedPills.push(pillId);
                    renderTribulationContent();
                };
            })(pillWindows[j]);
        }

        // === 绑定渡劫突破按钮 ===
        var breakBtn = document.getElementById('tribBreakthroughBtn');
        if (breakBtn && isCapped) {
            breakBtn.onclick = function() {
                var rate = calcCurrentRate(config);
                var pillDesc = '';
                if (usedPills.length > 0) {
                    var names = [];
                    for (var k = 0; k < usedPills.length; k++) {
                        var info = ItemSystem.getItemById(usedPills[k]);
                        names.push(info ? info.ItemName : '丹药');
                    }
                    pillDesc = '已服用：' + names.join('、') + '\n';
                }

                GameDialog.confirm({
                    title: '⚡ 雷池渡劫',
                    message: pillDesc + '突破几率: ' + Math.round(rate * 100) + '%\n失败惩罚: 寿命-' + Math.round(config.failPenalty.lifeLossRate * 100) + '% 修为-' + Math.round(config.failPenalty.xiuyiLossRate * 100) + '%\n\n确定要渡劫突破吗？',
                    confirmText: '⚡ 渡劫',
                    cancelText: '再想想',
                    type: 'warning'
                }).then(function(yes) {
                    if (yes) {
                        doBreakthrough();
                    }
                });
            };
        }
    }

    /**
     * 执行渡劫（使用已服用的丹药列表）
     */
    function doBreakthrough() {
        if (currentCapLevel === null) return;

        // 播放突破雷声音效
        if (typeof AudioManager !== 'undefined') AudioManager.playSfxBreakthrough();

        var pillIds = usedPills.length > 0 ? usedPills.slice() : null;
        var result = BreakthroughSystem.attemptBreakthrough(currentCapLevel, pillIds);
        var player = GameLogic.getPlayer();

        // 重置已服用丹药
        usedPills = [];

        // 更新UI
        GameUI.updateUI(player);

        if (result.success) {
            // 延迟播放成功音效（等雷声过后）
            setTimeout(function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxLevelUp();
            }, 600);
            GameDialog.alert({
                title: '渡劫成功',
                message: result.message + '\n\n突破几率: ' + Math.round(result.finalRate * 100) + '%',
                buttonText: '继续修行',
                type: 'success'
            }).then(function() {
                renderTribulationContent();
            });
            GameUI.log('【渡劫】' + result.message, '');
        } else {
            GameDialog.alert({
                title: '渡劫失败',
                message: result.message + '\n\n突破几率: ' + Math.round(result.finalRate * 100) + '%\n损失寿命: ' + result.lostLife + '年\n损失修为: ' + result.lostXiuyi + '点',
                buttonText: '休养生息',
                type: 'warning'
            }).then(function() {
                renderTribulationContent();
            });
            GameUI.log('【渡劫】' + result.message, '');
        }
    }

    return {
        init: init,
        openTribulationPage: openTribulationPage,
        closeTribulationPage: closeTribulationPage,
        renderTribulationContent: renderTribulationContent
    };
})();
console.log('[模块] tribulation-ui.js 加载完成');
