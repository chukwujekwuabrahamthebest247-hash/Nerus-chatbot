
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Message, ChatSettings } from '../types';
import { geminiService } from '../services/geminiService';
import { openRouterService } from '../services/openRouterService';
import { v4 as uuidv4 } from 'uuid';
import { GenerateContentResponse } from "@google/genai";

interface ChatWindowProps {
  session: ChatSession | null;
  updateSession: (session: ChatSession) => void;
  globalSettings: ChatSettings;
}

interface AttachmentData {
  url: string;
  mimeType: string;
  data: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ session, updateSession, globalSettings }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages, isTyping]);

  if (!session) return <div className="flex-1 flex items-center justify-center text-gray-500">Select or start a new conversation</div>;

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    if (session.provider === 'openrouter') {
      if (!globalSettings.openRouterKey) {
        alert("STRICT LOCK: OpenRouter selected but API Key is missing.");
        return;
      }
      if (!globalSettings.selectedOpenRouterModel) {
        alert("STRICT LOCK: No OpenRouter model selected. Please pick one in Settings.");
        return;
      }
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: attachments.map(a => ({ 
        type: a.type, 
        url: a.url, 
        mimeType: a.mimeType,
        name: a.name
      }))
    };

    const updatedMessages = [...session.messages, userMessage];
    updateSession({ 
      ...session, 
      messages: updatedMessages, 
      title: session.messages.length === 0 ? (input.slice(0, 30) || 'Attachment Analysis') : session.title 
    });
    
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsTyping(true);

    const assistantId = uuidv4();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isThinking: true
    };

    updateSession({ ...session, messages: [...updatedMessages, assistantMessage] });

    try {
      let fullContent = '';
      
      if (session.provider === 'gemini') {
        const geminiMessages = updatedMessages.map(m => {
          // Find attachments associated with this specific message in our current buffer or history
          // In a real app, you'd store the data in indexedDB or similar
          const attachmentParts = m.attachments?.map(a => {
            const attData = currentAttachments.find(att => att.url === a.url)?.data || '';
            return {
              inlineData: { data: attData, mimeType: a.mimeType }
            };
          }) || [];

          return {
            role: m.role,
            content: m.content,
            parts: [...attachmentParts, { text: m.content || "Analyze the provided files." }]
          };
        });

        const stream = await geminiService.chatStream(geminiMessages, {
          useSearch: globalSettings.useSearch,
          thinkingBudget: globalSettings.thinkingBudget,
          temperature: globalSettings.temperature
        });

        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          fullContent += c.text || '';
          updateSession({
            ...session,
            messages: [...updatedMessages, { ...assistantMessage, content: fullContent, isThinking: false }]
          });
        }
      } else if (session.provider === 'openrouter') {
        // OpenRouter path handles images as vision inputs
        // For documents, we would ideally extract text, but for now we send text prompt
        const openRouterMessages = updatedMessages.map(m => {
          // OpenRouter standard vision format
          if (m.attachments && m.attachments.some(a => a.type === 'image')) {
            const contentParts: any[] = [{ type: 'text', text: m.content || "Describe these images." }];
            m.attachments.forEach(a => {
              if (a.type === 'image') {
                const attData = currentAttachments.find(att => att.url === a.url)?.data || '';
                contentParts.push({
                  type: 'image_url',
                  image_url: { url: `data:${a.mimeType};base64,${attData}` }
                });
              }
            });
            return { role: m.role, content: contentParts };
          }
          return { role: m.role, content: m.content };
        });

        await openRouterService.chatStream(
          globalSettings.openRouterKey!,
          globalSettings.selectedOpenRouterModel!,
          openRouterMessages,
          (chunk) => {
            fullContent += chunk;
            updateSession({
              ...session,
              messages: [...updatedMessages, { ...assistantMessage, content: fullContent, isThinking: false }]
            });
          }
        );
      }
    } catch (error) {
      console.error('Provider Error:', error);
      updateSession({
        ...session,
        messages: [...updatedMessages, { 
          ...assistantMessage, 
          content: `⚠️ Error: ${error instanceof Error ? error.message : 'Unknown provider error'}`, 
          isThinking: false 
        }]
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Fixed type errors by explicitly casting Array.from result to File[]
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files) as File[]) {
      let type: 'image' | 'video' | 'audio' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, { 
          url: URL.createObjectURL(file), 
          mimeType: file.type, 
          data: base64,
          name: file.name,
          type
        }]);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderAttachmentPreview = (att: AttachmentData, idx: number) => {
    const remove = () => setAttachments(prev => prev.filter((_, i) => i !== idx));
    
    return (
      <div key={idx} className="relative group shrink-0">
        {att.type === 'image' ? (
          <img src={att.url} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
        ) : att.type === 'video' ? (
          <div className="w-20 h-20 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-white/10 p-2">
            <i className="fas fa-video text-blue-400 mb-1"></i>
            <span className="text-[8px] text-gray-400 truncate w-full text-center">{att.name}</span>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-gray-800 flex flex-col items-center justify-center border border-white/10 p-2">
            <i className={`fas ${att.type === 'audio' ? 'fa-music text-purple-400' : 'fa-file-pdf text-red-400'} text-xl mb-1`}></i>
            <span className="text-[8px] text-gray-400 truncate w-full text-center">{att.name}</span>
          </div>
        )}
        <button 
          onClick={remove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg hover:scale-110 transition-transform"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b0b0b]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 space-y-8">
        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-80">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${session.provider === 'openrouter' ? 'bg-amber-500 ring-4 ring-amber-500/20' : 'bg-gradient-to-tr from-blue-500 to-purple-500'}`}>
              <i className={`fas ${session.provider === 'openrouter' ? 'fa-bolt text-black' : 'fa-robot text-white'} text-4xl`}></i>
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-bold mb-2">Multimodal AI Ready</h2>
              <p className="text-gray-500 text-sm">
                Upload PDFs, Videos, or Images. Nexus AI Pro handles complex documents and media analysis natively.
              </p>
            </div>
          </div>
        )}

        {session.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-5 py-4 ${msg.role === 'user' ? (session.provider === 'openrouter' ? 'bg-amber-500 text-black font-semibold' : 'bg-blue-600 text-white') : 'bg-[#1e1e1e] border border-white/5 shadow-xl'}`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {msg.attachments.map((att, idx) => (
                    <div key={idx} className="relative">
                      {att.type === 'image' ? (
                        <img src={att.url} alt="upload" className="w-24 h-24 object-cover rounded-lg border border-white/10" />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg border border-white/10">
                          <i className={`fas ${att.type === 'video' ? 'fa-video' : att.type === 'audio' ? 'fa-music' : 'fa-file-alt'} text-xs opacity-60`}></i>
                          <span className="text-[10px] font-mono opacity-80 max-w-[100px] truncate">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.isThinking ? (
                <div className="flex items-center gap-3 text-gray-400">
                  <div className={`w-2 h-2 rounded-full animate-ping ${session.provider === 'openrouter' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Processing Media...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none break-words whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-6 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b] to-transparent">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
          {attachments.length > 0 && (
            <div className="flex gap-3 mb-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
              {attachments.map((att, idx) => renderAttachmentPreview(att, idx))}
            </div>
          )}
          
          <div className={`bg-[#1e1e1e] border rounded-[2rem] shadow-2xl transition-all p-2 flex items-end ${session.provider === 'openrouter' ? 'border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/20' : 'border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50'}`}>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors mb-0.5 ml-1"
              title="Upload files, images, or video"
            >
              <i className="fas fa-plus text-lg"></i>
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={attachments.length > 0 ? "Ask about your files..." : "Upload files or type a message..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 py-3 px-4 resize-none max-h-48 min-h-[48px] overflow-y-auto"
              rows={1}
            />
            
            <button
              disabled={(!input.trim() && attachments.length === 0) || isTyping}
              className={`p-3 rounded-full flex items-center justify-center transition-all mb-0.5 mr-1 ${(!input.trim() && attachments.length === 0) || isTyping ? 'bg-white/5 text-gray-600' : (session.provider === 'openrouter' ? 'bg-amber-500 text-black shadow-lg' : 'bg-white text-black hover:scale-105')}`}
            >
              <i className={`fas ${isTyping ? 'fa-circle-notch fa-spin' : 'fa-arrow-up'} text-lg`}></i>
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" 
            onChange={handleFileChange} 
          />
          <p className="text-[9px] text-center mt-3 text-gray-600 font-bold tracking-widest uppercase">
            Multimodal Engine: {session.provider === 'openrouter' ? globalSettings.selectedOpenRouterModel : 'Gemini 3 Pro'}
          </p>
        </form>
      </div>
    </div>
  );
};
