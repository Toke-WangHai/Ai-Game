// ===== 背包交互 & 销毁模式模块 =====
var BackpackUI = (function() {
    var destroyMode = false;
    var selectedForDestroy = new Set();
    var destroyModeBtn, confirmDestroyBtn, cancelDestroyBtn;

    function updateDestroyModeUI() {
        var backpack = GameLogic.getBackpack();
        for (var i = 0; i < 40; i++) {
            var slot = document.getElementById('backpack-slot-' + i);
            if (!slot) continue;
            if (destroyMode && backpack[i]) {
                slot.classList.add('selectable');
            } else {
                slot.classList.remove('selectable');
            }
            if (selectedForDestroy.has(i)) {
                slot.classList.add('selected-for-destroy');
            } else {
                slot.classList.remove('selected-for-destroy');
            }
        }
    }

    function exitDestroyMode() {
        destroyMode = false;
        selectedForDestroy.clear();
        destroyModeBtn.style.display = 'inline-block';
        confirmDestroyBtn.style.display = 'none';
        cancelDestroyBtn.style.display = 'none';
        var sortBtn = document.getElementById('sortBackpackBtn');
        if (sortBtn) sortBtn.style.display = 'inline-block';
        for (var i = 0; i < 40; i++) {
            var slot = document.getElementById('backpack-slot-' + i);
            if (slot) {
                slot.classList.remove('selectable', 'selected-for-destroy');
            }
        }
    }

    function showDestroyConfirmDialog() {
        var backpack = GameLogic.getBackpack();
        var overlay = document.createElement('div');
        overlay.className = 'destroy-confirm-overlay';
        overlay.id = 'destroyConfirmOverlay';

        var listHTML = '';
        selectedForDestroy.forEach(function(idx) {
            var item = backpack[idx];
            if (!item) return;
            if (item.type === 'item') {
                listHTML += '<div class="destroy-confirm-item">📦 ' + item.itemName + ' ×' + item.count + '</div>';
            } else {
                var info = EquipmentSystem.formatEquipmentInfo(item);
                listHTML += '<div class="destroy-confirm-item" style="color:' + info.color + '">⚔ ' + info.name + '</div>';
            }
        });

        overlay.innerHTML =
            '<div class="destroy-confirm-dialog">' +
                '<div class="destroy-confirm-title">🗑️ 确认销毁以下物品？</div>' +
                '<div class="destroy-confirm-list">' + listHTML + '</div>' +
                '<div style="color:#e74c3c;font-size:13px;margin-top:8px">⚠ 此操作不可撤销！</div>' +
                '<div class="destroy-confirm-buttons">' +
                    '<button class="btn btn-danger" id="confirmDestroyYes">确认销毁</button>' +
                    '<button class="btn btn-primary" id="confirmDestroyNo">取消</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('confirmDestroyYes').onclick = function() {
            var indices = Array.from(selectedForDestroy).sort(function(a, b) { return b - a; });
            var backpack = GameLogic.getBackpack();
            var destroyedCount = 0;
            // 从后往前删除，避免索引偏移
            indices.forEach(function(idx) {
                if (backpack[idx]) {
                    backpack.splice(idx, 1);
                    destroyedCount++;
                }
            });
            GameUI.updateBackpack(backpack);
            GameDialog.alert({ title: '销毁完成', message: '已销毁 ' + destroyedCount + ' 件物品', type: 'success' });
            overlay.remove();
            exitDestroyMode();
        };

        document.getElementById('confirmDestroyNo').onclick = function() { overlay.remove(); };
    }

    /**
     * 整理背包：
     * 1. 清除所有undefined/null空洞
     * 2. 合并同类物品（按叠加上限）
     * 3. 按类型排序：装备在前，物品在后；物品按ID排序
     */
    function sortBackpack() {
        var backpack = GameLogic.getBackpack();

        // 第一步：过滤掉所有undefined/null空洞
        var validItems = [];
        for (var i = 0; i < backpack.length; i++) {
            if (backpack[i]) {
                // 兼容旧存档：如果装备没有type字段，自动补上
                if (!backpack[i].type && backpack[i].EquipmentName) {
                    backpack[i].type = 'equipment';
                }
                if (backpack[i].type === 'item' || backpack[i].type === 'equipment') {
                    validItems.push(backpack[i]);
                }
            }
        }

        // 第二步：合并同类物品
        var merged = [];
        var itemMap = {}; // key: itemId, value: 总数量

        for (var j = 0; j < validItems.length; j++) {
            var slot = validItems[j];
            if (slot.type === 'item') {
                if (itemMap[slot.itemId] === undefined) {
                    itemMap[slot.itemId] = { total: 0, template: slot };
                }
                itemMap[slot.itemId].total += slot.count;
            } else {
                // 装备直接加入
                merged.push(slot);
            }
        }

        // 把合并后的物品按叠加上限拆分成多个格子
        var itemEntries = [];
        for (var itemId in itemMap) {
            if (itemMap.hasOwnProperty(itemId)) {
                var entry = itemMap[itemId];
                var remaining = entry.total;
                var stackLimit = entry.template.stackLimit || 99;
                while (remaining > 0) {
                    var stackCount = Math.min(remaining, stackLimit);
                    itemEntries.push({
                        type: 'item',
                        itemId: entry.template.itemId,
                        itemName: entry.template.itemName,
                        itemDesc: entry.template.itemDesc,
                        iconPath: entry.template.iconPath || '',
                        stackLimit: stackLimit,
                        count: stackCount
                    });
                    remaining -= stackCount;
                }
            }
        }

        // 第三步：排序 - 装备按品质降序，物品按ID升序
        merged.sort(function(a, b) {
            var qa = a.EquipmentQuality || 0;
            var qb = b.EquipmentQuality || 0;
            return qb - qa;
        });
        itemEntries.sort(function(a, b) {
            return a.itemId - b.itemId;
        });

        // 合并：装备在前，物品在后
        var sorted = merged.concat(itemEntries);

        // 第四步：写回原背包数组
        backpack.length = 0;
        for (var k = 0; k < sorted.length; k++) {
            backpack.push(sorted[k]);
        }

        GameUI.updateBackpack(backpack);
        GameDialog.alert({ title: '整理完成', message: '背包整理完成', type: 'success' });
    }

    /**
     * 使用辅助丹药（从丹药表读取效果配置）
     */
    function useConsumablePill(backpackIndex) {
        var backpack = GameLogic.getBackpack();
        var slotData = backpack[backpackIndex];
        if (!slotData || slotData.type !== 'item') return;

        var player = GameLogic.getPlayer();
        if (!player) return;

        var itemId = slotData.itemId;

        // 通过 PillSystem 读表判断并使用
        if (typeof PillSystem === 'undefined' || !PillSystem.isConsumablePill(itemId)) {
            return;
        }

        var result = PillSystem.useConsumable(itemId, player);
        if (!result || !result.success) {
            return;
        }

        // 消耗1个丹药
        slotData.count -= 1;
        if (slotData.count <= 0) {
            backpack.splice(backpackIndex, 1);
        }

        GameUI.updateBackpack(backpack);
        GameUI.updateUI(player);
        GameDialog.alert({ title: '服用丹药', message: '服用 ' + slotData.itemName + '\n' + result.effectMsg, type: 'success' });
    }

    function init() {
        GameUI.initBackpack();

        // 装备栏点击事件 - 卸下装备
        for (var i = 1; i <= 6; i++) {
            (function(slotIndex) {
                document.getElementById('slot' + slotIndex).onclick = function() {
                    var equip = EquipmentManager.getSlotEquipment(slotIndex);
                    if (equip) {
                        EquipmentManager.unequipFromSlot(slotIndex);
                    }
                };
            })(i);
        }

        // 背包格子点击事件
        for (var j = 0; j < 40; j++) {
            (function(backpackIndex) {
                document.getElementById('backpack-slot-' + backpackIndex).onclick = function(event) {
                    event.stopPropagation();

                    if (destroyMode) {
                        var backpack = GameLogic.getBackpack();
                        if (!backpack[backpackIndex]) return;
                        if (selectedForDestroy.has(backpackIndex)) {
                            selectedForDestroy.delete(backpackIndex);
                        } else {
                            selectedForDestroy.add(backpackIndex);
                        }
                        updateDestroyModeUI();
                        return;
                    }

                    var backpack = GameLogic.getBackpack();
                    if (backpack[backpackIndex]) {
                        var slotData = backpack[backpackIndex];
                        if (slotData.type === 'item') {
                            // 检查是否是可使用的辅助丹药（从丹药表读取）
                            if (typeof PillSystem !== 'undefined' && PillSystem.isConsumablePill(slotData.itemId)) {
                                useConsumablePill(backpackIndex);
                            }
                            return;
                        }
                        var slotIndex = slotData.Column;
                        EquipmentManager.equipFromBackpack(slotData, slotIndex, backpackIndex);
                    }
                };
            })(j);
        }

        // 销毁模式按钮
        destroyModeBtn = document.getElementById('destroyModeBtn');
        confirmDestroyBtn = document.getElementById('confirmDestroyBtn');
        cancelDestroyBtn = document.getElementById('cancelDestroyBtn');

        destroyModeBtn.onclick = function() {
            destroyMode = true;
            selectedForDestroy.clear();
            destroyModeBtn.style.display = 'none';
            confirmDestroyBtn.style.display = 'inline-block';
            cancelDestroyBtn.style.display = 'inline-block';
            var sortBtn = document.getElementById('sortBackpackBtn');
            if (sortBtn) sortBtn.style.display = 'none';
            updateDestroyModeUI();
        };

        cancelDestroyBtn.onclick = function() { exitDestroyMode(); };

        confirmDestroyBtn.onclick = function() {
            if (selectedForDestroy.size === 0) {
                GameDialog.alert({ title: '提示', message: '请先勾选要销毁的物品', type: 'warning' });
                return;
            }
            showDestroyConfirmDialog();
        };

        // 整理背包按钮
        var sortBtn = document.getElementById('sortBackpackBtn');
        if (sortBtn) {
            sortBtn.onclick = function() {
                sortBackpack();
            };
        }
    }

    return {
        init: init
    };
})();
console.log('[模块] backpack-ui.js 加载完成');
