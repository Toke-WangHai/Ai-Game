// 游戏逻辑模块
const GameLogic = (function() {
    // 游戏状态
    let player = null;
    let selected = [];
    let randomWords = [];
    let alive = true;
    let backpack = []; // 背包物品（最多40个）
    let currentSaveIndex = null; // 当前使用的存档位置

    // ====== 境界寿命上限系统 ======
    // 每个大境界对应的最大寿命（凡人基础50年，修炼到越高寿命越长）
    var REALM_LIFESPAN_CAP = {
        0:  80,     // 凡人 / 练气前期 (等级1-5)
        1:  120,    // 练气后期 (等级6-10)
        2:  200,    // 筑基 (等级11-20)
        3:  350,    // 金丹 (等级21-30)
        4:  600,    // 元婴 (等级31-40)
        5:  1000,   // 化神 (等级41-50)
        6:  1800,   // 炼虚 (等级51-60)
        7:  3000,   // 合体 (等级61-70)
        8:  5000,   // 大乘 (等级71-80)
        9:  10000,  // 渡劫 (等级81-90)
        10: 99999   // 飞升 (等级91)
    };

    /**
     * 根据等级获取当前境界对应的寿命上限
     */
    function getLifespanCap(level) {
        if (level >= 91) return REALM_LIFESPAN_CAP[10];
        if (level >= 81) return REALM_LIFESPAN_CAP[9];
        if (level >= 71) return REALM_LIFESPAN_CAP[8];
        if (level >= 61) return REALM_LIFESPAN_CAP[7];
        if (level >= 51) return REALM_LIFESPAN_CAP[6];
        if (level >= 41) return REALM_LIFESPAN_CAP[5];
        if (level >= 31) return REALM_LIFESPAN_CAP[4];
        if (level >= 21) return REALM_LIFESPAN_CAP[3];
        if (level >= 11) return REALM_LIFESPAN_CAP[2];
        if (level >= 6)  return REALM_LIFESPAN_CAP[1];
        return REALM_LIFESPAN_CAP[0];
    }

    // 根据权重随机选择指定数量的词条
    function selectWordsByWeight(words, count) {
        if (!words || words.length === 0) return [];
        const selectedWords = [];
        const availableWords = [...words];
        for (let i = 0; i < count && availableWords.length > 0; i++) {
            const totalWeight = availableWords.reduce((sum, w) => sum + (w.Weight || 0), 0);
            if (totalWeight === 0) break;
            let random = Math.random() * totalWeight;
            let selectedIndex = 0;
            for (let j = 0; j < availableWords.length; j++) {
                random -= (availableWords[j].Weight || 0);
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            selectedWords.push(availableWords[selectedIndex]);
            availableWords.splice(selectedIndex, 1);
        }
        return selectedWords;
    }

    // 检查事件是否在玩家等级区间内
    function isEventInRange(event, playerLevel) {
        const minLevel = event.LevelMin || 1;
        const maxLevel = event.LevelMax || 91;
        return playerLevel >= minLevel && playerLevel <= maxLevel;
    }

    // 根据权重随机选择事件
    function selectEventByWeight(events) {
        if (!events || events.length === 0) return null;

        // 获取玩家当前等级（集成突破系统）
        var levelInfo;
        if (typeof BreakthroughSystem !== 'undefined') {
            levelInfo = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);
        } else {
            levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);
        }
        const playerLevel = levelInfo.level;

        // 筛选出符合玩家等级区间的事件
        const availableEvents = events.filter(e => isEventInRange(e, playerLevel));

        // 如果没有符合等级的事件，使用所有事件
        const eventsToUse = availableEvents.length > 0 ? availableEvents : events;

        const totalWeight = eventsToUse.reduce((sum, e) => sum + (e.Weight || 0), 0);
        if (totalWeight === 0) return eventsToUse[0];
        let random = Math.random() * totalWeight;
        for (const e of eventsToUse) {
            random -= (e.Weight || 0);
            if (random <= 0) return e;
        }
        return eventsToUse[0];
    }

    // 初始化游戏
    function init(baseAttr, words, events) {
        player = { ...baseAttr, age: 0 };
        selected = [];
        alive = true;
        randomWords = selectWordsByWeight(words, 9);
        GameUI.clearLog();
        GameUI.renderWords(randomWords, handleWordClick);
        GameUI.updateUI(player);
        GameUI.disableNextButton();
    }

    // 开始游戏（确认词条后调用）
    function startGame(events, equipments) {
        // 自动成长一岁，从0岁到1岁
        player.age++;
        player.Shouming--;
        const e = selectEventByWeight(events);
        if (e) {
            trigger(e, equipments);
        }
        checkDead();
        GameUI.updateUI(player);
    }

    // 处理词条点击
    function handleWordClick(index, element, cell) {
        if (selected.includes(index)) {
            selected = selected.filter(x => x !== index);
            element.classList.remove('selected');
            cell.classList.remove('active');
        } else {
            if (selected.length < 3) {
                // 检查品质限制：每种品质最多选择1个
                const clickedWord = randomWords[index];
                const clickedQuality = parseInt(clickedWord.Quality) || 1;
                const sameQualitySelected = selected.some(function(selIdx) {
                    const w = randomWords[selIdx];
                    return (parseInt(w.Quality) || 1) === clickedQuality;
                });
                if (sameQualitySelected) {
                    // 获取品质名称
                    var qualityNames = { 1: '白', 2: '蓝', 3: '紫', 4: '粉', 5: '金' };
                    var qName = qualityNames[clickedQuality] || clickedQuality;
                    GameDialog.alert({
                        title: '品质限制',
                        message: '每种品质的词条最多只能选择1个\n已选择了一个【' + qName + '】品质词条',
                        buttonText: '知道了',
                        type: 'warning'
                    });
                    return;
                }
                selected.push(index);
                element.classList.add('selected');
                cell.classList.add('active');
            } else {
                GameDialog.alert({
                    title: '天赋已满',
                    message: '最多只能选择 3 个天赋词条',
                    buttonText: '知道了',
                    type: 'warning'
                });
            }
        }
        // 实时更新属性预览
        const selectedWords = selected.map(i => randomWords[i]);
        GameUI.updateAttrPreview(selectedWords);
    }

    // 确认选择的词条
    function confirmWords() {
        if (selected.length !== 3) {
            GameDialog.alert({
                title: '选择不足',
                message: '请选择 3 个天赋词条',
                buttonText: '继续选择',
                type: 'warning'
            });
            return false;
        }
        selected.forEach(i => {
            const w = randomWords[i];
            for (const k in w) {
                if (k !== 'Name' && k !== 'ID' && k !== 'Weight' && player[k] !== undefined) {
                    player[k] += w[k];
                }
            }
        });
        GameUI.hideWordPanel();
        // 隐藏状态栏文字
        GameUI.updateStatus('', '#fff');
        return true;
    }

    // 下一岁
    function nextAge(events, equipments) {
        if (!alive) return;
        player.age++;
        player.Shouming--;

        // 衰老机制：年龄越大，寿命消耗越快
        // 100岁以上每年额外-1，200岁以上每年额外-2，以此类推
        var agingPenalty = Math.floor(player.age / 100);
        if (agingPenalty > 0) {
            player.Shouming -= agingPenalty;
            if (player.Shouming < 0) player.Shouming = 0;
        }

        const e = selectEventByWeight(events);
        if (e) {
            trigger(e, equipments);
        }
        checkDead();
        GameUI.updateUI(player);

        // 自动存档（每5岁或死亡时，仅在自动保存开启时）
        if ((player.age % 5 === 0 || !alive) && typeof MenuSystem !== 'undefined' && MenuSystem.isAutoSaveEnabled()) {
            autoSave();
        }
    }

    // 触发事件
    function trigger(event, equipments) {
        if (!event) return;
        let s = '';

        // 获取当前境界寿命上限
        var levelInfo;
        if (typeof BreakthroughSystem !== 'undefined') {
            levelInfo = BreakthroughSystem.getEffectiveLevel(player.Xiuyi);
        } else {
            levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);
        }
        var lifeCap = getLifespanCap(levelInfo.level);

        for (const k in event) {
            if (k === 'Desc' || k === 'ID' || k === 'Weight' || k === 'EquipmentID' || k === 'ItemID' || k === 'ItemCount' || player[k] === undefined) continue;
            let v = event[k];
            if (v === 0) continue;

            // 寿命增加时受境界上限限制
            if (k === 'Shouming' && v > 0) {
                var maxGain = lifeCap - player.Shouming;
                if (maxGain <= 0) {
                    // 已达上限，寿命奖励无效
                    s += '寿命+0(已达上限) ';
                    continue;
                }
                if (v > maxGain) {
                    v = maxGain;
                }
            }

            player[k] += v;
            if (player[k] < 0) player[k] = 0;
            const map = { Xiuyi: '修为', Tipao: '体魄', Shouming: '寿命', Qiyun: '气运', Yuanshen: '元神' };
            if (map[k]) {
                s += `${map[k]}${v > 0 ? '+' + v : v} `;
            }
        }

        // 检查是否有装备奖励
        if (event.EquipmentID && equipments) {
            const equipment = equipments.find(e => e.ID === event.EquipmentID);
            if (equipment) {
                addToBackpack(equipment);
                s += `获得${equipment.EquipmentName} `;
            }
        }

        // 检查是否有物品奖励
        if (event.ItemID && event.ItemCount > 0) {
            const result = ItemSystem.addItemToBackpack(backpack, event.ItemID, event.ItemCount);
            if (result.success) {
                s += result.message + ' ';
                GameUI.updateBackpack(backpack);
            }
            // 溢出部分存入仓库
            var itemOverflow = event.ItemCount - (result.addedCount || 0);
            if (itemOverflow > 0 && typeof StorageSystem !== 'undefined') {
                var storeResult = StorageSystem.addItem(event.ItemID, itemOverflow);
                if (storeResult.success) {
                    var overflowItemInfo = ItemSystem.getItemById(event.ItemID);
                    var overflowName = overflowItemInfo ? overflowItemInfo.ItemName : '物品';
                    s += overflowName + '×' + storeResult.addedCount + '存入仓库 ';
                } else if (storeResult.message) {
                    GameDialog.alert({ title: '提示', message: storeResult.message, type: 'warning' });
                }
            } else if (!result.success && result.message) {
                GameDialog.alert({ title: '提示', message: result.message, type: 'warning' });
            }
        }

        GameUI.log(`【第${player.age}年】${event.Desc}`, s);
    }

    // 检查玩家是否死亡
    function checkDead() {
        if (player.Shouming <= 0) {
            alive = false;
            player.Shouming = 0;
            GameUI.updateStatus(`你在第${player.age}年陨落`, '#e74c3c');
            GameUI.disableNextButton();
            GameUI.hideNextButton(); // 隐藏下一岁/时钟按钮
            GameUI.log('寿命耗尽，魂归天地');

            // 弹出死亡提示框，点击后返回主菜单
            GameDialog.alert({
                title: '魂归天地',
                message: '你在第' + player.age + '年陨落了\n寿命耗尽，此世修行到此为止...',
                buttonText: '返回主菜单',
                type: 'warning'
            }).then(function() {
                // 停止时钟
                GameClock.stop();
                // 关闭所有可能打开的子页面
                if (typeof DungeonSystem !== 'undefined') DungeonSystem.stopExploring();
                if (typeof DungeonUI !== 'undefined') DungeonUI.closeDungeonPage();
                if (typeof ShopUI !== 'undefined') ShopUI.closeShopPage();
                if (typeof BlessedLandUI !== 'undefined') BlessedLandUI.closeBlessedLandPage();
                if (typeof AlchemyUI !== 'undefined') AlchemyUI.closeAlchemyPage();
                if (typeof TribulationUI !== 'undefined') TribulationUI.closeTribulationPage();
                // 返回主菜单
                MenuSystem.showStartMenu();
            });
        }
    }

    // 重新开始游戏
    function rebirth(baseAttr, words, events) {
        init(baseAttr, words, events);
        // 重置突破系统
        if (typeof BreakthroughSystem !== 'undefined') {
            BreakthroughSystem.init();
        }
        // 重置装备栏
        if (typeof EquipmentManager !== 'undefined') {
            EquipmentManager.loadSaveData(null);
        }
        // 重置全局资源
        if (typeof ResourceManager !== 'undefined') {
            ResourceManager.reset();
        }
        GameUI.updateStatus('请选择3个天赋词条', '#fff');
        GameUI.showWordPanel();
        currentSaveIndex = null;
    }

    // 从存档加载
    function loadFromSave(saveData, baseAttr, words, events) {
        // 恢复玩家属性
        player = {
            ...baseAttr,
            age: saveData.age,
            Xiuyi: saveData.xiuyi,
            Tipao: saveData.tipao,
            Shouming: saveData.shouming,
            Qiyun: saveData.qiyun,
            Yuanshen: saveData.yuanshen
        };
        selected = saveData.selectedWords || [];
        randomWords = saveData.randomWords || [];
        alive = saveData.alive !== undefined ? saveData.alive : true;
        backpack = saveData.backpack || [];

        // 恢复商店存档
        if (saveData.shopData && typeof ShopSystem !== 'undefined') {
            ShopSystem.loadSaveData(saveData.shopData);
        }
        // 恢复福地存档
        if (saveData.blessedLandData && typeof BlessedLand !== 'undefined') {
            BlessedLand.loadSaveData(saveData.blessedLandData);
        }
        // 恢复突破系统存档
        if (typeof BreakthroughSystem !== 'undefined') {
            if (saveData.breakthroughData) {
                BreakthroughSystem.loadSaveData(saveData.breakthroughData);
            } else {
                BreakthroughSystem.init();
            }
        }
        // 恢复炼丹系统存档
        if (typeof AlchemySystem !== 'undefined' && saveData.alchemyData) {
            AlchemySystem.loadSaveData(saveData.alchemyData);
        }
        // 恢复装备栏存档
        if (typeof EquipmentManager !== 'undefined') {
            if (saveData.equipmentData) {
                EquipmentManager.loadSaveData(saveData.equipmentData);
            } else {
                // 兼容旧存档：装备栏置空
                EquipmentManager.loadSaveData(null);
            }
        }
        // 恢复秘境存档
        if (typeof DungeonSystem !== 'undefined' && DungeonSystem.loadSaveData && saveData.dungeonData) {
            DungeonSystem.loadSaveData(saveData.dungeonData);
        }
        // 恢复仓库存档
        if (typeof StorageSystem !== 'undefined') {
            if (saveData.storageData) {
                StorageSystem.loadSaveData(saveData.storageData);
            } else {
                StorageSystem.init();
            }
        }

        // 恢复全局资源存档
        if (typeof ResourceManager !== 'undefined') {
            if (saveData.resourceData) {
                ResourceManager.loadSaveData(saveData.resourceData);
            } else {
                ResourceManager.reset();
            }
            // 兼容旧存档：将背包中残留的灵石/木材/食物迁移到 ResourceManager
            ResourceManager.migrateFromBackpack(backpack);
        }

        // 重新渲染
        if (saveData.logHTML) {
            GameUI.restoreLog(saveData.logHTML);
        } else {
            GameUI.clearLog();
        }
        GameUI.renderWords(randomWords, handleWordClick);
        GameUI.updateUI(player);
        GameUI.updateBackpack(backpack);
        // 刷新装备栏UI
        if (typeof EquipmentManager !== 'undefined') {
            GameUI.updateEquipmentSlots(EquipmentManager.getAllEquipped());
        }
        GameUI.hideWordPanel();

        if (!alive) {
            GameUI.disableNextButton();
            GameUI.hideNextButton();
            // 加载死亡存档时也弹出死亡提示
            GameDialog.alert({
                title: '魂归天地',
                message: '你在第' + player.age + '年陨落了\n寿命耗尽，此世修行到此为止...',
                buttonText: '返回主菜单',
                type: 'warning'
            }).then(function() {
                GameClock.stop();
                if (typeof DungeonSystem !== 'undefined') DungeonSystem.stopExploring();
                if (typeof DungeonUI !== 'undefined') DungeonUI.closeDungeonPage();
                if (typeof ShopUI !== 'undefined') ShopUI.closeShopPage();
                if (typeof BlessedLandUI !== 'undefined') BlessedLandUI.closeBlessedLandPage();
                if (typeof AlchemyUI !== 'undefined') AlchemyUI.closeAlchemyPage();
                MenuSystem.showStartMenu();
            });
        } else {
            GameUI.enableNextButton();
        }
    }

    // 自动存档
    function autoSave() {
        // 找一个可用的存档位置
        if (currentSaveIndex === null) {
            // 如果没有指定存档位置，查找第一个可用的
            for (let i = 0; i < SaveManager.MAX_SAVES; i++) {
                if (!SaveManager.saveExists(i)) {
                    currentSaveIndex = i;
                    break;
                }
            }
            // 如果都满了，使用第一个
            if (currentSaveIndex === null) {
                currentSaveIndex = 0;
            }
        }

        SaveManager.saveGame(currentSaveIndex, player, backpack, selected, randomWords, alive);
    }

    // 手动保存游戏
    function manualSave(saveIndex) {
        currentSaveIndex = saveIndex;
        return SaveManager.saveGame(saveIndex, player, backpack, selected, randomWords, alive);
    }

    // 获取玩家对象
    function getPlayer() {
        return player;
    }

    // 获取存活状态
    function isAlive() {
        return alive;
    }

    // 添加装备到背包（满时自动存入仓库）
    function addToBackpack(item) {
        // 确保装备有 type 标识，整理背包时依赖此字段区分物品和装备
        if (!item.type) {
            item.type = 'equipment';
        }
        if (backpack.length >= 40) {
            // 背包已满，尝试存入仓库
            if (typeof StorageSystem !== 'undefined') {
                var storeResult = StorageSystem.addEquipment(item);
                if (storeResult.success) {
                    GameDialog.alert({ title: '背包已满', message: `${item.EquipmentName}已自动存入仓库`, type: 'normal' });
                    return true;
                }
            }
            // 仓库也满了，才销毁
            GameDialog.alert({ title: '背包和仓库已满', message: `${item.EquipmentName}已被销毁`, type: 'warning' });
            return false;
        }
        backpack.push(item);
        GameUI.updateBackpack(backpack);
        return true;
    }

    // 从背包移除物品
    function removeFromBackpack(index) {
        if (index >= 0 && index < backpack.length) {
            const item = backpack[index];
            backpack.splice(index, 1);
            GameUI.updateBackpack(backpack);
            GameDialog.alert({ title: '已销毁', message: `${item.EquipmentName}已销毁`, type: 'normal' });
            return item;
        }
        return null;
    }

    // 从背包移除物品（不显示通知，内部使用）
    function removeBackpackItem(index) {
        if (index >= 0 && index < backpack.length) {
            const item = backpack.splice(index, 1)[0];
            GameUI.updateBackpack(backpack);
            return item;
        }
        return null;
    }

    // 获取背包物品
    function getBackpack() {
        return backpack;
    }

    // 清空背包
    function clearBackpack() {
        backpack = [];
        GameUI.updateBackpack(backpack);
        GameDialog.alert({ title: '清空背包', message: '背包已清空', type: 'success' });
    }

    // 暴露公共接口
    return {
        init: init,
        confirmWords: confirmWords,
        startGame: startGame,
        nextAge: nextAge,
        rebirth: rebirth,
        loadFromSave: loadFromSave,
        autoSave: autoSave,
        manualSave: manualSave,
        getPlayer: getPlayer,
        isAlive: isAlive,
        addToBackpack: addToBackpack,
        removeFromBackpack: removeFromBackpack,
        removeBackpackItem: removeBackpackItem,
        getBackpack: getBackpack,
        clearBackpack: clearBackpack,
        getLifespanCap: getLifespanCap
    };
})();
