// ===== 通用数量选择弹窗模块 =====
// 供仓库、商店等系统共用的数量选择UI
var QuantityDialog = (function() {

    /**
     * 显示数量选择弹窗
     * @param {string} title - 标题（如"取出物品"、"出售物品"）
     * @param {string} itemName - 物品名
     * @param {number} maxCount - 最大数量
     * @param {function} onConfirm - 确认回调(count)
     * @param {object} [options] - 可选配置
     * @param {number} [options.defaultCount] - 默认数量（不传则为maxCount）
     */
    function show(title, itemName, maxCount, onConfirm, options) {
        var opts = options || {};
        var currentCount = opts.defaultCount || maxCount;

        var overlay = document.createElement('div');
        overlay.className = 'storage-qty-overlay';
        overlay.id = 'globalQtyOverlay';

        overlay.innerHTML =
            '<div class="storage-qty-dialog">' +
                '<div class="storage-qty-title">' + title + '</div>' +
                '<div class="storage-qty-name">' + itemName + ' <span style="color:rgba(200,180,140,0.5)">(共' + maxCount + '个)</span></div>' +
                '<div class="storage-qty-row">' +
                    '<button class="storage-qty-btn" id="gqtyMin">1</button>' +
                    '<button class="storage-qty-btn" id="gqtyDec">-</button>' +
                    '<input type="number" class="storage-qty-input" id="gqtyInput" value="' + currentCount + '" min="1" max="' + maxCount + '">' +
                    '<button class="storage-qty-btn" id="gqtyInc">+</button>' +
                    '<button class="storage-qty-btn" id="gqtyMax">全部</button>' +
                '</div>' +
                '<div class="storage-qty-slider-wrap">' +
                    '<input type="range" class="storage-qty-slider" id="gqtySlider" min="1" max="' + maxCount + '" value="' + currentCount + '">' +
                '</div>' +
                '<div class="storage-qty-buttons">' +
                    '<button class="btn btn-success" id="gqtyConfirm">确定</button>' +
                    '<button class="btn btn-danger" id="gqtyCancel">取消</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        var input = document.getElementById('gqtyInput');
        var slider = document.getElementById('gqtySlider');

        function setCount(val) {
            currentCount = Math.max(1, Math.min(maxCount, val));
            input.value = currentCount;
            slider.value = currentCount;
        }

        document.getElementById('gqtyMin').onclick = function() { setCount(1); };
        document.getElementById('gqtyDec').onclick = function() { setCount(currentCount - 1); };
        document.getElementById('gqtyInc').onclick = function() { setCount(currentCount + 1); };
        document.getElementById('gqtyMax').onclick = function() { setCount(maxCount); };

        input.oninput = function() {
            var v = parseInt(input.value);
            if (!isNaN(v)) setCount(v);
        };

        slider.oninput = function() {
            setCount(parseInt(slider.value));
        };

        document.getElementById('gqtyConfirm').onclick = function() {
            var finalCount = Math.max(1, Math.min(maxCount, parseInt(input.value) || maxCount));
            overlay.remove();
            onConfirm(finalCount);
        };

        document.getElementById('gqtyCancel').onclick = function() {
            overlay.remove();
        };

        overlay.onclick = function(e) {
            if (e.target === overlay) overlay.remove();
        };
    }

    return {
        show: show
    };
})();
console.log('[模块] quantity-dialog.js 加载完成');
