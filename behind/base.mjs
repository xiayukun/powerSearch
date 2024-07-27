import './sql/base.mjs'
import { async_fun } from './util/index.mjs'
import express from 'express'
import xmlparser from 'express-xml-bodyparser'
await async_fun()
import('./timeout.mjs')

global.$service = express()
$service.use(express.json())
$service.use(express.urlencoded())
$service.use(xmlparser())
$service.use(express.static('front'))

$service.use(async (req, res, next) => {
	$log(`接收到${req.method}请求`)
	// 打印请求的全路径
	$log(`${req.protocol}://${req.get('host')}${req.originalUrl}`)
	$log(`Query:${JSON.stringify(req.query)}`)
	$log(`Body:${JSON.stringify(req.body)}`)
	next() // 继续处理请求
})

// 错误处理中间件
$service.use((err, req, res, next) => {
	$log(err.stack)
	res.status(500).send('Something broke!')
})

import('./collect.mjs')

// 启动服务器并监听指定端口
const PORT = 16853
$service.listen(PORT, () => {
	$log(`启动服务，端口是 ${PORT}`)
})
