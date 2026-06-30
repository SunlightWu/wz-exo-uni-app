<template>
	<view class="mode-switch-bar">
		<view class="mode-switch-inner">
			<view
				class="mode-indicator"
				:style="indicatorStyle"
			></view>
			<view
				v-for="mode in props.modes"
				:key="mode.id"
				class="mode-item"
				:class="{ active: props.selectedModeId === mode.id, loading: isLoadingTarget(mode.id) }"
				@click="onSelect(mode)"
			>
				<view class="mode-icon" :style="{ color: props.selectedModeId === mode.id ? '#fff' : mode.accent }">
					<text class="iconfont" :class="mode.iconClass">{{ mode.icon }}</text>
				</view>
				<text
					class="mode-title"
					:style="{ color: props.selectedModeId === mode.id ? '#fff' : '#5D5A83' }"
				>
					{{ mode.title }}
				</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	modes: {
		type: Array,
		default: () => [
			{ id: 'transparent', title: '透明', subtitle: 'TRANSPARENT', accent: '#43CDB7', icon: '\uE6A8' },
			{ id: 'assist', title: '助力', subtitle: 'ASSIST', accent: '#746AF2', icon: '\uE6A9' },
			{ id: 'training', title: '训练', subtitle: 'TRAINING', accent: '#D96AF0', icon: '\uE6AA' },
		],
	},
	selectedModeId: { type: String, default: 'transparent' },
	loadingTargetMode: { type: String, default: null },
	enabled: { type: Boolean, default: true },
	commandLoading: { type: Set, default: () => new Set() },
});

const emit = defineEmits(['select']);

const selectedIndex = computed(() => {
	const idx = props.modes.findIndex(m => m.id === props.selectedModeId);
	return idx < 0 ? 0 : idx;
});

const selectedMode = computed(() => props.modes[selectedIndex.value] || props.modes[0]);

const indicatorStyle = computed(() => ({
	left: `${selectedIndex.value * (100 / props.modes.length)}%`,
	width: `${100 / props.modes.length}%`,
	background: `linear-gradient(90deg, ${selectedMode.value.accent}DB, ${selectedMode.value.accent}6B)`,
}));

function isLoadingTarget(modeId) {
	return props.commandLoading.has('modeSwitch') && props.loadingTargetMode === modeId;
}

function onSelect(mode) {
	if (!props.enabled || props.commandLoading.has('modeSwitch')) return;
	emit('select', mode);
}
</script>

<style scoped>
.mode-switch-bar {
	border-radius: 32px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.58);
	backdrop-filter: blur(24px);
	-webkit-backdrop-filter: blur(24px);
	border: 1px solid rgba(255, 255, 255, 0.74);
	box-shadow:
		0 12px 24px rgba(154, 127, 232, 0.2);
	padding: 7px;
}

.mode-switch-inner {
	position: relative;
	display: flex;
	height: 58px;
	border-radius: 26px;
}

.mode-indicator {
	position: absolute;
	inset: 0;
	border-radius: 26px;
	transition: left 260ms cubic-bezier(0.215, 0.61, 0.355, 1),
		width 260ms cubic-bezier(0.215, 0.61, 0.355, 1),
		background 260ms ease;
}

.mode-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 5px;
	position: relative;
	z-index: 1;
	border-radius: 26px;
	transition: opacity 0.2s;
}

.mode-item:active {
	opacity: 0.7;
}

.mode-icon {
	font-size: 20px;
	line-height: 1;
	transition: color 260ms ease;
}

.mode-title {
	font-size: 11px;
	font-weight: 900;
	transition: color 260ms ease;
}
</style>
