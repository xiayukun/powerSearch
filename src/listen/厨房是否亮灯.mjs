export default class {
	/**
	 * 构造函数，初始化的时候填入数据，主要是config中的一些数据
	 */
	constructor (entityData) {
		this.entityData = entityData
		// 当前是否亮灯
		this.state = undefined
		// 白天不关窗帘的时候关灯的时间，用来用亮度比较
		this.whiteOpen = false
		this.entityData.listenList.forEach((listenData) => {
			this[listenData.entity_name] = listenData.entity_id
		})
	}

	listen (haData) {
		if (this.state === undefined) {
			// 第一次触发,如果有人并且亮度不够、太阳落山、窗帘拉住，这几种情况下是开灯
			if (
				$store[this.厨房传感器].stateList.now.state === 'on' &&
				(Number($store[this.厨房亮度].stateList.now.state) < $config.brightness || $store[this.日落].stateList.now.state === 'below_horizon' || $store[this.布帘].stateList.now.state === 'closed')
			) {
				this.state = 'on'
				$log('厨房：', '【是否亮灯】：', '初始化状态：', '<<厨房开灯>>')
			} else {
				this.state = 'off'
				$log('厨房：', '【是否亮灯】：', '初始化状态：', '<<厨房关灯>>')
			}
		} else {
			// 先看下是什么触发的
			switch (haData.entity_id) {
				case this.日落:
				case this.纱帘:
					// 不用这个判断，只用来辅助判断
					return
				case this.布帘:
					// 布帘只有一种情况需要触发，那么就是白天的时候窗帘打开的时候，需要关灯(开灯用亮度触发就好了)
					if (this.state === 'on' && $store[this.日落].stateList.now.state !== 'below_horizon' && Number($store[this.厨房亮度].stateList.now.state) >= $config.brightness) {
						// 白天开灯状态
						if (this.whiteOpen) {
							return
						} else {
							this.state = 'off'
							$log('厨房：', '【是否亮灯】：', '白天开窗帘触发：', '<<厨房关灯>>')
						}
					} else {
						return
					}
					break
				case this.厨房传感器:
					if (this.state !== haData.state) {
						if (haData.state === 'on') {
							if (Number($store[this.厨房亮度].stateList.now.state) < $config.brightness) {
								// 亮度不够看下是不是白天
								if ($store[this.日落].stateList.now.state === 'below_horizon' || $store[this.布帘].stateList.now.state == 'closed') {
									// 晚上或者拉帘子了，那么就直接开灯
									this.state = 'on'
									$log('厨房：', '【是否亮灯】：', '有人触发：', '<<厨房开灯>>')
								} else {
									// 白天没关窗帘，判断一下是不是有白天开灯选项
									if (this.whiteOpen) {
										// 是的话，就开灯
										this.state = 'on'
										$log('厨房：', '【是否亮灯】：', '有人触发(白天并且白天开灯开启)：', '<<厨房开灯>>')
									} else {
										// 不是的话，开启白天开灯选项
										this.whiteOpen = true
										this.state = 'on'
										$log('厨房：', '【是否亮灯】：', '有人触发(当前是白天，但是亮度不够触发，1个小时内开灯)', '<<厨房开灯>>')
										// 1个小时候关闭
										setTimeout(() => {
											$log('厨房：', '白天开灯选项一个小时到期，已关闭')
											this.whiteOpen = false
										}, 60 * 60 * 1000)
									}
								}
							} else {
								return
							}
						} else {
							this.state = 'off'
							$log('厨房：', '【是否亮灯】：', '无人触发：', '<<厨房关灯>>')
						}
					} else {
						return
					}
					break
				case this.厨房亮度:
					if ($store[this.厨房传感器].stateList.now.state === 'on') {
						if (Number(haData.state) < $config.brightness) {
							if (this.state === 'on') {
								return
							} else {
								if ($store[this.日落].stateList.now.state === 'below_horizon' || $store[this.布帘].stateList.now.state == 'closed') {
									// 晚上或者拉帘子了，那么就直接开灯
									this.state = 'on'
									$log('厨房：', '【是否亮灯】：', '亮度不够触发：', '<<厨房开灯>>')
								} else {
									// 白天没关窗帘，判断一下上次关灯时间，如果10s内的，说明是因为白天才关灯的，那么现在就不能关了
									this.state = 'on'
									this.whiteOpen = true
									$log('厨房：', '【是否亮灯】：', '亮度不够触发(当前是白天，但是亮度不够触发，1个小时内开灯)', '<<厨房开灯>>')
									// 1个小时候关闭
									setTimeout(() => {
										$log('厨房：', '白天开灯选项一个小时到期，已关闭')
										this.whiteOpen = false
									}, 60 * 60 * 1000)
								}
							}
						} else {
							if (this.state === 'on') {
								if ($store[this.日落].stateList.now.state === 'below_horizon' || $store[this.布帘].stateList.now.state === 'closed') {
									// 如果日落了或者布帘拉住了那就不管
									return
								} else {
									// 白天开灯状态
									if (this.whiteOpen) {
										return
									} else {
										this.state = 'off'
										$log('厨房：', '【是否亮灯】：', '亮度足够触发(没有白天开灯选项)', '<<厨房关灯>>')
									}
								}
							} else {
								return
							}
						}
					} else {
						// 没人不管
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
