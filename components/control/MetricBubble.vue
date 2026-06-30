<template>
	<view class="metric-bubble" :style="bubbleStyle">
		<view class="bubble-ring">
			<canvas
				canvas-id="ringCanvas"
				:id="canvasId"
				class="ring-canvas"
				:style="{ width: '82px', height: '82px' }"
			></canvas>
		</view>
		<view class="bubble-inner" :style="innerStyle">
			<text class="bubble-value">{{ value }}</text>
			<text class="bubble-label">{{ label }}</text>
		</view>
	</view>
</template>

<script setup>
import { computed, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
	value: { type: String, default: '0' },
	label: { type: String, default: '' },
	accent: { type: String, default: '#6120A8' },
	progress: { type: Number, default: 0 },
	animated: { type: Boolean, default: false },
});

const canvasId = computed(() => 'ring_' + Math.random().toString(36).slice(2, 9));

const bubbleStyle = computed(() => ({
	'--accent': props.accent,
}));

const innerStyle = computed(() => ({
	boxShadow: `0 10px 22px ${props.accent}29, 0 4px 12px rgba(0, 0, 0, 0.06)`,
}));

let animFrame = null;
let currentProgress = 0;

function drawRing(targetProgress) {
	const ctx = uni.createCanvasContext(canvasId.value);
	if (!ctx) return;

	const size = 82;
	const center = size / 2;
	const radius = (size - 8) / 2;

	ctx.clearRect(0, 0, size, size);

	// 背景圆弧
	ctx.beginPath();
	ctx.arc(center, center, radius, -Math.PI / 2, Math.PI * 1.5, false);
	ctx.strokeStyle = '#E1F0EF';
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.stroke();

	// 进度圆弧
	const endAngle = -Math.PI / 2 + Math.PI * 2 * targetProgress;
	ctx.beginPath();
	ctx.arc(center, center, radius, -Math.PI / 2, endAngle, false);
	ctx.strokeStyle = props.accent + 'B3'; // 70% opacity
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.stroke();

	ctx.draw();
}

function animateTo(target) {
	if (!props.animated) {
		currentProgress = target;
		drawRing(target);
		return;
	}
	const start = currentProgress;
	const diff = target - start;
	const duration = 400;
	const startTime = Date.now();

	function step() {
		const elapsed = Date.now() - startTime;
		const t = Math.min(elapsed / duration, 1);
		// easeOutCubic
		const ease = 1 - Math.pow(1 - t, 3);
		currentProgress = start + diff * ease;
		drawRing(currentProgress);
		if (t < 1) {
			animFrame = setTimeout(step, 16);
		}
	}
	step();
}

onMounted(() => {
	nextTick(() => {
		currentProgress = props.progress;
		drawRing(props.progress);
	});
});

watch(() => props.progress, (newVal) => {
	nextTick(() => {
		animateTo(newVal);
	});
});
</script>

<style scoped>
.metric-bubble {
	width: 82px;
	height: 82px;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}

.bubble-ring {
	position: absolute;
	inset: 0;
}

.ring-canvas {
	width: 82px;
	height: 82px;
}

.bubble-inner {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.68);
	border: 1px solid rgba(255, 255, 255, 0.9);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	z-index: 1;
}

.bubble-value {
	font-size: 16px;
	font-weight: 900;
	color: #28123E;
	line-height: 1.2;
}

.bubble-label {
	font-size: 10px;
	font-weight: 800;
	color: #28123E;
	margin-top: 2px;
}
</style>
