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
export async function insert_power (power_id, remark) {
	return $pool.query2(
		format_sql(`
			INSERT INTO power_user (id, remark)
			VALUES
				('${power_id}', '${remark}')
			ON DUPLICATE KEY UPDATE remark='${remark}';
		`)
	)
}

// 增加微信用户和电费账户的映射表
export async function insert_mapping_wechat_power (wechat_id, power_id) {
	return $pool.query2(
		format_sql(`
			INSERT INTO mapping_wechat_power (wechat_id, power_id)
			VALUES
				('${wechat_id}', '${power_id}');
		`)
	)
}
// 查询账户表中所有账户的账户详情、最新的日统计、最新的充值记录
export async function select_all_power_user_data_by_last_date (power_id) {
	return $pool.query2(
		format_sql(`
			SELECT pu.id AS power_id, pu.balance, pu.kwh_sum, pu.remark, pu.update_date, pd.date AS day_date, pd.kwh AS day_kwh, pd.amount AS day_amount, pr.datetime AS recharge_datetime, pr.amount AS amount
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
