const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.readyState < 2) return Promise.resolve(null);
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7));
}
