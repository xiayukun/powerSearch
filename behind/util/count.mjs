import moment from 'moment'
import { insert_power_day, insert_power_recharge, select_near_power, update_power_sum } from '../sql/power.mjs'
import { getPowerInfo } from './index.mjs'

// 计算一天的数据并填入
export async function countOneDay (power_id) {
	$log('###开始记录电费数据：', power_id)
	const data = await getPowerInfo(power_id)
	if (!data) {
		throw Error('没有请求到电费数据！')
	}
	if (!data.name || !data.balance || !data.kwh || isNaN(Number(data.balance)) || isNaN(Number(data.kwh))) {
		throw Error('电费数据有问题')
	}
	const row = (await select_near_power(power_id))[0][0]
	const today = moment().format('YYYY-MM-DD')
	// 先更新今天的总电量和总金额
	await update_power_sum({ ...data, power_id, date: today })
	// 更新充值记录
	const addRechargeList = data.payList.filter((i) => !row.recharge_datetime || moment(row.recharge_datetime).isBefore(moment(i.datetime)))
	if (addRechargeList.length) {
		await insert_power_recharge(addRechargeList.map((i) => ({ ...i, power_id })))
	}
	// 判断上一次记录是昨天的
	if (row.update_date && moment(row.update_date).isBefore(moment(today)) && moment(row.update_date).add(1, 'days').isSame(moment(today)) && (!row.day_date || moment(row.day_date).isBefore(moment(row.update_date)))) {
		// 如果是昨天的，就开始计算昨天花了多少电和电费
		const yestday_kwh = Number((data.kwh - row.kwh_sum).toFixed(2))
		const yestday_amount = Number((row.balance - data.balance + addRechargeList.reduce((sum, i) => (sum += Number(i.amount)), 0)).toFixed(2))
		// 如果有充值，把充值的数值加上
		if (yestday_kwh >= 0 && yestday_amount >= 0) {
			if (yestday_kwh > 0 && yestday_amount > 0 && yestday_amount / yestday_kwh < 0.5 && yestday_amount / yestday_kwh > 0.8) {
				// 不为0 的时候，计算每度电费要在一定范围内
				throw Error('电费计算出错，计算获得的每度电费不对')
			}
			await insert_power_day({ power_id, date: moment(row.update_date).format('YYYY-MM-DD'), kwh: yestday_kwh, amount: yestday_amount })
		} else {
			throw Error('电费计算出错，值为负')
		}
	}
	$log('###结束记录电费数据：', power_id)
}
