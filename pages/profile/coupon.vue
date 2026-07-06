<template>
	<view class="coupon-page">
		<!-- 空状态 / 列表 -->
		<view v-if="couponList.length === 0" class="empty-wrap">
			<view class="empty-icon">🎫</view>
			<text class="empty-title">暂无卡券</text>
			<text class="empty-tip">参与活动可获得优惠卡券</text>
		</view>

		<view v-else class="coupon-list">
			<view
				v-for="item in couponList"
				:key="item.id"
				class="coupon-card"
				:class="{ disabled: item.status !== 'valid' }"
			>
				<view class="coupon-left">
					<text class="coupon-value">
						<text class="coupon-symbol">¥</text>
						{{ item.value }}
					</text>
					<text class="coupon-threshold">满{{ item.threshold }}元可用</text>
				</view>
				<view class="coupon-divider"></view>
				<view class="coupon-right">
					<text class="coupon-name">{{ item.name }}</text>
					<text class="coupon-desc">{{ item.desc }}</text>
					<view class="coupon-footer">
						<text class="coupon-time">有效期至 {{ item.expireDate }}</text>
						<view
							class="coupon-btn"
							:class="{ 'btn-disabled': item.status !== 'valid' }"
							@click="useCoupon(item)"
						>
							<text class="btn-text">{{ statusText(item.status) }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const couponList = ref([])

onMounted(() => {
	loadCoupons()
})

function loadCoupons() {
	const saved = uni.getStorageSync('userCoupons')
	if (saved && Array.isArray(saved) && saved.length > 0) {
		couponList.value = saved
	}
	// 后端暂无卡券接口，展示空状态
}

function statusText(status) {
	const map = { valid: '去使用', used: '已使用', expired: '已过期' }
	return map[status] || status
}

function useCoupon(item) {
	if (item.status !== 'valid') {
		uni.showToast({ title: '该卡券不可用', icon: 'none' })
		return
	}
	uni.showModal({
		title: '使用卡券',
		content: `使用「${item.name}」抵扣 ¥${item.value}？\n下次租赁时将自动抵扣。`,
		confirmText: '确认',
		success: (res) => {
			if (res.confirm) {
				uni.setStorageSync('selectedCoupon', item.id)
				uni.showToast({ title: '已选择，租赁时自动抵扣', icon: 'success' })
			}
		}
	})
}
</script>

<style scoped lang="scss">
.coupon-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 16px 40px;
}

.empty-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 80px;
	gap: 8px;
}

.empty-icon {
	font-size: 48px;
	margin-bottom: 8px;
}

.empty-title {
	font-size: 15px;
	font-weight: 700;
	color: #333;
}

.empty-tip {
	font-size: 13px;
	color: #999;
}

.coupon-list {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.coupon-card {
	display: flex;
	align-items: stretch;
	background: #fff;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.coupon-card.disabled {
	opacity: 0.55;
}

.coupon-left {
	width: 100px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 16px 8px;
	background: linear-gradient(135deg, $primaryColor, $primaryLight);
	flex-shrink: 0;
}

.coupon-value {
	font-size: 28px;
	font-weight: 900;
	color: #fff;
}

.coupon-symbol {
	font-size: 16px;
	font-weight: 600;
}

.coupon-threshold {
	font-size: 11px;
	color: rgba(255,255,255,0.9);
	font-weight: 500;
}

.coupon-divider {
	width: 1px;
	background: #f0f0f0;
}

.coupon-right {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 14px 16px;
	gap: 4px;
}

.coupon-name {
	font-size: 15px;
	font-weight: 700;
	color: #333;
}

.coupon-desc {
	font-size: 12px;
	color: #999;
}

.coupon-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 6px;
}

.coupon-time {
	font-size: 11px;
	color: #bbb;
}

.coupon-btn {
	background: $primaryColor;
	border-radius: 12px;
	padding: 5px 14px;
}

.coupon-btn.btn-disabled {
	background: #ddd;
}

.btn-text {
	font-size: 12px;
	color: #fff;
	font-weight: 600;
}
</style>
