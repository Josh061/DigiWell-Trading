import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  MessageCircle, Send, X, User, Headphones, Clock, CheckCircle, AlertTriangle,
  Plus, Search, MoreVertical, ChevronRight, Zap, Loader2, ArrowUpRight,
  Bot, Sparkles, RefreshCw, Star, ThumbsUp, ThumbsDown, Copy, FileText,
  AlertCircle, History, TrendingUp, Users, MessageSquare, Settings,
  Package, CreditCard, Truck, Database, Eye
} from 'lucide-react';

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  subject: string;
  status: 'open' | 'assigned' | 'resolved' | 'escalated';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  related_order_id: string | null;
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'agent' | 'system';
  message: string;
  is_read: boolean;
  is_ai_response?: boolean;
  created_at: string;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut: string;
  usage_count: number;
}

interface ChatStats {
  total: number;
  open: number;
  assigned: number;
  resolved: number;
  escalated: number;
  avgResolutionTime: number;
  todayResolved: number;
  satisfactionRate: number;
  aiAssisted: number;
}

interface UserContext {
  orders: any[];
  invoices: any[];
  shipments: any[];
  summary: string;
}

export default function SupportChat() {
  const { user, hasRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCanned, setShowCanned] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [conversationSummary, setConversationSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [customerContext, setCustomerContext] = useState<UserContext | null>(null);
  const [showCustomerContext, setShowCustomerContext] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isAgent = hasRole(['admin', 'government_agency']);

  const [newConversation, setNewConversation] = useState({
    subject: '',
    category: 'general',
    priority: 'normal',
    message: ''
  });

  // Real-time subscriptions
  useEffect(() => {
    loadConversations();
    if (isAgent) {
      loadCannedResponses();
      loadStats();
    }

    let messagesChannel: any;
    let conversationsChannel: any;

    try {
      messagesChannel = supabase
        .channel('support-messages-realtime')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'support_messages' }, 
          (payload) => {
            try {
              const newMsg = payload.new as Message;
              if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
                setMessages(prev => {
                  if (prev.some(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
              }
            } catch (e) { console.warn('Error processing support message:', e); }
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') console.warn('Support messages channel error');
        });
    } catch (e) { console.warn('Failed to create support messages channel:', e); }

    try {
      conversationsChannel = supabase
        .channel('support-conversations-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'support_conversations' }, 
          () => { try { loadConversations(); } catch (e) { /* ignore */ } }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') console.warn('Support conversations channel error');
        });
    } catch (e) { console.warn('Failed to create support conversations channel:', e); }

    return () => {
      if (messagesChannel) { try { supabase.removeChannel(messagesChannel); } catch (e) { /* ignore */ } }
      if (conversationsChannel) { try { supabase.removeChannel(conversationsChannel); } catch (e) { /* ignore */ } }
    };
  }, [user, isAgent]);

  // Typing indicator subscription
  useEffect(() => {
    if (!selectedConversation) return;
    let typingChannel: any;

    try {
      typingChannel = supabase
        .channel(`typing:${selectedConversation.id}`)
        .on('broadcast', { event: 'typing' }, (payload) => {
          try {
            const { user_id, is_typing } = payload.payload;
            if (user_id !== user?.id) {
              setTypingUsers(prev => {
                const newSet = new Set(prev);
                if (is_typing) newSet.add(user_id);
                else newSet.delete(user_id);
                return newSet;
              });
            }
          } catch (e) { console.warn('Error processing typing event:', e); }
        })
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') console.warn('Typing channel error');
        });
    } catch (e) { console.warn('Failed to create typing channel:', e); }

    return () => {
      if (typingChannel) { try { supabase.removeChannel(typingChannel); } catch (e) { /* ignore */ } }
    };
  }, [selectedConversation, user]);


  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setAiSuggestions([]);
      setConversationSummary('');
      setCustomerContext(null);
      
      // Load customer context for agents
      if (isAgent && selectedConversation.user_id) {
        loadCustomerContext(selectedConversation.user_id);
      }
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCustomerContext = async (userId: string) => {
    setLoadingContext(true);
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'get_user_context',
          user_id: userId
        }
      });
      
      if (data?.context) {
        setCustomerContext(data.context);
      }
    } catch (error) {
      console.error('Error loading customer context:', error);
    } finally {
      setLoadingContext(false);
    }
  };

  const loadConversations = async () => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: { 
          action: 'get_conversations', 
          user_id: user?.id,
          role: isAgent ? 'agent' : 'user',
          status: filterStatus !== 'all' ? filterStatus : undefined
        }
      });
      if (data?.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: { action: 'get_messages', conversation_id: conversationId }
      });
      if (data?.messages) {
        setMessages(data.messages);
        // Mark messages as read
        await supabase.functions.invoke('support-chat', {
          body: { action: 'mark_messages_read', conversation_id: conversationId, reader_id: user?.id }
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadCannedResponses = async () => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: { action: 'get_canned_responses' }
      });
      if (data?.responses) {
        setCannedResponses(data.responses);
      }
    } catch (error) {
      console.error('Error loading canned responses:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: { action: 'get_stats' }
      });
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createConversation = async () => {
    if (!newConversation.subject || !newConversation.message) return;

    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'create_conversation',
          user_id: user?.id,
          subject: newConversation.subject,
          category: newConversation.category,
          priority: newConversation.priority
        }
      });

      if (data?.conversation) {
        // Send initial message
        await supabase.functions.invoke('support-chat', {
          body: {
            action: 'send_message',
            conversation_id: data.conversation.id,
            sender_id: user?.id,
            sender_type: 'user',
            message: newConversation.message
          }
        });

        // If AI is enabled, get AI response with user context
        if (aiEnabled) {
          setAiLoading(true);
          await supabase.functions.invoke('support-chat', {
            body: {
              action: 'get_ai_response',
              conversation_id: data.conversation.id,
              user_message: newConversation.message,
              conversation_history: [],
              user_id: user?.id // Pass user_id for context-aware responses
            }
          });
          setAiLoading(false);
        }

        setShowNewChat(false);
        setNewConversation({ subject: '', category: 'general', priority: 'normal', message: '' });
        loadConversations();
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setAiLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageToSend = newMessage;
    setNewMessage('');
    setSending(true);

    try {
      // Send user message
      await supabase.functions.invoke('support-chat', {
        body: {
          action: 'send_message',
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          sender_type: isAgent ? 'agent' : 'user',
          message: messageToSend
        }
      });

      // If user is not an agent and AI is enabled, get AI response with context
      if (!isAgent && aiEnabled && selectedConversation.status !== 'assigned') {
        setAiLoading(true);
        await supabase.functions.invoke('support-chat', {
          body: {
            action: 'get_ai_response',
            conversation_id: selectedConversation.id,
            user_message: messageToSend,
            conversation_history: messages.filter(m => m.sender_type !== 'system'),
            user_id: user?.id // Pass user_id for context-aware responses
          }
        });
        setAiLoading(false);
      }

      // If agent, get AI suggestions for next response
      if (isAgent) {
        getAiSuggestions(messageToSend);
      }

      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
      setAiLoading(false);
    } finally {
      setSending(false);
    }
  };

  const getAiSuggestions = async (userMessage: string) => {
    if (!selectedConversation) return;

    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'get_ai_suggestions',
          user_message: userMessage,
          category: selectedConversation.category,
          user_id: selectedConversation.user_id // Pass customer's user_id for context
        }
      });
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    }
  };

  const getConversationSummary = async () => {
    if (!selectedConversation) return;

    setShowSummary(true);
    setConversationSummary('Generating summary...');

    try {
      const { data } = await supabase.functions.invoke('support-chat', {
        body: {
          action: 'get_conversation_summary',
          conversation_id: selectedConversation.id,
          user_id: selectedConversation.user_id // Include user context in summary
        }
      });
      if (data?.summary) {
        setConversationSummary(data.summary);
      } else {
        setConversationSummary('Unable to generate summary.');
      }
    } catch (error) {
      setConversationSummary('Error generating summary.');
    }
  };

  const handleTyping = useCallback(() => {
    if (!selectedConversation) return;

    // Broadcast typing status
    supabase.channel(`typing:${selectedConversation.id}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user?.id, is_typing: true }
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`typing:${selectedConversation.id}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user?.id, is_typing: false }
      });
    }, 2000);
  }, [selectedConversation, user]);

  const assignToMe = async (conversationId: string) => {
    try {
      await supabase.functions.invoke('support-chat', {
        body: { action: 'assign_agent', conversation_id: conversationId, agent_id: user?.id }
      });
      loadConversations();
      if (selectedConversation?.id === conversationId) {
        loadMessages(conversationId);
      }
    } catch (error) {
      console.error('Error assigning conversation:', error);
    }
  };

  const resolveConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase.functions.invoke('support-chat', {
        body: { 
          action: 'resolve_conversation', 
          conversation_id: selectedConversation.id, 
          agent_id: user?.id 
        }
      });
      setShowFeedback(true);
      loadConversations();
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error resolving conversation:', error);
    }
  };

  const escalateToDispute = async () => {
    if (!selectedConversation) return;

    try {
      await supabase.functions.invoke('support-chat', {
        body: { 
          action: 'escalate_to_dispute', 
          conversation_id: selectedConversation.id, 
          agent_id: user?.id,
          reason: 'Issue could not be resolved via support chat'
        }
      });
      loadConversations();
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error escalating:', error);
    }
  };

  const reopenConversation = async () => {
    if (!selectedConversation) return;

    try {
      await supabase.functions.invoke('support-chat', {
        body: { 
          action: 'reopen_conversation', 
          conversation_id: selectedConversation.id, 
          user_id: user?.id,
          reason: 'Customer requested to reopen'
        }
      });
      loadConversations();
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error reopening conversation:', error);
    }
  };

  const submitFeedback = async () => {
    if (!selectedConversation || feedbackRating === 0) return;

    try {
      await supabase.from('chat_feedback').insert({
        conversation_id: selectedConversation.id,
        user_id: user?.id,
        rating: feedbackRating,
        feedback_text: feedbackText
      });
      setShowFeedback(false);
      setFeedbackRating(0);
      setFeedbackText('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const insertCannedResponse = (content: string, responseId: string) => {
    setNewMessage(prev => prev + content);
    setShowCanned(false);
    // Track usage
    supabase.functions.invoke('support-chat', {
      body: { action: 'use_canned_response', response_id: responseId }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'assigned': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'escalated': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'normal': return 'bg-blue-500/20 text-blue-400';
      case 'low': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      return conv.subject.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString();
  };

  const unreadCount = conversations.filter(c => c.status === 'open').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Headphones className="w-7 h-7 text-[#D4AF37]" />
            {isAgent ? 'Context-Aware Support Dashboard' : 'Customer Support'}
            {aiEnabled && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 ml-2">
                <Bot className="w-3 h-3 mr-1" />AI + Context
              </Badge>
            )}
          </h2>
          <p className="text-slate-400">
            {isAgent ? 'AI has access to customer orders, invoices & shipments' : 'Get instant help - AI knows your order history'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAgent && (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-slate-300">Smart AI</span>
              <Switch
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          )}
          {!isAgent && (
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                  <Plus className="w-4 h-4 mr-2" />New Conversation
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-white/20 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                    Start New Conversation
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Subject</Label>
                    <Input
                      value={newConversation.subject}
                      onChange={(e) => setNewConversation(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Category</Label>
                      <Select value={newConversation.category} onValueChange={(v) => setNewConversation(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="order">Order Issue</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="shipping">Shipping</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="auction">Auction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white">Priority</Label>
                      <Select value={newConversation.priority} onValueChange={(v) => setNewConversation(prev => ({ ...prev, priority: v }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-white">Message</Label>
                    <Textarea
                      value={newConversation.message}
                      onChange={(e) => setNewConversation(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Describe your issue... AI will check your orders automatically"
                      className="bg-white/10 border-white/20 text-white min-h-[120px]"
                    />
                  </div>
                  {aiEnabled && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-purple-400 text-sm">
                        <Database className="w-4 h-4" />
                        <span>AI will automatically check your orders, invoices & shipments</span>
                      </div>
                    </div>
                  )}
                  <Button onClick={createConversation} className="w-full bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                    Start Conversation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Agent Stats */}
      {isAgent && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-400">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/20 border-blue-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-400">{stats.open}</div>
              <div className="text-xs text-blue-300">Open</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/20 border-yellow-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-yellow-400">{stats.assigned}</div>
              <div className="text-xs text-yellow-300">Assigned</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/20 border-green-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-400">{stats.resolved}</div>
              <div className="text-xs text-green-300">Resolved</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/20 border-red-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-red-400">{stats.escalated}</div>
              <div className="text-xs text-red-300">Escalated</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/20 border-purple-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-purple-400">{stats.aiAssisted}</div>
              <div className="text-xs text-purple-300">AI Assisted</div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/20 border-cyan-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">{stats.avgResolutionTime}m</div>
              <div className="text-xs text-cyan-300">Avg Time</div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/20 border-pink-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-pink-400">{stats.todayResolved}</div>
              <div className="text-xs text-pink-300">Today</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/20 border-emerald-500/30">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{stats.satisfactionRate}%</div>
              <div className="text-xs text-emerald-300">Satisfaction</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px]">
        {/* Conversations List */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                Conversations
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                )}
              </CardTitle>
              {isAgent && (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 bg-white/10 border-white/20 text-white text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  {!isAgent && (
                    <Button 
                      onClick={() => setShowNewChat(true)}
                      className="mt-4 bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
                    >
                      Start a Conversation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredConversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-white/10 border-l-2 border-[#D4AF37]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate flex items-center gap-2">
                            {conv.subject}
                            {conv.ai_enabled && (
                              <Bot className="w-3 h-3 text-purple-400" />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 capitalize">{conv.category}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={`${getStatusColor(conv.status)} text-xs`}>{conv.status}</Badge>
                        <Badge className={`${getPriorityColor(conv.priority)} text-xs`}>{conv.priority}</Badge>
                        <span className="text-xs text-slate-500 ml-auto">{formatDate(conv.updated_at)}</span>
                      </div>
                      {isAgent && conv.status === 'open' && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); assignToMe(conv.id); }}
                          size="sm"
                          className="mt-2 w-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        >
                          <User className="w-3 h-3 mr-1" />Assign to Me
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b border-white/10 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {selectedConversation.subject}
                      {selectedConversation.ai_enabled && (
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          <Database className="w-3 h-3 mr-1" />Context-Aware
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(selectedConversation.status)}>{selectedConversation.status}</Badge>
                      <Badge className={getPriorityColor(selectedConversation.priority)}>{selectedConversation.priority}</Badge>
                      <span className="text-xs text-slate-400 capitalize">{selectedConversation.category}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAgent && (
                      <>
                        <Button 
                          onClick={() => setShowCustomerContext(!showCustomerContext)} 
                          size="sm" 
                          variant="outline"
                          className="border-cyan-400 text-cyan-400 hover:bg-cyan-500/20"
                        >
                          <Eye className="w-4 h-4 mr-1" />Customer Data
                        </Button>
                        <Button 
                          onClick={getConversationSummary} 
                          size="sm" 
                          variant="outline"
                          className="border-purple-400 text-purple-400 hover:bg-purple-500/20"
                        >
                          <FileText className="w-4 h-4 mr-1" />Summary
                        </Button>
                      </>
                    )}
                    {selectedConversation.status === 'resolved' && !isAgent && (
                      <Button onClick={reopenConversation} size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                        <RefreshCw className="w-4 h-4 mr-1" />Reopen
                      </Button>
                    )}
                    {isAgent && selectedConversation.status !== 'resolved' && selectedConversation.status !== 'escalated' && (
                      <>
                        <Button onClick={resolveConversation} size="sm" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                          <CheckCircle className="w-4 h-4 mr-1" />Resolve
                        </Button>
                        <Button onClick={escalateToDispute} size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-500/20">
                          <ArrowUpRight className="w-4 h-4 mr-1" />Escalate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Customer Context Panel (Agent Only) */}
              {isAgent && showCustomerContext && (
                <div className="mx-4 mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-cyan-400 font-medium">
                      <Database className="w-4 h-4" />Customer Context
                    </div>
                    <Button 
                      onClick={() => setShowCustomerContext(false)} 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {loadingContext ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading customer data...</span>
                    </div>
                  ) : customerContext ? (
                    <div className="grid grid-cols-3 gap-4">
                      {/* Orders */}
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-white font-medium mb-2">
                          <Package className="w-4 h-4 text-blue-400" />
                          Orders ({customerContext.orders.length})
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {customerContext.orders.slice(0, 3).map((order, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="text-white">{order.order_number}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">{order.product_name?.slice(0, 15)}...</span>
                                <Badge className={`text-[9px] ${
                                  order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                  order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invoices */}
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-white font-medium mb-2">
                          <CreditCard className="w-4 h-4 text-green-400" />
                          Invoices ({customerContext.invoices.length})
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {customerContext.invoices.slice(0, 3).map((invoice, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="text-white">{invoice.invoice_number}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">{invoice.currency} {Number(invoice.total_amount).toLocaleString()}</span>
                                <Badge className={`text-[9px] ${
                                  invoice.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {invoice.payment_status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipments */}
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-white font-medium mb-2">
                          <Truck className="w-4 h-4 text-purple-400" />
                          Shipments ({customerContext.shipments.length})
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {customerContext.shipments.slice(0, 3).map((shipment, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="text-white">{shipment.tracking_number}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">{shipment.carrier}</span>
                                <Badge className={`text-[9px] ${
                                  shipment.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                  shipment.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {shipment.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No customer data available</p>
                  )}
                </div>
              )}

              {/* AI Summary */}
              {showSummary && conversationSummary && (
                <div className="mx-4 mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                      <Sparkles className="w-4 h-4" />AI Summary
                    </div>
                    <Button 
                      onClick={() => setShowSummary(false)} 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-300">{conversationSummary}</p>
                </div>
              )}

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'system' ? 'justify-center' : 
                          (msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}`}
                      >
                        {msg.sender_type === 'system' ? (
                          <div className="bg-slate-700/50 text-slate-300 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {msg.message}
                          </div>
                        ) : (
                          <div className={`max-w-[75%] group ${msg.sender_id === user?.id ? 'order-2' : ''}`}>
                            {msg.is_ai_response && (
                              <div className="flex items-center gap-1 text-purple-400 text-xs mb-1">
                                <Bot className="w-3 h-3" />AI Assistant
                                <Badge className="bg-purple-500/20 text-purple-400 text-[9px] ml-1">Context-Aware</Badge>
                              </div>
                            )}
                            <div className={`rounded-lg px-4 py-2 ${
                              msg.sender_id === user?.id 
                                ? 'bg-[#D4AF37] text-slate-900' 
                                : msg.is_ai_response
                                  ? 'bg-purple-500/20 text-white border border-purple-500/30'
                                  : 'bg-white/10 text-white'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1 ${msg.sender_id === user?.id ? 'justify-end' : ''}`}>
                              <span className="text-xs text-slate-500">{formatTime(msg.created_at)}</span>
                              <button 
                                onClick={() => copyToClipboard(msg.message)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {typingUsers.size > 0 && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span>{isAgent ? 'Customer' : 'Agent'} is typing...</span>
                      </div>
                    )}

                    {/* AI Loading */}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-purple-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI is checking your data...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* AI Suggestions for Agents */}
              {isAgent && aiSuggestions.length > 0 && (
                <div className="mx-4 mb-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium mb-2">
                    <Sparkles className="w-4 h-4" />AI Suggested Responses
                  </div>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewMessage(suggestion)}
                        className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded text-sm text-slate-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              {selectedConversation.status !== 'resolved' && selectedConversation.status !== 'escalated' && (
                <div className="p-4 border-t border-white/10 flex-shrink-0">
                  {isAgent && (
                    <div className="mb-2">
                      <Button
                        onClick={() => setShowCanned(!showCanned)}
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                      >
                        <Zap className="w-4 h-4 mr-1" />Canned Responses
                      </Button>
                      {showCanned && cannedResponses.length > 0 && (
                        <div className="mt-2 bg-slate-700/50 rounded-lg p-2 max-h-40 overflow-y-auto">
                          {cannedResponses.map(resp => (
                            <button
                              key={resp.id}
                              onClick={() => insertCannedResponse(resp.content, resp.id)}
                              className="w-full text-left px-3 py-2 hover:bg-white/10 rounded text-sm text-white flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[#D4AF37] font-mono">{resp.shortcut}</span>
                                <span className="mx-2">-</span>
                                <span>{resp.title}</span>
                              </div>
                              <Badge className="bg-slate-600 text-xs">{resp.usage_count}</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={isAgent ? "Type your response..." : "Ask about your orders, payments, shipments..."}
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={sending || !newMessage.trim()} 
                      className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Resolved/Escalated Notice */}
              {(selectedConversation.status === 'resolved' || selectedConversation.status === 'escalated') && (
                <div className={`p-4 border-t ${
                  selectedConversation.status === 'resolved' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    {selectedConversation.status === 'resolved' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">This conversation has been resolved</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400">This issue has been escalated to dispute resolution</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to view messages</p>
                <p className="text-sm mt-2">AI will automatically check order & invoice data</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="bg-slate-800 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-[#D4AF37]" />
              How was your experience?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setFeedbackRating(rating)}
                  className={`p-2 rounded-lg transition-colors ${
                    feedbackRating >= rating 
                      ? 'bg-[#D4AF37] text-slate-900' 
                      : 'bg-white/10 text-slate-400 hover:bg-white/20'
                  }`}
                >
                  <Star className="w-6 h-6" fill={feedbackRating >= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us more about your experience (optional)"
              className="bg-white/10 border-white/20 text-white"
            />
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowFeedback(false)} 
                variant="outline" 
                className="flex-1 border-white/20 text-white"
              >
                Skip
              </Button>
              <Button 
                onClick={submitFeedback} 
                disabled={feedbackRating === 0}
                className="flex-1 bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
