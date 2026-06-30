<template>
	<view class="confirm-page">
		<view class="page-padding">
			<!-- 设备信息卡片 -->
			<view class="device-card sci-card">
				<view class="device-header">
					<text class="device-icon">🦾</text>
					<view class="device-meta">
						<text class="device-sn">{{ deviceSn }}</text>
						<text class="device-location"><image class="locate-sm" src="/static/locate.png" mode="aspectFit"></image> {{ deviceInfo.location || 'CDC康复中心 3F' }}</text>
					</view>
				</view>
			</view>

			<!-- 计费标准 -->
			<view class="rate-card sci-card">
				<text class="card-title">💰 计费标准</text>
				<view class="rate-row">
					<text class="rate-label">单价</text>
					<text class="rate-value">¥{{ (deviceInfo.rate || 0.50).toFixed(2) }}/分钟</text>
				</view>
				<view class="rate-row">
					<text class="rate-label">每日封顶</text>
					<text class="rate-value">¥{{ deviceInfo.dailyCap || 120 }}</text>
				</view>
				<view class="rate-row">
					<text class="rate-label">计费方式</text>
					<text class="rate-value">不足1分钟按1分钟计</text>
				</view>
			</view>

			<!-- 押金说明 -->
			<view class="deposit-card sci-card">
				<text class="card-title">押金说明</text>
				<view class="deposit-status" v-if="depositFree">
					<text class="deposit-free">✓ 微信支付分 {{ creditScore }}，免押金</text>
					<text class="deposit-limit">免押额度 ¥299</text>
				</view>
				<view class="deposit-status" v-else>
					<text class="deposit-pay">需预付押金 ¥299</text>
					<text class="deposit-hint">使用结束后自动退还</text>
				</view>
			</view>

			<!-- 安全须知 -->
			<view class="safety-card sci-card">
				<text class="card-title">📋 设备安全须知</text>
				<u-checkbox
					v-model="safetyChecked"
					label="我已阅读并同意设备安全须知"
					labelSize="14"
					:customStyle="{ marginBottom: '10px' }"
				></u-checkbox>
				<view class="safety-rules">
					<text class="rule">• 使用前请确认设备完好</text>
					<text class="rule">• 如感不适请立即停止</text>
					<text class="rule">• 设备仅限单人使用</text>
				</view>
			</view>

			<!-- 费用预估 -->
			<view class="estimate-bar glass-panel">
				<text class="estimate-label">费用预估</text>
				<text class="estimate-value">使用10分钟 ≈ ¥{{ (10 * (deviceInfo.rate || 0.5)).toFixed(2) }}</text>
			</view>

			<!-- 开始使用按钮 -->
			<view class="action-section">
				<u-button type="primary" text="开始使用" icon="rocket" shape="circle" size="large" :disabled="!safetyChecked" @click="onStart"></u-button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../../services/api.js';

const deviceSn = ref('')
const deviceInfo = reactive({
	sn: '',
	location: 'CDC康复中心 3F',
	rate: 0.50,
	dailyCap: 120,
})
const safetyChecked = ref(false)
const depositFree = ref(true)
const creditScore = ref(680)

onMounted(() => {
	const query = uni.createRouterQuery ? uni.createRouterQuery() : {}
	// 兼容不同获取参数方式
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const sn = currentPage?.$page?.options?.sn || ''

	deviceSn.value = sn || 'WZ-EXO-S3-001'
	deviceInfo.sn = deviceSn.value

	// 模拟获取设备信息
	api.getDeviceDetail(deviceSn.value).then(res => {
		if (res.code === 0) {
			Object.assign(deviceInfo, res.data)
		}
	})
})

function toggleSafety() {
	safetyChecked.value = !safetyChecked.value
}

async function onStart() {
	if (!safetyChecked.value) return

	uni.showLoading({ title: '处理中...' })
	try {
		// 创建租赁订单
		const leaseResult = await api.createLease({
			sn: deviceSn.value,
			depositFree: depositFree.value,
		})

		if (!depositFree.value) {
			// 需支付押金
			await api.payDeposit({ leaseId: leaseResult.data.leaseId })
		}

		// 获取授权令牌
		const authResult = await api.authorizeLease({
			leaseId: leaseResult.data.leaseId,
		})

		uni.setStorageSync('currentLease', {
			leaseId: leaseResult.data.leaseId,
			token: authResult.data.token,
			sn: deviceSn.value,
			rate: deviceInfo.rate,
			dailyCap: deviceInfo.dailyCap,
			startTime: Date.now(),
		})

		uni.hideLoading()
		uni.showToast({ title: '授权成功', icon: 'success' })
		// 跳转到设备连接页
		uni.redirectTo({ url: '/pages/device/scanning' })
	} catch (e) {
		uni.hideLoading()
		uni.showModal({
			title: '操作失败',
			content: e.message || '请重试',
			showCancel: false,
		})
	}
}
</script>

<style scoped lang="scss">
.confirm-page { @include page-base; padding: 16px 0 40px; }
.page-padding { padding: 0 18px; }

.device-card { margin-bottom: 14px; }
.device-header { @include flex-row(14px); }
.device-icon { font-size: 36px; }
.device-meta { flex: 1; }
.device-sn { font-weight: 800; font-size: 17px; color: $textMainColor; display: block; }
.device-location { font-size: 13px; color: $textSubColor; margin-top: 4px; display: block; }
.locate-sm { width: 14px; height: 14px; vertical-align: -2px; }

.card-title { font-weight: 800; font-size: 15px; color: $textMainColor; display: block; margin-bottom: 12px; }

.rate-card { margin-bottom: 14px; }
.rate-row { @include flex-between; padding: 6px 0; }
.rate-label { font-size: 14px; color: $textSubColor; }
.rate-value { font-size: 14px; font-weight: 700; color: $textMainColor; }

.deposit-card { margin-bottom: 14px; }
.deposit-status { padding: 4px 0; }
.deposit-free { font-size: 14px; font-weight: 700; color: $successColor; display: block; }
.deposit-pay { font-size: 14px; font-weight: 700; color: $warningColor; display: block; }
.deposit-limit { @include text-caption; margin-top: 4px; display: block; }
.deposit-hint { @include text-caption; margin-top: 4px; display: block; }

.safety-card { margin-bottom: 14px; }
.safety-rules { padding-left: 12px; }
.rule { font-size: 13px; color: $textSubColor; line-height: 1.8; display: block; }

.estimate-bar {
  @include flex-between; padding: 14px 20px; border-radius: $radiusLg; margin-bottom: 20px;
}
.estimate-label { font-size: 14px; font-weight: 600; color: $textSubColor; }
.estimate-value { font-size: 16px; font-weight: 800; color: $primaryColor; }

.action-section { padding-bottom: calc(env(safe-area-inset-bottom) + 20px); }
</style>

