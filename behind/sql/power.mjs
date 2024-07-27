import { format_sql } from '../util/index.mjs'

// 查看电费账户和微信账户绑定情况
export async function select_mappding_by_power_id_and_wechat_id ({ power_id, wechat_id }) {
	return $pool.query2(
		format_sql(`
			select wechat_id,power_id,BN as power_BN from mapping_wechat_power 
			LEFT JOIN power_user on power_user.id=mapping_wechat_power.power_id 
			where power_id='${power_id}' or wechat_id='${wechat_id}'
		`)
	)
}

// 增加电费账户
export async function insert_power (power_id) {
	return $pool.query2(
		format_sql(`
			INSERT INTO power_user (id)
			VALUES
				('${power_id}')
			ON DUPLICATE KEY UPDATE id='${power_id}';
		`)
	)
}

// 增加微信用户和电费账户的映射表
export async function insert_mapping_wechat_power ({ wechat_id, power_id, remark, openSMS, lowSMS, borrow_wechat_id, borrow_remark, borrow_datetime }) {
	return $pool.query2(
		format_sql(`
			INSERT INTO mapping_wechat_power (wechat_id, power_id, remark, openSMS, lowSMS, borrow_wechat_id, borrow_remark, borrow_datetime)
			VALUES
				('${wechat_id}', '${power_id}','${remark || null}',${openSMS},${lowSMS}, '${borrow_wechat_id}', '${borrow_remark}', '${borrow_datetime}');
		`)
	)
}
// 查询账户表中所有账户的账户详情、最新的日统计、最新的充值记录
export async function select_all_power_user_data_by_last_date (power_id) {
	return $pool.query2(
		format_sql(`
			SELECT pu.id AS power_id, pu.balance, pu.kwh_sum, pu.update_date, pd.date AS day_date, pd.kwh AS day_kwh, pd.amount AS day_amount, pr.datetime AS recharge_datetime, pr.amount AS amount
			FROM power_user pu
			LEFT JOIN (
				SELECT t1.power_id,t1.date, t1.kwh, t1.amount
				FROM power_day t1
				INNER JOIN (SELECT power_id,MAX(date) AS max_date FROM power_day GROUP BY power_id) AS t2 ON t1.power_id = t2.power_id AND t1.date = t2.max_date
			) pd ON pu.id = pd.power_id
			LEFT JOIN (
				SELECT t1.power_id, t1.datetime, t1.amount 
				FROM power_recharge t1 
				INNER JOIN (SELECT power_id, MAX(datetime) AS max_datetime FROM power_recharge GROUP BY power_id) AS t2 ON t1.power_id = t2.power_id AND t1.datetime = t2.max_datetime
			) pr ON pr.power_id = pu.id
			${power_id ? `WHERE pu.id = '${power_id}'` : ''}
		`)
	)
}

// 更新用户表的电费
export async function update_power_sum (obj) {
	return $pool.query2(
		format_sql(`
			UPDATE power_user
			SET balance = ${obj.balance},
			kwh_sum = ${obj.kwh},
			update_date = '${obj.date}'
			WHERE
				id = '${obj.power_id}'
			`)
	)
}
// 只更新用户表的余额
export async function update_balance (obj) {
	return $pool.query2(
		format_sql(`
			UPDATE power_user
			SET balance = ${obj.balance}
			WHERE
				id = '${obj.power_id}'
			`)
	)
}
// 插入充值记录
export async function insert_power_recharge (list) {
	return $pool.query2(
		format_sql(`
			INSERT INTO power_recharge (power_id, datetime, amount)
			VALUES 
				${list.map((i) => `('${i.power_id}','${i.datetime}',${i.amount})`).join(',')}
			`)
	)
}
// 插入每日消耗记录
export async function insert_power_day (data) {
	return $pool.query2(
		format_sql(`
			INSERT INTO power_day (power_id, date, kwh, amount)
			VALUES
				('${data.power_id}', '${data.date}', ${data.kwh}, ${data.amount})
	`)
	)
}
// 根据微信id，查询绑定的所有电费账户
export async function get_powers_by_wechat_id (wechat_id) {
	return $pool.query2(
		format_sql(`
			SELECT
				power_user.id AS power_id,
				balance,
				kwh_sum,
				update_date,
				remark
			FROM
				power_user
			INNER JOIN mapping_wechat_power ON power_user.id = mapping_wechat_power.power_id
			INNER JOIN wechat_user ON wechat_user.id = mapping_wechat_power.wechat_id
			WHERE
				wechat_user.id = '${wechat_id}'
		`)
	)
}
// 查询电费详单
export async function get_powers_day (data) {
	return $pool.query2(
		format_sql(`
			SELECT
				date,
				kwh,
				amount
			FROM
				power_day
			WHERE
				power_id = '${data.power_id}'
			ORDER BY
				date DESC
			LIMIT ${data.limit}
		`)
	)
}
// 根据wechat_id和power_id查询电费账户和微信账户的remark、是否开启短信通知、剩余短信数、余额警戒线
export async function get_powers_and_wechat_by_two_id ({ power_id, wechat_id }) {
	return $pool.query2(
		format_sql(`
			SELECT mwp.openSMS, wu.SMS-sms_count as SMS, mwp.lowSMS, mwp.remark AS remark
			FROM wechat_user wu
			INNER JOIN mapping_wechat_power mwp ON mwp.wechat_id = wu.id
			LEFT JOIN(
				select wechat_id,count(1) as sms_count from wechat_sms where YEAR (datetime) = YEAR (CURDATE()) AND MONTH (datetime) = MONTH (CURDATE()) group by wechat_id
			) smsc on  smsc.wechat_id=mwp.wechat_id
			WHERE mwp.wechat_id='${wechat_id}' and power_id='${power_id}'
		`)
	)
}
// 修改备注
export async function update_remark_on_mapping ({ power_id, wechat_id, remark }) {
	return $pool.query2(
		format_sql(`
			update mapping_wechat_power set remark='${remark}' where wechat_id='${wechat_id}' and power_id='${power_id}'
		`)
	)
}
// 开启/关闭短信通知
export async function update_openSMS_on_mapping ({ power_id, wechat_id, openSMS }) {
	return $pool.query2(
		format_sql(`
			update mapping_wechat_power set openSMS=${openSMS} where wechat_id='${wechat_id}' and power_id='${power_id}'
		`)
	)
}
// 更改短信通知预警值
export async function update_lowSMS_on_mapping ({ power_id, wechat_id, lowSMS }) {
	return $pool.query2(
		format_sql(`
			update mapping_wechat_power set lowSMS=${lowSMS} where wechat_id='${wechat_id}' and power_id='${power_id}'
		`)
	)
}
// 查看电费账户的绑定情况
export async function select_mapping_by_power_id (power_id) {
	return $pool.query2(
		format_sql(`
			select * from mapping_wechat_power where power_id='${power_id}'
		`)
	)
}
// 删除映射表
export async function delete_mapping_by_power_id_and_wechat_id ({ power_id, wechat_id }) {
	return $pool.query2(
		format_sql(`
			delete from mapping_wechat_power where power_id='${power_id}' and wechat_id='${wechat_id}'
		`)
	)
}
// 查询充值记录
export async function select_recharge_list_by_power_id ({ power_id, limit }) {
	return $pool.query2(
		format_sql(`
			select * from power_recharge where power_id='${power_id}' ORDER BY datetime desc LIMIT ${limit}
		`)
	)
}
// 根据wechat_id和power_id查询映射表
export async function select_mapping_by_wechat_and_power_id ({ power_id, wechat_id }) {
	return $pool.query2(
		format_sql(`
			select * from mapping_wechat_power where wechat_id='${wechat_id}' and power_id='${power_id}'
		`)
	)
}
// 查询账户最新充值记录
export async function select_one_recharge_by_power (power_id) {
	return $pool.query2(
		format_sql(`
			select * from power_recharge where power_id='${power_id}' ORDER BY datetime desc LIMIT 1
		`)
	)
}
// 查找微信中的所有电费账户或某一个电费账户的最新充值记录
export async function select_recharge_datetime_by_wechat_andOr_power ({ wechat_id, power_id }) {
	return $pool.query2(
		format_sql(`
			select mwp.power_id,recharge_datetime from mapping_wechat_power mwp 
			LEFT JOIN(select power_id,MAX(datetime) as recharge_datetime from power_recharge group by power_id) pr
				on mwp.power_id=pr.power_id
			where mwp.wechat_id='${wechat_id}' ${power_id ? `and mwp.power_id='${power_id}'` : ''}
		`)
	)
}
// 获取所有配置
export async function select_config () {
	return $pool.query2(
		format_sql(`
			select * from config
		`)
	)
}
