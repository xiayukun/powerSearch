import './src/util/util.mjs'
import axios from 'axios'

const appid = 'wx4beb82ad3a7ef7ea'
const AppSecret = '489445659d7f2d342641256d31cda060'
// 获取access_token的URL
const accessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${AppSecret}`
const access_token = (await axios.get(accessTokenUrl)).data.access_token
$log('获取的access_token', access_token)
const test = await axios.post(`https://api.weixin.qq.com/cgi-bin/openapi/quota/get?access_token=${access_token}`, {
	cgi_path: '/cgi-bin/clear_quota'
})
debugger
