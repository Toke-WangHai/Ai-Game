// 丹药系统模块 - 读取丹药表配置，提供丹药使用和突破配置查询
var PillSystem = (function() {

    // 丹药数据 (从丹药表加载)
    var pillsData = [];

    // 按ID索引
    var pillsById = {};

    // 突破配置缓存: { capLevel: { baseRate, failPenalty, pills: [{id, quality, bonus}] } }
    var breakthroughConfigCache = {};

    // 辅助丹药列表缓存
    var consumablePills = [];

    // 效果属性名称映射
    var EFFECT_NAME_MAP = {
        'Xiuyi': '修为',
        'Tipao': '体魄',
        'Life': '寿命'
    };

    /**
     * 初始化丹药系统
     * @param {array} pills - 处理后的丹药数据数组
     */
    function init(pills) {
        pillsData = pills || [];
        pillsById = {};
        breakthroughConfigCache = {};
        consumablePills = [];

        // 建立索引并分类
        for (var i = 0; i < pillsData.length; i++) {
            var pill = pillsData[i];
            pillsById[pill.ID] = pill;

            if (pill.PillType === 2) {
                // 辅助丹药
                consumablePills.push(pill);
            } else if (pill.PillType === 1 && pill.BreakthroughLevel > 0) {
                // 突破丹药 - 按瓶颈等级分组
                var lvl = pill.BreakthroughLevel;
                if (!breakthroughConfigCache[lvl]) {
                    breakthroughConfigCache[lvl] = {
                        baseRate: pill.BaseRate,
                        failPenalty: {
                            lifeLossRate: pill.FailLifeLossRate,
                            xiuyiLossRate: pill.FailXiuyiLossRate
                        },
                        pills: [],
                        pillIds: [],
                        pillBonus: []
                    };
                }
                breakthroughConfigCache[lvl].pills.push({
                    id: pill.ID,
                    quality: pill.PillQuality,
                    bonus: pill.PillBonus
                });
            }
        }

        // 整理突破配置：按品质排序，生成 pillIds 和 pillBonus 数组
        for (var capLevel in breakthroughConfigCache) {
            if (breakthroughConfigCache.hasOwnProperty(capLevel)) {
                var config = breakthroughConfigCache[capLevel];
                // 按品质排序 1=下品, 2=中品, 3=上品
                config.pills.sort(function(a, b) { return a.quality - b.quality; });
                config.pillIds = [];
                config.pillBonus = [];
                for (var j = 0; j < config.pills.length; j++) {
                    config.pillIds.push(config.pills[j].id);
                    config.pillBonus.push(config.pills[j].bonus);
                }
            }
        }

        console.log('[丹药系统] 初始化完成: 突破丹药配置 ' + Object.keys(breakthroughConfigCache).length + ' 个境界, 辅助丹药 ' + consumablePills.length + ' 种');
    }

    /**
     * 根据ID获取丹药数据
     */
    function getPillById(id) {
        return pillsById[id] || null;
    }

    /**
     * 判断某个物品ID是否是可使用的辅助丹药
     */
    function isConsumablePill(itemId) {
        var pill = pillsById[itemId];
        return pill && pill.PillType === 2;
    }

    /**
     * 使用辅助丹药，返回效果信息
     * @param {number} itemId - 物品ID
     * @param {object} player - 玩家对象
     * @returns {object|null} { success, effectMsg, effectType, effectValue } 或 null（非辅助丹药）
     */
    function useConsumable(itemId, player) {
        var pill = pillsById[itemId];
        if (!pill || pill.PillType !== 2 || !pill.EffectType || pill.EffectValue <= 0) {
            return null;
        }

        var effectType = pill.EffectType;
        var effectValue = pill.EffectValue;
        var effectName = EFFECT_NAME_MAP[effectType] || effectType;

        // 应用效果
        if (effectType === 'Xiuyi') {
            player.Xiuyi += effectValue;
        } else if (effectType === 'Tipao') {
            player.Tipao += effectValue;
        } else if (effectType === 'Life') {
            player.Life = (player.Life || 0) + effectValue;
        } else {
            // 未知效果类型，尝试直接赋值
            if (player.hasOwnProperty(effectType)) {
                player[effectType] += effectValue;
            } else {
                return null;
            }
        }

        return {
            success: true,
            effectMsg: effectName + ' +' + effectValue,
            effectType: effectType,
            effectValue: effectValue
        };
    }

    /**
     * 获取突破配置（供 BreakthroughSystem 使用）
     * @param {number} capLevel - 瓶颈等级
     * @returns {object|null} { baseRate, failPenalty, pillIds, pillBonus, pills }
     */
    function getBreakthroughConfig(capLevel) {
        return breakthroughConfigCache[capLevel] || null;
    }

    /**
     * 获取所有突破瓶颈等级列表
     * @returns {array} [10, 20, 30, ...]
     */
    function getBreakthroughLevels() {
        var levels = [];
        for (var lvl in breakthroughConfigCache) {
            if (breakthroughConfigCache.hasOwnProperty(lvl)) {
                levels.push(parseInt(lvl));
            }
        }
        return levels.sort(function(a, b) { return a - b; });
    }

    /**
     * 获取所有辅助丹药列表
     */
    function getConsumablePills() {
        return consumablePills.slice();
    }

    return {
        init: init,
        getPillById: getPillById,
        isConsumablePill: isConsumablePill,
        useConsumable: useConsumable,
        getBreakthroughConfig: getBreakthroughConfig,
        getBreakthroughLevels: getBreakthroughLevels,
        getConsumablePills: getConsumablePills
    };
})();
