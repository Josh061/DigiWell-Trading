import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle, Users, Clock, Star, Send, Loader2, Bot, User,
  CheckCircle, AlertCircle, ArrowRight, TrendingUp, Zap, Search,
  Paperclip, Check, CheckCheck, BarChart3, ThumbsUp, RefreshCw,
  FileText, Image as ImageIcon
} from 'lucide-react';

interface Conversation {
  id: string;
  customer_id: string;
  agent_id: string | null;
  subject: string;
  status: string;
  category: string;
  priority: string;
  satisfaction_rating: number | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  message_type: string;
  file_url?: string;
  file_name?: string;
  is_read: boolean;
  created_at: string;
}

export default function LiveChatAgentDashboard() {
  const { user, hasRole } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    waiting: 0, active: 0, resolved: 0, avgRating: 0, avgResponseTime: 0, todayResolved: 0
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchStats();
    const interval = setInterval(() => { fetchConversations(); fetchStats(); }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (!selectedConv) return;
    let channel: any;
    try {
      channel = supabase
        .channel(`agent-chat-${selectedConv.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `conversation_id=eq.${selectedConv.id}` },
          (payload) => {
            try {
              const newMsg = payload.new as Message;
              setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            } catch (e) { console.warn('Error processing realtime message:', e); }
          }
        ).subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Agent chat channel error, falling back to polling');
          }
        });
    } catch (e) {
      console.warn('Failed to create agent chat channel:', e);
    }
    return () => { if (channel) { try { supabase.removeChannel(channel); } catch (e) { /* ignore */ } } };
  }, [selectedConv]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      let query = supabase.from('live_chat_conversations').select('*').order('updated_at', { ascending: false });
      if (activeTab === 'active') query = query.in('status', ['waiting', 'active']);
      else if (activeTab === 'resolved') query = query.eq('status', 'resolved');
      else if (activeTab === 'closed') query = query.eq('status', 'closed');
      const { data } = await query;
      setConversations(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const { data: all } = await supabase.from('live_chat_conversations').select('*');
      if (!all) return;
      const waiting = all.filter(c => c.status === 'waiting').length;
      const active = all.filter(c => c.status === 'active').length;
      const resolved = all.filter(c => c.status === 'resolved' || c.status === 'closed').length;
      const rated = all.filter(c => c.satisfaction_rating);
      const avgRating = rated.length > 0 ? rated.reduce((s, c) => s + (c.satisfaction_rating || 0), 0) / rated.length : 0;
      const resolvedWithTime = all.filter(c => c.first_response_at && c.created_at);
      const avgResponseTime = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((s, c) => s + (new Date(c.first_response_at!).getTime() - new Date(c.created_at).getTime()), 0) / resolvedWithTime.length / 60000
        : 0;
      const today = new Date().toDateString();
      const todayResolved = all.filter(c => c.resolved_at && new Date(c.resolved_at).toDateString() === today).length;
      setStats({ waiting, active, resolved, avgRating: Math.round(avgRating * 10) / 10, avgResponseTime: Math.round(avgResponseTime), todayResolved });
    } catch (e) { console.error(e); }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    try {
      const { data } = await supabase.from('live_chat_messages')
        .select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
      setMessages(data || []);
      // Mark messages as read
      await supabase.from('live_chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', conv.id)
        .neq('sender_type', 'agent')
        .eq('is_read', false);
    } catch (e) { console.error(e); }
  };

  const assignToMe = async (conv: Conversation) => {
    if (!user) return;
    try {
      await supabase.from('live_chat_conversations')
        .update({ agent_id: user.id, status: 'active', first_response_at: conv.first_response_at || new Date().toISOString() })
        .eq('id', conv.id);
      await supabase.from('live_chat_messages').insert({
        conversation_id: conv.id, sender_id: user.id, sender_type: 'system',
        content: 'A support agent has joined the conversation.', message_type: 'text'
      });
      fetchConversations();
      selectConversation({ ...conv, agent_id: user.id, status: 'active' });
    } catch (e) { console.error(e); }
  };

  const sendAgentMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    const msg = newMessage;
    setNewMessage('');
    setSending(true);
    try {
      await supabase.from('live_chat_messages').insert({
        conversation_id: selectedConv.id, sender_id: user.id, sender_type: 'agent',
        content: msg, message_type: 'text'
      });
      await supabase.from('live_chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConv.id);
      const { data } = await supabase.from('live_chat_messages')
        .select('*').eq('conversation_id', selectedConv.id).order('created_at', { ascending: true });
      setMessages(data || []);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const resolveConversation = async () => {
    if (!selectedConv) return;
    try {
      await supabase.from('live_chat_conversations')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', selectedConv.id);
      await supabase.from('live_chat_messages').insert({
        conversation_id: selectedConv.id, sender_id: user?.id || 'system', sender_type: 'system',
        content: 'This conversation has been resolved. Thank you for contacting Digiwell support!', message_type: 'text'
      });
      setSelectedConv(null);
      setMessages([]);
      fetchConversations();
      fetchStats();
    } catch (e) { console.error(e); }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'normal': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'waiting': return 'bg-yellow-500/20 text-yellow-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'resolved': return 'bg-blue-500/20 text-blue-400';
      case 'closed': return 'bg-slate-500/20 text-slate-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">Admin access required for agent dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#D4AF37]" />
            Live Chat Agent Dashboard
          </h2>
          <p className="text-slate-400 text-sm">Manage customer conversations in real-time</p>
        </div>
        <Button onClick={() => { fetchConversations(); fetchStats(); }} variant="outline" className="border-[#00D4FF] text-[#00D4FF]">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Waiting', value: stats.waiting, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Active', value: stats.active, icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Avg Rating', value: `${stats.avgRating}/5`, icon: Star, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/20' },
          { label: 'Avg Response', value: `${stats.avgResponseTime}m`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { label: 'Today', value: stats.todayResolved, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">{stat.label}</div>
                  <div className="text-xl font-bold text-white">{stat.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..." className="pl-9 bg-white/5 border-white/20 text-white text-sm" />
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/10 border border-white/20 w-full">
                <TabsTrigger value="active" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                  Active {stats.waiting + stats.active > 0 && <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1">{stats.waiting + stats.active}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="resolved" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">Resolved</TabsTrigger>
                <TabsTrigger value="closed" className="flex-1 text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">Closed</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredConversations.map(conv => (
                    <button key={conv.id} onClick={() => selectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${selectedConv?.id === conv.id ? 'bg-white/10 border-l-2 border-[#D4AF37]' : ''}`}>
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-white text-sm font-medium truncate flex-1">{conv.subject}</span>
                        <span className="text-slate-500 text-xs ml-2">{formatTime(conv.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${getStatusColor(conv.status)}`}>{conv.status}</Badge>
                        <Badge className={`text-[10px] ${getPriorityColor(conv.priority)}`}>{conv.priority}</Badge>
                        <span className="text-slate-500 text-xs">{conv.category}</span>
                      </div>
                      {conv.status === 'waiting' && !conv.agent_id && (
                        <div className="mt-2">
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); assignToMe(conv); }}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs h-7">
                            <ArrowRight className="w-3 h-3 mr-1" /> Assign to me
                          </Button>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-2">
          {selectedConv ? (
            <>
              <CardHeader className="border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">{selectedConv.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getStatusColor(selectedConv.status)}>{selectedConv.status}</Badge>
                      <span className="text-slate-400 text-xs">Customer: {selectedConv.customer_id.slice(0, 8)}...</span>
                      {selectedConv.satisfaction_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#D4AF37]" fill="#D4AF37" />
                          <span className="text-[#D4AF37] text-xs">{selectedConv.satisfaction_rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {selectedConv.status === 'waiting' && (
                      <Button size="sm" onClick={() => assignToMe(selectedConv)} className="bg-green-500 hover:bg-green-600 text-xs">
                        Assign to Me
                      </Button>
                    )}
                    {(selectedConv.status === 'active' || selectedConv.status === 'waiting') && (
                      <Button size="sm" onClick={resolveConversation} variant="outline" className="border-blue-400 text-blue-400 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[380px] p-4">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id}
                        className={`flex ${msg.sender_type === 'system' ? 'justify-center' : msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender_type === 'system' ? (
                          <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full">{msg.content}</div>
                        ) : (
                          <div className="max-w-[75%]">
                            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                              {msg.sender_type === 'ai' ? (
                                <><Bot className="w-3 h-3 text-purple-400" /><span className="text-purple-400">AI</span></>
                              ) : msg.sender_type === 'agent' ? (
                                <><User className="w-3 h-3 text-green-400" /><span className="text-green-400">You</span></>
                              ) : (
                                <><User className="w-3 h-3" /><span>Customer</span></>
                              )}
                            </div>
                            {msg.message_type === 'image' && msg.file_url ? (
                              <img src={msg.file_url} alt="Shared" className="max-w-full rounded-lg" />
                            ) : (
                              <div className={`rounded-2xl px-4 py-2 ${
                                msg.sender_type === 'agent' ? 'bg-[#D4AF37] text-slate-900 rounded-br-md'
                                : msg.sender_type === 'ai' ? 'bg-purple-500/20 text-white border border-purple-500/30 rounded-bl-md'
                                : 'bg-white/10 text-white rounded-bl-md'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 text-xs text-slate-500 mt-1 ${msg.sender_type === 'agent' ? 'justify-end' : ''}`}>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {msg.sender_type === 'agent' && (msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : <Check className="w-3 h-3" />)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                {(selectedConv.status === 'active' || selectedConv.status === 'waiting') && (
                  <div className="p-3 border-t border-white/10">
                    <div className="flex gap-2">
                      <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && sendAgentMessage()}
                        placeholder="Type your response..." className="bg-white/10 border-white/20 text-white text-sm" />
                      <Button onClick={sendAgentMessage} disabled={sending || !newMessage.trim()}
                        className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">Select a Conversation</h3>
                <p className="text-slate-400 text-sm">Choose a conversation from the list to start responding</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
