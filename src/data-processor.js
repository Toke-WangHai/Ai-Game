// 数据处理器模块 - 负责数据类型转换和验证
const DataProcessor = (function() {
    /**
     * 转换为整数，失败返回默认值
     * @param {string} value - 字符串值
     * @param {number} defaultValue - 默认值
     * @returns {number}
     */
    function toInt(value, defaultValue = 0) {
        const num = parseInt(value, 10);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * 转换为可空整数，空字符串返回null
     * @param {string} value - 字符串值
     * @returns {number|null}
     */
    function toIntOrNull(value) {
        if (value === '' || value === null || value === undefined) return null;
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
    }

    /**
     * 处理基础属性数据
     * @param {object} data - 原始数据（字符串格式）
     * @returns {object} 处理后的数据
     */
    function processBaseAttr(data) {
        return {
            ID: toInt(data.ID, 1),
            Xiuyi: toInt(data.Xiuyi, 10),
            Tipao: toInt(data.Tipao, 10),
            Shouming: toInt(data.Shouming, 50),
            Qiyun: toInt(data.Qiyun, 10),
            Yuanshen: toInt(data.Yuanshen, 5)
        };
    }

    /**
     * 处理出生词条数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processWords(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Name: item.Name || '',
            Xiuyi: toInt(item.Xiuyi, 0),
            Tipao: toInt(item.Tipao, 0),
            Shouming: toInt(item.Shouming, 0),
            Qiyun: toInt(item.Qiyun, 0),
            Yuanshen: toInt(item.Yuanshen, 0),
            Weight: toInt(item.Weight, 0),
            Quality: toInt(item.Quality, 1)
        }));
    }

    /**
     * 处理事件数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processEvents(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Desc: item.Desc || '',
            Xiuyi: toInt(item.Xiuyi, 0),
            Tipao: toInt(item.Tipao, 0),
            Shouming: toInt(item.Shouming, 0),
            Qiyun: toInt(item.Qiyun, 0),
            Yuanshen: toInt(item.Yuanshen, 0),
            Weight: toInt(item.Weight, 0),
            EquipmentID: toIntOrNull(item.EquipmentID),
            LevelMin: toInt(item.LevelMin, 1), // 最小等级，默认1
            LevelMax: toInt(item.LevelMax, 91), // 最大等级，默认91
            ItemID: toIntOrNull(item.ItemID),     // 物品ID，可空
            ItemCount: toInt(item.ItemCount, 0)    // 物品数量，默认0
        }));
    }

    /**
     * 处理装备数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processEquipments(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            EquipmentName: item.EquipmentName || '',
            IconPath: item.IconPath || '',
            Column: toInt(item.Column, 1),
            EquipmentQuality: toInt(item.EquipmentQuality, 1), // 默认为1（白色品质）
            Desc: item.Desc || '',
            Xiuyi: toInt(item.Xiuyi, 0),
            Tipao: toInt(item.Tipao, 0),
            Shouming: toInt(item.Shouming, 0),
            Qiyun: toInt(item.Qiyun, 0),
            Yuanshen: toInt(item.Yuanshen, 0),
            LevelMin: toInt(item.LevelMin, 1), // 最小等级，默认1
            LevelMax: toInt(item.LevelMax, 91), // 最大等级，默认91
            Value: toInt(item.Value, 0)
        }));
    }

    /**
     * 处理属性数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processAttributes(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Attack: item.Attack || '',
            Defense: item.Defense || '',
            HP: item.HP || '',
            Dodge: item.Dodge || '',
            CriticalRate: item.CriticalRate || '',
            Mastery: item.Mastery || '',
            MasteryDefense: item.MasteryDefense || '',
            ConversionRatio: parseFloat(item.ConversionRatio) || 1.0,
            Description: item.Description || ''
        }));
    }

    /**
     * 处理等级表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processLevels(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            LevelName: item.LevelName || '',
            RequiredXiuyi: toInt(item.RequiredXiuyi, 0),
            Description: item.Description || ''
        }));
    }

    /**
     * 验证装备数据
     * @param {object} equipment - 装备对象
     * @returns {object} { valid: boolean, errors: string[] }
     */
    function validateEquipment(equipment) {
        const errors = [];

        if (!equipment.EquipmentName || equipment.EquipmentName.trim() === '') {
            errors.push('装备名称不能为空');
        }

        if (equipment.Column < 1 || equipment.Column > 6) {
            errors.push('栏位必须在1-6之间');
        }

        if (equipment.EquipmentQuality < 1 || equipment.EquipmentQuality > 5) {
            errors.push('品质必须在1-5之间');
        }

        if (equipment.ID <= 0) {
            errors.push('ID必须大于0');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 验证事件数据
     * @param {object} event - 事件对象
     * @returns {object} { valid: boolean, errors: string[] }
     */
    function validateEvent(event) {
        const errors = [];

        if (!event.Desc || event.Desc.trim() === '') {
            errors.push('事件描述不能为空');
        }

        if (event.ID <= 0) {
            errors.push('ID必须大于0');
        }

        // 如果有EquipmentID，检查是否为正整数
        if (event.EquipmentID !== null && event.EquipmentID <= 0) {
            errors.push('EquipmentID必须为正整数或null');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 处理物品表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processItems(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            ItemName: item.ItemName || '',
            ItemDesc: item.ItemDesc || '',
            StackLimit: toInt(item.StackLimit, 99),
            IconPath: item.IconPath || '',
            Value: toInt(item.Value, 0),
            Quality: toInt(item.Quality, 0)  // 0=无品质, 1=下品, 2=中品, 3=上品
        }));
    }

    /**
     * 处理掉落表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processDrops(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            DropGroupID: toInt(item.DropGroupID, 0),
            DropType: toInt(item.DropType, 1),      // 1=物品, 2=装备
            RefID: toInt(item.RefID, 0),             // 物品ID 或 装备品质
            MinCount: toInt(item.MinCount, 1),
            MaxCount: toInt(item.MaxCount, 1),
            Weight: toInt(item.Weight, 10000)
        }));
    }

    /**
     * 处理关卡表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processStages(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            StageName: item.StageName || '',
            RequiredLevel: toInt(item.RequiredLevel, 1),
            MinClearTime: toInt(item.MinClearTime, 30),
            MonsterGroupID: toInt(item.MonsterGroupID, 0),
            DropGroupID: toInt(item.DropGroupID, 0),
            DeathPenalty: toInt(item.DeathPenalty, 1),
            RewardCount: toInt(item.RewardCount, 5),      // 奖励总数量
            RewardTypes: toInt(item.RewardTypes, 2),       // 奖励种类数
            XiuyiReward: toInt(item.XiuyiReward, 0)        // 通关修为奖励
        }));
    }

    /**
     * 处理怪物表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processMonsters(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            MonsterName: item.MonsterName || '',
            Attack: toInt(item.Attack, 0),
            HP: toInt(item.HP, 0),
            Defense: toInt(item.Defense, 0),
            CriticalRate: toInt(item.CriticalRate, 0),
            Mastery: toInt(item.Mastery, 0),
            MasteryDefense: toInt(item.MasteryDefense, 0),
            Dodge: toInt(item.Dodge, 0)
        }));
    }

    /**
     * 处理怪物组表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processMonsterGroups(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Monster1: toIntOrNull(item.Monster1),
            Monster2: toIntOrNull(item.Monster2),
            Monster3: toIntOrNull(item.Monster3),
            Monster4: toIntOrNull(item.Monster4),
            Monster5: toIntOrNull(item.Monster5)
        }));
    }

    /**
     * 处理商店表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processShopData(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Slot: toInt(item.Slot, 1),
            ItemType: toInt(item.ItemType, 1),       // 1=物品, 2=装备品质
            RefID: toInt(item.RefID, 0),
            LevelMin: toInt(item.LevelMin, 1),
            LevelMax: toInt(item.LevelMax, 91),
            Weight: toInt(item.Weight, 1000),
            Price: toInt(item.Price, 0),
            PriceCurrency: toInt(item.PriceCurrency, 20001)
        }));
    }

    /**
     * 处理灵植表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processPlants(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            SeedID: toInt(item.SeedID, 0),
            SeedName: item.SeedName || '',
            GrowTime: toInt(item.GrowTime, 60),
            HarvestID: toInt(item.HarvestID, 0),
            HarvestCount: toInt(item.HarvestCount, 1),
            HarvestName: item.HarvestName || ''
        }));
    }

    /**
     * 处理灵池表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processSpiritPool(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            Level: toInt(item.Level, 1),
            XiuyiPerTick: toInt(item.XiuyiPerTick, 5),
            TickInterval: toInt(item.TickInterval, 15),
            MaxStorage: toInt(item.MaxStorage, 500),
            Description: item.Description || ''
        }));
    }

    /**
     * 处理建筑表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processBuildings(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            BuildType: toInt(item.BuildType, 1),
            BuildIndex: toInt(item.BuildIndex, 1),
            CostItemID1: toInt(item.CostItemID1, 0),
            CostCount1: toInt(item.CostCount1, 0),
            CostItemID2: toInt(item.CostItemID2, 0),
            CostCount2: toInt(item.CostCount2, 0),
            Description: item.Description || ''
        }));
    }

    /**
     * 处理合成表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processRecipes(dataList) {
        if (!Array.isArray(dataList)) return [];

        return dataList.map(item => ({
            ID: toInt(item.ID, 0),
            RecipeName: item.RecipeName || '',
            RecipeDesc: item.RecipeDesc || '',
            ResultItemID: toInt(item.ResultItemID, 0),
            ResultCount: toInt(item.ResultCount, 1),
            Material1ID: toInt(item.Material1ID, 0),
            Material1Count: toInt(item.Material1Count, 0),
            Material2ID: toInt(item.Material2ID, 0),
            Material2Count: toInt(item.Material2Count, 0),
            Material3ID: toInt(item.Material3ID, 0),
            Material3Count: toInt(item.Material3Count, 0)
        }));
    }

    /**
     * 处理矿山表数据
     * OreRates 格式: "50001:70;50002:30" -> [{id:50001,weight:70},...]
     */
    function processMineTable(dataList) {
        if (!Array.isArray(dataList)) return [];
        return dataList.map(function(item) {
            var oreRates = [];
            if (item.OreRates) {
                var parts = item.OreRates.split(';');
                for (var i = 0; i < parts.length; i++) {
                    var pair = parts[i].split(':');
                    if (pair.length === 2) {
                        oreRates.push({ id: toInt(pair[0], 0), weight: toInt(pair[1], 0) });
                    }
                }
            }
            return {
                ID: toInt(item.ID, 0),
                Level: toInt(item.Level, 1),
                MineName: item.MineName || '',
                OreRates: oreRates,
                YieldPerMin: toInt(item.YieldPerMin, 1),
                UpgradeCostItemID: toInt(item.UpgradeCostItemID, 0),
                UpgradeCostCount: toInt(item.UpgradeCostCount, 0),
                Description: item.Description || ''
            };
        });
    }

    /**
     * 处理猎场表数据
     */
    function processHuntTable(dataList) {
        if (!Array.isArray(dataList)) return [];
        return dataList.map(function(item) {
            return {
                ID: toInt(item.ID, 0),
                Level: toInt(item.Level, 1),
                HuntName: item.HuntName || '',
                YieldItemID: toInt(item.YieldItemID, 20003),
                YieldPerMin: toInt(item.YieldPerMin, 1),
                UpgradeCostItemID: toInt(item.UpgradeCostItemID, 0),
                UpgradeCostCount: toInt(item.UpgradeCostCount, 0),
                Description: item.Description || ''
            };
        });
    }

    /**
     * 处理奴仆表数据
     */
    function processServantTable(dataList) {
        if (!Array.isArray(dataList)) return [];
        return dataList.map(function(item) {
            return {
                ID: toInt(item.ID, 0),
                ServantType: item.ServantType || '',
                ServantName: item.ServantName || '',
                FoodCost: toInt(item.FoodCost, 10),
                Duration: toInt(item.Duration, 300),
                ActionInterval: toInt(item.ActionInterval, 0),
                Description: item.Description || ''
            };
        });
    }

    /**
     * 处理丹药表数据
     * @param {array} dataList - 原始数据数组（字符串格式）
     * @returns {array} 处理后的数据数组
     */
    function processPills(dataList) {
        if (!Array.isArray(dataList)) return [];
        return dataList.map(function(item) {
            return {
                ID: toInt(item.ID, 0),
                PillName: item.PillName || '',
                PillType: toInt(item.PillType, 0),           // 1=突破丹, 2=辅助丹
                EffectType: item.EffectType || '',            // Xiuyi/Tipao/Life
                EffectValue: toInt(item.EffectValue, 0),
                BreakthroughLevel: toInt(item.BreakthroughLevel, 0),
                PillQuality: toInt(item.PillQuality, 0),     // 1=下品, 2=中品, 3=上品
                BaseRate: parseFloat(item.BaseRate) || 0,
                PillBonus: parseFloat(item.PillBonus) || 0,
                FailLifeLossRate: parseFloat(item.FailLifeLossRate) || 0,
                FailXiuyiLossRate: parseFloat(item.FailXiuyiLossRate) || 0
            };
        });
    }

    // 暴露公共接口
    return {
        toInt: toInt,
        toIntOrNull: toIntOrNull,
        processBaseAttr: processBaseAttr,
        processWords: processWords,
        processEvents: processEvents,
        processEquipments: processEquipments,
        processAttributes: processAttributes,
        processLevels: processLevels,
        processStages: processStages,
        processMonsters: processMonsters,
        processMonsterGroups: processMonsterGroups,
        processItems: processItems,
        processDrops: processDrops,
        validateEquipment: validateEquipment,
        validateEvent: validateEvent,
        processShopData: processShopData,
        processPlants: processPlants,
        processSpiritPool: processSpiritPool,
        processBuildings: processBuildings,
        processRecipes: processRecipes,
        processMineTable: processMineTable,
        processHuntTable: processHuntTable,
        processServantTable: processServantTable,
        processPills: processPills
    };
})();
