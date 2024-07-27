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
// 增加微信发送记录
export function insert_wechat_send_history (sendObj) {
	return $pool.query2(
		format_sql(`
			INSERT INTO wechat_send_history (
				wechat_id,
				type,
				datetime,
				content
			)
			VALUES
				(
					'${sendObj.wechat_id}',
					'${sendObj.type}',
					'${moment().format('yyyy-MM-DD HH:mm:ss')}',
					'${sendObj.content || null}'
				)
			`)
	)
}
// 修改手机号
export function update_phone_by_wechat_id ({ wechat_id, phone }) {
	return $pool.query2(format_sql(`update wechat_user set phone='${phone}' where id='${wechat_id}'`))
}
// 获取本人授权电费账户
export function select_mapping_by_borrow_wechat_id ({ borrow_wechat_id, power_id }) {
	return $pool.query2(format_sql(`select * from mapping_wechat_power where borrow_wechat_id='${borrow_wechat_id}' and power_id='${power_id}'`))
}
// 删除授权
export function delete_mapping_by_borrow ({ borrow_wechat_id, wechat_id, power_id }) {
	return $pool.query2(format_sql(`delete from mapping_wechat_power where borrow_wechat_id='${borrow_wechat_id}' and wechat_id='${wechat_id}' and power_id='${power_id}'`))
}
// 根据微信用户删除授权
export function delete_mapping_by_wechat_borrow (borrow_wechat_id) {
	return $pool.query2(format_sql(`delete from mapping_wechat_power where borrow_wechat_id='${borrow_wechat_id}'`))
}
// 根据微信用户和电费账户删除授权
export function delete_mapping_by_wechat_and_power ({ borrow_wechat_id, power_id }) {
	return $pool.query2(format_sql(`delete from mapping_wechat_power where borrow_wechat_id='${borrow_wechat_id}' and power_id='${power_id}'`))
}
// 填入发送短信
export function insert_wechat_SMS ({ wechat_id, power_id, message, datetime }) {
	return $pool.query2(
		format_sql(`
			INSERT into wechat_sms(wechat_id,power_id,message,datetime) values('${wechat_id}','${power_id}','${message}','${datetime}')
		`)
	)
}
// 查出来所有需要发短信的
export function select_all_need_send_sms () {
	return $pool.query2(
		format_sql(`
			select mwp.wechat_id, mwp.power_id, recharge_datetime, sms_count, SMS, phone, remark, balance, lowSMS as low_SMS from mapping_wechat_power mwp
			INNER JOIN wechat_user wu on mwp.wechat_id=wu.id
			INNER JOIN power_user pu on mwp.power_id = pu.id
			LEFT JOIN(
				SELECT power_id,MAX(datetime) as recharge_datetime
				FROM power_recharge 
				GROUP BY power_id
			) pr on pr.power_id=mwp.power_id
			LEFT JOIN(
				select wechat_id,power_id,MAX(datetime) as sms_datetime from wechat_sms group by wechat_id,power_id
			) smsd on smsd.power_id=mwp.power_id and smsd.wechat_id=mwp.wechat_id
			LEFT JOIN(
				select wechat_id,count(1) as sms_count from wechat_sms where YEAR (datetime) = YEAR (CURDATE()) AND MONTH (datetime) = MONTH (CURDATE()) group by wechat_id
			) smsc on  smsc.wechat_id=mwp.wechat_id
			where openSMS=1 and LENGTH(phone)=11 and lowSMS>balance and (sms_count is null or sms_count<SMS) and (sms_datetime is null or recharge_datetime> sms_datetime)
		`)
	)
}
// 查询手机号是否被绑定
export function select_is_bind_phone ({ phone, wechat_id }) {
	return $pool.query2(
		format_sql(`
			select 1 from wechat_user  where phone='${phone}' and id<>'${wechat_id}'
		`)
	)
}
