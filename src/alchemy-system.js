// 炼丹炉系统模块 - 管理合成配方和炼丹（带独立炼制时间）
var AlchemySystem = (function() {
    var recipesData = []; // 合成表数据

    // 炼丹槽状态（当前只有1个槽位）
    var craftSlot = {
        recipeId: 0,        // 正在炼制的配方ID
        craftTime: 0,       // 需要的总炼制时间（秒）
        elapsed: 0,         // 已经过的秒数
        ready: false         // 是否炼制完成可领取
    };

    // 后台定时器
    var alchemyTimer = null;
    var lastTickTimestamp = 0;

    // UI回调
    var onUpdateCallback = null;

    /**
     * 根据配方ID计算炼制时间（秒）
     * 简单配方短，高级配方长
     */
    function getCraftTime(recipeId) {
        // ID 1~3: 筑基丹 → 60秒
        // ID 4~6: 金丹丹 → 90秒
        // ID 7~9: 元婴丹 → 120秒
        // ID 10~12: 化神丹 → 150秒
        // ID 13~15: 炼虚丹 → 180秒
        // ID 16~18: 合体丹 → 210秒
        // ID 19~21: 大乘丹 → 240秒
        // ID 22~24: 渡劫丹 → 300秒
        // ID 25~27: 辅助丹 → 45秒
        if (recipeId >= 25) return 45;
        if (recipeId >= 22) return 300;
        if (recipeId >= 19) return 240;
        if (recipeId >= 16) return 210;
        if (recipeId >= 13) return 180;
        if (recipeId >= 10) return 150;
        if (recipeId >= 7) return 120;
        if (recipeId >= 4) return 90;
        return 60;
    }

    /**
     * 初始化炼丹系统
     */
    function init(recipes) {
        recipesData = recipes || [];
        craftSlot = { recipeId: 0, craftTime: 0, elapsed: 0, ready: false };
        console.log('炼丹系统初始化完成，配方:', recipesData.length, '条');
    }

    /**
     * 获取所有配方
     */
    function getAllRecipes() {
        return recipesData;
    }

    /**
     * 根据ID获取配方
     */
    function getRecipeById(id) {
        for (var i = 0; i < recipesData.length; i++) {
            if (recipesData[i].ID === id) return recipesData[i];
        }
        return null;
    }

    /**
     * 检查背包中是否有足够的材料
     */
    function checkMaterials(recipe, backpack) {
        var materials = [];
        if (recipe.Material1ID > 0) materials.push({ id: recipe.Material1ID, count: recipe.Material1Count });
        if (recipe.Material2ID > 0) materials.push({ id: recipe.Material2ID, count: recipe.Material2Count });
        if (recipe.Material3ID > 0) materials.push({ id: recipe.Material3ID, count: recipe.Material3Count });

        var missing = [];
        var canCraft = true;

        for (var m = 0; m < materials.length; m++) {
            var mat = materials[m];
            var have = countItemInBackpack(backpack, mat.id);
            var itemInfo = ItemSystem.getItemById(mat.id);
            var itemName = itemInfo ? itemInfo.ItemName : '未知物品';

            if (have < mat.count) {
                canCraft = false;
                missing.push({ itemId: mat.id, itemName: itemName, need: mat.count, have: have });
            }
        }

        return { canCraft: canCraft, missing: missing };
    }

    /**
     * 统计背包中某物品的总数量
     */
    function countItemInBackpack(backpack, itemId) {
        var total = 0;
        for (var i = 0; i < backpack.length; i++) {
            if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === itemId) {
                total += backpack[i].count;
            }
        }
        return total;
    }

    /**
     * 从背包中扣除指定数量的物品
     */
    function deductItemFromBackpack(backpack, itemId, amount) {
        var remaining = amount;
        for (var i = backpack.length - 1; i >= 0 && remaining > 0; i--) {
            if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === itemId) {
                var take = Math.min(backpack[i].count, remaining);
                backpack[i].count -= take;
                remaining -= take;
                if (backpack[i].count <= 0) {
                    backpack.splice(i, 1);
                }
            }
        }
        return remaining === 0;
    }

    /**
     * 开始炼制（扣除材料，启动倒计时）
     * @param {number} recipeId - 配方ID
     * @returns {object} { success, message }
     */
    function startCraft(recipeId) {
        // 检查炼丹槽是否空闲
        if (craftSlot.recipeId > 0) {
            if (craftSlot.ready) {
                return { success: false, message: '炼丹炉中有已完成的丹药，请先领取' };
            } else {
                return { success: false, message: '炼丹炉正在炼制中，请耐心等待' };
            }
        }

        var recipe = getRecipeById(recipeId);
        if (!recipe) return { success: false, message: '配方不存在' };

        var backpack = GameLogic.getBackpack();
        var check = checkMaterials(recipe, backpack);

        if (!check.canCraft) {
            var missingMsg = [];
            for (var i = 0; i < check.missing.length; i++) {
                var m = check.missing[i];
                missingMsg.push(m.itemName + '(需' + m.need + '/有' + m.have + ')');
            }
            return { success: false, message: '材料不足：' + missingMsg.join('、') };
        }

        // 扣除材料
        var materials = [];
        if (recipe.Material1ID > 0) materials.push({ id: recipe.Material1ID, count: recipe.Material1Count });
        if (recipe.Material2ID > 0) materials.push({ id: recipe.Material2ID, count: recipe.Material2Count });
        if (recipe.Material3ID > 0) materials.push({ id: recipe.Material3ID, count: recipe.Material3Count });

        for (var j = 0; j < materials.length; j++) {
            deductItemFromBackpack(backpack, materials[j].id, materials[j].count);
        }
        GameUI.updateBackpack(backpack);

        // 设置炼丹槽
        var time = getCraftTime(recipeId);
        craftSlot.recipeId = recipeId;
        craftSlot.craftTime = time;
        craftSlot.elapsed = 0;
        craftSlot.ready = false;

        var timeMin = Math.floor(time / 60);
        var timeSec = time % 60;
        var timeStr = timeMin > 0 ? timeMin + '分' + timeSec + '秒' : timeSec + '秒';

        return { success: true, message: '开始炼制 ' + recipe.RecipeName + '，需要 ' + timeStr };
    }

    /**
     * 领取炼制完成的丹药
     * @returns {object} { success, message }
     */
    function collectCraft() {
        if (craftSlot.recipeId === 0) {
            return { success: false, message: '炼丹炉是空的' };
        }
        if (!craftSlot.ready) {
            return { success: false, message: '丹药尚未炼制完成' };
        }

        var recipe = getRecipeById(craftSlot.recipeId);
        if (!recipe) {
            // 异常清空
            craftSlot = { recipeId: 0, craftTime: 0, elapsed: 0, ready: false };
            return { success: false, message: '配方数据异常' };
        }

        // 添加产出物品到背包
        var backpack = GameLogic.getBackpack();
        var result = ItemSystem.addItemToBackpack(backpack, recipe.ResultItemID, recipe.ResultCount);
        GameUI.updateBackpack(backpack);

        // 清空炼丹槽
        craftSlot = { recipeId: 0, craftTime: 0, elapsed: 0, ready: false };

        if (result.success) {
            return { success: true, message: '炼丹成功！获得 ' + recipe.RecipeName + ' ×' + recipe.ResultCount };
        } else {
            return { success: true, message: '炼丹成功但背包已满，部分丹药丢失' };
        }
    }

    /**
     * 获取炼丹槽状态
     */
    function getCraftSlot() {
        return craftSlot;
    }

    // ====== 后台定时器 ======

    /**
     * 启动后台定时器
     */
    function startTimer() {
        stopTimer();
        lastTickTimestamp = Date.now();
        alchemyTimer = setInterval(function() {
            var now = Date.now();
            var elapsed = Math.floor((now - lastTickTimestamp) / 1000);
            if (elapsed <= 0) return;
            lastTickTimestamp += elapsed * 1000;
            // 补算多个tick
            for (var t = 0; t < elapsed; t++) {
                tickCraft();
            }
            if (onUpdateCallback) onUpdateCallback();
        }, 200);
    }

    /**
     * 停止后台定时器
     */
    function stopTimer() {
        if (alchemyTimer) {
            clearInterval(alchemyTimer);
            alchemyTimer = null;
        }
    }

    /**
     * 炼丹每秒tick
     */
    function tickCraft() {
        if (craftSlot.recipeId > 0 && !craftSlot.ready) {
            craftSlot.elapsed++;
            if (craftSlot.elapsed >= craftSlot.craftTime) {
                craftSlot.ready = true;
            }
        }
    }

    function isTimerRunning() {
        return alchemyTimer !== null;
    }

    function setUpdateCallback(cb) {
        onUpdateCallback = cb;
    }

    // ====== 存档 ======

    function getSaveData() {
        return {
            recipeId: craftSlot.recipeId,
            craftTime: craftSlot.craftTime,
            elapsed: craftSlot.elapsed,
            ready: craftSlot.ready
        };
    }

    function loadSaveData(data) {
        if (!data) return;
        craftSlot.recipeId = data.recipeId || 0;
        craftSlot.craftTime = data.craftTime || 0;
        craftSlot.elapsed = data.elapsed || 0;
        craftSlot.ready = data.ready || false;
    }

    return {
        init: init,
        getAllRecipes: getAllRecipes,
        getRecipeById: getRecipeById,
        checkMaterials: checkMaterials,
        countItemInBackpack: countItemInBackpack,
        startCraft: startCraft,
        collectCraft: collectCraft,
        getCraftSlot: getCraftSlot,
        getCraftTime: getCraftTime,
        startTimer: startTimer,
        stopTimer: stopTimer,
        isTimerRunning: isTimerRunning,
        setUpdateCallback: setUpdateCallback,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData
    };
})();
console.log('[模块] alchemy-system.js 加载完成');
