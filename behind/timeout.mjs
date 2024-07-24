import moment from 'moment'
import { select_all_power_user_data_by_last_date } from './sql/power.mjs'
import { countOneDay } from './util/count.mjs'
import { timeUntilNext710 } from './util/index.mjs'

// 定时任务
async function timeTask () {
	let today
	if (moment().hour() < 7) {
		today = moment().add(-1, 'days').format('YYYY-MM-DD')
	} else {
		today = moment().format('YYYY-MM-DD')
	}
	$log('------开始定时任务执行---------')
	const power_list = (await select_all_power_user_data_by_last_date())[0]
	// const power_ids = (await select_power_id_all())[0].map((i) => i.id)
	for (let i = 0; i < power_list.length; i++) {
		const power = power_list[i]
		try {
			await countOneDay(power, today, true)
		} catch (error) {
			$log(error)
		}
	}
	$log('------结束定时任务执行---------')
	setTimeout(function () {
		timeTask()
	}, timeUntilNext710())
}
timeTask()
