// ===== 音频管理模块（Web Audio API 程序化合成）=====
var AudioManager = (function() {
    var audioCtx = null;
    var masterGain = null;
    var bgmGain = null;
    var sfxGain = null;

    // 音量设置（0-1）
    var settings = {
        masterVolume: 0.5,
        bgmVolume: 0.6,
        sfxVolume: 0.7,
        bgmEnabled: true,
        sfxEnabled: true
    };

    // BGM 状态
    var bgmPlaying = false;
    var bgmTimer = null;
    var bgmNodes = []; // 正在播放的BGM音频节点

    // 五声音阶频率（C大调宫商角徵羽 - 东方风格）
    var PENTATONIC = {
        C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
        C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.00,
        C3: 130.81, G3: 196.00, A3: 220.00, E3: 164.81, D3: 146.83
    };

    // BGM旋律序列（修仙风格，悠远空灵）
    var BGM_MELODIES = [
        // 旋律1：悠远主题
        [
            { note: 'E4', dur: 0.8 }, { note: 'G4', dur: 0.6 }, { note: 'A4', dur: 1.0 },
            { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.8 }, { note: 'D4', dur: 1.2 },
            { note: null, dur: 0.4 },
            { note: 'C4', dur: 0.6 }, { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.8 },
            { note: 'G4', dur: 1.0 }, { note: 'E4', dur: 0.6 }, { note: 'C4', dur: 1.5 },
            { note: null, dur: 0.6 }
        ],
        // 旋律2：空灵变奏
        [
            { note: 'A4', dur: 0.7 }, { note: 'G4', dur: 0.5 }, { note: 'E4', dur: 0.9 },
            { note: 'D4', dur: 0.6 }, { note: 'C4', dur: 1.2 },
            { note: null, dur: 0.3 },
            { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.7 }, { note: 'G4', dur: 0.8 },
            { note: 'A4', dur: 0.5 }, { note: 'C5', dur: 1.0 }, { note: 'A4', dur: 0.8 },
            { note: 'G4', dur: 1.5 },
            { note: null, dur: 0.5 }
        ],
        // 旋律3：高音段
        [
            { note: 'C5', dur: 0.6 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.8 },
            { note: 'E4', dur: 0.6 }, { note: 'G4', dur: 0.4 }, { note: 'A4', dur: 1.0 },
            { note: null, dur: 0.3 },
            { note: 'G4', dur: 0.6 }, { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 0.7 },
            { note: 'E4', dur: 0.8 }, { note: 'C4', dur: 1.5 },
            { note: null, dur: 0.8 }
        ]
    ];

    /**
     * 初始化 AudioContext（必须在用户交互后调用）
     */
    function initContext() {
        if (audioCtx) return true;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();

            // 主增益
            masterGain = audioCtx.createGain();
            masterGain.gain.value = settings.masterVolume;
            masterGain.connect(audioCtx.destination);

            // BGM 增益
            bgmGain = audioCtx.createGain();
            bgmGain.gain.value = settings.bgmEnabled ? settings.bgmVolume : 0;
            bgmGain.connect(masterGain);

            // 音效增益
            sfxGain = audioCtx.createGain();
            sfxGain.gain.value = settings.sfxEnabled ? settings.sfxVolume : 0;
            sfxGain.connect(masterGain);

            return true;
        } catch (e) {
            console.log('Web Audio API 不可用:', e);
            return false;
        }
    }

    /**
     * 确保 AudioContext 是 running 状态
     */
    function ensureRunning() {
        if (!audioCtx) return false;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(function() {
                console.log('[音频] AudioContext 已恢复 running');
                // 如果BGM应该播放但还没在播放，启动它
                if (settings.bgmEnabled && !bgmPlaying) {
                    startBGM();
                }
            });
        }
        return audioCtx.state === 'running';
    }

    // ===== 音符播放 =====

    /**
     * 播放单个音符（古琴风格 - 泛音合成）
     */
    function playNote(freq, startTime, duration, gainNode, volume) {
        if (!audioCtx || !freq) return;
        volume = volume || 0.35;

        // 基频振荡器 - 正弦波
        var osc1 = audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq;

        // 二次谐波 - 更丰富
        var osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;

        // 三次谐波 - 空灵感
        var osc3 = audioCtx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = freq * 3;

        // 各谐波增益（直接设置为1.0，音量完全由envelope控制）
        var g1 = audioCtx.createGain();
        var g2 = audioCtx.createGain();
        var g3 = audioCtx.createGain();

        // 包络
        var envelope = audioCtx.createGain();

        osc1.connect(g1); g1.connect(envelope);
        osc2.connect(g2); g2.connect(envelope);
        osc3.connect(g3); g3.connect(envelope);
        envelope.connect(gainNode);

        // 基频最大，谐波递减（相对比例）
        g1.gain.value = 1.0;
        g2.gain.value = 0.25;
        g3.gain.value = 0.08;

        // ADSR包络 - 古琴拨弦式
        var attackTime = 0.02;
        var decayTime = duration * 0.3;
        var sustainLevel = volume * 0.5;
        var releaseTime = duration * 0.4;

        envelope.gain.setValueAtTime(0.0001, startTime);
        envelope.gain.linearRampToValueAtTime(volume, startTime + attackTime);
        envelope.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
        envelope.gain.linearRampToValueAtTime(0.0001, startTime + duration + releaseTime * 0.5);

        osc1.start(startTime);
        osc2.start(startTime);
        osc3.start(startTime);

        var stopTime = startTime + duration + releaseTime;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        osc3.stop(stopTime);

        bgmNodes.push(osc1, osc2, osc3);
    }

    /**
     * 播放低音伴奏音（持续低频垫底）
     */
    function playBass(freq, startTime, duration, gainNode) {
        if (!audioCtx || !freq) return;
        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        var g = audioCtx.createGain();
        osc.connect(g);
        g.connect(gainNode);

        g.gain.setValueAtTime(0.0001, startTime);
        g.gain.linearRampToValueAtTime(0.12, startTime + 0.5);
        g.gain.setValueAtTime(0.12, startTime + duration - 0.5);
        g.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
        bgmNodes.push(osc);
    }

    /**
     * 播放环境氛围音（风声/流水）
     */
    function playAmbience(startTime, duration, gainNode) {
        if (!audioCtx) return;
        // 白噪声 + 低通滤波 = 风声
        var bufferSize = audioCtx.sampleRate * duration;
        var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        var noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;

        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.5;

        var g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, startTime);
        g.gain.linearRampToValueAtTime(0.04, startTime + 2);
        g.gain.setValueAtTime(0.04, startTime + duration - 2);
        g.gain.linearRampToValueAtTime(0.0001, startTime + duration);

        noise.connect(filter);
        filter.connect(g);
        g.connect(gainNode);

        noise.start(startTime);
        noise.stop(startTime + duration);
        bgmNodes.push(noise);
    }

    /**
     * 开始播放BGM（循环）
     */
    function startBGM() {
        if (!initContext()) return;
        if (bgmPlaying) return;
        if (!settings.bgmEnabled) return;

        bgmPlaying = true;
        console.log('[音频] 准备启动BGM, AudioContext状态:', audioCtx.state);

        if (audioCtx.state === 'suspended') {
            // 异步恢复后再调度
            audioCtx.resume().then(function() {
                console.log('[音频] AudioContext已恢复, 开始调度BGM');
                if (bgmPlaying) scheduleBGM();
            });
        } else {
            scheduleBGM();
        }
    }

    /**
     * 调度 BGM 播放（每段结束后调度下一段）
     */
    function scheduleBGM() {
        if (!bgmPlaying || !audioCtx) return;
        if (audioCtx.state !== 'running') {
            console.log('[音频] AudioContext不在running状态, 延迟调度BGM');
            // 延迟重试
            bgmTimer = setTimeout(function() { scheduleBGM(); }, 500);
            return;
        }

        console.log('[音频] 调度BGM旋律片段');
        var now = audioCtx.currentTime + 0.1;
        var melodyIndex = Math.floor(Math.random() * BGM_MELODIES.length);
        var melody = BGM_MELODIES[melodyIndex];

        // 计算旋律总时长
        var totalDur = 0;
        for (var i = 0; i < melody.length; i++) {
            totalDur += melody[i].dur;
        }

        // 播放旋律
        var t = now;
        for (var j = 0; j < melody.length; j++) {
            var n = melody[j];
            if (n.note && PENTATONIC[n.note]) {
                playNote(PENTATONIC[n.note], t, n.dur, bgmGain, 0.35);
            }
            t += n.dur;
        }

        // 低音伴奏
        var bassNotes = ['C3', 'G3', 'A3', 'E3'];
        var bassNote = bassNotes[Math.floor(Math.random() * bassNotes.length)];
        playBass(PENTATONIC[bassNote], now, totalDur, bgmGain);

        // 随机加入环境音
        if (Math.random() > 0.5) {
            playAmbience(now, totalDur, bgmGain);
        }

        // 旋律结束后的间隔（1.5~3秒）
        var gap = 1.5 + Math.random() * 1.5;
        var nextTime = (totalDur + gap) * 1000;

        bgmTimer = setTimeout(function() {
            scheduleBGM();
        }, nextTime);
    }

    /**
     * 停止BGM
     */
    function stopBGM() {
        bgmPlaying = false;
        if (bgmTimer) {
            clearTimeout(bgmTimer);
            bgmTimer = null;
        }
        // 停止所有BGM节点
        for (var i = 0; i < bgmNodes.length; i++) {
            try { bgmNodes[i].stop(); } catch(e) {}
        }
        bgmNodes = [];
    }

    // ===== 音效 =====

    /**
     * 播放按钮点击音效（清脆短促）
     */
    function playSfxClick() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

        var g = audioCtx.createGain();
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    /**
     * 播放成功音效（上行和弦）
     */
    function playSfxSuccess() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        var freqs = [523.25, 659.26, 783.99]; // C5, E5, G5 大三和弦
        for (var i = 0; i < freqs.length; i++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freqs[i];

            var g = audioCtx.createGain();
            var startT = now + i * 0.08;
            g.gain.setValueAtTime(0, startT);
            g.gain.linearRampToValueAtTime(0.12, startT + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);

            osc.connect(g);
            g.connect(sfxGain);
            osc.start(startT);
            osc.stop(startT + 0.5);
        }
    }

    /**
     * 播放失败音效（下行不和谐）
     */
    function playSfxFail() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        var freqs = [440, 370, 311]; // A4→降G4→降E4 下行
        for (var i = 0; i < freqs.length; i++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freqs[i];

            var g = audioCtx.createGain();
            var startT = now + i * 0.1;
            g.gain.setValueAtTime(0, startT);
            g.gain.linearRampToValueAtTime(0.10, startT + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);

            osc.connect(g);
            g.connect(sfxGain);
            osc.start(startT);
            osc.stop(startT + 0.4);
        }
    }

    /**
     * 播放突破音效（震撼雷声）
     */
    function playSfxBreakthrough() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;

        // 雷击声：白噪声 + 低通
        var bufferSize = audioCtx.sampleRate * 1.5;
        var noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        var data = noiseBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        var noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;

        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 1.0);

        var g = audioCtx.createGain();
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);
        noise.start(now);
        noise.stop(now + 1.5);

        // 低频冲击
        var osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

        var g2 = audioCtx.createGain();
        g2.gain.setValueAtTime(0.2, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(g2);
        g2.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.8);
    }

    /**
     * 播放装备音效（金属碰撞）
     */
    function playSfxEquip() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        var freqs = [2000, 3500, 5000];
        for (var i = 0; i < freqs.length; i++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freqs[i];

            var g = audioCtx.createGain();
            g.gain.setValueAtTime(0.06, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(g);
            g.connect(sfxGain);
            osc.start(now);
            osc.stop(now + 0.15);
        }
    }

    /**
     * 播放购买/获得物品音效（叮咚声）
     */
    function playSfxItem() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        // 双音叮咚
        var osc1 = audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 880;
        var g1 = audioCtx.createGain();
        g1.gain.setValueAtTime(0.12, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(g1);
        g1.connect(sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.2);

        var osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 1320;
        var g2 = audioCtx.createGain();
        g2.gain.setValueAtTime(0, now + 0.08);
        g2.gain.linearRampToValueAtTime(0.10, now + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(g2);
        g2.connect(sfxGain);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.3);
    }

    /**
     * 播放炼丹音效（火焰噼啪）
     */
    function playSfxAlchemy() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        // 多个短促噼啪
        for (var i = 0; i < 5; i++) {
            var t = now + i * 0.06 + Math.random() * 0.03;
            var osc = audioCtx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = 200 + Math.random() * 600;

            var g = audioCtx.createGain();
            g.gain.setValueAtTime(0.05 + Math.random() * 0.05, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.connect(g);
            g.connect(sfxGain);
            osc.start(t);
            osc.stop(t + 0.05);
        }

        // 低沉火焰声
        var oscFire = audioCtx.createOscillator();
        oscFire.type = 'sine';
        oscFire.frequency.value = 120;
        var gFire = audioCtx.createGain();
        gFire.gain.setValueAtTime(0.08, now);
        gFire.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        oscFire.connect(gFire);
        gFire.connect(sfxGain);
        oscFire.start(now);
        oscFire.stop(now + 0.5);
    }

    /**
     * 播放战斗/攻击音效
     */
    function playSfxBattle() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        // 金属碰撞 + 冲击
        var osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        var g = audioCtx.createGain();
        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * 播放升级音效（上行琶音）
     */
    function playSfxLevelUp() {
        if (!initContext() || !settings.sfxEnabled) return;
        ensureRunning();

        var now = audioCtx.currentTime;
        var freqs = [261.63, 329.63, 392, 523.25, 659.26, 783.99]; // C4到G5
        for (var i = 0; i < freqs.length; i++) {
            var osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freqs[i];

            var g = audioCtx.createGain();
            var t = now + i * 0.06;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.10, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(g);
            g.connect(sfxGain);
            osc.start(t);
            osc.stop(t + 0.4);
        }
    }

    // ===== 音量控制 =====

    function setMasterVolume(val) {
        settings.masterVolume = Math.max(0, Math.min(1, val));
        if (masterGain) masterGain.gain.value = settings.masterVolume;
        saveSettings();
    }

    function setBgmVolume(val) {
        settings.bgmVolume = Math.max(0, Math.min(1, val));
        if (bgmGain && settings.bgmEnabled) bgmGain.gain.value = settings.bgmVolume;
        saveSettings();
    }

    function setSfxVolume(val) {
        settings.sfxVolume = Math.max(0, Math.min(1, val));
        if (sfxGain && settings.sfxEnabled) sfxGain.gain.value = settings.sfxVolume;
        saveSettings();
    }

    function toggleBGM(enabled) {
        settings.bgmEnabled = enabled;
        if (bgmGain) {
            bgmGain.gain.value = enabled ? settings.bgmVolume : 0;
        }
        if (enabled && !bgmPlaying) {
            startBGM();
        } else if (!enabled && bgmPlaying) {
            stopBGM();
        }
        saveSettings();
    }

    function toggleSFX(enabled) {
        settings.sfxEnabled = enabled;
        if (sfxGain) {
            sfxGain.gain.value = enabled ? settings.sfxVolume : 0;
        }
        saveSettings();
    }

    // ===== 设置存储 =====

    function saveSettings() {
        try {
            localStorage.setItem('cultivation_audio', JSON.stringify(settings));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            var saved = localStorage.getItem('cultivation_audio');
            if (saved) {
                var data = JSON.parse(saved);
                settings.masterVolume = data.masterVolume !== undefined ? data.masterVolume : 0.5;
                settings.bgmVolume = data.bgmVolume !== undefined ? data.bgmVolume : 0.6;
                settings.sfxVolume = data.sfxVolume !== undefined ? data.sfxVolume : 0.7;
                settings.bgmEnabled = data.bgmEnabled !== undefined ? data.bgmEnabled : true;
                settings.sfxEnabled = data.sfxEnabled !== undefined ? data.sfxEnabled : true;
            }
        } catch (e) {}
    }

    function getSettings() {
        return {
            masterVolume: settings.masterVolume,
            bgmVolume: settings.bgmVolume,
            sfxVolume: settings.sfxVolume,
            bgmEnabled: settings.bgmEnabled,
            sfxEnabled: settings.sfxEnabled
        };
    }

    /**
     * 初始化（加载设置，不启动音频 — 需要用户交互）
     */
    function init() {
        loadSettings();
    }

    /**
     * 用户首次交互后调用：初始化 AudioContext 并启动 BGM
     */
    function activateAndPlay() {
        console.log('[音频] activateAndPlay 被调用');
        if (!initContext()) {
            console.log('[音频] initContext 失败');
            return;
        }

        // 应用已有设置
        if (masterGain) masterGain.gain.value = settings.masterVolume;
        if (bgmGain) bgmGain.gain.value = settings.bgmEnabled ? settings.bgmVolume : 0;
        if (sfxGain) sfxGain.gain.value = settings.sfxEnabled ? settings.sfxVolume : 0;

        console.log('[音频] 设置状态 - bgmEnabled:', settings.bgmEnabled, 'bgmPlaying:', bgmPlaying, 'ctx状态:', audioCtx.state);
        console.log('[音频] 音量 - master:', settings.masterVolume, 'bgm:', settings.bgmVolume);

        // 先确保 AudioContext 是 running
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(function() {
                console.log('[音频] resume成功, ctx状态:', audioCtx.state);
                if (settings.bgmEnabled && !bgmPlaying) {
                    startBGM();
                }
            });
        } else if (settings.bgmEnabled && !bgmPlaying) {
            startBGM();
        }
    }

    return {
        init: init,
        activateAndPlay: activateAndPlay,

        // BGM控制
        startBGM: startBGM,
        stopBGM: stopBGM,

        // 音效
        playSfxClick: playSfxClick,
        playSfxSuccess: playSfxSuccess,
        playSfxFail: playSfxFail,
        playSfxBreakthrough: playSfxBreakthrough,
        playSfxEquip: playSfxEquip,
        playSfxItem: playSfxItem,
        playSfxAlchemy: playSfxAlchemy,
        playSfxBattle: playSfxBattle,
        playSfxLevelUp: playSfxLevelUp,

        // 音量
        setMasterVolume: setMasterVolume,
        setBgmVolume: setBgmVolume,
        setSfxVolume: setSfxVolume,
        toggleBGM: toggleBGM,
        toggleSFX: toggleSFX,
        getSettings: getSettings
    };
})();
console.log('[模块] audio-manager.js 加载完成');
