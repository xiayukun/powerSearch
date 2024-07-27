import crypto from 'crypto'
import { event_subscribe, event_unsubscribe, event_text, event_image } from './wechat/event.mjs'
import { to_recharge, web_api_bind, web_api_checkWechat } from './wechat/web.mjs'

$service.post1 = function (path, fun) {
	$service.post(path, async (req, res, next) => {
		try {
			await fun(req, res)
		} catch (e) {
			if (e.message === '系统繁忙') {
				$log('系统繁忙')
			} else {
				$log(e)
			}
		}
	})
}

$service.get('/', (req, res) => {
	if (req.query.echostr) {
		const signature = req.query.signature
		const timestamp = req.query.timestamp
		const nonce = req.query.nonce
		const echostr = req.query.echostr
		const token = '718170'
		const list = [token, nonce, timestamp].sort().join('')
		const sha1Str = crypto.createHash('sha1').update(list).digest('hex')
		if (sha1Str === signature) {
			$log('验证成功返回：', echostr)
			res.send(echostr)
		} else {
			$log('验证失败返回：', 'error')
			res.send('error')
		}
	} else {
		res.send('找我干啥？')
	}
})

$service.post1('/', (req, res) => {
	if (req.headers['content-type'] === 'text/xml' && req.body && req.body.xml && req.body.xml.msgtype && req.body.xml.msgtype.length === 1) {
		// 微信的xml通知
		const xml = req.body.xml
		if (xml.msgtype[0] === 'event') {
			// 监听事件
			if (xml.event && xml.event[0] === 'subscribe') {
				// 关注事件
				event_subscribe(req, res)
				return
			} else if (xml.event && xml.event[0] === 'unsubscribe') {
				// 取消关注事件
				event_unsubscribe(req, res)
				return
			}
		} else if (xml.msgtype[0] === 'text') {
			event_text(req, res)
			return
		} else if (xml.msgtype[0] === 'image') {
			event_image(req, res)
			return
		}
	}
	res.send('返回请求')
})

// 绑定账号
$service.post1('/api/bind', (req, res) => web_api_bind(req, res))
// 校验微信号是否存在
$service.post1('/api/check-wechat', (req, res) => web_api_checkWechat(req, res))
// 去往充值
$service.get('/recharge/*', (req, res) => to_recharge(req, res))
