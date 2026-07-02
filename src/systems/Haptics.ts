/**
 * Haptik geri bildirim. Web'de/Android WebView'da navigator.vibrate;
 * desteklenmeyen platformda (iOS Safari/WebView) sessizce no-op.
 * Capacitor Haptics plugin'i eklenirse buradan yönlendirilebilir.
 */
export const haptics = {
  light(): void {
    vibrate(12);
  },
  medium(): void {
    vibrate(28);
  },
  fail(): void {
    vibrate([50, 40, 80]);
  }
};

function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* desteklenmiyor */
  }
}
