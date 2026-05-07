'use client';

import { useState } from 'react';

interface NavItem {
  icon: string;
  label: string;
  id: string;
}

const navItems: NavItem[] = [
  { icon: '⌁', label: 'OVERVIEW', id: 'overview' },
  { icon: '!', label: 'EXPLOITED', id: 'exploited' },
  { icon: '#', label: 'VULNERABILITIES', id: 'vulnerabilities' },
  { icon: '{}', label: 'SUPPLY CHAIN', id: 'supply-chain' },
  { icon: '%', label: 'EXPLOIT RISK', id: 'exploit-risk' },
  { icon: '~', label: 'TIMELINE', id: 'timeline' },
  { icon: 'i', label: 'ABOUT', id: 'about' },
];

interface SidebarNavProps {
  onNavigate?: (id: string) => void;
}

export default function SidebarNav({ onNavigate }: SidebarNavProps) {
  const [active, setActive] = useState('overview');

  const handleClick = (id: string) => {
    setActive(id);
    onNavigate?.(id);
  };

  return (
    <div className="fixed left-0 top-0 z-50 hidden h-screen w-24 flex-col items-center gap-4 border-r border-slate-700/70 bg-[#030708]/95 py-7 shadow-[8px_0_42px_rgba(0,0,0,0.42)] backdrop-blur md:flex">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-amber-300/25 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[linear-gradient(180deg,#facc15_1px,transparent_1px)] bg-[size:100%_22px]" />
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          aria-current={active === item.id ? 'page' : undefined}
          className={`group relative flex h-16 w-16 flex-col items-center justify-center overflow-hidden rounded-[0.28rem] border transition-all duration-200 ${
            active === item.id
              ? 'border-amber-300/60 bg-amber-400/10 text-amber-200 shadow-[0_0_26px_rgba(245,158,11,0.16),inset_0_0_18px_rgba(245,158,11,0.05)]'
              : 'border-transparent text-slate-400 hover:border-amber-400/30 hover:bg-amber-300/[0.035] hover:text-amber-200'
          }`}
          title={item.label}
        >
          <span
            className={`absolute left-0 top-2 h-10 w-px bg-gradient-to-b from-transparent via-amber-300 to-transparent transition-opacity ${
              active === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-45'
            }`}
          />
          <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.14),transparent_56%)]" />
          <div className="relative font-mono text-lg font-black leading-none tracking-tight">{item.icon}</div>
          <div className="relative mt-2 text-[0.58rem] font-black uppercase tracking-[0.08em]">{item.label.substring(0, 3)}</div>
        </button>
      ))}
    </div>
  );
}
