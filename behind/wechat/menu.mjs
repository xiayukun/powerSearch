import moment from 'moment'
import { insert_wechat_send_history, select_children_menu_by_menu_id, select_wechat_send_history_by_wechat_id_5min } from '../sql/wechat.mjs'
import { get_powers_by_wechat_id, get_powers_day } from '../sql/power.mjs'
import { createMessageByList } from '../util/index.mjs'

// before_message是为了跳过的时候直接传递加入的
export default async function sendMenu (wechat_id, text, before_message, isNotSend) {
	// 创建本次发送的对象
	const sendObj = { wechat_id, type: 'menu', menu: { list: [] }, menu_params: {}, content: '' }
	if (!before_message) {
		// 获取5分钟之内上次发送的菜单
		before_message = (await select_wechat_send_history_by_wechat_id_5min(wechat_id))[0]
	}
	if (before_message.length === 0 || before_message[0].type === 'end') {
		// 如果没有5分钟内的对话记录，或者上次对话已经结束，就输出首页的菜单
		sendObj.menu.list = (await select_children_menu_by_menu_id(0))[0]
		sendObj.content += '请输入以下回复(5分钟有效)：\n'
		createMessageByList(sendObj)
	} else {
		// 现在情况只剩下type是menu的类型，有一个菜单列表供选择
		const beforeMenu = before_message[0].menu || {}
		const beforeParams = before_message[0].menu_params || {}
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
							createMessageByList(sendObj)
						}
					}
				}
			}
		}
	}
	// 存储数据发送消息
	!isNotSend && insert_wechat_send_history(sendObj)
	return sendObj
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
		Object.assign(sendObj, await sendMenu(sendObj.wechat_id, '1', [{ ...sendObj, type: 'menu', menu: { list: [{ ...me_menu_row, NO: 1, bind_param_value: powers[0].power_id }] } }]))
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
		sendObj.content += `您近${list.length}天的电量电费消耗情况如下：\n`
		sendObj.content += '日期    电量    金额\n'
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			sendObj.content += `${moment(item.date).format('MM-DD')} ${item.kwh} ${item.amount}\n`
		}
	} else {
		sendObj.content += '还未记录到您的电费消耗情况，可能绑定事件尚短，请明天再来看吧！'
	}
	sendObj.type = 'end'
	return false
}
// 打开电费充值页面
methods.power_recharge = async function (data) {}
