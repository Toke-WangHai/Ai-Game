// 全局资源管理模块 - 管理不进入背包的基础资源（灵石、木材、食物）
const ResourceManager = (function() {
    // 三种基础资源定义
    var RESOURCE_IDS = {
        SPIRIT_STONE: 20001,  // 下品灵石
        WOOD: 20002,          // 木材
        FOOD: 20003           // 食物
    };

    // 资源数据
    var resources = {
        20001: 0,  // 下品灵石
        20002: 0,  // 木材
        20003: 0   // 食物
    };

    // UI更新回调
    var onUpdateCallback = null;

    /**
     * 判断一个物品ID是否是基础资源
     */
    function isResource(itemId) {
        return itemId === 20001 || itemId === 20002 || itemId === 20003;
    }

    /**
     * 获取资源数量
     */
    function get(itemId) {
        return resources[itemId] || 0;
    }

    /**
     * 增加资源
     * @returns {object} {success, addedCount, message}
     */
    function add(itemId, count) {
        if (!isResource(itemId)) return { success: false, addedCount: 0, message: '不是基础资源' };
        if (count <= 0) return { success: false, addedCount: 0, message: '数量无效' };
        resources[itemId] = (resources[itemId] || 0) + count;
        updateUI();
        var name = getResourceName(itemId);
        return { success: true, addedCount: count, message: '获得' + name + '×' + count };
    }

    /**
     * 消耗资源
     * @returns {boolean} 是否成功
     */
    function spend(itemId, count) {
        if (!isResource(itemId)) return false;
        if ((resources[itemId] || 0) < count) return false;
        resources[itemId] -= count;
        updateUI();
        return true;
    }

    /**
     * 检查资源是否足够
     */
    function has(itemId, count) {
        return (resources[itemId] || 0) >= count;
    }

    /**
     * 获取资源名称
     */
    function getResourceName(itemId) {
        switch (itemId) {
            case 20001: return '灵石';
            case 20002: return '木材';
            case 20003: return '食物';
            default: return '未知资源';
        }
    }

    /**
     * 获取资源图标
     */
    function getResourceIcon(itemId) {
        switch (itemId) {
            case 20001: return '💎';
            case 20002: return '🪵';
            case 20003: return '🍚';
            default: return '📦';
        }
    }

    /**
     * 格式化大数字
     */
    function formatNumber(num) {
        if (num >= 1000000000000) return (num / 1000000000000).toFixed(1) + '兆';
        if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + '万';
        return num.toString();
    }

    /**
     * 更新顶部资源UI
     */
    function updateUI() {
        var stoneEl = document.getElementById('res-spirit-stone');
        var woodEl = document.getElementById('res-wood');
        var foodEl = document.getElementById('res-food');
        if (stoneEl) stoneEl.textContent = formatNumber(resources[20001] || 0);
        if (woodEl) woodEl.textContent = formatNumber(resources[20002] || 0);
        if (foodEl) foodEl.textContent = formatNumber(resources[20003] || 0);
        if (onUpdateCallback) onUpdateCallback();
    }

    /**
     * 设置更新回调
     */
    function setUpdateCallback(cb) {
        onUpdateCallback = cb;
    }

    /**
     * 获取存档数据
     */
    function getSaveData() {
        return {
            spiritStone: resources[20001] || 0,
            wood: resources[20002] || 0,
            food: resources[20003] || 0
        };
    }

    /**
     * 从存档加载
     */
    function loadSaveData(data) {
        if (data) {
            resources[20001] = data.spiritStone || 0;
            resources[20002] = data.wood || 0;
            resources[20003] = data.food || 0;
        } else {
            resources[20001] = 0;
            resources[20002] = 0;
            resources[20003] = 0;
        }
        updateUI();
    }

    /**
     * 重置（新游戏时）
     */
    function reset() {
        resources[20001] = 0;
        resources[20002] = 0;
        resources[20003] = 0;
        updateUI();
    }

    /**
     * 从旧存档背包中迁移三种基础资源到ResourceManager
     * （兼容旧存档：如果背包中还有灵石/木材/食物，取出来放到资源中）
     */
    function migrateFromBackpack(backpack) {
        if (!backpack || !Array.isArray(backpack)) return;
        for (var i = backpack.length - 1; i >= 0; i--) {
            var slot = backpack[i];
            if (slot && slot.type === 'item' && isResource(slot.itemId)) {
                resources[slot.itemId] = (resources[slot.itemId] || 0) + slot.count;
                backpack.splice(i, 1);
            }
        }
        updateUI();
    }

    return {
        RESOURCE_IDS: RESOURCE_IDS,
        isResource: isResource,
        get: get,
        add: add,
        spend: spend,
        has: has,
        getResourceName: getResourceName,
        getResourceIcon: getResourceIcon,
        formatNumber: formatNumber,
        updateUI: updateUI,
        setUpdateCallback: setUpdateCallback,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData,
        reset: reset,
        migrateFromBackpack: migrateFromBackpack
    };
})();
console.log('[模块] resource-manager.js 加载完成');
