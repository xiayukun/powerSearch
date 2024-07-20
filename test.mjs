import { getPowerInfo } from './behind/util/index.mjs'

setInterval(async () => {
	const res = await getPowerInfo('6010921')
	$log(res.balance, res.kwh)
}, 60 * 1000)
