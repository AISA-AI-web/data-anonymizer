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

export const BackIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const NextIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
