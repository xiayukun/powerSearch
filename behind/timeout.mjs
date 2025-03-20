import moment from 'moment'
import { select_all_power_user_data_by_last_date } from './sql/power.mjs'
import { countOneDay, refrshRecharge } from './util/count.mjs'
import { timeUntilNext } from './util/index.mjs'
import { insert_wechat_SMS, select_all_need_send_sms } from './sql/wechat.mjs'
import handlerSendSMS from './util/sendSMS.mjs'

// 定时任务
async function powerRecord () {
	let today
	if (moment().hour() < 7) {
		today = moment().add(-1, 'days').format('YYYY-MM-DD')
	} else {
		today = moment().format('YYYY-MM-DD')
	}
	$log('------开始定时任务执行---------')
	const power_list = (await select_all_power_user_data_by_last_date())[0]
	let errNum = 0
	for (let i = 0; i < power_list.length; i++) {
		const power = power_list[i]
		try {
			await countOneDay(power, today, true)
		} catch (error) {
			$log(error)
			errNum++
		}
	}
	$log('------结束定时任务执行---------')
	if (errNum >= 5) {
		$log('========检测到多次记录电费错误，半小时后重试=========')
		setTimeout(function () {
			powerRecord()
		}, 30 * 60 * 1000)
	} else {
		setTimeout(function () {
			powerRecord()
		}, timeUntilNext(7, 30))
	}
}
powerRecord()
// 定时发短信
async function sendSMS () {
	setTimeout(async () => {
		$log('------开始定时发短信---------')
		// 获取要发送的列表
		const sendList = (await select_all_need_send_sms())[0]
		$log('+++++++++', sendList)
		const now_sendObj = {} // 现在已经发送的条数,防止一个微信号绑定了多个电费账号，刚好一起没电费，导致多发
		const isUpdateRechargeObj = {} // 是否已更新电费充值数据，因为powerid可能会被多人绑定，所以用这个变量做个校验
		for (let i = 0; i < sendList.length; i++) {
			let { wechat_id, power_id, recharge_datetime, sms_count, SMS, phone, remark, balance, low_SMS } = sendList[i]
			recharge_datetime = moment(recharge_datetime).format('yyyy-MM-DD HH:mm:ss')
			try {
				// 先更新电费账户充值记录
				if (isUpdateRechargeObj[power_id] === undefined) {
					// 电费账号最新的数据详情
					isUpdateRechargeObj[power_id] = await refrshRecharge({ power_id, recharge_datetime })
					await $sleep(3000)
				}
				if (isUpdateRechargeObj[power_id] === true) {
					// 如果更新了充值数据，说明已经充值过了，不用再去发短信了
					continue
				}
				sms_count = sms_count || 0
				// 判断是否有同一微信号多次发送
				if (now_sendObj[wechat_id] && now_sendObj[wechat_id] + sms_count >= SMS) {
					$log('反复发送，已禁止')
					continue
				}
				// 现在才开始发送短信
				const power_id_remark = remark ? `${remark}(${power_id})` : power_id
				await handlerSendSMS({ phone, power_id_remark, balance, SMS: SMS - sms_count - (now_sendObj[wechat_id] || 0) - 1, low_SMS })
				const message = `【悦服务查询】物业电费<${power_id_remark}>为${balance}，低于警戒值${low_SMS}，请尽快查看。本月剩余通知数量${SMS - sms_count - (now_sendObj[wechat_id] || 0) - 1}条，请知晓`
				$log('已发送短信：', phone, wechat_id, message)
				now_sendObj[wechat_id] = (now_sendObj[wechat_id] || 0) + 1
				// 添加发送记录
				await insert_wechat_SMS({ wechat_id, power_id, message, datetime: moment().format('yyyy-MM-DD HH:mm:ss') })
			} catch (error) {
				$log(error)
			}
		}
		$log('------结束发短信---------')
		sendSMS()
	}, timeUntilNext(12, 0))
}
sendSMS()
