import moment from 'moment'

export default class {
	/**
	 * 构造函数，初始化的时候填入数据，主要是config中的一些数据
	 */
	constructor (entityData) {
		this.entityData = entityData
		// 当前是否有人
		this.state = undefined
		// 是否假触发
		this.isFake = false
		this.entityData.listenList.forEach((listenData) => {
			this[listenData.entity_name] = listenData.entity_id
		})
	}

	listen (haData) {
		if (this.state === undefined) {
			// 第一次触发,直接根据传感器来
			if ($store[this.客厅传感器].stateList.now.state === 'on') {
				this.state = 'on'
				$log('客厅：', '【是否有人】：', '初始化状态：', '<客厅有人>')
			} else {
				this.state = 'off'
				$log('客厅：', '【是否有人】：', '初始化状态：', '<客厅无人>')
			}
		} else {
			// 先看下是什么触发的
			switch (haData.entity_id) {
				case this.客厅传感器:
					// 传感器需要判断是否是假触发
					if (haData.state === 'on') {
						if (this.state === 'on') {
							if (this.isFake) {
								this.isFake = false
								$log('客厅：', '【是否有人】：', '变为真触发(客厅传感器触发)：', '<客厅有人>')
							}
							return
						} else {
							// 如果当前是有人，那么看下卧室2米之内15s之内是否下来人了，或者厨房15s之内是否有人。如果有的话，那么就是真触发，否则就是假触发
							// 15s之内按照距离传感器最后一次，或者当前时间那个最前哪个为准
							const lastTime = [new Date().getTime() - 15000, moment($store[this.客厅传感器距离].stateList.now.last_updated).valueOf() - 15000].sort()[0]
							if (
								$store[this.卧室传感器距离].stateList.history.some((haData_1) => Number(haData_1.state) < 2 && moment(haData_1.last_updated).valueOf() > lastTime) ||
								$store[this.厨房传感器距离].stateList.history.some((haData_2) => Number(haData_2.state) < 2 && moment(haData_2.last_updated).valueOf() > lastTime)
							) {
								this.state = 'on'
								$log('客厅：', '【是否有人】：', '客厅传感器触发：', '<客厅有人>', ...(this.isFake === true ? ['（变为真触发）'] : []))
								this.isFake = false
							} else {
								if (this.isFake === false) {
									$log('客厅：', '【是否有人】：', '变为假触发(客厅传感器触发)：', '旁边传感器2m15s之内没人', '继续维持', '<客厅无人>')
								}
								this.isFake = true
								return
							}
						}
					} else {
						if (this.state === 'on') {
							// 如果没人，那么看下卧室2米之内15s之内是否有人，或者厨房15s之内是否有人。如果有的话，那么就是真触发，否则就是假触发
							// 15s之内按照距离传感器最后一次，或者当前时间那个最前哪个为准
							const lastTime = [new Date().getTime() - 15000, moment($store[this.客厅传感器距离].stateList.now.last_updated).valueOf() - 15000].sort()[0]
							if (
								$store[this.卧室传感器距离].stateList.history.some((haData_1) => Number(haData_1.state) < 2 && moment(haData_1.last_updated).valueOf() > lastTime) ||
								$store[this.厨房传感器距离].stateList.history.some((haData_2) => Number(haData_2.state) < 2 && moment(haData_2.last_updated).valueOf() > lastTime)
							) {
								this.state = 'off'
								$log('客厅：', '【是否有人】：', '客厅传感器触发：', '<客厅无人>', ...(this.isFake === true ? ['（变为真触发）'] : []))
								this.isFake = false
							} else {
								if (this.isFake === false) {
									$log('客厅：', '【是否有人】：', '变为假触发(客厅传感器触发)：', '旁边传感器2m15s之内没人', '继续维持', '<客厅有人>')
								}
								this.isFake = true
								return
							}
						} else {
							if (this.isFake) {
								this.isFake = false
								$log('客厅：', '【是否有人】：', '变为真触发(客厅传感器触发)：', '<客厅无人>')
							}
							return
						}
					}
					break
				case this.厨房传感器距离:
				case this.卧室传感器距离:
					// 厨房和卧室传感器距离只有一个作用，就是如果当前判定是假触发，那么距离在2米内，就变成真触发
					if (this.isFake === true) {
						if (Number(haData.state) < 2) {
							this.state = this.state === 'on' ? 'off' : 'on'
							$log('客厅：', '【是否有人】：', $store[haData.entity_id].entity_name + '触发：', this.state === 'on' ? '<客厅有人>' : '<客厅无人>', ...(this.isFake === true ? ['（变为真触发）'] : []))
							this.isFake = false
						} else {
							return
						}
					} else {
						return
					}
					break
			}
		}
		bus.emit({
			entity_id: this.entityData.entity_id,
			state: this.state
		})
	}
}
