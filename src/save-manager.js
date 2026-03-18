// 存档管理模块
const SaveManager = (function() {
    const MAX_SAVES = 3;
    const SAVE_PREFIX = 'cultivation_save_';

    // 获取所有存档
    function getAllSaves() {
        const saves = [];
        for (let i = 0; i < MAX_SAVES; i++) {
            const saveData = localStorage.getItem(`${SAVE_PREFIX}${i}`);
            if (saveData) {
                try {
                    const data = JSON.parse(saveData);
                    saves.push({
                        index: i,
                        playerName: data.playerName || `存档 ${i + 1}`,
                        age: data.age || 0,
                        xiuyi: data.xiuyi || 0,
                        saveTime: data.saveTime || new Date().toISOString(),
                        level: data.level || '练气一层'
                    });
                } catch (e) {
                    console.error(`读取存档 ${i} 失败:`, e);
                }
            } else {
                saves.push({
                    index: i,
                    playerName: `存档 ${i + 1}`,
                    age: null,
                    xiuyi: null,
                    saveTime: null,
                    level: null
                });
            }
        }
        return saves;
    }

    // 保存游戏
    function saveGame(saveIndex, player, backpack, selectedWords, randomWords, alive) {
        if (saveIndex < 0 || saveIndex >= MAX_SAVES) {
            GameDialog.alert({ title: '存档错误', message: '无效的存档位置', type: 'warning' });
            return false;
        }

        try {
            // 获取当前等级信息
            const levelInfo = LevelCalculator.calculateLevel(player.Xiuyi);

            const saveData = {
                playerName: `存档 ${saveIndex + 1}`,
                age: player.age,
                xiuyi: player.Xiuyi,
                tipao: player.Tipao,
                shouming: player.Shouming,
                qiyun: player.Qiyun,
                yuanshen: player.Yuanshen,
                backpack: backpack,
                selectedWords: selectedWords,
                randomWords: randomWords,
                alive: alive,
                saveTime: new Date().toISOString(),
                level: levelInfo.levelName,
                // 人生经历日志
                logHTML: (typeof GameUI !== 'undefined') ? GameUI.getLogHTML() : '',
                // 商店存档
                shopData: (typeof ShopSystem !== 'undefined') ? ShopSystem.getSaveData() : null,
                // 福地存档
                blessedLandData: (typeof BlessedLand !== 'undefined') ? BlessedLand.getSaveData() : null,
                // 突破系统存档
                breakthroughData: (typeof BreakthroughSystem !== 'undefined') ? BreakthroughSystem.getSaveData() : null,
                // 炼丹系统存档
                alchemyData: (typeof AlchemySystem !== 'undefined') ? AlchemySystem.getSaveData() : null,
                // 装备栏存档
                equipmentData: (typeof EquipmentManager !== 'undefined') ? EquipmentManager.getSaveData() : null,
                // 秘境存档
                dungeonData: (typeof DungeonSystem !== 'undefined' && DungeonSystem.getSaveData) ? DungeonSystem.getSaveData() : null,
                // 仓库存档
                storageData: (typeof StorageSystem !== 'undefined') ? StorageSystem.getSaveData() : null,
                // 全局资源存档
                resourceData: (typeof ResourceManager !== 'undefined') ? ResourceManager.getSaveData() : null,
                // 时钟倒计时存档
                clockData: (typeof GameClock !== 'undefined' && GameClock.getSaveData) ? GameClock.getSaveData() : null
            };

            localStorage.setItem(`${SAVE_PREFIX}${saveIndex}`, JSON.stringify(saveData));
            GameDialog.alert({ title: '保存成功', message: `存档 ${saveIndex + 1} 保存成功`, type: 'success' });
            return true;
        } catch (e) {
            console.error('保存失败:', e);
            GameDialog.alert({ title: '保存失败', message: '保存失败', type: 'warning' });
            return false;
        }
    }

    // 加载游戏
    function loadGame(saveIndex) {
        if (saveIndex < 0 || saveIndex >= MAX_SAVES) {
            GameDialog.alert({ title: '加载错误', message: '无效的存档位置', type: 'warning' });
            return null;
        }

        const saveData = localStorage.getItem(`${SAVE_PREFIX}${saveIndex}`);
        if (!saveData) {
            GameDialog.alert({ title: '加载失败', message: `存档 ${saveIndex + 1} 不存在`, type: 'warning' });
            return null;
        }

        try {
            return JSON.parse(saveData);
        } catch (e) {
            console.error('加载存档失败:', e);
            GameDialog.alert({ title: '加载失败', message: '加载存档失败', type: 'warning' });
            return null;
        }
    }

    // 删除存档
    function deleteSave(saveIndex) {
        if (saveIndex < 0 || saveIndex >= MAX_SAVES) {
            GameDialog.alert({ title: '删除错误', message: '无效的存档位置', type: 'warning' });
            return false;
        }

        localStorage.removeItem(`${SAVE_PREFIX}${saveIndex}`);
        GameDialog.alert({ title: '删除成功', message: `存档 ${saveIndex + 1} 已删除`, type: 'success' });
        return true;
    }

    // 检查存档是否存在
    function saveExists(saveIndex) {
        return localStorage.getItem(`${SAVE_PREFIX}${saveIndex}`) !== null;
    }

    // 暴露公共接口
    return {
        getAllSaves: getAllSaves,
        saveGame: saveGame,
        loadGame: loadGame,
        deleteSave: deleteSave,
        saveExists: saveExists,
        MAX_SAVES: MAX_SAVES
    };
})();
