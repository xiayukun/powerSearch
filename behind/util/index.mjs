import moment from 'moment'
import xml2js from 'xml2js'
import axios from 'axios'
import cheerio from 'cheerio'

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
