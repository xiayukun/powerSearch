import fs from 'fs'
import moment from 'moment'
import path from 'path'

// 定义一个函数，接收文件夹路径作为参数
export function util_getFiles (dirPath) {
	// 初始化一个数组用于存储文件名
	const files = []

	// 使用同步方法读取目录内容（仅在小型目录或对异步处理不熟悉时使用同步方法）
	try {
		const entries = fs.readdirSync(dirPath, { withFileTypes: true })

		// 遍历目录条目
		for (const entry of entries) {
			if (entry.isFile()) {
				// 如果是文件，则添加到文件名数组中
				const name = path.join(dirPath, entry.name)
				files.push(name)
				// files.push(name.substring(0, name.lastIndexOf('.')))
			} else if (entry.isDirectory()) {
				// 如果是子目录，递归获取子目录中的文件
				const subDirFiles = util_getFiles(path.join(dirPath, entry.name))
				files.push(...subDirFiles)
			}
		}

		return files
	} catch (err) {
		$log(`无法读取目录：${dirPath}`)
		throw err
	}
}
// 读取json文件
export async function util_getJSON (filepath) {
	return JSON.parse(await fs.readFileSync(filepath, 'utf8'))
}
function log () {
	console.log(moment().format('YYYY-MM-DD HH:mm:ss'), ...arguments)
}
global.$log = log
