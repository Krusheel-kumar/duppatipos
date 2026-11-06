import React from 'react';

/**
 * Krunnex POS icon set.
 * Single, consistent line-icon language (24px grid, 1.75 stroke) so every
 * surface of the POS renders identically regardless of OS emoji fonts.
 */
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 18, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

export const IconDineIn: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </Base>
);

export const IconTakeaway: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Base>
);

export const IconCounter: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <path d="M12 17.5v-11" />
  </Base>
);

export const IconTables: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Base>
);

export const IconOrders: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </Base>
);

export const IconReports: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </Base>
);

export const IconSettings: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const IconSliders: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </Base>
);

export const IconLogout: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Base>
);

export const IconPlus: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Base>
);

export const IconArrowRight: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Base>
);

export const IconList: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </Base>
);

export const IconNote: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
    <path d="M15 3v6h6" />
    <path d="M7 13h6" />
    <path d="M7 17h10" />
  </Base>
);

export const IconPrinter: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </Base>
);

export const IconCard: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </Base>
);

export const IconCart: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </Base>
);

export const IconPencil: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </Base>
);

export const IconSwap: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="m16 3 4 4-4 4" />
    <path d="M20 7H4" />
    <path d="m8 21-4-4 4-4" />
    <path d="M4 17h16" />
  </Base>
);

export const IconCamera: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Base>
);

export const IconBarcode: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M3 5v14" />
    <path d="M8 5v14" />
    <path d="M12 5v14" />
    <path d="M17 5v14" />
    <path d="M21 5v14" />
    <path d="M5.5 5v14" />
    <path d="M14.5 5v14" />
    <path d="M19 5v14" />
  </Base>
);

export const IconQrCode: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="3" height="3" />
    <rect x="18" y="18" width="3" height="3" />
    <rect x="18" y="14" width="3" height="3" />
    <rect x="14" y="18" width="3" height="3" />
  </Base>
);

export const IconTag: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".75" fill="currentColor" />
  </Base>
);

export const IconSync: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </Base>
);

export const IconChart: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20v-6" />
  </Base>
);

export const IconReceipt: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </Base>
);

export const IconWhatsApp: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Base>
);

export const IconCash: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01" />
    <path d="M18 12h.01" />
  </Base>
);

export const IconPhone: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M12 18h.01" />
  </Base>
);

export const IconCheckCircle: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Base>
);

export const IconShoppingBag: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </Base>
);

export const IconSparkles: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </Base>
);

export const IconTrash: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Base>
);

export const IconEnter: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <polyline points="9 10 4 15 9 20" />
    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
  </Base>
);

export const IconCreditNote: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="7" y1="9" x2="17" y2="9" />
    <line x1="7" y1="13" x2="17" y2="13" />
    <line x1="7" y1="17" x2="12" y2="17" />
  </Base>
);

export const IconPackage: React.FC<IconProps> = (p) => (
  <Base {...p}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </Base>
);

/** Category icon resolved from the (dynamic) category name. */
export const CategoryIcon: React.FC<IconProps & { name: string }> = ({ name, ...p }) => {
  const n = name.toLowerCase();

  if (n === 'all' || n.includes('all')) {
    return (
      <Base {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </Base>
    );
  }
  // 1. Bed Sheets
  if (n.includes('bedsheet') || n.includes('sheet') || n.includes('bed sheet')) {
    return (
      <Base {...p}>
        <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
        <path d="M2 13v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6" />
        <path d="M2 13h20" />
        <path d="M7 6h3" />
        <path d="M14 6h3" />
      </Base>
    );
  }
  // 2. Bed Covers & Spreads
  if (n.includes('bed cover') || n.includes('cover') || n.includes('spread')) {
    return (
      <Base {...p}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 4v6" />
        <path d="M17 4v6" />
        <path d="M3 14h18" />
      </Base>
    );
  }
  // 3. Dupattas & Stoles
  if (n.includes('dupatta') || n.includes('stole') || n.includes('scarf')) {
    return (
      <Base {...p}>
        <path d="M3 5c4 0 4 6 8 6s4-6 8-6" />
        <path d="M3 12c4 0 4 6 8 6s4-6 8-6" />
        <path d="M3 19c4 0 4 4 8 4s4-4 8-4" />
        <line x1="3" y1="5" x2="3" y2="19" />
        <line x1="19" y1="5" x2="19" y2="19" />
      </Base>
    );
  }
  // 4. Kids Quilts & Dohars
  if (n.includes('quilt') || n.includes('dohar') || n.includes('blanket')) {
    return (
      <Base {...p}>
        <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 14.1l-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" />
      </Base>
    );
  }
  // 5. Kids Kurtis & Apparel
  if (n.includes('kurti') || n.includes('kurta') || n.includes('apparel') || n.includes('kid')) {
    return (
      <Base {...p}>
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </Base>
    );
  }
  // 6. Handmade & Artisanal
  if (n.includes('handmade') || n.includes('cushion') || n.includes('throw') || n.includes('artisanal')) {
    return (
      <Base {...p}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
        <path d="M12 3v2" />
        <path d="M12 19v2" />
        <path d="M3 12h2" />
        <path d="M19 12h2" />
      </Base>
    );
  }
  if (n.includes('coffee') || n.includes('tea') || n.includes('boba') || n.includes('food') || n.includes('beverage')) {
    return (
      <Base {...p}>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      </Base>
    );
  }
  return (
    <Base {...p}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </Base>
  );
};
