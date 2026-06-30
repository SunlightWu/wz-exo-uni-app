// utils/throttle.js
// 数据限流工具 —— 控制 BLE notify 频繁回调时的 UI 更新频率

export function createThrottle(minIntervalMs) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < minIntervalMs) return false;
    last = now;
    return true;
  };
}
