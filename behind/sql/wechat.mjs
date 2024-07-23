import { format_sql } from '../util/index.mjs'
import moment from 'moment'

// 查询微信账户
export function select_wechat (wechat_id) {
	return $pool.query2(
		format_sql(`
			SELECT
				*
			FROM
				wechat_user
			WHERE
				id = '${wechat_id}'
			`)
	)
}

// 插入微信监听记录
export function insert_wechat_event (data) {
	const fromusername = data.fromusername[0]
	const event_id = data.msgtype[0] === 'event' ? data.event[0] : data.msgtype[0]
	const datetime = moment().format('yyyy-MM-DD HH:mm:ss')
	const msgid = data.msgid ? data.msgid[0] : null
	const content = event_id === 'text' ? data.content[0] : event_id === 'image' ? data.picurl[0] : null
	return $pool
		.query2(
			format_sql(`
				INSERT INTO wechat_event (
					wechat_id,
					event_id,
					datetime,
					msgid,
					content
				)
				VALUES
					(
						'${fromusername}',
						'${event_id}',
						'${datetime}',
						'${msgid}',
						'${content}'
					)
		`)
		)
		.catch((e) => {
			$log(e)
		})
}

// 新增微信账户
export function insert_wechat (data) {
	const id = data.fromusername[0]
	const create_datetime = moment().format('yyyy-MM-DD HH:mm:ss')
	return $pool.query2(
		format_sql(`
			INSERT INTO wechat_user (id, create_datetime)
			VALUES
				('${id}', '${create_datetime}')
			ON DUPLICATE KEY UPDATE create_datetime='${create_datetime}';
		`)
	)
}

// 删除微信账户
export function delete_wechat (data) {
	const id = data.fromusername[0]
	return $pool.query2(
		format_sql(`
			DELETE
			FROM
				wechat_user
			WHERE
				id = '${id}'
			`)
	)
}

// 根据微信用户查询绑定电费账户的数量
export function select_powerCount_by_wechat (wechat_id) {
	return $pool.query2(
		format_sql(` 
			SELECT
				power_id,
				count(1) as count
			FROM
				mapping_wechat_power
			WHERE
				power_id IN (
					SELECT
						power_id
					FROM
						mapping_wechat_power
					WHERE
						wechat_id = '${wechat_id}'
				)
			GROUP BY
				power_id
			`)
	)
}

// 根据微信账户删除映射表
export function delete_mapping_by_wechat (wechat_id) {
	return $pool.query2(
		format_sql(`
			DELETE
			FROM
				mapping_wechat_power
			WHERE
				wechat_id = '${wechat_id}'
			`)
	)
}

// 删除电费账户
export function delete_power_ids (power_id_list) {
	return $pool.query2(
		format_sql(`
			DELETE
			FROM
				power_user
			WHERE
				id IN (${power_id_list.map((i) => `'${i}'`).join(',')})
			`)
	)
}
// // 根据微信id查询上次5分钟之内的发送记录
// export function select_wechat_send_history_by_wechat_id_5min (wechat_id) {
// 	return $pool.query2(
// 		format_sql(`
// 			SELECT
// 				*
// 			FROM
// 				wechat_send_history
// 			WHERE
// 				wechat_id = '${wechat_id}'
// 				AND type in ('menu','end')
// 				AND datetime >= NOW() - INTERVAL 5 MINUTE
// 			ORDER BY datetime DESC
// 			LIMIT 1;
// 			`)
// 	)
// }

// 获取所有menu
export function select_wechat_menu (menu_id) {
	return $pool.query2(
		format_sql(`
			SELECT
				*
			FROM
				wechat_menu
			`)
	)
}
// // 根据menu_id获取子菜单列表
// export function select_children_menu_by_menu_id (menu_id) {
// 	return $pool.query2(
// 		format_sql(`
// 			SELECT
// 				*
// 			FROM
// 				wechat_menu
// 			WHERE
// 				parent_id = ${menu_id}
// 			ORDER BY
// 				sort
// 			`)
// 	)
// }

// 增加微信发送记录
export function insert_wechat_send_history (sendObj) {
	return $pool.query2(
		format_sql(`
			INSERT INTO wechat_send_history (
				wechat_id,
				type,
				datetime,
				menu,
				menu_params,
				content
			)
			VALUES
				(
					'${sendObj.wechat_id}',
					'${sendObj.type}',
					'${moment().format('yyyy-MM-DD HH:mm:ss')}',
					'${JSON.stringify(sendObj.menu) || null}',
					'${JSON.stringify(sendObj.menu_params) || null}',
					'${sendObj.content || null}'
				)

			`)
	)
}
