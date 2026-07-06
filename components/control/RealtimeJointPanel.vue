<template>
	<GlassPanel padding="14px 16px 16px" :radius="22" :accent="props.accent">
		<view class="joint-panel">
			<text class="panel-title">实时关节数据</text>
			<view class="joint-row">
				<view class="joint-tile">
					<text class="tile-title" :style="{ color: props.accent }">左腿</text>
					<text class="tile-subtitle">髋关节角度</text>
					<view class="tile-data">
						<text class="tile-angle">{{ leftAngle }}°</text>
						<view class="spark-wrap">
							<canvas
							id="sparkLeft"
							canvas-id="sparkLeft"
							class="spark-canvas"
							:style="{ width: '100%', height: '100%' }"
						></canvas>
						</view>
					</view>
				</view>
				<view class="divider"></view>
				<view class="joint-tile">
					<text class="tile-title" :style="{ color: props.accent }">右腿</text>
					<text class="tile-subtitle">髋关节角度</text>
					<view class="tile-data">
						<text class="tile-angle">{{ rightAngle }}°</text>
						<view class="spark-wrap">
							<canvas
							id="sparkRight"
							canvas-id="sparkRight"
							class="spark-canvas"
							:style="{ width: '100%', height: '100%' }"
						></canvas>
						</view>
					</view>
				</view>
			</view>
		</view>
	</GlassPanel>
</template>

<script setup>
import { computed, watch, onMounted, nextTick } from 'vue';
import GlassPanel from './GlassPanel.vue';

const props = defineProps({
	status: {
		type: Object,
		default: () => ({ leftHipAngle: 0, rightHipAngle: 0 }),
	},
	angleWindow: {
		type: Array,
		default: () => [],
	},
	accent: { type: String, default: '#6120A8' },
});

const leftAngle = computed(() => Math.round(props.status.leftHipAngle || 0));
const rightAngle = computed(() => Math.round(props.status.rightHipAngle || 0));

const WAVE_VALUES = [
	0.10, 0.18, 0.12, 0.22, 0.20, 0.32, 0.28, 0.44, 0.38, 0.56,
	0.48, 0.82, 0.92, 0.78, 0.48, 0.36, 0.42, 0.52, 0.46, 0.40,
	0.48, 0.44, 0.50, 0.46,
];

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawSpark(canvasId, points, isRight) {
	const ctx = uni.createCanvasContext(canvasId);
	if (!ctx) return;

	const w = 80;
	const h = 36;

	ctx.clearRect(0, 0, w, h);

	// 基线
	ctx.beginPath();
	ctx.moveTo(0, h * 0.62);
	ctx.lineTo(w, h * 0.62);
	ctx.strokeStyle = 'rgba(133,104,157,0.10)';
	ctx.lineWidth = 1;
	ctx.stroke();

	if (!points || points.length < 2) {
		// 占位波浪
		ctx.beginPath();
		for (let i = 0; i < 24; i++) {
			const x = (w * i) / 23;
			const y = h * (0.58 - 0.13 * WAVE_VALUES[i % WAVE_VALUES.length]);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.strokeStyle = hexToRgba(props.accent, 0.70);
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
	} else {
		const latest = points[points.length - 1].timestampMs || Date.now();
		const windowMs = 15000;
		const minTime = latest - windowMs;
		const minAngle = -90;
		const maxAngle = 90;

		ctx.beginPath();
		let started = false;
		for (const p of points) {
			const ts = p.timestampMs || 0;
			if (ts < minTime) continue;
			const elapsed = Math.max(0, Math.min(windowMs, ts - minTime));
			const val = isRight ? (p.rightHipAngle || 0) : (p.leftHipAngle || 0);
			const normalized = Math.max(0, Math.min(1, (val - minAngle) / (maxAngle - minAngle)));
			const x = (w * elapsed) / windowMs;
			const y = h - normalized * h;
			if (!started) {
				ctx.moveTo(x, y);
				started = true;
			} else {
				ctx.lineTo(x, y);
			}
		}
		ctx.strokeStyle = props.accent;
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke();
	}

	ctx.draw();
}

function redraw() {
	nextTick(() => {
		drawSpark('sparkLeft', props.angleWindow, false);
		drawSpark('sparkRight', props.angleWindow, true);
	});
}

onMounted(() => {
	redraw();
});

watch(() => [props.status.leftHipAngle, props.status.rightHipAngle], () => {
	redraw();
}, { deep: true });
</script>

<style scoped>
.joint-panel {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.panel-title {
	font-size: 14px;
	font-weight: 900;
	color: #333;
}

.joint-row {
	display: flex;
	align-items: stretch;
}

.joint-tile {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.tile-title {
	font-size: 14px;
	font-weight: 900;
}

.tile-subtitle {
	font-size: 11px;
	font-weight: 800;
	color: #999;
}

.tile-data {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 2px;
	min-height: 40px;
}

.tile-angle {
	font-size: 22px;
	font-weight: 900;
	color: #333;
	flex-shrink: 0;
}

.spark-wrap {
	flex: 1;
	height: 36px;
}

.spark-canvas {
	width: 100%;
	height: 100%;
}

.divider {
	width: 1px;
	background: rgba(0, 0, 0, 0.08);
	margin: 0 14px;
	align-self: stretch;
}
</style>
