<template>
	<view class="bottom-drawer" :style="drawerStyle">
		<!-- 拖动条 -->
		<view class="drawer-handle-bar" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @click="toggle">
			<view class="drawer-indicator"></view>
		</view>
		<!-- 内容 -->
		<view class="drawer-content">
			<slot></slot>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
	minHeight: { type: Number, default: 220 },
	maxHeight: { type: Number, default: 650 },
	expanded: { type: Boolean, default: false },
});

const emit = defineEmits(['update:expanded', 'change']);

const isExpanded = ref(props.expanded);
const currentHeight = ref(props.expanded ? props.maxHeight : props.minHeight);
const isDragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);

watch(() => props.expanded, (val) => {
	isExpanded.value = val;
	currentHeight.value = val ? props.maxHeight : props.minHeight;
});

const drawerStyle = computed(() => ({
	transform: `translateY(calc(100vh - ${currentHeight.value}px - constant(safe-area-inset-bottom) - env(safe-area-inset-bottom)))`,
	transition: isDragging.value ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
	height: `${currentHeight.value}px`,
}));

function onTouchStart(e) {
	isDragging.value = true;
	startY.value = e.touches[0].clientY;
	startHeight.value = currentHeight.value;
}

function onTouchMove(e) {
	if (!isDragging.value) return;
	const deltaY = startY.value - e.touches[0].clientY;
	let newHeight = startHeight.value + deltaY;
	newHeight = Math.max(props.minHeight, Math.min(props.maxHeight, newHeight));
	currentHeight.value = newHeight;
}

function onTouchEnd() {
	isDragging.value = false;
	const threshold = (props.minHeight + props.maxHeight) / 2;
	if (currentHeight.value > threshold) {
		expand();
	} else {
		collapse();
	}
}

function toggle() {
	if (isExpanded.value) {
		collapse();
	} else {
		expand();
	}
}

function expand() {
	isExpanded.value = true;
	currentHeight.value = props.maxHeight;
	emit('update:expanded', true);
	emit('change', true);
}

function collapse() {
	isExpanded.value = false;
	currentHeight.value = props.minHeight;
	emit('update:expanded', false);
	emit('change', false);
}
</script>

<style scoped lang="scss">
.bottom-drawer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 200;
	background: rgba(255, 255, 255, 0.96);
	backdrop-filter: blur(20px);
	-webkit-backdrop-filter: blur(20px);
	border-radius: 24px 24px 0 0;
	box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
	pointer-events: auto;
}

.drawer-handle-bar {
	flex-shrink: 0;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.drawer-indicator {
	width: 40px;
	height: 5px;
	background: #d1d5db;
	border-radius: 3px;
}

.drawer-content {
	flex: 1;
	overflow-y: auto;
	padding: 0 16px 24px;
	box-sizing: border-box;
}
</style>
