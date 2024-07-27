// 会自动清理数据的对象,通过构造函数传入过期时间创建
export default class ClearItem {
	constructor (clear_time = 300) {
		this.clear_time = clear_time
		this.data = {}
	}

	get (key) {
		this.clearObject()
		if (this.data[key]) {
			return this.data[key].value
		}
		return undefined
	}

	set (key, value) {
		this.clearObject()
		this.data[key] = { time: new Date().getTime(), value }
	}

	// 手动删除
	delete (key) {
		delete this.data[key]
	}

	clearObject () {
		const now_time = new Date().getTime()
		for (const key in this.data) {
			if (this.data[key] && this.data[key] instanceof Object && this.data[key].datetime && now_time - this.data[key].datetime > this.clear_time) {
				delete this.data[key]
			}
		}
	}
}
