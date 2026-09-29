/** Logotipo Kalory — círculo con llama (gradiente esmeralda → fuego) */
export default function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="k-grad" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="0.45" stopColor="#34D399" />
            <stop offset="0.7" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        {/* arco exterior */}
        <path
          d="M54.5 20.5C56 28 54 36.5 48.5 43.5C41.5 52.5 29 55.5 19.5 50.5C14 47.7 10.2 43 8.5 37.5C13 41.5 18.5 42.5 24 40.5C17 39.5 11.5 34.5 10.5 27C9.3 17.5 15.5 8.5 24.5 6C26.5 5.5 28.5 5.2 30.5 5.3L30 9.5C22 10 15.5 16.5 15 24.5C14.7 29.5 16.5 34 19.8 37.2C19 36 18.6 34.6 18.8 33C19.2 28.5 23 24 26.5 21C26 24 27 26.5 29 28.5C29.5 25 31.5 21.5 34 18.5C34.5 15 33.5 12 31.5 9.5C33.5 10 37 12 38.5 15.5C44 14.5 49 16.5 52.5 20.5C51 30 47 38 40 43.5C47 39.5 52 31.5 52 23C52 22 51.9 21 51.7 20L54.5 20.5Z"
          fill="url(#k-grad)"
        />
        {/* llama interior */}
        <path
          d="M33 44C28 44 24.5 40.8 24.5 36.5C24.5 32.5 27.5 29.5 30 27C30.2 29.5 31.3 31.3 33 32.5C33.2 29.5 34.6 26.8 37 24.5C38.6 26.5 39.5 28.8 39.3 31.3C40.3 30.3 41 29 41.3 27.5C43.3 29.5 44.5 32.2 44.5 35C44.5 40 39.5 44 33 44Z"
          fill="url(#k-grad)"
        />
      </svg>
      {withText && (
        <div className="leading-tight">
          <p className="font-display font-800 font-extrabold text-lg tracking-tight text-mist">Kalory</p>
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted">Health &amp; Fitness</p>
        </div>
      )}
    </div>
  );
}
