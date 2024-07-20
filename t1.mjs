import './behind/util/index.mjs'
import axios from 'axios'

const appid = 'wx4beb82ad3a7ef7ea'
const AppSecret = '489445659d7f2d342641256d31cda060'
// 获取access_token的URL
const accessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${AppSecret}`
const access_token = (await axios.get(accessTokenUrl)).data.access_token
$log('获取的access_token', access_token)
const test = await axios.post(`https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${access_token}`, {
	button: [
		{
			type: 'click',
			name: '查看剩余电费',
			key: '查看剩余电费'
		},
		{
			type: 'click',
			name: '管理电费账号',
			key: '管理电费账号'
		}
	]
})
console.log(test.data)
const test1 = await axios.get(`https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info?access_token=${access_token}`, {
	button: [
		{
			type: 'click',
			name: '查看剩余电费',
			key: '查看剩余电费'
		},
		{
			type: 'click',
			name: '管理电费账号',
			key: '管理电费账号'
		}
	]
})
debugger
console.log(test1.data)
