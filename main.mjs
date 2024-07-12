import './src/util/util.mjs'
import express from 'express'
import crypto from 'crypto'
import xmlparser from 'express-xml-bodyparser'
import xml2js from 'xml2js'
// 用于解析XML格式的请求和回复消息
const builder = new xml2js.Builder({ rootName: 'xml', headless: true })

const app = express()
const PORT = 16853

app.use(express.json())
app.use(express.urlencoded())
app.use(xmlparser())

// 创建一个中间件来打印请求链接和请求头
app.use(async (req, res, next) => {
	// 打印请求的全路径
	$log(`请求来了: ${req.protocol}://${req.get('host')}${req.originalUrl}`, req.body)
	next() // 继续处理请求
})
app.get('/', (req, res) => {
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
})
app.post('/*', (req, res) => {
	$log('接收到post请求')
	// 处理请求...
	if (req.body && req.body.xml) {
		const xml = req.body.xml
		if (xml.msgtype && xml.msgtype[0] === 'text') {
		}
	}
	$log(req.body.xml.content[0])
	// parser.parseString(res.body, (_err, result) => {
	// 	// if (err) {
	// 	// 	return res.status(500).send('Error parsing XML')
	// 	// }
	// 	$log('_err', _err)
	// 	$log('result', result)
	// 	// const reply = builder.buildObject({
	// 	// 	xml: {
	// 	// 		ToUserName: result.xml.FromUserName,
	// 	// 		FromUserName: result.xml.ToUserName,
	// 	// 		CreateTime: new Date().getTime(),
	// 	// 		MsgType: 'text',
	// 	// 		Content: '感谢您的消息！' // 这里是回复给用户的消息内容
	// 	// 	}
	// 	// })
	// })
	res.send('返回请求')
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
	$log(`启动服务，端口是 ${PORT}`)
})
