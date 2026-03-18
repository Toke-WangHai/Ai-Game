// 秘境系统模块 - 进入后持续计时，按通关次数结算奖励
const DungeonSystem = (function() {
    let stagesData = [];    // 关卡数据
    let isExploring = false; // 是否正在探索
    let currentStage = null; // 当前探索的关卡
    let exploreStartTime = 0; // 探索开始的时间戳(ms)
    let totalElapsed = 0;    // 总探索时长(秒) - 用于后台补偿
    let claimedClears = 0;   // 已领取过奖励的通关次数
    let exploreTimer = null;  // 探索计时器

    /**
     * 初始化关卡数据
     */
    function init(stages) {
        stagesData = stages || [];
        console.log('秘境系统初始化完成，共', stagesData.length, '个关卡');
    }

    function getStages() {
        return stagesData;
    }

    function getVisibleStages() {
        return stagesData;
    }

    function canEnterStage(stage, playerXiuyi) {
        const playerLevel = LevelCalculator.calculateLevel(playerXiuyi);
        return playerLevel.level >= stage.RequiredLevel;
    }

    function getRequiredLevelName(stage) {
        const levelInfo = LevelCalculator.getLevelById(stage.RequiredLevel);
        return levelInfo ? levelInfo.levelName : '未知';
    }

    /**
     * 进入关卡探索 - 开始持续计时
     */
    function enterStage(stage) {
        if (isExploring) return false;

        isExploring = true;
        currentStage = stage;
        exploreStartTime = Date.now();
        totalElapsed = 0;
        claimedClears = 0;

        // 200ms 轮询更新UI
        exploreTimer = setInterval(function() {
            totalElapsed = Math.floor((Date.now() - exploreStartTime) / 1000);
            // UI由DungeonUI轮询更新
        }, 200);

        return true;
    }

    /**
     * 获取当前已过总秒数
     */
    function getTotalElapsed() {
        if (isExploring) {
            return Math.floor((Date.now() - exploreStartTime) / 1000);
        }
        return totalElapsed;
    }

    /**
     * 获取当前总通关次数
     */
    function getTotalClears() {
        if (!currentStage) return 0;
        var clearTime = parseInt(currentStage.MinClearTime) || 30;
        return Math.floor(getTotalElapsed() / clearTime);
    }

    /**
     * 获取可领取的通关次数（未领取的）
     */
    function getClaimableClears() {
        return Math.max(0, getTotalClears() - claimedClears);
    }

    /**
     * 获取当前通关进度（距下一次通关的剩余时间）
     */
    function getCurrentProgress() {
        if (!currentStage) return { elapsed: 0, total: 1, remaining: 1 };
        var clearTime = parseInt(currentStage.MinClearTime) || 30;
        var elapsed = getTotalElapsed();
        var inCycleElapsed = elapsed % clearTime;
        return {
            elapsed: inCycleElapsed,
            total: clearTime,
            remaining: clearTime - inCycleElapsed
        };
    }

    /**
     * 领取奖励 - 按可领取的通关次数生成奖励
     * @returns {object} { clears, rewards[], battleResult, xiuyiTotal }
     */
    function claimRewards() {
        var claimable = getClaimableClears();
        if (claimable <= 0) {
            return { clears: 0, rewards: [], battleResult: null, xiuyiTotal: 0 };
        }

        var stage = currentStage;
        // 先执行一次战斗判定
        var battleResult = BattleSystem.executeStageBattle(stage);

        if (!battleResult.victory) {
            // 战斗失败 - 不给奖励，结束探索
            stopExploring();
            return { clears: 0, rewards: [], battleResult: battleResult, xiuyiTotal: 0, failed: true, stage: stage };
        }

        // 战斗胜利 - 按通关次数生成奖励
        var allRewardItems = [];
        var xiuyiTotal = 0;
        var playerLevel = undefined;
        var player = GameLogic.getPlayer();
        if (player && typeof LevelCalculator !== 'undefined') {
            var levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);
            playerLevel = levelInfo ? levelInfo.level : undefined;
        }

        for (var c = 0; c < claimable; c++) {
            var reward = ItemSystem.generateStageReward(stage, playerLevel);
            if (reward && reward.items) {
                for (var i = 0; i < reward.items.length; i++) {
                    allRewardItems.push(reward.items[i]);
                }
            }
            xiuyiTotal += parseInt(stage.XiuyiReward) || 0;
        }

        // 领取后重置计时——重新开始新一轮探索
        claimedClears = 0;
        exploreStartTime = Date.now();
        totalElapsed = 0;

        return {
            clears: claimable,
            rewards: allRewardItems,
            battleResult: battleResult,
            xiuyiTotal: xiuyiTotal,
            failed: false
        };
    }

    /**
     * 应用奖励到背包（支持仓库溢出）
     */
    function applyClaimRewards(rewards, xiuyiTotal) {
        var messages = [];
        var overflowItems = []; // 背包满溢出的物品

        if (xiuyiTotal > 0) {
            var player = GameLogic.getPlayer();
            if (player) {
                player.Xiuyi += xiuyiTotal;
                GameUI.updateUI(player);
            }
            messages.push('修为 +' + xiuyiTotal);
        }

        var backpack = GameLogic.getBackpack();
        for (var i = 0; i < rewards.length; i++) {
            var item = rewards[i];
            if (item.type === 'item') {
                var result = ItemSystem.addItemToBackpack(backpack, item.id, item.count);
                if (result.addedCount < item.count) {
                    // 部分或全部溢出
                    var overflow = item.count - result.addedCount;
                    overflowItems.push({ type: 'item', id: item.id, name: item.name, count: overflow });
                }
                messages.push(result.message);
            } else if (item.type === 'equipment') {
                var success = GameLogic.addToBackpack(item.equipmentData);
                if (success) {
                    messages.push('获得装备：' + item.name);
                } else {
                    overflowItems.push(item);
                    messages.push(item.name + ' 背包已满');
                }
            }
        }

        // 溢出物品存入仓库
        if (overflowItems.length > 0 && typeof StorageSystem !== 'undefined') {
            for (var j = 0; j < overflowItems.length; j++) {
                var oi = overflowItems[j];
                if (oi.type === 'item') {
                    StorageSystem.addItem(oi.id, oi.count);
                } else if (oi.type === 'equipment') {
                    StorageSystem.addEquipment(oi.equipmentData || oi);
                }
            }
            messages.push('部分物品已自动存入仓库');
        }

        GameUI.updateBackpack(backpack);
        return messages;
    }

    function getDeathPenaltyDesc(penaltyType) {
        if (typeof BattleSystem !== 'undefined') {
            return BattleSystem.getDeathPenaltyDesc(penaltyType);
        }
        const penalties = {
            1: '无惩罚',
            2: '损失5%修为 + 2%寿命',
            3: '损失10%修为 + 5%寿命',
            4: '损失20%修为 + 10%寿命',
            5: '损失30%修为 + 15%寿命'
        };
        return penalties[penaltyType] || '未知惩罚';
    }

    function getIsExploring() {
        return isExploring;
    }

    function getCurrentStage() {
        return currentStage;
    }

    function getCurrentStageId() {
        return currentStage ? currentStage.ID : null;
    }

    function getClaimedClears() {
        return claimedClears;
    }

    /**
     * 停止探索（退出秘境）
     */
    function stopExploring() {
        if (exploreTimer) {
            clearInterval(exploreTimer);
            exploreTimer = null;
        }
        isExploring = false;
        currentStage = null;
        totalElapsed = 0;
        claimedClears = 0;
        exploreStartTime = 0;
    }

    /**
     * 获取存档数据
     */
    function getSaveData() {
        return {
            isExploring: isExploring,
            currentStageId: currentStage ? currentStage.ID : null,
            totalElapsed: getTotalElapsed(),
            claimedClears: claimedClears
        };
    }

    /**
     * 加载存档数据
     */
    function loadSaveData(data) {
        if (!data) return;
        if (data.isExploring && data.currentStageId) {
            // 恢复探索状态
            var stage = null;
            for (var i = 0; i < stagesData.length; i++) {
                if (String(stagesData[i].ID) === String(data.currentStageId)) {
                    stage = stagesData[i];
                    break;
                }
            }
            if (stage) {
                isExploring = true;
                currentStage = stage;
                claimedClears = data.claimedClears || 0;
                // 从离线时间恢复
                var savedElapsed = data.totalElapsed || 0;
                exploreStartTime = Date.now() - savedElapsed * 1000;
                totalElapsed = savedElapsed;

                exploreTimer = setInterval(function() {
                    totalElapsed = Math.floor((Date.now() - exploreStartTime) / 1000);
                }, 200);
            }
        }
    }

    return {
        init: init,
        getStages: getStages,
        getVisibleStages: getVisibleStages,
        canEnterStage: canEnterStage,
        getRequiredLevelName: getRequiredLevelName,
        enterStage: enterStage,
        claimRewards: claimRewards,
        applyClaimRewards: applyClaimRewards,
        getDeathPenaltyDesc: getDeathPenaltyDesc,
        getIsExploring: getIsExploring,
        getCurrentStage: getCurrentStage,
        getCurrentStageId: getCurrentStageId,
        getTotalElapsed: getTotalElapsed,
        getTotalClears: getTotalClears,
        getClaimableClears: getClaimableClears,
        getClaimedClears: getClaimedClears,
        getCurrentProgress: getCurrentProgress,
        stopExploring: stopExploring,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData
    };
})();
