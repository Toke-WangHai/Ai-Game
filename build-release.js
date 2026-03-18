// build-release.js - 创建电脑版(EXE)发布版本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const VERSION = '1.3.3';

// 运行时需要的JS文件列表（按index.html加载顺序）
const JS_FILES = [
    'resource-manager.js',
    'data-processor.js', 'data.js',
    'equipment.js', 'attribute-calculator.js',
    'damage-calculator.js', 'level-calculator.js', 'ui.js', 'battle-system.js',
    'dungeon.js', 'item-system.js', 'shop-system.js', 'blessed-land.js',
    'storage-system.js',
    'dungeon-ui.js', 'save-manager.js', 'game.js', 'equipment-manager.js',
    'quantity-dialog.js',
    'game-dialog.js', 'game-settings.js', 'game-clock.js', 'game-resize.js',
    'shop-ui.js', 'blessed-land-ui.js', 'backpack-ui.js',
    'storage-ui.js',
    'alchemy-system.js', 'pill-system.js', 'breakthrough-system.js', 'alchemy-ui.js',
    'tribulation-ui.js', 'audio-manager.js',
    'menu-system.js', 'game-init.js', 'particles.js'
];

function mkdirSafe(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        return true;
    }
    return false;
}

function copyDirRecursive(src, dest) {
    mkdirSafe(dest);
    if (!fs.existsSync(src)) return 0;
    let count = 0;
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            count += copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            count++;
        }
    }
    return count;
}

function rmDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function getDirSize(dir) {
    let total = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            total += getDirSize(fullPath);
        } else {
            total += fs.statSync(fullPath).size;
        }
    }
    return total;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function countFiles(dir) {
    let count = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            count += countFiles(path.join(dir, entry.name));
        } else {
            count++;
        }
    }
    return count;
}

function buildWebVersion(name, extraFiles) {
    const dist = path.join(ROOT, name);
    
    console.log('\n' + '='.repeat(40));
    console.log('  创建 ' + name);
    console.log('='.repeat(40));
    
    // 清理旧版本
    rmDir(dist);
    mkdirSafe(path.join(dist, 'src'));
    
    // 1. 复制核心文件
    copyFile(path.join(ROOT, 'index.html'), path.join(dist, 'index.html'));
    copyFile(path.join(ROOT, 'style.css'), path.join(dist, 'style.css'));
    console.log('  ✓ index.html, style.css');
    
    // 2. 复制额外文件（如PWA文件）
    for (const f of extraFiles) {
        if (copyFile(path.join(ROOT, f), path.join(dist, f))) {
            console.log('  ✓ ' + f);
        }
    }
    
    // 3. 复制JS文件
    let jsCount = 0;
    for (const jsFile of JS_FILES) {
        const src = path.join(ROOT, 'src', jsFile);
        const dest = path.join(dist, 'src', jsFile);
        if (copyFile(src, dest)) {
            jsCount++;
        } else {
            console.log('  ✗ 缺少: src/' + jsFile);
        }
    }
    console.log('  ✓ src/ (' + jsCount + '个JS文件)');
    
    // 4. 复制资源文件
    let assetCount = 0;
    assetCount += copyDirRecursive(
        path.join(ROOT, 'assets', 'icons'),
        path.join(dist, 'assets', 'icons')
    );
    if (copyFile(path.join(ROOT, 'assets', 'icon-192.png'), path.join(dist, 'assets', 'icon-192.png'))) assetCount++;
    if (copyFile(path.join(ROOT, 'assets', 'icon-512.png'), path.join(dist, 'assets', 'icon-512.png'))) assetCount++;
    console.log('  ✓ assets/ (' + assetCount + '个资源文件)');
    
    return dist;
}

// ===== 开始构建 =====
console.log('========================================');
console.log('   修仙重生模拟器 - 创建发布版本 v' + VERSION);
console.log('========================================');

// ============================================
// [1] EXE 电脑版 - Electron 打包
// ============================================
console.log('\n' + '='.repeat(40));
console.log('  创建 EXE 电脑版 (Electron)');
console.log('='.repeat(40));

const exeDistDir = path.join(ROOT, 'dist');
const exeUnpackedDir = path.join(exeDistDir, 'win-unpacked');

try {
    // 检查 electron-builder 是否可用
    console.log('  检查 electron-builder ...');
    execSync('npx electron-builder --version', { cwd: ROOT, stdio: 'pipe' });
    
    // 清理旧的 dist
    rmDir(exeDistDir);
    
    // 执行 electron-builder 打包（dir 模式，不需要 NSIS）
    console.log('  正在打包 Electron 应用 (这可能需要1-2分钟)...');
    execSync('npx electron-builder --win dir --x64', { 
        cwd: ROOT, 
        stdio: 'inherit',
        timeout: 300000 // 5分钟超时
    });
    
    // 检查打包结果
    const exePath = path.join(exeUnpackedDir, '修仙重生模拟器.exe');
    if (fs.existsSync(exePath)) {
        const exeSize = fs.statSync(exePath).size;
        console.log('  ✓ 修仙重生模拟器.exe (' + formatSize(exeSize) + ')');
    } else {
        console.log('  ✗ EXE 打包失败：未找到输出文件');
    }
} catch (e) {
    console.log('  ✗ EXE 打包失败: ' + e.message);
    console.log('  提示: 请确保已安装 electron 和 electron-builder');
    console.log('    npm install --save-dev electron electron-builder');
}

// ============================================
// [2] 网页电脑版 - 不需要PWA文件
// ============================================
const pcDist = buildWebVersion('dist-pc', []);

// 创建启动脚本
fs.writeFileSync(path.join(pcDist, '启动游戏.bat'), 
    '@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\necho 正在启动修仙重生模拟器...\r\nstart "" "index.html"\r\n',
    'utf-8');
console.log('  ✓ 启动游戏.bat');

// 创建电脑版使用说明
fs.writeFileSync(path.join(pcDist, '使用说明.txt'), 
'修仙重生模拟器 v' + VERSION + ' - 网页电脑版\r\n' +
'==================================\r\n\r\n' +
'【如何开始游戏】\r\n' +
'  方法1：双击 "启动游戏.bat" 文件\r\n' +
'  方法2：直接双击 index.html 文件\r\n' +
'  推荐使用 Chrome 或 Edge 浏览器打开\r\n\r\n' +
'【注意事项】\r\n' +
'  1. 请勿修改文件夹中的任何文件\r\n' +
'  2. 游戏存档保存在浏览器 localStorage 中\r\n' +
'  3. 更换浏览器或清除缓存会丢失存档\r\n',
'utf-8');
console.log('  ✓ 使用说明.txt');

// ===== 汇总报告 =====
console.log('\n========================================');
console.log('        全部发布版本创建完成！');
console.log('========================================\n');

// EXE 版本
if (fs.existsSync(exeUnpackedDir)) {
    const dirSize = getDirSize(exeUnpackedDir);
    console.log('  🖥️  EXE电脑版:  dist/win-unpacked/');
    console.log('     修仙重生模拟器.exe (' + formatSize(dirSize) + ')');
    console.log('     → 直接运行 修仙重生模拟器.exe 即可游玩');
    console.log('     → 独立运行，无需安装浏览器\n');
}

const pcSize = getDirSize(pcDist);
const pcCount = countFiles(pcDist);
console.log('  📁 网页电脑版: dist-pc/');
console.log('     ' + pcCount + ' 个文件, 总计 ' + formatSize(pcSize));
console.log('     → 双击 "启动游戏.bat" 即可游玩');
console.log('     → 压缩成zip发送给朋友\n');

console.log('========================================');
