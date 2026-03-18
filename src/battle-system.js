// 战斗系统模块 - 回合制战斗逻辑
const BattleSystem = (function() {
    // 怪物数据缓存
    let monstersData = [];
    let monsterGroupsData = [];

    /**
     * 初始化战斗系统
     * @param {array} monsters - 怪物表数据
     * @param {array} monsterGroups - 怪物组表数据
     */
    function init(monsters, monsterGroups) {
        monstersData = monsters || [];
        monsterGroupsData = monsterGroups || [];
        console.log('战斗系统初始化完成，怪物:', monstersData.length, '条，怪物组:', monsterGroupsData.length, '条');
    }

    /**
     * 根据ID获取怪物数据
     * @param {number} monsterId - 怪物ID
     * @returns {object|null} 怪物数据副本
     */
    function getMonsterById(monsterId) {
        const monster = monstersData.find(m => m.ID === monsterId);
        return monster ? { ...monster } : null;
    }

    /**
     * 根据怪物组ID获取怪物列表
     * @param {number} groupId - 怪物组ID
     * @returns {array} 怪物数据数组（副本）
     */
    function getMonstersByGroupId(groupId) {
        const group = monsterGroupsData.find(g => g.ID === groupId);
        if (!group) return [];

        const monsters = [];
        for (let i = 1; i <= 5; i++) {
            const monsterId = group['Monster' + i];
            if (monsterId) {
                const monster = getMonsterById(monsterId);
                if (monster) {
                    // 为每只怪物创建战斗实例（独立HP）
                    monster.currentHP = monster.HP;
                    monsters.push(monster);
                }
            }
        }
        return monsters;
    }

    /**
     * 获取玩家战斗属性（进入时固定）
     * @returns {object} 玩家战斗属性快照
     */
    function getPlayerCombatStats() {
        const player = GameLogic.getPlayer();
        const equipments = EquipmentManager.getAllEquipped();
        const totalAttr = AttributeCalculator.calculateTotalAttributes(player, equipments);

        return {
            Attack: totalAttr.Attack,
            Defense: totalAttr.Defense,
            HP: totalAttr.HP,
            maxHP: totalAttr.HP,
            currentHP: totalAttr.HP,
            Dodge: totalAttr.Dodge,
            CriticalRate: totalAttr.CriticalRate,
            Mastery: totalAttr.Mastery,
            MasteryDefense: 0 // 玩家暂无精通防御
        };
    }

    /**
     * 执行单次攻击
     * @param {object} attacker - 攻击者属性
     * @param {object} defender - 防御者属性
     * @param {string} attackerName - 攻击者名称
     * @param {string} defenderName - 防御者名称
     * @returns {object} 攻击结果 {damage, isDodged, isCritical, log}
     */
    function performAttack(attacker, defender, attackerName, defenderName) {
        // 闪避判定
        const dodged = DamageCalculator.isDodged(defender.Dodge);
        if (dodged) {
            return {
                damage: 0,
                isDodged: true,
                isCritical: false,
                log: defenderName + ' 闪避了 ' + attackerName + ' 的攻击！'
            };
        }

        // 暴击判定
        const critical = DamageCalculator.isCritical(attacker.CriticalRate);

        // 计算基础伤害
        let damage = attacker.Attack;

        // 暴击倍率
        if (critical) {
            damage = Math.floor(damage * DamageCalculator.CRITICAL_DAMAGE_MULTIPLIER);
        }

        // 精通加成
        const masteryMul = DamageCalculator.calculateMasteryMultiplier(
            attacker.Mastery || 0,
            defender.MasteryDefense || 0
        );
        damage = Math.floor(damage * masteryMul);

        // 防御减免
        const defReduction = DamageCalculator.calculateDefenseReduction(
            defender.currentHP > 0 ? defender.currentHP : 1,
            defender.Defense
        );
        damage = Math.floor(damage * defReduction);

        // 最低伤害为1
        damage = Math.max(1, damage);

        // 构建日志
        let logText = attackerName + ' 对 ' + defenderName + ' 造成了 ' + damage + ' 点伤害';
        if (critical) {
            logText += '（暴击！）';
        }

        return {
            damage: damage,
            isDodged: false,
            isCritical: critical,
            log: logText
        };
    }

    /**
     * 执行一场完整战斗（玩家 vs 单只怪物）
     * @param {object} playerStats - 玩家战斗属性（会被修改currentHP）
     * @param {object} monster - 怪物数据（会被修改currentHP）
     * @returns {object} 战斗结果 {victory, logs, playerHPBefore, playerHPAfter, monsterHPBefore}
     */
    function fightMonster(playerStats, monster) {
        const logs = [];
        const playerHPBefore = playerStats.currentHP;
        const monsterHPBefore = monster.currentHP;
        const monsterName = monster.MonsterName;

        logs.push('--- 遭遇 ' + monsterName + '（生命:' + monster.currentHP + ' 攻击:' + monster.Attack + ' 防御:' + monster.Defense + '）---');

        let round = 1;
        const MAX_ROUNDS = 100; // 防止死循环

        while (playerStats.currentHP > 0 && monster.currentHP > 0 && round <= MAX_ROUNDS) {
            // 先后手完全随机
            const playerFirst = Math.random() < 0.5;

            if (playerFirst) {
                // 玩家先攻
                const playerAtk = performAttack(playerStats, monster, '你', monsterName);
                monster.currentHP -= playerAtk.damage;
                if (monster.currentHP < 0) monster.currentHP = 0;
                logs.push('【第' + round + '回合】' + playerAtk.log + '（' + monsterName + '剩余生命:' + monster.currentHP + '）');

                // 怪物是否死亡
                if (monster.currentHP <= 0) {
                    logs.push(monsterName + ' 被击败了！');
                    break;
                }

                // 怪物反击
                const monsterAtk = performAttack(monster, playerStats, monsterName, '你');
                playerStats.currentHP -= monsterAtk.damage;
                if (playerStats.currentHP < 0) playerStats.currentHP = 0;
                logs.push('【第' + round + '回合】' + monsterAtk.log + '（你剩余生命:' + playerStats.currentHP + '）');

                if (playerStats.currentHP <= 0) {
                    logs.push('你被 ' + monsterName + ' 击败了...');
                    break;
                }
            } else {
                // 怪物先攻
                const monsterAtk = performAttack(monster, playerStats, monsterName, '你');
                playerStats.currentHP -= monsterAtk.damage;
                if (playerStats.currentHP < 0) playerStats.currentHP = 0;
                logs.push('【第' + round + '回合】' + monsterAtk.log + '（你剩余生命:' + playerStats.currentHP + '）');

                if (playerStats.currentHP <= 0) {
                    logs.push('你被 ' + monsterName + ' 击败了...');
                    break;
                }

                // 玩家反击
                const playerAtk = performAttack(playerStats, monster, '你', monsterName);
                monster.currentHP -= playerAtk.damage;
                if (monster.currentHP < 0) monster.currentHP = 0;
                logs.push('【第' + round + '回合】' + playerAtk.log + '（' + monsterName + '剩余生命:' + monster.currentHP + '）');

                if (monster.currentHP <= 0) {
                    logs.push(monsterName + ' 被击败了！');
                    break;
                }
            }

            round++;
        }

        // 超过最大回合数
        if (round > MAX_ROUNDS && playerStats.currentHP > 0 && monster.currentHP > 0) {
            logs.push('战斗超时，判定为失败...');
            playerStats.currentHP = 0;
        }

        return {
            victory: playerStats.currentHP > 0,
            logs: logs,
            playerHPBefore: playerHPBefore,
            playerHPAfter: playerStats.currentHP,
            monsterHPBefore: monsterHPBefore
        };
    }

    /**
     * 执行完整的秘境战斗（玩家依次对战怪物组中的所有怪物）
     * @param {object} stage - 关卡数据
     * @returns {object} 战斗结果 {victory, logs, playerStats, monstersDefeated, totalMonsters}
     */
    function executeStageBattle(stage) {
        // 获取玩家战斗属性快照（进入时固定）
        const playerStats = getPlayerCombatStats();

        // 获取怪物组
        const monsters = getMonstersByGroupId(stage.MonsterGroupID);

        if (monsters.length === 0) {
            return {
                victory: true,
                logs: ['秘境中没有发现怪物，安全通关！'],
                playerStats: playerStats,
                monstersDefeated: 0,
                totalMonsters: 0
            };
        }

        const allLogs = [];
        allLogs.push('═══════════════════════════════');
        allLogs.push('⚔ 进入【' + stage.StageName + '】');
        allLogs.push('你的状态 - 生命:' + playerStats.currentHP + ' 攻击:' + playerStats.Attack + ' 防御:' + playerStats.Defense);
        allLogs.push('本关共有 ' + monsters.length + ' 只怪物等待挑战');
        allLogs.push('═══════════════════════════════');

        let monstersDefeated = 0;

        for (let i = 0; i < monsters.length; i++) {
            allLogs.push('');
            allLogs.push('◆ 第 ' + (i + 1) + '/' + monsters.length + ' 场战斗');

            const result = fightMonster(playerStats, monsters[i]);
            allLogs.push.apply(allLogs, result.logs);

            if (result.victory) {
                monstersDefeated++;
                allLogs.push('→ 你的剩余生命：' + playerStats.currentHP + '/' + playerStats.maxHP);
            } else {
                // 玩家死亡，战斗结束
                allLogs.push('');
                allLogs.push('═══════════════════════════════');
                allLogs.push('💀 你在第 ' + (i + 1) + ' 场战斗中倒下了...');
                allLogs.push('击败怪物：' + monstersDefeated + '/' + monsters.length);
                allLogs.push('═══════════════════════════════');
                break;
            }
        }

        // 胜利总结
        if (playerStats.currentHP > 0) {
            allLogs.push('');
            allLogs.push('═══════════════════════════════');
            allLogs.push('🎉 通关成功！');
            allLogs.push('剩余生命：' + playerStats.currentHP + '/' + playerStats.maxHP);
            allLogs.push('击败怪物：' + monstersDefeated + '/' + monsters.length);
            allLogs.push('═══════════════════════════════');
        }

        return {
            victory: playerStats.currentHP > 0,
            logs: allLogs,
            playerStats: playerStats,
            monstersDefeated: monstersDefeated,
            totalMonsters: monsters.length
        };
    }

    /**
     * 应用失败惩罚
     * @param {object} stage - 关卡数据
     * @returns {object} 惩罚详情 {xiuyiLost, shoumingLost, desc}
     */
    function applyDeathPenalty(stage) {
        const player = GameLogic.getPlayer();
        if (!player) return { xiuyiLost: 0, shoumingLost: 0, desc: '无惩罚' };

        const penalty = stage.DeathPenalty || 1;
        let xiuyiLost = 0;
        let shoumingLost = 0;

        switch (penalty) {
            case 1:
                // 无惩罚
                break;
            case 2:
                // 损失5%修为 + 2%寿命
                xiuyiLost = Math.floor(player.Xiuyi * 0.05);
                shoumingLost = Math.floor(player.Shouming * 0.02);
                break;
            case 3:
                // 损失10%修为 + 5%寿命
                xiuyiLost = Math.floor(player.Xiuyi * 0.10);
                shoumingLost = Math.floor(player.Shouming * 0.05);
                break;
            case 4:
                // 损失20%修为 + 10%寿命
                xiuyiLost = Math.floor(player.Xiuyi * 0.20);
                shoumingLost = Math.floor(player.Shouming * 0.10);
                break;
            case 5:
                // 损失30%修为 + 15%寿命
                xiuyiLost = Math.floor(player.Xiuyi * 0.30);
                shoumingLost = Math.floor(player.Shouming * 0.15);
                break;
            default:
                break;
        }

        // 应用惩罚
        if (xiuyiLost > 0) {
            player.Xiuyi = Math.max(0, player.Xiuyi - xiuyiLost);
        }
        if (shoumingLost > 0) {
            player.Shouming = Math.max(1, player.Shouming - shoumingLost); // 寿命至少保留1
        }

        // 更新UI
        GameUI.updateUI(player);

        return {
            xiuyiLost: xiuyiLost,
            shoumingLost: shoumingLost,
            desc: getDeathPenaltyDesc(penalty)
        };
    }

    /**
     * 获取死亡惩罚描述（新版：修为+寿命）
     * @param {number} penaltyType - 惩罚类型
     * @returns {string}
     */
    function getDeathPenaltyDesc(penaltyType) {
        const penalties = {
            1: '无惩罚',
            2: '损失5%修为 + 2%寿命',
            3: '损失10%修为 + 5%寿命',
            4: '损失20%修为 + 10%寿命',
            5: '损失30%修为 + 15%寿命'
        };
        return penalties[penaltyType] || '未知惩罚';
    }

    // 暴露公共接口
    return {
        init: init,
        getMonsterById: getMonsterById,
        getMonstersByGroupId: getMonstersByGroupId,
        getPlayerCombatStats: getPlayerCombatStats,
        executeStageBattle: executeStageBattle,
        applyDeathPenalty: applyDeathPenalty,
        getDeathPenaltyDesc: getDeathPenaltyDesc
    };
})();
