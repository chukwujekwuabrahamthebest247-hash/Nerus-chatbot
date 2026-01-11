
import React, { useEffect, useState, useMemo } from 'react';
import { ChatSettings, OpenRouterModel } from '../types';
import { openRouterService } from '../services/openRouterService';

interface SettingsPanelProps {
  settings: ChatSettings;
  onUpdate: (settings: Partial<ChatSettings>) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (settings.openRouterKey) {
      setLoadingModels(true);
      openRouterService.getModels(settings.openRouterKey)
        .then(setModels)
        .finally(() => setLoadingModels(false));
    }
  }, [settings.openRouterKey]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models.slice(0, 50); // Show top 50 by default
    const query = searchQuery.toLowerCase();
    return models.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.id.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  // Helper to handle OpenRouter model changes and auto-switch provider
  const handleOpenRouterModelChange = (modelId: string) => {
    onUpdate({ 
      selectedOpenRouterModel: modelId,
      provider: 'openrouter' // Force switch to OpenRouter when a model is selected
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#121212] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <i className="fas fa-cog text-blue-400"></i>
            Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Provider Selection */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Intelligence Engine</h3>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              <button 
                onClick={() => onUpdate({ provider: 'gemini' })}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${settings.provider === 'gemini' ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400/20' : 'hover:bg-white/5 text-gray-400'}`}
              >
                <i className="fas fa-sparkles"></i>
                <span className="font-semibold">Gemini</span>
              </button>
              <button 
                onClick={() => onUpdate({ provider: 'openrouter' })}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${settings.provider === 'openrouter' ? 'bg-amber-500 text-black shadow-lg ring-2 ring-amber-400/20 font-bold' : 'hover:bg-white/5 text-gray-400'}`}
              >
                <i className="fas fa-bolt"></i>
                <span className="font-semibold">OpenRouter</span>
              </button>
            </div>
            {settings.provider === 'openrouter' && (
              <p className="text-[11px] text-amber-500/80 text-center font-medium animate-pulse">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                OpenRouter is currently your exclusive AI engine.
              </p>
            )}
          </section>

          {/* Gemini Settings */}
          <section className={`space-y-4 transition-all duration-300 ${settings.provider !== 'gemini' ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gemini Engine Options</h3>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="font-semibold">Google Search Grounding</p>
                <p className="text-xs text-gray-500">Enable real-time web search</p>
              </div>
              <button 
                onClick={() => onUpdate({ useSearch: !settings.useSearch })}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.useSearch ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.useSearch ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Thinking Budget</p>
                  <p className="text-xs text-gray-500">Reasoning token allocation</p>
                </div>
                <span className="text-sm font-mono text-blue-400">{settings.thinkingBudget}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="32768" 
                step="1024"
                value={settings.thinkingBudget}
                onChange={(e) => onUpdate({ thinkingBudget: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </section>

          {/* OpenRouter Integration */}
          <section className={`space-y-4 transition-all duration-300 ${settings.provider === 'openrouter' ? 'opacity-100 ring-1 ring-amber-500/30 p-4 -m-4 bg-amber-500/5 rounded-2xl' : 'opacity-40 grayscale pointer-events-none'}`}>
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">OpenRouter AI Configuration</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">API Key</label>
              <input 
                type="password"
                placeholder="sk-or-v1-..."
                value={settings.openRouterKey || ''}
                onChange={(e) => onUpdate({ openRouterKey: e.target.value })}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500/50 outline-none"
              />
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400">Search & Select Model</label>
                {settings.selectedOpenRouterModel && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                    Active: {settings.selectedOpenRouterModel.split('/').pop()}
                  </span>
                )}
              </div>
              
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                <input 
                  type="text"
                  placeholder="Search models (e.g. gpt-4, claude, llama...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all"
                  disabled={!settings.openRouterKey}
                />
              </div>

              <div className="h-48 overflow-y-auto bg-[#0b0b0b] rounded-xl border border-white/5 divide-y divide-white/5">
                {loadingModels ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span className="text-xs">Fetching OpenRouter directory...</span>
                  </div>
                ) : !settings.openRouterKey ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-600 px-8 text-center">
                    Enter your API Key above to unlock the model catalog.
                  </div>
                ) : filteredModels.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-600">
                    No models found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleOpenRouterModelChange(m.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between group ${settings.selectedOpenRouterModel === m.id ? 'bg-amber-500/10' : ''}`}
                    >
                      <div className="min-w-0 pr-4">
                        <p className={`text-sm font-semibold truncate ${settings.selectedOpenRouterModel === m.id ? 'text-amber-500' : 'text-gray-200'}`}>
                          {m.name}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate font-mono">{m.id}</p>
                      </div>
                      {settings.selectedOpenRouterModel === m.id ? (
                        <i className="fas fa-check-circle text-amber-500"></i>
                      ) : (
                        <i className="fas fa-plus text-gray-700 group-hover:text-gray-400 transition-colors"></i>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-gray-400">Manual ID Overide</label>
              <input 
                type="text"
                placeholder="e.g. anthropic/claude-3.5-sonnet"
                value={settings.selectedOpenRouterModel || ''}
                onChange={(e) => handleOpenRouterModelChange(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none font-mono"
              />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onClose}
            className={`w-full py-3 font-bold rounded-xl transition-colors shadow-lg ${settings.provider === 'openrouter' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-white text-black hover:bg-gray-200'}`}
          >
            {settings.provider === 'openrouter' ? 'Confirm OpenRouter Selection' : 'Apply Gemini Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
