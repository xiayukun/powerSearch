import moment from 'moment'
import { createMessageByList, getMenuByParentId } from '../../util/index.mjs'
import * as buildMethods from './build-methods.mjs'
import * as clickMethods from './click-methods.mjs'

// 所有绑定在数据库中的函数
const methods = { ...buildMethods, ...clickMethods }

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
		if (sendObj.menu.list.length === 0 || sendObj.menu.list[0].parent_id !== 0) {
			sendObj.content += '\n----------------------\n'
			sendObj.content += '输入0返回主菜单'
		}
		sendObj.isDone = true
		return sendObj
	}
}

// 菜单查找主程序
// before_message是为了跳过的时候直接传递加入的
export async function sendMenu (sendObj, text, before_message) {
	// 输入0返回主菜单
	if (text === '0') {
		sendObj.menu.list = getMenuByParentId(0)
		sendObj.content += '请输入以下回复：\n'
		createMessageByList(sendObj)
		return
	}
	if (!before_message) {
		// 获取5分钟之内上次发送的菜单
		before_message = sendAll[sendObj.wechat_id] && sendAll[sendObj.wechat_id].now_id ? sendAll[sendObj.wechat_id][sendAll[sendObj.wechat_id].now_id] : undefined
	}
	if (!before_message || before_message.type === 'end') {
		// 如果没有5分钟内的对话记录，或者上次对话已经结束，就按照首页的菜单进行选择
		before_message = { menu: { list: getMenuByParentId(0) }, menu_params: {} }
	}
	// 根据输入判断菜单
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
			sendObj.content += '未匹配到选择，请重新输入：\n'
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
				const children_menu_list = getMenuByParentId(matchObj.id)
				if (children_menu_list.length === 0) {
					sendObj.content += '未找到菜单数据！请反馈管理员。'
					sendObj.type = 'end'
				} else {
					const activeMenu = children_menu_list.find((i) => i.type === 'active')
					if (activeMenu) {
						// 如果有active类型，所有数据交由build_method去处理
						await methods[activeMenu.build_method]({ list: children_menu_list, activeMenu }, sendObj)
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
