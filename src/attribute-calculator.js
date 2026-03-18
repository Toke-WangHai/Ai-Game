// 属性计算模块 - 负责将基础属性转换为战斗属性
const AttributeCalculator = (function() {
    // 转换系数基数（万分比）
    const CONVERSION_RATIO_BASE = 10000;

    // 默认转换系数配置（如果属性表中没有配置，使用这些默认值）
    // 使用万分比：10000表示1.0倍，5000表示0.5倍，20000表示2.0倍
    const DEFAULT_CONVERSION_RATIOS = {
        Attack: 10000,     // 1点修为 = 1.0点攻击
        Defense: 10000,    // 1点体魄 = 1.0点防御
        HP: 10000,         // 1点寿命 = 1.0点生命
        Dodge: 10000,      // 1点气运 = 1.0点闪避
        CriticalRate: 10000,// 1点元神 = 1.0点暴击率
        Mastery: 10000      // 1点年龄 = 1.0点精通
    };

    // 从属性表中加载的转换系数（万分比）
    let conversionRatios = { ...DEFAULT_CONVERSION_RATIOS };

    /**
     * 设置转换系数（万分比）
     * @param {object} ratios - 转换系数对象（万分比格式）
     */
    function setConversionRatios(ratios) {
        if (ratios) {
            conversionRatios = {
                Attack: parseInt(ratios.Attack) || DEFAULT_CONVERSION_RATIOS.Attack,
                Defense: parseInt(ratios.Defense) || DEFAULT_CONVERSION_RATIOS.Defense,
                HP: parseInt(ratios.HP) || DEFAULT_CONVERSION_RATIOS.HP,
                Dodge: parseInt(ratios.Dodge) || DEFAULT_CONVERSION_RATIOS.Dodge,
                CriticalRate: parseInt(ratios.CriticalRate) || DEFAULT_CONVERSION_RATIOS.CriticalRate,
                Mastery: parseInt(ratios.Mastery) || DEFAULT_CONVERSION_RATIOS.Mastery
            };
        }
    }

    /**
     * 获取转换系数（万分比）
     * @returns {object} 当前转换系数对象（万分比格式）
     */
    function getConversionRatios() {
        return { ...conversionRatios };
    }

    /**
     * 将万分比转换为倍率
     * @param {number} ratio - 万分比值
     * @returns {number} 倍率
     */
    function ratioToMultiplier(ratio) {
        return ratio / CONVERSION_RATIO_BASE;
    }

    /**
     * 将玩家基础属性转换为战斗属性（使用转换系数）
     * @param {object} player - 玩家对象（包含Xiuyi, Tipao, Shouming, Qiyun, Yuanshen, age）
     * @returns {object} 转换后的战斗属性
     */
    function calculateCombatAttributes(player) {
        if (!player) {
            return {
                Attack: 0,
                Defense: 0,
                HP: 0,
                Dodge: 0,
                CriticalRate: 0,
                Mastery: 0
            };
        }

        return {
            // 攻击：基于修为，使用转换系数
            Attack: Math.floor((player.Xiuyi || 0) * ratioToMultiplier(conversionRatios.Attack)),
            // 防御：基于体魄，使用转换系数
            Defense: Math.floor((player.Tipao || 0) * ratioToMultiplier(conversionRatios.Defense)),
            // 生命：基于寿命，使用转换系数
            HP: Math.floor((player.Shouming || 0) * ratioToMultiplier(conversionRatios.HP)),
            // 闪避：基于气运，使用转换系数
            Dodge: Math.floor((player.Qiyun || 0) * ratioToMultiplier(conversionRatios.Dodge)),
            // 暴击率：基于元神，使用转换系数（显示为百分比）
            CriticalRate: Math.floor((player.Yuanshen || 0) * ratioToMultiplier(conversionRatios.CriticalRate)),
            // 精通：基于年龄，使用转换系数
            Mastery: Math.floor((player.age || 0) * ratioToMultiplier(conversionRatios.Mastery))
        };
    }

    /**
     * 计算总属性（基础+装备加成）
     * @param {object} player - 玩家对象
     * @param {array} equipments - 已装备的装备数组
     * @returns {object} 总战斗属性
     */
    function calculateTotalAttributes(player, equipments) {
        const baseAttr = calculateCombatAttributes(player);
        const equipBonus = calculateEquipmentBonus(equipments);

        return {
            Attack: baseAttr.Attack + equipBonus.Attack,
            Defense: baseAttr.Defense + equipBonus.Defense,
            HP: baseAttr.HP + equipBonus.HP,
            Dodge: baseAttr.Dodge + equipBonus.Dodge,
            CriticalRate: baseAttr.CriticalRate + equipBonus.CriticalRate,
            Mastery: baseAttr.Mastery + equipBonus.Mastery
        };
    }

    /**
     * 计算装备加成
     * @param {array} equipments - 已装备的装备数组
     * @returns {object} 装备加成属性
     */
    function calculateEquipmentBonus(equipments) {
        if (!equipments || !Array.isArray(equipments)) {
            return {
                Attack: 0,
                Defense: 0,
                HP: 0,
                Dodge: 0,
                CriticalRate: 0,
                Mastery: 0
            };
        }

        const bonus = {
            Attack: 0,
            Defense: 0,
            HP: 0,
            Dodge: 0,
            CriticalRate: 0,
            Mastery: 0
        };

        equipments.forEach(equip => {
            if (equip) {
                // 装备的修为加成 -> 攻击（使用转换系数）
                bonus.Attack += Math.floor((equip.Xiuyi || 0) * ratioToMultiplier(conversionRatios.Attack));
                // 装备的体魄加成 -> 防御（使用转换系数）
                bonus.Defense += Math.floor((equip.Tipao || 0) * ratioToMultiplier(conversionRatios.Defense));
                // 装备的气运加成 -> 闪避（使用转换系数）
                bonus.Dodge += Math.floor((equip.Qiyun || 0) * ratioToMultiplier(conversionRatios.Dodge));
                // 装备的元神加成 -> 暴击率（使用转换系数）
                bonus.CriticalRate += Math.floor((equip.Yuanshen || 0) * ratioToMultiplier(conversionRatios.CriticalRate));
                // 装备没有年龄加成 -> 精通为0
            }
        });

        return bonus;
    }

    /**
     * 从属性表数据初始化转换系数
     * @param {array} attributeData - 属性表数据数组
     */
    function initConversionRatiosFromData(attributeData) {
        if (!attributeData || !Array.isArray(attributeData)) {
            console.warn('属性数据无效，使用默认转换系数');
            return;
        }

        const ratios = {};

        attributeData.forEach(item => {
            // 根据属性名称匹配转换系数（已经是整数，万分比格式）
            if (item.Attack && item.ConversionRatio !== undefined) {
                ratios.Attack = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.Attack;
            } else if (item.Defense && item.ConversionRatio !== undefined) {
                ratios.Defense = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.Defense;
            } else if (item.HP && item.ConversionRatio !== undefined) {
                ratios.HP = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.HP;
            } else if (item.Dodge && item.ConversionRatio !== undefined) {
                ratios.Dodge = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.Dodge;
            } else if (item.CriticalRate && item.ConversionRatio !== undefined) {
                ratios.CriticalRate = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.CriticalRate;
            } else if (item.Mastery && item.ConversionRatio !== undefined) {
                ratios.Mastery = parseInt(item.ConversionRatio) || DEFAULT_CONVERSION_RATIOS.Mastery;
            }
        });

        if (Object.keys(ratios).length > 0) {
            setConversionRatios(ratios);
            console.log('转换系数已加载(万分比):', conversionRatios);
        } else {
            console.warn('未找到转换系数，使用默认值');
        }
    }

    /**
     * 获取属性转换说明文本
     * @param {string} attributeName - 属性名称
     * @returns {string} 转换说明文本
     */
    function getConversionDescription(attributeName) {
        const ratio = conversionRatios[attributeName] || CONVERSION_RATIO_BASE;
        const multiplier = ratioToMultiplier(ratio);
        const baseAttrMap = {
            Attack: '修为',
            Defense: '体魄',
            HP: '寿命',
            Dodge: '气运',
            CriticalRate: '元神',
            Mastery: '年龄'
        };

        const baseAttr = baseAttrMap[attributeName];
        if (baseAttr) {
            return `1点${baseAttr} = ${multiplier.toFixed(4)}点${attributeName}(万分比${ratio})`;
        }
        return '';
    }

    /**
     * 格式化转换系数显示
     * @param {number} ratio - 万分比值
     * @returns {string} 格式化后的字符串
     */
    function formatRatioDisplay(ratio) {
        const multiplier = ratioToMultiplier(ratio);
        return `${multiplier.toFixed(4)} (${ratio}/10000)`;
    }

    // 暴露公共接口
    return {
        calculateCombatAttributes: calculateCombatAttributes,
        calculateTotalAttributes: calculateTotalAttributes,
        calculateEquipmentBonus: calculateEquipmentBonus,
        setConversionRatios: setConversionRatios,
        getConversionRatios: getConversionRatios,
        initConversionRatiosFromData: initConversionRatiosFromData,
        getConversionDescription: getConversionDescription,
        formatRatioDisplay: formatRatioDisplay,
        CONVERSION_RATIO_BASE: CONVERSION_RATIO_BASE
    };
})();
