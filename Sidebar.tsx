
import React from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ sessions, activeId, onSelect, onNew, onDelete, isOpen, toggleSidebar }) => {
  if (!isOpen) return null;

  return (
    <div className="w-72 bg-[#121212] border-r border-white/5 flex flex-col h-full z-20">
      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={onNew}
          className="flex-1 mr-2 flex items-center gap-3 bg-white/10 hover:bg-white/15 py-3 px-4 rounded-xl transition-all border border-white/5"
        >
          <i className="fas fa-plus text-sm"></i>
          <span className="font-medium">New Chat</span>
        </button>
        <button onClick={toggleSidebar} className="p-3 hover:bg-white/5 rounded-lg text-gray-500">
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {sessions.map(session => (
          <div 
            key={session.id}
            className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeId === session.id ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-400'}`}
            onClick={() => onSelect(session.id)}
          >
            <i className={`fas ${session.provider === 'gemini' ? 'fa-sparkles text-blue-400' : 'fa-bolt text-amber-400'} text-xs`}></i>
            <span className="truncate flex-1 text-sm font-medium">{session.title}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
            >
              <i className="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-xs">U</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Pro User</p>
            <p className="text-[10px] text-gray-500 truncate">Premium Plan Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
