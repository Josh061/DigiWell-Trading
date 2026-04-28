import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle, Send, X, Minimize2, Maximize2, Bot, Sparkles,
  Loader2, User, Clock, ChevronDown, HelpCircle, Zap, Package,
  CreditCard, Truck, FileText, Database
} from 'lucide-react';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'agent' | 'system';
  message: string;
  is_ai_response?: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: string;
  category: string;
}

interface UserContext {
  orders: any[];
  invoices: any[];
  shipments: any[];
  summary: string;
}

interface ChatWidgetProps {
  onOpenFullChat?: () => void;
}

export default function ChatWidget({ onOpenFullChat }: ChatWidgetProps) {
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
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: 'Where is my order?', category: 'order', icon: Package, message: 'Where is my order? Can you tell me the current status and tracking information?' },
    { label: 'Payment & Invoices', category: 'payment', icon: CreditCard, message: 'I have a question about my payment or invoice. Can you show me my pending invoices?' },
    { label: 'Shipping Status', category: 'shipping', icon: Truck, message: 'Can you give me an update on my shipment? What is the estimated delivery date?' },
    { label: 'General Help', category: 'general', icon: HelpCircle, message: 'I need help with something on the Digiwell platform.' },
  ];

  // Fetch user context on mount
  useEffect(() => {
    if (user && isOpen) {
      fetchUserContext();
    }
  }, [user, isOpen]);

  const fetchUserContext = async () => {
    if (!user) return;
    
    setLoadingContext(true);
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'get_user_context',
          user_id: user.id
        }
      });
      
      if (data?.context) {
        setUserContext(data.context);
      }
    } catch (error) {
      console.error('Error fetching user context:', error);
    } finally {
      setLoadingContext(false);
    }
  };

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeConversation) return;
    let channel: any = null;

    try {
      channel = supabase
        .channel(`widget-messages-${activeConversation.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${activeConversation.id}` },
          (payload) => {
            try {
              const newMsg = payload.new as Message;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              if (!isOpen && newMsg.sender_type !== 'user') {
                setUnreadCount(prev => prev + 1);
              }
            } catch (err) {
              console.warn('[ChatWidget] Realtime callback error:', err);
            }
          }
        )
        .subscribe((status: string, err?: Error) => {
          if (err) console.warn('[ChatWidget] Subscription error:', err);
        });
    } catch (err) {
      console.warn('[ChatWidget] Failed to create realtime channel:', err);
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    };
  }, [activeConversation, isOpen]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear unread count when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Load existing conversation on mount
  useEffect(() => {
    if (user) {
      loadExistingConversation();
    }
  }, [user]);

  const loadExistingConversation = async () => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'get_conversations',
          user_id: user?.id,
          role: 'user',
          status: 'open'
        }
      });

      if (data?.conversations?.length > 0) {
        const latestConv = data.conversations[0];
        setActiveConversation(latestConv);
        loadMessages(latestConv.id);
        setShowQuickActions(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: { action: 'get_messages', conversation_id: conversationId, limit: 50 }
      });
      if (data?.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const startConversation = async (category: string, initialMessage?: string) => {
    const subject = `Quick Support - ${category.charAt(0).toUpperCase() + category.slice(1)}`;
    const message = initialMessage || `Hi, I need help with ${category}`;

    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'create_conversation',
          user_id: user?.id,
          subject,
          category,
          priority: 'normal'
        }
      });

      if (data?.conversation) {
        setActiveConversation(data.conversation);
        setShowQuickActions(false);

        // Send initial message
        await supabase.functions.invoke('support-chat', {
          body: {
            action: 'send_message',
            conversation_id: data.conversation.id,
            sender_id: user?.id,
            sender_type: 'user',
            message
          }
        });

        // Get AI response with user context
        setAiLoading(true);
        await supabase.functions.invoke('support-chat', {
          body: {
            action: 'get_ai_response',
            conversation_id: data.conversation.id,
            user_message: message,
            conversation_history: [],
            user_id: user?.id // Pass user_id for context-aware responses
          }
        });
        setAiLoading(false);

        loadMessages(data.conversation.id);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      setAiLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      if (!activeConversation) {
        // Start new conversation with this message
        await startConversation('general', messageToSend);
      } else {
        // Send to existing conversation
        await supabase.functions.invoke('support-chat', {
          body: {
            action: 'send_message',
            conversation_id: activeConversation.id,
            sender_id: user?.id,
            sender_type: 'user',
            message: messageToSend
          }
        });

        // Get AI response if not assigned to agent
        if (activeConversation.status !== 'assigned') {
          setAiLoading(true);
          await supabase.functions.invoke('support-chat', {
            body: {
              action: 'get_ai_response',
              conversation_id: activeConversation.id,
              user_message: messageToSend,
              conversation_history: messages.filter(m => m.sender_type !== 'system'),
              user_id: user?.id // Pass user_id for context-aware responses
            }
          });
          setAiLoading(false);
        }

        loadMessages(activeConversation.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setAiLoading(false);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
          <span className="absolute -top-10 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Need help?
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 bg-slate-900 rounded-2xl shadow-2xl border border-white/20 overflow-hidden transition-all ${
          isMinimized ? 'w-72 h-14' : 'w-96 h-[520px]'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Digiwell AI Support</h3>
                {!isMinimized && (
                  <p className="text-slate-800 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Context-Aware Assistant
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4 text-slate-900" /> : <Minimize2 className="w-4 h-4 text-slate-900" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-900" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Context Indicator */}
              {userContext && (userContext.orders.length > 0 || userContext.invoices.length > 0) && (
                <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-purple-300">
                    AI has access to your {userContext.orders.length} orders, {userContext.invoices.length} invoices
                  </span>
                </div>
              )}

              {/* Messages Area */}
              <ScrollArea className="h-[350px] p-4">
                {showQuickActions && messages.length === 0 ? (
                  <div className="space-y-4">
                    {/* Welcome Message */}
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                      </div>
                      <h4 className="text-white font-semibold mb-1">Welcome to Digiwell Support!</h4>
                      <p className="text-slate-400 text-sm">Our AI knows your orders & can help instantly</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-2">
                      <p className="text-slate-400 text-xs text-center mb-3">What can we help you with?</p>
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
                          <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg]" />
                        </button>
                      ))}
                    </div>

                    {/* User Context Summary */}
                    {loadingContext ? (
                      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading your data...</span>
                      </div>
                    ) : userContext && userContext.orders.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-3 border border-white/10">
                        <p className="text-xs text-slate-400 mb-2">Your recent activity:</p>
                        <div className="space-y-1">
                          {userContext.orders.slice(0, 2).map((order, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-white">{order.order_number}</span>
                              <Badge className={`text-[10px] ${
                                order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {order.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open Full Chat */}
                    {onOpenFullChat && (
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          onOpenFullChat();
                        }}
                        className="w-full p-2 text-[#D4AF37] text-sm hover:underline flex items-center justify-center gap-1"
                      >
                        <Maximize2 className="w-4 h-4" />
                        Open Full Support Center
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'system' ? 'justify-center' : 
                          (msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}`}
                      >
                        {msg.sender_type === 'system' ? (
                          <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full">
                            {msg.message}
                          </div>
                        ) : (
                          <div className={`max-w-[80%] ${msg.sender_id === user?.id ? '' : ''}`}>
                            {msg.sender_type !== 'user' && msg.sender_id !== user?.id && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                                {msg.is_ai_response ? (
                                  <>
                                    <Bot className="w-3 h-3 text-purple-400" />
                                    <span className="text-purple-400">AI Assistant</span>
                                    <Badge className="bg-purple-500/20 text-purple-400 text-[9px] ml-1">Context-Aware</Badge>
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3 h-3" />
                                    <span>Support Agent</span>
                                  </>
                                )}
                              </div>
                            )}
                            <div className={`rounded-2xl px-4 py-2 ${
                              msg.sender_id === user?.id 
                                ? 'bg-[#D4AF37] text-slate-900 rounded-br-md' 
                                : msg.is_ai_response
                                  ? 'bg-purple-500/20 text-white border border-purple-500/30 rounded-bl-md'
                                  : 'bg-white/10 text-white rounded-bl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <div className={`text-xs text-slate-500 mt-1 ${msg.sender_id === user?.id ? 'text-right' : ''}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* AI Loading */}
                    {aiLoading && (
                      <div className="flex items-start gap-2">
                        <div className="bg-purple-500/20 rounded-2xl rounded-bl-md px-4 py-3 border border-purple-500/30">
                          <div className="flex items-center gap-2 text-purple-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Checking your orders...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-3 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Ask about your orders, payments..."
                    className="bg-white/10 border-white/20 text-white text-sm placeholder:text-slate-500"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    size="sm"
                    className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] px-3"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span>AI knows your order history</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
