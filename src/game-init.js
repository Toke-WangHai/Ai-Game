// ===== 游戏初始化入口 =====
document.addEventListener('DOMContentLoaded', function() {
    try {
        // 获取数据
        var baseAttr = GameData.getBaseAttr();
        var words = GameData.getWords();
        var events = GameData.getEvents();
        var equipments = GameData.getEquipments();
        var attributes = GameData.getAttributes();
        var levels = GameData.getLevels();
        var stages = GameData.getStages();
        var items = GameData.getItems();
        var drops = GameData.getDrops();
        var monsters = GameData.getMonsters();
        var monsterGroups = GameData.getMonsterGroups();

        // 初始化各子系统
        AttributeCalculator.initConversionRatiosFromData(attributes);
        LevelCalculator.initLevels(levels);
        ItemSystem.init(items, drops, equipments);

        var shopData = GameData.getShopData();
        ShopSystem.init(shopData, items, equipments);

        var plants = GameData.getPlants();
        var spiritPool = GameData.getSpiritPool();
        var buildings = GameData.getBuildings();
        var mineTable = GameData.getMineTable();
        var huntTable = GameData.getHuntTable();
        var servantTable = GameData.getServantTable();
        BlessedLand.init(plants, spiritPool, buildings, mineTable, huntTable, servantTable);

        DungeonSystem.init(stages);
        BattleSystem.init(monsters, monsterGroups);

        // 初始化炼丹系统
        var recipes = GameData.getRecipes();
        AlchemySystem.init(recipes);

        // 初始化丹药系统
        var pills = GameData.getPills();
        PillSystem.init(pills);

        // 初始化突破系统
        BreakthroughSystem.init();

        // 初始化仓库系统
        if (typeof StorageSystem !== 'undefined') {
            StorageSystem.init();
        }

        // 初始化音频系统
        if (typeof AudioManager !== 'undefined') {
            AudioManager.init();
        }

        // 绑定游戏内事件
        document.getElementById('confirm').onclick = function() {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.activateAndPlay(); // 首次用户交互，激活音频
                AudioManager.playSfxSuccess();
            }
            if (GameLogic.confirmWords()) {
                GameLogic.startGame(events, equipments);
                GameClock.start(events, equipments);
            }
        };
        document.getElementById('nextBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            GameLogic.nextAge(events, equipments);
        };
        document.getElementById('next').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            GameClock.toggle();
        };
        document.getElementById('skip').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            GameLogic.nextAge(events, equipments);
            if (!GameLogic.isAlive()) {
                GameClock.stop();
            } else {
                GameClock.resetSeconds();
            }
        };

        // 人物按钮事件
        document.getElementById('character').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            GameUI.showCharacterPage();
            GameUI.updateCharacterUI(GameLogic.getPlayer());
            GameUI.updateEquipmentSlots(EquipmentManager.getAllEquipped());
            GameUI.updateBackpack(GameLogic.getBackpack());
            EquipmentManager.setCharacterUIUpdateCallback(function(player) {
                GameUI.updateCharacterUI(player);
            });
            setTimeout(handleResize, 50);
        };
        document.getElementById('closeCharacter').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            GameUI.hideCharacterPage();
        };

        // 仓库按钮事件
        var storageBtn = document.getElementById('storageBtn');
        if (storageBtn) {
            storageBtn.onclick = function() {
                if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
                if (typeof StorageUI !== 'undefined') {
                    StorageUI.openStoragePage();
                }
            };
        }

        // 秘境按钮事件
        document.getElementById('dungeonBtn').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            DungeonUI.openDungeonPage();
        };
        document.getElementById('closeDungeon').onclick = function() {
            if (typeof AudioManager !== 'undefined') AudioManager.playSfxClick();
            DungeonUI.closeDungeonPage();
        };

        // 初始化各UI模块
        ShopUI.init();
        BlessedLandUI.init();
        BackpackUI.init();
        AlchemyUI.init();
        TribulationUI.init();

        // 初始化菜单系统并传入游戏数据
        MenuSystem.setGameData(baseAttr, words, events, equipments);
        MenuSystem.init();

        // 显示开始菜单
        MenuSystem.showStartMenu();
        console.log('游戏初始化完成');
    } catch (e) {
        console.error('启动失败:', e);
        GameUI.updateStatus('配置加载失败：' + e.message, '#e74c3c');
    }
});
console.log('[模块] game-init.js 加载完成');
