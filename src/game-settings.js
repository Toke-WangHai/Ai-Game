// === 游戏设置模块（必须在DOMContentLoaded之前定义）===
const GameSettings = {
    baseWidth: 1100,
    baseHeight: 750,
    isFullscreen: false,

    load: function() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                const data = JSON.parse(saved);
                this.baseWidth = data.baseWidth !== undefined ? data.baseWidth : 1100;
                this.baseHeight = data.baseHeight !== undefined ? data.baseHeight : 750;
                this.isFullscreen = data.isFullscreen || false;
            }
        } catch (e) {
            console.log('加载设置失败:', e);
        }
    }
};

function saveGameSettings() {
    try {
        localStorage.setItem('gameSettings', JSON.stringify({
            baseWidth: GameSettings.baseWidth,
            baseHeight: GameSettings.baseHeight,
            isFullscreen: !!document.fullscreenElement
        }));
    } catch (e) {
        console.log('保存设置失败:', e);
    }
}

// 加载已保存的设置
GameSettings.load();

// 如果设置了全屏，页面加载时在首次用户交互时进入全屏
if (GameSettings.isFullscreen) {
    document.addEventListener('click', function enterFullscreen() {
        if (!document.fullscreenElement && GameSettings.isFullscreen) {
            document.documentElement.requestFullscreen().catch(function() {});
        }
        document.removeEventListener('click', enterFullscreen);
    }, { once: true });
}
