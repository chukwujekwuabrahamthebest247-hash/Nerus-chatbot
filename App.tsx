
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsPanel } from './components/SettingsPanel';
import { VoiceInterface } from './components/VoiceInterface';
import { ChatSession, Message, ChatSettings } from '../types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  // Persistent settings across sessions
  const [globalSettings, setGlobalSettings] = useState<ChatSettings>({
    provider: (localStorage.getItem('ai_provider') as 'gemini' | 'openrouter') || 'gemini',
    useSearch: false,
    thinkingBudget: 0,
    temperature: 0.7,
    openRouterKey: localStorage.getItem('openrouter_key') || '',
    selectedOpenRouterModel: localStorage.getItem('openrouter_model') || ''
  });

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Initialize first session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        modelId: 'gemini-3-pro-preview',
        provider: globalSettings.provider,
        settings: { ...globalSettings }
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    }
  }, []);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      modelId: 'gemini-3-pro-preview',
      provider: globalSettings.provider,
      settings: { ...globalSettings }
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0]?.id || null);
    }
  };

  const updateSession = (updatedSession: ChatSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const updateGlobalSettings = (newSettings: Partial<ChatSettings>) => {
    const updated = { ...globalSettings, ...newSettings };
    setGlobalSettings(updated);
    
    if (newSettings.provider !== undefined) localStorage.setItem('ai_provider', newSettings.provider);
    if (newSettings.openRouterKey !== undefined) localStorage.setItem('openrouter_key', newSettings.openRouterKey);
    if (newSettings.selectedOpenRouterModel !== undefined) localStorage.setItem('openrouter_model', newSettings.selectedOpenRouterModel);
    
    // Also update current session settings and provider
    if (activeSession) {
      updateSession({
        ...activeSession,
        provider: updated.provider,
        settings: { ...activeSession.settings, ...newSettings }
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0b0b] overflow-hidden text-gray-200">
      <Sidebar 
        sessions={sessions} 
        activeId={activeSessionId} 
        onSelect={setActiveSessionId}
        onNew={createNewSession}
        onDelete={deleteSession}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0b0b0b]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg">
                <i className="fas fa-bars"></i>
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Nexus AI Pro</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeSession?.provider === 'gemini' ? 'bg-blue-400' : 'bg-amber-400 animate-pulse'}`}></span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${activeSession?.provider === 'openrouter' ? 'text-amber-500' : 'text-gray-500'}`}>
                  {activeSession?.provider === 'gemini' ? 'Engine: Gemini 3' : `Strict: ${activeSession?.settings.selectedOpenRouterModel || 'No Model'}`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsVoiceActive(true)}
              className="px-4 py-2 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all flex items-center gap-2"
              disabled={activeSession?.provider === 'openrouter'} // Voice currently only for Gemini native
            >
              <i className="fas fa-microphone"></i>
              <span className="hidden sm:inline">Voice</span>
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg transition-all relative ${globalSettings.provider === 'openrouter' ? 'bg-amber-500/10 text-amber-500' : 'hover:bg-white/5 text-gray-400'}`}
            >
              <i className="fas fa-sliders-h"></i>
              {globalSettings.provider === 'openrouter' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#0b0b0b]"></span>
              )}
            </button>
          </div>
        </header>

        <ChatWindow 
          session={activeSession} 
          updateSession={updateSession}
          globalSettings={globalSettings}
        />

        {isSettingsOpen && (
          <SettingsPanel 
            settings={globalSettings} 
            onUpdate={updateGlobalSettings} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}

        {isVoiceActive && (
          <VoiceInterface onClose={() => setIsVoiceActive(false)} />
        )}
      </main>
    </div>
  );
};

export default App;
