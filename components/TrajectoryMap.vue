<template>
	<view class="trajectory-map-wrap" :style="{ height: height }">
		<map
			:id="mapId"
			class="map-el"
			:latitude="centerLat"
			:longitude="centerLng"
			:scale="displayScale"
			:polyline="polylines"
			:markers="markers"
			:show-location="showLocation"
			:enable-zoom="false"
			:enable-scroll="false"
			:enable-rotate="false"
		></map>
		<view v-if="distanceKm > 0" class="map-badge">
			<text class="badge-text">{{ distanceKm.toFixed(2) }} km</text>
		</view>
	</view>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
	points: {
		type: Array,
		default: () => []
	},
	height: {
		type: String,
		default: '200px'
	},
	showLocation: {
		type: Boolean,
		default: false
	}
});

const mapId = `trajectoryMap_${Math.random().toString(36).slice(2, 10)}`;
const fitTimer = ref(null);
const scaleTimer = ref(null);
const displayScale = ref(18);

// 轨迹点格式: [{ latitude, longitude, timestamp }]
const validPoints = computed(() => {
	return (props.points || [])
		.map(p => ({
			...(p || {}),
			latitude: Number(p?.latitude),
			longitude: Number(p?.longitude),
		}))
		.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
});

// 中心点：取轨迹范围中心，避免点分布不均时偏离轨迹线
const centerLat = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return 39.9042;
	if (pts.length === 1) return pts[0].latitude;
	const lats = pts.map(p => p.latitude);
	return (Math.min(...lats) + Math.max(...lats)) / 2;
});

const centerLng = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return 116.4074;
	if (pts.length === 1) return pts[0].longitude;
	const lngs = pts.map(p => p.longitude);
	return (Math.min(...lngs) + Math.max(...lngs)) / 2;
});

// 缩放级别：根据轨迹线跨度逐级调整，轨迹短时放大，轨迹变长后逐步拉远
const targetScale = computed(() => {
	const pts = validPoints.value;
	if (pts.length <= 1) return 18;
	const lats = pts.map(p => p.latitude);
	const lngs = pts.map(p => p.longitude);
	const minLat = Math.min(...lats);
	const maxLat = Math.max(...lats);
	const minLng = Math.min(...lngs);
	const maxLng = Math.max(...lngs);
	const diagonalMeters = haversine(minLat, minLng, maxLat, maxLng) * 1000;
	if (diagonalMeters < 30) return 18;
	if (diagonalMeters < 80) return 17;
	if (diagonalMeters < 200) return 16;
	if (diagonalMeters < 500) return 15;
	if (diagonalMeters < 1000) return 14;
	if (diagonalMeters < 2500) return 13;
	if (diagonalMeters < 5000) return 12;
	if (diagonalMeters < 10000) return 11;
	if (diagonalMeters < 20000) return 10;
	return 9;
});

const includePoints = computed(() => {
	return validPoints.value.map(p => ({
		latitude: p.latitude,
		longitude: p.longitude,
	}));
});

// 轨迹线
const polylines = computed(() => {
	const pts = validPoints.value;
	if (pts.length < 2) return [];
	return [{
		points: pts.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
		color: '#306afc',
		width: 4,
		arrowLine: true,
		dottedLine: false,
		borderColor: 'rgba(48,106,252,0.15)',
		borderWidth: 2
	}];
});

// 起终点标记
const markers = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return [];
	const ms = [];
	// 起点：空心圆点
	ms.push({
		id: 1,
		latitude: pts[0].latitude,
		longitude: pts[0].longitude,
		title: '起点',
		iconPath: '/static/marker-start.svg',
		width: 32,
		height: 32,
		anchor: { x: 0.5, y: 0.5 }
	});
	// 终点（如果超过1个点）
	if (pts.length > 1) {
		const last = pts[pts.length - 1];
		ms.push({
			id: 2,
			latitude: last.latitude,
			longitude: last.longitude,
			title: '终点',
			iconPath: '/static/marker-end.svg',
			width: 32,
			height: 32,
			anchor: { x: 0.5, y: 0.5 }
		});
	}
	return ms;
});

// 计算轨迹总距离（km）
const distanceKm = computed(() => {
	const pts = validPoints.value;
	if (pts.length < 2) return 0;
	let total = 0;
	for (let i = 1; i < pts.length; i++) {
		total += haversine(pts[i - 1].latitude, pts[i - 1].longitude, pts[i].latitude, pts[i].longitude);
	}
	return total;
});

const pointSignature = computed(() => {
	return includePoints.value.map(p => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`).join('|');
});

onMounted(() => {
	fitMapToLine();
});

onUnmounted(() => {
	if (fitTimer.value) {
		clearTimeout(fitTimer.value);
		fitTimer.value = null;
	}
	if (scaleTimer.value) {
		clearInterval(scaleTimer.value);
		scaleTimer.value = null;
	}
});

watch(pointSignature, () => {
	fitMapToLine();
});

watch(targetScale, (nextScale) => {
	smoothScaleTo(nextScale);
}, { immediate: true });

function fitMapToLine() {
	if (fitTimer.value) {
		clearTimeout(fitTimer.value);
		fitTimer.value = null;
	}
	fitTimer.value = setTimeout(() => {
		nextTick(() => {
			const points = includePoints.value;
			if (points.length < 2) return;
			smoothScaleTo(targetScale.value);
		});
	}, 120);
}

function smoothScaleTo(nextScale) {
	if (!Number.isFinite(nextScale)) return;
	if (scaleTimer.value) {
		clearInterval(scaleTimer.value);
		scaleTimer.value = null;
	}
	if (displayScale.value === nextScale) return;
	scaleTimer.value = setInterval(() => {
		if (displayScale.value === nextScale) {
			clearInterval(scaleTimer.value);
			scaleTimer.value = null;
			return;
		}
		displayScale.value += displayScale.value < nextScale ? 1 : -1;
	}, 180);
}

function haversine(lat1, lng1, lat2, lng2) {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
</script>

<style scoped>
.trajectory-map-wrap {
	position: relative;
	width: 100%;
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.map-el {
	width: 100%;
	height: 100%;
}

.map-badge {
	position: absolute;
	bottom: 10px;
	right: 10px;
	background: rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(4px);
	padding: 4px 10px;
	border-radius: 999px;
}

.badge-text {
	font-size: 12px;
	color: #fff;
	font-weight: 600;
}
</style>
