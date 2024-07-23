import moment from 'moment'
import xml2js from 'xml2js'
import { select_wechat_menu } from '../sql/wechat.mjs'

// 用于解析XML格式的请求和回复消息
global.builder = new xml2js.Builder({ rootName: 'xml', headless: true })
builder.buildObject2 = function (obj) {
	if (obj.Content) {
		$log(`向${obj.ToUserName}发送信息：\n`, obj.Content)
	}
	return builder.buildObject(...arguments)
}
global.$log = function () {
	// eslint-disable-next-line no-console
	console.log(moment().format('YYYY-MM-DD HH:mm:ss'), ...arguments)
}

// 延时执行
global.$sleep = function (time) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}
// 菜单首页缓存

global.$menu = (await select_wechat_menu())[0]

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
export function timeUntilNext710 () {
	const now = moment()
	const nextMorning = moment().startOf('day').add(7, 'hours').add(10, 'minutes')

	// 如果当前时间已经超过了今天的7:10，那么计算明天的7:10
	if (now > nextMorning) {
		nextMorning.add(1, 'day')
	}

	// 计算时间差
	const diff = nextMorning.diff(now)

	// 返回时间戳
	return diff
}

// // 区别动态生成的menu的NO，省的重复
// export async function diffMenuNO (activeMenu, menu) {
// 	const menuNo = menu.map((i) => i.NO)
// 	return activeMenu.map((i) => {
// 		while (!menuNo.includes(i.NO)) {
// 			i.NO++
// 		}
// 		return i
// 	})
// }

// 使用list整理要发送的消息
export async function createMessageByList (sendObj) {
	sendObj.menu.list
		.filter((i) => i.type !== 'text')
		.forEach((item) => {
			sendObj.content += `${item.NO}:${item.title}\n`
		})
	const textObj = sendObj.menu.list.find((i) => i === 'text')
	if (textObj) {
		sendObj.content += `${textObj.title}\n`
	}
}

// 根据parent_id获取菜单列表
export function getMenuByParentId (parent_id) {
	return global.$menu.filter((i) => String(i.parent_id) === String(parent_id))
}
