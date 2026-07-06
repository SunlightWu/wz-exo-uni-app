<template>
	<view class="glass-panel" :style="panelStyle">
		<slot></slot>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	padding: { type: String, default: '16px' },
	radius: { type: Number, default: 26 },
	accent: { type: String, default: '#6120A8' },
});

const panelStyle = computed(() => ({
	padding: props.padding,
	borderRadius: props.radius + 'px',
	'--glow-color': props.accent,
}));
</script>

<style scoped>
.glass-panel {
	background: rgba(255, 255, 255, 0.72);
	backdrop-filter: blur(28px);
	-webkit-backdrop-filter: blur(28px);
	border: 1.2px solid rgba(255, 255, 255, 0.9);
	box-shadow:
		0 12px 28px rgba(0, 0, 0, 0.06),
		0 4px 12px rgba(0, 0, 0, 0.04);
	position: relative;
	overflow: hidden;
}
</style>
