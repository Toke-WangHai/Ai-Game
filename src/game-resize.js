// 检测是否为移动设备
function isMobile() {
    return window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth < 1024);
}

// 窗口缩放适配 - 基于设置的最优比例统一缩放
function handleResize() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 移动端：不做JS缩放，完全依赖CSS响应式布局
    if (isMobile()) {
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.width = '';
            gameContainer.style.height = '';
            gameContainer.style.transform = 'none';
            gameContainer.style.marginTop = '0';
        }
        const charContent = document.querySelector('.character-content');
        if (charContent) charContent.style.zoom = '';
        const shopContent = document.querySelector('.shop-content');
        if (shopContent) shopContent.style.zoom = '';
        const blessedLandContent = document.querySelector('.blessed-land-content');
        if (blessedLandContent) blessedLandContent.style.zoom = '';
        const startContent = document.querySelector('.start-menu-content');
        if (startContent) startContent.style.transform = 'none';
        return;
    }

    // === 桌面端：原有缩放逻辑 ===
    let baseW = GameSettings.baseWidth;
    let baseH = GameSettings.baseHeight;

    // 自适应模式（0x0）：以窗口大小为基准，直接撑满
    const isAutoFit = (baseW === 0 && baseH === 0);

    // === 1. 游玩界面缩放 ===
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        if (isAutoFit) {
            gameContainer.style.width = (windowWidth - 40) + 'px';
            gameContainer.style.height = (windowHeight - 40) + 'px';
            gameContainer.style.transform = 'none';
            gameContainer.style.marginTop = '20px';
        } else {
            gameContainer.style.width = baseW + 'px';
            gameContainer.style.height = baseH + 'px';
            const scaleX = (windowWidth - 40) / baseW;
            const scaleY = (windowHeight - 40) / baseH;
            const gameScale = Math.min(scaleX, scaleY, 1.5);
            gameContainer.style.transform = 'scale(' + gameScale + ')';
            gameContainer.style.transformOrigin = 'top center';
            gameContainer.style.marginTop = Math.max(10, (windowHeight - baseH * gameScale) / 2) + 'px';
        }
    }

    // === 2. 人物页面缩放（使用zoom）===
    const charContent = document.querySelector('.character-content');
    if (charContent) {
        const charBaseWidth = 1400;
        const charScale = Math.min((windowWidth - 20) / charBaseWidth, 1);
        charContent.style.zoom = charScale;
    }

    // === 2.5 商店页面缩放 ===
    const shopContent = document.querySelector('.shop-content');
    if (shopContent) {
        const shopBaseWidth = 1000;
        const shopScale = Math.min((windowWidth - 20) / shopBaseWidth, 1);
        shopContent.style.zoom = shopScale;
    }

    // === 2.6 福地页面缩放 ===
    const blessedLandContent = document.querySelector('.blessed-land-content');
    if (blessedLandContent) {
        const blBaseWidth = 1100;
        const blScale = Math.min((windowWidth - 20) / blBaseWidth, 1);
        blessedLandContent.style.zoom = blScale;
    }

    // === 3. 开始菜单缩放 ===
    const startContent = document.querySelector('.start-menu-content');
    if (startContent) {
        const menuBaseWidth = 500;
        const menuBaseHeight = 600;
        const menuScaleX = (windowWidth - 60) / menuBaseWidth;
        const menuScaleY = (windowHeight - 60) / menuBaseHeight;
        const menuScale = Math.min(menuScaleX, menuScaleY, 1.2);
        startContent.style.transform = 'scale(' + menuScale + ')';
    }
}
window.addEventListener('resize', handleResize);
window.addEventListener('load', handleResize);

// 注册 Service Worker（PWA离线支持）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').then(function(reg) {
            console.log('[PWA] Service Worker 注册成功:', reg.scope);
        }).catch(function(err) {
            console.log('[PWA] Service Worker 注册失败:', err);
        });
    });
}
