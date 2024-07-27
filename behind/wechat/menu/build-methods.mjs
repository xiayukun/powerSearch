import { createMessageByList, diffMenuNO } from '../../util/index.mjs'
import { get_powers_by_wechat_id } from '../../sql/power.mjs'
import { sendMenu } from './index.mjs'
import { select_mapping_by_borrow_wechat_id } from '../../sql/wechat.mjs'
import moment from 'moment'

// 构建power_id动态菜单
export async function build_power ({ list, activeMenu }, sendObj) {
	const powers = (await get_powers_by_wechat_id(sendObj.wechat_id))[0]
	if (powers.length === 0) {
		sendObj.content += '您没有绑定电费账户，请先绑定。'
		sendObj.type = 'end'
		return true
	} else if (powers.length === 1) {
		// 只请求到一条数据，所以直接跳过本步。
		const me_menu_row = list.find((i) => i.type === 'active')
		const message_obj = {}
		message_obj.menu = { list: [{ ...me_menu_row, NO: 1, bind_param_value: powers[0].power_id }] }
		message_obj.type = 'menu'
		await sendMenu(sendObj, '1', message_obj)
	} else if (powers.length > 1) {
		const fixedList = list.filter((i) => i.id !== activeMenu.id)
		const activeList = powers.map((i, index) => ({ ...activeMenu, title: i.remark || i.power_id, bind_param_value: i.power_id, NO: diffMenuNO(Number(activeMenu.NO) + index, fixedList) }))
		sendObj.menu.list = [...fixedList, ...activeList]
		sendObj.content += activeMenu.title + '(5分钟有效)：\n'
		createMessageByList(sendObj)
	}
}
// 构建收回授权的动态菜单
export async function build_borrow ({ list, activeMenu }, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	const borrow_wechat_id = sendObj.wechat_id
	const mappdingList = (await select_mapping_by_borrow_wechat_id({ borrow_wechat_id, power_id }))[0]
	if (mappdingList.length === 0) {
		sendObj.content += '您没有授权出去的账户！'
		sendObj.type = 'end'
		return true
	} else {
		const fixedList = list.filter((i) => i.id !== activeMenu.id)
		const activeList = mappdingList.map((i, index) => ({
			...activeMenu,
			title: `${i.borrow_remark}(${moment(i.borrow_datetime).format('yyyy-MM-DD HH:mm')}授权)`,
			bind_param_value: i.wechat_id,
			NO: diffMenuNO(Number(activeMenu.NO) + index, fixedList)
		}))
		sendObj.menu.list = [...fixedList, ...activeList]
		sendObj.content += activeMenu.title + '(5分钟有效)：\n'
		createMessageByList(sendObj)
	}
}
