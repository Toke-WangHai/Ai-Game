        const GameClock = (function() {
            let timer = null;
            let seconds = 60;
            let isPaused = false;
            let events = null;
            let equipments = null;
            let lastTickTime = 0; // 上次tick的真实时间戳
            let pausedAt = 0;    // 暂停时的时间戳（用于恢复时补偿）

            function start(eventsData, equipmentsData) {
                events = eventsData;
                equipments = equipmentsData;
                seconds = 60;
                isPaused = false;
                lastTickTime = Date.now();

                // 显示时钟、跳过按钮、人物按钮、秘境按钮和菜单按钮，隐藏下一岁按钮
                document.getElementById('next').style.display = 'inline-flex';
                document.getElementById('nextBtn').style.display = 'none';
                document.getElementById('skip').style.display = 'inline-block';
                document.getElementById('character').style.display = 'inline-block';
                document.getElementById('dungeonBtn').style.display = 'inline-block';
                document.getElementById('shopBtn').style.display = 'inline-block';
                document.getElementById('blessedLandBtn').style.display = 'inline-block';
                document.getElementById('menuBtn').style.display = 'inline-block';

                // 更新时钟显示
                updateClockDisplay();

                // 启动商店后台倒计时（独立于商店页面的开关）
                if (typeof ShopSystem !== 'undefined') {
                    var shopSlots = ShopSystem.getCurrentSlots();
                    var allEmpty = shopSlots.every(function(s) { return s === null; });
                    if (allEmpty) ShopSystem.refreshShop();
                    ShopSystem.startTimer();
                }

                // 启动福地后台定时器
                if (typeof BlessedLand !== 'undefined') {
                    if (!BlessedLand.isTimerRunning()) {
                        BlessedLand.startTimers();
                    }
                }

                // 启动炼丹后台定时器
                if (typeof AlchemySystem !== 'undefined') {
                    if (!AlchemySystem.isTimerRunning()) {
                        AlchemySystem.startTimer();
                    }
                }

                // 启动计时器（200ms检测一次，用时间戳算实际流逝秒数）
                timer = setInterval(tick, 200);
            }

            function stop() {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                seconds = 60;
                isPaused = false;
                lastTickTime = 0;

                // 停止商店后台倒计时
                if (typeof ShopSystem !== 'undefined') {
                    ShopSystem.stopTimer();
                    ShopSystem.setRefreshCallback(null);
                }

                // 停止福地后台定时器
                if (typeof BlessedLand !== 'undefined') {
                    BlessedLand.stopTimers();
                    BlessedLand.setUpdateCallback(null);
                }

                // 停止炼丹后台定时器
                if (typeof AlchemySystem !== 'undefined') {
                    AlchemySystem.stopTimer();
                    AlchemySystem.setUpdateCallback(null);
                }

                // 隐藏时钟和所有功能按钮
                document.getElementById('next').style.display = 'none';
                document.getElementById('skip').style.display = 'none';
                document.getElementById('character').style.display = 'none';
                document.getElementById('dungeonBtn').style.display = 'none';
                document.getElementById('shopBtn').style.display = 'none';
                document.getElementById('blessedLandBtn').style.display = 'none';
                document.getElementById('menuBtn').style.display = 'none';
                // 只在玩家存活时显示nextBtn（死亡时不应显示任何操作按钮）
                if (typeof GameLogic !== 'undefined' && GameLogic.isAlive()) {
                    document.getElementById('nextBtn').style.display = 'inline-block';
                } else {
                    document.getElementById('nextBtn').style.display = 'none';
                }
            }

            /**
             * 暂停时钟（保留倒计时秒数，不重置）
             * 用于打开游戏菜单时
             */
            function pause() {
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                isPaused = true;
                pausedAt = Date.now();
            }

            function toggle() {
                if (!timer) return;
                
                isPaused = !isPaused;
                const clock = document.getElementById('next');
                
                if (isPaused) {
                    pausedAt = Date.now();
                    clock.classList.add('paused');
                    clock.querySelector('.clock-label').textContent = '已暂停';
                } else {
                    // 恢复时补偿暂停时间，使lastTickTime跳过暂停期
                    if (pausedAt > 0) {
                        lastTickTime += (Date.now() - pausedAt);
                        pausedAt = 0;
                    }
                    clock.classList.remove('paused');
                    clock.querySelector('.clock-label').textContent = '秒后自动增长';
                }
            }

            function tick() {
                if (isPaused) return;
                
                var now = Date.now();
                var elapsed = Math.floor((now - lastTickTime) / 1000);
                if (elapsed <= 0) return;
                
                // 更新基准时间（保留余数精度）
                lastTickTime += elapsed * 1000;
                
                // 扣减经过的秒数，可能触发多个周期（后台补算）
                seconds -= elapsed;
                
                while (seconds <= 0 && GameLogic.isAlive()) {
                    // 触发下一岁
                    GameLogic.nextAge(events, equipments);
                    
                    if (GameLogic.isAlive()) {
                        seconds += 60; // 补回一个周期
                    } else {
                        // 死亡后由 checkDead 弹窗处理，这里只停止时钟
                        stop();
                        return;
                    }
                }
                
                updateClockDisplay();
            }

            function updateClockDisplay() {
                const clock = document.getElementById('next');
                if (clock) {
                    const timeElement = clock.querySelector('.clock-time');
                    const labelElement = clock.querySelector('.clock-label');

                    timeElement.textContent = Math.max(0, seconds);

                    if (seconds <= 10) {
                        timeElement.style.color = '#e74c3c';
                        labelElement.style.color = '#e74c3c';
                    } else {
                        timeElement.style.color = '#fff';
                        labelElement.style.color = '#aaa';
                    }
                }
            }

            function resetSeconds() {
                seconds = 60;
                lastTickTime = Date.now();
                updateClockDisplay();
            }

            /**
             * 恢复时钟（不重置倒计时秒数）
             * 用于从菜单返回游戏时保持当前剩余秒数
             */
            function resume(eventsData, equipmentsData) {
                events = eventsData;
                equipments = equipmentsData;
                isPaused = false;
                lastTickTime = Date.now();

                // 显示时钟、跳过按钮等UI（和start相同）
                document.getElementById('next').style.display = 'inline-flex';
                document.getElementById('nextBtn').style.display = 'none';
                document.getElementById('skip').style.display = 'inline-block';
                document.getElementById('character').style.display = 'inline-block';
                document.getElementById('dungeonBtn').style.display = 'inline-block';
                document.getElementById('shopBtn').style.display = 'inline-block';
                document.getElementById('blessedLandBtn').style.display = 'inline-block';
                document.getElementById('menuBtn').style.display = 'inline-block';

                // 不重置seconds，保持当前剩余秒数
                updateClockDisplay();

                // 启动商店后台倒计时
                if (typeof ShopSystem !== 'undefined') {
                    ShopSystem.startTimer();
                }

                // 启动福地后台定时器
                if (typeof BlessedLand !== 'undefined') {
                    if (!BlessedLand.isTimerRunning()) {
                        BlessedLand.startTimers();
                    }
                }

                // 启动炼丹后台定时器
                if (typeof AlchemySystem !== 'undefined') {
                    if (!AlchemySystem.isTimerRunning()) {
                        AlchemySystem.startTimer();
                    }
                }

                // 恢复计时器
                if (timer) clearInterval(timer);
                timer = setInterval(tick, 200);
            }

            /** 获取当前倒计时剩余秒数 */
            function getSeconds() {
                return seconds;
            }

            /** 设置倒计时剩余秒数（用于读档恢复） */
            function setSeconds(s) {
                seconds = Math.max(0, Math.min(60, s));
                updateClockDisplay();
            }

            /** 获取存档数据 */
            function getSaveData() {
                return { seconds: seconds };
            }

            /** 从存档恢复（在 start 之后调用） */
            function loadSaveData(data) {
                if (data && typeof data.seconds === 'number') {
                    seconds = Math.max(0, Math.min(60, data.seconds));
                    lastTickTime = Date.now(); // 重置基准时间，避免补算
                    updateClockDisplay();
                }
            }

            return {
                start: start,
                stop: stop,
                pause: pause,
                toggle: toggle,
                resetSeconds: resetSeconds,
                resume: resume,
                getSeconds: getSeconds,
                setSeconds: setSeconds,
                getSaveData: getSaveData,
                loadSaveData: loadSaveData
            };
        })();
