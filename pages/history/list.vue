<template>
	<view class="order-page">
		<!-- 订单列表 -->
		<view class="order-list">
			<view
				v-for="item in orders"
				:key="item.id"
				class="order-card"
				@click="onOrderClick(item)"
			>
				<!-- 顶部：状态 + 编号 -->
				<view class="card-header">
					<view class="status-badge" :class="statusClass(item.state)">
						<text class="status-text">{{ statusLabel(item.state) }}</text>
					</view>
					<text class="trade-no">{{ item.tradeNo }}</text>
				</view>

				<!-- 中部：设备信息 -->
				<view class="card-body">
					<view class="body-row">
						<text class="body-label">设备</text>
						<text class="body-value">{{ item.deviceSn }}</text>
					</view>
					<view class="body-row">
						<text class="body-label">租借时间</text>
						<text class="body-value">{{ formatDateTime(item.pickupTime) }}</text>
					</view>
					<view v-if="item.returnTime" class="body-row">
						<text class="body-label">归还时间</text>
						<text class="body-value">{{ formatDateTime(item.returnTime) }}</text>
					</view>
					<view class="body-row">
						<text class="body-label">押金</text>
						<text class="body-value highlight">¥{{ (item.depositMoney / 100).toFixed(2) }}</text>
					</view>
				</view>

				<!-- 底部：费用 -->
				<view class="card-footer">
					<view class="footer-info">
						<text class="footer-label">支付金额</text>
						<text class="footer-cost">¥{{ (item.payMoney / 100).toFixed(2) }}</text>
					</view>
					<text class="footer-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view v-if="orders.length === 0 && !loading" class="empty-wrap">
			<text class="empty-icon">📋</text>
			<text class="empty-title">暂无订单记录</text>
			<view class="scan-btn" @click="goScan">
				<text class="scan-btn-text">扫码租赁</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../services/api.js';

const orders = ref([]);
const loading = ref(true);

onMounted(() => {
	loadOrders();
});

async function loadOrders() {
	loading.value = true;
	try {
		const res = await api.getMyOrders({ pageNum: 1, pageSize: 50 });
		if (res.code === 200 || res.code === 0) {
			// MyBatis Plus 分页返回 records
			orders.value = res.data?.records || res.data?.list || [];
		}
	} catch (e) {
		console.error('获取订单列表失败:', e.message);
		orders.value = [];
	} finally {
		loading.value = false;
	}
}

function statusLabel(state) {
	const map = { 0: '使用中', 1: '已完成', 2: '已取消', 3: '已归还' };
	return map[state] || '未知';
}

function statusClass(state) {
	if (state === 0) return 'active';
	if (state === 1 || state === 3) return 'done';
	return 'cancel';
}

function onOrderClick(item) {
	uni.navigateTo({ url: `/pages/history/detail?id=${item.tradeNo}` });
}

function formatDateTime(dt) {
	if (!dt) return '--';
	const d = new Date(dt);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function goScan() {
	uni.switchTab({ url: '/pages/index/index' });
	setTimeout(() => {
		uni.scanCode({ onlyFromCamera: true });
	}, 300);
}
</script>

<style scoped lang="scss">
.order-page {
	min-height: 100vh;
	background: #f5f6fa;
}

.order-list {
	padding: 12px 16px 40px;
}

/* 订单卡片 */
.order-card {
	background: #fff;
	border-radius: 16px;
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	transition: opacity 0.15s;
}

.order-card:active {
	opacity: 0.7;
}

/* 头部 */
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14px;
}

.status-badge {
	padding: 4px 12px;
	border-radius: 8px;
}

.status-badge.active {
	background: rgba(139, 92, 246, 0.1);
}

.status-badge.done {
	background: rgba(40, 199, 111, 0.1);
}

.status-badge.cancel {
	background: rgba(153, 153, 153, 0.1);
}

.status-text {
	font-size: 12px;
	font-weight: 700;
}

.status-badge.active .status-text {
	color: $primaryColor;
}

.status-badge.done .status-text {
	color: #28C76F;
}

.status-badge.cancel .status-text {
	color: #999;
}

.trade-no {
	font-size: 12px;
	color: #bbb;
	font-family: monospace;
}

/* 内容 */
.card-body {
	border-top: 1px solid #f5f6fa;
	border-bottom: 1px solid #f5f6fa;
	padding: 12px 0;
}

.body-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 0;
}

.body-label {
	font-size: 13px;
	color: #999;
}

.body-value {
	font-size: 13px;
	font-weight: 600;
	color: #333;
}

.body-value.highlight {
	color: $primaryColor;
	font-weight: 700;
}

/* 底部 */
.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 12px;
}

.footer-info {
	display: flex;
	align-items: center;
	gap: 6px;
}

.footer-label {
	font-size: 12px;
	color: #999;
}

.footer-cost {
	font-size: 16px;
	font-weight: 800;
	color: $primaryColor;
}

.footer-arrow {
	font-size: 20px;
	color: #ccc;
	font-weight: 300;
}

/* 空状态 */
.empty-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 120px;
	gap: 10px;
}

.empty-icon {
	font-size: 52px;
}

.empty-title {
	font-size: 15px;
	font-weight: 600;
	color: #999;
}

.scan-btn {
	margin-top: 16px;
	width: 200px;
	padding: 14px 0;
	background: $primaryColor;
	border-radius: 28px;
	text-align: center;
}

.scan-btn:active {
	opacity: 0.8;
}

.scan-btn-text {
	font-size: 16px;
	font-weight: 700;
	color: #fff;
}
</style>