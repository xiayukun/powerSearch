import moment from 'moment'
import xml2js from 'xml2js'
import { select_wechat_menu } from '../sql/wechat.mjs'
import ClearItem from './ClearItem.mjs'
import { select_config } from '../sql/power.mjs'
import * as winston from 'winston'
import 'winston-daily-rotate-file'

const transport = new winston.transports.DailyRotateFile({
	filename: '%DATE%.log',
	dirname: 'logs',
	maxSize: '20m',
	maxFiles: '30d',
	level: 'info'
})
const logger = winston.createLogger({
	transports: [transport]
})

// 用于解析XML格式的请求和回复消息
global.$builder = new xml2js.Builder({ rootName: 'xml', headless: true })
$builder.buildObject2 = function (obj) {
	if (obj.Content) {
		$log(`向${obj.ToUserName}发送信息：\n`, obj.Content)
	}
	return $builder.buildObject(...arguments)
}
global.$log = function () {
	logger.info([new Date().toLocaleTimeString(), ...arguments].join('     ').replaceAll('\n', '   ').replaceAll('\t', ' '))
}

// 延时执行
global.$sleep = function (time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}

export async function async_fun () {
	// 配置值
	global.$config = (await select_config())[0].reduce((obj, item) => ({ ...obj, [item.name]: item.value }), {})

	// 菜单缓存
	global.$menu = (await select_wechat_menu())[0]
}

// 充值链接随机值
global.$rechargeUrl = new ClearItem()

// 授权码随机值
global.$borrowCode = new ClearItem()

// 整理因前端输入原因，可能要更正的sql语句
export function format_sql (sql) {
	return sql.replaceAll('undefined', 'null').replaceAll('\'null\'', 'null')
}

// 1s只处理一次web请求
let beforeTime
export async function throlle (res) {
	if (beforeTime !== undefined && new Date().getTime() - beforeTime < 1000) {
		// 小于1s直接返回
		res.status(400).send('系统繁忙，请重试')
		throw Error('系统繁忙')
	}
	beforeTime = new Date().getTime()
}

// 查看理下次7:10还有多久
export function timeUntilNext (hours, minutes) {
	const now = moment()
	const nextMorning = moment().startOf('day').add(hours, 'hours').add(minutes, 'minutes')

	// 如果当前时间已经超过了今天的7:10，那么计算明天的7:10
	if (now > nextMorning) {
		nextMorning.add(1, 'day')
	}

	// 计算时间差
	const diff = nextMorning.diff(now)

	// 返回时间戳
	return diff
}

// 区别动态生成的menu的NO，省的重复
export function diffMenuNO (NO, menList) {
	const NO_list = menList.map((i) => String(i.NO))
	while (NO_list.includes(String(NO))) {
		NO = Number(NO) + 1
	}
	return NO
}

// 使用list整理要发送的消息
export async function createMessageByList (sendObj) {
	sendObj.menu.list
		.filter((i) => i.type !== 'text')
		.forEach((item) => {
			sendObj.content += `${item.NO}:${item.title}\n`
		})
	const textObj = sendObj.menu.list.find((i) => i.type === 'text')
	if (textObj) {
		sendObj.content += `>>>>${textObj.title}<<<<\n`
	}
}

// 根据parent_id获取菜单列表
export function getMenuByParentId (parent_id) {
	return global.$menu.filter((i) => String(i.parent_id) === String(parent_id)).sort((i, y) => i.sort - y.sort)
}

// 生成一个16位数字组成的字符串
export function generate16DigitNumber () {
	const digits = '0123456789'
	let number = ''
	for (let i = 0; i < 16; i++) {
		number += digits[Math.floor(Math.random() * digits.length)]
	}
	return number
}
