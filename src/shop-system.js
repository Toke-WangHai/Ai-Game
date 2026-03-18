// 商店系统模块
const ShopSystem = (function() {
    let shopTableData = [], itemsData = [], equipmentsData = [];
    let currentShopSlots = [null, null, null, null, null, null];
    let refreshTimer = null, remainingSeconds = 600;
    let onRefreshCallback = null;
    let timerStartTime = 0; // 计时器启动时的时间戳
    let timerStartSeconds = 600; // 计时器启动时的剩余秒数

    const SPIRIT_STONE_EXCHANGE = [
        { from: 20001, to: 20009, rate: 1000, fromName: '下品灵石', toName: '中品灵石' },
        { from: 20009, to: 20010, rate: 1000, fromName: '中品灵石', toName: '上品灵石' },
        { from: 20010, to: 20011, rate: 1000, fromName: '上品灵石', toName: '极品灵石' },
        { from: 20011, to: 20012, rate: 1000, fromName: '极品灵石', toName: '灵晶' }
    ];

    function init(shopData, items, equipments) {
        shopTableData = shopData || [];
        itemsData = items || [];
        equipmentsData = equipments || [];
    }

    function getPlayerLevel() {
        var p = GameLogic.getPlayer();
        if (!p) return 1;
        return LevelCalculator.calculateLevel(p.Xiuyi).levelId;
    }

    function weightedRandom(list) {
        if (!list || list.length === 0) return null;
        var total = list.reduce(function(s, e) { return s + e.Weight; }, 0);
        if (total <= 0) return list[0];
        var r = Math.random() * total, c = 0;
        for (var i = 0; i < list.length; i++) {
            c += list[i].Weight;
            if (r <= c) return list[i];
        }
        return list[list.length - 1];
    }

    function getItemById(id) {
        return itemsData.find(function(it) { return it.ID === id; }) || null;
    }

    function refreshShop() {
        var lvl = getPlayerLevel();
        for (var s = 1; s <= 6; s++) {
            var cands = shopTableData.filter(function(e) {
                return e.Slot === s && lvl >= e.LevelMin && lvl <= e.LevelMax
                    && e.Price > 0
                    && !(e.ItemType === 1 && e.RefID === e.PriceCurrency);
            });
            if (cands.length === 0) cands = shopTableData.filter(function(e) {
                return e.Slot === s && e.Price > 0
                    && !(e.ItemType === 1 && e.RefID === e.PriceCurrency);
            });
            var sel = weightedRandom(cands);
            currentShopSlots[s - 1] = sel ? generateShopItem(sel, lvl) : null;
        }
        remainingSeconds = 600;
        if (onRefreshCallback) onRefreshCallback();
        return currentShopSlots;
    }

    function generateShopItem(entry, playerLevel) {
        var qualityColors = { 1: '#ffffff', 2: '#3498db', 3: '#9b59b6', 4: '#ff69b4', 5: '#ffd700' };
        var res = { slotIndex: entry.Slot, itemType: entry.ItemType, price: entry.Price,
            priceCurrency: entry.PriceCurrency, refID: entry.RefID,
            displayName: '', displayDesc: '', displayColor: '#fff', actualData: null, currencyName: '下品灵石', iconPath: '' };

        if (entry.ItemType === 1) {
            var item = getItemById(entry.RefID);
            if (item) { res.displayName = item.ItemName; res.displayDesc = item.ItemDesc; res.displayColor = '#f1c40f'; res.actualData = item; res.iconPath = item.IconPath || ''; }
        } else if (entry.ItemType === 2) {
            var q = entry.RefID;
            var cands = equipmentsData.filter(function(e) {
                return e.EquipmentQuality === q && playerLevel >= e.LevelMin && playerLevel <= e.LevelMax;
            });
            if (cands.length === 0) cands = equipmentsData.filter(function(e) { return e.EquipmentQuality === q; });
            if (cands.length > 0) {
                var eq = cands[Math.floor(Math.random() * cands.length)];
                res.displayName = eq.EquipmentName; res.displayDesc = eq.Desc;
                res.displayColor = qualityColors[q] || '#fff'; res.actualData = Object.assign({}, eq); res.iconPath = eq.IconPath || '';
            }
        }
        var cur = getItemById(entry.PriceCurrency);
        res.currencyName = cur ? cur.ItemName : '下品灵石';
        return res;
    }

    function countItemInBackpack(bp, itemId) {
        // 基础资源从 ResourceManager 获取
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(itemId)) {
            return ResourceManager.get(itemId);
        }
        var count = 0;
        for (var i = 0; i < bp.length; i++) {
            if (bp[i] && bp[i].type === 'item' && bp[i].itemId === itemId) count += bp[i].count;
        }
        return count;
    }

    function removeItemFromBackpack(bp, itemId, amount) {
        // 基础资源从 ResourceManager 扣除
        if (typeof ResourceManager !== 'undefined' && ResourceManager.isResource(itemId)) {
            return ResourceManager.spend(itemId, amount);
        }
        var remaining = amount;
        for (var i = bp.length - 1; i >= 0 && remaining > 0; i--) {
            if (bp[i] && bp[i].type === 'item' && bp[i].itemId === itemId) {
                var take = Math.min(bp[i].count, remaining);
                bp[i].count -= take; remaining -= take;
                if (bp[i].count <= 0) bp.splice(i, 1);
            }
        }
        return remaining === 0;
    }

    function buyItem(slotIndex) {
        var si = currentShopSlots[slotIndex];
        if (!si) return { success: false, message: '该栏位没有商品' };
        // 防护：价格为0或商品就是货币本身
        if (si.price <= 0) return { success: false, message: '该商品配置异常' };
        if (si.itemType === 1 && si.refID === si.priceCurrency) return { success: false, message: '该商品配置异常' };
        var bp = GameLogic.getBackpack();
        var have = countItemInBackpack(bp, si.priceCurrency);
        if (have < si.price) return { success: false, message: si.currencyName + '不足！需要' + si.price + '，当前' + have };

        removeItemFromBackpack(bp, si.priceCurrency, si.price);

        if (si.itemType === 1) {
            var r = ItemSystem.addItemToBackpack(bp, si.refID, 1);
            if (!r.success) {
                ItemSystem.addItemToBackpack(bp, si.priceCurrency, si.price);
                GameUI.updateBackpack(bp);
                return { success: false, message: '背包已满' };
            }
        } else if (si.itemType === 2 && si.actualData) {
            if (!GameLogic.addToBackpack(Object.assign({}, si.actualData))) {
                ItemSystem.addItemToBackpack(bp, si.priceCurrency, si.price);
                GameUI.updateBackpack(bp);
                return { success: false, message: '背包已满' };
            }
        }
        GameUI.updateBackpack(bp);
        currentShopSlots[slotIndex] = null; // 购买后清空栏位
        return { success: true, message: '购买成功：' + si.displayName };
    }

    function sellItems(sellList) {
        var bp = GameLogic.getBackpack();
        var totalValue = 0, count = 0;
        // sellList: [{index, count}]，从后往前排序避免splice导致索引偏移
        var sorted = sellList.slice().sort(function(a, b) { return b.index - a.index; });
        sorted.forEach(function(entry) {
            var idx = entry.index;
            var sellCount = entry.count;
            var slot = bp[idx];
            if (!slot) return;
            if (slot.type === 'item') {
                var itemInfo = getItemById(slot.itemId);
                var unitVal = itemInfo ? itemInfo.Value : 0;
                // 限制出售数量不超过实际拥有数量
                var actualSell = Math.min(sellCount, slot.count);
                totalValue += unitVal * actualSell;
                count += actualSell;
                slot.count -= actualSell;
                if (slot.count <= 0) {
                    bp.splice(idx, 1);
                }
            } else {
                // 装备：直接出售
                var eqVal = slot.Value || 0;
                totalValue += eqVal; count++;
                bp.splice(idx, 1);
            }
        });

        // 将灵石加入背包
        if (totalValue > 0) {
            ItemSystem.addItemToBackpack(bp, 20001, totalValue);
        }
        GameUI.updateBackpack(bp);
        return { count: count, value: totalValue };
    }

    function exchangeStones(exchangeIndex, amount) {
        if (exchangeIndex < 0 || exchangeIndex >= SPIRIT_STONE_EXCHANGE.length) return { success: false, message: '无效的兑换' };
        var ex = SPIRIT_STONE_EXCHANGE[exchangeIndex];
        var bp = GameLogic.getBackpack();
        var have = countItemInBackpack(bp, ex.from);
        var needed = ex.rate * amount;
        if (have < needed) return { success: false, message: ex.fromName + '不足！需要' + needed + '，当前' + have };
        removeItemFromBackpack(bp, ex.from, needed);
        var r = ItemSystem.addItemToBackpack(bp, ex.to, amount);
        GameUI.updateBackpack(bp);
        if (r.success) return { success: true, message: '兑换成功：获得' + ex.toName + '×' + amount };
        return { success: false, message: '背包已满' };
    }

    function startTimer() {
        if (refreshTimer) clearInterval(refreshTimer);
        timerStartTime = Date.now();
        timerStartSeconds = remainingSeconds;
        refreshTimer = setInterval(function() {
            var elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            remainingSeconds = timerStartSeconds - elapsed;
            if (remainingSeconds <= 0) {
                refreshShop();
                // 重置计时器基准
                timerStartTime = Date.now();
                timerStartSeconds = remainingSeconds;
            }
            if (onRefreshCallback) onRefreshCallback();
        }, 200);
    }

    function stopTimer() {
        if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    }

    function isTimerRunning() {
        return refreshTimer !== null;
    }

    function getRemainingSeconds() { return remainingSeconds; }
    function getCurrentSlots() { return currentShopSlots; }
    function getExchangeConfig() { return SPIRIT_STONE_EXCHANGE; }
    function setRefreshCallback(cb) { onRefreshCallback = cb; }

    function getSaveData() {
        return { slots: currentShopSlots, remaining: remainingSeconds };
    }

    function loadSaveData(data) {
        if (data) {
            currentShopSlots = data.slots || [null, null, null, null, null, null];
            remainingSeconds = data.remaining || 600;
        }
    }

    function countItemInBP(itemId) {
        return countItemInBackpack(GameLogic.getBackpack(), itemId);
    }

    return {
        init: init, refreshShop: refreshShop, buyItem: buyItem,
        sellItems: sellItems, exchangeStones: exchangeStones,
        startTimer: startTimer, stopTimer: stopTimer, isTimerRunning: isTimerRunning,
        getRemainingSeconds: getRemainingSeconds, getCurrentSlots: getCurrentSlots,
        getExchangeConfig: getExchangeConfig, setRefreshCallback: setRefreshCallback,
        getSaveData: getSaveData, loadSaveData: loadSaveData,
        countItemInBP: countItemInBP, getItemById: getItemById,
        countItemInBackpack: countItemInBackpack
    };
})();
