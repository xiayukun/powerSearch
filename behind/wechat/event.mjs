import { createMessageByList, getMenuByParentId } from '../util/index.mjs'
import { delete_wechat, insert_wechat, insert_wechat_event, delete_mapping_by_wechat, select_powerCount_by_wechat, delete_power_ids, insert_wechat_send_history, delete_mapping_by_wechat_borrow } from '../sql/wechat.mjs'
import getMenuBack from './menu/index.mjs'

// 关注
export function event_subscribe (req, res) {
	$log(`有人关注了：${req.body.xml.fromusername[0]}`)
	insert_wechat(req.body.xml)
	insert_wechat_event(req.body.xml)
	// 发送消息
	res.type('application/xml')
	const sendObj = { menu: { list: getMenuByParentId(0) }, content: '' }
	createMessageByList(sendObj)
	res.send(
		$builder.buildObject2({
			ToUserName: req.body.xml.fromusername[0],
			FromUserName: req.body.xml.tousername[0],
			CreateTime: new Date().getTime(),
			MsgType: 'text',
			Content:
				`悦都汇公寓电费提醒使用步骤：
一.绑定账户
二.开通短信提醒
三.快速充值(免密)
四.查询账单
五.自行探索
绑定地址：
https://mp.213132.xyz/bind/index.html?n=${req.body.xml.fromusername[0]}
或输入以下回复：\n` + sendObj.content
		})
	)
}
// 取消关注
export async function event_unsubscribe (req, res) {
	const wechat_id = req.body.xml.fromusername[0]
	$log(`有人取消关注了：${wechat_id}`)
	res.send('')
	insert_wechat_event(req.body.xml)
	await delete_mapping_by_wechat_borrow(wechat_id)
	const powerCount = await select_powerCount_by_wechat(wechat_id)
	await delete_mapping_by_wechat(wechat_id)
	const ids = powerCount[0].filter((i) => i.count === 1).map((i) => i.power_id)
	if (ids.length) {
		delete_power_ids(ids)
	}
	delete_wechat(req.body.xml)
}

// 文字消息
export async function event_text (req, res) {
	$log(`来文字消息了：${req.body.xml.content[0]}`)
	insert_wechat_event(req.body.xml)
	try {
		const sendObj = await getMenuBack(req)
		if (sendObj === false) {
			// 等待延时
			return
		}
		if (!sendObj || !sendObj.content) {
			throw Error('没有拉取到回复')
		}
		// 发送回复消息
		res.type('application/xml')
		res.send(
			$builder.buildObject2({
				ToUserName: req.body.xml.fromusername[0],
				FromUserName: req.body.xml.tousername[0],
				CreateTime: new Date().getTime(),
				MsgType: 'text',
				Content: sendObj.content
			})
		)
		// 存储数据
		insert_wechat_send_history(sendObj)
	} catch (error) {
		$log(error)
		res.send('error')
	}
}

// 图片消息
export function event_image (req, res) {
	$log(`来图片消息了：${req.body.xml.picurl[0]}`)
	// insert_wechat_event(req.body.xml)
	// // 发送回复消息
	// res.type('application/xml')
	// res.send(
	// 	$builder.buildObject2({
	// 		ToUserName: req.body.xml.fromusername[0],
	// 		FromUserName: req.body.xml.tousername[0],
	// 		CreateTime: new Date().getTime(),
	// 		MsgType: 'text',
	// 		Content: `你发${req.body.xml.picurl[0]}干嘛？找我干啥啊！`
	// 	})
	// )
}
