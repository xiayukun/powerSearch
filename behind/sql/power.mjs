import { format_sql } from '../util/index.mjs'

// 根据电费账户查询绑定微信用户
export async function select_wechat_by_power (power_id) {
	return $pool.query2(
		format_sql(`
			SELECT
				wechat_user.id
			FROM
				wechat_user
			INNER JOIN mapping_wechat_power ON wechat_user.id = mapping_wechat_power.wechat_id
			INNER JOIN power_user ON power_user.id = mapping_wechat_power.power_id
			WHERE
				power_user.id = '${power_id}'
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

// 查询电费最近的数据
export async function select_near_power (power_id) {
	return $pool.query2(
		format_sql(`
			SELECT
				id as power_id,
				balance,
				kwh_sum,
				remark,
				update_date,
				power_day.date AS day_date,
				kwh as day_kwh,
				power_day.amount AS day_amount,
				power_recharge.datetime AS recharge_datetime,
				power_recharge.amount AS amount
			FROM
				power_user
			LEFT JOIN power_day ON power_user.id = power_day.power_id
			LEFT JOIN power_recharge ON power_recharge.power_id = power_user.id
			WHERE
				power_user.id = '${power_id}'
			ORDER BY
				power_day.date DESC,
				power_recharge.datetime DESC
			LIMIT 1
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
// 查询全部电费账户
export async function select_power_id_all () {
	return $pool.query2(
		format_sql(`
			SELECT
				id
			FROM
				power_user
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
