// 伤害计算模块
const DamageCalculator = (function() {
    // 暴击伤害倍率
    const CRITICAL_DAMAGE_MULTIPLIER = 1.5;

    // 闪避上限（40%）
    const MAX_DODGE_RATE = 0.4;

    /**
     * 计算闪避率（最高40%）
     * @param {number} dodge - 闪避值
     * @returns {number} 闪避率（0-0.4之间）
     */
    function calculateDodgeRate(dodge) {
        const dodgeValue = Math.max(0, dodge);
        // 使用对数缩放，避免闪避值过高轻易达到上限
        // 公式：dodgeRate = min(0.4, dodge / (dodge + 100))
        const dodgeRate = Math.min(MAX_DODGE_RATE, dodgeValue / (dodgeValue + 100));
        return dodgeRate;
    }

    /**
     * 判断是否闪避成功
     * @param {number} dodge - 闪避值
     * @returns {boolean} 是否闪避成功
     */
    function isDodged(dodge) {
        const dodgeRate = calculateDodgeRate(dodge);
        const randomValue = Math.random();
        return randomValue < dodgeRate;
    }

    /**
     * 计算暴击伤害倍率
     * @param {number} criticalRate - 暴击率（百分比形式，如15表示15%）
     * @returns {number} 暴击伤害倍率（1.x）
     */
    function calculateCriticalMultiplier(criticalRate) {
        const critRate = Math.max(0, criticalRate) / 100; // 转换为小数
        const criticalMultiplier = 1 + critRate * (CRITICAL_DAMAGE_MULTIPLIER - 1);
        return criticalMultiplier;
    }

    /**
     * 判断是否暴击
     * @param {number} criticalRate - 暴击率（百分比形式，如15表示15%）
     * @returns {boolean} 是否暴击
     */
    function isCritical(criticalRate) {
        const critRate = Math.max(0, criticalRate) / 100; // 转换为小数
        const randomValue = Math.random();
        return randomValue < critRate;
    }

    /**
     * 计算精通伤害加成
     * @param {number} mastery - 攻击者的精通值
     * @param {number} targetMasteryDefense - 目标的精通防御值
     * @returns {number} 精通加成倍率（1.x）
     */
    function calculateMasteryMultiplier(mastery, targetMasteryDefense = 0) {
        const masteryValue = Math.max(0, mastery);
        const defenseValue = Math.max(0, targetMasteryDefense);

        // 避免除零错误
        if (masteryValue === 0) return 1.0;

        const masteryMultiplier = 1 + masteryValue / (masteryValue + defenseValue);
        return masteryMultiplier;
    }

    /**
     * 计算生命防御伤害减免
     * @param {number} targetHP - 目标的生命值
     * @param {number} targetDefense - 目标的防御值
     * @returns {number} 伤害减免倍率（0-1之间）
     */
    function calculateDefenseReduction(targetHP, targetDefense) {
        const hp = Math.max(1, targetHP); // 至少为1，避免除零
        const defense = Math.max(0, targetDefense);

        const defenseReduction = hp / (hp + defense);
        return defenseReduction;
    }

    /**
     * 计算最终伤害（完整公式）
     * @param {object} attacker - 攻击者属性对象
     * @param {object} defender - 防御者属性对象
     * @param {boolean} returnDetails - 是否返回详细计算信息（默认false）
     * @returns {number|object} 伤害值 或 详细计算信息对象
     */
    function calculateDamage(attacker, defender, returnDetails = false) {
        // 提取属性
        const attack = Math.max(0, attacker.Attack || 0);
        const dodge = Math.max(0, defender.Dodge || 0);
        const criticalRate = Math.max(0, attacker.CriticalRate || 0);
        const mastery = Math.max(0, attacker.Mastery || 0);
        const masteryDefense = Math.max(0, defender.MasteryDefense || 0);
        const hp = Math.max(1, defender.HP || 1);
        const defense = Math.max(0, defender.Defense || 0);

        // 判断闪避
        const dodged = isDodged(dodge);

        if (dodged) {
            // 闪避成功，伤害为0
            if (returnDetails) {
                return {
                    finalDamage: 0,
                    isDodged: true,
                    isCritical: false,
                    dodgeRate: calculateDodgeRate(dodge),
                    dodgeValue: dodge,
                    baseDamage: attack,
                    criticalMultiplier: 1,
                    masteryMultiplier: 1,
                    defenseReduction: 0,
                    formula: '闪避成功，最终伤害 = 0'
                };
            }
            return 0;
        }

        // 判断暴击
        const critical = isCritical(criticalRate);

        // 计算暴击伤害倍率
        const criticalMultiplier = calculateCriticalMultiplier(criticalRate);

        // 计算精通加成倍率
        const masteryMultiplier = calculateMasteryMultiplier(mastery, masteryDefense);

        // 计算防御减免倍率
        const defenseReduction = calculateDefenseReduction(hp, defense);

        // 计算最终伤害
        const finalDamage = attack * criticalMultiplier * masteryMultiplier * defenseReduction;

        if (returnDetails) {
            return {
                finalDamage: Math.floor(finalDamage),
                isDodged: false,
                isCritical: critical,
                dodgeRate: calculateDodgeRate(dodge),
                dodgeValue: dodge,
                baseDamage: attack,
                criticalRate: criticalRate,
                criticalMultiplier: criticalMultiplier,
                mastery: mastery,
                masteryDefense: masteryDefense,
                masteryMultiplier: masteryMultiplier,
                targetHP: hp,
                targetDefense: defense,
                defenseReduction: defenseReduction,
                formula: `最终伤害 = ${attack} × ${criticalMultiplier.toFixed(3)} × ${masteryMultiplier.toFixed(3)} × ${defenseReduction.toFixed(3)} = ${Math.floor(finalDamage)}`
            };
        }

        return Math.floor(finalDamage);
    }

    /**
     * 计算预期伤害（期望值，不考虑随机闪避和暴击）
     * @param {object} attacker - 攻击者属性对象
     * @param {object} defender - 防御者属性对象
     * @returns {number} 期望伤害值
     */
    function calculateExpectedDamage(attacker, defender) {
        const attack = Math.max(0, attacker.Attack || 0);
        const dodge = Math.max(0, defender.Dodge || 0);
        const criticalRate = Math.max(0, attacker.CriticalRate || 0);
        const mastery = Math.max(0, attacker.Mastery || 0);
        const masteryDefense = Math.max(0, defender.MasteryDefense || 0);
        const hp = Math.max(1, defender.HP || 1);
        const defense = Math.max(0, defender.Defense || 0);

        // 计算闪避率（期望伤害乘以未闪避概率）
        const dodgeRate = calculateDodgeRate(dodge);
        const notDodgedRate = 1 - dodgeRate;

        // 计算期望暴击倍率（而非随机判断）
        const expectedCriticalMultiplier = calculateCriticalMultiplier(criticalRate);

        // 计算精通加成倍率
        const masteryMultiplier = calculateMasteryMultiplier(mastery, masteryDefense);

        // 计算防御减免倍率
        const defenseReduction = calculateDefenseReduction(hp, defense);

        // 计算期望伤害
        const expectedDamage = attack * expectedCriticalMultiplier * masteryMultiplier * defenseReduction * notDodgedRate;

        return Math.floor(expectedDamage);
    }

    /**
     * 计算闪避率百分比（用于显示）
     * @param {number} dodge - 闪避值
     * @returns {string} 闪避率百分比字符串
     */
    function formatDodgeRate(dodge) {
        const rate = calculateDodgeRate(dodge);
        return (rate * 100).toFixed(2) + '%';
    }

    /**
     * 计算暴击率百分比（用于显示）
     * @param {number} criticalRate - 暴击率
     * @returns {string} 暴击率百分比字符串
     */
    function formatCriticalRate(criticalRate) {
        return Math.max(0, criticalRate).toFixed(2) + '%';
    }

    /**
     * 计算精通加成百分比（用于显示）
     * @param {number} mastery - 精通值
     * @param {number} targetMasteryDefense - 目标精通防御
     * @returns {string} 精通加成百分比字符串
     */
    function formatMasteryBonus(mastery, targetMasteryDefense = 0) {
        const multiplier = calculateMasteryMultiplier(mastery, targetMasteryDefense);
        return ((multiplier - 1) * 100).toFixed(2) + '%';
    }

    /**
     * 计算防御减免百分比（用于显示）
     * @param {number} hp - 生命值
     * @param {number} defense - 防御值
     * @returns {string} 防御减免百分比字符串
     */
    function formatDefenseReduction(hp, defense) {
        const reduction = calculateDefenseReduction(hp, defense);
        return ((1 - reduction) * 100).toFixed(2) + '%';
    }

    // 暴露公共接口
    return {
        CRITICAL_DAMAGE_MULTIPLIER: CRITICAL_DAMAGE_MULTIPLIER,
        MAX_DODGE_RATE: MAX_DODGE_RATE,
        calculateDodgeRate: calculateDodgeRate,
        isDodged: isDodged,
        calculateCriticalMultiplier: calculateCriticalMultiplier,
        isCritical: isCritical,
        calculateMasteryMultiplier: calculateMasteryMultiplier,
        calculateDefenseReduction: calculateDefenseReduction,
        calculateDamage: calculateDamage,
        calculateExpectedDamage: calculateExpectedDamage,
        formatDodgeRate: formatDodgeRate,
        formatCriticalRate: formatCriticalRate,
        formatMasteryBonus: formatMasteryBonus,
        formatDefenseReduction: formatDefenseReduction
    };
})();
