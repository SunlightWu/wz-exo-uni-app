<template>
	<view class="deposit-page">
		<!-- 押金状态卡片 -->
		<view class="status-card">
			<view class="status-icon-wrap">
				<text v-if="depositStatus === 'paid'" class="status-icon paid-icon">✓</text>
				<text v-else-if="depositStatus === 'refunding'" class="status-icon refund-icon">⏳</text>
				<text v-else class="status-icon unpaid-icon">¥</text>
			</view>
			<text class="status-title">{{ statusTitle }}</text>
			<text class="status-desc">{{ statusDesc }}</text>
			<text v-if="depositStatus === 'paid'" class="status-amount">¥{{ depositAmount }}</text>
		</view>

		<!-- 操作按钮 -->
		<view class="action-section">
			<view
				v-if="depositStatus === 'unpaid'"
				class="save-btn primary"
				@click="payDeposit"
			>
				<text class="save-btn-text">缴纳押金</text>
			</view>
			<view
				v-else-if="depositStatus === 'paid'"
				class="save-btn outline-danger"
				@click="refundDeposit"
			>
				<text class="save-btn-text danger">申请退押金</text>
			</view>
			<view
				v-else-if="depositStatus === 'refunding'"
				class="save-btn disabled"
			>
				<text class="save-btn-text disabled-text">退款处理中</text>
			</view>
		</view>

		<!-- 说明 -->
		<view class="info-section">
			<text class="info-title">押金说明</text>
			<view class="info-list">
				<view class="info-item">
					<view class="info-dot"></view>
					<text class="info-text">押金金额为 ¥{{ depositAmount }}，用于保障设备安全</text>
				</view>
				<view class="info-item">
					<view class="info-dot"></view>
					<text class="info-text">缴纳押金后即可扫码租赁外骨骼设备</text>
				</view>
				<view class="info-item">
					<view class="info-dot"></view>
					<text class="info-text">申请退款后，押金将在 1-3 个工作日内原路退回</text>
				</view>
				<view class="info-item">
					<view class="info-dot"></view>
					<text class="info-text">如有未完结订单，需先结束订单才能退款</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../../services/api.js';

const depositStatus = ref('unpaid')
const depositAmount = ref(299)

const statusTitle = computed(() => {
	const map = { unpaid: '未缴纳押金', paid: '押金已缴纳', refunding: '退款处理中' }
	return map[depositStatus.value]
})

const statusDesc = computed(() => {
	const map = {
		unpaid: '缴纳押金后即可开始租赁外骨骼设备',
		paid: '您可以正常使用设备，随时可申请退还',
		refunding: '退款将在1-3个工作日内原路退回',
	}
	return map[depositStatus.value]
})

onMounted(() => {
	loadStatus()
})

function loadStatus() {
	const saved = uni.getStorageSync('depositStatus')
	if (saved) depositStatus.value = saved
	const amount = uni.getStorageSync('depositAmount')
	if (amount) depositAmount.value = amount
}

function payDeposit() {
	uni.showModal({
		title: '缴纳押金',
		content: `确认缴纳押金 ¥${depositAmount.value}？`,
		confirmText: '确认支付',
		success: (res) => {
			if (res.confirm) {
				uni.showLoading({ title: '支付中...', mask: true })
				// 后端暂无押金接口，直接本地记录
				setTimeout(() => {
					uni.hideLoading()
					depositStatus.value = 'paid'
					uni.setStorageSync('depositStatus', 'paid')
					uni.setStorageSync('depositAmount', depositAmount.value)
					uni.showToast({ title: '支付成功', icon: 'success' })
				}, 800)
			}
		}
	})
}

function refundDeposit() {
	const lease = uni.getStorageSync('currentLease')
	if (lease) {
		uni.showModal({
			title: '无法退款',
			content: '您有进行中的租赁订单，请先结束订单后再申请退款。',
			showCancel: false,
		})
		return
	}
	uni.showModal({
		title: '申请退押金',
		content: `确认退还押金 ¥${depositAmount.value}？退款将在1-3个工作日内原路退回。`,
		confirmText: '确认退款',
		confirmColor: '#FF5C7A',
		success: (res) => {
			if (res.confirm) {
				uni.showLoading({ title: '处理中...', mask: true })
				// 后端暂无押金接口，直接本地记录
				setTimeout(() => {
					uni.hideLoading()
					depositStatus.value = 'refunding'
					uni.setStorageSync('depositStatus', 'refunding')
					uni.showToast({ title: '已申请退款', icon: 'success' })
				}, 800)
			}
		}
	})
}
</script>

<style scoped lang="scss">
.deposit-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 16px 40px;
}

.status-card {
	background: #fff;
	border-radius: 20px;
	padding: 32px 24px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.status-icon-wrap {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: #f5f6fa;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 4px;
}

.status-icon {
	font-size: 28px;
	font-weight: 900;
}
.paid-icon { color: $primaryColor; }
.refund-icon { color: #FFB547; }
.unpaid-icon { color: #999; }

.status-title {
	font-size: 18px;
	font-weight: 800;
	color: #333;
}

.status-desc {
	font-size: 13px;
	color: #999;
	text-align: center;
	line-height: 1.5;
}

.status-amount {
	font-size: 32px;
	font-weight: 900;
	color: $primaryColor;
	margin-top: 4px;
}

.action-section {
	margin-top: 24px;
}

.save-btn {
	border-radius: 28px;
	padding: 15px 0;
	text-align: center;
	transition: opacity 0.15s;
}
.save-btn:active { opacity: 0.8; }

.save-btn.primary {
	background: $primaryColor;
}
.save-btn.outline-danger {
	background: #fff;
	border: 1.5px solid #FF5C7A;
}
.save-btn.disabled {
	background: #e0e0e0;
}

.save-btn-text {
	font-size: 16px;
	font-weight: 700;
	color: #fff;
}
.save-btn-text.danger {
	color: #FF5C7A;
}
.save-btn-text.disabled-text {
	color: #999;
}

.info-section {
	margin-top: 32px;
}

.info-title {
	font-size: 15px;
	font-weight: 700;
	color: #333;
	display: block;
	margin-bottom: 14px;
}

.info-list {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.info-item {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.info-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: $primaryColor;
	margin-top: 7px;
	flex-shrink: 0;
}

.info-text {
	font-size: 13px;
	color: #666;
	line-height: 1.6;
	flex: 1;
}
</style>
