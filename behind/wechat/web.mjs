import { throlle } from '../util/index.mjs'
import axios from 'axios'
import { insert_mapping_wechat_power, insert_power, select_all_power_user_data_by_last_date, select_mappding_by_power_id_and_wechat_id } from '../sql/power.mjs'
import { FormData } from 'node-fetch'
import { select_is_bind_phone, select_wechat, update_phone_by_wechat_id } from '../sql/wechat.mjs'
import { countOneDay } from '../util/count.mjs'
import moment from 'moment'

// 绑定电费账户
export async function web_api_bind (req, res) {
	await throlle(res)
	const { wechat_id, username, password, remark, openSMS, phone, lowSMS } = req.body
	if (!wechat_id) {
		res.status(400).send('没有微信用户id')
		return
	}
	if (!username || !password) {
		res.status(400).send('请输入账号或密码')
		return
	}
	if (openSMS !== 0 && openSMS !== 1) {
		res.status(400).send('请告诉我是否开启短信通知')
		return
	}
	if (openSMS === 1) {
		if (!/^1\d{10}$/.test(phone)) {
			res.status(400).send('请输入正确的手机号')
			return
		}
		if (lowSMS && (isNaN(Number(lowSMS)) || lowSMS.includes('.') || Number(lowSMS) < 1 || Number(lowSMS) > 50)) {
			res.status(400).send('请输入正确的短信通知警戒值(1-50之间)不输入为20')
			return
		}
	}
	// 校验微信号是否存在
	const wechat_result = (await select_wechat(wechat_id))[0][0]
	if (!wechat_result) {
		res.status(400).send('未知的微信用户！')
		return
	}
	// 校验电费账户
	const formData = new FormData()
	formData.append('action', 'login')
	formData.append('UserName', username)
	formData.append('Password', password)
	const isLogin = await axios.post('http://www.langyuewy.com/PhoneAPI.ashx', formData)
	if (isLogin.data === '') {
		// res.status(400).send('未收到登录结果，可能是被物业限制了，请先前往物业公众号进行登录成功后，再进行绑定！')
		// return
	} else if (!isLogin.data || isLogin.data.code !== 1) {
		res.status(400).send('账号密码输入错误，请重新输入')
		return
	}
	const power_id = username
	// 查看电费账户和微信账户绑定情况
	const bind_result = (await select_mappding_by_power_id_and_wechat_id({ wechat_id, power_id }))[0]
	if (bind_result.some((i) => i.power_id === power_id && i.wechat_id === wechat_id)) {
		res.status(400).send('此账号已经被您绑定过啦！')
		return
	}
	if (bind_result.filter((i) => i.wechat_id === wechat_id).length >= wechat_result.BN) {
		res.status(400).send('因服务器性能原因，系统限制您最多绑定' + wechat_result.BN + '个账号！如还想绑定请向管理员咨询扩展！')
		return
	}
	const powerList = bind_result.filter((i) => i.power_id === power_id)
	if (powerList.length > 0 && powerList.length >= powerList[0].power_BN) {
		res.status(400).send('此账号已被' + powerList[0].power_BN + '个人绑定过啦！如还想绑定请向管理员咨询扩展！')
		return
	}
	// 先判断手机号一样不并且没有被别人绑定,不一样了就更新
	if (openSMS === 1 && phone !== bind_result.phone && (await select_is_bind_phone({ phone, wechat_id }))[0].length === 0) {
		await update_phone_by_wechat_id({ wechat_id, phone })
	}
	if (powerList.length === 0) {
		// 增加电费账户
		await insert_power(power_id)
		// 先填一天的电费数据
		try {
			let today
			if (moment().hour() < 7) {
				today = moment().add(-1, 'days').format('YYYY-MM-DD')
			} else {
				today = moment().format('YYYY-MM-DD')
			}
			await countOneDay((await select_all_power_user_data_by_last_date(power_id))[0][0], today)
		} catch (error) {
			res.status(400).send('系统报错，请联系管理员')
			throw error
		}
	}
	// 增加映射表
	await insert_mapping_wechat_power({ wechat_id, power_id, remark, openSMS, lowSMS: openSMS === 1 && lowSMS ? lowSMS : 20 })
	res.send('sucess')
}

//  校验微信号是否存在
export async function web_api_checkWechat (req, res) {
	await throlle(res)
	const wechat_id = req.body.wechat_id
	if (!req.body.wechat_id) {
		res.status(400).send('没有微信用户id')
		return
	}
	const wechat_result = (await select_wechat(wechat_id))[0][0]
	if (!wechat_result) {
		res.status(400).send('未知的微信用户！')
		return
	}
	res.send(String(wechat_result.phone) || 'success')
}

// 去往充值页面
export async function to_recharge (req, res) {
	if (!req.headers['user-agent'].includes('MicroMessenger')) {
		res.send('请在微信浏览器中打开')
		return
	}
	const uList = req.originalUrl.replace('/', '').split('/')
	const power_id = $rechargeUrl.get(uList[1])
	if (uList.length === 2 && uList[0] === 'recharge' && power_id) {
		res.redirect(`http://www.langyuewy.com/Login.aspx?userid=${power_id}`)
	} else {
		res.send('您的链接已过期，请重新生成')
	}
}
