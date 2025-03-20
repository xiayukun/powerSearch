import mysql2 from 'mysql2/promise'
// 创建连接池
global.$pool = mysql2.createPool({
	host: '192.168.31.80',
	port: 3306,
	user: 'root',
	password: 'Company718170',
	database: 'powerSearch',
	waitForConnections: true,
	connectionLimit: 10,
	maxIdle: 10, // 最大空闲连接数，默认等于 `connectionLimit`
	idleTimeout: 60000, // 空闲连接超时，以毫秒为单位，默认值为 60000 ms
	queueLimit: 0,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0
})
$pool.query2 = function () {
	const ars = [...arguments]
	$log('执行sql', ...ars)
	return $pool.query(...ars).catch((e) => {
		$log('sql报错')
		if (typeof ars[ars.length - 1] !== 'number') {
			ars.push(0)
		}
		if (ars[ars.length - 1] < 3) {
			$log('-----------正在重新执行报错sql-----------')
			ars[ars.length - 1] = ars[ars.length - 1] + 1
			$pool.query2(...ars)
		}
		throw e
	})
}
