// 等级计算模块 - 基于修为计算等级
const LevelCalculator = (function() {
    // 等级表数据
    let LEVELS_DATA = [];

    /**
     * 初始化等级表数据
     * @param {array} dataList - 等级表数据（已通过DataProcessor处理）
     */
    function initLevels(dataList) {
        if (!Array.isArray(dataList)) {
            console.error('LevelCalculator: 等级表数据格式错误');
            LEVELS_DATA = [];
            return;
        }

        // 按ID排序，确保等级顺序正确（数据已经是number类型，直接比较）
        LEVELS_DATA = dataList
            .filter(item => item && item.ID !== undefined)
            .sort((a, b) => a.ID - b.ID);
    }

    /**
     * 根据修为计算等级
     * @param {number} xiuyi - 当前修为
     * @returns {object} { level: number, levelName: string, requiredXiuyi: number, description: string }
     */
    function calculateLevel(xiuyi) {
        if (!LEVELS_DATA || LEVELS_DATA.length === 0) {
            return {
                level: 1,
                levelName: '未知',
                requiredXiuyi: 0,
                description: '等级数据未加载'
            };
        }

        // 从高到低查找匹配的等级（数据已经是number类型，直接使用）
        for (let i = LEVELS_DATA.length - 1; i >= 0; i--) {
            const levelData = LEVELS_DATA[i];
            const requiredXiuyi = levelData.RequiredXiuyi;

            if (xiuyi >= requiredXiuyi) {
                return {
                    level: levelData.ID,
                    levelName: levelData.LevelName || '未知',
                    requiredXiuyi: requiredXiuyi,
                    description: levelData.Description || ''
                };
            }
        }

        // 如果连第一级都达不到，返回第一级
        const firstLevel = LEVELS_DATA[0];
        return {
            level: firstLevel.ID,
            levelName: firstLevel.LevelName || '未知',
            requiredXiuyi: firstLevel.RequiredXiuyi,
            description: firstLevel.Description || ''
        };
    }

    /**
     * 获取下一个等级的信息
     * @param {number} currentLevel - 当前等级ID
     * @returns {object|null} 下一等级信息，如果已经是最高等级则返回null
     */
    function getNextLevel(currentLevel) {
        if (!LEVELS_DATA || LEVELS_DATA.length === 0) {
            return null;
        }

        const currentLevelId = currentLevel;
        const nextLevelData = LEVELS_DATA.find(item => item.ID === currentLevelId + 1);

        if (!nextLevelData) {
            return null;
        }

        return {
            level: nextLevelData.ID,
            levelName: nextLevelData.LevelName || '未知',
            requiredXiuyi: nextLevelData.RequiredXiuyi,
            description: nextLevelData.Description || ''
        };
    }

    /**
     * 计算升级还需要多少修为
     * @param {number} xiuyi - 当前修为
     * @returns {number|null} 还需要多少修为，已经是最高等级返回null
     */
    function calculateRequiredXiuyi(xiuyi) {
        const currentLevel = calculateLevel(xiuyi);
        const nextLevel = getNextLevel(currentLevel.level);

        if (!nextLevel) {
            return null; // 已经是最高等级
        }

        return Math.max(0, nextLevel.requiredXiuyi - xiuyi);
    }

    /**
     * 获取所有等级数据
     * @returns {array} 等级数据数组
     */
    function getAllLevels() {
        return LEVELS_DATA;
    }

    /**
     * 根据ID获取等级信息
     * @param {number} levelId - 等级ID
     * @returns {object|null} 等级信息
     */
    function getLevelById(levelId) {
        const levelData = LEVELS_DATA.find(item => item.ID === levelId);
        if (!levelData) {
            return null;
        }

        return {
            level: levelData.ID,
            levelName: levelData.LevelName || '未知',
            requiredXiuyi: levelData.RequiredXiuyi,
            description: levelData.Description || ''
        };
    }

    /**
     * 获取最高等级
     * @returns {object} 最高等级信息
     */
    function getMaxLevel() {
        if (!LEVELS_DATA || LEVELS_DATA.length === 0) {
            return {
                level: 1,
                levelName: '未知',
                requiredXiuyi: 0,
                description: '等级数据未加载'
            };
        }

        const maxLevelData = LEVELS_DATA[LEVELS_DATA.length - 1];
        return {
            level: maxLevelData.ID,
            levelName: maxLevelData.LevelName || '未知',
            requiredXiuyi: maxLevelData.RequiredXiuyi,
            description: maxLevelData.Description || ''
        };
    }

    // 暴露公共接口
    return {
        initLevels: initLevels,
        calculateLevel: calculateLevel,
        getNextLevel: getNextLevel,
        calculateRequiredXiuyi: calculateRequiredXiuyi,
        getAllLevels: getAllLevels,
        getLevelById: getLevelById,
        getMaxLevel: getMaxLevel
    };
})();
