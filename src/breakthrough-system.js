// 突破系统模块 - 管理等级突破限制（雷池渡劫）
var BreakthroughSystem = (function() {

    // 突破配置（从丹药表动态构建）
    // 结构: { capLevel: { pillIds, baseRate, pillBonus, failPenalty, realmName } }
    var BREAKTHROUGH_CONFIG = {};

    // 品质名称映射
    var QUALITY_NAMES = { 1: '下品', 2: '中品', 3: '上品' };
    var QUALITY_COLORS = { 1: '#9b9b9b', 2: '#4abd7e', 3: '#ffd700' };

    // 记录玩家是否已突破某个瓶颈（等级ID -> true）
    var breakthroughStatus = {};

    /**
     * 初始化突破系统（从丹药表构建配置）
     */
    function init() {
        breakthroughStatus = {};

        // 清空原对象（保持引用不变，因为外部通过 BREAKTHROUGH_CONFIG 属性访问）
        for (var oldKey in BREAKTHROUGH_CONFIG) {
            if (BREAKTHROUGH_CONFIG.hasOwnProperty(oldKey)) {
                delete BREAKTHROUGH_CONFIG[oldKey];
            }
        }

        // 从 PillSystem 获取突破配置
        if (typeof PillSystem !== 'undefined') {
            var levels = PillSystem.getBreakthroughLevels();
            for (var i = 0; i < levels.length; i++) {
                var capLevel = levels[i];
                var pillConfig = PillSystem.getBreakthroughConfig(capLevel);
                if (pillConfig) {
                    // 从等级表获取下一境界名称
                    var realmName = '未知';
                    if (typeof LevelCalculator !== 'undefined') {
                        var nextLevel = LevelCalculator.getLevelById(capLevel + 1);
                        if (nextLevel && nextLevel.levelName) {
                            // 取境界大名（如"筑基1层" → "筑基"）
                            var name = nextLevel.levelName;
                            name = name.replace(/\d+层.*$/, '');
                            realmName = name;
                        }
                    }
                    BREAKTHROUGH_CONFIG[capLevel] = {
                        pillIds: pillConfig.pillIds,
                        baseRate: pillConfig.baseRate,
                        pillBonus: pillConfig.pillBonus,
                        failPenalty: pillConfig.failPenalty,
                        realmName: realmName
                    };
                }
            }
        }

        console.log('[突破系统] 初始化完成: ' + Object.keys(BREAKTHROUGH_CONFIG).length + ' 个瓶颈配置');
    }

    /**
     * 获取某个瓶颈的配置
     */
    function getConfig(capLevel) {
        return BREAKTHROUGH_CONFIG[capLevel] || null;
    }

    /**
     * 检查当前等级是否被瓶颈限制
     * 返回：null 表示无限制，否则返回突破信息
     */
    function checkBreakthroughNeeded(currentLevelId, xiuyi) {
        for (var capLevel in BREAKTHROUGH_CONFIG) {
            if (BREAKTHROUGH_CONFIG.hasOwnProperty(capLevel)) {
                var cap = parseInt(capLevel);
                if (currentLevelId === cap && !breakthroughStatus[cap]) {
                    var nextLevel = LevelCalculator.getLevelById(cap + 1);
                    if (nextLevel && xiuyi >= nextLevel.requiredXiuyi) {
                        var config = BREAKTHROUGH_CONFIG[cap];
                        return {
                            capLevel: cap,
                            nextRealmName: config.realmName,
                            baseRate: config.baseRate,
                            pillIds: config.pillIds,
                            pillBonus: config.pillBonus
                        };
                    }
                }
            }
        }
        return null;
    }

    /**
     * 获取被限制的等级（如果修为超过了瓶颈但未突破，返回瓶颈等级）
     */
    function getEffectiveLevel(xiuyi) {
        var rawLevel = LevelCalculator.calculateLevel(xiuyi);

        for (var capLevel in BREAKTHROUGH_CONFIG) {
            if (BREAKTHROUGH_CONFIG.hasOwnProperty(capLevel)) {
                var cap = parseInt(capLevel);
                if (!breakthroughStatus[cap]) {
                    var nextLevel = LevelCalculator.getLevelById(cap + 1);
                    if (nextLevel && xiuyi >= nextLevel.requiredXiuyi) {
                        var cappedLevel = LevelCalculator.getLevelById(cap);
                        if (cappedLevel) {
                            return {
                                level: cappedLevel.level,
                                levelName: cappedLevel.levelName,
                                requiredXiuyi: cappedLevel.requiredXiuyi,
                                description: '需要进入雷池突破',
                                capped: true,
                                capLevel: cap
                            };
                        }
                    }
                }
            }
        }

        return rawLevel;
    }

    /**
     * 扫描背包中可用的突破丹药
     * @param {number} capLevel - 瓶颈等级
     * @returns {array} [{slotIndex, itemId, quality, qualityName, pillName, bonus}]
     */
    function scanAvailablePills(capLevel) {
        var config = BREAKTHROUGH_CONFIG[capLevel];
        if (!config) return [];

        var backpack = GameLogic.getBackpack();
        var pills = [];

        for (var i = 0; i < backpack.length; i++) {
            if (backpack[i] && backpack[i].type === 'item') {
                for (var q = 0; q < config.pillIds.length; q++) {
                    if (backpack[i].itemId === config.pillIds[q]) {
                        var itemInfo = ItemSystem.getItemById(config.pillIds[q]);
                        pills.push({
                            slotIndex: i,
                            itemId: config.pillIds[q],
                            quality: q + 1,
                            qualityName: QUALITY_NAMES[q + 1],
                            qualityColor: QUALITY_COLORS[q + 1],
                            pillName: itemInfo ? itemInfo.ItemName : '未知丹药',
                            bonus: config.pillBonus[q],
                            totalRate: Math.min(config.baseRate + config.pillBonus[q], 1.0),
                            count: backpack[i].count
                        });
                    }
                }
            }
        }

        return pills;
    }

    /**
     * 尝试突破（雷池渡劫）
     * @param {number} capLevel - 瓶颈等级ID
     * @param {Array|null} usedPillIds - 已服用的丹药ID数组，null或空数组表示不使用丹药
     * @returns {object} { success, message, lostLife, lostXiuyi, finalRate }
     */
    function attemptBreakthrough(capLevel, usedPillIds) {
        var config = BREAKTHROUGH_CONFIG[capLevel];
        if (!config) return { success: false, message: '无效的突破等级' };

        var player = GameLogic.getPlayer();
        var backpack = GameLogic.getBackpack();

        // 计算最终突破几率
        var finalRate = config.baseRate;
        var usedPillNames = [];

        if (usedPillIds && usedPillIds.length > 0) {
            for (var p = 0; p < usedPillIds.length; p++) {
                var pillItemId = usedPillIds[p];

                // 检查是否有丹药
                var have = false;
                for (var i = 0; i < backpack.length; i++) {
                    if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === pillItemId) {
                        have = true;
                        break;
                    }
                }
                if (!have) {
                    var missingInfo = ItemSystem.getItemById(pillItemId);
                    return { success: false, message: '背包中没有' + (missingInfo ? missingInfo.ItemName : '该丹药') + '！' };
                }

                // 获取丹药品质对应的加成
                for (var q = 0; q < config.pillIds.length; q++) {
                    if (config.pillIds[q] === pillItemId) {
                        finalRate += config.pillBonus[q];
                        break;
                    }
                }

                // 扣除丹药
                for (var j = backpack.length - 1; j >= 0; j--) {
                    if (backpack[j] && backpack[j].type === 'item' && backpack[j].itemId === pillItemId) {
                        var pillInfo = ItemSystem.getItemById(pillItemId);
                        usedPillNames.push(pillInfo ? pillInfo.ItemName : '丹药');
                        backpack[j].count -= 1;
                        if (backpack[j].count <= 0) {
                            backpack.splice(j, 1);
                        }
                        break;
                    }
                }
            }
            GameUI.updateBackpack(backpack);
        }

        finalRate = Math.min(finalRate, 1.0);

        // 掷骰子
        var roll = Math.random();
        var isSuccess = roll < finalRate;

        var pillDesc = usedPillNames.length > 0 ? '服用' + usedPillNames.join('、') + '，' : '';

        if (isSuccess) {
            // 突破成功！
            breakthroughStatus[capLevel] = true;
            var realmName = config.realmName;
            var msg = pillDesc + '⚡ 渡劫成功！成功踏入' + realmName + '境界！';
            return {
                success: true,
                message: msg,
                lostLife: 0,
                lostXiuyi: 0,
                finalRate: finalRate
            };
        } else {
            // 突破失败，施加惩罚
            var penalty = config.failPenalty;
            var lostLife = Math.floor(player.Shouming * penalty.lifeLossRate);
            var lostXiuyi = Math.floor(player.Xiuyi * penalty.xiuyiLossRate);

            // 确保至少损失1点但不会直接致死
            lostLife = Math.max(1, lostLife);
            lostXiuyi = Math.max(1, lostXiuyi);

            // 确保寿命不会降到0以下（留1条命）
            if (player.Shouming - lostLife <= 0) {
                lostLife = Math.max(0, player.Shouming - 1);
            }

            player.Shouming -= lostLife;
            player.Xiuyi -= lostXiuyi;
            if (player.Xiuyi < 0) player.Xiuyi = 0;

            var failMsg = pillDesc + '💥 渡劫失败！天雷反噬，损失寿命' + lostLife + '年、修为' + lostXiuyi + '点';
            return {
                success: false,
                message: failMsg,
                lostLife: lostLife,
                lostXiuyi: lostXiuyi,
                finalRate: finalRate
            };
        }
    }

    /**
     * 获取突破状态（用于存档）
     */
    function getSaveData() {
        return { breakthroughStatus: breakthroughStatus };
    }

    /**
     * 加载存档数据
     */
    function loadSaveData(data) {
        if (data && data.breakthroughStatus) {
            breakthroughStatus = data.breakthroughStatus;
        } else {
            breakthroughStatus = {};
        }
    }

    /**
     * 是否已突破指定瓶颈
     */
    function hasBreakthrough(capLevel) {
        return !!breakthroughStatus[capLevel];
    }

    return {
        init: init,
        getConfig: getConfig,
        checkBreakthroughNeeded: checkBreakthroughNeeded,
        getEffectiveLevel: getEffectiveLevel,
        scanAvailablePills: scanAvailablePills,
        attemptBreakthrough: attemptBreakthrough,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData,
        hasBreakthrough: hasBreakthrough,
        BREAKTHROUGH_CONFIG: BREAKTHROUGH_CONFIG,
        QUALITY_NAMES: QUALITY_NAMES,
        QUALITY_COLORS: QUALITY_COLORS
    };
})();
console.log('[模块] breakthrough-system.js 加载完成');
