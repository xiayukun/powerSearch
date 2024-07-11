import './src/util/util.mjs'
import express from 'express'

const app = express()
const PORT = 16853

// 创建一个中间件来打印请求链接和请求头
app.use((req, res, next) => {
	$log(`请求来了: ${req.originalUrl}`, req.headers.host)
	next() // 继续处理请求
})
app.all('/*', (req, res) => {
	res.send(`请求来了: ${req.originalUrl}  ${req.headers.host}`)
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
	$log(`启动服务，端口是 ${PORT}`)
})
