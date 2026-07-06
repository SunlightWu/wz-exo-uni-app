<template>
	<view class="detail-page">
		<!-- 时间地点 -->
		<view class="header-info">
			<text class="date-text">{{ report.date }}</text>
			<text class="duration-text">{{ formatTime(report.duration) }}</text>
			<text class="location-text">{{ report.location }} · {{ report.deviceSn }}</text>
		</view>

		<!-- 运动轨迹 -->
		<view class="card" v-if="trajectoryPoints.length > 0">
			<text class="card-title">📍 运动轨迹</text>
			<TrajectoryMap :points="trajectoryPoints" height="200px" :show-location="false" />
		</view>

		<!-- 运动概况 -->
		<view class="card">
			<text class="card-title">运动概况</text>
			<view class="overview-grid">
				<view class="overview-item">
					<text class="ov-label">总步数</text>
					<text class="ov-value">{{ report.steps.toLocaleString() }}</text>
				</view>
				<view class="overview-item">
					<text class="ov-label">总时长</text>
					<text class="ov-value">{{ formatTime(report.duration) }}</text>
				</view>
				<view class="overview-item">
					<text class="ov-label">平均速度</text>
					<text class="ov-value">{{ report.avgSpeed }} km/h</text>
				</view>
				<view class="overview-item">
					<text class="ov-label">消耗热量</text>
					<text class="ov-value">{{ report.calories }} kcal</text>
				</view>
				<view class="overview-item full-width">
					<text class="ov-label">平均对称性</text>
					<text class="ov-value symmetry">{{ report.symmetry }}%</text>
					<view class="symmetry-bar">
						<view class="symmetry-fill" :style="{ width: report.symmetry + '%' }"></view>
					</view>
				</view>
			</view>
		</view>

		<!-- 模式分布 -->
		<view class="card">
			<text class="card-title">📈 模式分布</text>
			<view v-for="(pct, mode) in report.modeDistribution" :key="mode" class="mode-bar-row">
				<text class="mode-bar-label">{{ modeLabel(mode) }}</text>
				<view class="mode-bar-track">
					<view class="mode-bar-fill" :style="{ width: pct + '%', background: modeColor(mode) }"></view>
				</view>
				<text class="mode-bar-pct">{{ pct }}%</text>
			</view>
		</view>

		<!-- 步数趋势 -->
		<view class="card">
			<text class="card-title">📉 步数趋势</text>
			<view class="trend-chart">
				<view v-for="(val, i) in trendData" :key="i" class="trend-bar" :style="{ height: (val / maxTrend * 120) + 'px' }">
					<view class="trend-bar-inner" :style="{ height: '100%' }"></view>
				</view>
			</view>
			<view class="trend-labels">
				<text class="trend-label">开始</text>
				<text class="trend-label">结束</text>
			</view>
		</view>

		<!-- 关节对称性 -->
		<view class="card">
			<text class="card-title">🦵 关节对称性</text>
			<text class="symmetry-main">平均对称性: {{ report.symmetry }}%</text>
			<view class="symmetry-legs">
				<view class="leg-bar">
					<text class="leg-label">左步幅</text>
					<view class="leg-track">
						<view class="leg-fill left" :style="{ width: leftStride + '%' }"></view>
					</view>
					<text class="leg-value">{{ leftStride }}%</text>
				</view>
				<view class="leg-bar">
					<text class="leg-label">右步幅</text>
					<view class="leg-track">
						<view class="leg-fill right" :style="{ width: rightStride + '%' }"></view>
					</view>
					<text class="leg-value">{{ rightStride }}%</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, computed, onMounted, ref } from 'vue';
import { api } from '../../services/api.js';
import TrajectoryMap from '../../components/TrajectoryMap.vue';

const report = reactive({
	id: '',
	date: '',
	duration: 0,
	steps: 0,
	avgSpeed: 0,
	calories: 0,
	symmetry: 0,
	modeDistribution: { transparent: 0, assist: 0, training: 0 },
	cost: 0,
	location: '',
	deviceSn: '',
})

const trendData = [12, 28, 45, 38, 52, 48, 63, 55, 42, 58, 50, 35]
const maxTrend = Math.max(...trendData)

const leftStride = computed(() => Math.round((100 - report.symmetry) / 2 + (report.symmetry - 50)))
const rightStride = computed(() => 100 - leftStride.value)

// 轨迹数据
const trajectoryPoints = ref([])

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const query = currentPage.options || currentPage.$page?.options || currentPage.$route?.query || {}
	const id = query.id || ''

	if (id && id !== 'latest') {
		// 调用真实接口获取订单详情
		api.getLeaseStatusByTradeNo(id).then(res => {
			if ((res.code === 200 || res.code === 0) && res.data) {
				const d = res.data
				report.id = d.tradeNo
				report.date = d.pickupTime ? new Date(d.pickupTime).toLocaleDateString() : ''
				report.duration = d.duration || 0
				report.cost = (d.actualCost || 0) / 100
				report.deviceSn = d.deviceSn || ''
				report.location = d.placeName || ''
				// 查询设备轨迹
				loadTrajectory(d.deviceSn)
			}
		}).catch(() => {})
	}
})

// 查询设备轨迹
async function loadTrajectory(deviceSn) {
	if (!deviceSn) return
	try {
		const res = await api.getTrajectoryList(deviceSn)
		if ((res.code === 200 || res.code === 0) && Array.isArray(res.data)) {
			trajectoryPoints.value = res.data.map(p => ({
				latitude: parseFloat(p.latitude),
				longitude: parseFloat(p.longitude),
				timestamp: p.reportTime || p.createTime,
			}))
		}
	} catch (e) {
		console.warn('[Trajectory] 查询轨迹失败:', e.message)
	}
}

function modeLabel(mode) {
	const map = { transparent: '透明', assist: '助力', training: '训练', all: '全部' }
	return map[mode] || mode
}

function modeColor(mode) {
	const colors = { transparent: '$primaryColor', assist: '#5D8EF0', training: '#FF9F43' }
	return colors[mode] || '#888'
}

function formatTime(seconds) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}分${s}秒`
}
</script>

<style scoped lang="scss">
.detail-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 16px 40px;
}

.header-info { text-align: center; padding: 16px 0 20px; }
.date-text { font-size: 20px; font-weight: 900; color: #333; display: block; }
.duration-text { font-size: 14px; color: #999; margin-top: 4px; display: block; }
.location-text { font-size: 13px; color: #999; margin-top: 2px; display: block; }

/* 通用卡片 */
.card {
	background: #fff;
	border-radius: 20px;
	padding: 18px 20px;
	margin-bottom: 14px;
	box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.card-title {
	font-weight: 800;
	font-size: 16px;
	color: #333;
	display: block;
	margin-bottom: 14px;
}

/* 运动概况 */
.overview-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.overview-item {
	width: calc(50% - 6px);
	text-align: center;
	padding: 12px;
	background: #f5f6fa;
	border-radius: 14px;
	box-sizing: border-box;
	&.full-width { width: 100%; }
}
.ov-label { font-size: 12px; font-weight: 600; color: #999; display: block; margin-bottom: 4px; }
.ov-value { font-size: 20px; font-weight: 900; color: $primaryColor;
	&.symmetry { color: #5D8EF0; }
}
.symmetry-bar { height: 6px; border-radius: 3px; background: #eee; margin-top: 8px; }
.symmetry-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, $primaryColor, #5D8EF0); }

/* 模式分布 */
.mode-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.mode-bar-label { width: 40px; font-size: 13px; font-weight: 600; color: #333; }
.mode-bar-track { flex: 1; height: 12px; border-radius: 6px; background: #f5f6fa; overflow: hidden; }
.mode-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s; }
.mode-bar-pct { width: 36px; font-size: 13px; font-weight: 700; color: #999; text-align: right; }

/* 步数趋势 */
.trend-chart { display: flex; align-items: flex-end; gap: 4px; height: 130px; padding: 10px 0; }
.trend-bar { flex: 1; border-radius: 3px 3px 0 0; background: #f0f0f0; position: relative; }
.trend-bar-inner { width: 100%; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, $primaryLight, $primaryColor); }
.trend-labels { display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
.trend-label { font-size: 11px; color: #999; }

/* 关节对称性 */
.symmetry-main { font-size: 16px; font-weight: 800; color: #333; text-align: center; margin-bottom: 16px; display: block; }
.leg-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.leg-label { width: 50px; font-size: 13px; font-weight: 600; color: #333; }
.leg-track { flex: 1; height: 10px; border-radius: 5px; background: #f5f6fa; overflow: hidden; }
.leg-fill { height: 100%; border-radius: 5px;
	&.left { background: $primaryColor; }
	&.right { background: #5D8EF0; }
}
.leg-value { width: 40px; font-size: 13px; font-weight: 700; text-align: right; color: #333; }
</style>
