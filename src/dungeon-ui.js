// 秘境UI模块 - 支持持续探索与随时领取
const DungeonUI = (function() {

    // UI刷新定时器
    var uiTimer = null;

    /**
     * 打开秘境页面
     */
    function openDungeonPage() {
        const page = document.getElementById('dungeonPage');
        if (page) {
            page.style.display = 'block';
            renderStageList();
            startUITimer();
        }
    }

    /**
     * 关闭秘境页面
     */
    function closeDungeonPage() {
        const page = document.getElementById('dungeonPage');
        if (page) {
            page.style.display = 'none';
        }
        stopUITimer();
    }

    function startUITimer() {
        stopUITimer();
        uiTimer = setInterval(function() {
            if (DungeonSystem.getIsExploring()) {
                updateExploringUI();
            }
        }, 200);
    }

    function stopUITimer() {
        if (uiTimer) {
            clearInterval(uiTimer);
            uiTimer = null;
        }
    }

    /**
     * 轻量更新探索中的UI（不重建DOM）
     */
    function updateExploringUI() {
        var progress = DungeonSystem.getCurrentProgress();
        var totalClears = DungeonSystem.getTotalClears();
        var claimable = DungeonSystem.getClaimableClears();
        var elapsed = DungeonSystem.getTotalElapsed();

        // 更新总时间
        var timeEl = document.getElementById('dungeonElapsedTime');
        if (timeEl) timeEl.textContent = formatDungeonTime(elapsed);

        // 更新通关次数
        var clearsEl = document.getElementById('dungeonTotalClears');
        if (clearsEl) clearsEl.textContent = totalClears;

        // 更新可领取
        var claimableEl = document.getElementById('dungeonClaimable');
        if (claimableEl) {
            claimableEl.textContent = claimable;
            claimableEl.style.color = claimable > 0 ? '#2ecc71' : '#aaa';
        }

        // 更新当前通关进度条
        var pct = progress.total > 0 ? Math.min(100, (progress.elapsed / progress.total) * 100) : 0;
        var progressBar = document.getElementById('dungeonProgressBar');
        if (progressBar) progressBar.style.width = pct + '%';
        var progressText = document.getElementById('dungeonProgressText');
        if (progressText) progressText.textContent = progress.remaining + '秒后通关';

        // 领取按钮状态
        var claimBtn = document.getElementById('dungeonClaimBtn');
        if (claimBtn) {
            if (claimable > 0) {
                claimBtn.disabled = false;
                claimBtn.textContent = '🎁 领取奖励（' + claimable + '次通关）';
                claimBtn.style.opacity = '1';
            } else {
                claimBtn.disabled = true;
                claimBtn.textContent = '🎁 等待通关...';
                claimBtn.style.opacity = '0.5';
            }
        }
    }

    /**
     * 渲染关卡列表
     */
    function renderStageList() {
        const container = document.getElementById('stageList');
        if (!container) return;

        const stages = DungeonSystem.getVisibleStages();
        const player = GameLogic.getPlayer();
        const playerXiuyi = player ? player.Xiuyi : 0;
        const isExploring = DungeonSystem.getIsExploring();
        const currentStageId = DungeonSystem.getCurrentStageId();

        container.innerHTML = '';

        stages.forEach(function(stage) {
            const canEnter = DungeonSystem.canEnterStage(stage, playerXiuyi);
            const levelName = DungeonSystem.getRequiredLevelName(stage);
            const penaltyDesc = DungeonSystem.getDeathPenaltyDesc(stage.DeathPenalty);
            const isThisExploring = isExploring && String(currentStageId) === String(stage.ID);

            const banner = document.createElement('div');
            banner.className = 'stage-banner' + (canEnter ? '' : ' stage-locked');
            if (isThisExploring) {
                banner.className = 'stage-banner stage-exploring';
            }

            var rightContent = '';
            if (isThisExploring) {
                rightContent =
                    '<div class="stage-realm">需要境界：<span class="realm-ok">' + levelName + '</span></div>' +
                    '<div class="stage-time" style="color:#2ecc71">⛏ 探索中...</div>';
            } else {
                rightContent =
                    '<div class="stage-realm">需要境界：<span class="' + (canEnter ? 'realm-ok' : 'realm-lack') + '">' + levelName + '</span></div>' +
                    '<div class="stage-time">通关时间：' + stage.MinClearTime + '秒</div>';
            }

            banner.innerHTML =
                '<div class="stage-banner-left">' +
                    '<div class="stage-name">' + stage.StageName + '</div>' +
                    '<div class="stage-penalty">失败：' + penaltyDesc + '</div>' +
                '</div>' +
                '<div class="stage-banner-right">' +
                    rightContent +
                '</div>';

            if (!isThisExploring && !isExploring) {
                banner.onclick = function() {
                    onStageClick(stage, canEnter);
                };
            }

            container.appendChild(banner);

            // 探索面板紧接在对应秘境banner下方
            if (isThisExploring) {
                var panelWrapper = document.createElement('div');
                panelWrapper.innerHTML = buildExploringPanel();
                container.appendChild(panelWrapper.firstChild);
                bindExploringEvents();
            }
        });
    }

    /**
     * 构建探索中面板HTML
     */
    function buildExploringPanel() {
        var stage = DungeonSystem.getCurrentStage();
        if (!stage) return '';

        var progress = DungeonSystem.getCurrentProgress();
        var totalClears = DungeonSystem.getTotalClears();
        var claimable = DungeonSystem.getClaimableClears();
        var elapsed = DungeonSystem.getTotalElapsed();
        var pct = progress.total > 0 ? Math.min(100, (progress.elapsed / progress.total) * 100) : 0;

        var html = '<div class="dungeon-exploring-panel">' +
            '<div class="dungeon-exp-header">' +
                '<div class="dungeon-exp-title">⚔ 正在探索：' + stage.StageName + '</div>' +
                '<button class="dungeon-exit-btn" id="dungeonExitBtn">退出</button>' +
            '</div>' +
            '<div class="dungeon-exp-stats">' +
                '<div class="dungeon-exp-stat">' +
                    '<div class="dungeon-exp-label">探索时间</div>' +
                    '<div class="dungeon-exp-value" id="dungeonElapsedTime">' + formatDungeonTime(elapsed) + '</div>' +
                '</div>' +
                '<div class="dungeon-exp-stat">' +
                    '<div class="dungeon-exp-label">总通关</div>' +
                    '<div class="dungeon-exp-value" id="dungeonTotalClears">' + totalClears + '</div>' +
                '</div>' +
                '<div class="dungeon-exp-stat">' +
                    '<div class="dungeon-exp-label">可领取</div>' +
                    '<div class="dungeon-exp-value" id="dungeonClaimable" style="color:' + (claimable > 0 ? '#2ecc71' : '#aaa') + '">' + claimable + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="dungeon-exp-progress">' +
                '<div class="dungeon-exp-progress-bar" id="dungeonProgressBar" style="width:' + pct + '%"></div>' +
                '<div class="dungeon-exp-progress-text" id="dungeonProgressText">' + progress.remaining + '秒后通关</div>' +
            '</div>' +
            '<button class="dungeon-claim-btn" id="dungeonClaimBtn"' + (claimable > 0 ? '' : ' disabled style="opacity:0.5"') + '>' +
                (claimable > 0 ? '🎁 领取奖励（' + claimable + '次通关）' : '🎁 等待通关...') +
            '</button>' +
        '</div>';

        return html;
    }

    function bindExploringEvents() {
        var exitBtn = document.getElementById('dungeonExitBtn');
        if (exitBtn) {
            exitBtn.onclick = function() {
                var claimable = DungeonSystem.getClaimableClears();
                if (claimable > 0) {
                    GameDialog.confirm({
                        title: '退出探索',
                        message: '还有 ' + claimable + ' 次通关奖励未领取，退出将丢失！确定退出？',
                        confirmText: '确定退出',
                        cancelText: '取消'
                    }).then(function(confirmed) {
                        if (confirmed) {
                            DungeonSystem.stopExploring();
                            renderStageList();
                        }
                    });
                } else {
                    DungeonSystem.stopExploring();
                    renderStageList();
                }
            };
        }

        var claimBtn = document.getElementById('dungeonClaimBtn');
        if (claimBtn) {
            claimBtn.onclick = function() {
                onClaimReward();
            };
        }
    }

    /**
     * 关卡点击处理
     */
    function onStageClick(stage, canEnter) {
        if (DungeonSystem.getIsExploring()) {
            GameDialog.alert({ title: '提示', message: '正在探索中，请先退出当前探索', type: 'warning' });
            return;
        }

        if (!canEnter) {
            GameDialog.alert({ title: '境界不足', message: '境界不足，无法进入该秘境', type: 'warning' });
            return;
        }

        showConfirmDialog(stage);
    }

    /**
     * 生成秘境可掉落物品列表HTML
     */
    function buildDropListHTML(stage) {
        var dropGroupId = parseInt(stage.DropGroupID);
        var allDrops = ItemSystem.getDropsByGroupId(dropGroupId);
        if (!allDrops || allDrops.length === 0) return '';

        var qualityColors = { 1: '#ccc', 2: '#3498db', 3: '#9b59b6', 4: '#e91e63', 5: '#ffd700' };
        var qualityNames = { 1: '白', 2: '蓝', 3: '紫', 4: '粉', 5: '金' };
        var html = '<div class="dialog-drop-section">' +
            '<div class="dialog-drop-title">📦 可能掉落</div>' +
            '<div class="dialog-drop-list">';

        for (var i = 0; i < allDrops.length; i++) {
            var drop = allDrops[i];
            if (parseInt(drop.DropType) === 1) {
                var itemInfo = ItemSystem.getItemById(parseInt(drop.RefID));
                if (itemInfo) {
                    html += '<span class="dialog-drop-tag" style="color:#f1c40f">' + itemInfo.ItemName + '</span>';
                }
            } else if (parseInt(drop.DropType) === 2) {
                var quality = parseInt(drop.RefID);
                var qColor = qualityColors[quality] || '#ccc';
                var qName = qualityNames[quality] || '?';
                html += '<span class="dialog-drop-tag" style="color:' + qColor + '">[' + qName + '品]装备</span>';
            }
        }

        if (stage.XiuyiReward && parseInt(stage.XiuyiReward) > 0) {
            html += '<span class="dialog-drop-tag" style="color:#e07830">修为+' + stage.XiuyiReward + '/次</span>';
        }

        html += '</div></div>';
        return html;
    }

    /**
     * 显示进入确认弹窗
     */
    function showConfirmDialog(stage) {
        const levelName = DungeonSystem.getRequiredLevelName(stage);
        const penaltyDesc = DungeonSystem.getDeathPenaltyDesc(stage.DeathPenalty);
        var dropListHTML = buildDropListHTML(stage);

        const overlay = document.createElement('div');
        overlay.className = 'dungeon-overlay';
        overlay.id = 'dungeonConfirmOverlay';

        overlay.innerHTML =
            '<div class="dungeon-dialog">' +
                '<div class="dungeon-dialog-title">是否进入探索？</div>' +
                '<div class="dungeon-dialog-body">' +
                    '<div class="dialog-stage-name">' + stage.StageName + '</div>' +
                    '<div class="dialog-info">需要境界：' + levelName + '</div>' +
                    '<div class="dialog-info">每 ' + stage.MinClearTime + ' 秒通关一次</div>' +
                    '<div class="dialog-info">失败惩罚：' + penaltyDesc + '</div>' +
                    '<div class="dialog-info" style="color:#2ecc71;margin-top:6px">💡 进入后持续探索，随时可领取奖励</div>' +
                    dropListHTML +
                '</div>' +
                '<div class="dungeon-dialog-buttons">' +
                    '<button class="btn btn-success" id="confirmEnterStage">确认进入</button>' +
                    '<button class="btn btn-danger" id="cancelEnterStage">取消</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('confirmEnterStage').onclick = function() {
            overlay.remove();
            startExploring(stage);
        };

        document.getElementById('cancelEnterStage').onclick = function() {
            overlay.remove();
        };
    }

    /**
     * 开始探索
     */
    function startExploring(stage) {
        DungeonSystem.enterStage(stage);
        renderStageList();
    }

    /**
     * 领取奖励
     */
    function onClaimReward() {
        var result = DungeonSystem.claimRewards();

        if (result.failed) {
            // 战斗失败
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxFail();
            var failedStage = result.stage;
            var penalty = BattleSystem.applyDeathPenalty(failedStage);
            showBattleResultDialog(result.battleResult, null, penalty, 0, 0);
            renderStageList();
            return;
        }

        if (result.clears <= 0) {
            GameDialog.alert({ title: '提示', message: '暂无可领取的通关奖励', type: 'warning' });
            return;
        }

        // 战斗胜利 - 应用奖励
        if (typeof AudioManager !== 'undefined') AudioManager.playSfxSuccess();
        var messages = DungeonSystem.applyClaimRewards(result.rewards, result.xiuyiTotal);

        showBattleResultDialog(result.battleResult, result.rewards, null, result.xiuyiTotal, result.clears);
    }

    /**
     * 显示战斗结果弹窗
     */
    function showBattleResultDialog(battleResult, rewards, penalty, xiuyiTotal, clears) {
        const overlay = document.createElement('div');
        overlay.className = 'dungeon-overlay';
        overlay.id = 'battleResultOverlay';

        const isVictory = battleResult.victory;

        // 构建战斗日志HTML
        let logHTML = '';
        battleResult.logs.forEach(function(line) {
            var lineClass = 'battle-log-line';
            if (line.indexOf('你 对') !== -1 || line.indexOf('你对') !== -1) lineClass += ' battle-log-player-atk';
            else if (line.indexOf('对 你') !== -1 || line.indexOf('对你') !== -1) lineClass += ' battle-log-monster-atk';
            else if (line.indexOf('闪避') !== -1) lineClass += ' battle-log-dodge';
            else if (line.indexOf('击败') !== -1 || line.indexOf('🎉') !== -1) lineClass += ' battle-log-victory';
            else if (line.indexOf('倒下') !== -1 || line.indexOf('💀') !== -1) lineClass += ' battle-log-defeat';
            else if (line.indexOf('═') !== -1 || line.indexOf('---') !== -1 || line.indexOf('◆') !== -1) lineClass += ' battle-log-separator';
            logHTML += '<div class="' + lineClass + '">' + line + '</div>';
        });

        // 构建结果详情HTML
        let resultHTML = '';
        if (isVictory && rewards && rewards.length > 0) {
            resultHTML = '<div class="battle-result-section">' +
                '<div class="battle-result-title victory-title">🎉 通关 ' + clears + ' 次 — 获得奖励</div>' +
                '<div class="reward-list">';

            if (xiuyiTotal > 0) {
                resultHTML += '<div class="reward-item">' +
                    '<span class="reward-label" style="color:#e07830">✨ 修为</span>' +
                    '<span class="reward-value" style="color:#e07830">+' + xiuyiTotal + '</span></div>';
            }

            var qualityColors = { 1: '#ccc', 2: '#3498db', 3: '#9b59b6', 4: '#e91e63', 5: '#ffd700' };
            var qualityNames = { 1: '白', 2: '蓝', 3: '紫', 4: '粉', 5: '金' };

            // 合并同类物品
            var mergedItems = [];
            for (var ri = 0; ri < rewards.length; ri++) {
                var rItem = rewards[ri];
                if (rItem.type === 'item') {
                    var found = false;
                    for (var mi = 0; mi < mergedItems.length; mi++) {
                        if (mergedItems[mi].type === 'item' && mergedItems[mi].id === rItem.id) {
                            mergedItems[mi].count += rItem.count;
                            found = true;
                            break;
                        }
                    }
                    if (!found) mergedItems.push({ type: 'item', id: rItem.id, name: rItem.name, count: rItem.count });
                } else {
                    mergedItems.push(rItem);
                }
            }

            mergedItems.forEach(function(item) {
                if (item.type === 'item') {
                    resultHTML += '<div class="reward-item">' +
                        '<span class="reward-label" style="color:#8bc34a">📦 ' + item.name + '</span>' +
                        '<span class="reward-value">×' + item.count + '</span></div>';
                } else if (item.type === 'equipment') {
                    var qColor = qualityColors[item.quality] || '#ccc';
                    var qName = qualityNames[item.quality] || '';
                    resultHTML += '<div class="reward-item">' +
                        '<span class="reward-label" style="color:' + qColor + '">⚔ [' + qName + '] ' + item.name + '</span>' +
                        '<span class="reward-value" style="color:' + qColor + '">×' + item.count + '</span></div>';
                }
            });

            resultHTML += '</div></div>';
        } else if (isVictory) {
            resultHTML = '<div class="battle-result-section">' +
                '<div class="battle-result-title victory-title">🎉 通关 ' + clears + ' 次</div>';
            if (xiuyiTotal > 0) {
                resultHTML += '<div class="reward-item"><span class="reward-label" style="color:#e07830">✨ 修为</span><span class="reward-value" style="color:#e07830">+' + xiuyiTotal + '</span></div>';
            }
            resultHTML += '</div>';
        } else if (!isVictory && penalty) {
            resultHTML = '<div class="battle-result-section">' +
                '<div class="battle-result-title defeat-title">💀 战斗失败 — 探索结束</div>';
            if (penalty.xiuyiLost > 0) resultHTML += '<div class="reward-item"><span class="reward-label">修为</span><span class="penalty-value">-' + penalty.xiuyiLost + '</span></div>';
            if (penalty.shoumingLost > 0) resultHTML += '<div class="reward-item"><span class="reward-label">寿命</span><span class="penalty-value">-' + penalty.shoumingLost + '</span></div>';
            if (penalty.xiuyiLost === 0 && penalty.shoumingLost === 0) resultHTML += '<div class="reward-item"><span class="reward-label">惩罚</span><span class="reward-value" style="color:#2ecc71">无惩罚</span></div>';
            resultHTML += '</div>';
        }

        var stage = DungeonSystem.getCurrentStage();
        var stageName = stage ? stage.StageName : '秘境';

        overlay.innerHTML =
            '<div class="battle-result-dialog">' +
                '<div class="battle-result-header ' + (isVictory ? 'header-victory' : 'header-defeat') + '">' +
                    '<div class="battle-stage-name">' + stageName + '</div>' +
                    '<div class="battle-summary">' +
                        '击败怪物：' + battleResult.monstersDefeated + '/' + battleResult.totalMonsters +
                        '　|　剩余生命：' + battleResult.playerStats.currentHP + '/' + battleResult.playerStats.maxHP +
                    '</div>' +
                '</div>' +
                '<div class="battle-log-container" id="battleLogContainer">' + logHTML + '</div>' +
                resultHTML +
                '<div class="dungeon-dialog-buttons">' +
                    '<button class="btn btn-primary" id="closeBattleResultBtn">关闭</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        var logContainer = document.getElementById('battleLogContainer');
        if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;

        document.getElementById('closeBattleResultBtn').onclick = function() {
            overlay.remove();
        };
    }

    /**
     * 格式化探索时间
     */
    function formatDungeonTime(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) return h + '时' + m + '分' + s + '秒';
        if (m > 0) return m + '分' + s + '秒';
        return s + '秒';
    }

    /**
     * 更新倒计时（兼容旧接口）
     */
    function updateCountdown(remaining) {
        // 旧接口，不再使用
    }

    function showReward(stage, reward) {
        // 旧接口，不再使用
    }

    return {
        openDungeonPage: openDungeonPage,
        closeDungeonPage: closeDungeonPage,
        renderStageList: renderStageList,
        updateCountdown: updateCountdown,
        showReward: showReward
    };
})();
console.log('[模块] dungeon-ui.js 加载完成');
