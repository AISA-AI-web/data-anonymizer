type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const LockIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const UploadIcon = ({ size = 32 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const DownloadIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </svg>
);

export const KeyIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M17 6l3 3" />
  </svg>
);

export const CopyIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);

// Back and next arrows point the other way in right-to-left languages (see .icon-flip).
export const BackIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)} className="icon-flip">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const NextIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)} className="icon-flip">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const PlayIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </svg>
);

export const BookIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 19V5" />
    <path d="M8 7h7" />
    <path d="M8 11h5" />
  </svg>
);

export const SparkIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

export const GlobeIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </svg>
);
