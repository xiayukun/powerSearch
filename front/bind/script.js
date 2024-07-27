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
		const msg = await res.text()
		if (!res.ok) {
			alert(msg)
			return
		}
		if (msg.length === 11) {
			document.getElementById('phone').value = msg
		}
	})
}
document.getElementById('switch').onclick = function (e) {
	const swi = document.getElementById('switch-section')
	swi.className = swi.className ? '' : 'active'
	if (swi.className) {
		document.getElementById('phone').style = ''
		document.getElementById('lowSMS').style = ''
	} else {
		document.getElementById('phone').style = 'display:none'
		document.getElementById('lowSMS').style = 'display:none'
	}
}
document.getElementById('submit').onclick = async () => {
	document.getElementById('submit').disabled = true
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
			openSMS: document.getElementById('switch-section').className ? 1 : 0,
			phone: document.getElementById('phone').value,
			lowSMS: document.getElementById('lowSMS').value,
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
	document.getElementById('submit').disabled = false
}
