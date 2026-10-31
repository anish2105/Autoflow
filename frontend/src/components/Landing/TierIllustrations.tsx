import React from 'react';

export const PleasantIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 360 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '150px', borderRadius: '14px 14px 0 0', display: 'block' }}
    className={className}
  >
    <defs>
      <linearGradient id="pleasantBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#047857" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <radialGradient id="pleasantGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
      </radialGradient>
      <filter id="shadowPleasant" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#064E3B" floodOpacity="0.3" />
      </filter>
    </defs>

    {/* Background */}
    <rect width="360" height="160" fill="url(#pleasantBg)" />
    <circle cx="180" cy="80" r="110" fill="url(#pleasantGlow)" />

    {/* Geometric Grid Accents */}
    <g opacity="0.15" stroke="#FFFFFF" strokeWidth="1">
      <line x1="20" y1="0" x2="20" y2="160" />
      <line x1="80" y1="0" x2="80" y2="160" />
      <line x1="280" y1="0" x2="280" y2="160" />
      <line x1="340" y1="0" x2="340" y2="160" />
      <line x1="0" y1="40" x2="360" y2="40" />
      <line x1="0" y1="120" x2="360" y2="120" />
    </g>

    {/* Central Card Graphic: Pleasant Joker/Demo */}
    <g filter="url(#shadowPleasant)" transform="translate(180, 80)">
      {/* Decorative Rotating Diamond */}
      <rect x="-42" y="-42" width="84" height="84" rx="16" fill="rgba(255, 255, 255, 0.15)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" transform="rotate(45)" />
      
      {/* Main Playing Card */}
      <rect x="-34" y="-48" width="68" height="96" rx="10" fill="#FFFFFF" stroke="#D1FAE5" strokeWidth="2" />
      
      {/* Top Left Card Index: 🃏 */}
      <text x="-24" y="-30" fontSize="12" fontWeight="bold" fill="#047857" fontFamily="sans-serif">J</text>
      <circle cx="-16" cy="-34" r="2.5" fill="#10B981" />
      
      {/* Center Icon: Sparkle / Joker Star */}
      <path d="M0 -20 L5 -6 L19 -5 L8 5 L12 19 L0 10 L-12 19 L-8 5 L-19 -5 L-5 -6 Z" fill="#059669" />
      <circle cx="0" cy="0" r="4" fill="#FBBF24" />

      {/* Bottom Right Card Index */}
      <text x="18" y="40" fontSize="12" fontWeight="bold" fill="#047857" fontFamily="sans-serif" textAnchor="middle">J</text>
    </g>

    {/* Floating Feature Tags */}
    <g transform="translate(42, 68)">
      <rect width="84" height="26" rx="13" fill="rgba(0, 0, 0, 0.25)" stroke="rgba(255, 255, 255, 0.3)" />
      <circle cx="14" cy="13" r="4" fill="#34D399" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">5 Messages</text>
    </g>

    <g transform="translate(234, 68)">
      <rect width="84" height="26" rx="13" fill="rgba(0, 0, 0, 0.25)" stroke="rgba(255, 255, 255, 0.3)" />
      <circle cx="14" cy="13" r="4" fill="#FBBF24" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">1 Document</text>
    </g>

    {/* Sparkle Highlights */}
    <g fill="#FFFFFF" opacity="0.8">
      <path d="M60 28 L62 33 L67 35 L62 37 L60 42 L58 37 L53 35 L58 33 Z" />
      <path d="M305 32 L306 35 L309 36 L306 37 L305 40 L304 37 L301 36 L304 35 Z" />
      <path d="M140 135 L141 138 L144 139 L141 140 L140 143 L139 140 L136 139 L139 138 Z" />
    </g>
  </svg>
);

export const JackIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 360 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '150px', borderRadius: '14px 14px 0 0', display: 'block' }}
    className={className}
  >
    <defs>
      <linearGradient id="jackBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <radialGradient id="jackGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
      </radialGradient>
      <filter id="shadowJack" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.35" />
      </filter>
    </defs>

    {/* Background */}
    <rect width="360" height="160" fill="url(#jackBg)" />
    <circle cx="180" cy="80" r="110" fill="url(#jackGlow)" />

    {/* Tech Circuit Lines */}
    <g opacity="0.2" stroke="#FFFFFF" strokeWidth="1.5">
      <path d="M20 40 L60 40 L80 60 L140 60" />
      <path d="M340 40 L300 40 L280 60 L220 60" />
      <path d="M30 120 L90 120 L110 100" />
      <path d="M330 120 L270 120 L250 100" />
      <circle cx="140" cy="60" r="3" fill="#60A5FA" />
      <circle cx="220" cy="60" r="3" fill="#60A5FA" />
      <circle cx="110" cy="100" r="3" fill="#60A5FA" />
      <circle cx="250" cy="100" r="3" fill="#60A5FA" />
    </g>

    {/* Central Card: Jack of Spades */}
    <g filter="url(#shadowJack)" transform="translate(180, 80)">
      <rect x="-42" y="-42" width="84" height="84" rx="16" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.5" transform="rotate(45)" />
      
      {/* Main Playing Card */}
      <rect x="-34" y="-48" width="68" height="96" rx="10" fill="#FFFFFF" stroke="#DBEAFE" strokeWidth="2" />
      
      {/* Top Left Card Index */}
      <text x="-24" y="-30" fontSize="13" fontWeight="bold" fill="#1E40AF" fontFamily="sans-serif">J</text>
      <path d="M-15 -35 C-17 -37 -19 -35 -17 -33 L-15 -31 L-13 -33 C-11 -35 -13 -37 -15 -35 Z" fill="#2563EB" />
      
      {/* Center Icon: Lightning Sword & Shield Emblem */}
      <path d="M2 -22 L-8 0 L-1 0 L-4 22 L8 -2 L1 -2 Z" fill="#2563EB" />
      <circle cx="0" cy="0" r="18" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" fill="none" />

      {/* Bottom Right Card Index */}
      <text x="18" y="40" fontSize="13" fontWeight="bold" fill="#1E40AF" fontFamily="sans-serif" textAnchor="middle">J</text>
    </g>

    {/* Floating Feature Tags */}
    <g transform="translate(38, 68)">
      <rect width="90" height="26" rx="13" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255, 255, 255, 0.3)" />
      <circle cx="14" cy="13" r="4" fill="#60A5FA" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">25 Messages</text>
    </g>

    <g transform="translate(232, 68)">
      <rect width="90" height="26" rx="13" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255, 255, 255, 0.3)" />
      <circle cx="14" cy="13" r="4" fill="#38BDF8" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">3 Documents</text>
    </g>

    {/* Sparkle Highlights */}
    <g fill="#FFFFFF" opacity="0.8">
      <path d="M50 25 L52 30 L57 32 L52 34 L50 39 L48 34 L43 32 L48 30 Z" />
      <path d="M315 28 L316 32 L320 33 L316 34 L315 38 L314 34 L310 33 L314 32 Z" />
    </g>
  </svg>
);

export const KingIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 360 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '150px', borderRadius: '14px 14px 0 0', display: 'block' }}
    className={className}
  >
    <defs>
      <linearGradient id="kingBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4C1D95" />
        <stop offset="50%" stopColor="#6D28D9" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
      <radialGradient id="kingGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#FDE047" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#4C1D95" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="goldCrown" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
      <filter id="shadowKing" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2E1065" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Background */}
    <rect width="360" height="160" fill="url(#kingBg)" />
    <circle cx="180" cy="80" r="110" fill="url(#kingGlow)" />

    {/* Ornate Royal Pattern */}
    <g opacity="0.18" stroke="#FDE047" strokeWidth="1.2">
      <circle cx="40" cy="40" r="24" />
      <circle cx="320" cy="40" r="24" />
      <circle cx="40" cy="120" r="24" />
      <circle cx="320" cy="120" r="24" />
      <line x1="40" y1="64" x2="40" y2="96" />
      <line x1="320" y1="64" x2="320" y2="96" />
    </g>

    {/* Central Card: King of Hearts / Crowns */}
    <g filter="url(#shadowKing)" transform="translate(180, 80)">
      <rect x="-42" y="-42" width="84" height="84" rx="16" fill="rgba(253, 224, 71, 0.18)" stroke="rgba(253, 224, 71, 0.5)" strokeWidth="1.5" transform="rotate(45)" />
      
      {/* Main Playing Card */}
      <rect x="-34" y="-48" width="68" height="96" rx="10" fill="#FFFFFF" stroke="#FEF08A" strokeWidth="2" />
      
      {/* Top Left Card Index */}
      <text x="-24" y="-30" fontSize="13" fontWeight="bold" fill="#6D28D9" fontFamily="sans-serif">K</text>
      <circle cx="-15" cy="-33" r="2.5" fill="#EAB308" />
      
      {/* Center Icon: Royal Crown */}
      <path d="M-18 10 L-18 -10 L-9 -2 L0 -14 L9 -2 L18 -10 L18 10 Z" fill="url(#goldCrown)" stroke="#A16207" strokeWidth="1" />
      <rect x="-18" y="10" width="36" height="5" rx="1" fill="#CA8A04" />
      <circle cx="-18" cy="-11" r="2" fill="#F43F5E" />
      <circle cx="0" cy="-15" r="2.5" fill="#38BDF8" />
      <circle cx="18" cy="-11" r="2" fill="#F43F5E" />

      {/* Bottom Right Card Index */}
      <text x="18" y="40" fontSize="13" fontWeight="bold" fill="#6D28D9" fontFamily="sans-serif" textAnchor="middle">K</text>
    </g>

    {/* Floating Feature Tags */}
    <g transform="translate(36, 68)">
      <rect width="94" height="26" rx="13" fill="rgba(0, 0, 0, 0.35)" stroke="rgba(253, 224, 71, 0.4)" />
      <circle cx="14" cy="13" r="4" fill="#FDE047" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">Unlimited Chat</text>
    </g>

    <g transform="translate(228, 68)">
      <rect width="98" height="26" rx="13" fill="rgba(0, 0, 0, 0.35)" stroke="rgba(253, 224, 71, 0.4)" />
      <circle cx="14" cy="13" r="4" fill="#FDE047" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">15 Documents</text>
    </g>

    {/* Sparkle Highlights */}
    <g fill="#FDE047" opacity="0.9">
      <path d="M64 24 L66 30 L72 32 L66 34 L64 40 L62 34 L56 32 L62 30 Z" />
      <path d="M298 26 L300 31 L305 32 L300 34 L298 38 L296 34 L291 32 L296 31 Z" />
      <path d="M180 12 L181 15 L184 16 L181 17 L180 20 L179 17 L176 16 L179 15 Z" />
    </g>
  </svg>
);

export const AceIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 360 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '150px', borderRadius: '14px 14px 0 0', display: 'block' }}
    className={className}
  >
    <defs>
      <linearGradient id="aceBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="50%" stopColor="#1E293B" />
        <stop offset="100%" stopColor="#0D3273" />
      </linearGradient>
      <radialGradient id="aceGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
      </radialGradient>
      <filter id="shadowAce" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000000" floodOpacity="0.5" />
      </filter>
    </defs>

    {/* Background */}
    <rect width="360" height="160" fill="url(#aceBg)" />
    <circle cx="180" cy="80" r="110" fill="url(#aceGlow)" />

    {/* Super Admin Shield Pattern Lines */}
    <g opacity="0.25" stroke="#38BDF8" strokeWidth="1.2">
      <circle cx="180" cy="80" r="72" strokeDasharray="4 4" />
      <line x1="20" y1="80" x2="340" y2="80" />
      <line x1="180" y1="10" x2="180" y2="150" />
    </g>

    {/* Central Card: Ace of Spades / Super Admin Seal */}
    <g filter="url(#shadowAce)" transform="translate(180, 80)">
      <rect x="-42" y="-42" width="84" height="84" rx="16" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1.5" transform="rotate(45)" />
      
      {/* Main Playing Card */}
      <rect x="-34" y="-48" width="68" height="96" rx="10" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="2" />
      
      {/* Top Left Card Index */}
      <text x="-24" y="-30" fontSize="13" fontWeight="bold" fill="#0D3273" fontFamily="sans-serif">A</text>
      <path d="M-15 -35 C-17 -37 -19 -35 -17 -33 L-15 -31 L-13 -33 C-11 -35 -13 -37 -15 -35 Z" fill="#0D3273" />
      
      {/* Center Icon: Large Ornate Ace of Spades with Shield Crest */}
      <path d="M0 -22 C-12 -6 -18 3 -18 10 C-18 16 -12 20 -4 17 L-2 23 L2 23 L4 17 C12 20 18 16 18 10 C18 3 12 -6 0 -22 Z" fill="#0D3273" />
      <circle cx="0" cy="3" r="3.5" fill="#38BDF8" />

      {/* Bottom Right Card Index */}
      <text x="18" y="40" fontSize="13" fontWeight="bold" fill="#0D3273" fontFamily="sans-serif" textAnchor="middle">A</text>
    </g>

    {/* Floating Feature Tags */}
    <g transform="translate(32, 68)">
      <rect width="102" height="26" rx="13" fill="rgba(0, 0, 0, 0.5)" stroke="rgba(56, 189, 248, 0.4)" />
      <circle cx="14" cy="13" r="4" fill="#38BDF8" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">Admin Dashboard</text>
    </g>

    <g transform="translate(228, 68)">
      <rect width="102" height="26" rx="13" fill="rgba(0, 0, 0, 0.5)" stroke="rgba(56, 189, 248, 0.4)" />
      <circle cx="14" cy="13" r="4" fill="#38BDF8" />
      <text x="24" y="17" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">Unlimited Quotas</text>
    </g>

    {/* Sparkle Highlights */}
    <g fill="#38BDF8" opacity="0.95">
      <path d="M60 22 L62 28 L68 30 L62 32 L60 38 L58 32 L52 30 L58 28 Z" />
      <path d="M300 24 L302 29 L307 30 L302 32 L300 36 L298 32 L293 30 L298 29 Z" />
    </g>
  </svg>
);

