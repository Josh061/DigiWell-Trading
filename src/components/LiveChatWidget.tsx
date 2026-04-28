import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle, Send, X, Minimize2, Maximize2, Bot, Sparkles,
  Loader2, User, ChevronDown, HelpCircle, Zap, Package,
  CreditCard, Truck, Paperclip, Image, Check, CheckCheck,
  Star, ThumbsUp, ThumbsDown, FileText
} from 'lucide-react';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'agent' | 'system' | 'ai';
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  category: string;
  agent_id?: string;
}

interface LiveChatWidgetProps {
  onOpenFullChat?: () => void;
}

export default function LiveChatWidget({ onOpenFullChat }: LiveChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const quickActions = [
    { label: 'Where is my order?', category: 'order', icon: Package, message: 'Where is my order? Can you tell me the current status and tracking information?' },
    { label: 'Payment & Invoices', category: 'payment', icon: CreditCard, message: 'I have a question about my payment or invoice. Can you show me my pending invoices?' },
    { label: 'Shipping Status', category: 'shipping', icon: Truck, message: 'Can you give me an update on my shipment? What is the estimated delivery date?' },
    { label: 'General Help', category: 'general', icon: HelpCircle, message: 'I need help with something on the Digiwell platform.' },
  ];

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeConversation) return;
    let channel: any;
    let typingChannel: any;

    try {
      channel = supabase
        .channel(`live-chat-${activeConversation.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `conversation_id=eq.${activeConversation.id}` },
          (payload) => {
            try {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              if (!isOpen && newMsg.sender_type !== 'customer') {
                setUnreadCount(prev => prev + 1);
              }
            } catch (e) { console.warn('Error processing live chat message:', e); }
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Live chat channel error, using polling fallback');
          }
        });
    } catch (e) {
      console.warn('Failed to create live chat channel:', e);
    }

    try {
      // Typing indicator channel
      typingChannel = supabase
        .channel(`typing-${activeConversation.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'live_chat_typing', filter: `conversation_id=eq.${activeConversation.id}` },
          (payload) => {
            try {
              const data = payload.new as any;
              if (data.user_id !== user?.id) {
                setAgentTyping(data.is_typing);
                if (data.is_typing) {
                  setTimeout(() => setAgentTyping(false), 5000);
                }
              }
            } catch (e) { console.warn('Error processing typing indicator:', e); }
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Typing channel error');
          }
        });
    } catch (e) {
      console.warn('Failed to create typing channel:', e);
    }

    return () => {
      if (channel) { try { supabase.removeChannel(channel); } catch (e) { /* ignore */ } }
      if (typingChannel) { try { supabase.removeChannel(typingChannel); } catch (e) { /* ignore */ } }
    };
  }, [activeConversation, isOpen, user?.id]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentTyping]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  useEffect(() => {
    if (user) loadExistingConversation();
  }, [user]);

  const loadExistingConversation = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('live_chat_conversations')
        .select('*')
        .eq('customer_id', user.id)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveConversation(data[0]);
        loadMessages(data[0].id);
        setShowQuickActions(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!activeConversation || !user) return;
    try {
      await supabase.from('live_chat_typing').upsert({
        conversation_id: activeConversation.id,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }, { onConflict: 'conversation_id,user_id' });
    } catch (e) { /* ignore */ }
  }, [activeConversation, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    sendTypingIndicator(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingIndicator(false), 2000);
  };

  const startConversation = async (category: string, initialMessage: string) => {
    if (!user) return;
    try {
      const { data: conv, error } = await supabase
        .from('live_chat_conversations')
        .insert({
          customer_id: user.id,
          subject: `Support - ${category}`,
          category,
          status: 'waiting',
          priority: 'normal'
        })
        .select()
        .single();

      if (error || !conv) throw error;
      setActiveConversation(conv);
      setShowQuickActions(false);

      // Send initial customer message
      await supabase.from('live_chat_messages').insert({
        conversation_id: conv.id,
        sender_id: user.id,
        sender_type: 'customer',
        content: initialMessage,
        message_type: 'text'
      });

      // Get AI auto-response
      setAiLoading(true);
      try {
        const { data: aiData } = await supabase.functions.invoke('support-chat', {
          body: {
            action: 'get_ai_response',
            conversation_id: conv.id,
            user_message: initialMessage,
            conversation_history: [],
            user_id: user.id
          }
        });

        if (aiData?.ai_response) {
          await supabase.from('live_chat_messages').insert({
            conversation_id: conv.id,
            sender_id: 'ai-assistant',
            sender_type: 'ai',
            content: aiData.ai_response,
            message_type: 'text'
          });
        }
      } catch (e) {
        console.error('AI response error:', e);
      }
      setAiLoading(false);
      loadMessages(conv.id);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setAiLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const messageToSend = newMessage;
    setNewMessage('');
    setSending(true);
    sendTypingIndicator(false);

    try {
      if (!activeConversation) {
        await startConversation('general', messageToSend);
      } else {
        await supabase.from('live_chat_messages').insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          sender_type: 'customer',
          content: messageToSend,
          message_type: 'text'
        });

        // Get AI response if no agent assigned
        if (!activeConversation.agent_id) {
          setAiLoading(true);
          try {
            const { data: aiData } = await supabase.functions.invoke('support-chat', {
              body: {
                action: 'get_ai_response',
                conversation_id: activeConversation.id,
                user_message: messageToSend,
                conversation_history: messages.filter(m => m.sender_type !== 'system'),
                user_id: user.id
              }
            });
            if (aiData?.ai_response) {
              await supabase.from('live_chat_messages').insert({
                conversation_id: activeConversation.id,
                sender_id: 'ai-assistant',
                sender_type: 'ai',
                content: aiData.ai_response,
                message_type: 'text'
              });
            }
          } catch (e) { console.error('AI error:', e); }
          setAiLoading(false);
        }
        loadMessages(activeConversation.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `chat/${activeConversation.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('team-photos')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('team-photos').getPublicUrl(path);
      const isImage = file.type.startsWith('image/');

      await supabase.from('live_chat_messages').insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        sender_type: 'customer',
        content: isImage ? 'Shared an image' : `Shared file: ${file.name}`,
        message_type: isImage ? 'image' : 'file',
        file_url: urlData.publicUrl,
        file_name: file.name
      });

      loadMessages(activeConversation.id);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitRating = async () => {
    if (!activeConversation || rating === 0) return;
    try {
      await supabase.from('live_chat_conversations')
        .update({ satisfaction_rating: rating, status: 'closed' })
        .eq('id', activeConversation.id);
      setShowRating(false);
      setActiveConversation(null);
      setMessages([]);
      setShowQuickActions(true);
    } catch (e) { console.error(e); }
  };

  const markAsRead = async () => {
    if (!activeConversation || !user) return;
    try {
      await supabase.from('live_chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', activeConversation.id)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (isOpen && activeConversation) markAsRead();
  }, [isOpen, messages.length]);

  const formatTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] rounded-full shadow-lg hover:shadow-xl hover:shadow-[#D4AF37]/30 transition-all flex items-center justify-center group"
        >
          <MessageCircle className="w-6 h-6 text-slate-900 group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount}
            </span>
          )}
          <span className="absolute -top-10 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Live Chat Support
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-slate-900 rounded-2xl shadow-2xl border border-white/20 overflow-hidden transition-all ${
          isMinimized ? 'w-72 h-14' : 'w-[400px] h-[560px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Digiwell Live Support</h3>
                {!isMinimized && (
                  <p className="text-slate-800 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {activeConversation?.agent_id ? 'Agent Connected' : 'AI Assistant Online'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                {isMinimized ? <Maximize2 className="w-4 h-4 text-slate-900" /> : <Minimize2 className="w-4 h-4 text-slate-900" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-900" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <ScrollArea className="h-[400px] p-4">
                {showQuickActions && messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Welcome to Live Support!</h4>
                      <p className="text-slate-400 text-sm">AI-powered with real-time agent backup</p>
                    </div>
                    <div className="space-y-2">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => startConversation(action.category, action.message)}
                          className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-left transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                            <action.icon className="w-4 h-4 text-[#D4AF37]" />
                          </div>
                          <span className="text-white text-sm flex-1">{action.label}</span>
                          <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                        </button>
                      ))}
                    </div>
                    {onOpenFullChat && (
                      <button onClick={() => { setIsOpen(false); onOpenFullChat(); }}
                        className="w-full p-2 text-[#D4AF37] text-sm hover:underline flex items-center justify-center gap-1">
                        <Maximize2 className="w-4 h-4" /> Open Full Support Center
                      </button>
                    )}
                  </div>
                ) : showRating ? (
                  <div className="text-center py-8 space-y-4">
                    <h4 className="text-white font-semibold">Rate your experience</h4>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setRating(s)}
                          className={`p-2 rounded-lg transition-all ${rating >= s ? 'text-[#D4AF37] scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
                          <Star className="w-8 h-8" fill={rating >= s ? '#D4AF37' : 'none'} />
                        </button>
                      ))}
                    </div>
                    <Button onClick={submitRating} disabled={rating === 0}
                      className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                      Submit Rating
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id}
                        className={`flex ${msg.sender_type === 'system' ? 'justify-center' : msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender_type === 'system' ? (
                          <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full">{msg.content}</div>
                        ) : (
                          <div className={`max-w-[80%]`}>
                            {msg.sender_type !== 'customer' && msg.sender_id !== user?.id && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                {msg.sender_type === 'ai' ? (
                                  <><Bot className="w-3 h-3 text-purple-400" /><span className="text-purple-400">AI Assistant</span></>
                                ) : (
                                  <><User className="w-3 h-3" /><span>Support Agent</span></>
                                )}
                              </div>
                            )}
                            {msg.message_type === 'image' && msg.file_url ? (
                              <div className={`rounded-2xl overflow-hidden ${msg.sender_id === user?.id ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                                <img src={msg.file_url} alt="Shared" className="max-w-full rounded-lg" />
                              </div>
                            ) : msg.message_type === 'file' && msg.file_url ? (
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                                className={`rounded-2xl px-4 py-2 flex items-center gap-2 ${
                                  msg.sender_id === user?.id ? 'bg-[#D4AF37] text-slate-900 rounded-br-md' : 'bg-white/10 text-white rounded-bl-md'
                                }`}>
                                <FileText className="w-4 h-4" />
                                <span className="text-sm underline">{msg.file_name || 'Download File'}</span>
                              </a>
                            ) : (
                              <div className={`rounded-2xl px-4 py-2 ${
                                msg.sender_id === user?.id
                                  ? 'bg-[#D4AF37] text-slate-900 rounded-br-md'
                                  : msg.sender_type === 'ai'
                                    ? 'bg-purple-500/20 text-white border border-purple-500/30 rounded-bl-md'
                                    : 'bg-white/10 text-white rounded-bl-md'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 text-xs text-slate-500 mt-1 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
                              <span>{formatTime(msg.created_at)}</span>
                              {msg.sender_id === user?.id && (
                                msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Typing Indicator */}
                    {agentTyping && (
                      <div className="flex items-start gap-2">
                        <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {aiLoading && (
                      <div className="flex items-start gap-2">
                        <div className="bg-purple-500/20 rounded-2xl rounded-bl-md px-4 py-3 border border-purple-500/30">
                          <div className="flex items-center gap-2 text-purple-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              {!showRating && (
                <div className="p-3 border-t border-white/10">
                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !activeConversation}
                      className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                    </button>
                    <Input
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type your message..."
                      className="bg-white/10 border-white/20 text-white text-sm placeholder:text-slate-500 flex-1"
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="sm"
                      className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] px-3">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span>AI-powered with live agent support</span>
                    </div>
                    {activeConversation && (
                      <button onClick={() => setShowRating(true)} className="text-xs text-slate-500 hover:text-[#D4AF37]">
                        End & Rate
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
