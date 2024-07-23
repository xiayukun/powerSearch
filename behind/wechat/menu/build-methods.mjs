import { createMessageByList, diffMenuNO } from '../../util/index.mjs'
import { get_powers_by_wechat_id } from '../../sql/power.mjs'
import { sendMenu } from './index.mjs'

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
		const activeList = powers.map((i, index) => ({ ...activeMenu, title: i.remark ? `${i.remark}(${i.power_id})` : i.power_id, bind_param_value: i.power_id, NO: diffMenuNO(Number(activeMenu.NO) + index, fixedList) }))
		sendObj.menu.list = [...fixedList, ...activeList]
		sendObj.content += activeMenu.title + '(5分钟有效)：\n'
		createMessageByList(sendObj)
	}
}
