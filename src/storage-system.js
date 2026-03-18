// 仓库系统模块 - 扩展背包的额外存储空间
var StorageSystem = (function() {
    var MAX_BASE_SLOTS = 20;      // 基础仓库格子数
    var SLOTS_PER_EXPAND = 10;    // 每次扩容增加的格子
    var MAX_TOTAL_SLOTS = 100;    // 仓库最大格子数

    // 扩容费用（第N次扩容的灵石花费）
    var EXPAND_COSTS = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

    var slots = [];           // 仓库格子数组 [{type,itemId,itemName,...}]
    var maxSlots = MAX_BASE_SLOTS;  // 当前最大格子数
    var expandCount = 0;      // 已扩容次数

    /**
     * 初始化仓库
     */
    function init() {
        slots = [];
        maxSlots = MAX_BASE_SLOTS;
        expandCount = 0;
    }

    /**
     * 获取仓库物品列表
     */
    function getSlots() {
        return slots;
    }

    /**
     * 获取当前最大格子数
     */
    function getMaxSlots() {
        return maxSlots;
    }

    /**
     * 获取已使用格子数
     */
    function getUsedSlots() {
        return slots.filter(function(s) { return s !== null && s !== undefined; }).length;
    }

    /**
     * 获取扩容次数
     */
    function getExpandCount() {
        return expandCount;
    }

    /**
     * 获取下次扩容费用
     */
    function getNextExpandCost() {
        if (maxSlots >= MAX_TOTAL_SLOTS) return null;
        var idx = Math.min(expandCount, EXPAND_COSTS.length - 1);
        return EXPAND_COSTS[idx];
    }

    /**
     * 扩容仓库
     */
    function expandStorage() {
        if (maxSlots >= MAX_TOTAL_SLOTS) {
            return { success: false, message: '仓库已达最大容量' };
        }

        var cost = getNextExpandCost();
        if (!cost) return { success: false, message: '仓库已达最大容量' };

        // 检查灵石
        var stoneCount = 0;
        if (typeof ResourceManager !== 'undefined') {
            stoneCount = ResourceManager.get(20001);
        } else {
            var backpack = GameLogic.getBackpack();
            for (var i = 0; i < backpack.length; i++) {
                if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === 20001) {
                    stoneCount += backpack[i].count;
                }
            }
        }

        if (stoneCount < cost) {
            return { success: false, message: '灵石不足，需要 ' + cost + ' 灵石，当前 ' + stoneCount };
        }

        // 扣灵石
        if (typeof ResourceManager !== 'undefined') {
            ResourceManager.spend(20001, cost);
        } else {
            var remaining = cost;
            var backpack2 = GameLogic.getBackpack();
            for (var j = backpack2.length - 1; j >= 0 && remaining > 0; j--) {
                if (backpack2[j] && backpack2[j].type === 'item' && backpack2[j].itemId === 20001) {
                    var deduct = Math.min(backpack2[j].count, remaining);
                    backpack2[j].count -= deduct;
                    remaining -= deduct;
                    if (backpack2[j].count <= 0) backpack2.splice(j, 1);
                }
            }
            GameUI.updateBackpack(backpack2);
        }

        maxSlots = Math.min(maxSlots + SLOTS_PER_EXPAND, MAX_TOTAL_SLOTS);
        expandCount++;

        return { success: true, message: '仓库扩容成功！当前容量：' + maxSlots + ' 格' };
    }

    /**
     * 添加物品到仓库（物品类型，自动叠加）
     */
    function addItem(itemId, count) {
        var itemInfo = ItemSystem.getItemById(itemId);
        if (!itemInfo) return { success: false, message: '物品不存在' };

        var remaining = count;
        var addedCount = 0;

        // 先叠加到已有的同类格子
        for (var i = 0; i < slots.length && remaining > 0; i++) {
            if (slots[i] && slots[i].type === 'item' && slots[i].itemId === itemId) {
                var canAdd = itemInfo.StackLimit - slots[i].count;
                if (canAdd > 0) {
                    var toAdd = Math.min(canAdd, remaining);
                    slots[i].count += toAdd;
                    remaining -= toAdd;
                    addedCount += toAdd;
                }
            }
        }

        // 放入新格子
        while (remaining > 0 && slots.length < maxSlots) {
            var stackCount = Math.min(remaining, itemInfo.StackLimit);
            slots.push({
                type: 'item',
                itemId: itemInfo.ID,
                itemName: itemInfo.ItemName,
                itemDesc: itemInfo.ItemDesc || '',
                iconPath: itemInfo.IconPath || '',
                stackLimit: itemInfo.StackLimit,
                count: stackCount
            });
            remaining -= stackCount;
            addedCount += stackCount;
        }

        if (remaining > 0) {
            return { success: addedCount > 0, addedCount: addedCount, message: '仓库空间不足，' + remaining + '个' + itemInfo.ItemName + '丢失' };
        }

        return { success: true, addedCount: addedCount, message: itemInfo.ItemName + ' ×' + addedCount + ' 存入仓库' };
    }

    /**
     * 添加装备到仓库
     */
    function addEquipment(equipData) {
        if (slots.length >= maxSlots) {
            return { success: false, message: '仓库已满' };
        }
        var equip = Object.assign({}, equipData);
        if (!equip.type) equip.type = 'equipment';
        slots.push(equip);
        return { success: true, message: (equip.EquipmentName || '装备') + ' 存入仓库' };
    }

    /**
     * 从仓库取出物品到背包
     * @param {number} slotIndex - 仓库格子索引
     * @param {number} count - 取出数量（物品类型），装备为1
     */
    function takeOut(slotIndex, count) {
        if (slotIndex < 0 || slotIndex >= slots.length || !slots[slotIndex]) {
            return { success: false, message: '无效的仓库格子' };
        }

        var slot = slots[slotIndex];
        var backpack = GameLogic.getBackpack();

        if (slot.type === 'item') {
            var takeCount = count || slot.count;
            takeCount = Math.min(takeCount, slot.count);

            var result = ItemSystem.addItemToBackpack(backpack, slot.itemId, takeCount);
            if (result.addedCount > 0) {
                slot.count -= result.addedCount;
                if (slot.count <= 0) {
                    slots.splice(slotIndex, 1);
                }
                GameUI.updateBackpack(backpack);
                return { success: true, message: '取出了 ' + (slot.itemName || '物品') + ' ×' + result.addedCount };
            } else {
                return { success: false, message: '背包已满，无法取出' };
            }
        } else {
            // 装备
            if (backpack.length >= 40) {
                return { success: false, message: '背包已满，无法取出' };
            }
            var equip = slots[slotIndex];
            slots.splice(slotIndex, 1);
            GameLogic.addToBackpack(equip);
            return { success: true, message: '取出了 ' + (equip.EquipmentName || '装备') };
        }
    }

    /**
     * 从背包存入仓库
     * @param {number} backpackIndex - 背包格子索引
     * @param {number} count - 存入数量（物品类型）
     */
    function storeFromBackpack(backpackIndex, count) {
        var backpack = GameLogic.getBackpack();
        if (backpackIndex < 0 || backpackIndex >= backpack.length || !backpack[backpackIndex]) {
            return { success: false, message: '无效的背包格子' };
        }

        var slot = backpack[backpackIndex];

        if (slot.type === 'item') {
            var storeCount = count || slot.count;
            storeCount = Math.min(storeCount, slot.count);

            var result = addItem(slot.itemId, storeCount);
            if (result.addedCount > 0) {
                slot.count -= result.addedCount;
                if (slot.count <= 0) {
                    backpack.splice(backpackIndex, 1);
                }
                GameUI.updateBackpack(backpack);
                return { success: true, message: '存入了 ' + (slot.itemName || '物品') + ' ×' + result.addedCount };
            } else {
                return { success: false, message: '仓库已满' };
            }
        } else {
            // 装备
            var equipResult = addEquipment(slot);
            if (equipResult.success) {
                backpack.splice(backpackIndex, 1);
                GameUI.updateBackpack(backpack);
            }
            return equipResult;
        }
    }

    /**
     * 获取存档数据
     */
    function getSaveData() {
        return {
            slots: slots.map(function(s) { return s ? Object.assign({}, s) : null; }),
            maxSlots: maxSlots,
            expandCount: expandCount
        };
    }

    /**
     * 加载存档数据
     */
    function loadSaveData(data) {
        if (!data) {
            init();
            return;
        }
        slots = data.slots || [];
        maxSlots = data.maxSlots || MAX_BASE_SLOTS;
        expandCount = data.expandCount || 0;
    }

    return {
        init: init,
        getSlots: getSlots,
        getMaxSlots: getMaxSlots,
        getUsedSlots: getUsedSlots,
        getExpandCount: getExpandCount,
        getNextExpandCost: getNextExpandCost,
        expandStorage: expandStorage,
        addItem: addItem,
        addEquipment: addEquipment,
        takeOut: takeOut,
        storeFromBackpack: storeFromBackpack,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData,
        MAX_TOTAL_SLOTS: MAX_TOTAL_SLOTS
    };
})();
console.log('[模块] storage-system.js 加载完成');
