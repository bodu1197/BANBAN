/** Custom point coin icon for the points management feature */
export function PointCoinIcon({ className }: Readonly<{ className?: string }>): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer coin circle */}
      <circle cx="12" cy="12" r="10" />
      {/* Inner coin ring */}
      <circle cx="12" cy="12" r="7" strokeWidth="1.2" />
      {/* P letter for Point */}
      <path d="M10 16V8h2.5a2.5 2.5 0 0 1 0 5H10" strokeWidth="2" />
    </svg>
  );
}
