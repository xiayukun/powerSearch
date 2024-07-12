import './src/util/util.mjs'
import express from 'express'
import crypto from 'crypto'
import xml2js from 'xml2js'

const app = express()
const PORT = 16853
// 创建一个解析器
const parser = new xml2js.Parser({ explicitArray: false, explicitRoot: false })

// 创建一个中间件来打印请求链接和请求头
app.use(async (req, res, next) => {
	// 打印请求的全路径
	$log(`请求来了: ${req.protocol}://${req.get('host')}${req.originalUrl}`)
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
	$log('content-type', req.headers['content-type'])
	if (req.headers['content-type'] === 'application/xml') {
		// 解析XML请求体
		parser.parseString(req.body, (err, result) => {
			if (err) {
				// 解析错误处理
				$log('Error parsing XML:', err)
				return res.status(500).send('Error parsing XML')
			}
			// 将解析后的数据添加到req对象中，以便后续处理
			$log('接收到的消息为：', result)
		})
	}
	// 处理请求...
	res.send('返回请求')
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
	$log(`启动服务，端口是 ${PORT}`)
})
