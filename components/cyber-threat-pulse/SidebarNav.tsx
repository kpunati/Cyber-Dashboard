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
    <div className="fixed left-0 top-0 z-50 hidden h-screen w-24 flex-col items-center space-y-5 border-r border-slate-700/70 bg-[#05090a]/95 py-8 backdrop-blur md:flex">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          className={`w-16 h-16 flex flex-col items-center justify-center rounded-sm transition-all ${
            active === item.id
              ? 'bg-amber-400/10 border border-amber-400/45 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'border border-transparent text-slate-400 hover:border-amber-400/25 hover:text-amber-200'
          }`}
          title={item.label}
        >
          <div className="font-mono text-lg font-bold">{item.icon}</div>
          <div className="text-[0.62rem] mt-1 font-semibold uppercase">{item.label.substring(0, 3)}</div>
        </button>
      ))}
    </div>
  );
}
