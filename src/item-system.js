// 物品系统模块 - 管理物品数据、掉落和关卡奖励生成
const ItemSystem = (function() {
    let itemsData = [];       // 物品表数据
    let dropsData = [];       // 掉落表数据
    let equipmentsData = [];  // 装备表数据（用于生成装备奖励）

    /**
     * 初始化物品系统
     * @param {array} items - 处理后的物品数据
     * @param {array} drops - 处理后的掉落数据
     * @param {array} equipments - 处理后的装备数据
     */
    function init(items, drops, equipments) {
        itemsData = items || [];
        dropsData = drops || [];
        equipmentsData = equipments || [];
        console.log('物品系统初始化完成，物品:', itemsData.length, '条，掉落:', dropsData.length, '条，装备:', equipmentsData.length, '条');
    }

    /**
     * 根据ID获取物品信息
     * @param {number} itemId - 物品ID
     * @returns {object|null}
     */
    function getItemById(itemId) {
        return itemsData.find(function(item) { return item.ID === itemId; }) || null;
    }

    /**
     * 获取掉落组内的所有条目
     * @param {number} dropGroupId - 掉落组ID
     * @returns {array}
     */
    function getDropsByGroupId(dropGroupId) {
        return dropsData.filter(function(d) { return d.DropGroupID === dropGroupId; });
    }

    /**
     * 根据品质获取可选装备列表
     * @param {number} quality - 装备品质(1-5)
     * @param {number} playerLevel - 玩家当前等级(可选，用于筛选等级范围)
     * @returns {array} 符合条件的装备列表
     */
    function getEquipmentsByQuality(quality, playerLevel) {
        return equipmentsData.filter(function(e) {
            if (e.EquipmentQuality !== quality) return false;
            // 如果提供了玩家等级，筛选等级范围
            if (playerLevel !== undefined) {
                return playerLevel >= e.LevelMin && playerLevel <= e.LevelMax;
            }
            return true;
        });
    }

    /**
     * 根据权重随机选择N个不重复的条目
     * @param {array} entries - 掉落条目数组
     * @param {number} count - 需要选择的数量
     * @returns {array} 选中的条目
     */
    function weightedRandomSelect(entries, count) {
        if (entries.length === 0) return [];
        if (entries.length <= count) return entries.slice(); // 不够选，全部返回

        var remaining = entries.slice(); // 拷贝
        var selected = [];

        for (var i = 0; i < count && remaining.length > 0; i++) {
            // 计算总权重
            var totalWeight = 0;
            for (var j = 0; j < remaining.length; j++) {
                totalWeight += remaining[j].Weight;
            }

            // 随机值
            var rand = Math.random() * totalWeight;
            var cumWeight = 0;
            var pickedIndex = 0;

            for (var k = 0; k < remaining.length; k++) {
                cumWeight += remaining[k].Weight;
                if (rand <= cumWeight) {
                    pickedIndex = k;
                    break;
                }
            }

            selected.push(remaining[pickedIndex]);
            remaining.splice(pickedIndex, 1); // 移除已选，保证不重复
        }

        return selected;
    }

    /**
     * 生成关卡奖励（核心逻辑）
     * 
     * 流程:
     * 1. 读取关卡的DropGroupID，获取掉落组中所有条目
     * 2. 根据RewardTypes，按权重从掉落组中随机选出N种
     * 3. 读取RewardCount作为总数量
     * 4. 如果选中的种类中包含装备(DropType=2)，装备数量不超过5
     * 5. 剩余数量均分给其他物品种类
     * 
     * @param {object} stage - 关卡数据
     * @param {number} playerLevel - 玩家当前等级(可选)
     * @returns {object} { items: [{type, id, name, desc, count, quality?}], description }
     */
    function generateStageReward(stage, playerLevel) {
        var dropGroupId = stage.DropGroupID;
        var rewardCount = stage.RewardCount || 5;
        var rewardTypes = stage.RewardTypes || 2;

        // 1. 获取掉落组中所有条目
        var allDropEntries = getDropsByGroupId(dropGroupId);
        if (allDropEntries.length === 0) {
            return { items: [], description: '没有找到掉落配置' };
        }

        // 2. 按权重随机选出 rewardTypes 种
        var selectedEntries = weightedRandomSelect(allDropEntries, rewardTypes);
        if (selectedEntries.length === 0) {
            return { items: [], description: '随机选择掉落失败' };
        }

        // 3. 分离装备类和物品类
        var equipEntries = [];
        var itemEntries = [];
        for (var i = 0; i < selectedEntries.length; i++) {
            if (selectedEntries[i].DropType === 2) {
                equipEntries.push(selectedEntries[i]);
            } else {
                itemEntries.push(selectedEntries[i]);
            }
        }

        // 4. 计算装备数量（每种装备给1件，总装备数不超过5）
        var totalEquipCount = 0;
        var equipAllocations = [];
        for (var e = 0; e < equipEntries.length; e++) {
            // 在MinCount和MaxCount之间随机
            var eCount = equipEntries[e].MinCount + Math.floor(Math.random() * (equipEntries[e].MaxCount - equipEntries[e].MinCount + 1));
            eCount = Math.min(eCount, 5); // 单种装备也不超过5
            equipAllocations.push({ entry: equipEntries[e], count: eCount });
            totalEquipCount += eCount;
        }

        // 总装备数不超过5
        if (totalEquipCount > 5) {
            // 按比例缩减
            var scale = 5 / totalEquipCount;
            totalEquipCount = 0;
            for (var s = 0; s < equipAllocations.length; s++) {
                equipAllocations[s].count = Math.max(1, Math.floor(equipAllocations[s].count * scale));
                totalEquipCount += equipAllocations[s].count;
            }
            // 如果缩减后还超过5，强制截断
            while (totalEquipCount > 5) {
                for (var t = equipAllocations.length - 1; t >= 0 && totalEquipCount > 5; t--) {
                    if (equipAllocations[t].count > 1) {
                        equipAllocations[t].count--;
                        totalEquipCount--;
                    }
                }
                // 如果都是1了还超过5，只保留前5个
                if (totalEquipCount > 5) {
                    equipAllocations = equipAllocations.slice(0, 5);
                    totalEquipCount = 5;
                }
            }
        }

        // 5. 剩余数量分配给物品种类
        var remainingCount = Math.max(0, rewardCount - totalEquipCount);

        var itemAllocations = [];
        if (itemEntries.length > 0 && remainingCount > 0) {
            // 均分给各物品种类
            var basePerItem = Math.floor(remainingCount / itemEntries.length);
            var extraItems = remainingCount % itemEntries.length;

            for (var m = 0; m < itemEntries.length; m++) {
                var itemCount = basePerItem + (m < extraItems ? 1 : 0);
                if (itemCount > 0) {
                    itemAllocations.push({ entry: itemEntries[m], count: itemCount });
                }
            }
        } else if (itemEntries.length === 0 && remainingCount > 0) {
            // 全是装备种类，剩余数量也分给装备（但总装备仍不超过5）
            // 已经处理了，不需要额外操作
        }

        // 6. 生成最终奖励列表
        var rewardItems = [];

        // 生成物品奖励
        for (var a = 0; a < itemAllocations.length; a++) {
            var alloc = itemAllocations[a];
            var itemInfo = getItemById(alloc.entry.RefID);
            if (itemInfo) {
                rewardItems.push({
                    type: 'item',
                    id: itemInfo.ID,
                    name: itemInfo.ItemName,
                    desc: itemInfo.ItemDesc,
                    count: alloc.count,
                    stackLimit: itemInfo.StackLimit
                });
            }
        }

        // 生成装备奖励
        for (var b = 0; b < equipAllocations.length; b++) {
            var eAlloc = equipAllocations[b];
            var quality = eAlloc.entry.RefID; // RefID = 装备品质
            var candidates = getEquipmentsByQuality(quality, playerLevel);

            if (candidates.length === 0) {
                // 如果当前等级没有符合的装备，放宽等级限制
                candidates = getEquipmentsByQuality(quality);
            }

            if (candidates.length > 0) {
                for (var c = 0; c < eAlloc.count; c++) {
                    // 随机选一件装备
                    var randEquip = candidates[Math.floor(Math.random() * candidates.length)];
                    rewardItems.push({
                        type: 'equipment',
                        id: randEquip.ID,
                        name: randEquip.EquipmentName,
                        desc: randEquip.Desc,
                        count: 1,
                        quality: randEquip.EquipmentQuality,
                        equipmentData: Object.assign({}, randEquip) // 完整装备数据副本
                    });
                }
            }
        }

        // 构建描述
        var descParts = [];
        for (var d = 0; d < rewardItems.length; d++) {
            var ri = rewardItems[d];
            if (ri.type === 'item') {
                descParts.push(ri.name + '×' + ri.count);
            } else {
                descParts.push(ri.name + (ri.count > 1 ? '×' + ri.count : ''));
            }
        }

        return {
            items: rewardItems,
            description: descParts.join('、') || '空'
        };
    }

    /**
     * 将奖励物品应用到背包
     * @param {array} rewardItems - generateStageReward返回的items数组
     * @returns {array} 结果消息数组
     */
    function applyRewardToBackpack(rewardItems) {
        var backpack = GameLogic.getBackpack();
        var messages = [];

        for (var i = 0; i < rewardItems.length; i++) {
            var item = rewardItems[i];

            if (item.type === 'item') {
                // 物品 - 使用叠加逻辑
                var result = addItemToBackpack(backpack, item.id, item.count);
                messages.push(result.message);
            } else if (item.type === 'equipment') {
                // 装备 - 直接放入背包
                var success = GameLogic.addToBackpack(item.equipmentData);
                if (success) {
                    messages.push('获得装备：' + item.name);
                } else {
                    messages.push('背包已满，' + item.name + '被丢弃');
                }
            }
        }

        // 刷新背包UI
        GameUI.updateBackpack(backpack);

        return messages;
    }

    /**
     * 将物品添加到背包（支持叠加）
     * 背包格式: [{type:'item', itemId, itemName, itemDesc, stackLimit, count}, {type:'equipment', ...}, ...]
     * @param {array} backpack - 背包数组引用
     * @param {number} itemId - 物品ID
     * @param {number} count - 数量
     * @returns {object} {success, addedCount, message}
     */
    function addItemToBackpack(backpack, itemId, count) {
        // 基础资源（灵石/木材/食物）不进背包，走全局资源管理
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(itemId)) {
            return ResourceManager.add(itemId, count);
        }

        var item = getItemById(itemId);
        if (!item) return { success: false, addedCount: 0, message: '物品不存在' };

        var remaining = count;
        var addedCount = 0;

        // 第一步：尝试叠加到已有的同类物品格子中
        for (var i = 0; i < backpack.length && remaining > 0; i++) {
            var slot = backpack[i];
            if (slot && slot.type === 'item' && slot.itemId === itemId) {
                var canAdd = item.StackLimit - slot.count;
                if (canAdd > 0) {
                    var toAdd = Math.min(canAdd, remaining);
                    slot.count += toAdd;
                    remaining -= toAdd;
                    addedCount += toAdd;
                }
            }
        }

        // 第二步：如果还有剩余，放入新的空格子
        while (remaining > 0 && backpack.length < 40) {
            var stackCount = Math.min(remaining, item.StackLimit);
            backpack.push({
                type: 'item',
                itemId: item.ID,
                itemName: item.ItemName,
                itemDesc: item.ItemDesc,
                iconPath: item.IconPath || '',
                stackLimit: item.StackLimit,
                count: stackCount
            });
            remaining -= stackCount;
            addedCount += stackCount;
        }

        if (remaining > 0) {
            return {
                success: addedCount > 0,
                addedCount: addedCount,
                message: '获得' + item.ItemName + '×' + addedCount + '（背包满，' + remaining + '个丢失）'
            };
        }

        return {
            success: true,
            addedCount: addedCount,
            message: '获得' + item.ItemName + '×' + addedCount
        };
    }

    /**
     * 获取所有物品数据
     */
    function getItems() {
        return itemsData;
    }

    /**
     * 获取所有掉落数据
     */
    function getDrops() {
        return dropsData;
    }

    return {
        init: init,
        getItemById: getItemById,
        getDropsByGroupId: getDropsByGroupId,
        getEquipmentsByQuality: getEquipmentsByQuality,
        generateStageReward: generateStageReward,
        applyRewardToBackpack: applyRewardToBackpack,
        addItemToBackpack: addItemToBackpack,
        getItems: getItems,
        getDrops: getDrops
    };
})();
