import Dysmsapi20170525 from '@alicloud/dysmsapi20170525'
import OpenApi from '@alicloud/openapi-client'
import Util from '@alicloud/tea-util'

const config = new OpenApi.Config({
	accessKeyId: $config.accessKeyId,
	accessKeySecret: $config.accessKeySecret
})
config.endpoint = 'dysmsapi.aliyuncs.com'
const client = new Dysmsapi20170525.default(config)

export default async function handlerSendSMS ({ phone, power_id_remark, balance, SMS, low_SMS }) {
	const sendSmsRequest = new Dysmsapi20170525.SendSmsRequest({
		phoneNumbers: phone,
		signName: $config.signName,
		templateCode: $config.templateCode,
		templateParam: JSON.stringify({ power_id_remark, balance, low_SMS, SMS })
	})
	const runtime = new Util.RuntimeOptions({})
	const res = await client.sendSmsWithOptions(sendSmsRequest, runtime)
	if (res.body.code !== 'OK') {
		throw Error(res.body.message)
	}
	$log(res)
}
