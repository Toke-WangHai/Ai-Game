// UI渲染和更新模块

/**
 * 渲染词条列表
 * @param {Array} words - 词条数组
 * @param {Function} onWordClick - 词条点击回调函数
 */
function renderWords(words, onWordClick) {
  const wl = $('wordList')
  wl.innerHTML = ''
  words.forEach((w, i) => {
    const d = document.createElement('div')
    d.className = 'word-item'

    // 构建词条显示文本，包含数值说明
    let effectText = w.Name
    const attrs = []
    if (w.Xiuyi) attrs.push(`修为${w.Xiuyi > 0 ? '+' : ''}${w.Xiuyi}`)
    if (w.Tipao) attrs.push(`体魄${w.Tipao > 0 ? '+' : ''}${w.Tipao}`)
    if (w.Shouming) attrs.push(`寿命${w.Shouming > 0 ? '+' : ''}${w.Shouming}`)
    if (w.Qiyun) attrs.push(`气运${w.Qiyun > 0 ? '+' : ''}${w.Qiyun}`)
    if (w.Yuanshen) attrs.push(`元神${w.Yuanshen > 0 ? '+' : ''}${w.Yuanshen}`)

    if (attrs.length > 0) {
      effectText += ` (${attrs.join(', ')})`
    }

    d.innerText = effectText
    d.onclick = () => onWordClick(i, d)
    wl.appendChild(d)
  })
}

/**
 * 更新玩家属性显示
 * @param {Object} player - 玩家对象
 */
function updateUI(player) {
  $('xiuyi').innerText = player.Xiuyi
  $('tipao').innerText = player.Tipao
  $('shouming').innerText = player.Shouming
  $('qiyun').innerText = player.Qiyun
  $('yuanshen').innerText = player.Yuanshen
  $('age').innerText = player.age
}

/**
 * 添加日志
 * @param {string} text - 日志文本
 * @param {string} content - 附加内容
 */
function log(text, content = '') {
  const d = document.createElement('div')
  d.innerHTML = `<span>${text}</span> <span style="color:#f39c12">(${content})</span>`
  $('log').appendChild(d)
  $('log').scrollTop = $('log').scrollHeight
}

/**
 * 更新状态显示
 * @param {string} text - 状态文本
 * @param {string} color - 文本颜色
 */
function updateStatus(text, color = '#fff') {
  $('status').innerText = text
  $('status').style.color = color
}

/**
 * 显示词条选择面板
 */
function showWordPanel() {
  $('wordPanel').style.display = 'block'
}

/**
 * 隐藏词条选择面板
 */
function hideWordPanel() {
  $('wordPanel').style.display = 'none'
}

/**
 * 启用下一岁按钮
 */
function enableNextButton() {
  $('next').disabled = false
}

/**
 * 禁用下一岁按钮
 */
function disableNextButton() {
  $('next').disabled = true
}

/**
 * 显示重新重生按钮
 */
function showRebirthButton() {
  $('rebirth').style.display = 'inline-block'
}

/**
 * 隐藏重新重生按钮
 */
function hideRebirthButton() {
  $('rebirth').style.display = 'none'
}

/**
 * 清空日志
 */
function clearLog() {
  $('log').innerHTML = ''
}
