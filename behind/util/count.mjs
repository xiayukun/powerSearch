import moment from 'moment'
import axios from 'axios'
import cheerio from 'cheerio'
import { insert_power_day, insert_power_recharge, update_balance, update_power_sum } from '../sql/power.mjs'

// 计算一天的数据并填入
export async function countOneDay ({ power_id, update_date, recharge_datetime, day_date, kwh_sum, balance }, today, isTimeout) {
	if (moment(update_date).format('yyyy-MM-DD') !== today) {
		$log('###开始记录电费数据：', power_id)
		const data = await getPowerInfo(power_id)
		if (!data) {
			throw Error('没有请求到电费数据！')
		}
		if (!data.name || !data.balance || !data.kwh || isNaN(Number(data.balance)) || isNaN(Number(data.kwh))) {
			throw Error('电费数据有问题')
		}
		// 先更新今天的总电量和总金额
		await update_power_sum({ ...data, power_id, date: today })
		// 更新充值记录
		const addRechargeList = data.payList.filter((i) => !recharge_datetime || moment(recharge_datetime).isBefore(moment(i.datetime)))
		if (addRechargeList.length) {
			await insert_power_recharge(addRechargeList.map((i) => ({ ...i, power_id })))
		}
		// 判断上一次记录是否是昨天的
		if (update_date && moment(update_date).isBefore(moment(today)) && moment(update_date).add(1, 'days').isSame(moment(today)) && (!day_date || moment(day_date).isBefore(moment(update_date)))) {
			// 如果是昨天的，就开始计算昨天花了多少电和电费
			const yestday_kwh = Number((data.kwh - kwh_sum).toFixed(2))
			const yestday_amount = Number((balance - data.balance + addRechargeList.reduce((sum, i) => (sum += Number(i.amount)), 0)).toFixed(2))
			// 如果有充值，把充值的数值加上
			if (yestday_kwh >= 0 && yestday_amount >= 0) {
				if (yestday_kwh > 0 && yestday_amount > 0 && yestday_amount / yestday_kwh < 0.5 && yestday_amount / yestday_kwh > 0.8) {
					// 不为0 的时候，计算每度电费要在一定范围内
					throw Error('电费计算出错，计算获得的每度电费不对')
				}
				await insert_power_day({ power_id, date: moment(update_date).format('YYYY-MM-DD'), kwh: yestday_kwh, amount: yestday_amount })
			} else {
				throw Error('电费计算出错，值为负')
			}
		}
		$log('###结束记录电费数据：', power_id)
		isTimeout && (await $sleep(3000))
	} else {
		$log(power_id, '电费信息已经是最新了！')
	}
}
// 仅计算充值数据,返回是否更新充值数据
export async function refrshRecharge ({ power_id, recharge_datetime }) {
	$log('###开始更新充值记录：', power_id)
	const data = await getPowerInfo(power_id)
	if (!data) {
		throw Error('没有请求到电费数据！')
	}
	if (!data.name || !data.balance || !data.kwh || isNaN(Number(data.balance)) || isNaN(Number(data.kwh))) {
		throw Error('电费数据有问题')
	}
	// 更新充值记录和余额电量
	const addRechargeList = data.payList.filter((i) => !recharge_datetime || moment(recharge_datetime).isBefore(moment(i.datetime)))
	if (addRechargeList.length) {
		await update_balance({ power_id, balance: data.balance })
		await insert_power_recharge(addRechargeList.map((i) => ({ ...i, power_id })))
	}
	$log('###结束更新充值记录：', power_id)
	return addRechargeList.length > 0
}

// 获取物业电费信息
export async function getPowerInfo (power_id) {
	return axios
		.get('http://www.langyuewy.com/Login.aspx?userid=' + power_id, {
			withCredentials: true,
			maxRedirects: 0, // 不自动重定向
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
			}
		})
		.catch(async (error) => {
			if (error.response.headers['set-cookie'] && error.response.headers['set-cookie'][0] && error.response.headers['set-cookie'][0].includes('ASP.NET_SessionId')) {
				const str = error.response.headers['set-cookie'][0]
				if (str.split(';').length > 1 && str.split(';')[0].split('=').length > 1) {
					const key = str.split(';')[0].split('=')[1]
					const response = await axios.get('http://www.langyuewy.com/Pay_Info.aspx?code=10000&state=STATE', {
						withCredentials: true, // 设置为true以发送cookie
						headers: {
							Cookie: `ASP.NET_SessionId=${key}`
						}
					})
					// 请求成功时执行的代码
					const $ = cheerio.load(response.data)
					const name = $('#lbusername').text()
					const balance = Number($('#lbPRmb').text())
					const kwh = Number($('#lbusermeter').text())
					const payNum = $('#GridView1 tr').length - 1
					const payList = []
					for (let i = 0; i < payNum; i++) {
						const tdList = $('#GridView1 tr')
							.eq(i + 1)
							.find('td')
						payList.push({
							datetime: tdList
								.eq(1)
								.text()
								.split(' ')
								.map((item, index) =>
									item
										.split(index === 0 ? '/' : ':')
										.map((i) => (i.length === 1 ? `0${i}` : i))
										.join(index === 0 ? '-' : ':')
								)
								.join(' '),
							amount: Number(tdList.eq(2).text()),
							type: tdList.eq(3).text()
						})
					}
					return {
						name,
						balance,
						kwh,
						payList
					}
				}
			}
			return undefined
		})
}
