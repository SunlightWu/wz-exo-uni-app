<template>
	<view class="order-page">
		<!-- Tab 切换 u-tabs -->
		<u-tabs
			:list="tabList"
			:current="currentTab"
			lineColor="#6120A8"
			:activeStyle="{ color: '#6120A8', fontWeight: '700' }"
			:inactiveStyle="{ color: '#85689D' }"
			@change="onTabChange"
		></u-tabs>

		<!-- 进行中的订单 -->
		<view v-if="currentTab === 0" class="tab-content">
			<!-- 如果有进行中的订单 -->
			<view v-if="activeOrder" class="active-order sci-card">
				<view class="active-header">
					<u-tag text="使用中" type="success" size="mini" :plain="false"></u-tag>
				</view>
				<text class="order-device">{{ activeOrder.deviceSn }}</text>
				<text class="order-location">{{ activeOrder.location }}</text>
				<view class="order-meta">
					<text class="meta-item">⏱ 剩余 {{ formatTime(activeOrder.remaining) }}</text>
					<text class="meta-item">🚶 {{ activeOrder.steps }} 步</text>
				</view>
				<u-button type="primary" text="继续使用" shape="circle" @click="goToControl"></u-button>
			</view>

			<!-- 无进行中的订单 -->
			<u-empty v-else mode="list" text="暂无进行中的订单" iconColor="#6120A8">
				<template #bottom>
					<u-button type="primary" text="扫码租赁" shape="circle" @click="goScan"></u-button>
				</template>
			</u-empty>
		</view>

		<!-- 历史记录 -->
		<view v-if="currentTab === 1" class="tab-content">
			<view v-for="item in historyList" :key="item.id" class="history-item" @click="goToDetail(item.id)">
				<view class="history-date">
					<text class="date-text">{{ item.date }}</text>
					<text class="date-duration">{{ formatTime(item.duration) }}</text>
				</view>
				<view class="history-meta">
					<u-tag :text="modeLabel(item.mode)" size="mini" type="info" plain></u-tag>
					<text class="meta-steps">{{ item.steps }} 步</text>
				</view>
				<view class="history-cost">
					<text class="cost-value">¥{{ item.cost.toFixed(2) }}</text>
				</view>
			</view>

			<u-empty v-if="historyList.length === 0" mode="data" text="暂无使用记录" iconColor="#6120A8">
				<template #bottom>
					<u-button type="primary" text="扫码租赁" shape="circle" @click="goScan"></u-button>
				</template>
			</u-empty>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../services/api.js';

const currentTab = ref(0)
const activeOrder = ref(null)
const historyList = ref([])

const tabList = [
	{ name: '进行中' },
	{ name: '历史记录' },
]

function onTabChange(e) {
	currentTab.value = e.index
}

onMounted(() => {
	loadData()
})

function loadData() {
	// 检查是否有进行中的租赁
	const lease = uni.getStorageSync('currentLease')
	if (lease) {
		const elapsed = Math.floor((Date.now() - lease.startTime) / 1000)
		activeOrder.value = {
			deviceSn: lease.sn,
			location: 'CDC康复中心 3F',
			remaining: Math.max(0, 3600 - elapsed),
			steps: Math.floor(elapsed * 1.03),
		}
	} else {
		activeOrder.value = null
	}

	// 加载历史
	api.getHistory().then(res => {
		if (res.code === 0) {
			historyList.value = res.data
		}
	})
}

function formatTime(seconds) {
	if (!seconds) return '00:00'
	const h = Math.floor(seconds / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = seconds % 60
	if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
	return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function modeLabel(mode) {
	const map = { transparent: '透明模式', assist: '助力模式', training: '训练模式' }
	return map[mode] || mode
}

function goToControl() {
	uni.navigateTo({ url: '/pages/device/control' })
}

function goToDetail(id) {
	uni.navigateTo({ url: `/pages/history/detail?id=${id}` })
}

function goScan() {
	uni.switchTab({ url: '/pages/index/index' })
	// 延迟触发扫码
	setTimeout(() => {
		uni.scanCode({ onlyFromCamera: true })
	}, 300)
}
</script>

<style scoped lang="scss">
.order-page { @include page-base; padding-top: 8px; }
.order-page .u-tabs { margin-bottom: 4px; }

.tab-content { padding: 8px 18px 40px; }
.active-order { margin-top: 8px; padding: 18px; }
.active-header { @include flex-row; margin-bottom: 14px; }
.order-device { font-size: 18px; font-weight: 800; color: $textMainColor; display: block; }
.order-location { font-size: 13px; color: $textSubColor; margin-top: 6px; display: block; }
.order-meta {
  @include flex-row(24px); margin: 16px 0 20px;
  padding: 12px 16px; background: $pageBg; border-radius: 12px;
}
.meta-item { font-size: 13px; font-weight: 600; color: $textMainColor; }

.history-item {
  @include flex-between; padding: 18px 0;
  border-bottom: 1px solid $borderColor;
  @include tap-active;
  &:last-child { border-bottom: none; }
}
.history-date { flex: 1; }
.date-text { font-size: 15px; font-weight: 700; color: $textMainColor; display: block; }
.date-duration { @include text-caption; margin-top: 4px; display: block; }
.history-meta { flex: 1; text-align: center; }
.meta-steps { @include text-caption; margin-top: 4px; display: block; }
.history-cost { min-width: 70px; text-align: right; }
.cost-value { font-size: 16px; font-weight: 800; color: $primaryColor; }
</style>

