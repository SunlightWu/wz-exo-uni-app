/**
 * 安全解析日期字符串，兼容 iOS
 * iOS 不支持 "yyyy-MM-dd HH:mm:ss" 格式，需转换为 "yyyy/MM/dd HH:mm:ss" 或 "yyyy-MM-ddTHH:mm:ss"
 * @param {string|number|Date} dt
 * @returns {Date}
 */
export function parseDate(dt) {
	if (!dt) return new Date(NaN);
	if (dt instanceof Date) return dt;
	if (typeof dt === 'number') return new Date(dt);
	// 纯数字字符串（时间戳）
	if (/^\d+$/.test(dt)) return new Date(Number(dt));
	// iOS 兼容：将 "yyyy-MM-dd HH:mm:ss" 转为 "yyyy/MM/dd HH:mm:ss"
	if (typeof dt === 'string') {
		const normalized = dt.replace(/-/g, '/').replace(/T/g, ' ');
		const d = new Date(normalized);
		if (!isNaN(d.getTime())) return d;
	}
	return new Date(dt);
}

/**
 * 格式化日期时间为 yyyy-MM-dd HH:mm
 * @param {string|number|Date} dt
 * @param {string} [fallback='-'] 空值兜底
 * @returns {string}
 */
export function formatDateTime(dt, fallback = '-') {
	if (!dt) return fallback;
	const d = parseDate(dt);
	if (isNaN(d.getTime())) return String(dt);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化日期时间为 yyyy-MM-dd HH:mm:ss
 * @param {string|number|Date} dt
 * @param {string} [fallback='-'] 空值兜底
 * @returns {string}
 */
export function formatDateTimeFull(dt, fallback = '-') {
	if (!dt) return fallback;
	const d = parseDate(dt);
	if (isNaN(d.getTime())) return String(dt);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 计算两个时间的时长差，返回 "X小时X分" 或 "X天X小时X分"
 * @param {string|number|Date} start
 * @param {string|number|Date} end
 * @param {string} [fallback='-'] 空值兜底
 * @returns {string}
 */
export function formatDuration(start, end, fallback = '-') {
	if (!start || !end) return fallback;
	const s = parseDate(start).getTime();
	const e = parseDate(end).getTime();
	if (isNaN(s) || isNaN(e)) return fallback;
	const diff = Math.floor((e - s) / 1000);
	if (diff < 0) return fallback;
	const h = Math.floor(diff / 3600);
	const m = Math.floor((diff % 3600) / 60);
	if (h >= 24) {
		const d = Math.floor(h / 24);
		const restH = h % 24;
		return `${d}天${restH}小时${m}分`;
	}
	return `${h}小时${m}分`;
}

/**
 * 计算两个时间的时长差（带秒），返回 "X小时X分X秒" / "X分X秒" / "X秒"
 * @param {string|number|Date} start
 * @param {string|number|Date} end
 * @param {string} [fallback='-'] 空值兜底
 * @returns {string}
 */
export function formatDurationFull(start, end, fallback = '-') {
	if (!start || !end) return fallback;
	const s = parseDate(start).getTime();
	const e = parseDate(end).getTime();
	if (isNaN(s) || isNaN(e)) return fallback;
	const diff = Math.floor((e - s) / 1000);
	if (diff < 0) return fallback;
	const h = Math.floor(diff / 3600);
	const m = Math.floor((diff % 3600) / 60);
	const sec = diff % 60;
	if (h > 0) return `${h}小时${m}分${sec}秒`;
	if (m > 0) return `${m}分${sec}秒`;
	return `${sec}秒`;
}
