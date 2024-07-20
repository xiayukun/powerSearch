import crypto from 'crypto'

export default function (req, res) {
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
}
