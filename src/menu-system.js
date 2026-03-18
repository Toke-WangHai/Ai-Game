// ===== 菜单系统模块（开始菜单 + 游戏内菜单 + 设置 + 存档）=====
var MenuSystem = (function() {
    var startMenu, mainMenu, saveMenu, deleteMenu, settingsMenu, gameContainer;
    var _events, _equipments, _baseAttr, _words;
    var autoSaveEnabled = false; // 自动保存默认关闭
    var _fromNewGame = false; // 标记是否从"开始新游戏"进入存档界面

    function setGameData(baseAttr, words, events, equipments) {
        _baseAttr = baseAttr;
        _words = words;
        _events = events;
        _equipments = equipments;
    }

    function showStartMenu() {
        startMenu.style.display = 'flex';
        gameContainer.style.display = 'none';
        showMainMenu();
    }

    function showMainMenu() {
        mainMenu.style.display = 'flex';
        saveMenu.style.display = 'none';
        deleteMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        _fromNewGame = false;
    }

    function showSettingsMenu() {
        mainMenu.style.display = 'none';
        saveMenu.style.display = 'none';
        deleteMenu.style.display = 'none';
        settingsMenu.style.display = 'flex';
        var toggle = document.getElementById('fullscreenToggle');
        if (document.fullscreenElement) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
        syncResolutionSelection();
        syncAudioSettings();
    }

    function showLoadMenu() {
        mainMenu.style.display = 'none';
        saveMenu.style.display = 'block';
        deleteMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        _fromNewGame = false;
        renderSaveSlots('load');
        // 隐藏"新游戏"按钮（从加载存档入口不需要）
        var newBtn = document.getElementById('newGameFromSave');
        if (newBtn) newBtn.style.display = 'none';
    }

    function showDeleteMenu() {
        mainMenu.style.display = 'none';
        saveMenu.style.display = 'none';
        deleteMenu.style.display = 'block';
        settingsMenu.style.display = 'none';
        renderSaveSlots('delete');
    }

    function renderSaveSlots(mode) {
        var containerId = mode === 'load' ? 'saveSlots' : 'deleteSlots';
        var container = document.getElementById(containerId);
        var saves = SaveManager.getAllSaves();

        container.innerHTML = '';
        saves.forEach(function(save) {
            var slot = document.createElement('div');
            slot.className = 'save-slot' + (save.age !== null ? ' has-save' : '');

            if (save.age !== null) {
                var saveDate = new Date(save.saveTime);
                var dateStr = saveDate.toLocaleString('zh-CN');

                slot.innerHTML =
                    '<div class="save-slot-title">' + save.playerName + '</div>' +
                    '<div class="save-slot-info">' +
                        '境界：' + save.level + '<br>' +
                        '年数：' + save.age + '<br>' +
                        '修为：' + save.xiuyi + '<br>' +
                        '存档时间：' + dateStr +
                    '</div>' +
                    '<button class="save-slot-delete" data-save-index="' + save.index + '">删除存档</button>';

                if (mode === 'load') {
                    slot.onclick = function(e) {
                        if (e.target.classList.contains('save-slot-delete')) return;
                        loadSave(save.index);
                    };
                } else {
                    slot.onclick = function() {
                        deleteSave(save.index, function() { renderSaveSlots(mode); });
                    };
                }

                var deleteBtn = slot.querySelector('.save-slot-delete');
                if (deleteBtn) {
                    deleteBtn.onclick = function(e) {
                        e.stopPropagation();
                        deleteSave(save.index, function() { renderSaveSlots(mode); });
                    };
                }
            } else {
                slot.innerHTML = '<div class="save-slot-empty">' + save.playerName + '<br>空存档</div>';
            }

            container.appendChild(slot);
        });
    }

    // 点击"开始新游戏"→ 打开存档界面（可读档或直接新游戏）
    function startNewGame() {
        console.log('开始新游戏 → 显示存档界面...');
        mainMenu.style.display = 'none';
        saveMenu.style.display = 'block';
        deleteMenu.style.display = 'none';
        settingsMenu.style.display = 'none';
        _fromNewGame = true;
        renderSaveSlots('load');
        // 显示"新游戏"按钮
        var newBtn = document.getElementById('newGameFromSave');
        if (newBtn) newBtn.style.display = '';
    }

    // 真正开始新游戏（进入词条选择）
    function doStartNewGame() {
        if (typeof AudioManager !== 'undefined') {
            AudioManager.activateAndPlay();
            AudioManager.playSfxClick();
        }
        startMenu.style.display = 'none';
        gameContainer.style.display = 'flex';
        GameLogic.init(_baseAttr, _words, _events);
        GameUI.showWordPanel();
        GameUI.updateStatus('请选择3个天赋词条', '#fff');
    }

    function loadSave(saveIndex) {
        var saveData = SaveManager.loadGame(saveIndex);
        if (saveData) {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.activateAndPlay();
            }
            startMenu.style.display = 'none';
            gameContainer.style.display = 'flex';
            GameLogic.loadFromSave(saveData, _baseAttr, _words, _events);

            // 只有玩家存活时才启动时钟；死亡存档由 loadFromSave 内部弹窗处理
            if (GameLogic.isAlive()) {
                GameClock.start(_events, _equipments);
                // 恢复时钟倒计时秒数（避免读档后重置为60秒）
                if (saveData.clockData && typeof GameClock.loadSaveData === 'function') {
                    GameClock.loadSaveData(saveData.clockData);
                }
                GameUI.updateStatus('', '#fff');
            }
        }
    }

    function deleteSave(saveIndex, callback) {
        GameDialog.confirm({
            title: '删除存档',
            message: '确定要删除 ' + (saveIndex + 1) + ' 号存档吗？\n此操作不可撤销！',
            confirmText: '确认删除',
            cancelText: '取消',
            type: 'danger'
        }).then(function(yes) {
            if (yes) {
                SaveManager.deleteSave(saveIndex);
                if (callback) callback();
            }
        });
    }

    function syncResolutionSelection() {
        var btns = document.querySelectorAll('.resolution-btn');
        btns.forEach(function(btn) {
            var w = parseInt(btn.dataset.width);
            var h = parseInt(btn.dataset.height);
            if (w === GameSettings.baseWidth && h === GameSettings.baseHeight) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    function syncAudioSettings() {
        if (typeof AudioManager === 'undefined') return;
        var s = AudioManager.getSettings();

        var bgmToggle = document.getElementById('bgmToggle');
        var sfxToggle = document.getElementById('sfxToggle');
        var bgmSlider = document.getElementById('bgmVolumeSlider');
        var sfxSlider = document.getElementById('sfxVolumeSlider');
        var masterSlider = document.getElementById('masterVolumeSlider');
        var bgmVal = document.getElementById('bgmVolumeValue');
        var sfxVal = document.getElementById('sfxVolumeValue');
        var masterVal = document.getElementById('masterVolumeValue');

        if (bgmToggle) {
            if (s.bgmEnabled) bgmToggle.classList.add('active');
            else bgmToggle.classList.remove('active');
        }
        if (sfxToggle) {
            if (s.sfxEnabled) sfxToggle.classList.add('active');
            else sfxToggle.classList.remove('active');
        }
        if (bgmSlider) { bgmSlider.value = Math.round(s.bgmVolume * 100); }
        if (sfxSlider) { sfxSlider.value = Math.round(s.sfxVolume * 100); }
        if (masterSlider) { masterSlider.value = Math.round(s.masterVolume * 100); }
        if (bgmVal) bgmVal.textContent = Math.round(s.bgmVolume * 100) + '%';
        if (sfxVal) sfxVal.textContent = Math.round(s.sfxVolume * 100) + '%';
        if (masterVal) masterVal.textContent = Math.round(s.masterVolume * 100) + '%';
    }

    function showGameMenu() {
        GameClock.pause();

        var overlay = document.createElement('div');
        overlay.className = 'game-menu-overlay';
        overlay.id = 'gameMenuOverlay';

        var audioSettings = (typeof AudioManager !== 'undefined') ? AudioManager.getSettings() : { bgmEnabled: false, sfxEnabled: false };

        overlay.innerHTML =
            '<div class="game-menu-panel">' +
                '<div class="game-menu-title">⚙ 游戏菜单</div>' +
                '<div class="game-menu-buttons">' +
                    '<button class="game-menu-btn game-menu-btn-save" id="gameMenuSave">💾 保存游戏</button>' +
                    '<button class="game-menu-btn game-menu-btn-load" id="gameMenuLoad">📂 读取存档</button>' +
                    '<button class="game-menu-btn game-menu-btn-delete" id="gameMenuDelete">🗑️ 删除存档</button>' +
                    '<div class="game-menu-toggle-row" id="autoSaveToggleRow">' +
                        '<span class="game-menu-toggle-label">🔄 自动保存</span>' +
                        '<div class="game-menu-toggle' + (autoSaveEnabled ? ' active' : '') + '" id="autoSaveToggle">' +
                            '<div class="game-menu-toggle-knob"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="game-menu-toggle-row">' +
                        '<span class="game-menu-toggle-label">🎵 背景音乐</span>' +
                        '<div class="game-menu-toggle' + (audioSettings.bgmEnabled ? ' active' : '') + '" id="gameMenuBgmToggle">' +
                            '<div class="game-menu-toggle-knob"></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="game-menu-toggle-row">' +
                        '<span class="game-menu-toggle-label">🔊 音效</span>' +
                        '<div class="game-menu-toggle' + (audioSettings.sfxEnabled ? ' active' : '') + '" id="gameMenuSfxToggle">' +
                            '<div class="game-menu-toggle-knob"></div>' +
                        '</div>' +
                    '</div>' +
                    '<button class="game-menu-btn game-menu-btn-return" id="gameMenuReturn">🚪 返回主菜单</button>' +
                    '<button class="game-menu-btn game-menu-btn-close" id="gameMenuClose">继续游戏</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        document.getElementById('gameMenuClose').onclick = function() {
            overlay.remove();
            GameClock.resume(_events, _equipments);
        };

        document.getElementById('gameMenuSave').onclick = function() {
            showGameMenuSaveSlots(overlay, 'save');
        };

        document.getElementById('gameMenuLoad').onclick = function() {
            showGameMenuSaveSlots(overlay, 'load');
        };

        document.getElementById('gameMenuDelete').onclick = function() {
            showGameMenuSaveSlots(overlay, 'delete');
        };

        // 自动保存开关
        document.getElementById('autoSaveToggle').onclick = function() {
            autoSaveEnabled = !autoSaveEnabled;
            var toggleEl = document.getElementById('autoSaveToggle');
            if (autoSaveEnabled) {
                toggleEl.classList.add('active');
            } else {
                toggleEl.classList.remove('active');
            }
            // 保存设置到 localStorage
            try { localStorage.setItem('cultivation_autoSave', autoSaveEnabled ? '1' : '0'); } catch(e) {}
        };

        // 游戏内菜单BGM开关
        var gameMenuBgmToggle = document.getElementById('gameMenuBgmToggle');
        if (gameMenuBgmToggle && typeof AudioManager !== 'undefined') {
            gameMenuBgmToggle.onclick = function() {
                var s = AudioManager.getSettings();
                var newState = !s.bgmEnabled;
                AudioManager.toggleBGM(newState);
                if (newState) gameMenuBgmToggle.classList.add('active');
                else gameMenuBgmToggle.classList.remove('active');
            };
        }

        // 游戏内菜单音效开关
        var gameMenuSfxToggle = document.getElementById('gameMenuSfxToggle');
        if (gameMenuSfxToggle && typeof AudioManager !== 'undefined') {
            gameMenuSfxToggle.onclick = function() {
                var s = AudioManager.getSettings();
                var newState = !s.sfxEnabled;
                AudioManager.toggleSFX(newState);
                if (newState) gameMenuSfxToggle.classList.add('active');
                else gameMenuSfxToggle.classList.remove('active');
            };
        }

        document.getElementById('gameMenuReturn').onclick = function() {
            GameDialog.confirm({
                title: '返回主菜单',
                message: '确定要返回主菜单吗？\n未保存的进度将丢失。',
                confirmText: '确认返回',
                cancelText: '继续游戏',
                type: 'warning'
            }).then(function(yes) {
                if (yes) {
                    overlay.remove();
                    DungeonSystem.stopExploring();
                    DungeonUI.closeDungeonPage();
                    ShopUI.closeShopPage();
                    BlessedLandUI.closeBlessedLandPage();
                    if (typeof AlchemyUI !== 'undefined') AlchemyUI.closeAlchemyPage();
                    if (typeof TribulationUI !== 'undefined') TribulationUI.closeTribulationPage();
                    showStartMenu();
                    GameClock.stop();
                }
            });
        };
    }

    function showGameMenuSaveSlots(overlay, mode) {
        var panel = overlay.querySelector('.game-menu-panel');
        var saves = SaveManager.getAllSaves();

        var titleMap = { save: '💾 选择存档位置', load: '📂 选择要读取的存档', 'delete': '🗑️ 选择要删除的存档' };
        var slotsHTML = '<div class="game-menu-title">' + (titleMap[mode] || '') + '</div>' +
            '<div class="game-menu-save-slots">';

        saves.forEach(function(save) {
            if (save.age !== null) {
                var saveDate = new Date(save.saveTime);
                var dateStr = saveDate.toLocaleString('zh-CN');
                slotsHTML += '<div class="game-menu-save-slot has-save" data-index="' + save.index + '">' +
                    '<div class="save-slot-title">' + save.playerName + '</div>' +
                    '<div class="save-slot-info">' +
                        '境界：' + save.level + '<br>' +
                        '年数：' + save.age + '<br>' +
                        '修为：' + save.xiuyi + '<br>' +
                        dateStr +
                    '</div>' +
                    (mode === 'delete' ? '<button class="save-slot-delete" data-index="' + save.index + '">删除</button>' : '') +
                    '</div>';
            } else {
                slotsHTML += '<div class="game-menu-save-slot" data-index="' + save.index + '">' +
                    '<div class="save-slot-empty">' + save.playerName + '<br>空存档</div>' +
                    '</div>';
            }
        });

        slotsHTML += '</div>' +
            '<div style="text-align:center;margin-top:15px">' +
                '<button class="game-menu-btn game-menu-btn-close" id="gameMenuSlotsBack" style="max-width:200px">返回</button>' +
            '</div>';

        panel.innerHTML = slotsHTML;

        document.getElementById('gameMenuSlotsBack').onclick = function() {
            overlay.remove();
            showGameMenu();
        };

        if (mode === 'save') {
            var slots = panel.querySelectorAll('.game-menu-save-slot');
            slots.forEach(function(slot) {
                slot.onclick = function() {
                    var saveIndex = parseInt(slot.getAttribute('data-index'));
                    if (SaveManager.saveExists(saveIndex)) {
                        GameDialog.confirm({
                            title: '覆盖存档',
                            message: '存档 ' + (saveIndex + 1) + ' 已存在，确定要覆盖吗？',
                            confirmText: '确认覆盖',
                            cancelText: '取消',
                            type: 'warning'
                        }).then(function(yes) {
                            if (yes) {
                                var result = GameLogic.manualSave(saveIndex);
                                if (result) {
                                    GameDialog.alert({ title: '保存成功', message: '游戏已保存', type: 'success' });
                                    showGameMenuSaveSlots(overlay, 'save');
                                }
                            }
                        });
                    } else {
                        var result = GameLogic.manualSave(saveIndex);
                        if (result) {
                            GameDialog.alert({ title: '保存成功', message: '游戏已保存', type: 'success' });
                            showGameMenuSaveSlots(overlay, 'save');
                        }
                    }
                };
            });
        } else if (mode === 'load') {
            // 读取存档模式
            var loadSlots = panel.querySelectorAll('.game-menu-save-slot.has-save');
            loadSlots.forEach(function(slot) {
                slot.onclick = function() {
                    var saveIndex = parseInt(slot.getAttribute('data-index'));
                    GameDialog.confirm({
                        title: '读取存档',
                        message: '确定要读取存档 ' + (saveIndex + 1) + ' 吗？\n当前未保存的进度将丢失。',
                        confirmText: '确认读取',
                        cancelText: '取消',
                        type: 'warning'
                    }).then(function(yes) {
                        if (yes) {
                            overlay.remove();
                            // 停止当前时钟和系统
                            GameClock.stop();
                            DungeonSystem.stopExploring();
                            DungeonUI.closeDungeonPage();
                            ShopUI.closeShopPage();
                            BlessedLandUI.closeBlessedLandPage();
                            if (typeof AlchemyUI !== 'undefined') AlchemyUI.closeAlchemyPage();
                            if (typeof TribulationUI !== 'undefined') TribulationUI.closeTribulationPage();
                            // 加载存档
                            loadSave(saveIndex);
                        }
                    });
                };
            });
        } else {
            var deleteButtons = panel.querySelectorAll('.save-slot-delete');
            deleteButtons.forEach(function(btn) {
                btn.onclick = function(e) {
                    e.stopPropagation();
                    var saveIndex = parseInt(btn.getAttribute('data-index'));
                    GameDialog.confirm({
                        title: '删除存档',
                        message: '确定要删除存档 ' + (saveIndex + 1) + ' 吗？\n此操作不可撤销！',
                        confirmText: '确认删除',
                        cancelText: '取消',
                        type: 'danger'
                    }).then(function(yes) {
                        if (yes) {
                            SaveManager.deleteSave(saveIndex);
                            showGameMenuSaveSlots(overlay, 'delete');
                        }
                    });
                };
            });
        }
    }

    function init() {
        startMenu = document.getElementById('startMenu');
        mainMenu = document.getElementById('mainMenu');
        saveMenu = document.getElementById('saveMenu');
        deleteMenu = document.getElementById('deleteMenu');
        settingsMenu = document.getElementById('settingsMenu');
        gameContainer = document.querySelector('.game-container');

        // 读取自动保存设置（默认关闭）
        try {
            var savedAutoSave = localStorage.getItem('cultivation_autoSave');
            autoSaveEnabled = savedAutoSave === '1';
        } catch(e) { autoSaveEnabled = false; }

        // 主菜单按钮
        var newGameBtn = document.getElementById('newGameBtn');
        var loadGameBtn = document.getElementById('loadGameBtn');
        var settingsBtn = document.getElementById('settingsBtn');

        if (newGameBtn) newGameBtn.onclick = startNewGame;
        if (loadGameBtn) loadGameBtn.onclick = showLoadMenu;
        if (settingsBtn) settingsBtn.onclick = showSettingsMenu;

        // 返回按钮
        document.getElementById('backFromSave').onclick = showMainMenu;
        document.getElementById('backFromDelete').onclick = showMainMenu;
        document.getElementById('backFromSettings').onclick = showMainMenu;

        // 存档界面的"新游戏"按钮
        var newGameFromSave = document.getElementById('newGameFromSave');
        if (newGameFromSave) {
            newGameFromSave.onclick = function() {
                _fromNewGame = false;
                doStartNewGame();
            };
        }

        // 全屏切换
        var fullscreenToggle = document.getElementById('fullscreenToggle');
        fullscreenToggle.onclick = function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(function() {
                    fullscreenToggle.classList.add('active');
                    saveGameSettings();
                    setTimeout(handleResize, 100);
                }).catch(function(err) {
                    console.log('全屏切换失败:', err);
                });
            } else {
                document.exitFullscreen().then(function() {
                    fullscreenToggle.classList.remove('active');
                    saveGameSettings();
                    setTimeout(handleResize, 100);
                });
            }
        };

        document.addEventListener('fullscreenchange', function() {
            var toggle = document.getElementById('fullscreenToggle');
            if (document.fullscreenElement) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
            setTimeout(handleResize, 100);
        });

        // 分辨率选择
        var resolutionBtns = document.querySelectorAll('.resolution-btn');
        resolutionBtns.forEach(function(btn) {
            btn.onclick = function() {
                resolutionBtns.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                var w = parseInt(btn.dataset.width);
                var h = parseInt(btn.dataset.height);
                GameSettings.baseWidth = w;
                GameSettings.baseHeight = h;
                saveGameSettings();
                handleResize();
            };
        });

        // 音频控制绑定
        if (typeof AudioManager !== 'undefined') {
            // BGM开关
            var bgmToggle = document.getElementById('bgmToggle');
            if (bgmToggle) {
                bgmToggle.onclick = function() {
                    var s = AudioManager.getSettings();
                    var newState = !s.bgmEnabled;
                    AudioManager.toggleBGM(newState);
                    if (newState) bgmToggle.classList.add('active');
                    else bgmToggle.classList.remove('active');
                };
            }

            // 音效开关
            var sfxToggle = document.getElementById('sfxToggle');
            if (sfxToggle) {
                sfxToggle.onclick = function() {
                    var s = AudioManager.getSettings();
                    var newState = !s.sfxEnabled;
                    AudioManager.toggleSFX(newState);
                    if (newState) sfxToggle.classList.add('active');
                    else sfxToggle.classList.remove('active');
                };
            }

            // BGM音量滑块
            var bgmSlider = document.getElementById('bgmVolumeSlider');
            var bgmValLabel = document.getElementById('bgmVolumeValue');
            if (bgmSlider) {
                bgmSlider.oninput = function() {
                    var val = parseInt(bgmSlider.value);
                    AudioManager.setBgmVolume(val / 100);
                    if (bgmValLabel) bgmValLabel.textContent = val + '%';
                };
            }

            // 音效音量滑块
            var sfxSlider = document.getElementById('sfxVolumeSlider');
            var sfxValLabel = document.getElementById('sfxVolumeValue');
            if (sfxSlider) {
                sfxSlider.oninput = function() {
                    var val = parseInt(sfxSlider.value);
                    AudioManager.setSfxVolume(val / 100);
                    if (sfxValLabel) sfxValLabel.textContent = val + '%';
                };
            }

            // 主音量滑块
            var masterSlider = document.getElementById('masterVolumeSlider');
            var masterValLabel = document.getElementById('masterVolumeValue');
            if (masterSlider) {
                masterSlider.oninput = function() {
                    var val = parseInt(masterSlider.value);
                    AudioManager.setMasterVolume(val / 100);
                    if (masterValLabel) masterValLabel.textContent = val + '%';
                };
            }
        }

        // 游戏内菜单按钮
        var menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
            menuBtn.onclick = function() { showGameMenu(); };
        }
    }

    return {
        init: init,
        setGameData: setGameData,
        showStartMenu: showStartMenu,
        showGameMenu: showGameMenu,
        isAutoSaveEnabled: function() { return autoSaveEnabled; }
    };
})();
console.log('[模块] menu-system.js 加载完成');
