// 装备系统模块
const EquipmentSystem = (function() {
    // 装备品质配置
    const QUALITY_CONFIG = {
        1: {
            name: '白',
            color: '#ffffff',
            borderColor: '#ffffff',
            textColor: '#ffffff'
        },
        2: {
            name: '蓝',
            color: '#3498db',
            borderColor: '#3498db',
            textColor: '#3498db'
        },
        3: {
            name: '紫',
            color: '#9b59b6',
            borderColor: '#9b59b6',
            textColor: '#9b59b6'
        },
        4: {
            name: '粉',
            color: '#ff69b4',
            borderColor: '#ff69b4',
            textColor: '#ff69b4'
        },
        5: {
            name: '金',
            color: '#ffd700',
            borderColor: '#ffd700',
            textColor: '#ffd700'
        }
    };

    // 装备栏位名称
    const SLOT_NAMES = {
        1: '剑',
        2: '甲',
        3: '手',
        4: '腿',
        5: '鞋',
        6: '法宝'
    };

    /**
     * 获取装备品质配置
     * @param {number} quality - 品质ID (1-5)
     * @returns {object} 品质配置对象
     */
    function getQualityConfig(quality) {
        const q = parseInt(quality) || 1;
        return QUALITY_CONFIG[q] || QUALITY_CONFIG[1];
    }

    /**
     * 获取装备栏位名称
     * @param {number} column - 栏位ID (1-6)
     * @returns {string} 栏位名称
     */
    function getSlotName(column) {
        return SLOT_NAMES[column] || `未知栏位${column}`;
    }

    /**
     * 获取装备的完整显示名称（包含品质）
     * @param {object} equipment - 装备对象
     * @returns {string} 装备名称（带品质颜色）
     */
    function getEquipmentDisplayName(equipment) {
        if (!equipment) return '';

        const quality = equipment.EquipmentQuality || 1;
        const config = getQualityConfig(quality);
        const name = equipment.EquipmentName || '未知装备';

        return name;
    }

    /**
     * 获取装备的品质颜色
     * @param {object} equipment - 装备对象
     * @returns {string} 颜色值
     */
    function getQualityColor(equipment) {
        if (!equipment) return '#ffffff';

        const quality = equipment.EquipmentQuality || 1;
        const config = getQualityConfig(quality);
        return config.color;
    }

    /**
     * 获取装备的边框颜色
     * @param {object} equipment - 装备对象
     * @returns {string} 边框颜色值
     */
    function getQualityBorderColor(equipment) {
        if (!equipment) return '#ffffff';

        const quality = equipment.EquipmentQuality || 1;
        const config = getQualityConfig(quality);
        return config.borderColor;
    }

    /**
     * 格式化装备显示信息
     * @param {object} equipment - 装备对象
     * @returns {object} 格式化后的信息对象
     */
    function formatEquipmentInfo(equipment) {
        if (!equipment) {
            return {
                name: '空',
                color: '#aaa',
                borderColor: '#3498db',
                quality: null,
                slot: null
            };
        }

        const quality = equipment.EquipmentQuality || 1;
        const config = getQualityConfig(quality);

        return {
            name: equipment.EquipmentName || '未知装备',
            color: config.textColor,
            borderColor: config.borderColor,
            quality: quality,
            qualityName: config.name,
            slot: equipment.Column,
            slotName: getSlotName(equipment.Column),
            desc: equipment.Desc || ''
        };
    }

    /**
     * 比较两个装备的品质
     * @param {object} equip1 - 装备1
     * @param {object} equip2 - 装备2
     * @returns {number} -1(装备1差), 0(相同), 1(装备1好)
     */
    function compareQuality(equip1, equip2) {
        const q1 = equip1?.EquipmentQuality || 1;
        const q2 = equip2?.EquipmentQuality || 1;

        if (q1 < q2) return -1;
        if (q1 > q2) return 1;
        return 0;
    }

    /**
     * 检查装备是否为指定品质
     * @param {object} equipment - 装备对象
     * @param {number} quality - 品质ID
     * @returns {boolean}
     */
    function isQuality(equipment, quality) {
        if (!equipment) return false;
        return equipment.EquipmentQuality === quality;
    }

    /**
     * 根据品质筛选装备
     * @param {array} equipments - 装备数组
     * @param {number} quality - 品质ID
     * @returns {array} 筛选后的装备数组
     */
    function filterByQuality(equipments, quality) {
        if (!equipments || !Array.isArray(equipments)) return [];
        return equipments.filter(e => e.EquipmentQuality === quality);
    }

    /**
     * 根据栏位筛选装备
     * @param {array} equipments - 装备数组
     * @param {number} column - 栏位ID
     * @returns {array} 筛选后的装备数组
     */
    function filterBySlot(equipments, column) {
        if (!equipments || !Array.isArray(equipments)) return [];
        return equipments.filter(e => e.Column === column);
    }

    // 暴露公共接口
    return {
        getQualityConfig: getQualityConfig,
        getSlotName: getSlotName,
        getEquipmentDisplayName: getEquipmentDisplayName,
        getQualityColor: getQualityColor,
        getQualityBorderColor: getQualityBorderColor,
        formatEquipmentInfo: formatEquipmentInfo,
        compareQuality: compareQuality,
        isQuality: isQuality,
        filterByQuality: filterByQuality,
        filterBySlot: filterBySlot
    };
})();
