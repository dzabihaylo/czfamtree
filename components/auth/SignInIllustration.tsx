export default function SignInIllustration() {
  return (
    <div className="relative grid h-full place-items-center overflow-hidden grid-bg">
      {/* Presence indicator — static decorative (login.jsx L113-122) */}
      <div className="absolute top-[40px] right-[40px] flex items-center gap-[6px] font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">
        <span
          className="rounded-full"
          style={{ width: 6, height: 6, background: 'oklch(0.62 0.13 150)' }}
        />
        3 editors online
      </div>

      {/* Mini tree SVG (login.jsx L60-111) */}
      <svg viewBox="0 0 400 400" width="80%" style={{ maxWidth: 460 }}>
        <defs>
          <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="oklch(0.62 0.006 80)" />
          </pattern>
        </defs>

        {/* Edges */}
        <g stroke="oklch(0.18 0.008 80)" strokeWidth="1.5" fill="none">
          <path d="M 120 120 L 280 120" />
          <path d="M 200 120 L 200 200 L 120 200 L 120 270" />
          <path d="M 200 200 L 280 200 L 280 270" />
        </g>

        {/* Top row: grandparents */}
        <g>
          <rect
            x="60"
            y="60"
            width="120"
            height="60"
            fill="oklch(1 0 0)"
            stroke="oklch(0.18 0.008 80)"
            strokeWidth="1.5"
          />
          <rect x="60" y="60" width="60" height="60" fill="url(#dots)" />
          <text
            x="130"
            y="85"
            fontFamily="Inter"
            fontSize="11"
            fontWeight="600"
            fill="oklch(0.18 0.008 80)"
          >
            Dave
          </text>
          <text
            x="130"
            y="100"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fill="oklch(0.38 0.006 80)"
          >
            1981 –
          </text>

          <rect
            x="220"
            y="60"
            width="120"
            height="60"
            fill="oklch(1 0 0)"
            stroke="oklch(0.18 0.008 80)"
            strokeWidth="1.5"
          />
          <rect x="220" y="60" width="60" height="60" fill="url(#dots)" />
          <text
            x="290"
            y="85"
            fontFamily="Inter"
            fontSize="11"
            fontWeight="600"
            fill="oklch(0.18 0.008 80)"
          >
            Katherine
          </text>
          <text
            x="290"
            y="100"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fill="oklch(0.38 0.006 80)"
          >
            1981 –
          </text>
        </g>

        {/* Spouse connector (accent stroke) */}
        <path
          d="M 180 90 L 220 90"
          stroke="oklch(0.52 0.14 250)"
          strokeWidth="2"
          fill="none"
        />

        {/* Bottom row: child */}
        <g>
          <rect
            x="140"
            y="270"
            width="120"
            height="60"
            fill="oklch(1 0 0)"
            stroke="oklch(0.18 0.008 80)"
            strokeWidth="2"
          />
          <rect x="140" y="270" width="60" height="60" fill="url(#dots)" />
          <text
            x="210"
            y="295"
            fontFamily="Inter"
            fontSize="11"
            fontWeight="600"
            fill="oklch(0.18 0.008 80)"
          >
            Olivia
          </text>
          <text
            x="210"
            y="310"
            fontFamily="JetBrains Mono"
            fontSize="9"
            fill="oklch(0.38 0.006 80)"
          >
            2012 –
          </text>
        </g>

        {/* Generation labels */}
        <text
          x="60"
          y="40"
          fontFamily="JetBrains Mono"
          fontSize="10"
          letterSpacing="1"
          fill="oklch(0.38 0.006 80)"
        >
          GEN 01 · PARENTS
        </text>
        <text
          x="60"
          y="250"
          fontFamily="JetBrains Mono"
          fontSize="10"
          letterSpacing="1"
          fill="oklch(0.38 0.006 80)"
        >
          GEN 02 · CHILDREN
        </text>

        {/* Caption */}
        <text
          x="370"
          y="390"
          fontFamily="JetBrains Mono"
          fontSize="9"
          textAnchor="end"
          fill="oklch(0.62 0.006 80)"
        >
          fig. 01 — the Chan-Zabihaylo family
        </text>
      </svg>
    </div>
  );
}
