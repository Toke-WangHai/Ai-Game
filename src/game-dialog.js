// ===== 游戏风格自定义弹窗系统 =====
// 替代原生 confirm() / alert()，统一修仙美术风格
var GameDialog = (function() {

    // ===== confirm 替代：返回 Promise<boolean> =====
    function confirm(options) {
        return new Promise(function(resolve) {
            var title = options.title || '确认';
            var message = options.message || '';
            var confirmText = options.confirmText || '确认';
            var cancelText = options.cancelText || '取消';
            var type = options.type || 'normal'; // normal / danger / warning

            var overlay = document.createElement('div');
            overlay.className = 'gd-overlay';

            // 根据类型选择边框色
            var borderClass = 'gd-dialog';
            if (type === 'danger') borderClass += ' gd-dialog-danger';
            else if (type === 'warning') borderClass += ' gd-dialog-warning';

            // 根据类型选择标题色和图标
            var titleIcon = '✦';
            var titleClass = 'gd-title';
            if (type === 'danger') {
                titleIcon = '⚠';
                titleClass += ' gd-title-danger';
            } else if (type === 'warning') {
                titleIcon = '⚡';
                titleClass += ' gd-title-warning';
            }

            // 确认按钮样式
            var confirmBtnClass = 'gd-btn gd-btn-confirm';
            if (type === 'danger') confirmBtnClass = 'gd-btn gd-btn-danger';
            else if (type === 'warning') confirmBtnClass = 'gd-btn gd-btn-warning';

            // 将 \n 替换为 <br>
            var messageHTML = message.replace(/\n/g, '<br>');

            overlay.innerHTML =
                '<div class="' + borderClass + '">' +
                    '<div class="gd-header">' +
                        '<div class="gd-header-line"></div>' +
                        '<div class="' + titleClass + '">' + titleIcon + ' ' + title + '</div>' +
                    '</div>' +
                    '<div class="gd-body">' +
                        '<div class="gd-message">' + messageHTML + '</div>' +
                    '</div>' +
                    '<div class="gd-footer">' +
                        '<button class="' + confirmBtnClass + '" id="gdConfirmYes">' + confirmText + '</button>' +
                        '<button class="gd-btn gd-btn-cancel" id="gdConfirmNo">' + cancelText + '</button>' +
                    '</div>' +
                    '<div class="gd-corner gd-corner-tl"></div>' +
                    '<div class="gd-corner gd-corner-tr"></div>' +
                    '<div class="gd-corner gd-corner-bl"></div>' +
                    '<div class="gd-corner gd-corner-br"></div>' +
                '</div>';

            document.body.appendChild(overlay);

            // 入场动画
            requestAnimationFrame(function() {
                overlay.classList.add('gd-overlay-active');
            });

            function closeDialog(result) {
                overlay.classList.remove('gd-overlay-active');
                overlay.classList.add('gd-overlay-closing');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.remove();
                    resolve(result);
                }, 250);
            }

            overlay.querySelector('#gdConfirmYes').onclick = function() { closeDialog(true); };
            overlay.querySelector('#gdConfirmNo').onclick = function() { closeDialog(false); };

            // 点击蒙层关闭（等同取消）
            overlay.onclick = function(e) {
                if (e.target === overlay) closeDialog(false);
            };

            // ESC 键关闭
            function handleKey(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleKey);
                    closeDialog(false);
                }
            }
            document.addEventListener('keydown', handleKey);
        });
    }

    // ===== alert 替代：返回 Promise<void> =====
    function alert(options) {
        return new Promise(function(resolve) {
            var title = options.title || '提示';
            var message = options.message || '';
            var buttonText = options.buttonText || '知道了';
            var type = options.type || 'normal'; // normal / warning / success

            var overlay = document.createElement('div');
            overlay.className = 'gd-overlay';

            var borderClass = 'gd-dialog';
            if (type === 'warning') borderClass += ' gd-dialog-warning';
            else if (type === 'success') borderClass += ' gd-dialog-success';

            var titleIcon = '✦';
            var titleClass = 'gd-title';
            if (type === 'warning') {
                titleIcon = '⚡';
                titleClass += ' gd-title-warning';
            } else if (type === 'success') {
                titleIcon = '✧';
                titleClass += ' gd-title-success';
            }

            var messageHTML = message.replace(/\n/g, '<br>');

            overlay.innerHTML =
                '<div class="' + borderClass + '">' +
                    '<div class="gd-header">' +
                        '<div class="gd-header-line"></div>' +
                        '<div class="' + titleClass + '">' + titleIcon + ' ' + title + '</div>' +
                    '</div>' +
                    '<div class="gd-body">' +
                        '<div class="gd-message">' + messageHTML + '</div>' +
                    '</div>' +
                    '<div class="gd-footer gd-footer-center">' +
                        '<button class="gd-btn gd-btn-confirm" id="gdAlertOk">' + buttonText + '</button>' +
                    '</div>' +
                    '<div class="gd-corner gd-corner-tl"></div>' +
                    '<div class="gd-corner gd-corner-tr"></div>' +
                    '<div class="gd-corner gd-corner-bl"></div>' +
                    '<div class="gd-corner gd-corner-br"></div>' +
                '</div>';

            document.body.appendChild(overlay);

            requestAnimationFrame(function() {
                overlay.classList.add('gd-overlay-active');
            });

            function closeDialog() {
                overlay.classList.remove('gd-overlay-active');
                overlay.classList.add('gd-overlay-closing');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.remove();
                    resolve();
                }, 250);
            }

            overlay.querySelector('#gdAlertOk').onclick = function() { closeDialog(); };
            overlay.onclick = function(e) {
                if (e.target === overlay) closeDialog();
            };

            function handleKey(e) {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    document.removeEventListener('keydown', handleKey);
                    closeDialog();
                }
            }
            document.addEventListener('keydown', handleKey);
        });
    }

    return {
        confirm: confirm,
        alert: alert
    };
})();
console.log('[模块] game-dialog.js 加载完成');
