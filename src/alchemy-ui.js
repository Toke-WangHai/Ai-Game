// 炼丹炉UI模块（带独立炼制时间）
var AlchemyUI = (function() {

    function init() {
        // 绑定打开炼丹炉按钮
        var alchemyBtn = document.getElementById('alchemyBtn');
        if (alchemyBtn) {
            alchemyBtn.onclick = function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
                openAlchemyPage();
            };
        }
        // 绑定关闭按钮
        var closeBtn = document.getElementById('closeAlchemy');
        if (closeBtn) {
            closeBtn.onclick = function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
                closeAlchemyPage();
            };
        }
    }

    function openAlchemyPage() {
        var page = document.getElementById('alchemyPage');
        if (page) {
            page.style.display = 'block';
            // 注册轻量回调：定时器每200ms仅更新炼丹槽倒计时
            AlchemySystem.setUpdateCallback(updateCraftSlotTimer);
            renderAlchemyPage();
        }
    }

    function closeAlchemyPage() {
        var page = document.getElementById('alchemyPage');
        if (page) {
            page.style.display = 'none';
        }
        AlchemySystem.setUpdateCallback(null);
    }

    /**
     * 轻量更新：仅更新炼丹槽倒计时文本和进度条，不重建DOM
     */
    function updateCraftSlotTimer() {
        var slot = AlchemySystem.getCraftSlot();
        if (slot.recipeId === 0) return;

        if (!slot.ready) {
            // 更新倒计时
            var remaining = Math.max(0, slot.craftTime - slot.elapsed);
            var min = Math.floor(remaining / 60);
            var sec = remaining % 60;
            var timeStr = min > 0 ? min + '分' + sec + '秒' : sec + '秒';

            var statusEl = document.getElementById('craftSlotStatus');
            if (statusEl) statusEl.textContent = '剩余 ' + timeStr;

            var pct = slot.craftTime > 0 ? Math.min(100, (slot.elapsed / slot.craftTime) * 100) : 0;
            var barEl = document.getElementById('craftSlotProgressBar');
            if (barEl) barEl.style.width = pct + '%';
        } else {
            // 变为可领取状态 — 需要完整重渲染
            renderAlchemyPage();
        }
    }

    /**
     * 完整渲染炼丹页面（炼丹槽 + 配方列表）
     */
    function renderAlchemyPage() {
        renderCraftSlot();
        renderRecipeList();
    }

    /**
     * 渲染炼丹槽区域
     */
    function renderCraftSlot() {
        var container = document.getElementById('craftSlotArea');
        if (!container) return;

        var slot = AlchemySystem.getCraftSlot();

        if (slot.recipeId === 0) {
            // 空闲状态
            container.innerHTML =
                '<div class="craft-slot craft-slot-empty">' +
                    '<div class="craft-slot-icon">🔥</div>' +
                    '<div class="craft-slot-text">炼丹炉空闲</div>' +
                    '<div class="craft-slot-hint">从下方选择配方开始炼制</div>' +
                '</div>';
            return;
        }

        var recipe = AlchemySystem.getRecipeById(slot.recipeId);
        var recipeName = recipe ? recipe.RecipeName : '未知丹药';
        var resultItem = recipe ? ItemSystem.getItemById(recipe.ResultItemID) : null;
        var resultName = resultItem ? resultItem.ItemName : recipeName;

        if (slot.ready) {
            // 可领取状态
            container.innerHTML =
                '<div class="craft-slot craft-slot-ready">' +
                    '<div class="craft-slot-icon">✨</div>' +
                    '<div class="craft-slot-name" style="color:#2ecc71">' + resultName + (recipe ? ' ×' + recipe.ResultCount : '') + '</div>' +
                    '<div class="craft-slot-text" style="color:#2ecc71;font-weight:bold">炼制完成！</div>' +
                    '<button class="alchemy-craft-btn craftable" id="collectCraftBtn">📦 领取丹药</button>' +
                '</div>';
            document.getElementById('collectCraftBtn').onclick = function() {
                var result = AlchemySystem.collectCraft();
                if (typeof AudioManager !== 'undefined') {
                    if (result.success) AudioManager.playSfxAlchemy();
                    else AudioManager.playSfxFail();
                }
                GameDialog.alert({ title: result.success ? '炼制成功' : '炼制失败', message: result.message, type: result.success ? 'success' : 'warning' });
                renderAlchemyPage();
            };
        } else {
            // 炼制中状态
            var remaining = Math.max(0, slot.craftTime - slot.elapsed);
            var min = Math.floor(remaining / 60);
            var sec = remaining % 60;
            var timeStr = min > 0 ? min + '分' + sec + '秒' : sec + '秒';
            var pct = slot.craftTime > 0 ? Math.min(100, (slot.elapsed / slot.craftTime) * 100) : 0;

            container.innerHTML =
                '<div class="craft-slot craft-slot-crafting">' +
                    '<div class="craft-slot-icon">🔥</div>' +
                    '<div class="craft-slot-name" style="color:#f39c12">' + resultName + '</div>' +
                    '<div id="craftSlotStatus" class="craft-slot-text">剩余 ' + timeStr + '</div>' +
                    '<div class="craft-slot-progress">' +
                        '<div id="craftSlotProgressBar" class="craft-slot-progress-bar" style="width:' + pct + '%"></div>' +
                    '</div>' +
                '</div>';
        }
    }

    /**
     * 渲染配方列表
     */
    function renderRecipeList() {
        var container = document.getElementById('recipeList');
        if (!container) return;

        var recipes = AlchemySystem.getAllRecipes();
        var backpack = GameLogic.getBackpack();
        var craftSlot = AlchemySystem.getCraftSlot();
        var isBusy = craftSlot.recipeId > 0; // 炼丹炉是否占用中

        container.innerHTML = '';

        // 辅助丹（ID 25~27）排在最前面
        var sortedRecipes = recipes.slice().sort(function(a, b) {
            var aIsAux = a.ID >= 25 && a.ID <= 27;
            var bIsAux = b.ID >= 25 && b.ID <= 27;
            if (aIsAux && !bIsAux) return -1;
            if (!aIsAux && bIsAux) return 1;
            return a.ID - b.ID;
        });

        for (var i = 0; i < sortedRecipes.length; i++) {
            var recipe = sortedRecipes[i];
            var check = AlchemySystem.checkMaterials(recipe, backpack);
            var resultItem = ItemSystem.getItemById(recipe.ResultItemID);
            var resultName = resultItem ? resultItem.ItemName : recipe.RecipeName;

            // 计算炼制时间
            var craftTime = AlchemySystem.getCraftTime(recipe.ID);
            var ctMin = Math.floor(craftTime / 60);
            var ctSec = craftTime % 60;
            var ctStr = ctMin > 0 ? ctMin + '分' + ctSec + '秒' : ctSec + '秒';

            var card = document.createElement('div');
            card.className = 'alchemy-recipe-card' + (check.canCraft && !isBusy ? ' craftable' : '');
            card.setAttribute('data-recipe-id', recipe.ID);

            var html = '';
            html += '<div class="alchemy-recipe-header">';
            html += '<span class="alchemy-recipe-name">' + resultName + '</span>';
            html += '<span class="alchemy-recipe-count">×' + recipe.ResultCount + '</span>';
            html += '</div>';
            html += '<div class="alchemy-recipe-desc">' + recipe.RecipeDesc + '</div>';
            html += '<div class="alchemy-recipe-desc" style="color:#f39c12">⏱ 炼制时间：' + ctStr + '</div>';

            // 材料列表
            html += '<div class="alchemy-materials">';
            var mats = [];
            if (recipe.Material1ID > 0) mats.push({ id: recipe.Material1ID, count: recipe.Material1Count });
            if (recipe.Material2ID > 0) mats.push({ id: recipe.Material2ID, count: recipe.Material2Count });
            if (recipe.Material3ID > 0) mats.push({ id: recipe.Material3ID, count: recipe.Material3Count });

            for (var j = 0; j < mats.length; j++) {
                var matItem = ItemSystem.getItemById(mats[j].id);
                var matName = matItem ? matItem.ItemName : '???';
                var have = AlchemySystem.countItemInBackpack(backpack, mats[j].id);
                var enough = have >= mats[j].count;

                html += '<div class="alchemy-material' + (enough ? ' enough' : ' lacking') + '">';
                html += '<span class="mat-name">' + matName + '</span>';
                html += '<span class="mat-count">' + have + '/' + mats[j].count + '</span>';
                html += '</div>';
            }
            html += '</div>';

            // 炼制按钮
            var canStart = check.canCraft && !isBusy;
            var btnText = isBusy ? '⏳ 炉中有丹' : '🔥 开始炼制';
            html += '<button class="alchemy-craft-btn' + (canStart ? '' : ' disabled') + '"' +
                     (canStart ? '' : ' disabled') + '>' + btnText + '</button>';

            card.innerHTML = html;
            container.appendChild(card);

            // 绑定炼制按钮事件
            (function(recipeId, cardEl) {
                var btn = cardEl.querySelector('.alchemy-craft-btn');
                if (btn && !btn.disabled) {
                    btn.onclick = function(e) {
                        e.stopPropagation();
                        var result = AlchemySystem.startCraft(recipeId);
                        if (typeof AudioManager !== 'undefined') {
                            if (result.success) AudioManager.playSfxAlchemy();
                            else AudioManager.playSfxFail();
                        }
                        GameDialog.alert({ title: result.success ? '开始炼制' : '炼制失败', message: result.message, type: result.success ? 'success' : 'warning' });
                        // 刷新页面
                        renderAlchemyPage();
                    };
                }
            })(recipe.ID, card);
        }
    }

    return {
        init: init,
        openAlchemyPage: openAlchemyPage,
        closeAlchemyPage: closeAlchemyPage,
        renderAlchemyPage: renderAlchemyPage,
        renderRecipeList: renderRecipeList
    };
})();
console.log('[模块] alchemy-ui.js 加载完成');
