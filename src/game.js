// 游戏主逻辑模块

let player = null
let selected = []
let randomWords = []
let alive = true
let baseAttr = null
let words = []
let events = []

/**
 * 初始化游戏数据
 * @param {Object} attr - 基础属性
 * @param {Array} wordList - 词条列表
 * @param {Array} eventList - 事件列表
 */
function initData(attr, wordList, eventList) {
  baseAttr = attr
  words = wordList
  events = eventList
}

/**
 * 初始化游戏
 */
function init() {
  if (!baseAttr) {
    baseAttr = { Xiuyi: 0, Tipao: 0, Shouming: 0, Qiyun: 0, Yuanshen: 0 }
  }

  player = { ...baseAttr, age: 0 }
  selected = []
  alive = true
  randomWords = selectWordsByWeight(words, 9)

  clearLog()
  renderWords(randomWords, handleWordClick)
  updateUI(player)
}

/**
 * 处理词条点击
 * @param {number} index - 词条索引
 * @param {HTMLElement} element - 点击的DOM元素
 */
function handleWordClick(index, element) {
  if (selected.includes(index)) {
    selected = selected.filter(x => x !== index)
    element.classList.remove('selected')
  } else {
    if (selected.length < 3) {
      selected.push(index)
      element.classList.add('selected')
    } else {
      alert('最多选3个')
    }
  }
}

/**
 * 确认选择的词条
 * @returns {boolean} 是否成功确认
 */
function confirmWords() {
  if (selected.length !== 3) {
    alert('请选3个词条')
    return false
  }

  selected.forEach(i => {
    const w = randomWords[i]
    for (const k in w) {
      if (k !== 'Name' && k !== 'ID' && k !== 'Weight' && player[k] !== undefined) {
        player[k] += w[k]
      }
    }
  })

  hideWordPanel()
  enableNextButton()
  log('携带天赋降临世间')
  return true
}

/**
 * 下一岁
 */
function nextAge() {
  if (!alive) return

  player.age++
  player.Shouming--
  const e = selectEventByWeight(events)
  if (e) {
    trigger(e)
  }
  checkDead()
  updateUI(player)
}

/**
 * 触发事件
 * @param {Object} event - 事件对象
 */
function trigger(event) {
  if (!event) return

  let s = ''
  for (const k in event) {
    if (k === 'Desc' || k === 'ID' || k === 'Weight' || player[k] === undefined) continue

    const v = event[k]
    // 跳过值为0的属性
    if (v === 0) continue

    player[k] += v
    if (player[k] < 0) player[k] = 0

    const map = { Xiuyi: '修为', Tipao: '体魄', Shouming: '寿命', Qiyun: '气运', Yuanshen: '元神' }
    if (map[k]) {
      s += `${map[k]}${v > 0 ? '+' + v : v} `
    }
  }

  log(`【${player.age}岁】${event.Desc}`, s)
}

/**
 * 检查玩家是否死亡
 */
function checkDead() {
  if (player.Shouming <= 0) {
    alive = false
    player.Shouming = 0
    updateStatus(`你享年${player.age}岁，已陨落`, '#e74c3c')
    disableNextButton()
    showRebirthButton()
    log('寿命耗尽，魂归天地')
  }
}

/**
 * 重新开始游戏
 */
function rebirth() {
  init()
  updateStatus('请选择3个天赋词条', '#fff')
  showWordPanel()
}

/**
 * 获取玩家对象
 * @returns {Object} 玩家对象
 */
function getPlayer() {
  return player
}

/**
 * 获取存活状态
 * @returns {boolean} 是否存活
 */
function isAlive() {
  return alive
}
