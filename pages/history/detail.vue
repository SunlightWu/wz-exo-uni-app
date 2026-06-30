<template>
	<view class="detail-page">
		<view class="page-padding">
			<!-- 时间地点 -->
			<view class="header-info">
				<text class="date-text">{{ report.date }}</text>
				<text class="duration-text">{{ formatTime(report.duration) }}</text>
				<text class="location-text">{{ report.location }} · {{ report.deviceSn }}</text>
			</view>

			<!-- 运动概况 -->
			<view class="overview-card sci-card">
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
			<view class="mode-card sci-card">
				<text class="card-title">📈 模式分布</text>
				<view v-for="(pct, mode) in report.modeDistribution" :key="mode" class="mode-bar-row">
					<text class="mode-bar-label">{{ modeLabel(mode) }}</text>
					<view class="mode-bar-track">
						<view class="mode-bar-fill" :style="{ width: pct + '%', background: modeColor(mode) }"></view>
					</view>
					<text class="mode-bar-pct">{{ pct }}%</text>
				</view>
			</view>

			<!-- 步数趋势（模拟折线图） -->
			<view class="trend-card sci-card">
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
			<view class="symmetry-card sci-card">
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
	</view>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue';
import { api } from '../../services/api.js';

const report = reactive({
	id: '',
	date: '2026-06-24',
	duration: 3150,
	steps: 3247,
	avgSpeed: 3.2,
	calories: 128,
	symmetry: 94.2,
	modeDistribution: { transparent: 10, assist: 65, training: 25 },
	cost: 25.00,
	location: 'CDC康复中心',
	deviceSn: 'WZ-EXO-S3-001',
})

// 模拟步数趋势数据
const trendData = [12, 28, 45, 38, 52, 48, 63, 55, 42, 58, 50, 35]
const maxTrend = Math.max(...trendData)

const leftStride = computed(() => Math.round((100 - report.symmetry) / 2 + (report.symmetry - 50)))
const rightStride = computed(() => 100 - leftStride.value)

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const id = currentPage?.$page?.options?.id || ''

	if (id && id !== 'latest') {
		api.getHistoryDetail(id).then(res => {
			if (res.code === 0) {
				Object.assign(report, res.data)
			}
		})
	}
})

function modeLabel(mode) {
	const map = { transparent: '透明', assist: '助力', training: '训练', all: '全部' }
	return map[mode] || mode
}

function modeColor(mode) {
	const colors = { transparent: '#43CDB7', assist: '#746AF2', training: '#D96AF0' }
	return colors[mode] || '#888'
}

function formatTime(seconds) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}分${s}秒`
}
</script>

<style scoped lang="scss">
.detail-page { @include page-base; background: $pageBg; padding: 16px 0 40px; }
.page-padding { padding: 0 18px; }

.header-info { text-align: center; padding: 16px 0 20px; }
.date-text { font-size: 20px; font-weight: 900; color: $textMainColor; display: block; }
.duration-text { font-size: 14px; color: $textSubColor; margin-top: 4px; display: block; }
.location-text { font-size: 13px; color: $textSubColor; margin-top: 2px; display: block; }

.card-title { font-weight: 800; font-size: 16px; color: $textMainColor; display: block; margin-bottom: 14px; }
.sci-card { margin-bottom: 14px; }

.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.overview-item { text-align: center; padding: 12px; background: $pageBg; border-radius: $radiusSm;
  &.full-width { grid-column: 1 / -1; }
}
.ov-label { font-size: 12px; font-weight: 600; color: $textSubColor; display: block; margin-bottom: 4px; }
.ov-value { font-size: 20px; font-weight: 900; color: #7F77DD;
  &.symmetry { color: #1D9E75; }
}
.symmetry-bar { height: 6px; border-radius: 3px; background: $borderColor; margin-top: 8px; }
.symmetry-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #1D9E75, #7F77DD); }

.mode-bar-row { @include flex-row(10px); margin-bottom: 10px; }
.mode-bar-label { width: 40px; font-size: 13px; font-weight: 600; color: $textMainColor; }
.mode-bar-track { flex: 1; height: 12px; border-radius: 6px; background: $cardSoftBg; }
.mode-bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s; }
.mode-bar-pct { width: 36px; font-size: 13px; font-weight: 700; color: $textSubColor; text-align: right; }

.trend-chart { display: flex; align-items: flex-end; gap: 4px; height: 130px; padding: 10px 0; }
.trend-bar { flex: 1; border-radius: 3px 3px 0 0; background: $cardSoftBg; position: relative; }
.trend-bar-inner { width: 100%; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #C45BFF, $primaryColor); }
.trend-labels { @include flex-between; padding: 0 4px; }
.trend-label { font-size: 11px; color: $textSubColor; }

.symmetry-main { font-size: 16px; font-weight: 800; color: $textMainColor; text-align: center; margin-bottom: 16px; display: block; }
.leg-bar { @include flex-row(10px); margin-bottom: 10px; }
.leg-label { width: 50px; font-size: 13px; font-weight: 600; }
.leg-track { flex: 1; height: 10px; border-radius: 5px; background: $cardSoftBg; }
.leg-fill { height: 100%; border-radius: 5px;
  &.left { background: #7F77DD; }
  &.right { background: #C45BFF; }
}
.leg-value { width: 40px; font-size: 13px; font-weight: 700; text-align: right; }
</style>

