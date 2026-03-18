// 仓库UI模块 - 在人物详情界面展示仓库
var StorageUI = (function() {

    /**
     * 打开仓库弹窗
     */
    function openStoragePage() {
        var overlay = document.createElement('div');
        overlay.className = 'storage-overlay';
        overlay.id = 'storageOverlay';

        var html = '<div class="storage-dialog">' +
            '<div class="storage-header">' +
                '<span class="storage-title">🏛️ 仓库</span>' +
                '<button class="storage-close-btn" id="closeStorageBtn">✕</button>' +
            '</div>' +
            '<div class="storage-info">' +
                '<span>容量：<span id="storageUsed">' + StorageSystem.getUsedSlots() + '</span> / <span id="storageMax">' + StorageSystem.getMaxSlots() + '</span></span>' +
                buildExpandButton() +
            '</div>' +
            '<div class="storage-tabs">' +
                '<button class="storage-tab active" id="tabStorageView" data-tab="view">查看仓库</button>' +
                '<button class="storage-tab" id="tabStorageStore" data-tab="store">存入物品</button>' +
            '</div>' +
            '<div class="storage-body" id="storageBody"></div>' +
        '</div>';

        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.remove();
        };

        document.getElementById('closeStorageBtn').onclick = function() {
            overlay.remove();
        };

        // 绑定tab切换
        document.getElementById('tabStorageView').onclick = function() {
            setActiveTab('view');
        };
        document.getElementById('tabStorageStore').onclick = function() {
            setActiveTab('store');
        };

        bindExpandEvent();
        renderStorageView();
    }

    function buildExpandButton() {
        var cost = StorageSystem.getNextExpandCost();
        if (!cost) return '<span style="color:#aaa;font-size:12px;margin-left:10px">已满</span>';
        return '<button class="storage-expand-btn" id="expandStorageBtn">扩容 (💎' + cost + '灵石)</button>';
    }

    function bindExpandEvent() {
        var btn = document.getElementById('expandStorageBtn');
        if (btn) {
            btn.onclick = function() {
                var result = StorageSystem.expandStorage();
                if (typeof AudioManager !== 'undefined') {
                    if (result.success) AudioManager.playSfxSuccess(); else AudioManager.playSfxFail();
                }
                GameDialog.alert({ title: '仓库扩容', message: result.message, type: result.success ? 'success' : 'warning' });
                if (result.success) {
                    refreshStorageInfo();
                    // 刷新当前视图以更新空格子数
                    var viewTab = document.getElementById('tabStorageView');
                    if (viewTab && viewTab.classList.contains('active')) {
                        renderStorageView();
                    }
                }
            };
        }
    }

    function refreshStorageInfo() {
        var infoEl = document.querySelector('.storage-info');
        if (infoEl) {
            infoEl.innerHTML = '<span>容量：<span id="storageUsed">' + StorageSystem.getUsedSlots() + '</span> / <span id="storageMax">' + StorageSystem.getMaxSlots() + '</span></span>' +
                buildExpandButton();
            bindExpandEvent();
        }
    }

    function setActiveTab(tab) {
        var tabs = document.querySelectorAll('.storage-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
        }
        document.getElementById(tab === 'view' ? 'tabStorageView' : 'tabStorageStore').classList.add('active');

        if (tab === 'view') {
            renderStorageView();
        } else {
            renderStoreView();
        }
    }

    // ========== 仓库查看界面（取出物品） ==========

    /**
     * 渲染仓库查看界面（显示所有格子，包括空格子）
     */
    function renderStorageView() {
        var body = document.getElementById('storageBody');
        if (!body) return;

        var slots = StorageSystem.getSlots();
        var maxSlots = StorageSystem.getMaxSlots();

        var html = '<div class="storage-grid">';

        // 渲染已有物品的格子
        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            if (!slot) continue;

            if (slot.type === 'item') {
                var iconHtml = '';
                if (slot.iconPath && slot.iconPath.trim() !== '') {
                    iconHtml = '<img class="storage-slot-icon" src="' + slot.iconPath + '" onerror="this.style.display=\'none\'">';
                }
                html += '<div class="storage-slot storage-slot-item" data-index="' + i + '">' +
                    iconHtml +
                    '<div class="storage-slot-name" style="color:#f1c40f">' + (slot.itemName || '物品') + '</div>' +
                    '<div class="storage-slot-count">×' + slot.count + '</div>' +
                    '<button class="storage-slot-btn" data-action="takeout" data-index="' + i + '">取出</button>' +
                '</div>';
            } else {
                var info = (typeof EquipmentSystem !== 'undefined') ? EquipmentSystem.formatEquipmentInfo(slot) : { name: slot.EquipmentName || '装备', color: '#ccc' };
                html += '<div class="storage-slot storage-slot-equip" data-index="' + i + '">' +
                    '<div class="storage-slot-name" style="color:' + info.color + '">' + info.name + '</div>' +
                    '<button class="storage-slot-btn" data-action="takeout" data-index="' + i + '">取出</button>' +
                '</div>';
            }
        }

        // 渲染空格子
        var usedCount = slots.filter(function(s) { return s !== null && s !== undefined; }).length;
        var emptyCount = maxSlots - usedCount;
        for (var e = 0; e < emptyCount; e++) {
            html += '<div class="storage-slot storage-slot-empty">' +
                '<div class="storage-slot-empty-icon">📦</div>' +
                '<div class="storage-slot-empty-text">空</div>' +
            '</div>';
        }

        html += '</div>';
        body.innerHTML = html;

        // 绑定取出事件
        var btns = body.querySelectorAll('[data-action="takeout"]');
        for (var b = 0; b < btns.length; b++) {
            btns[b].onclick = function() {
                var idx = parseInt(this.getAttribute('data-index'));
                var slot = StorageSystem.getSlots()[idx];
                if (!slot) return;

                // 物品且数量>1时弹出数量选择
                if (slot.type === 'item' && slot.count > 1) {
                    QuantityDialog.show('取出物品', slot.itemName || '物品', slot.count, function(count) {
                        doTakeOut(idx, count);
                    });
                } else {
                    // 装备或数量=1，直接取出
                    doTakeOut(idx);
                }
            };
        }
    }

    function doTakeOut(idx, count) {
        var result = StorageSystem.takeOut(idx, count);
        if (typeof AudioManager !== 'undefined') {
            if (result.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
        }
        GameDialog.alert({ title: '取出', message: result.message, type: result.success ? 'success' : 'warning' });
        renderStorageView();
        refreshStorageInfo();
    }

    // ========== 存入界面（从背包存入仓库） ==========

    /**
     * 渲染存入界面（从背包存入仓库）
     */
    function renderStoreView() {
        var body = document.getElementById('storageBody');
        if (!body) return;

        var backpack = GameLogic.getBackpack();
        if (backpack.length === 0) {
            body.innerHTML = '<div class="storage-empty">背包为空</div>';
            return;
        }

        var html = '<div class="storage-grid">';
        for (var i = 0; i < backpack.length; i++) {
            var slot = backpack[i];
            if (!slot) continue;

            if (slot.type === 'item') {
                var iconHtml = '';
                if (slot.iconPath && slot.iconPath.trim() !== '') {
                    iconHtml = '<img class="storage-slot-icon" src="' + slot.iconPath + '" onerror="this.style.display=\'none\'">';
                }
                html += '<div class="storage-slot storage-slot-item" data-index="' + i + '">' +
                    iconHtml +
                    '<div class="storage-slot-name" style="color:#f1c40f">' + (slot.itemName || '物品') + '</div>' +
                    '<div class="storage-slot-count">×' + slot.count + '</div>' +
                    '<button class="storage-slot-btn storage-slot-btn-store" data-action="store" data-index="' + i + '">存入</button>' +
                '</div>';
            } else {
                var info = (typeof EquipmentSystem !== 'undefined') ? EquipmentSystem.formatEquipmentInfo(slot) : { name: slot.EquipmentName || '装备', color: '#ccc' };
                html += '<div class="storage-slot storage-slot-equip" data-index="' + i + '">' +
                    '<div class="storage-slot-name" style="color:' + info.color + '">' + info.name + '</div>' +
                    '<button class="storage-slot-btn storage-slot-btn-store" data-action="store" data-index="' + i + '">存入</button>' +
                '</div>';
            }
        }
        html += '</div>';
        body.innerHTML = html;

        // 绑定存入事件
        var btns = body.querySelectorAll('[data-action="store"]');
        for (var b = 0; b < btns.length; b++) {
            btns[b].onclick = function() {
                var idx = parseInt(this.getAttribute('data-index'));
                var bpSlot = GameLogic.getBackpack()[idx];
                if (!bpSlot) return;

                // 物品且数量>1时弹出数量选择
                if (bpSlot.type === 'item' && bpSlot.count > 1) {
                    QuantityDialog.show('存入仓库', bpSlot.itemName || '物品', bpSlot.count, function(count) {
                        doStore(idx, count);
                    });
                } else {
                    // 装备或数量=1，直接存入
                    doStore(idx);
                }
            };
        }
    }

    function doStore(idx, count) {
        var result = StorageSystem.storeFromBackpack(idx, count);
        if (typeof AudioManager !== 'undefined') {
            if (result.success) AudioManager.playSfxItem(); else AudioManager.playSfxFail();
        }
        GameDialog.alert({ title: '存入', message: result.message, type: result.success ? 'success' : 'warning' });
        renderStoreView();
        refreshStorageInfo();
        // 同步更新人物页面的背包
        GameUI.updateBackpack(GameLogic.getBackpack());
    }

    return {
        openStoragePage: openStoragePage
    };
})();
console.log('[模块] storage-ui.js 加载完成');
