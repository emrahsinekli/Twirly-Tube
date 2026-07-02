/**
 * Paylaşılabilir skor kartı (spec 9): canvas'tan görsel üretir.
 * navigator.share (dosyayla) → pano metni → indirme sırasıyla dener.
 */

export interface ShareData {
  meters: number;
  mode: 'endless' | 'daily';
  dateKey: string;
  best: number;
}

const C = {
  skyTop: '#5FB4DE',
  skyBottom: '#C4E9F3',
  bamboo: '#8FB84E',
  bambooNode: '#5E8A2E',
  tube: '#FFFFFF',
  tubeSpiral: '#C7C7B9',
  chimney: '#8896A6',
  crowd: '#33502A',
  grass: '#7FBB48',
  text: '#FFFFFF',
  shadow: 'rgba(24,58,79,0.45)'
};

export function drawScoreCard(data: ShareData): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // gökyüzü
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, C.skyTop);
  sky.addColorStop(1, C.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // zemin + baca silüeti
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, H - 160, W, 160);
  ctx.fillStyle = C.chimney;
  ctx.beginPath();
  ctx.moveTo(150, H - 160);
  ctx.lineTo(172, H - 700);
  ctx.lineTo(228, H - 700);
  ctx.lineTo(250, H - 160);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(160, H - 716, 80, 20);
  // kalabalık
  ctx.fillStyle = C.crowd;
  for (let i = 0; i < 14; i++) {
    const x = 80 + i * 70 + (i % 3) * 12;
    ctx.beginPath();
    ctx.arc(x, H - 190, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 20, H - 176, 40, 60);
  }

  // kıvrımlı bambu + tüp
  ctx.strokeStyle = C.bamboo;
  ctx.lineWidth = 42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const poleX = (y: number) => W * 0.72 + Math.sin((H - y) / 320) * 70 * ((H - y) / H + 0.3);
  ctx.moveTo(poleX(H - 140), H - 140);
  for (let y = H - 140; y > 120; y -= 20) ctx.lineTo(poleX(y), y);
  ctx.stroke();
  ctx.strokeStyle = C.bambooNode;
  ctx.lineWidth = 8;
  for (let y = H - 260; y > 200; y -= 130) {
    ctx.beginPath();
    ctx.moveTo(poleX(y) - 24, y);
    ctx.lineTo(poleX(y) + 24, y);
    ctx.stroke();
  }
  // tüp
  const ty = 330;
  ctx.fillStyle = C.tube;
  ctx.beginPath();
  ctx.roundRect(poleX(ty) - 95, ty - 52, 190, 104, 52);
  ctx.fill();
  ctx.strokeStyle = C.tubeSpiral;
  ctx.lineWidth = 18;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(poleX(ty) - 20 + i * 55, ty + 50);
    ctx.lineTo(poleX(ty) + 20 + i * 55, ty - 50);
    ctx.stroke();
  }

  // metinler
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.shadowColor = C.shadow;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 8;
  ctx.font = '900 92px system-ui, sans-serif';
  ctx.fillText('TWIRLY TUBE', 70, 170);

  ctx.font = '700 54px system-ui, sans-serif';
  ctx.fillText(data.mode === 'daily' ? `Günlük Direk · ${data.dateKey}` : 'Sonsuz Mod', 70, 260);

  ctx.font = '900 300px system-ui, sans-serif';
  ctx.fillText(`${data.meters}`, 70, 640);
  ctx.font = '800 110px system-ui, sans-serif';
  ctx.fillText('METRE', 76, 770);

  ctx.font = '600 52px system-ui, sans-serif';
  ctx.fillText(`Rekorum: ${data.best} m`, 76, 900);

  ctx.shadowOffsetY = 0;
  ctx.font = '500 40px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Sen daha yükseğe fırlatabilir misin?', 76, 980);
  return canvas;
}

export function shareText(data: ShareData): string {
  const mode = data.mode === 'daily' ? `Günlük Direk ${data.dateKey}` : 'Sonsuz Mod';
  return `Twirly Tube — ${mode}: ${data.meters} m! 🎋 Sen daha yükseğe fırlatabilir misin?`;
}

export async function shareScore(data: ShareData): Promise<'shared' | 'copied' | 'downloaded'> {
  const canvas = drawScoreCard(data);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  const text = shareText(data);

  if (blob && typeof navigator.share === 'function') {
    const file = new File([blob], `twirly-tube-${data.meters}m.png`, { type: 'image/png' });
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({ text, files: [file] });
        return 'shared';
      }
      await navigator.share({ text });
      return 'shared';
    } catch {
      /* kullanıcı iptal etti veya desteklenmiyor — alternatife düş */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    /* pano da yok — indir */
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `twirly-tube-${data.meters}m.png`;
  a.click();
  return 'downloaded';
}
