<template>
	<view class="detail-page">
		<!-- 顶部状态 -->
		<view class="status-header">
			<view class="status-icon-wrap" :style="{ background: statusConfig.bg }">
				<u-icon :name="statusConfig.icon" :color="statusConfig.color" size="48"></u-icon>
			</view>
			<text class="status-title">{{ statusConfig.label }}</text>
			<text class="status-subtitle">{{ statusConfig.subtitle }}</text>
		</view>

		<!-- 费用概览 -->
		<view class="cost-overview" v-if="order.payMoney > 0 || order.depositMoney > 0">
			<view class="cost-main">
				<text class="cost-label">{{ order.status === 3 ? '实付租金' : '应付金额' }}</text>
				<text class="cost-amount">¥{{ ((order.payMoney || order.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view v-if="order.depositMoney > 0" class="cost-deposit">
				<text>押金 ¥{{ (order.depositMoney / 100).toFixed(2) }} 已抵扣</text>
			</view>
			<view v-if="depositRefund > 0" class="cost-refund">
				<text>退还押金 ¥{{ depositRefund.toFixed(2) }}</text>
			</view>
		</view>

		<!-- 设备信息 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="setting-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">设备信息</text>
			</view>
			<view class="info-row">
				<text class="info-label">设备名称</text>
				<text class="info-value">{{ order.deviceName || '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">设备编号</text>
				<text class="info-value mono">{{ order.deviceSn || '-' }}</text>
			</view>
		</view>

		<!-- 订单信息 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="file-text-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">订单信息</text>
			</view>
			<view class="info-row">
				<text class="info-label">订单编号</text>
				<text class="info-value mono">{{ order.tradeNo || '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">订单状态</text>
				<text class="info-value" :style="{ color: statusConfig.color }">{{ statusConfig.label }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">支付方式</text>
				<text class="info-value">{{ payTypeText }}</text>
			</view>
			<view class="info-row" v-if="order.payScene">
				<text class="info-label">支付场景</text>
				<text class="info-value">{{ paySceneText }}</text>
			</view>
			<view class="info-row" v-if="order.feeTemplateId">
				<text class="info-label">计费模板</text>
				<text class="info-value">#{{ order.feeTemplateId }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">创建时间</text>
				<text class="info-value">{{ formatDateTimeFull(order.createTime) }}</text>
			</view>
		</view>

		<!-- 时间信息 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="clock-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">时间信息</text>
			</view>
			<view class="info-row">
				<text class="info-label">开始时间</text>
				<text class="info-value">{{ formatDateTimeFull(order.pickupTime) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">结束时间</text>
				<text class="info-value">{{ formatDateTimeFull(order.returnTime) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">使用时长</text>
				<text class="info-value highlight">{{ formatDurationFull(order.pickupTime, order.returnTime) }}</text>
			</view>
		</view>

		<!-- 机柜信息 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="grid-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">机柜信息</text>
			</view>
			<view class="info-row">
				<text class="info-label">取机柜</text>
				<text class="info-value">{{ order.pickupCabinetId ? '柜机 #' + order.pickupCabinetId : '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">还机柜</text>
				<text class="info-value">{{ order.returnCabinetId ? '柜机 #' + order.returnCabinetId : '-' }}</text>
			</view>
		</view>

		<!-- 费用明细 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="rmb-circle-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">费用明细</text>
			</view>
			<view class="info-row">
				<text class="info-label">押金</text>
				<text class="info-value">¥{{ (order.depositMoney / 100).toFixed(2) }}</text>
			</view>
			<view class="info-row" v-if="order.riskAmount > 0">
				<text class="info-label">风险冻结</text>
				<text class="info-value">¥{{ (order.riskAmount / 100).toFixed(2) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">实际租金</text>
				<text class="info-value">¥{{ ((order.payMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">实付金额</text>
				<text class="info-value">¥{{ ((order.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view class="cost-divider"></view>
			<view class="info-row total">
				<text class="info-label">费用合计</text>
				<text class="info-value total-price">¥{{ ((order.payMoney || order.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view v-if="depositRefund > 0" class="info-row">
				<text class="info-label">押金退还</text>
				<text class="info-value refund">+¥{{ depositRefund.toFixed(2) }}</text>
			</view>
		</view>

		<!-- 位置信息 -->
		<view class="info-card" v-if="order.longitude && order.latitude">
			<view class="card-header">
				<u-icon name="map-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">归还位置</text>
			</view>
			<view class="info-row">
				<text class="info-label">经度</text>
				<text class="info-value mono">{{ order.longitude }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">纬度</text>
				<text class="info-value mono">{{ order.latitude }}</text>
			</view>
		</view>

		<view style="height: 20px;"></view>
	</view>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import { api } from '../../services/api.js';
import { formatDateTimeFull, formatDurationFull } from '../../utils/format.js';

const order = reactive({
	tradeNo: '',
	deviceSn: '',
	deviceName: '',
	memberId: '',
	depositMoney: 0,
	riskAmount: 0,
	payMoney: 0,
	incomeMoney: 0,
	hourlyRate: 0,
	freeMinutes: 0,
	payType: 1,
	payScene: '',
	feeTemplateId: 0,
	status: 3,
	pickupCabinetId: 0,
	returnCabinetId: 0,
	pickupTime: '',
	returnTime: '',
	createTime: '',
	longitude: 0,
	latitude: 0,
})

const statusConfig = computed(() => {
	const map = {
		0: { label: '待付押金', title: '等待支付', subtitle: '请完成押金支付后开始使用', icon: 'clock-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
		1: { label: '租赁中', title: '正在使用', subtitle: '设备租借中，请安全使用', icon: 'play-right-fill', color: '#306afc', bg: 'rgba(48,106,252,0.1)' },
		2: { label: '已归还待结算', title: '已归还', subtitle: '免押订单，系统将自动扣费', icon: 'clock-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
		3: { label: '已完成', title: '使用结束', subtitle: '订单已完成，感谢您的使用', icon: 'checkmark-circle-fill', color: '#28c76f', bg: 'rgba(40,199,111,0.1)' },
		4: { label: '已取消', title: '订单已取消', subtitle: '订单已被取消', icon: 'close-circle-fill', color: '#999', bg: 'rgba(153,153,153,0.1)' },
		5: { label: '故障中止', title: '故障中止', subtitle: '设备故障，订单已中止', icon: 'warning-fill', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
		6: { label: '丢失赔付', title: '丢失赔付', subtitle: '设备丢失，赔付已完结', icon: 'info-circle-fill', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
	};
	return map[order.status] || map[3];
});

const payTypeText = computed(() => {
	const map = { 1: '微信支付', 2: '支付宝', 3: '钱包余额' };
	return map[order.payType] || '未知';
});

const paySceneText = computed(() => {
	const map = {
		AUTH_FREEZE: '免押预授权',
		DEPOSIT_PAY: '押金缴纳',
		LEASE_DEDUCT: '租金扣费',
		LOSS_COMPENSATE: '丢失赔付',
	};
	return map[order.payScene] || order.payScene || '-';
});

const depositRefund = computed(() => {
	if (order.depositMoney > 0 && order.payMoney > 0) {
		const refund = order.depositMoney - order.payMoney;
		return refund > 0 ? refund / 100 : 0;
	}
	return 0;
});

onMounted(() => {
	const pages = getCurrentPages();
	const currentPage = pages[pages.length - 1];
	const query = currentPage.options || currentPage.$page?.options || currentPage.$route?.query || {};
	const id = query.id || '';

	if (id) {
		loadOrderDetail(id);
	}
})

async function loadOrderDetail(tradeNo) {
	try {
		const res = await api.getLeaseStatusByTradeNo(tradeNo);
		if ((res.code === 200 || res.code === 0) && res.data) {
			const d = res.data;
			order.tradeNo = d.tradeNo || '';
			order.deviceSn = d.deviceSn || '';
			order.deviceName = d.deviceName || '';
			order.memberId = d.memberId || '';
			order.depositMoney = d.depositMoney || 0;
			order.riskAmount = d.riskAmount || 0;
			order.payMoney = d.payMoney || 0;
			order.incomeMoney = d.incomeMoney || 0;
			order.hourlyRate = d.hourlyRate || 0;
			order.freeMinutes = d.freeMinutes || 0;
			order.payType = d.payType || 1;
			order.payScene = d.payScene || '';
			order.feeTemplateId = d.feeTemplateId || 0;
			order.status = d.status ?? 3;
			order.pickupCabinetId = d.pickupCabinetId || 0;
			order.returnCabinetId = d.returnCabinetId || 0;
			order.pickupTime = d.pickupTime || '';
			order.returnTime = d.returnTime || '';
			order.createTime = d.createTime || '';
			order.longitude = d.longitude || 0;
			order.latitude = d.latitude || 0;
		}
	} catch (e) {
		console.error('获取订单详情失败:', e);
		uni.showToast({ title: '获取订单详情失败', icon: 'none' });
	}
}

</script>

<style scoped lang="scss">
.detail-page {
	min-height: 100vh;
	background: $pageBg;
	padding: 24px 16px 0;
}

/* 顶部状态 */
.status-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8px 0 4px;
}

.status-icon-wrap {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 14px;
}

.status-title {
	font-size: 22px;
	font-weight: 900;
	color: $textMainColor;
}

.status-subtitle {
	font-size: 13px;
	color: $textSubColor;
	margin-top: 6px;
}

/* 费用概览 */
.cost-overview {
	margin-top: 16px;
	background: linear-gradient(135deg, #306afc 0%, #5d8eff 100%);
	border-radius: $radiusMd;
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	color: #fff;
}

.cost-main {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.cost-label {
	font-size: 13px;
	opacity: 0.85;
}

.cost-amount {
	font-size: 36px;
	font-weight: 900;
	margin-top: 4px;
}

.cost-deposit {
	font-size: 12px;
	opacity: 0.75;
	margin-top: 6px;
}

.cost-refund {
	font-size: 12px;
	opacity: 0.9;
	margin-top: 4px;
	background: rgba(255, 255, 255, 0.2);
	padding: 2px 10px;
	border-radius: 10px;
}

/* 信息卡片 */
.info-card {
	margin-top: 12px;
	background: #fff;
	border-radius: $radiusMd;
	padding: 14px 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-header {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 10px;
}

.card-title {
	font-size: 15px;
	font-weight: 800;
	color: $textMainColor;
}

.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 14px;
	padding: 8px 0;
	border-bottom: 1px solid #f8f8f8;
}

.info-row:last-child {
	border-bottom: none;
}

.info-label {
	color: #999;
}

.info-value {
	color: #333;
	font-weight: 600;
	max-width: 60%;
	text-align: right;
	word-break: break-all;
}

.info-value.mono {
	font-family: monospace;
	font-size: 12px;
}

.info-value.highlight {
	color: $primaryColor;
	font-weight: 800;
}

.info-value.refund {
	color: #28c76f;
}

.info-value.total-price {
	color: $dangerColor;
	font-size: 16px;
	font-weight: 800;
}

.info-row.total {
	font-size: 15px;
	font-weight: 800;
	padding: 10px 0;
}

.info-row.total .info-label {
	color: $textMainColor;
}

.cost-divider {
	height: 1px;
	background: #eee;
	margin: 6px 0;
}
</style>
