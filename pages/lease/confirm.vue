<template>
	<view class="confirm-page">
		<!-- 设备信息卡片 -->
		<view class="card device-card">
			<view class="device-header">
				<image class="device-icon-img" src="/static/exo_view1.png" mode="aspectFit"></image>
				<view class="device-meta">
					<text class="device-sn">{{ deviceInfo.deviceName || deviceSn }}</text>
					<text class="device-location">
						<text class="locate-dot">📍</text>
						{{ deviceInfo.location || 'CDC康复中心 3F' }}
					</text>
				</view>
			</view>
		</view>

		<!-- 计费标准 -->
		<view class="card rate-card">
			<text class="card-title">💰 计费标准</text>
			<view class="rate-row">
				<text class="rate-label">单价</text>
				<text class="rate-value">¥{{ (deviceInfo.rate || 0.50).toFixed(2) }}/分钟</text>
			</view>
			<view class="rate-row">
				<text class="rate-label">每日封顶</text>
				<text class="rate-value">¥{{ (deviceInfo.dailyCap || 120).toFixed(2) }}</text>
			</view>
			<view class="rate-row">
				<text class="rate-label">计费方式</text>
				<text class="rate-value">不足1分钟按1分钟计</text>
			</view>
		</view>

		<!-- 押金说明 -->
		<view class="card deposit-card">
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
		<view class="card safety-card">
			<text class="card-title">📋 设备安全须知</text>
			<view class="checkbox-row" @click="toggleSafety">
				<view class="checkbox" :class="{ checked: safetyChecked }">
					<text v-if="safetyChecked" class="check-mark">✓</text>
				</view>
				<text class="checkbox-label">我已阅读并同意设备安全须知</text>
			</view>
			<view class="safety-rules">
				<text class="rule">• 使用前请确认设备完好</text>
				<text class="rule">• 如感不适请立即停止</text>
				<text class="rule">• 设备仅限单人使用</text>
			</view>
		</view>

		<!-- 费用预估 -->
		<view class="estimate-bar">
			<text class="estimate-label">费用预估</text>
			<text class="estimate-value">使用10分钟 ≈ ¥{{ (10 * (deviceInfo.rate || 0.5)).toFixed(2) }}</text>
		</view>

		<!-- 开始使用按钮 -->
		<view class="action-section">
			<view class="save-btn" :class="{ disabled: !safetyChecked }" @click="onStart">
				<text class="save-btn-text">支付押金 & 开始租赁</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../../services/api.js';
import { useDeviceStore } from '../../store/device.js';

const store = useDeviceStore();

const deviceSn = ref('')
const deviceInfo = reactive({
	sn: '',
	deviceName: '',
	location: '',
	rate: 0.50,
	dailyCap: 120,
	deposit: 0,
	freeMinutes: 0,
	status: '',
})
const safetyChecked = ref(false)
const depositFree = ref(true)
const creditScore = ref(680)

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const query = currentPage.options || currentPage.$page?.options || currentPage.$route?.query || {}
	const sn = query.sn || ''

	deviceSn.value = sn
	deviceInfo.sn = sn

	if (!sn) {
		uni.showModal({
			title: '参数错误',
			content: '未获取到设备编号',
			showCancel: false,
			complete: () => uni.navigateBack()
		})
		return
	}

	api.scanDevice(sn).then(res => {
		if (res.code === 200) {
			const data = res.data || {}
			Object.assign(deviceInfo, {
				location: data.cabinetNo || 'CDC康复中心 3F',
				deviceName: data.deviceName || data.model || '',
				rate: data.rate || 0.50,
				deposit: data.deposit || 0,
				freeMinutes: data.freeMinutes || 0,
				status: data.status || '',
			})
			if (data.status !== 'available') {
				uni.showModal({
					title: '设备不可用',
					content: '该设备已被占用或暂不可用，请扫描其他设备',
					showCancel: false,
					complete: () => uni.navigateBack()
				})
			}
		} else {
			uni.showModal({
				title: '获取设备信息失败',
				content: res.msg || '请稍后重试',
				showCancel: false,
				complete: () => uni.navigateBack()
			})
		}
	}).catch(e => {
		uni.showModal({
			title: '获取设备信息失败',
			content: e.message || '请检查网络后重试',
			showCancel: false,
			complete: () => uni.navigateBack()
		})
	})
})

function toggleSafety() {
	safetyChecked.value = !safetyChecked.value
}

async function onStart() {
	if (!safetyChecked.value) {
		uni.showToast({ title: '请先同意安全须知', icon: 'none' })
		return
	}

	uni.showLoading({ title: '处理中...' })
	try {
		const result = await api.confirmLease({
			deviceSn: deviceSn.value,
			deposit: deviceInfo.deposit,
			rate: deviceInfo.rate,
			freeMinutes: deviceInfo.freeMinutes,
		})

		if (result.code === 200 && result.data) {
			store.setLeaseInfo(result.data)
			uni.setStorageSync('activeTradeNo', result.data.tradeNo)
			uni.setStorageSync('activeDeviceSn', result.data.deviceSn)

			uni.hideLoading()
			uni.showToast({ title: '租借成功', icon: 'success' })
			uni.redirectTo({ url: '/pages/device/control' })
		} else {
			throw new Error(result.msg || '租借失败')
		}
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
.confirm-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 16px 40px;
}

/* 通用卡片 */
.card {
	background: #fff;
	border-radius: 20px;
	padding: 18px 20px;
	margin-bottom: 14px;
	box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

/* 设备信息 */
.device-header {
	display: flex;
	align-items: center;
	gap: 14px;
}
.device-icon-img { width: 48px; height: 48px; }
.device-meta { flex: 1; }
.device-sn {
	font-weight: 800;
	font-size: 17px;
	color: #333;
	display: block;
}
.device-location {
	font-size: 13px;
	color: #999;
	margin-top: 4px;
	display: flex;
	align-items: center;
	gap: 2px;
}
.locate-dot { font-size: 13px; }

/* 卡片标题 */
.card-title {
	font-weight: 800;
	font-size: 15px;
	color: #333;
	display: block;
	margin-bottom: 14px;
}

/* 计费 */
.rate-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 0;
}
.rate-label { font-size: 14px; color: #999; }
.rate-value { font-size: 14px; font-weight: 700; color: #333; }

/* 押金 */
.deposit-status { padding: 4px 0; }
.deposit-free { font-size: 14px; font-weight: 700; color: $primaryColor; display: block; }
.deposit-pay { font-size: 14px; font-weight: 700; color: #FF9F43; display: block; }
.deposit-limit { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.deposit-hint { font-size: 12px; color: #999; margin-top: 4px; display: block; }

/* 安全须知 */
.checkbox-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}
.checkbox {
	width: 22px;
	height: 22px;
	border-radius: 6px;
	border: 2px solid #ddd;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.2s;
}
.checkbox.checked {
	background: $primaryColor;
	border-color: $primaryColor;
}
.check-mark {
	font-size: 14px;
	color: #fff;
	font-weight: 800;
}
.checkbox-label { font-size: 14px; color: #333; }

.safety-rules { padding-left: 32px; }
.rule { font-size: 13px; color: #999; line-height: 1.8; display: block; }

/* 费用预估 */
.estimate-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 20px;
	background: rgba(139, 92, 246, 0.08);
	border-radius: 16px;
	margin-bottom: 20px;
}
.estimate-label { font-size: 14px; font-weight: 600; color: #999; }
.estimate-value { font-size: 16px; font-weight: 800; color: $primaryColor; }

/* 按钮 */
.action-section {
	padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}
.save-btn {
	background: $primaryColor;
	border-radius: 28px;
	padding: 15px 0;
	text-align: center;
	transition: opacity 0.15s;
}
.save-btn:active { opacity: 0.8; }
.save-btn.disabled { background: #d0d0d0; }
.save-btn-text { font-size: 16px; font-weight: 700; color: #fff; }
.save-btn.disabled .save-btn-text { color: #999; }
</style>
