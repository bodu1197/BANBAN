export function KakaoIcon({ className }: Readonly<{ className?: string }>): React.ReactElement {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.21 4.65 6.58-.15.55-.58 2.07-.66 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.9.13 1.83.2 2.79.2 5.52 0 10-3.58 10-7.52C22 6.58 17.52 3 12 3z" />
    </svg>
  );
}
