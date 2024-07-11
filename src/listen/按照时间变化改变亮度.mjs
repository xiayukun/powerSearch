import moment from 'moment'

// 根据时间触发亮度变化
export default class {
	constructor (entityData) {
		this.entityData = entityData
		this.TimeLight = $config.TimeLight
		this.current_index = this.getLiuMingIndex()
		bus.emit({
			entity_id: this.entityData.entity_id,
			state: this.TimeLight[this.current_index].light
		})
		this.nextEmit()
	}

	nextEmit () {
		let nextTime
		if (this.TimeLight[this.current_index + 1]) {
			nextTime = moment(this.TimeLight[this.current_index + 1].time, 'HH:mm:ss').valueOf() - moment().valueOf() + 1000 // 加一秒的延迟
		} else {
			nextTime = moment(this.TimeLight[0].time, 'HH:mm:ss').add(1, 'days').valueOf() - moment().valueOf() + 1000 // 加一秒的延迟
		}
		setTimeout(() => {
			this.current_index = this.getLiuMingIndex()
			bus.emit({
				entity_id: this.entityData.entity_id,
				state: this.TimeLight[this.current_index].light
			})
			this.nextEmit()
		}, nextTime)
	}

	getLiuMingIndex () {
		const { TimeLight } = $config
		let index = 0
		for (let i = 1; i < TimeLight.length; i++) {
			const item = TimeLight[i]
			if (moment(item.time, 'HH:mm:ss').isBefore(moment())) {
				index = i
			} else {
				return index
			}
		}
		return index
	}
}
