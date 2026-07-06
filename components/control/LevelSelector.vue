<template>
	<view class="level-selector" v-if="props.visible">
		<text class="level-label">{{ props.label }}</text>
		<view class="level-row">
			<view
				class="round-btn"
				:class="{ disabled: snappedLevel <= 1 }"
				@click="onMinus"
			>
				<text class="btn-icon">-</text>
			</view>
			<view
				class="slider-wrap"
				:class="{ dragging: dragging }"
				@touchstart="onTouchStart"
				@touchmove="onTouchMove"
				@touchend="onTouchEnd"
				@touchcancel="onTouchEnd"
			>
				<view class="slider-track" @click="onTrackTap" ref="trackRef">
					<view class="slider-fill" :style="fillStyle"></view>
				</view>
				<view class="slider-thumb" :style="thumbStyle">
					<view class="thumb-bar" :style="{ background: props.accent }"></view>
				</view>
				<view class="level-labels">
					<text
						v-for="i in 10"
						:key="i"
						class="level-num"
						:class="{ active: i === animSnapped }"
					>
						{{ i }}
					</text>
				</view>
			</view>
			<view
				class="round-btn"
				:class="{ disabled: snappedLevel >= 10 }"
				@click="onPlus"
			>
				<text class="btn-icon">+</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance, onMounted } from 'vue';

function hexToRgba(hex, alpha) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const props = defineProps({
	visible: { type: Boolean, default: true },
	label: { type: String, default: '助力等级' },
	level: { type: Number, default: 1 },
	accent: { type: String, default: '#6120A8' },
});

const emit = defineEmits(['change']);

const displayLevel = ref(props.level);
const dragging = ref(false);

const snappedLevel = computed(() => {
	return Math.round(displayLevel.value).clamp(1, 10);
});

const progress = computed(() => {
	return ((displayLevel.value - 1) / 9).clamp(0, 1);
});

const animProgress = ref(progress.value);
const animSnapped = computed(() => Math.round(animProgress.value * 9 + 1).clamp(1, 10));

// _easeOutBack: Cubic(0.34, 1.2, 0.64, 1.0)
function easeOutBack(t) {
	const c1 = 1.2;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

let animFrame = null;
function animateTo(target) {
	const start = animProgress.value;
	const diff = target - start;
	const duration = dragging.value ? 0 : 220;
	if (duration === 0) {
		animProgress.value = target;
		return;
	}
	const startTime = Date.now();
	function step() {
		const elapsed = Date.now() - startTime;
		const t = Math.min(elapsed / duration, 1);
		const eased = easeOutBack(t);
		animProgress.value = (start + diff * eased).clamp(0, 1);
		if (t < 1) {
			animFrame = setTimeout(step, 16);
		}
	}
	step();
}

watch(() => props.level, (newVal) => {
	if (!dragging.value) {
		displayLevel.value = newVal;
		animateTo(((newVal - 1) / 9).clamp(0, 1));
	}
});

watch(progress, (newVal) => {
	animateTo(newVal);
});

const fillStyle = computed(() => ({
	width: `calc(14px + (100% - 28px) * ${animProgress.value})`,
	backgroundColor: hexToRgba(props.accent, 0.42),
}));

const thumbStyle = computed(() => ({
	left: `calc((100% - 28px) * ${animProgress.value})`,
}));

// ── 防抖 emit：按钮点击 / 拖动结束 / 轨道点击 都走这里 ──
let debounceTimer = null;
const DEBOUNCE_MS = 300;

function emitChange(value) {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		emit('change', value);
	}, DEBOUNCE_MS);
}

function updateLevel(value, shouldEmit = true) {
	const next = Math.max(1, Math.min(10, value));
	const current = Math.round(displayLevel.value).clamp(1, 10);
	if (next !== current) {
		let vibrateType = 'medium';
		if (next <= 3) vibrateType = 'light';
		else if (next >= 8) vibrateType = 'heavy';
		uni.vibrateShort({ type: vibrateType });
	}
	displayLevel.value = next;
	if (shouldEmit) {
		emitChange(next);
	}
}

function onMinus() {
	if (snappedLevel.value > 1) {
		updateLevel(snappedLevel.value - 1);
	}
}

function onPlus() {
	if (snappedLevel.value < 10) {
		updateLevel(snappedLevel.value + 1);
	}
}

// ── Touch 滑动 ──
let trackRect = null;

function createTrackQuery() {
	const instance = getCurrentInstance();
	// 微信小程序自定义组件中，使用 instance.proxy 避免 $scope null 错误
	if (instance && instance.proxy) {
		try {
			return uni.createSelectorQuery().in(instance.proxy);
		} catch (e) {
			// fallback
		}
	}
	return uni.createSelectorQuery();
}

function fetchTrackRect(callback) {
	const query = createTrackQuery();
	query.select('.slider-track').boundingClientRect(rect => {
		if (rect) trackRect = rect;
		if (callback) callback(rect);
	}).exec();
}

function onTrackTap(e) {
	const pageX = e.detail.x;
	if (trackRect) {
		const x = pageX - trackRect.left;
		const ratio = Math.max(0, Math.min(1, x / trackRect.width));
		updateLevel(Math.round(1 + ratio * 9));
	} else {
		fetchTrackRect((rect) => {
			if (!rect) return;
			const x = pageX - rect.left;
			const ratio = Math.max(0, Math.min(1, x / rect.width));
			updateLevel(Math.round(1 + ratio * 9));
		});
	}
}

function onTouchStart(e) {
	dragging.value = true;
	if (animFrame) {
		clearTimeout(animFrame);
		animFrame = null;
	}
	if (trackRect) {
		onTouchMove(e);
	} else {
		fetchTrackRect(() => onTouchMove(e));
	}
}

function onTouchMove(e) {
	if (!dragging.value) return;
	const touch = e.touches[0];
	if (!touch || !trackRect) return;
	const x = touch.clientX - trackRect.left;
	const ratio = Math.max(0, Math.min(1, x / trackRect.width));
	displayLevel.value = Math.round(1 + ratio * 9).clamp(1, 10);
	animProgress.value = ratio.clamp(0, 1);
}

function onTouchEnd() {
	if (!dragging.value) return;
	dragging.value = false;
	// 拖动结束时 emit
	emitChange(snappedLevel.value);
}

// 初始化：延迟获取轨道位置，避免 $scope 未就绪
onMounted(() => {
	animProgress.value = progress.value;
	setTimeout(() => {
		fetchTrackRect();
	}, 100);
});
</script>

<script>
Number.prototype.clamp = function(min, max) {
	return Math.max(min, Math.min(max, this));
};
</script>

<style scoped>
.level-selector {
	/* margin: 18px 0; */
}

.level-label {
	font-size: 14px;
	font-weight: 900;
	color: #333;
	margin-bottom: 10px;
	display: block;
}

.level-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.round-btn {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.72);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: opacity 0.2s;
}

.round-btn:active {
	opacity: 0.7;
}

.round-btn.disabled {
	opacity: 0.3;
	pointer-events: none;
}

.btn-icon {
	font-size: 28px;
	font-weight: 300;
	color: #333;
	line-height: 1;
}

.slider-wrap {
	flex: 1;
	position: relative;
	height: 66px;
}

.slider-wrap.dragging .slider-thumb,
.slider-wrap.dragging .slider-fill {
	transition: none;
}

.slider-track {
	position: absolute;
	left: 0;
	right: 0;
	top: 14px;
	height: 14px;
	background: #fff;
	border-radius: 999px;
	overflow: hidden;
}

.slider-fill {
	height: 100%;
	transition: width 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

.slider-thumb {
	position: absolute;
	top: 2px;
	width: 28px;
	height: 42px;
	background: #fff;
	border-radius: 999px;
	box-shadow:
		0 8px 16px rgba(0, 0, 0, 0.08),
		0 2px 8px rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: left 220ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

.thumb-bar {
	width: 5px;
	height: 20px;
	border-radius: 999px;
}

.level-labels {
	position: absolute;
	left: 0;
	right: 0;
	top: 46px;
	display: flex;
	justify-content: space-between;
	padding: 0 4px;
}

.level-num {
	width: 20px;
	font-size: 14px;
	font-weight: 900;
	color: #999;
	text-align: center;
	transition: color 0.2s;
}

.level-num.active {
	color: #333;
}
</style>
