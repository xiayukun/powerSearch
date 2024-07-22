import moment from 'moment'
import { insert_wechat_send_history, select_children_menu_by_menu_id } from '../sql/wechat.mjs'
import { get_powers_by_wechat_id, get_powers_day } from '../sql/power.mjs'
import { createMessageByList } from '../util/index.mjs'

// 缓存数据
const sendAll = {} // {wechat_id:{msgid:{},now_id:'msgid'}}
// 每过10s，清理一下过期数据
setInterval(() => {
	const now = moment()
	for (const wechat_id in sendAll) {
		for (const msgid in sendAll[wechat_id]) {
			const sendObj = sendAll[wechat_id][msgid]
			if (sendObj.isDone) {
				const seconds = now.diff(sendObj.datetime, 'seconds')
				if (seconds > 300 || (seconds > 20 && sendAll[wechat_id].now_id !== msgid)) {
					// 大于5分钟直接清理，或者大于20秒的，看看是不是最新的，不是最新的也清理
					delete sendAll[wechat_id][msgid]
				}
			}
		}
	}
}, 10000)
// 检测是否是重复发送消息，如果是的话，直接吧上次的结果返回出去
export default async function repeatEventMenu (req) {
	const wechat_id = req.body.xml.fromusername[0]
	sendAll[wechat_id] || (sendAll[wechat_id] = {})
	const msgid = req.body.xml.msgid[0]
	if (sendAll[wechat_id][msgid]) {
		$log('+++检测到消息重复发送')
		if (sendAll[wechat_id][msgid].isDone) {
			$log('+++已经把上次结果发过去了')
			sendAll[wechat_id].now_id = msgid
			return sendAll[wechat_id][msgid]
		} else {
			await $sleep(3000) // 等3s
			if (sendAll[wechat_id][msgid].isDone) {
				$log('+++已经把上次结果发过去了')
				sendAll[wechat_id].now_id = msgid
				return sendAll[wechat_id][msgid]
			} else {
				$log('---等了一会儿还是没生成结果，就算了')
				return false
			}
		}
	} else {
		// 创建本次发送的对象
		const sendObj = { wechat_id: req.body.xml.fromusername[0], type: 'menu', menu: { list: [] }, menu_params: {}, content: '', datetime: moment() }
		sendAll[wechat_id][msgid] = sendObj
		await sendMenu(sendObj, req.body.xml.content[0])
		sendAll[wechat_id].now_id = msgid
		sendObj.isDone = true
		// 存储数据
		insert_wechat_send_history(sendObj)
		return sendObj
	}
}

// before_message是为了跳过的时候直接传递加入的
async function sendMenu (sendObj, text, before_message) {
	const { wechat_id } = sendObj
	if (!before_message) {
		// 获取5分钟之内上次发送的菜单
		before_message = sendAll[sendObj.wechat_id] && sendAll[sendObj.wechat_id].now_id ? sendAll[sendObj.wechat_id][sendAll[sendObj.wechat_id].now_id] : undefined
	}
	if (!before_message || before_message.type === 'end') {
		// 如果没有5分钟内的对话记录，或者上次对话已经结束，就输出首页的菜单
		sendObj.menu.list = $mainMenu
		sendObj.content += '请输入以下回复(5分钟有效)：\n'
		createMessageByList(sendObj)
	} else {
		// 现在情况只剩下type是menu的类型，有一个菜单列表供选择
		const beforeMenu = before_message.menu || {}
		const beforeParams = before_message.menu_params || {}
		sendObj.menu_params = { ...sendObj.menu_params, ...beforeParams }
		if (beforeMenu.list.length === 0) {
			sendObj.content += '未找到上级菜单数据！请反馈管理员。'
			sendObj.type = 'end'
		} else {
			// 编号匹配
			let matchObj = beforeMenu.list.find((i) => ['fixed', 'active'].includes(i.type) && String(i.NO) === String(text))
			if (!matchObj) {
				// text类型匹配
				matchObj = beforeMenu.list.find((i) => i.type === 'text')
			}
			if (!matchObj) {
				// 没有匹配到所选
				sendObj.content += '未匹配到选择，请重新输入(5分钟有效)：\n'
				sendObj.menu.list = beforeMenu.list
				createMessageByList(sendObj)
			} else {
				// 匹配到选项
				if (matchObj.bind_param) {
					// 如果有绑定params,则把绑定值放进去
					sendObj.menu_params = { ...sendObj.menu_params, [matchObj.bind_param]: matchObj.type === 'text' ? text : matchObj.bind_param_value }
				}
				if (!matchObj.click_method || (await methods[matchObj.click_method](matchObj, sendObj)) !== false) {
					// 没有点击函数；或者有点击函数，但是点击函数返回true；继续流程
					// 获取子项目
					const children_menu_list = (await select_children_menu_by_menu_id(matchObj.id))[0]
					if (children_menu_list.length === 0) {
						sendObj.content += '未找到菜单数据！请反馈管理员。'
						sendObj.type = 'end'
					} else {
						const findActiveMenu = children_menu_list.find((i) => i.type === 'active')
						if (findActiveMenu) {
							// 如果有active类型，所有数据交由build_method去处理
							await methods[findActiveMenu.build_method]({ list: children_menu_list, wechat_id }, sendObj)
						} else {
							sendObj.content += '请输入以下回复(5分钟有效)：\n'
							sendObj.menu.list = children_menu_list
							createMessageByList(sendObj)
						}
					}
				}
			}
		}
	}
}
// 所有绑定在数据库中的函数
const methods = {}
methods.build_power = async function (menu, sendObj) {
	const powers = (await get_powers_by_wechat_id(sendObj.wechat_id))[0]
	if (powers.length === 0) {
		sendObj.content += '您没有绑定电费账户，请先绑定。'
		sendObj.type = 'end'
		return true
	} else if (powers.length === 1) {
		// 只请求到一条数据，所以直接跳过本步。
		const me_menu_row = menu.list.find((i) => i.type === 'active')
		const message_obj = {}
		message_obj.menu = { list: [{ ...me_menu_row, NO: 1, bind_param_value: powers[0].power_id }] }
		message_obj.type = 'menu'
		await sendMenu(sendObj, '1', message_obj)
	}
}
// 查询电费余额
methods.get_powers_balance = async function (data, sendObj) {
	const powers = (await get_powers_by_wechat_id(sendObj.wechat_id))[0]
	if (powers.length) {
		sendObj.content += '您绑定的电费账户余额如下：\n'
		for (let i = 0; i < powers.length; i++) {
			const item = powers[i]
			sendObj.content += `${item.remark || item.power_id}:
    余额：${item.balance}
    底度：${item.kwh_sum}
    更新日期：${moment(item.update_date).format('yyyy-MM-DD')}\n`
		}
	} else {
		sendObj.content += '未查到到您绑定的电费账户！'
	}
	sendObj.type = 'end'
	return false
}
// 查询电费详单
methods.get_power_detail = async function (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	const limit = sendObj.menu_params.limit || 30
	const list = (await get_powers_day({ power_id, limit }))[0]
	if (list.length) {
		let count_kwh = 0
		let count_amount = 0
		sendObj.content += '日期    电量    金额\n'
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			count_kwh += item.kwh
			count_amount += item.amount
			sendObj.content += `${moment(item.date).format('MM-DD')} ${item.kwh} ${item.amount}\n`
		}
		sendObj.content = `您近${list.length}天的电量消耗${count_kwh}度电费消耗情${count_amount}元。详情如下：\n` + sendObj.content
	} else {
		sendObj.content += '还未记录到您的电费消耗情况，可能绑定事件尚短，请明天再来看吧！'
	}
	sendObj.type = 'end'
	return false
}
// 打开电费充值页面
methods.power_recharge = async function (data) {}
