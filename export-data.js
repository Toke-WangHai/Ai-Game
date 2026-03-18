const fs = require('fs');
const path = require('path');

// 读取CSV文件并解析（只做基本的CSV解析，不做类型转换）
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length < 2) {
        throw new Error(`CSV文件至少需要两行: ${filePath}`);
    }

    // 第一行是表头（字段名）
    const headers = lines[0].split(',').map(h => h.trim());

    // 第二行是类型说明（string行），跳过
    // 从第三行开始是数据
    const data = [];
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 跳过空行

        const values = line.split(',').map(v => v.trim());

        const item = {};
        headers.forEach((header, index) => {
            // 所有字段都作为字符串处理，保持原始值
            item[header] = values[index] || '';
        });

        data.push(item);
    }

    return data;
}

// 生成JavaScript数据文件
function generateDataFile(data, varName, outputPath) {
    const content = `// 自动生成的数据文件，请勿手动编辑
const ${varName} = ${JSON.stringify(data, null, 4)};

module.exports = ${varName};
`;

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`✓ 已生成: ${outputPath}`);
}

// 主函数
function exportAllData() {
    const excelDir = path.join(__dirname, 'excel');
    const outputDir = path.join(__dirname, 'src');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 导出各个表
    const tables = [
        {
            csvFile: 'C_出生词条表.csv',
            varName: 'WORDS_DATA',
            outputFile: 'data-words.js'
        },
        {
            csvFile: 'S_事件表.csv',
            varName: 'EVENTS_DATA',
            outputFile: 'data-events.js'
        },
        {
            csvFile: 'Z_装备表.csv',
            varName: 'EQUIPMENTS_DATA',
            outputFile: 'data-equipments.js'
        },
        {
            csvFile: 'S_玩家属性表.csv',
            varName: 'BASE_ATTR_DATA',
            outputFile: 'data-base-attr.js'
        },
        {
            csvFile: 'S_属性表.csv',
            varName: 'ATTRIBUTES_DATA',
            outputFile: 'data-attributes.js'
        },
        {
            csvFile: 'D_等级表.csv',
            varName: 'LEVELS_DATA',
            outputFile: 'data-levels.js'
        },
        {
            csvFile: 'G_关卡表.csv',
            varName: 'STAGES_DATA',
            outputFile: 'data-stages.js'
        },
        {
            csvFile: 'W_物品表.csv',
            varName: 'ITEMS_DATA',
            outputFile: 'data-items.js'
        },
        {
            csvFile: 'D_掉落表.csv',
            varName: 'DROPS_DATA',
            outputFile: 'data-drops.js'
        },
        {
            csvFile: 'G_怪物表.csv',
            varName: 'MONSTERS_DATA',
            outputFile: 'data-monsters.js'
        },
        {
            csvFile: 'G_怪物组表.csv',
            varName: 'MONSTER_GROUPS_DATA',
            outputFile: 'data-monster-groups.js'
        },
        {
            csvFile: 'SH_商店表.csv',
            varName: 'SHOP_DATA',
            outputFile: 'data-shop.js'
        },
        {
            csvFile: 'LZ_灵植表.csv',
            varName: 'PLANTS_DATA',
            outputFile: 'data-plants.js'
        },
        {
            csvFile: 'LC_灵池表.csv',
            varName: 'SPIRIT_POOL_DATA',
            outputFile: 'data-spirit-pool.js'
        },
        {
            csvFile: 'JZ_建筑表.csv',
            varName: 'BUILDINGS_DATA',
            outputFile: 'data-buildings.js'
        },
        {
            csvFile: 'HC_合成表.csv',
            varName: 'RECIPES_DATA',
            outputFile: 'data-recipes.js'
        },
        {
            csvFile: 'KS_矿山表.csv',
            varName: 'MINE_TABLE_DATA',
            outputFile: 'data-mine.js'
        },
        {
            csvFile: 'LC_猎场表.csv',
            varName: 'HUNT_TABLE_DATA',
            outputFile: 'data-hunt.js'
        },
        {
            csvFile: 'NP_奴仆表.csv',
            varName: 'SERVANT_TABLE_DATA',
            outputFile: 'data-servant.js'
        },
        {
            csvFile: 'DY_丹药表.csv',
            varName: 'PILLS_DATA',
            outputFile: 'data-pills.js'
        }
    ];

    tables.forEach(table => {
        const csvPath = path.join(excelDir, table.csvFile);
        const outputPath = path.join(outputDir, table.outputFile);

        try {
            console.log(`正在处理: ${table.csvFile}`);
            const data = parseCSV(csvPath);
            generateDataFile(data, table.varName, outputPath);
            console.log(`  导出 ${data.length} 条记录`);
        } catch (error) {
            console.error(`  ✗ 处理失败: ${error.message}`);
        }
    });

    console.log('\n✓ 导表完成！');
}

// 生成完整的data.js文件
function generateMainDataFile() {
    const excelDir = path.join(__dirname, 'excel');
    const outputDir = path.join(__dirname, 'src');

    try {
        console.log('\n正在生成完整的data.js文件...');

        // 读取各个表（保持原始字符串格式）
        const wordsData = parseCSV(path.join(excelDir, 'C_出生词条表.csv'));
        const eventsData = parseCSV(path.join(excelDir, 'S_事件表.csv'));
        const equipmentsData = parseCSV(path.join(excelDir, 'Z_装备表.csv'));
        const baseAttrData = parseCSV(path.join(excelDir, 'S_玩家属性表.csv'));
        const attributesData = parseCSV(path.join(excelDir, 'S_属性表.csv'));
        const levelsData = parseCSV(path.join(excelDir, 'D_等级表.csv'));
        const stagesData = parseCSV(path.join(excelDir, 'G_关卡表.csv'));
        const itemsData = parseCSV(path.join(excelDir, 'W_物品表.csv'));
        const dropsData = parseCSV(path.join(excelDir, 'D_掉落表.csv'));
        const monstersData = parseCSV(path.join(excelDir, 'G_怪物表.csv'));
        const monsterGroupsData = parseCSV(path.join(excelDir, 'G_怪物组表.csv'));
        const shopData = parseCSV(path.join(excelDir, 'SH_商店表.csv'));
        const plantsData = parseCSV(path.join(excelDir, 'LZ_灵植表.csv'));
        const spiritPoolData = parseCSV(path.join(excelDir, 'LC_灵池表.csv'));
        const buildingsData = parseCSV(path.join(excelDir, 'JZ_建筑表.csv'));
        const recipesData = parseCSV(path.join(excelDir, 'HC_合成表.csv'));
        const mineTableData = parseCSV(path.join(excelDir, 'KS_矿山表.csv'));
        const huntTableData = parseCSV(path.join(excelDir, 'LC_猎场表.csv'));
        const servantTableData = parseCSV(path.join(excelDir, 'NP_奴仆表.csv'));
        const pillsData = parseCSV(path.join(excelDir, 'DY_丹药表.csv'));

        // 提取基础属性（通常第一条）
        const baseAttr = baseAttrData[0] || {};

        // 生成完整的data.js内容
        const content = `// 自动生成的数据文件，请勿手动编辑
// 生成时间: ${new Date().toLocaleString('zh-CN')}
// 注意：数据类型转换和字段验证在各自的模块中处理

const BASE_ATTR_DATA = ${JSON.stringify(baseAttr, null, 4)};

const WORDS_DATA = ${JSON.stringify(wordsData, null, 4)};

const EVENTS_DATA = ${JSON.stringify(eventsData, null, 4)};

const EQUIPMENTS_DATA = ${JSON.stringify(equipmentsData, null, 4)};

const ATTRIBUTES_DATA = ${JSON.stringify(attributesData, null, 4)};

const LEVELS_DATA = ${JSON.stringify(levelsData, null, 4)};

const STAGES_DATA = ${JSON.stringify(stagesData, null, 4)};

const ITEMS_DATA = ${JSON.stringify(itemsData, null, 4)};

const DROPS_DATA = ${JSON.stringify(dropsData, null, 4)};

const MONSTERS_DATA = ${JSON.stringify(monstersData, null, 4)};

const MONSTER_GROUPS_DATA = ${JSON.stringify(monsterGroupsData, null, 4)};

const SHOP_DATA = ${JSON.stringify(shopData, null, 4)};

const PLANTS_DATA = ${JSON.stringify(plantsData, null, 4)};

const SPIRIT_POOL_DATA = ${JSON.stringify(spiritPoolData, null, 4)};

const BUILDINGS_DATA = ${JSON.stringify(buildingsData, null, 4)};

const RECIPES_DATA = ${JSON.stringify(recipesData, null, 4)};

const MINE_TABLE_DATA = ${JSON.stringify(mineTableData, null, 4)};

const HUNT_TABLE_DATA = ${JSON.stringify(huntTableData, null, 4)};

const SERVANT_TABLE_DATA = ${JSON.stringify(servantTableData, null, 4)};

const PILLS_DATA = ${JSON.stringify(pillsData, null, 4)};

// 使用立即执行函数(IIFE)创建模块作用域
const GameData = (function() {
    return {
        getBaseAttr: function() {
            return DataProcessor.processBaseAttr(BASE_ATTR_DATA);
        },
        getWords: function() {
            return DataProcessor.processWords(WORDS_DATA);
        },
        getEvents: function() {
            return DataProcessor.processEvents(EVENTS_DATA);
        },
        getEquipments: function() {
            return DataProcessor.processEquipments(EQUIPMENTS_DATA);
        },
        getAttributes: function() {
            return DataProcessor.processAttributes(ATTRIBUTES_DATA);
        },
        getLevels: function() {
            return DataProcessor.processLevels(LEVELS_DATA);
        },
        getStages: function() {
            return DataProcessor.processStages(STAGES_DATA);
        },
        getItems: function() {
            return DataProcessor.processItems(ITEMS_DATA);
        },
        getDrops: function() {
            return DataProcessor.processDrops(DROPS_DATA);
        },
        getMonsters: function() {
            return DataProcessor.processMonsters(MONSTERS_DATA);
        },
        getMonsterGroups: function() {
            return DataProcessor.processMonsterGroups(MONSTER_GROUPS_DATA);
        },
        getShopData: function() {
            return DataProcessor.processShopData(SHOP_DATA);
        },
        getPlants: function() {
            return DataProcessor.processPlants(PLANTS_DATA);
        },
        getSpiritPool: function() {
            return DataProcessor.processSpiritPool(SPIRIT_POOL_DATA);
        },
        getBuildings: function() {
            return DataProcessor.processBuildings(BUILDINGS_DATA);
        },
        getRecipes: function() {
            return DataProcessor.processRecipes(RECIPES_DATA);
        },
        getMineTable: function() {
            return DataProcessor.processMineTable(MINE_TABLE_DATA);
        },
        getHuntTable: function() {
            return DataProcessor.processHuntTable(HUNT_TABLE_DATA);
        },
        getServantTable: function() {
            return DataProcessor.processServantTable(SERVANT_TABLE_DATA);
        },
        getPills: function() {
            return DataProcessor.processPills(PILLS_DATA);
        }
    };
})();
`;

        const outputPath = path.join(outputDir, 'data.js');
        fs.writeFileSync(outputPath, content, 'utf-8');
        console.log(`✓ 已生成: ${outputPath}`);
        console.log(`  - 基础属性: 1 条记录`);
        console.log(`  - 出生词条: ${wordsData.length} 条记录`);
        console.log(`  - 事件: ${eventsData.length} 条记录`);
        console.log(`  - 装备: ${equipmentsData.length} 条记录`);
        console.log(`  - 属性: ${attributesData.length} 条记录`);
        console.log(`  - 等级: ${levelsData.length} 条记录`);
        console.log(`  - 关卡: ${stagesData.length} 条记录`);
        console.log(`  - 物品: ${itemsData.length} 条记录`);
        console.log(`  - 掉落: ${dropsData.length} 条记录`);
        console.log(`  - 怪物: ${monstersData.length} 条记录`);
        console.log(`  - 怪物组: ${monsterGroupsData.length} 条记录`);
        console.log(`  - 商店: ${shopData.length} 条记录`);
        console.log(`  - 灵植: ${plantsData.length} 条记录`);
        console.log(`  - 灵池: ${spiritPoolData.length} 条记录`);
        console.log(`  - 建筑: ${buildingsData.length} 条记录`);
        console.log(`  - 合成: ${recipesData.length} 条记录`);
        console.log(`  - 矿山: ${mineTableData.length} 条记录`);
        console.log(`  - 猎场: ${huntTableData.length} 条记录`);
        console.log(`  - 奴仆: ${servantTableData.length} 条记录`);
        console.log(`  - 丹药: ${pillsData.length} 条记录`);

    } catch (error) {
        console.error(`  ✗ 生成失败: ${error.message}`);
    }
}

// 运行导表
console.log('========================================');
console.log('       一键导表工具');
console.log('========================================\n');

exportAllData();
generateMainDataFile();

console.log('\n========================================');
console.log('       所有任务完成！');
console.log('========================================');
