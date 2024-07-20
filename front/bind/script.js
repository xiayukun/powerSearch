let error = ''
let query
try {
	query = location.search
		.replace('?', '')
		.split('&')
		.map((i) => ({ [i.split('=')[0]]: i.split('=')[1] }))
		.reduce((obj, item) => ({ ...obj, ...item }), {})
	if (!query.n) {
		error = '没有获取到参数，请关闭页面重新从微信公众号进入！'
		alert(error)
	}
} catch (e) {
	error = '没有获取到参数，请关闭页面重新从微信公众号进入！'
	alert(error)
}
if (!error) {
	fetch('/api/check-wechat', {
		headers: {
			'content-type': 'application/json'
		},
		method: 'post',
		body: JSON.stringify({
			wechat_id: query.n
		})
	}).then(async (res) => {
		if (!res.ok) {
			error = await res.text()
			alert(error)
		}
	})
}
document.getElementById('submit').onclick = async () => {
	if (error) {
		alert(error)
		return
	}
	const res = await fetch('/api/bind', {
		headers: {
			'content-type': 'application/json'
		},
		method: 'post',
		body: JSON.stringify({
			username: document.getElementById('username').value,
			password: document.getElementById('password').value,
			wechat_id: query.n,
			remark: document.getElementById('remark').value
		})
	})
	if (res.ok) {
		alert('绑定成功，请继续绑定或关闭本页面')
	} else {
		const msg = await res.text()
		alert(msg)
	}
}
