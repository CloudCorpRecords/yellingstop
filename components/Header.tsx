
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-8 z-10">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-400">Project / </span>
        <span className="text-sm font-medium">Core Scope of Work</span>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span className="text-xs font-mono">v1.0.0-alpha</span>
        </div>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
