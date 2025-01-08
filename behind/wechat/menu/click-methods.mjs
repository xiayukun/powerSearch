import { delete_mapping_by_borrow, delete_mapping_by_wechat_and_power, delete_power_ids, select_is_bind_phone, select_wechat, update_phone_by_wechat_id } from '../../sql/wechat.mjs'
import {
	delete_mapping_by_power_id_and_wechat_id,
	get_powers_and_wechat_by_two_id,
	get_powers_by_wechat_id,
	get_powers_day,
	insert_mapping_wechat_power,
	select_mappding_by_power_id_and_wechat_id,
	select_mapping_by_power_id,
	select_mapping_by_wechat_and_power_id,
	select_recharge_datetime_by_wechat_andOr_power,
	select_recharge_list_by_power_id,
	update_lowSMS_on_mapping,
	update_openSMS_on_mapping,
	update_remark_on_mapping
} from '../../sql/power.mjs'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'
import { generate16DigitNumber } from '../../util/index.mjs'
import { refrshRecharge } from '../../util/count.mjs'

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
    更新日期：${moment(item.update_date).format('yyyy-MM-DD')}\n\n`
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
		sendObj.content += '日期        电量        金额\n'
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			count_kwh += item.kwh
			count_amount += item.amount
			sendObj.content += `${moment(item.date).format('MM-DD')}       ${item.kwh}        ${item.amount}\n`
		}
		sendObj.content =
			`天数：${list.length}天
电量：${Number(count_kwh.toFixed(2))}度
电费：${Number(count_amount.toFixed(3))}元
----------------------
` + sendObj.content
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
	sendObj.content += `https://mp.213132.xyz/recharge/${uid}\n`
	sendObj.type = 'end'
	return false
}

// 去往绑定页面
export async function to_bind_power (data, sendObj) {
	sendObj.content += '请点击以下链接进行电费账户绑定：'
	sendObj.content += `https://mp.213132.xyz/bind/index.html?n=${sendObj.wechat_id}`
	sendObj.type = 'end'
	return false
}
// 管理账户增加title
export async function add_menu_title (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	const wechat_id = sendObj.wechat_id
	const wechatInfo = (await get_powers_and_wechat_by_two_id({ wechat_id, power_id }))[0][0]
	sendObj.menu_params.title = `当前账户：${wechatInfo.remark ? `${wechatInfo.remark}(${power_id})` : power_id}
短信提醒：${wechatInfo.openSMS === 1 ? '已开启' : '未开启'}${
	wechatInfo.openSMS === 1
		? `
短信额度：${wechatInfo.SMS}条
电费警戒：${wechatInfo.lowSMS}元`
		: ''
}
-----------------------`
}
// 修改备注
export async function update_power_remark (data, sendObj) {
	const { power_id, remark } = sendObj.menu_params
	if (!power_id || !remark) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	if (remark.length > 5) {
		sendObj.content += '>>>>备注最多支持5个字符！请重新输入<<<<\n'
		sendObj.menu.list = [data]
		sendObj.type = 'menu'
		return false
	}
	const wechat_id = sendObj.wechat_id
	await update_remark_on_mapping({ power_id, remark, wechat_id })
	sendObj.content = '>>>>备注修改成功！<<<<'
	sendObj.type = 'end'
	return false
}
// 开启/关闭短信通知
export async function update_power_openSMS (data, sendObj) {
	const { power_id, openSMS } = sendObj.menu_params
	if (!power_id || !openSMS) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	const wechat_id = sendObj.wechat_id
	if (String(openSMS) === '1' && !(await select_wechat(wechat_id))[0][0].phone) {
		sendObj.content += '您没有绑定手机号，无法开启短信通知，请先绑定手机号！'
		sendObj.type = 'end'
		return false
	}
	await update_openSMS_on_mapping({ power_id, openSMS, wechat_id })
	sendObj.content = `>>>>已${String(openSMS) === '1' ? '开启' : '关闭'}短信通知<<<<`
	sendObj.type = 'end'
	return false
}
// 修改短信通知限制
export async function update_power_lowSMS (data, sendObj) {
	const { power_id, lowSMS } = sendObj.menu_params
	if (!power_id || !lowSMS) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	if (isNaN(Number(lowSMS)) || lowSMS.includes('.') || Number(lowSMS) < 1 || Number(lowSMS) > 50) {
		sendObj.content += 'xxxx请重新输入正确的数字(1-50之间)xxxx\n'
		sendObj.menu.list = [data]
		sendObj.type = 'menu'
		return false
	}
	const wechat_id = sendObj.wechat_id
	await update_lowSMS_on_mapping({ power_id, lowSMS, wechat_id })
	sendObj.content = `>>>>已修改为当电费低于${lowSMS}元的时候会给您短信通知<<<<`
	sendObj.type = 'end'
	return false
}
// 修改手机号增加title
export async function add_phone_title (data, sendObj) {
	const wechat_id = sendObj.wechat_id
	const wechatInfo = (await select_wechat(wechat_id))[0][0]
	sendObj.menu_params.title = `${!wechatInfo.phone ? '您当前没有绑定手机号，请绑定\n' : `您当前绑定的手机号是${wechatInfo.phone}\n`}`
}
// 修改手机号
export async function update_phone (data, sendObj) {
	const { phone } = sendObj.menu_params
	if (!phone) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	if (!/^1\d{10}$/.test(phone)) {
		sendObj.content += 'xxxx请输入正确的手机号xxxx\n'
		sendObj.menu.list = [data]
		sendObj.type = 'menu'
		return false
	}
	const wechat_id = sendObj.wechat_id
	if ((await select_is_bind_phone({ phone, wechat_id }))[0].length > 0) {
		sendObj.content = 'xxxx此手机号已被别的用户绑定！请重新输入一个手机号吧！xxxx\n'
		sendObj.menu.list = [data]
		sendObj.type = 'menu'
		return false
	}
	await update_phone_by_wechat_id({ wechat_id, phone })
	sendObj.content = `>>>>已修改通知手机号为：${phone}，您可以输入《6.更多(短信、账户)》去开启短信通知。<<<<`
	sendObj.type = 'end'
	return false
}
// 解除绑定电费账号
export async function unbind_power (data, sendObj) {
	const { power_id, unbind } = sendObj.menu_params
	if (!unbind || !power_id) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	if (String(unbind) !== '99') {
		sendObj.content += '>>>>您未输入99，已取消操作<<<<\n'
		sendObj.type = 'end'
		return false
	}

	const wechat_id = sendObj.wechat_id
	await delete_mapping_by_wechat_and_power({ borrow_wechat_id: wechat_id, power_id })
	await delete_mapping_by_power_id_and_wechat_id({ wechat_id, power_id })
	if ((await select_mapping_by_power_id(power_id))[0].length > 0) {
		sendObj.content = '>>>>已成功解除绑定！因还有其他人绑定此账户，所以未清空数据，待无人绑定的时候会清除数据<<<<\n'
		sendObj.type = 'end'
		return false
	}
	await delete_power_ids([power_id])
	sendObj.content = '>>>>已成功解除绑定！并已清除数据！<<<<\n'
	sendObj.type = 'end'
	return false
}
// 查询充值记录
export async function get_power_recharge (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	const limit = sendObj.menu_params.limit || 30
	const list = (await select_recharge_list_by_power_id({ power_id, limit }))[0]
	if (list.length) {
		let count_amount = 0
		sendObj.content += '   日期                      充值金额\n'
		for (let i = 0; i < list.length; i++) {
			const item = list[i]
			count_amount += item.amount
			sendObj.content += `${moment(item.datetime).format('yyyy-MM-DD HH:mm')}        ${item.amount}\n`
		}
		const duration = moment.duration(moment().diff(list[list.length - 1].datetime))
		const diff_years = duration.years()
		const diff_months = duration.months()
		const diff_days = duration.days()
		sendObj.content = `您近${diff_years > 0 ? diff_years + '年' : ''}${diff_months > 0 ? diff_months + '个月' : ''}${diff_days}天中充值${list.length}次，共充值了${Number(count_amount.toFixed(2))}元。详情如下：\n` + sendObj.content
	} else {
		sendObj.content += '还未记录到您的充值记录！'
	}
	sendObj.type = 'end'
	return false
}
// 校验是否可以授权
export async function borrow_vail (data, sendObj) {
	const power_id = sendObj.menu_params.power_id
	if (!power_id) {
		sendObj.content += '未查找到电费账户参数，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	const wechat_id = sendObj.wechat_id
	const mappingInfo = (await select_mapping_by_wechat_and_power_id({ power_id, wechat_id }))[0][0]
	if (mappingInfo.borrow_wechat_id) {
		delete sendObj.menu_params.title
		sendObj.content += '>>>>此账户已经是被授权账户，无法再授权给别人，如果想授权给别人，请先解除绑定后通过账号密码绑定后再进行操作<<<<'
		sendObj.type = 'end'
		return false
	}
}
// 开启授权流程
export async function borrow (data, sendObj) {
	const { power_id, borrow_remark } = sendObj.menu_params
	if (!borrow_remark || !power_id) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	const borrow_wechat_id = sendObj.wechat_id
	const uid = generate16DigitNumber()
	$borrowCode.set(uid, { borrow_wechat_id, borrow_remark, power_id })
	sendObj.content += `请把以下消息码发送给被授权人<${borrow_remark}>，被授权人<${borrow_remark}>关注此公众号后，在对话框中输入此消息码即可进行绑定（5分钟内有效）：\n`
	sendObj.content += '\n' + uid + '\n'
	sendObj.type = 'end'
	return false
}
// 确认接受授权
export async function handlerBorrow (text, sendObj) {
	const { borrow_wechat_id, borrow_remark, power_id } = $borrowCode.get(text)
	const wechat_id = sendObj.wechat_id
	// 查看电费账户和微信账户绑定情况
	if (borrow_wechat_id === wechat_id) {
		sendObj.content = '>>>>您无法接收自己的授权码！<<<<'
		sendObj.type = 'end'
		return false
	}
	const bind_result = (await select_mappding_by_power_id_and_wechat_id({ wechat_id, power_id }))[0]
	if (bind_result.some((i) => i.power_id === power_id && i.wechat_id === wechat_id)) {
		sendObj.content = `>>>>此账号<${power_id}>已经被您绑定过了！<<<<`
		sendObj.type = 'end'
		return false
	}
	const powerList = bind_result.filter((i) => i.power_id === power_id)
	if (powerList.length > 0 && powerList.length >= powerList[0].power_BN) {
		sendObj.content = `\n此账号已被${powerList[0].power_BN}个人绑定过啦！如还想绑定请向管理员咨询扩展！\n`
		sendObj.type = 'end'
		return false
	}
	const wechat_result = (await select_wechat(wechat_id))[0][0]
	if (bind_result.filter((i) => i.wechat_id === wechat_id).length >= wechat_result.BN) {
		sendObj.content = `\n因服务器性能原因，系统限制您最多绑定${wechat_result.BN}个账号！如还想绑定请向管理员咨询扩展！\n`
		sendObj.type = 'end'
		return false
	}
	// 增加映射表
	await insert_mapping_wechat_power({ wechat_id, power_id, lowSMS: 20, openSMS: wechat_result.phone ? 1 : 0, borrow_wechat_id, borrow_remark, borrow_datetime: moment().format('yyyy-MM-DD HH:mm:ss') })
	sendObj.content = `\n>>>>已成功绑定<${power_id}>\n因您手机号${
		wechat_result.phone ? '已绑定，所以为您自动开启了短信通知，每当此账户余额低于20元的时候，会收到通知短信！' : '还未绑定，所以未开启短信提醒等功能，您可以前往主菜单《修改短信通知手机号》去绑定手机号后开启短信通知。'
	}<<<<\n`
	sendObj.type = 'end'
	$borrowCode.delete(text)
	return false
}
// 收回授权
export async function recovery (data, sendObj) {
	const { power_id, recovery_wechat_id, unbind } = sendObj.menu_params
	if (!recovery_wechat_id || !power_id || !unbind) {
		sendObj.content += '参数错误，请联系管理员！'
		sendObj.type = 'end'
		return false
	}
	if (String(unbind) !== '99') {
		sendObj.content += '>>>>您未输入99，已取消操作<<<<\n'
		sendObj.type = 'end'
		return false
	}
	delete sendObj.menu_params.title
	const borrow_wechat_id = sendObj.wechat_id
	await delete_mapping_by_borrow({ power_id, borrow_wechat_id, wechat_id: recovery_wechat_id })
	sendObj.content += '>>>>已成功收回授权！<<<<<'
	sendObj.type = 'end'
	return false
}
// 刷新余额和充值记录
export async function refresh_power (data, sendObj) {
	const { power_id } = sendObj.menu_params
	const { wechat_id } = sendObj
	const list = (await select_recharge_datetime_by_wechat_andOr_power({ wechat_id, power_id }))[0]
	for (let i = 0; i < list.length; i++) {
		await refrshRecharge(list[i])
	}
	sendObj.content += '>>>>余额和充值记录更新成功！<<<<<\n'
	sendObj.type = 'end'
	return false
	// if (power_id) {
	// 	await get_power_recharge(data, sendObj)
	// } else {
	// 	await get_powers_balance(data, sendObj)
	// }
}
