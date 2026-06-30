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
			<view class="slider-wrap">
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
import { ref, computed, watch, getCurrentInstance } from 'vue';

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
	width: `${animProgress.value * 100}%`,
	backgroundColor: props.accent + '6B',
}));

const thumbStyle = computed(() => ({
	left: `calc(${animProgress.value * 100}% - 18px)`,
}));

function setLevel(value, end = true) {
	const next = Math.max(1, Math.min(10, value));
	const current = Math.round(displayLevel.value).clamp(1, 10);
	if (next !== current) {
		let vibrateType = 'medium';
		if (next <= 3) vibrateType = 'light';
		else if (next >= 8) vibrateType = 'heavy';
		uni.vibrateShort({ type: vibrateType });
	}
	displayLevel.value = next;
	dragging.value = !end;
	if (end) {
		emit('change', next);
	}
}

function onMinus() {
	if (snappedLevel.value > 1) {
		setLevel(snappedLevel.value - 1, true);
	}
}

function onPlus() {
	if (snappedLevel.value < 10) {
		setLevel(snappedLevel.value + 1, true);
	}
}

function onTrackTap(e) {
	const instance = getCurrentInstance();
	const query = uni.createSelectorQuery().in(instance);
	query.select('.slider-track').boundingClientRect(rect => {
		if (!rect) return;
		const x = e.detail.x - rect.left;
		const ratio = Math.max(0, Math.min(1, x / rect.width));
		setLevel(Math.round(1 + ratio * 9), true);
	}).exec();
}

// 初始化
animProgress.value = progress.value;
</script>

<script>
Number.prototype.clamp = function(min, max) {
	return Math.max(min, Math.min(max, this));
};
</script>

<style scoped>
.level-selector {
	margin-top: 18px;
}

.level-label {
	font-size: 14px;
	font-weight: 900;
	color: #28123E;
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
	color: #28123E;
	line-height: 1;
}

.slider-wrap {
	flex: 1;
	position: relative;
	height: 56px;
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
	width: 36px;
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
	top: 36px;
	display: flex;
	justify-content: space-between;
	padding: 0 6px;
}

.level-num {
	font-size: 14px;
	font-weight: 900;
	color: #85689D;
	width: 24px;
	text-align: center;
	transition: color 0.2s;
}

.level-num.active {
	color: #28123E;
}
</style>
