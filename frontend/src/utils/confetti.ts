import confetti from 'canvas-confetti';

export function fireConfetti(): void {
  const duration = 2.5 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#9254de', '#ff4d4f', '#ffc53d', '#73d13d', '#ff85c0', '#13c2c2'],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ff4d4f', '#ffc53d', '#73d13d', '#ff85c0', '#9254de', '#13c2c2'],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
