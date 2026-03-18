// 福地系统模块 - 管理灵池和灵田
const BlessedLand = (function() {
    // 配置数据
    var plantsData = [];      // 灵植表数据
    var spiritPoolData = [];  // 灵池表数据
    var buildingsData = [];   // 建筑表数据

    // 灵池状态
    var poolLevel = 1;            // 灵池当前等级
    var poolStoredXiuyi = 0;      // 灵池已储存的修为
    var poolTimer = null;         // 灵池产出定时器
    var poolElapsedSeconds = 0;   // 灵池已过秒数（用于计算产出）
    var lastTickTimestamp = 0;    // 上次tick的真实时间戳
    var poolBonusCapacity = 0;    // 灵石投入带来的临时额外上限

    // 灵田状态
    var fieldSlots = [];          // 12个灵田格子 [{unlocked, plantId, seedId, plantedTime, growTime, ready}, ...]
    var fieldTimer = null;        // 灵田生长定时器

    // UI回调
    var onUpdateCallback = null;

    // ====== 矿山系统 ======（由 KS_矿山表 配置）
    var mineTableData = [];  // 矿山表数据

    var mineLevel = 1;
    var mineActive = false;      // 是否正在挖矿
    var mineElapsed = 0;         // 挖矿已过秒数
    var minePendingOres = [];    // 待领取的矿石 [{id, count}]

    // ====== 奴仆系统 ======（由 NP_奴仆表 配置）
    var servantTableData = [];   // 奴仆表数据
    var servantAutoFarm = { active: false, remaining: 0 };   // 自动种田奴仆
    var servantAutoMine = { active: false, remaining: 0 };   // 自动挖矿奴仆
    var servantAutoHunt = { active: false, remaining: 0 };   // 自动打猎奴仆
    var farmActionCooldown = 0;   // 种田奴仆操作冷却
    var farmActionInterval = 5;   // 种田操作间隔（秒），从表中读取

    // ====== 打猎系统 ======（由 LC_猎场表 配置）
    var huntTableData = [];  // 猎场表数据

    var huntLevel = 1;
    var huntActive = false;      // 是否正在打猎
    var huntElapsed = 0;         // 打猎已过秒数
    var huntPendingFood = 0;     // 待领取的食物数量

    // 待领取奖励缓冲（奴仆产出不直接发到背包）
    var pendingRewards = [];  // [{itemId, count}]

    /**
     * 初始化福地系统
     */
    function init(plants, spiritPool, buildings, mineTable, huntTable, servantTable) {
        plantsData = plants || [];
        spiritPoolData = spiritPool || [];
        buildingsData = buildings || [];
        mineTableData = mineTable || [];
        huntTableData = huntTable || [];
        servantTableData = servantTable || [];

        // 从奴仆表读取种田操作间隔
        for (var s = 0; s < servantTableData.length; s++) {
            if (servantTableData[s].ServantType === 'autoFarm' && servantTableData[s].ActionInterval > 0) {
                farmActionInterval = servantTableData[s].ActionInterval;
                break;
            }
        }

        // 初始化12个灵田格子
        fieldSlots = [];
        for (var i = 0; i < 12; i++) {
            fieldSlots.push({
                unlocked: (i === 0),  // 第1块默认解锁
                seedId: 0,
                plantId: 0,
                plantedTime: 0,       // 种植时的时间戳
                growTime: 0,          // 需要的生长时间（秒）
                elapsed: 0,           // 已经过的秒数
                ready: false
            });
        }

        poolLevel = 1;
        poolStoredXiuyi = 0;
        poolElapsedSeconds = 0;
        poolBonusCapacity = 0;

        // 矿山初始化
        mineLevel = 1;
        mineActive = false;
        mineElapsed = 0;
        minePendingOres = [];

        // 奴仆初始化
        servantAutoFarm = { active: false, remaining: 0 };
        servantAutoMine = { active: false, remaining: 0 };
        servantAutoHunt = { active: false, remaining: 0 };
        farmActionCooldown = 0;
        pendingRewards = [];

        // 打猎初始化
        huntLevel = 1;
        huntActive = false;
        huntElapsed = 0;
        huntPendingFood = 0;

        console.log('福地系统初始化完成，灵植:', plantsData.length, '条，灵池:', spiritPoolData.length, '条，建筑:', buildingsData.length, '条，矿山:', mineTableData.length, '条，猎场:', huntTableData.length, '条，奴仆:', servantTableData.length, '条');
    }

    /**
     * 启动后台定时器（灵池产出 + 灵田生长）
     */
    function startTimers() {
        stopTimers();
        lastTickTimestamp = Date.now();
        // 200ms检测一次，用时间戳算实际流逝秒数
        poolTimer = setInterval(function() {
            var now = Date.now();
            var elapsed = Math.floor((now - lastTickTimestamp) / 1000);
            if (elapsed <= 0) return;
            lastTickTimestamp += elapsed * 1000;
            // 补算多个tick
            for (var t = 0; t < elapsed; t++) {
                tickPool();
                tickFields();
                tickMine();
                tickHunt();
                tickServants();
            }
            if (onUpdateCallback) onUpdateCallback();
        }, 200);
    }

    /**
     * 停止后台定时器
     */
    function stopTimers() {
        if (poolTimer) {
            clearInterval(poolTimer);
            poolTimer = null;
        }
    }

    /**
     * 灵池每秒tick
     * 产出修为存入灵池，上限 = 基础上限 + 临时上限(灵石投入)
     * 产出时优先消耗临时上限额度
     */
    function tickPool() {
        poolElapsedSeconds++;
        var poolConfig = getPoolConfig();
        if (!poolConfig) return;

        var interval = poolConfig.TickInterval || 15;
        if (poolElapsedSeconds >= interval) {
            poolElapsedSeconds = 0;
            var produce = poolConfig.XiuyiPerTick;
            var totalMax = poolConfig.MaxStorage + poolBonusCapacity;
            poolStoredXiuyi = Math.min(poolStoredXiuyi + produce, totalMax);
            // 优先消耗临时上限额度：每次产出减少bonus
            if (poolBonusCapacity > 0) {
                poolBonusCapacity = Math.max(0, poolBonusCapacity - produce);
            }
        }
    }

    /**
     * 灵田每秒tick
     */
    function tickFields() {
        for (var i = 0; i < fieldSlots.length; i++) {
            var slot = fieldSlots[i];
            if (slot.unlocked && slot.seedId > 0 && !slot.ready) {
                slot.elapsed++;
                if (slot.elapsed >= slot.growTime) {
                    slot.ready = true;
                }
            }
        }
    }

    /**
     * 矿山每秒tick - 每60秒产出一批矿石到待领取
     */
    function tickMine() {
        if (!mineActive) return;
        mineElapsed++;
        var mineConfig = getMineConfig();
        if (!mineConfig) return;
        // 每60秒产出一次
        if (mineElapsed % 60 === 0) {
            var yieldCount = mineConfig.YieldPerMin;
            for (var y = 0; y < yieldCount; y++) {
                var oreId = rollOre(mineConfig.OreRates);
                addPendingOre(oreId, 1);
            }
        }
    }

    /**
     * 打猎每秒tick - 每60秒产出一批食物到待领取
     */
    function tickHunt() {
        if (!huntActive) return;
        huntElapsed++;
        var huntConfig = getHuntConfig();
        if (!huntConfig) return;
        // 每60秒产出一次
        if (huntElapsed % 60 === 0) {
            huntPendingFood += huntConfig.YieldPerMin;
        }
    }

    /**
     * 奴仆每秒tick
     */
    function tickServants() {
        // 自动种田奴仆
        if (servantAutoFarm.active) {
            servantAutoFarm.remaining--;
            if (servantAutoFarm.remaining <= 0) {
                servantAutoFarm.active = false;
                servantAutoFarm.remaining = 0;
                farmActionCooldown = 0;
            } else {
                // 每 FARM_ACTION_INTERVAL 秒操作一块田
                farmActionCooldown++;
                if (farmActionCooldown >= farmActionInterval) {
                    farmActionCooldown = 0;
                    // 优先收获一块成熟的田，否则种植一块空田
                    if (!autoHarvestSingle()) {
                        autoPlantSingle();
                    }
                }
            }
        }
        // 自动挖矿奴仆
        if (servantAutoMine.active) {
            servantAutoMine.remaining--;
            if (servantAutoMine.remaining <= 0) {
                servantAutoMine.active = false;
                servantAutoMine.remaining = 0;
                // 奴仆到期，停止挖矿
                if (mineActive) {
                    mineActive = false;
                }
            } else {
                // 如果矿山没在挖，自动开始
                if (!mineActive) {
                    mineActive = true;
                    mineElapsed = 0;
                }
            }
        }
        // 自动打猎奴仆
        if (servantAutoHunt.active) {
            servantAutoHunt.remaining--;
            if (servantAutoHunt.remaining <= 0) {
                servantAutoHunt.active = false;
                servantAutoHunt.remaining = 0;
                // 奴仆到期，停止打猎
                if (huntActive) {
                    huntActive = false;
                }
            } else {
                // 如果猎场没在运作，自动开始
                if (!huntActive) {
                    huntActive = true;
                    huntElapsed = 0;
                }
            }
        }
    }

    /**
     * 自动种田：找第一块空田+找背包种子，只种一块
     * @returns {boolean} 是否成功种了一块
     */
    function autoPlantSingle() {
        var backpack = GameLogic.getBackpack();
        for (var i = 0; i < fieldSlots.length; i++) {
            var slot = fieldSlots[i];
            if (!slot.unlocked || slot.seedId > 0) continue;
            // 找背包里的种子
            for (var j = 0; j < backpack.length; j++) {
                if (backpack[j] && backpack[j].type === 'item') {
                    var plantConfig = getPlantBySeedId(backpack[j].itemId);
                    if (plantConfig && backpack[j].count > 0) {
                        // 消耗1个种子
                        backpack[j].count--;
                        if (backpack[j].count <= 0) {
                            backpack.splice(j, 1);
                        }
                        // 种植
                        slot.seedId = plantConfig.SeedID;
                        slot.plantId = plantConfig.ID;
                        slot.growTime = plantConfig.GrowTime;
                        slot.elapsed = 0;
                        slot.ready = false;
                        return true;
                    }
                }
            }
            return false; // 有空田但没种子
        }
        return false; // 没有空田
    }

    /**
     * 自动收获：收获第一块成熟的田到pendingRewards
     * @returns {boolean} 是否成功收了一块
     */
    function autoHarvestSingle() {
        for (var i = 0; i < fieldSlots.length; i++) {
            var slot = fieldSlots[i];
            if (slot.unlocked && slot.seedId > 0 && slot.ready) {
                var plantConfig = null;
                for (var p = 0; p < plantsData.length; p++) {
                    if (plantsData[p].ID === slot.plantId) {
                        plantConfig = plantsData[p];
                        break;
                    }
                }
                if (plantConfig) {
                    addPendingReward(plantConfig.HarvestID, plantConfig.HarvestCount);
                }
                // 清空灵田
                slot.seedId = 0;
                slot.plantId = 0;
                slot.growTime = 0;
                slot.elapsed = 0;
                slot.ready = false;
                return true;
            }
        }
        return false;
    }

    // ====== 矿山操作函数 ======

    function getMineConfig() {
        for (var i = 0; i < mineTableData.length; i++) {
            if (mineTableData[i].Level === mineLevel) return mineTableData[i];
        }
        return mineTableData[0] || null;
    }

    function rollOre(oreRates) {
        var totalW = 0;
        for (var i = 0; i < oreRates.length; i++) totalW += oreRates[i].weight;
        var r = Math.random() * totalW;
        for (var j = 0; j < oreRates.length; j++) {
            r -= oreRates[j].weight;
            if (r <= 0) return oreRates[j].id;
        }
        return oreRates[0].id;
    }

    function addPendingOre(oreId, count) {
        for (var i = 0; i < minePendingOres.length; i++) {
            if (minePendingOres[i].id === oreId) {
                minePendingOres[i].count += count;
                return;
            }
        }
        minePendingOres.push({ id: oreId, count: count });
    }

    function startMining() {
        if (mineActive) return { success: false, message: '矿山正在开采中' };
        if (!servantAutoMine.active) return { success: false, message: '需要先雇佣采矿奴仆才能开采矿山' };
        mineActive = true;
        mineElapsed = 0;
        return { success: true, message: '开始开采矿山' };
    }

    function stopMining() {
        mineActive = false;
        mineElapsed = 0;
        return { success: true, message: '已停止开采' };
    }

    function collectOres() {
        if (minePendingOres.length === 0) {
            return { success: false, message: '暂无可领取的矿石' };
        }
        var backpack = GameLogic.getBackpack();
        var collected = [];
        var overflowed = [];
        for (var i = 0; i < minePendingOres.length; i++) {
            var ore = minePendingOres[i];
            var result = ItemSystem.addItemToBackpack(backpack, ore.id, ore.count);
            var itemInfo = ItemSystem.getItemById(ore.id);
            var name = itemInfo ? itemInfo.ItemName : '矿石';
            if (result.addedCount > 0) {
                collected.push(name + '×' + result.addedCount);
            }
            // 溢出存仓库
            var overflow = ore.count - result.addedCount;
            if (overflow > 0 && typeof StorageSystem !== 'undefined') {
                StorageSystem.addItem(ore.id, overflow);
                overflowed.push(name + '×' + overflow);
            }
        }
        minePendingOres = [];
        GameUI.updateBackpack(backpack);
        var msg = '';
        if (collected.length > 0) msg += '领取了：' + collected.join('、');
        if (overflowed.length > 0) msg += (msg ? '；' : '') + '存入仓库：' + overflowed.join('、');
        return { success: true, message: msg || '已领取' };
    }

    function upgradeMine() {
        if (mineLevel >= mineTableData.length) {
            return { success: false, message: '矿山已达最高等级' };
        }
        // 查找下一级的升级费用
        var nextConfig = null;
        for (var n = 0; n < mineTableData.length; n++) {
            if (mineTableData[n].Level === mineLevel + 1) { nextConfig = mineTableData[n]; break; }
        }
        if (!nextConfig || nextConfig.UpgradeCostItemID === 0) return { success: false, message: '矿山已达最高等级' };

        var costItemId = nextConfig.UpgradeCostItemID;
        var costCount = nextConfig.UpgradeCostCount;

        var have = 0;
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costItemId)) {
            have = ResourceManager.get(costItemId);
        } else {
            var backpack = GameLogic.getBackpack();
            for (var i = 0; i < backpack.length; i++) {
                if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === costItemId) {
                    have += backpack[i].count;
                }
            }
        }
        if (have < costCount) {
            var itemInfo = ItemSystem.getItemById(costItemId);
            return { success: false, message: (itemInfo ? itemInfo.ItemName : '材料') + '不足，需要' + costCount + '，当前' + have };
        }
        // 扣费
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costItemId)) {
            ResourceManager.spend(costItemId, costCount);
        } else {
            var remaining = costCount;
            var bp = GameLogic.getBackpack();
            for (var j = bp.length - 1; j >= 0 && remaining > 0; j--) {
                if (bp[j] && bp[j].type === 'item' && bp[j].itemId === costItemId) {
                    var deduct = Math.min(bp[j].count, remaining);
                    bp[j].count -= deduct;
                    remaining -= deduct;
                    if (bp[j].count <= 0) bp.splice(j, 1);
                }
            }
            GameUI.updateBackpack(bp);
        }
        mineLevel++;
        return { success: true, message: '矿山升级至 ' + getMineConfig().MineName };
    }

    // ====== 奴仆操作函数 ======

    // ====== 打猎操作函数 ======

    function getHuntConfig() {
        for (var i = 0; i < huntTableData.length; i++) {
            if (huntTableData[i].Level === huntLevel) return huntTableData[i];
        }
        return huntTableData[0] || null;
    }

    function startHunting() {
        if (huntActive) return { success: false, message: '猎场正在运作中' };
        if (!servantAutoHunt.active) return { success: false, message: '需要先雇佣猎人才能打猎' };
        huntActive = true;
        huntElapsed = 0;
        return { success: true, message: '开始打猎' };
    }

    function stopHunting() {
        huntActive = false;
        huntElapsed = 0;
        return { success: true, message: '已停止打猎' };
    }

    function collectHuntFood() {
        if (huntPendingFood <= 0) {
            return { success: false, message: '暂无可领取的食物' };
        }
        var amount = huntPendingFood;
        huntPendingFood = 0;
        // 食物直接加到全局资源
        if (typeof ResourceManager !== 'undefined') {
            ResourceManager.add(20003, amount);
        } else {
            var backpack = GameLogic.getBackpack();
            ItemSystem.addItemToBackpack(backpack, 20003, amount);
            GameUI.updateBackpack(backpack);
        }
        return { success: true, message: '领取了 ' + amount + ' 个食物' };
    }

    function upgradeHunt() {
        if (huntLevel >= huntTableData.length) {
            return { success: false, message: '猎场已达最高等级' };
        }
        var nextConfig = null;
        for (var n = 0; n < huntTableData.length; n++) {
            if (huntTableData[n].Level === huntLevel + 1) { nextConfig = huntTableData[n]; break; }
        }
        if (!nextConfig || nextConfig.UpgradeCostItemID === 0) return { success: false, message: '猎场已达最高等级' };

        var costItemId = nextConfig.UpgradeCostItemID;
        var costCount = nextConfig.UpgradeCostCount;

        var have = 0;
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costItemId)) {
            have = ResourceManager.get(costItemId);
        } else {
            var backpack = GameLogic.getBackpack();
            for (var i = 0; i < backpack.length; i++) {
                if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === costItemId) {
                    have += backpack[i].count;
                }
            }
        }
        if (have < costCount) {
            var itemInfo = ItemSystem.getItemById(costItemId);
            return { success: false, message: (itemInfo ? itemInfo.ItemName : '材料') + '不足，需要' + costCount + '，当前' + have };
        }
        // 扣费
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costItemId)) {
            ResourceManager.spend(costItemId, costCount);
        } else {
            var remaining = costCount;
            var bp = GameLogic.getBackpack();
            for (var j = bp.length - 1; j >= 0 && remaining > 0; j--) {
                if (bp[j] && bp[j].type === 'item' && bp[j].itemId === costItemId) {
                    var deduct = Math.min(bp[j].count, remaining);
                    bp[j].count -= deduct;
                    remaining -= deduct;
                    if (bp[j].count <= 0) bp.splice(j, 1);
                }
            }
            GameUI.updateBackpack(bp);
        }
        huntLevel++;
        return { success: true, message: '猎场升级至 ' + getHuntConfig().HuntName };
    }

    function hireServant(type) {
        // 从奴仆表查找配置
        var config = null;
        for (var s = 0; s < servantTableData.length; s++) {
            if (servantTableData[s].ServantType === type) { config = servantTableData[s]; break; }
        }
        if (!config) return { success: false, message: '无效的奴仆类型' };

        // 检查食物
        var foodCount = 0;
        if (typeof ResourceManager !== 'undefined') {
            foodCount = ResourceManager.get(20003);
        } else {
            var backpack = GameLogic.getBackpack();
            for (var i = 0; i < backpack.length; i++) {
                if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === 20003) {
                    foodCount += backpack[i].count;
                }
            }
        }
        if (foodCount < config.FoodCost) {
            return { success: false, message: '食物不足，需要' + config.FoodCost + '个食物，当前' + foodCount };
        }

        // 扣食物
        if (typeof ResourceManager !== 'undefined') {
            ResourceManager.spend(20003, config.FoodCost);
        } else {
            var remaining = config.FoodCost;
            var bp = GameLogic.getBackpack();
            for (var j = bp.length - 1; j >= 0 && remaining > 0; j--) {
                if (bp[j] && bp[j].type === 'item' && bp[j].itemId === 20003) {
                    var deduct = Math.min(bp[j].count, remaining);
                    bp[j].count -= deduct;
                    remaining -= deduct;
                    if (bp[j].count <= 0) bp.splice(j, 1);
                }
            }
            GameUI.updateBackpack(bp);
        }

        if (type === 'autoFarm') {
            servantAutoFarm.active = true;
            servantAutoFarm.remaining += config.Duration;
            return { success: true, message: '雇佣种田奴仆成功！将自动种植和收获' + formatTime(config.Duration) };
        } else if (type === 'autoMine') {
            servantAutoMine.active = true;
            servantAutoMine.remaining += config.Duration;
            if (!mineActive) { mineActive = true; mineElapsed = 0; }
            return { success: true, message: '雇佣采矿奴仆成功！将自动开采' + formatTime(config.Duration) };
        } else if (type === 'autoHunt') {
            servantAutoHunt.active = true;
            servantAutoHunt.remaining += config.Duration;
            if (!huntActive) { huntActive = true; huntElapsed = 0; }
            return { success: true, message: '雇佣猎人成功！将自动打猎' + formatTime(config.Duration) };
        }
        return { success: false, message: '未知类型' };
    }

    // ====== 待领取奖励 ======

    function addPendingReward(itemId, count) {
        for (var i = 0; i < pendingRewards.length; i++) {
            if (pendingRewards[i].itemId === itemId) {
                pendingRewards[i].count += count;
                return;
            }
        }
        pendingRewards.push({ itemId: itemId, count: count });
    }

    function collectPendingRewards() {
        if (pendingRewards.length === 0) {
            return { success: false, message: '暂无待领取的奖励' };
        }
        var backpack = GameLogic.getBackpack();
        var collected = [];
        var overflowed = [];
        for (var i = 0; i < pendingRewards.length; i++) {
            var r = pendingRewards[i];
            var result = ItemSystem.addItemToBackpack(backpack, r.itemId, r.count);
            var itemInfo = ItemSystem.getItemById(r.itemId);
            var name = itemInfo ? itemInfo.ItemName : '物品';
            if (result.addedCount > 0) {
                collected.push(name + '×' + result.addedCount);
            }
            var overflow = r.count - result.addedCount;
            if (overflow > 0 && typeof StorageSystem !== 'undefined') {
                StorageSystem.addItem(r.itemId, overflow);
                overflowed.push(name + '×' + overflow);
            }
        }
        pendingRewards = [];
        GameUI.updateBackpack(backpack);
        var msg = '';
        if (collected.length > 0) msg += '领取了：' + collected.join('、');
        if (overflowed.length > 0) msg += (msg ? '；' : '') + '存入仓库：' + overflowed.join('、');
        return { success: true, message: msg || '已领取' };
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m > 0 ? m + '分' + (s > 0 ? s + '秒' : '') : s + '秒';
    }

    /**
     * 获取当前灵池等级配置
     */
    function getPoolConfig() {
        for (var i = 0; i < spiritPoolData.length; i++) {
            if (spiritPoolData[i].Level === poolLevel) {
                return spiritPoolData[i];
            }
        }
        return spiritPoolData[0] || null;
    }

    /**
     * 领取灵池修为
     */
    function collectPoolXiuyi() {
        if (poolStoredXiuyi <= 0) {
            return { success: false, message: '灵池中暂无可领取的修为' };
        }
        var amount = poolStoredXiuyi;
        poolStoredXiuyi = 0;
        // 直接加到玩家修为上
        var player = GameLogic.getPlayer();
        player.Xiuyi += amount;
        return { success: true, amount: amount, message: '领取了 ' + amount + ' 点修为' };
    }

    /**
     * 投入灵石到灵池
     * 投入的灵石按Value转化为临时额外上限（poolBonusCapacity）
     * 灵池产出时优先消耗临时上限额度
     */
    function depositToPool(itemId, count) {
        // 检查灵石数量
        var totalAvailable = 0;
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(itemId)) {
            totalAvailable = ResourceManager.get(itemId);
        } else {
            var backpack = GameLogic.getBackpack();
            for (var i = 0; i < backpack.length; i++) {
                if (backpack[i] && backpack[i].type === 'item' && backpack[i].itemId === itemId) {
                    totalAvailable += backpack[i].count;
                }
            }
        }
        if (totalAvailable < count) {
            return { success: false, message: '灵石不足' };
        }

        // 扣除灵石
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(itemId)) {
            ResourceManager.spend(itemId, count);
        } else {
            var remaining = count;
            var bp = GameLogic.getBackpack();
            for (var j = bp.length - 1; j >= 0 && remaining > 0; j--) {
                if (bp[j] && bp[j].type === 'item' && bp[j].itemId === itemId) {
                    var deduct = Math.min(bp[j].count, remaining);
                    bp[j].count -= deduct;
                    remaining -= deduct;
                    if (bp[j].count <= 0) {
                        bp.splice(j, 1);
                    }
                }
            }
            GameUI.updateBackpack(bp);
        }

        // 灵石的Value转化为临时额外上限
        var item = ItemSystem.getItemById(itemId);
        var bonusGain = (item ? item.Value : 1) * count;
        poolBonusCapacity += bonusGain;

        GameUI.updateBackpack(backpack);
        return { success: true, message: '投入成功，灵池临时上限增加 ' + bonusGain + '（当前临时上限 ' + poolBonusCapacity + '）' };
    }

    /**
     * 在灵田种植种子
     */
    function plantSeed(slotIndex, seedId) {
        if (slotIndex < 0 || slotIndex >= 12) {
            return { success: false, message: '无效的灵田格子' };
        }
        var slot = fieldSlots[slotIndex];
        if (!slot.unlocked) {
            return { success: false, message: '该灵田尚未开垦' };
        }
        if (slot.seedId > 0) {
            return { success: false, message: '该灵田已种有灵植' };
        }

        // 查找种子对应的灵植配置
        var plantConfig = null;
        for (var i = 0; i < plantsData.length; i++) {
            if (plantsData[i].SeedID === seedId) {
                plantConfig = plantsData[i];
                break;
            }
        }
        if (!plantConfig) {
            return { success: false, message: '无效的种子' };
        }

        // 检查背包是否有种子
        var backpack = GameLogic.getBackpack();
        var seedSlot = null;
        var seedSlotIndex = -1;
        for (var j = 0; j < backpack.length; j++) {
            if (backpack[j] && backpack[j].type === 'item' && backpack[j].itemId === seedId) {
                seedSlot = backpack[j];
                seedSlotIndex = j;
                break;
            }
        }
        if (!seedSlot || seedSlot.count <= 0) {
            return { success: false, message: '背包中没有该种子' };
        }

        // 消耗1个种子
        seedSlot.count--;
        if (seedSlot.count <= 0) {
            backpack.splice(seedSlotIndex, 1);
        }

        // 种植
        slot.seedId = seedId;
        slot.plantId = plantConfig.ID;
        slot.growTime = plantConfig.GrowTime;
        slot.elapsed = 0;
        slot.ready = false;

        GameUI.updateBackpack(backpack);
        return { success: true, message: '种下了 ' + plantConfig.SeedName };
    }

    /**
     * 收获灵田
     */
    function harvestField(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 12) {
            return { success: false, message: '无效的灵田格子' };
        }
        var slot = fieldSlots[slotIndex];
        if (!slot.unlocked) {
            return { success: false, message: '该灵田尚未开垦' };
        }
        if (slot.seedId === 0) {
            return { success: false, message: '该灵田未种植' };
        }
        if (!slot.ready) {
            return { success: false, message: '灵植尚未成熟' };
        }

        // 查找灵植配置
        var plantConfig = null;
        for (var i = 0; i < plantsData.length; i++) {
            if (plantsData[i].ID === slot.plantId) {
                plantConfig = plantsData[i];
                break;
            }
        }
        if (!plantConfig) {
            return { success: false, message: '灵植配置异常' };
        }

        // 收获物品
        var backpack = GameLogic.getBackpack();
        var result = ItemSystem.addItemToBackpack(backpack, plantConfig.HarvestID, plantConfig.HarvestCount);

        // 清空灵田
        slot.seedId = 0;
        slot.plantId = 0;
        slot.growTime = 0;
        slot.elapsed = 0;
        slot.ready = false;

        GameUI.updateBackpack(backpack);
        return { success: true, message: '收获了 ' + plantConfig.HarvestName + ' ×' + plantConfig.HarvestCount };
    }

    /**
     * 开垦灵田
     */
    function unlockField(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 12) {
            return { success: false, message: '无效的灵田格子' };
        }
        if (fieldSlots[slotIndex].unlocked) {
            return { success: false, message: '该灵田已经开垦' };
        }

        // 查找建筑表中灵田的开垦配置（BuildType=1, BuildIndex=slotIndex+1）
        var buildIndex = slotIndex + 1;
        var buildConfig = null;
        for (var i = 0; i < buildingsData.length; i++) {
            if (buildingsData[i].BuildType === 1 && buildingsData[i].BuildIndex === buildIndex) {
                buildConfig = buildingsData[i];
                break;
            }
        }
        if (!buildConfig) {
            return { success: false, message: '没有找到开垦配置' };
        }

        // 检查材料
        var costCheck = checkAndDeductCost(buildConfig);
        if (!costCheck.success) {
            return costCheck;
        }

        fieldSlots[slotIndex].unlocked = true;
        return { success: true, message: '成功开垦了第 ' + buildIndex + ' 块灵田' };
    }

    /**
     * 升级灵池
     */
    function upgradePool() {
        var nextLevel = poolLevel + 1;
        // 查找建筑表中灵池升级配置（BuildType=2, BuildIndex=nextLevel）
        var buildConfig = null;
        for (var i = 0; i < buildingsData.length; i++) {
            if (buildingsData[i].BuildType === 2 && buildingsData[i].BuildIndex === nextLevel) {
                buildConfig = buildingsData[i];
                break;
            }
        }
        if (!buildConfig) {
            return { success: false, message: '灵池已达最高等级' };
        }

        // 检查材料
        var costCheck = checkAndDeductCost(buildConfig);
        if (!costCheck.success) {
            return costCheck;
        }

        poolLevel = nextLevel;
        return { success: true, message: '灵池升级至 ' + poolLevel + ' 级' };
    }

    /**
     * 检查并扣除建筑消耗材料
     */
    function checkAndDeductCost(buildConfig) {
        var backpack = GameLogic.getBackpack();
        var costs = [];

        if (buildConfig.CostItemID1 > 0 && buildConfig.CostCount1 > 0) {
            costs.push({ itemId: buildConfig.CostItemID1, count: buildConfig.CostCount1 });
        }
        if (buildConfig.CostItemID2 > 0 && buildConfig.CostCount2 > 0) {
            costs.push({ itemId: buildConfig.CostItemID2, count: buildConfig.CostCount2 });
        }

        // 先检查是否都够
        for (var c = 0; c < costs.length; c++) {
            var total = 0;
            if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costs[c].itemId)) {
                total = ResourceManager.get(costs[c].itemId);
            } else {
                for (var j = 0; j < backpack.length; j++) {
                    if (backpack[j] && backpack[j].type === 'item' && backpack[j].itemId === costs[c].itemId) {
                        total += backpack[j].count;
                    }
                }
            }
            if (total < costs[c].count) {
                var itemInfo = ItemSystem.getItemById(costs[c].itemId);
                var itemName = itemInfo ? itemInfo.ItemName : '物品' + costs[c].itemId;
                return { success: false, message: itemName + ' 不足，需要 ' + costs[c].count + '，当前 ' + total };
            }
        }

        // 扣除材料
        for (var d = 0; d < costs.length; d++) {
            if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(costs[d].itemId)) {
                ResourceManager.spend(costs[d].itemId, costs[d].count);
            } else {
                var remaining = costs[d].count;
                for (var k = backpack.length - 1; k >= 0 && remaining > 0; k--) {
                    if (backpack[k] && backpack[k].type === 'item' && backpack[k].itemId === costs[d].itemId) {
                        var deduct = Math.min(backpack[k].count, remaining);
                        backpack[k].count -= deduct;
                        remaining -= deduct;
                        if (backpack[k].count <= 0) {
                            backpack.splice(k, 1);
                        }
                    }
                }
            }
        }

        GameUI.updateBackpack(backpack);
        return { success: true };
    }

    /**
     * 获取灵田开垦所需材料信息
     */
    function getFieldUnlockCost(slotIndex) {
        var buildIndex = slotIndex + 1;
        for (var i = 0; i < buildingsData.length; i++) {
            if (buildingsData[i].BuildType === 1 && buildingsData[i].BuildIndex === buildIndex) {
                return buildingsData[i];
            }
        }
        return null;
    }

    /**
     * 获取灵池升级所需材料信息
     */
    function getPoolUpgradeCost() {
        var nextLevel = poolLevel + 1;
        for (var i = 0; i < buildingsData.length; i++) {
            if (buildingsData[i].BuildType === 2 && buildingsData[i].BuildIndex === nextLevel) {
                return buildingsData[i];
            }
        }
        return null;
    }

    /**
     * 获取种子对应的灵植配置
     */
    function getPlantBySeedId(seedId) {
        for (var i = 0; i < plantsData.length; i++) {
            if (plantsData[i].SeedID === seedId) {
                return plantsData[i];
            }
        }
        return null;
    }

    /**
     * 获取背包中所有种子
     */
    function getSeedsInBackpack() {
        var backpack = GameLogic.getBackpack();
        var seeds = [];
        for (var i = 0; i < backpack.length; i++) {
            if (backpack[i] && backpack[i].type === 'item') {
                var plantConfig = getPlantBySeedId(backpack[i].itemId);
                if (plantConfig) {
                    seeds.push({
                        itemId: backpack[i].itemId,
                        itemName: backpack[i].itemName,
                        count: backpack[i].count,
                        plantConfig: plantConfig
                    });
                }
            }
        }
        return seeds;
    }

    /**
     * 获取存档数据
     */
    function getSaveData() {
        return {
            poolLevel: poolLevel,
            poolStoredXiuyi: poolStoredXiuyi,
            poolElapsedSeconds: poolElapsedSeconds,
            poolBonusCapacity: poolBonusCapacity,
            fieldSlots: fieldSlots.map(function(s) {
                return {
                    unlocked: s.unlocked,
                    seedId: s.seedId,
                    plantId: s.plantId,
                    growTime: s.growTime,
                    elapsed: s.elapsed,
                    ready: s.ready
                };
            }),
            // 矿山数据
            mineLevel: mineLevel,
            mineActive: mineActive,
            mineElapsed: mineElapsed,
            minePendingOres: minePendingOres.slice(),
            // 奴仆数据
            servantAutoFarm: { active: servantAutoFarm.active, remaining: servantAutoFarm.remaining },
            servantAutoMine: { active: servantAutoMine.active, remaining: servantAutoMine.remaining },
            servantAutoHunt: { active: servantAutoHunt.active, remaining: servantAutoHunt.remaining },
            farmActionCooldown: farmActionCooldown,
            pendingRewards: pendingRewards.slice(),
            // 打猎数据
            huntLevel: huntLevel,
            huntActive: huntActive,
            huntElapsed: huntElapsed,
            huntPendingFood: huntPendingFood
        };
    }

    /**
     * 加载存档数据
     */
    function loadSaveData(data) {
        if (!data) return;
        poolLevel = data.poolLevel || 1;
        poolStoredXiuyi = data.poolStoredXiuyi || 0;
        poolElapsedSeconds = data.poolElapsedSeconds || 0;
        poolBonusCapacity = data.poolBonusCapacity || 0;
        if (data.fieldSlots && data.fieldSlots.length) {
            for (var i = 0; i < Math.min(data.fieldSlots.length, 12); i++) {
                var saved = data.fieldSlots[i];
                fieldSlots[i].unlocked = saved.unlocked || false;
                fieldSlots[i].seedId = saved.seedId || 0;
                fieldSlots[i].plantId = saved.plantId || 0;
                fieldSlots[i].growTime = saved.growTime || 0;
                fieldSlots[i].elapsed = saved.elapsed || 0;
                fieldSlots[i].ready = saved.ready || false;
            }
        }
        // 矿山数据
        mineLevel = data.mineLevel || 1;
        mineActive = data.mineActive || false;
        mineElapsed = data.mineElapsed || 0;
        minePendingOres = data.minePendingOres || [];
        // 奴仆数据
        if (data.servantAutoFarm) {
            servantAutoFarm.active = data.servantAutoFarm.active || false;
            servantAutoFarm.remaining = data.servantAutoFarm.remaining || 0;
        }
        if (data.servantAutoMine) {
            servantAutoMine.active = data.servantAutoMine.active || false;
            servantAutoMine.remaining = data.servantAutoMine.remaining || 0;
        }
        if (data.servantAutoHunt) {
            servantAutoHunt.active = data.servantAutoHunt.active || false;
            servantAutoHunt.remaining = data.servantAutoHunt.remaining || 0;
        }
        farmActionCooldown = data.farmActionCooldown || 0;
        pendingRewards = data.pendingRewards || [];
        // 打猎数据
        huntLevel = data.huntLevel || 1;
        huntActive = data.huntActive || false;
        huntElapsed = data.huntElapsed || 0;
        huntPendingFood = data.huntPendingFood || 0;
    }

    function setUpdateCallback(cb) {
        onUpdateCallback = cb;
    }

    function isTimerRunning() {
        return poolTimer !== null;
    }

    // 公共接口
    return {
        init: init,
        startTimers: startTimers,
        stopTimers: stopTimers,
        isTimerRunning: isTimerRunning,
        getPoolConfig: getPoolConfig,
        getPoolLevel: function() { return poolLevel; },
        getPoolStoredXiuyi: function() { return poolStoredXiuyi; },
        getPoolBonusCapacity: function() { return poolBonusCapacity; },
        getPoolElapsedSeconds: function() { return poolElapsedSeconds; },
        collectPoolXiuyi: collectPoolXiuyi,
        depositToPool: depositToPool,
        getFieldSlots: function() { return fieldSlots; },
        plantSeed: plantSeed,
        harvestField: harvestField,
        unlockField: unlockField,
        upgradePool: upgradePool,
        getFieldUnlockCost: getFieldUnlockCost,
        getPoolUpgradeCost: getPoolUpgradeCost,
        getPlantBySeedId: getPlantBySeedId,
        getSeedsInBackpack: getSeedsInBackpack,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData,
        setUpdateCallback: setUpdateCallback,
        getPlantsData: function() { return plantsData; },
        // 矿山
        getMineConfig: getMineConfig,
        getMineLevel: function() { return mineLevel; },
        isMineActive: function() { return mineActive; },
        getMineElapsed: function() { return mineElapsed; },
        getMinePendingOres: function() { return minePendingOres; },
        startMining: startMining,
        stopMining: stopMining,
        collectOres: collectOres,
        upgradeMine: upgradeMine,
        getMineTableData: function() { return mineTableData; },
        // 奴仆
        hireServant: hireServant,
        getServantAutoFarm: function() { return servantAutoFarm; },
        getServantAutoMine: function() { return servantAutoMine; },
        getServantAutoHunt: function() { return servantAutoHunt; },
        getServantTableData: function() { return servantTableData; },
        getServantConfig: function(type) {
            for (var s = 0; s < servantTableData.length; s++) {
                if (servantTableData[s].ServantType === type) return servantTableData[s];
            }
            return null;
        },
        // 打猎
        getHuntConfig: getHuntConfig,
        getHuntLevel: function() { return huntLevel; },
        isHuntActive: function() { return huntActive; },
        getHuntElapsed: function() { return huntElapsed; },
        getHuntPendingFood: function() { return huntPendingFood; },
        startHunting: startHunting,
        stopHunting: stopHunting,
        collectHuntFood: collectHuntFood,
        upgradeHunt: upgradeHunt,
        getHuntTableData: function() { return huntTableData; },
        // 待领取奖励
        getPendingRewards: function() { return pendingRewards; },
        collectPendingRewards: collectPendingRewards,
        formatTime: formatTime
    };
})();
