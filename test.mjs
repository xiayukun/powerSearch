import cheerio from 'cheerio'
import axios from 'axios'

axios
	.get('http://www.langyuewy.com/Login.aspx?userid=6010921', {
		withCredentials: true,
		maxRedirects: 0, // 不自动重定向
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
		}
	})
	.catch((error) => {
		if (error.response.headers['set-cookie'] && error.response.headers['set-cookie'][0] && error.response.headers['set-cookie'][0].includes('ASP.NET_SessionId')) {
			const str = error.response.headers['set-cookie'][0]
			if (str.split(';').length > 1 && str.split(';')[0].split('=').length > 1) {
				const key = str.split(';')[0].split('=')[1]
				console.log(key)
				axios
					.get('http://www.langyuewy.com/Pay_Info.aspx?code=10000&state=STATE', {
						withCredentials: true, // 设置为true以发送cookie
						headers: {
							Cookie: `ASP.NET_SessionId=${key}`
						}
					})
					.then((response) => {
						// 请求成功时执行的代码
						console.log('Response:', response.data)
						const $ = cheerio.load(response.data)
						const name = $('#lbusername').text()
						const balance = $('#lbPRmb').text()
						const kwh = $('#lbusermeter').text()
						const payNum = $('#GridView1 tr').length - 1
						const payList = []
						for (let i = 0; i < payNum; i++) {
							const tdList = $('#GridView1 tr')
								.eq(i + 1)
								.find('td')
							payList.push({
								date: tdList.eq(1).text(),
								money: tdList.eq(2).text(),
								type: tdList.eq(3).text()
							})
						}
						console.log(`您好，${name}。\n您的余额为：${balance}元。\n您的电表为：${kwh}度。\n您的缴费记录为：\n${payList.map((i) => i.date + '通过' + i.type + '缴费' + i.money + '元').join('\n')}`)
					})
			}
		}
	})
