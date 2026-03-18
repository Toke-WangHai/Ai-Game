// ===== 福地系统UI模块 =====
var BlessedLandUI = (function() {

    // 轻量更新：仅更新灵池倒计时、进度、灵田倒计时、矿山时间、奴仆时间等文本，不重建DOM
    function updateBlessedLandTimers() {
        var poolConfig = BlessedLand.getPoolConfig();
        var poolStored = BlessedLand.getPoolStoredXiuyi();
        var poolElapsed = BlessedLand.getPoolElapsedSeconds();
        var bonusCap = BlessedLand.getPoolBonusCapacity();

        // 更新灵池存储量
        var storedEl = document.getElementById('poolStored');
        if (storedEl) storedEl.textContent = poolStored;

        if (poolConfig) {
            var totalMax = poolConfig.MaxStorage + bonusCap;
            var pct = totalMax > 0 ? Math.min(100, (poolStored / totalMax) * 100) : 0;
            var progressBar = document.getElementById('poolProgressBar');
            if (progressBar) progressBar.style.width = pct + '%';
            var progressText = document.getElementById('poolProgressText');
            if (progressText) {
                var text = poolStored + ' / ' + totalMax;
                if (bonusCap > 0) text += ' (+' + bonusCap + ')';
                progressText.textContent = text;
            }

            var bonusEl = document.getElementById('poolBonusInfo');
            if (bonusEl) {
                bonusEl.textContent = bonusCap > 0 ? '临时上限: +' + bonusCap : '';
            }

            var remaining = (poolConfig.TickInterval || 15) - poolElapsed;
            if (remaining < 0) remaining = 0;
            var countdownEl = document.getElementById('poolCountdown');
            if (countdownEl) countdownEl.textContent = remaining;
        }

        // 更新灵田倒计时和进度
        var fieldSlots = BlessedLand.getFieldSlots();
        var fieldItems = document.querySelectorAll('#fieldGrid .field-slot');
        for (var i = 0; i < fieldItems.length && i < fieldSlots.length; i++) {
            var slot = fieldSlots[i];
            if (slot.unlocked && slot.seedId !== 0 && !slot.ready) {
                var growPct = slot.growTime > 0 ? Math.min(100, (slot.elapsed / slot.growTime) * 100) : 0;
                var growRemaining = Math.max(0, slot.growTime - slot.elapsed);
                var growTimeStr = BlessedLand.formatTime(growRemaining);

                var statusEl = fieldItems[i].querySelector('.field-slot-status');
                if (statusEl) statusEl.textContent = '剩余 ' + growTimeStr;

                var progressBarEl = fieldItems[i].querySelector('.field-slot-progress-bar');
                if (progressBarEl) progressBarEl.style.width = growPct + '%';
            } else if (slot.unlocked && slot.seedId !== 0 && slot.ready) {
                renderBlessedLandUI();
                return;
            }
        }

        // 更新矿山时间
        var mineTimeEl = document.getElementById('mineElapsedTime');
        if (mineTimeEl && BlessedLand.isMineActive()) {
            mineTimeEl.textContent = BlessedLand.formatTime(BlessedLand.getMineElapsed());
        }

        // 更新猎场时间
        var huntTimeEl = document.getElementById('huntElapsedTime');
        if (huntTimeEl && BlessedLand.isHuntActive()) {
            huntTimeEl.textContent = BlessedLand.formatTime(BlessedLand.getHuntElapsed());
        }

        // 更新奴仆剩余时间
        var farmServant = BlessedLand.getServantAutoFarm();
        var farmTimeEl = document.getElementById('servantFarmTime');
        if (farmTimeEl) {
            farmTimeEl.textContent = farmServant.active ? '剩余 ' + BlessedLand.formatTime(farmServant.remaining) : '未雇佣';
        }

        var mineServant = BlessedLand.getServantAutoMine();
        var mineServTimeEl = document.getElementById('servantMineTime');
        if (mineServTimeEl) {
            mineServTimeEl.textContent = mineServant.active ? '剩余 ' + BlessedLand.formatTime(mineServant.remaining) : '未雇佣';
        }

        var huntServant = BlessedLand.getServantAutoHunt();
        var huntServTimeEl = document.getElementById('servantHuntTime');
        if (huntServTimeEl) {
            huntServTimeEl.textContent = huntServant.active ? '剩余 ' + BlessedLand.formatTime(huntServant.remaining) : '未雇佣';
        }

        // 更新待领取奖励数量
        var pendingBadge = document.getElementById('pendingRewardBadge');
        var pending = BlessedLand.getPendingRewards();
        if (pendingBadge) {
            var totalPending = 0;
            for (var p = 0; p < pending.length; p++) totalPending += pending[p].count;
            if (totalPending > 0) {
                pendingBadge.textContent = totalPending;
                pendingBadge.style.display = 'inline-block';
            } else {
                pendingBadge.style.display = 'none';
            }
        }

        // 更新矿石待领取数量
        var oreBadge = document.getElementById('orePendingBadge');
        var ores = BlessedLand.getMinePendingOres();
        if (oreBadge) {
            var totalOres = 0;
            for (var o = 0; o < ores.length; o++) totalOres += ores[o].count;
            if (totalOres > 0) {
                oreBadge.textContent = totalOres;
                oreBadge.style.display = 'inline-block';
            } else {
                oreBadge.style.display = 'none';
            }
        }

        // 更新猎场待领取食物数量
        var huntBadge = document.getElementById('huntPendingBadge');
        var huntPending = BlessedLand.getHuntPendingFood();
        if (huntBadge) {
            if (huntPending > 0) {
                huntBadge.textContent = huntPending;
                huntBadge.style.display = 'inline-block';
            } else {
                huntBadge.style.display = 'none';
            }
        }
    }

    // 完整渲染福地UI
    function renderBlessedLandUI() {
        // === 灵池渲染 ===
        var poolConfig = BlessedLand.getPoolConfig();
        var poolLevel = BlessedLand.getPoolLevel();
        var poolStored = BlessedLand.getPoolStoredXiuyi();
        var poolElapsed = BlessedLand.getPoolElapsedSeconds();
        var bonusCap = BlessedLand.getPoolBonusCapacity();

        document.getElementById('poolLevelText').textContent = '等级 ' + poolLevel;
        if (poolConfig) {
            document.getElementById('poolDesc').textContent = poolConfig.Description || '';
            document.getElementById('poolPerTick').textContent = poolConfig.XiuyiPerTick;
            var totalMax = poolConfig.MaxStorage + bonusCap;
            document.getElementById('poolMax').textContent = totalMax;
            document.getElementById('poolStored').textContent = poolStored;

            var pct = totalMax > 0 ? Math.min(100, (poolStored / totalMax) * 100) : 0;
            document.getElementById('poolProgressBar').style.width = pct + '%';
            var progressStr = poolStored + ' / ' + totalMax;
            if (bonusCap > 0) progressStr += ' (+' + bonusCap + ')';
            document.getElementById('poolProgressText').textContent = progressStr;

            var bonusEl = document.getElementById('poolBonusInfo');
            if (bonusEl) {
                bonusEl.textContent = bonusCap > 0 ? '💎 灵石临时上限: +' + bonusCap : '';
                bonusEl.style.display = bonusCap > 0 ? 'block' : 'none';
            }

            var remaining = (poolConfig.TickInterval || 15) - poolElapsed;
            if (remaining < 0) remaining = 0;
            document.getElementById('poolCountdown').textContent = remaining;
        }

        // 升级费用提示
        var upgradeCost = BlessedLand.getPoolUpgradeCost();
        var costDiv = document.getElementById('poolUpgradeCost');
        if (upgradeCost) {
            var costHtml = '升级至 ' + (poolLevel + 1) + ' 级需要：';
            if (upgradeCost.CostItemID1 > 0) {
                var item1 = ItemSystem.getItemById(upgradeCost.CostItemID1);
                costHtml += '<span class="cost-item">' + (item1 ? item1.ItemName : '物品' + upgradeCost.CostItemID1) + '×' + upgradeCost.CostCount1 + '</span>';
            }
            if (upgradeCost.CostItemID2 > 0) {
                var item2 = ItemSystem.getItemById(upgradeCost.CostItemID2);
                costHtml += '<span class="cost-item">' + (item2 ? item2.ItemName : '物品' + upgradeCost.CostItemID2) + '×' + upgradeCost.CostCount2 + '</span>';
            }
            costDiv.innerHTML = costHtml;
            document.getElementById('poolUpgradeBtn').disabled = false;
        } else {
            costDiv.textContent = '灵池已达最高等级';
            document.getElementById('poolUpgradeBtn').disabled = true;
        }

        // === 灵田渲染 ===
        var fieldGrid = document.getElementById('fieldGrid');
        var fieldSlots = BlessedLand.getFieldSlots();
        fieldGrid.innerHTML = '';

        for (var i = 0; i < 12; i++) {
            var slot = fieldSlots[i];
            var div = document.createElement('div');
            div.className = 'field-slot';

            var indexSpan = '<div class="field-slot-index">#' + (i + 1) + '</div>';

            if (!slot.unlocked) {
                div.className += ' locked';
                var unlockCost = BlessedLand.getFieldUnlockCost(i);
                var costText = '';
                if (unlockCost) {
                    if (unlockCost.CostItemID1 > 0) {
                        var uItem1 = ItemSystem.getItemById(unlockCost.CostItemID1);
                        costText += (uItem1 ? uItem1.ItemName : '?') + '×' + unlockCost.CostCount1;
                    }
                    if (unlockCost.CostItemID2 > 0) {
                        var uItem2 = ItemSystem.getItemById(unlockCost.CostItemID2);
                        if (costText) costText += ' + ';
                        costText += (uItem2 ? uItem2.ItemName : '?') + '×' + unlockCost.CostCount2;
                    }
                }
                div.innerHTML = indexSpan +
                    '<div class="field-slot-icon">🔒</div>' +
                    '<div class="field-slot-name">未开垦</div>' +
                    '<div class="field-slot-status">点击开垦</div>' +
                    (costText ? '<div class="field-slot-status" style="color:#f39c12;font-size:10px;margin-top:4px">' + costText + '</div>' : '');
                (function(idx) {
                    div.onclick = function() {
                        var result = BlessedLand.unlockField(idx);
                        GameDialog.alert({ title: '开垦灵田', message: result.message, type: result.success ? 'success' : 'warning' });
                        renderBlessedLandUI();
                    };
                })(i);
            } else if (slot.seedId === 0) {
                div.innerHTML = indexSpan +
                    '<div class="field-slot-icon">🟫</div>' +
                    '<div class="field-slot-name">空灵田</div>' +
                    '<div class="field-slot-status">点击种植</div>';
                (function(idx) {
                    div.onclick = function() { openPlantDialog(idx); };
                })(i);
            } else if (slot.ready) {
                div.className += ' ready';
                var harvestPlant = BlessedLand.getPlantBySeedId(slot.seedId);
                var harvestName = harvestPlant ? harvestPlant.HarvestName : '灵植';
                div.innerHTML = indexSpan +
                    '<div class="field-slot-icon">🌿</div>' +
                    '<div class="field-slot-name" style="color:#2ecc71">' + harvestName + '</div>' +
                    '<div class="field-slot-status" style="color:#2ecc71;font-weight:bold">✅ 点击收获</div>';
                (function(idx) {
                    div.onclick = function() {
                        var result = BlessedLand.harvestField(idx);
                        GameDialog.alert({ title: '收获灵植', message: result.message, type: result.success ? 'success' : 'warning' });
                        renderBlessedLandUI();
                    };
                })(i);
            } else {
                div.className += ' growing';
                var growPlant = BlessedLand.getPlantBySeedId(slot.seedId);
                var seedName = growPlant ? growPlant.SeedName : '种子';
                var growPct = slot.growTime > 0 ? Math.min(100, (slot.elapsed / slot.growTime) * 100) : 0;
                var growRemaining = Math.max(0, slot.growTime - slot.elapsed);
                var growTimeStr = BlessedLand.formatTime(growRemaining);
                div.innerHTML = indexSpan +
                    '<div class="field-slot-icon">🌱</div>' +
                    '<div class="field-slot-name" style="color:#f39c12">' + seedName + '</div>' +
                    '<div class="field-slot-status">剩余 ' + growTimeStr + '</div>' +
                    '<div class="field-slot-progress"><div class="field-slot-progress-bar" style="width:' + growPct + '%"></div></div>';
            }

            fieldGrid.appendChild(div);
        }

        // === 矿山渲染 ===
        renderMineSection();

        // === 猎场渲染 ===
        renderHuntSection();

        // === 奴仆渲染 ===
        renderServantSection();

        // === 待领取奖励 ===
        renderPendingRewards();
    }

    // 矿山区域渲染
    function renderMineSection() {
        var container = document.getElementById('mineSection');
        if (!container) return;
        var mineConfig = BlessedLand.getMineConfig();
        var mineLevel = BlessedLand.getMineLevel();
        var isActive = BlessedLand.isMineActive();
        var mineElapsed = BlessedLand.getMineElapsed();
        var pendingOres = BlessedLand.getMinePendingOres();

        var html = '<div class="mine-header">' +
            '<div><span class="mine-title">⛏️ ' + mineConfig.MineName + '</span>' +
            '<span class="mine-level">等级 ' + mineLevel + '</span></div>' +
            '</div>' +
            '<div class="mine-desc">' + mineConfig.Description + '</div>' +
            '<div class="mine-info">' +
                '<div class="mine-info-item"><div class="mine-info-label">产出速度</div><div class="mine-info-value">' + mineConfig.YieldPerMin + '个/分钟</div></div>' +
                '<div class="mine-info-item"><div class="mine-info-label">开采状态</div><div class="mine-info-value" style="color:' + (isActive ? '#4abd7e' : '#d45050') + '">' + (isActive ? '⛏ 开采中' : '⏸ 停止') + '</div></div>' +
                (isActive ? '<div class="mine-info-item"><div class="mine-info-label">已开采</div><div class="mine-info-value" id="mineElapsedTime">' + BlessedLand.formatTime(mineElapsed) + '</div></div>' : '') +
            '</div>';

        if (pendingOres.length > 0) {
            html += '<div class="mine-pending"><span style="color:rgba(200,180,140,0.5)">待领取矿石：</span>';
            for (var i = 0; i < pendingOres.length; i++) {
                var oreInfo = ItemSystem.getItemById(pendingOres[i].id);
                html += '<span class="mine-ore-tag">' + (oreInfo ? oreInfo.ItemName : '矿石') + '×' + pendingOres[i].count + '</span>';
            }
            html += '</div>';
        }

        html += '<div class="mine-buttons">';
        var mineServant = BlessedLand.getServantAutoMine();
        if (!isActive) {
            if (mineServant.active) {
                html += '<button class="pool-btn pool-btn-collect" id="mineStartBtn">⛏ 开始开采</button>';
            } else {
                html += '<button class="pool-btn" style="opacity:0.5;cursor:not-allowed;background:#555;border:1px solid #666;color:#aaa" disabled>⛏ 需雇佣采矿奴仆</button>';
            }
        } else {
            html += '<button class="pool-btn" id="mineStopBtn" style="background:linear-gradient(135deg,#b53a2e,#952e24);color:#fff;border:1px solid rgba(200,60,50,0.3)">⏹ 停止开采</button>';
        }
        html += '<button class="pool-btn pool-btn-deposit" id="mineCollectBtn">🎁 领取矿石 <span id="orePendingBadge" class="pending-badge" style="display:none">0</span></button>';

        // 升级按钮 — 查找下一级配置
        var mineTableData = BlessedLand.getMineTableData();
        var nextMineConfig = null;
        for (var m = 0; m < mineTableData.length; m++) {
            if (mineTableData[m].Level === mineLevel + 1) { nextMineConfig = mineTableData[m]; break; }
        }
        if (nextMineConfig && nextMineConfig.UpgradeCostItemID > 0) {
            var costItem = ItemSystem.getItemById(nextMineConfig.UpgradeCostItemID);
            html += '<button class="pool-btn pool-btn-upgrade" id="mineUpgradeBtn">⬆ 升级 (' + (costItem ? costItem.ItemName : '?') + '×' + nextMineConfig.UpgradeCostCount + ')</button>';
        }
        html += '</div>';

        container.innerHTML = html;

        // 绑定事件
        var startBtn = document.getElementById('mineStartBtn');
        if (startBtn) startBtn.onclick = function() {
            var r = BlessedLand.startMining();
            if (r.success) renderBlessedLandUI();
            else GameDialog.alert({ title: '矿山', message: r.message, type: 'warning' });
        };
        var stopBtn = document.getElementById('mineStopBtn');
        if (stopBtn) stopBtn.onclick = function() {
            BlessedLand.stopMining();
            renderBlessedLandUI();
        };
        var collectBtn = document.getElementById('mineCollectBtn');
        if (collectBtn) collectBtn.onclick = function() {
            var r = BlessedLand.collectOres();
            GameDialog.alert({ title: '领取矿石', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
        var upgradeBtn = document.getElementById('mineUpgradeBtn');
        if (upgradeBtn) upgradeBtn.onclick = function() {
            var r = BlessedLand.upgradeMine();
            GameDialog.alert({ title: '矿山升级', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };

        // 更新badge
        var totalOres = 0;
        for (var o = 0; o < pendingOres.length; o++) totalOres += pendingOres[o].count;
        var badge = document.getElementById('orePendingBadge');
        if (badge) {
            if (totalOres > 0) { badge.textContent = totalOres; badge.style.display = 'inline-block'; }
            else badge.style.display = 'none';
        }
    }

    // 猎场区域渲染
    function renderHuntSection() {
        var container = document.getElementById('huntSection');
        if (!container) return;
        var huntConfig = BlessedLand.getHuntConfig();
        var huntLevel = BlessedLand.getHuntLevel();
        var isActive = BlessedLand.isHuntActive();
        var huntElapsed = BlessedLand.getHuntElapsed();
        var pendingFood = BlessedLand.getHuntPendingFood();

        var html = '<div class="mine-header">' +
            '<div><span class="mine-title">🏹 ' + huntConfig.HuntName + '</span>' +
            '<span class="mine-level">等级 ' + huntLevel + '</span></div>' +
            '</div>' +
            '<div class="mine-desc">' + huntConfig.Description + '</div>' +
            '<div class="mine-info">' +
                '<div class="mine-info-item"><div class="mine-info-label">产出速度</div><div class="mine-info-value">' + huntConfig.YieldPerMin + '个食物/分钟</div></div>' +
                '<div class="mine-info-item"><div class="mine-info-label">打猎状态</div><div class="mine-info-value" style="color:' + (isActive ? '#4abd7e' : '#d45050') + '">' + (isActive ? '🏹 打猎中' : '⏸ 停止') + '</div></div>' +
                (isActive ? '<div class="mine-info-item"><div class="mine-info-label">已打猎</div><div class="mine-info-value" id="huntElapsedTime">' + BlessedLand.formatTime(huntElapsed) + '</div></div>' : '') +
            '</div>';

        if (pendingFood > 0) {
            html += '<div class="mine-pending"><span style="color:rgba(200,180,140,0.5)">待领取食物：</span>' +
                '<span class="mine-ore-tag">🍚 食物×' + pendingFood + '</span></div>';
        }

        html += '<div class="mine-buttons">';
        var huntServant = BlessedLand.getServantAutoHunt();
        if (!isActive) {
            if (huntServant.active) {
                html += '<button class="pool-btn pool-btn-collect" id="huntStartBtn">🏹 开始打猎</button>';
            } else {
                html += '<button class="pool-btn" style="opacity:0.5;cursor:not-allowed;background:#555;border:1px solid #666;color:#aaa" disabled>🏹 需雇佣猎人</button>';
            }
        } else {
            html += '<button class="pool-btn" id="huntStopBtn" style="background:linear-gradient(135deg,#b53a2e,#952e24);color:#fff;border:1px solid rgba(200,60,50,0.3)">⏹ 停止打猎</button>';
        }
        html += '<button class="pool-btn pool-btn-deposit" id="huntCollectBtn">🍚 领取食物' + (pendingFood > 0 ? ' <span class="pending-badge" id="huntPendingBadge" style="display:inline-block">' + pendingFood + '</span>' : ' <span class="pending-badge" id="huntPendingBadge" style="display:none">0</span>') + '</button>';

        // 升级按钮 — 查找下一级配置
        var huntTableData = BlessedLand.getHuntTableData();
        var nextHuntConfig = null;
        for (var h = 0; h < huntTableData.length; h++) {
            if (huntTableData[h].Level === huntLevel + 1) { nextHuntConfig = huntTableData[h]; break; }
        }
        if (nextHuntConfig && nextHuntConfig.UpgradeCostItemID > 0) {
            var costItem = ItemSystem.getItemById(nextHuntConfig.UpgradeCostItemID);
            html += '<button class="pool-btn pool-btn-upgrade" id="huntUpgradeBtn">⬆ 升级 (' + (costItem ? costItem.ItemName : '?') + '×' + nextHuntConfig.UpgradeCostCount + ')</button>';
        }
        html += '</div>';

        container.innerHTML = html;

        // 绑定事件
        var startBtn = document.getElementById('huntStartBtn');
        if (startBtn) startBtn.onclick = function() {
            var r = BlessedLand.startHunting();
            if (r.success) renderBlessedLandUI();
            else GameDialog.alert({ title: '猎场', message: r.message, type: 'warning' });
        };
        var stopBtn = document.getElementById('huntStopBtn');
        if (stopBtn) stopBtn.onclick = function() {
            BlessedLand.stopHunting();
            renderBlessedLandUI();
        };
        var collectBtn = document.getElementById('huntCollectBtn');
        if (collectBtn) collectBtn.onclick = function() {
            var r = BlessedLand.collectHuntFood();
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '领取食物', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
        var upgradeBtn = document.getElementById('huntUpgradeBtn');
        if (upgradeBtn) upgradeBtn.onclick = function() {
            var r = BlessedLand.upgradeHunt();
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxSuccess(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '猎场升级', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
    }

    // 奴仆区域渲染
    function renderServantSection() {
        var container = document.getElementById('servantSection');
        if (!container) return;

        var farmServant = BlessedLand.getServantAutoFarm();
        var mineServant = BlessedLand.getServantAutoMine();
        var huntServant = BlessedLand.getServantAutoHunt();
        var farmConfig = BlessedLand.getServantConfig('autoFarm');
        var mineConfig = BlessedLand.getServantConfig('autoMine');
        var huntConfig = BlessedLand.getServantConfig('autoHunt');
        var farmCost = farmConfig ? farmConfig.FoodCost : 20;
        var mineCost = mineConfig ? mineConfig.FoodCost : 30;
        var huntCost = huntConfig ? huntConfig.FoodCost : 10;

        // 获取食物数量
        var foodCount = 0;
        if (typeof ResourceManager !== 'undefined') {
            foodCount = ResourceManager.get(20003);
        } else {
            var bp = GameLogic.getBackpack();
            for (var i = 0; i < bp.length; i++) {
                if (bp[i] && bp[i].type === 'item' && bp[i].itemId === 20003) foodCount += bp[i].count;
            }
        }

        var html = '<div class="servant-header">' +
            '<span class="servant-title">👤 奴仆</span>' +
            '<span class="servant-food">🍚 食物：<span style="color:#f1c40f;font-weight:bold">' + foodCount + '</span></span>' +
            '</div>' +
            '<div class="servant-desc">花费食物雇佣奴仆，自动种田和挖矿</div>' +
            '<div class="servant-grid">';

        // 自动种田奴仆
        html += '<div class="servant-card' + (farmServant.active ? ' active' : '') + '">' +
            '<div class="servant-card-icon">🌾</div>' +
            '<div class="servant-card-name">种田奴仆</div>' +
            '<div class="servant-card-status" id="servantFarmTime">' + (farmServant.active ? '剩余 ' + BlessedLand.formatTime(farmServant.remaining) : '未雇佣') + '</div>' +
            '<div class="servant-card-desc">自动种植背包种子并收获</div>' +
            '<button class="servant-hire-btn' + (farmServant.active ? ' hired' : '') + '" id="hireFarmBtn">' +
                (farmServant.active ? '续雇 (🍚' + farmCost + ')' : '雇佣 (🍚' + farmCost + ')') +
            '</button></div>';

        // 自动挖矿奴仆
        html += '<div class="servant-card' + (mineServant.active ? ' active' : '') + '">' +
            '<div class="servant-card-icon">⛏️</div>' +
            '<div class="servant-card-name">采矿奴仆</div>' +
            '<div class="servant-card-status" id="servantMineTime">' + (mineServant.active ? '剩余 ' + BlessedLand.formatTime(mineServant.remaining) : '未雇佣') + '</div>' +
            '<div class="servant-card-desc">自动开采矿山</div>' +
            '<button class="servant-hire-btn' + (mineServant.active ? ' hired' : '') + '" id="hireMineBtn">' +
                (mineServant.active ? '续雇 (🍚' + mineCost + ')' : '雇佣 (🍚' + mineCost + ')') +
            '</button></div>';

        // 猎人
        html += '<div class="servant-card' + (huntServant.active ? ' active' : '') + '">' +
            '<div class="servant-card-icon">🏹</div>' +
            '<div class="servant-card-name">猎人</div>' +
            '<div class="servant-card-status" id="servantHuntTime">' + (huntServant.active ? '剩余 ' + BlessedLand.formatTime(huntServant.remaining) : '未雇佣') + '</div>' +
            '<div class="servant-card-desc">自动打猎获取食物</div>' +
            '<button class="servant-hire-btn' + (huntServant.active ? ' hired' : '') + '" id="hireHuntBtn">' +
                (huntServant.active ? '续雇 (🍚' + huntCost + ')' : '雇佣 (🍚' + huntCost + ')') +
            '</button></div>';

        html += '</div>';

        container.innerHTML = html;

        // 绑定事件
        document.getElementById('hireFarmBtn').onclick = function() {
            var r = BlessedLand.hireServant('autoFarm');
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '雇佣奴仆', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
        document.getElementById('hireMineBtn').onclick = function() {
            var r = BlessedLand.hireServant('autoMine');
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '雇佣奴仆', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
        document.getElementById('hireHuntBtn').onclick = function() {
            var r = BlessedLand.hireServant('autoHunt');
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '雇佣猎人', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
    }

    // 待领取奖励渲染
    function renderPendingRewards() {
        var container = document.getElementById('pendingRewardsSection');
        if (!container) return;
        var rewards = BlessedLand.getPendingRewards();

        if (rewards.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        var html = '<div class="pending-header">' +
            '<span class="pending-title">📦 待领取奖励</span>' +
            '<span class="pending-badge" id="pendingRewardBadge">0</span>' +
            '</div>' +
            '<div class="pending-list">';

        var totalCount = 0;
        for (var i = 0; i < rewards.length; i++) {
            var itemInfo = ItemSystem.getItemById(rewards[i].itemId);
            html += '<span class="pending-item-tag">' + (itemInfo ? itemInfo.ItemName : '物品') + '×' + rewards[i].count + '</span>';
            totalCount += rewards[i].count;
        }

        html += '</div><button class="pool-btn pool-btn-collect" id="collectPendingBtn" style="margin-top:10px">🎁 全部领取</button>';
        container.innerHTML = html;

        var badge = document.getElementById('pendingRewardBadge');
        if (badge) badge.textContent = totalCount;

        document.getElementById('collectPendingBtn').onclick = function() {
            var r = BlessedLand.collectPendingRewards();
            if (typeof AudioManager !== 'undefined') {
                if (r.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '领取奖励', message: r.message, type: r.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
    }

    function openBlessedLandPage() {
        var page = document.getElementById('blessedLandPage');
        page.style.display = 'block';
        BlessedLand.setUpdateCallback(updateBlessedLandTimers);
        if (!BlessedLand.isTimerRunning()) {
            BlessedLand.startTimers();
        }
        renderBlessedLandUI();
        setTimeout(handleResize, 50);
    }

    function closeBlessedLandPage() {
        document.getElementById('blessedLandPage').style.display = 'none';
        BlessedLand.setUpdateCallback(null);
    }

    // 种植对话框
    function openPlantDialog(fieldIndex) {
        var seeds = BlessedLand.getSeedsInBackpack();

        var overlay = document.createElement('div');
        overlay.className = 'plant-dialog-overlay';

        var html = '<div class="plant-dialog" style="max-width:480px;width:90vw">' +
            '<div class="plant-dialog-title">🌱 选择种子种植到灵田 #' + (fieldIndex + 1) + '</div>';

        if (seeds.length === 0) {
            html += '<div style="color:#e74c3c;text-align:center;padding:20px;font-size:14px">背包中没有种子<br><span style="color:#aaa;font-size:12px">可通过秘境探险、商店购买获取种子</span></div>';
        } else {
            html += '<div class="plant-dialog-list">';
            seeds.forEach(function(seed) {
                var timeStr = BlessedLand.formatTime(seed.plantConfig.GrowTime);
                html += '<div class="plant-dialog-item" data-seed-id="' + seed.itemId + '">' +
                    '<div style="flex:1">' +
                        '<div class="plant-dialog-item-name">🌱 ' + seed.itemName + '</div>' +
                        '<div class="plant-dialog-item-info">⏱ 生长 ' + timeStr + ' → 收获 ' + seed.plantConfig.HarvestName + ' ×' + seed.plantConfig.HarvestCount + '</div>' +
                    '</div>' +
                    '<div class="plant-dialog-item-count">×' + seed.count + '</div>' +
                '</div>';
            });
            html += '</div>';
        }

        html += '<button class="plant-dialog-close" id="closePlantDialog">取消</button></div>';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.remove();
        };

        var items = overlay.querySelectorAll('.plant-dialog-item');
        items.forEach(function(item) {
            item.onclick = function() {
                var seedId = parseInt(item.getAttribute('data-seed-id'));
                var result = BlessedLand.plantSeed(fieldIndex, seedId);
                GameDialog.alert({ title: '种植', message: result.message, type: result.success ? 'success' : 'warning' });
                overlay.remove();
                renderBlessedLandUI();
            };
        });

        document.getElementById('closePlantDialog').onclick = function() { overlay.remove(); };
    }

    // 投入灵石对话框
    function openDepositDialog() {
        var overlay = document.createElement('div');
        overlay.className = 'plant-dialog-overlay';

        var stoneCount = 0;
        if (typeof ResourceManager !== 'undefined') {
            stoneCount = ResourceManager.get(20001);
        } else {
            var bp = GameLogic.getBackpack();
            for (var i = 0; i < bp.length; i++) {
                if (bp[i] && bp[i].type === 'item' && bp[i].itemId === 20001) {
                    stoneCount += bp[i].count;
                }
            }
        }

        var poolConfig = BlessedLand.getPoolConfig();
        var baseMax = poolConfig ? poolConfig.MaxStorage : 500;
        var bonusCap = BlessedLand.getPoolBonusCapacity();
        var totalMax = baseMax + bonusCap;
        var currentStored = BlessedLand.getPoolStoredXiuyi();

        overlay.innerHTML =
            '<div class="deposit-dialog">' +
                '<div class="deposit-dialog-title">💎 投入灵石到灵池</div>' +
                '<div class="deposit-info">投入灵石将<b style="color:#f1c40f">临时增大灵池上限</b></div>' +
                '<div class="deposit-info">灵池产出修为时会优先消耗临时上限</div>' +
                '<div class="deposit-info" style="margin-top:8px">当前持有下品灵石：<span style="color:#f1c40f">' + stoneCount + '</span></div>' +
                '<div class="deposit-info">灵池：<span>' + currentStored + ' / ' + totalMax + '</span>' +
                    (bonusCap > 0 ? ' <span style="color:#2ecc71">(含临时+' + bonusCap + ')</span>' : '') +
                '</div>' +
                '<div class="deposit-info">基础上限：<span>' + baseMax + '</span>  临时上限：<span style="color:#2ecc71">' + bonusCap + '</span></div>' +
                '<div class="deposit-input-group">' +
                    '<span style="color:#aaa">投入数量：</span>' +
                    '<input type="number" class="deposit-input" id="depositAmount" min="1" max="' + stoneCount + '" value="' + Math.min(stoneCount, 10) + '">' +
                    '<span style="color:#aaa">个</span>' +
                '</div>' +
                '<div class="deposit-buttons">' +
                    '<button class="pool-btn pool-btn-deposit" id="confirmDeposit">确认投入</button>' +
                    '<button class="plant-dialog-close" id="cancelDeposit">取消</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.remove();
        };

        document.getElementById('confirmDeposit').onclick = function() {
            var amount = parseInt(document.getElementById('depositAmount').value);
            if (isNaN(amount) || amount <= 0) {
                GameDialog.alert({ title: '提示', message: '请输入有效数量', type: 'warning' });
                return;
            }
            var result = BlessedLand.depositToPool(20001, amount);
            GameDialog.alert({ title: '投入灵石', message: result.message, type: result.success ? 'success' : 'warning' });
            overlay.remove();
            renderBlessedLandUI();
        };

        document.getElementById('cancelDeposit').onclick = function() { overlay.remove(); };
    }

    // 绑定按钮事件
    function init() {
        document.getElementById('blessedLandBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            openBlessedLandPage();
        };
        document.getElementById('closeBlessedLand').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            closeBlessedLandPage();
        };
        document.getElementById('poolCollectBtn').onclick = function() {
            var result = BlessedLand.collectPoolXiuyi();
            if (typeof AudioManager !== 'undefined') {
                if (result.success) AudioManager.playSfxItem();
                else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '收集修为', message: result.message, type: result.success ? 'success' : 'warning' });
            if (result.success) GameUI.updateUI(GameLogic.getPlayer());
            renderBlessedLandUI();
        };
        document.getElementById('poolDepositBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            openDepositDialog();
        };
        document.getElementById('poolUpgradeBtn').onclick = function() {
            var result = BlessedLand.upgradePool();
            if (typeof AudioManager !== 'undefined') {
                if (result.success) AudioManager.playSfxSuccess();
                else AudioManager.playSfxFail();
            }
            GameDialog.alert({ title: '升级灵池', message: result.message, type: result.success ? 'success' : 'warning' });
            renderBlessedLandUI();
        };
    }

    return {
        init: init,
        openBlessedLandPage: openBlessedLandPage,
        closeBlessedLandPage: closeBlessedLandPage,
        renderBlessedLandUI: renderBlessedLandUI,
        updateBlessedLandTimers: updateBlessedLandTimers
    };
})();
console.log('[模块] blessed-land-ui.js 加载完成');
