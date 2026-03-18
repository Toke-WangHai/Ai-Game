// 装备管理模块 - 每个栏位独立管理
const EquipmentManager = (function() {
    // 存储每个栏位的装备（1-6号位）
    const slots = {
        1: null,
        2: null,
        3: null,
        4: null,
        5: null,
        6: null
    };

    // 防抖控制
    let isProcessing = false;
    const PROCESSING_TIMEOUT = 300; // 300ms内只允许一次操作

    // UI更新回调函数
    let characterUIUpdateCallback = null;

    // 设置UI更新回调
    function setCharacterUIUpdateCallback(callback) {
        characterUIUpdateCallback = callback;
    }

    // 触发UI更新
    function triggerCharacterUIUpdate() {
        if (characterUIUpdateCallback) {
            const player = GameLogic.getPlayer();
            characterUIUpdateCallback(player);
        }
    }

    // 等待操作完成
    function waitUntilReady() {
        return new Promise(resolve => {
            if (!isProcessing) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (!isProcessing) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            }
        });
    }

    // 开始处理
    function startProcessing() {
        isProcessing = true;
        setTimeout(() => {
            isProcessing = false;
        }, PROCESSING_TIMEOUT);
    }

    // 获取指定栏位的装备
    function getSlotEquipment(slotIndex) {
        return slots[slotIndex] || null;
    }

    // 获取所有已装备的物品
    function getAllEquipped() {
        const equipped = [];
        for (let i = 1; i <= 6; i++) {
            if (slots[i]) {
                equipped.push(slots[i]);
            }
        }
        return equipped;
    }

    // 从背包装备到指定栏位（异步）
    async function equipFromBackpack(equipment, slotIndex, backpackIndex) {
        // 等待当前操作完成
        await waitUntilReady();

        if (slotIndex < 1 || slotIndex > 6) {
            console.error('无效的栏位:', slotIndex);
            return false;
        }

        console.log(`[背包装备] 尝试将[${equipment.EquipmentName}]装备到${slotIndex}号位`);

        startProcessing();

        // 检查栏位是否已有装备
        if (slots[slotIndex]) {
            // 弹出确认窗口
            const oldEquip = slots[slotIndex];
            const message = `该栏位已装备[${oldEquip.EquipmentName}]\n是否替换为[${equipment.EquipmentName}]？`;

            console.log(`[背包装备] ${slotIndex}号位已有装备[${oldEquip.EquipmentName}]，弹出确认窗口`);

            const confirmed = await GameDialog.confirm({
                title: '替换装备',
                message: message,
                confirmText: '确认替换',
                cancelText: '保持原装备',
                type: 'normal'
            });
            if (!confirmed) {
                console.log('[背包装备] 用户取消替换');
                isProcessing = false;
                return false; // 用户取消
            }

            // 用户确认，执行替换
            console.log('[背包装备] 用户确认替换');
            return replaceEquipmentFromBackpack(equipment, slotIndex, backpackIndex);
        } else {
            // 栏位为空，直接装备
            console.log(`[背包装备] ${slotIndex}号位为空，直接装备`);
            return equipToSlot(equipment, slotIndex, true, backpackIndex);
        }
    }

    // 替换装备（从背包）
    async function replaceEquipmentFromBackpack(equipment, slotIndex, backpackIndex) {
        const oldEquip = slots[slotIndex];

        // 移除旧装备的属性加成
        const player = GameLogic.getPlayer();
        for (const k in oldEquip) {
            if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                player[k] -= oldEquip[k];
            }
        }

        // 检查背包是否有空间存放旧装备
        const backpack = GameLogic.getBackpack();
        if (backpack.length >= 40) {
            // 背包已满，询问是否销毁旧装备
            const confirmed = await GameDialog.confirm({
                title: '背包已满',
                message: `背包已满，是否销毁 [${oldEquip.EquipmentName}]？`,
                confirmText: '确认销毁',
                cancelText: '取消',
                type: 'danger'
            });
            if (!confirmed) {
                // 用户取消，恢复旧装备的属性
                for (const k in oldEquip) {
                    if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                        player[k] += oldEquip[k];
                    }
                }
                isProcessing = false;
                return false;
            }
            // 用户确认销毁旧装备
            GameDialog.alert({ title: '已销毁', message: `${oldEquip.EquipmentName}已销毁`, type: 'normal' });
        } else {
            // 添加旧装备到背包
            GameLogic.addToBackpack(oldEquip);
        }

        // 从背包移除新装备
        GameLogic.removeBackpackItem(backpackIndex);

        // 装备新物品
        slots[slotIndex] = equipment;

        console.log(`[装备替换] ${slotIndex}号位从[${oldEquip.EquipmentName}]替换为[${equipment.EquipmentName}]`);

        // 应用新装备的属性加成
        for (const k in equipment) {
            if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                player[k] += equipment[k];
            }
        }

        // 延迟更新UI，确保DOM操作完成
        setTimeout(() => {
            GameUI.updateUI(player);
            GameUI.updateEquipmentSlots(getAllEquipped());
            GameUI.updateBackpack(GameLogic.getBackpack());
            // 触发人物详情页面属性更新
            triggerCharacterUIUpdate();
        }, 0);

        return true;
    }

    // 装备到指定栏位
    function equipToSlot(equipment, slotIndex, fromBackpack = false, backpackIndex = -1) {
        if (slotIndex < 1 || slotIndex > 6) {
            console.error('无效的栏位:', slotIndex);
            isProcessing = false;
            return false;
        }

        console.log(`[装备] 将装备[${equipment.EquipmentName}]装备到${slotIndex}号位`);

        // 播放装备音效
        if (typeof AudioManager !== 'undefined') AudioManager.playSfxEquip();

        // 如果是从背包装备的，先从背包移除
        if (fromBackpack && backpackIndex >= 0) {
            GameLogic.removeBackpackItem(backpackIndex);
        }

        // 装备新物品
        slots[slotIndex] = equipment;

        // 应用新装备的属性加成
        const player = GameLogic.getPlayer();
        for (const k in equipment) {
            if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                player[k] += equipment[k];
            }
        }

        // 延迟更新UI，确保DOM操作完成
        setTimeout(() => {
            GameUI.updateUI(player);
            GameUI.updateEquipmentSlots(getAllEquipped());
            GameUI.updateBackpack(GameLogic.getBackpack());
            // 触发人物详情页面属性更新
            triggerCharacterUIUpdate();
        }, 0);

        return true;
    }

    // 从指定栏位卸下装备
    async function unequipFromSlot(slotIndex) {
        // 等待当前操作完成
        await waitUntilReady();

        if (slotIndex < 1 || slotIndex > 6) {
            console.error('无效的栏位:', slotIndex);
            return null;
        }

        const item = slots[slotIndex];
        if (!item) {
            return null; // 栏位为空
        }

        console.log(`[卸载] 从${slotIndex}号位卸下[${item.EquipmentName}]`);

        startProcessing();

        // 检查背包是否有空间
        const backpack = GameLogic.getBackpack();
        if (backpack.length >= 40) {
            // 背包已满，询问是否销毁
            const confirmed = await GameDialog.confirm({
                title: '背包已满',
                message: `背包已满，是否销毁 [${item.EquipmentName}]？`,
                confirmText: '确认销毁',
                cancelText: '取消',
                type: 'danger'
            });
            if (!confirmed) {
                isProcessing = false;
                return null; // 用户取消
            }
            // 用户确认销毁
            GameDialog.alert({ title: '已销毁', message: `${item.EquipmentName}已销毁`, type: 'normal' });
        } else {
            // 添加到背包
            GameLogic.addToBackpack(item);
        }

        // 移除装备的属性加成
        const player = GameLogic.getPlayer();
        for (const k in item) {
            if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                player[k] -= item[k];
            }
        }

        // 清空栏位
        slots[slotIndex] = null;

        // 延迟更新UI，确保DOM操作完成
        setTimeout(() => {
            GameUI.updateUI(player);
            GameUI.updateEquipmentSlots(getAllEquipped());
            GameUI.updateBackpack(GameLogic.getBackpack());
            // 触发人物详情页面属性更新
            triggerCharacterUIUpdate();
        }, 0);

        return item;
    }

    // 获取存档数据
    function getSaveData() {
        var data = {};
        for (var i = 1; i <= 6; i++) {
            data[i] = slots[i] ? Object.assign({}, slots[i]) : null;
        }
        return data;
    }

    // 从存档恢复装备栏
    function loadSaveData(data) {
        for (var i = 1; i <= 6; i++) {
            slots[i] = (data && data[i]) ? data[i] : null;
        }
    }

    // 清空所有装备
    function clearAllSlots() {
        const player = GameLogic.getPlayer();
        for (let i = 1; i <= 6; i++) {
            if (slots[i]) {
                // 移除属性加成
                const item = slots[i];
                for (const k in item) {
                    if (k !== 'EquipmentName' && k !== 'ID' && k !== 'Column' && k !== 'IconPath' && k !== 'Desc' && k !== 'EquipmentQuality' && player[k] !== undefined) {
                        player[k] -= item[k];
                    }
                }

                // 添加到背包
                GameLogic.addToBackpack(item);
                slots[i] = null;
            }
        }

        // 更新UI
        GameUI.updateUI(player);
        GameUI.updateEquipmentSlots(getAllEquipped());
        GameUI.updateBackpack(GameLogic.getBackpack());
        // 触发人物详情页面属性更新
        triggerCharacterUIUpdate();
    }

    // 暴露公共接口
    return {
        getSlotEquipment: getSlotEquipment,
        getAllEquipped: getAllEquipped,
        equipFromBackpack: equipFromBackpack,
        equipToSlot: equipToSlot,
        unequipFromSlot: unequipFromSlot,
        clearAllSlots: clearAllSlots,
        setCharacterUIUpdateCallback: setCharacterUIUpdateCallback,
        getSaveData: getSaveData,
        loadSaveData: loadSaveData
    };
})();
