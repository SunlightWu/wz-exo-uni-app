<template>
	<view class="completed-page">
		<view class="celebration">
			<text class="big-icon">✓</text>
			<text class="title">使用结束</text>
			<text class="subtitle">本次运动已完成</text>
		</view>

		<!-- 运动概览 -->
		<view class="summary-grid">
			<view class="summary-item">
				<text class="summary-value">{{ formatTime(session.duration) }}</text>
				<text class="summary-label">使用时长</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ session.steps }}</text>
				<text class="summary-label">步数</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ session.calories }}</text>
				<text class="summary-label">kcal</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ session.avgAssist }}</text>
				<text class="summary-label">平均助力</text>
			</view>
		</view>

		<!-- 费用明细 -->
		<view class="cost-card sci-card">
			<text class="card-title">💰 费用明细</text>
			<view class="cost-row">
				<text>使用时长</text>
				<text>{{ formatTime(session.duration) }}</text>
			</view>
			<view class="cost-row">
				<text>单价</text>
				<text>¥{{ session.rate.toFixed(2) }}/分钟</text>
			</view>
			<view class="cost-divider"></view>
			<view class="cost-row total">
				<text>合计</text>
				<text class="total-value">¥{{ session.cost.toFixed(2) }}</text>
			</view>
			<view class="cost-row">
				<text>押金退还</text>
				<text class="refund">¥{{ session.depositRefund.toFixed(2) }}</text>
			</view>
		</view>

		<!-- 按钮组 -->
		<view class="action-group">
			<u-button type="primary" text="查看完整运动报告" icon="bar-chart" shape="circle" @click="viewDetail"></u-button>
			<view class="action-row">
				<u-button type="info" text="返回首页" shape="circle" plain @click="goHome" :customStyle="{ flex: 1 }"></u-button>
				<u-button type="primary" text="再来一次" shape="circle" plain @click="rentAgain" :customStyle="{ flex: 1 }"></u-button>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { api } from '../../services/api.js';

const session = reactive({
	duration: 3150,
	steps: 3247,
	calories: 128,
	avgAssist: 4.2,
	rate: 0.50,
	cost: 26.25,
	depositRefund: 0,
})

onMounted(() => {
	// 尝试从本地存储获取本次会话数据
	const lease = uni.getStorageSync('currentLease')
	if (lease) {
		const elapsed = Math.floor((Date.now() - lease.startTime) / 1000)
		session.duration = elapsed || 3150
		const minutes = Math.ceil(elapsed / 60)
		const rawCost = minutes * (lease.rate || 0.5)
		const cap = lease.dailyCap || 120
		session.cost = cap > 0 ? Math.min(rawCost, cap) : rawCost
		session.rate = lease.rate || 0.5
		session.steps = Math.floor(elapsed * 1.03) // 模拟步数

		// 上传运动数据
		api.uploadSession({
			duration: session.duration,
			steps: session.steps,
			cost: session.cost,
		}).then(() => {
			// 结束租赁
			api.endLease({ cost: session.cost })
		})

		// 清除当前租赁
		uni.removeStorageSync('currentLease')
	}

	// 震动反馈
	uni.vibrateShort({ type: 'medium' })
})

function formatTime(seconds) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}分${s}秒`
}

function viewDetail() {
	uni.navigateTo({ url: '/pages/history/detail?id=latest' })
}

function goHome() {
	uni.switchTab({ url: '/pages/index/index' })
}

function rentAgain() {
	uni.redirectTo({ url: '/pages/device/scanning' })
}
</script>

<style scoped lang="scss">
.completed-page { @include page-base; padding: 40px 18px; display: flex; flex-direction: column; }

.celebration { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
.big-icon { font-size: 64px; margin-bottom: 12px; }
.title { font-size: 26px; font-weight: 900; color: $textMainColor; }
.subtitle { font-size: 14px; color: $textSubColor; margin-top: 6px; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
.summary-item { @include card-base; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 6px; border: 1px solid $borderColor; }
.summary-value { font-size: 22px; font-weight: 900; color: $primaryColor; }
.summary-label { font-size: 12px; font-weight: 600; color: $textSubColor; }

.cost-card { margin-top: 20px; }
.card-title { font-weight: 800; font-size: 16px; color: $textMainColor; display: block; margin-bottom: 14px; }
.cost-row { @include flex-between; padding: 6px 0; font-size: 14px; color: $textSubColor;
  &.total { font-weight: 800; font-size: 16px; color: $textMainColor; padding: 10px 0; }
}
.total-value { color: $primaryColor; }
.refund { color: $successColor; }
.cost-divider { @include divider(4px 0); }

.action-group { margin-top: auto; padding-top: 30px; display: flex; flex-direction: column; gap: 12px; }
.action-row { @include flex-row(12px); }
</style>

