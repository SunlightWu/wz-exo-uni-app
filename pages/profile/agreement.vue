<template>
	<view class="agreement-page">
		<text class="agreement-title">{{ title }}</text>
		<text class="agreement-date">更新日期：2026年06月30日</text>
		<view class="agreement-content">
			<text class="section-title">一、引言</text>
			<text class="section-text">欢迎使用外骨骼租赁小程序（以下简称"本服务"）。本协议是您与本服务提供方之间关于使用本服务所订立的协议。请您仔细阅读本协议，如您不同意本协议任何内容，请停止使用本服务。</text>

			<text class="section-title">二、服务内容</text>
			<text class="section-text">本服务为用户提供外骨骼设备的扫码租赁、实时控制、运动数据记录与查看等功能。用户可通过微信小程序完成设备租赁、使用控制和订单管理。</text>

			<text class="section-title">三、用户义务</text>
			<text class="section-text">1. 用户应确保提供真实、准确的个人信息，包括但不限于身高、体重等身体参数。
2. 用户应妥善保管租赁设备，不得转借、转租或损坏设备。
3. 用户在使用设备过程中如感不适，应立即停止使用并联系客服。
4. 用户应按照约定支付租赁费用，费用按实际使用时长计算。</text>

			<text class="section-title">四、押金与费用</text>
			<text class="section-text">1. 用户租赁设备前需缴纳押金，押金金额为299元。
2. 租赁费用按分钟计算，具体费率以设备点位公示为准。
3. 用户结束租赁后，系统将自动结算费用并从押金中扣除（如使用押金支付）。
4. 用户可随时申请退还押金，退款将在1-3个工作日内原路退回。</text>

			<text class="section-title">五、隐私保护</text>
			<text class="section-text">我们重视用户的隐私保护，收集的个人信息仅用于提供本服务。我们不会向第三方出售或分享您的个人信息，除非获得您的明确同意或法律法规要求。</text>

			<text class="section-title">六、免责声明</text>
			<text class="section-text">1. 用户应充分了解外骨骼设备的使用风险，因用户自身原因造成的伤害，本服务提供方不承担责任。
2. 因不可抗力导致的服务中断或数据丢失，本服务提供方不承担责任。
3. 用户违反本协议造成损失的，应自行承担相应责任。</text>

			<text class="section-title">七、协议变更</text>
			<text class="section-text">本服务提供方有权根据实际情况对本协议进行变更，变更后的协议将在小程序内公布。如您继续使用本服务，视为您同意变更后的协议。</text>

			<text class="section-title">八、联系我们</text>
			<text class="section-text">如您对本协议有任何疑问，请联系客服：400-800-1234</text>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const title = ref('用户协议')

onMounted(() => {
	const pages = getCurrentPages()
	const current = pages[pages.length - 1]
	const type = current?.$page?.options?.type || 'user'
	title.value = type === 'privacy' ? '隐私政策' : '用户协议'
})
</script>

<style scoped lang="scss">
.agreement-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 18px 40px;
}

.agreement-title {
	font-size: 20px;
	font-weight: 800;
	color: #333;
	display: block;
	margin-bottom: 6px;
}

.agreement-date {
	font-size: 12px;
	color: #999;
	display: block;
	margin-bottom: 20px;
}

.agreement-content {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.section-title {
	font-size: 15px;
	font-weight: 700;
	color: #333;
	display: block;
	margin-top: 4px;
}

.section-text {
	font-size: 13px;
	color: #666;
	line-height: 1.8;
	display: block;
	white-space: pre-line;
}
</style>
