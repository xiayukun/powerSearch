import { get_powers_by_wechat_id, get_powers_day } from '../../sql/power.mjs'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'

// 查询电费余额
export async function get_powers_balance (data, sendObj) {
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
export async function get_power_detail (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
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
		sendObj.content = `您近${list.length}天的电量消耗${Number(count_kwh.toFixed(2))}度，电费消耗${Number(count_amount.toFixed(3))}元。详情如下：\n` + sendObj.content
	} else {
		sendObj.content += '还未记录到您的电费消耗情况，可能绑定时间尚短，请明天再来看吧！'
	}
	sendObj.type = 'end'
	return false
}
// 打开电费充值页面
export async function power_recharge (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	const uid = uuidv4()
	$rechargeUrl.set(uid, power_id)
	sendObj.content += '未避免您的账户地址被滥用，已对链接进行加密，并进行登入时间限制。请点击以下链接进行跳转,5分钟内有效：\n'
	sendObj.content += `https://mp.xiayukun.asia/recharge/${uid}\n`
	sendObj.type = 'end'
	return false
}
