// 用于发送对象，会自动清理每个wechat_id下的数据，只保留20秒内的数据，或5分钟内最近数据
// 数据结构Map<wechat_id,Map<msgid,sendObj>>
export default class ClearSendMenu {
	constructor () {
		this.data = new Map()
		this.clearTime = new Date().getTime() // 清理时间戳，10s进行一次
		this.nowKey = {} // 记录每个微信最新的msgid
	}

	set (wechat_id, msgid, sendObj) {
		this.clear()
		if (!this.data.has(wechat_id)) {
			this.data.set(wechat_id, new Map())
		}
		sendObj.time = new Date().getTime()
		this.data.get(wechat_id).set(msgid, sendObj)
	}

	get (wechat_id, msgid) {
		this.clear()
		if (!this.data.has(wechat_id)) {
			return undefined
		}
		return this.data.get(wechat_id).get(msgid)
	}

	setBeforeMsg (wechat_id, msgid) {
		this.nowKey[wechat_id] = msgid
	}

	getBeforeMsg (wechat_id) {
		this.clear()
		if (!this.data.has(wechat_id)) {
			return undefined
		}
		return this.data.get(wechat_id).get(this.nowKey[wechat_id])
	}

	clear () {
		const nowTime = new Date().getTime()
		if (nowTime - this.clearTime < 10000) {
			// 小于10s不清理
			return
		}
		for (const [wechat_id, wechatMap] of this.data) {
			for (const [msgid, sendObj] of wechatMap) {
				if (nowTime - sendObj.time > 300000) {
					wechatMap.delete(msgid)
					continue
				}
				if (wechatMap.size > 1 && nowTime - sendObj.time > 20000 && msgid !== this.nowKey[wechat_id]) {
					wechatMap.delete(msgid)
					continue
				}
			}
			if (wechatMap.size === 0) {
				this.data.delete(wechat_id)
				delete this.nowKey[wechat_id]
			}
		}
		this.clearTime = nowTime
		$log(
			'-----------目前存储消息数量：',
			[...this.data.values()].reduce((i, n) => i + n.size, 0)
		)
	}
}
