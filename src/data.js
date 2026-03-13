// 数据加载模块

let baseAttr = null
let words = []
let events = []

/**
 * 加载所有游戏数据
 * @returns {Object} 包含baseAttr, words, events的对象
 */
function loadAllData() {
  try {
    const attrs = loadCSV('excel/S_玩家属性表.csv')
    if (attrs && attrs.length > 0) {
      baseAttr = attrs[0]
    } else {
      baseAttr = { Xiuyi: 0, Tipao: 0, Shouming: 0, Qiyun: 0, Yuanshen: 0 }
    }

    words = loadCSV('excel/C_出生词条表.csv') || []
    events = loadCSV('excel/S_事件表.csv') || []

    return {
      baseAttr,
      words,
      events
    }
  } catch (e) {
    console.error('配置加载错误:', e)
    throw new Error('配置加载失败：' + e.message)
  }
}

/**
 * 获取基础属性
 * @returns {Object} 基础属性对象
 */
function getBaseAttr() {
  return baseAttr
}

/**
 * 获取词条数组
 * @returns {Array} 词条数组
 */
function getWords() {
  return words
}

/**
 * 获取事件数组
 * @returns {Array} 事件数组
 */
function getEvents() {
  return events
}
