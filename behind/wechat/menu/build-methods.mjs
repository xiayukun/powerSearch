import { get_powers_by_wechat_id } from '../../sql/power.mjs'
import { sendMenu } from './index.mjs'

export async function build_power (menu, sendObj) {
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
