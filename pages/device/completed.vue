<template>
	<view class="completed-page">
		<view class="celebration">
			<text class="big-icon">✓</text>
			<text class="title">使用结束</text>
			<text class="subtitle">{{ orderData.deviceName || '本次体验已完成' }}</text>
		</view>

		<!-- 运动概览 -->
		<view class="summary-grid">
			<view class="summary-item">
				<text class="summary-value">{{ formatTime(orderData.duration) }}</text>
				<text class="summary-label">使用时长</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ orderData.steps }}</text>
				<text class="summary-label">步数</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ orderData.calories }}</text>
				<text class="summary-label">kcal</text>
			</view>
			<view class="summary-item">
				<text class="summary-value">{{ orderData.avgAssist }}</text>
				<text class="summary-label">平均助力</text>
			</view>
		</view>

		<!-- 费用明细 -->
		<view class="cost-card sci-card">
			<text class="card-title">💰 费用明细</text>
			<view class="cost-row">
				<text>使用时长</text>
				<text>{{ formatTime(orderData.duration) }}</text>
			</view>
			<view class="cost-row">
				<text>单价</text>
				<text>¥{{ (orderData.hourlyRate / 100).toFixed(2) }}/小时</text>
			</view>
			<view v-if="orderData.freeMinutes > 0" class="cost-row">
				<text>免费时长</text>
				<text class="refund">前 {{ orderData.freeMinutes }} 分钟免费</text>
			</view>
			<view class="cost-row">
				<text>押金</text>
				<text>¥{{ (orderData.depositMoney / 100).toFixed(2) }}</text>
			</view>
			<view class="cost-divider"></view>
			<view class="cost-row total">
				<text>租金</text>
				<text class="total-value">¥{{ orderData.cost.toFixed(2) }}</text>
			</view>
			<view v-if="orderData.depositRefund > 0" class="cost-row">
				<text>押金退还</text>
				<text class="refund">¥{{ orderData.depositRefund.toFixed(2) }}</text>
			</view>
			<view class="cost-row total">
				<text>实付金额</text>
				<text class="total-value">¥{{ orderData.actualCost.toFixed(2) }}</text>
			</view>
		</view>

		<!-- 按钮组 -->
		<view class="action-group">
			<view v-if="orderData.tradeNo" class="btn-primary" @click="viewDetail">
				<text class="btn-icon">📋</text>
				<text>查看订单详情</text>
			</view>
			<view class="action-row">
				<view class="btn-secondary" @click="goHome">返回首页</view>
				<view class="btn-secondary btn-green" @click="rentAgain">再来一次</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../services/api.js';
import { useDeviceStore } from '../../store/device.js';

const deviceStore = useDeviceStore();

const orderData = reactive({
	tradeNo: '',
	duration: 0,
	steps: 0,
	calories: 0,
	avgAssist: 0,
	hourlyRate: 0,       // 小时费率/分
	cost: 0,
	actualCost: 0,
	depositRefund: 0,
	depositMoney: 0,     // 押金/分
	startTime: '',
	endTime: '',
	freeMinutes: 0,
	deviceName: '',
})

onLoad((query) => {
	const no = query?.tradeNo || '';
	const duration = parseInt(query?.duration) || 0;
	orderData.tradeNo = no;
	orderData.duration = duration;
	if (no) {
		loadOrderDetail(no, duration);
	} else {
		uni.showToast({ title: '缺少订单号', icon: 'none' });
	}
})

onMounted(() => {
	// 震动反馈
	uni.vibrateShort({ type: 'medium' });
})

async function loadOrderDetail(tradeNo, duration) {
	try {
		const res = await api.getLeaseStatusByTradeNo(tradeNo);
		if ((res.code === 200 || res.code === 0) && res.data) {
			const d = res.data;
			// 真实参数回显
			orderData.hourlyRate = d.hourlyRate || 0;           // 小时费率/分
			orderData.freeMinutes = d.freeMinutes || 0;
			orderData.depositMoney = d.depositMoney || 0;       // 押金/分
			orderData.deviceName = d.deviceSn || '';
			orderData.startTime = d.pickupTime || '';

			// 费用计算（使用传入的 duration）
			const minutes = Math.floor(duration / 60);
			const billable = Math.max(0, minutes - orderData.freeMinutes);
			const costFen = billable * orderData.hourlyRate / 60;
			orderData.cost = costFen / 100;
			orderData.actualCost = orderData.cost;
			orderData.depositRefund = orderData.depositMoney / 100;
		}
	} catch (e) {
		console.error('获取订单详情失败', e);
		uni.showToast({ title: '获取订单详情失败', icon: 'none' });
	}
}

function formatTime(seconds) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}分${s}秒`
}

function viewDetail() {
	if (orderData.tradeNo) {
		uni.navigateTo({ url: `/pages/lease/detail?id=${orderData.tradeNo}` });
	}
}

function goHome() {
	deviceStore.endLease();
	uni.switchTab({ url: '/pages/index/index' })
}

function rentAgain() {
	deviceStore.endLease();
	uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.completed-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 40px 18px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.celebration {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.big-icon {
  font-size: 64px;
  margin-bottom: 12px;
}

.title {
  font-size: 26px;
  font-weight: 900;
  color: #333;
}

.subtitle {
  font-size: 14px;
  color: #999;
  margin-top: 6px;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}

.summary-item {
  background: #fff;
  border-radius: 20px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.summary-value {
  font-size: 22px;
  font-weight: 900;
  color: $primaryColor;
}

.summary-label {
  font-size: 12px;
  font-weight: 600;
  color: #999;
}

.cost-card {
  margin-top: 20px;
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.card-title {
  font-weight: 800;
  font-size: 16px;
  color: #333;
  display: block;
  margin-bottom: 14px;
}

.cost-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #666;
}

.cost-row.total {
  font-weight: 800;
  font-size: 16px;
  color: #333;
  padding: 10px 0;
}

.total-value {
  color: $primaryColor;
}

.refund {
  color: #28C76F;
}

.cost-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
}

.action-group {
  margin-top: auto;
  padding-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-primary {
  width: 100%;
  height: 48px;
  background: $primaryColor;
  border-radius: 24px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: opacity 0.15s;
}

.btn-primary:active {
  opacity: 0.8;
}

.btn-icon {
  font-size: 18px;
}

.btn-secondary {
  flex: 1;
  height: 44px;
  background: #fff;
  border-radius: 22px;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: opacity 0.15s;
}

.btn-secondary:active {
  opacity: 0.7;
}

.btn-secondary.btn-green {
  color: $primaryColor;
  background: rgba(139, 92, 246, 0.08);
  box-shadow: none;
}
</style>

