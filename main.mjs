import './src/util/util.mjs'
import express from 'express'
import crypto from 'crypto'

const app = express()
const PORT = 16853

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

// 启动服务器并监听指定端口
app.listen(PORT, () => {
	$log(`启动服务，端口是 ${PORT}`)
})
