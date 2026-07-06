// ── 设备二维码解析工具 ──
// 兼容微信小程序（不使用 URLSearchParams）

/**
 * 解析 query 字符串为对象
 * @param {string} str - 如 "sn=10:20:BA:F3:DD:EE&n=WZ_EXO_001"
 * @returns {Object}
 */
function parseQueryString(str) {
	const result = {};
	if (!str) return result;
	const pairs = str.split('&');
	for (const pair of pairs) {
		const idx = pair.indexOf('=');
		if (idx === -1) {
			result[decodeURIComponent(pair)] = '';
		} else {
			const key = decodeURIComponent(pair.slice(0, idx));
			const val = decodeURIComponent(pair.slice(idx + 1));
			result[key] = val;
		}
	}
	return result;
}

/**
 * 解析设备二维码
 * 支持格式：
 *   - sn=10:20:BA:F3:DD:EE&n=WZ_EXO_001
 *   - sn=EXO001&mac=10:20:BA:F3:DD:EE&n=WZ_EXO_001
 *   - 纯SN
 * @param {string} raw - 二维码原始内容
 * @returns {{sn:string, mac:string, name:string}}
 */
export function parseDeviceQr(raw) {
	const result = { sn: '', mac: '', name: '' };
	if (!raw) return result;
	const trimmed = raw.trim();

	// 格式1: key=value&key2=value2
	if (trimmed.includes('=')) {
		const params = parseQueryString(trimmed);
		result.sn = params.sn || '';
		result.mac = params.mac || '';
		result.name = params.n || params.name || '';
	} else {
		// 格式2: 纯SN
		result.sn = trimmed;
	}

	// 如果sn是MAC格式（含冒号），提取mac并把sn去冒号
	const macPattern = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
	if (macPattern.test(result.sn)) {
		result.mac = result.sn;
		result.sn = result.sn.replace(/:/g, '');
	}

	// fallback: 没有sn但有mac时，把mac去掉冒号当sn
	if (!result.sn && result.mac) {
		result.sn = result.mac.replace(/:/g, '');
	}

	return result;
}
