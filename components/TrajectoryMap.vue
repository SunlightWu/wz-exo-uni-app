<template>
	<view class="trajectory-map-wrap" :style="{ height: height }">
		<map
			class="map-el"
			:latitude="centerLat"
			:longitude="centerLng"
			:scale="scale"
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
import { computed } from 'vue';

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

// 轨迹点格式: [{ latitude, longitude, timestamp }]
const validPoints = computed(() => {
	return (props.points || []).filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number');
});

// 中心点：取所有点的平均值，或第一个点
const centerLat = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return 39.9042;
	if (pts.length === 1) return pts[0].latitude;
	const sum = pts.reduce((s, p) => s + p.latitude, 0);
	return sum / pts.length;
});

const centerLng = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return 116.4074;
	if (pts.length === 1) return pts[0].longitude;
	const sum = pts.reduce((s, p) => s + p.longitude, 0);
	return sum / pts.length;
});

// 缩放级别：根据轨迹范围自动计算
const scale = computed(() => {
	const pts = validPoints.value;
	if (pts.length <= 1) return 16;
	const lats = pts.map(p => p.latitude);
	const lngs = pts.map(p => p.longitude);
	const latRange = Math.max(...lats) - Math.min(...lats);
	const lngRange = Math.max(...lngs) - Math.min(...lngs);
	const maxRange = Math.max(latRange, lngRange);
	if (maxRange < 0.001) return 18;
	if (maxRange < 0.01) return 16;
	if (maxRange < 0.05) return 14;
	if (maxRange < 0.1) return 13;
	if (maxRange < 0.5) return 12;
	return 11;
});

// 轨迹线
const polylines = computed(() => {
	const pts = validPoints.value;
	if (pts.length < 2) return [];
	return [{
		points: pts.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
		color: '#8B5CF6',
		width: 4,
		arrowLine: false,
		dottedLine: false
	}];
});

// 起终点标记
const markers = computed(() => {
	const pts = validPoints.value;
	if (pts.length === 0) return [];
	const ms = [];
	// 起点
	ms.push({
		id: 1,
		latitude: pts[0].latitude,
		longitude: pts[0].longitude,
		title: '起点',
		iconPath: '/static/marker-start.png',
		width: 28,
		height: 36,
		anchor: { x: 0.5, y: 1 }
	});
	// 终点（如果超过1个点）
	if (pts.length > 1) {
		const last = pts[pts.length - 1];
		ms.push({
			id: 2,
			latitude: last.latitude,
			longitude: last.longitude,
			title: '终点',
			iconPath: '/static/marker-end.png',
			width: 28,
			height: 36,
			anchor: { x: 0.5, y: 1 }
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
