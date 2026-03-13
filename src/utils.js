// 工具函数模块

/**
 * 加载CSV文件
 * @param {string} path - CSV文件路径
 * @returns {Array} 解析后的数据数组
 */
function loadCSV(path) {
  const fs = require('fs')
  const pathModule = require('path')

  const exePath = process.cwd()
  const fullPath = pathModule.join(exePath, path)
  let t = fs.readFileSync(fullPath, 'utf8')
  // 移除UTF-8 BOM头
  if (t.charCodeAt(0) === 0xFEFF) {
    t = t.slice(1)
  }
  const [h,...ls] = t.split(/\r?\n/).filter(Boolean)
  const k = h.split(',')
  return ls.map(l => {
    // 跳过string行（用于策划备注）
    if (l.startsWith('string') || l.startsWith('String')) return null
    const o = {}
    const values = l.split(',')
    values.forEach((v,i) => {
      if (k[i]) { // 确保列名存在
        const n = Number(v)
        o[k[i]] = isNaN(n) ? v : n
      }
    })
    return o
  }).filter(item => item !== null) // 过滤掉null项
}

/**
 * 根据权重随机选择指定数量的词条
 * @param {Array} words - 词条数组
 * @param {number} count - 需要选择的数量
 * @returns {Array} 选中的词条数组
 */
function selectWordsByWeight(words, count) {
  if (!words || words.length === 0) return []

  const selectedWords = []
  const availableWords = [...words]

  for (let i = 0; i < count && availableWords.length > 0; i++) {
    const totalWeight = availableWords.reduce((sum, w) => sum + (w.Weight || 0), 0)

    if (totalWeight === 0) break

    let random = Math.random() * totalWeight
    let selectedIndex = 0

    for (let j = 0; j < availableWords.length; j++) {
      random -= (availableWords[j].Weight || 0)
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    selectedWords.push(availableWords[selectedIndex])
    availableWords.splice(selectedIndex, 1)
  }

  return selectedWords
}

/**
 * 根据权重随机选择事件
 * @param {Array} events - 事件数组
 * @returns {Object|null} 选中的事件对象
 */
function selectEventByWeight(events) {
  if (!events || events.length === 0) return null

  const totalWeight = events.reduce((sum, e) => sum + (e.Weight || 0), 0)

  if (totalWeight === 0) return events[0]

  let random = Math.random() * totalWeight
  for (const e of events) {
    random -= (e.Weight || 0)
    if (random <= 0) return e
  }
  return events[0]
}

/**
 * DOM选择器快捷函数
 * @param {string} selector - CSS选择器
 * @returns {HTMLElement} DOM元素
 */
function $(selector) {
  return document.getElementById(selector)
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadCSV,
    selectWordsByWeight,
    selectEventByWeight
  }
}
