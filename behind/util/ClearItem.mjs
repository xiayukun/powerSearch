import moment from 'moment'

// 会自动清理数据的对象
export default class ClearItem {
	constructor (seconds = 300) {
		this.seconds = seconds
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
		this.data[key] = { datetime: moment(), value }
	}

	clearObject () {
		const now = moment()
		for (const key in this.data) {
			if (this.data[key] && this.data[key] instanceof Object && this.data[key].datetime && now.diff(this.data[key].datetime, 'seconds') > this.seconds) {
				delete this.data[key]
			}
		}
	}
}
