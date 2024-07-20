import { select_power_id_all } from './sql/power.mjs'
import { countOneDay } from './util/count.mjs'
import { timeUntilNext710 } from './util/index.mjs'

// 定时任务
function timeTask () {
	setTimeout(async function () {
		$log('------开始定时任务执行---------')
		const power_ids = (await select_power_id_all())[0].map((i) => i.id)
		for (let i = 0; i < power_ids.length; i++) {
			const power_id = power_ids[i]
			try {
				await countOneDay(power_id)
			} catch (error) {
				$log(error)
			} finally {
				await $sleep(3000)
			}
		}
		$log('------结束定时任务执行---------')
		timeTask()
	}, timeUntilNext710())
}
timeTask()
