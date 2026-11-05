export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress-track w-full">
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
