import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Newspaper, Search, TrendingUp, TrendingDown, Minus, Clock, ExternalLink,
  RefreshCw, Loader2, Fuel, Flame, Droplets, Gem, Filter, AlertTriangle,
  ChevronLeft, ChevronRight, Megaphone, X, Globe
} from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  body: string;
  source: string;
  url: string;
  imageUrl?: string | null;
  dateTime: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  category: string;
  isBreaking: boolean;
  author?: string | null;
}

interface BreakingEvent {
  id: string;
  title: string;
  summary: string;
  articleCount: number;
  dateTime: string;
  isBreaking: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All News', icon: Newspaper },
  { id: 'crude', label: 'Crude Oil', icon: Fuel },
  { id: 'gas', label: 'Natural Gas', icon: Flame },
  { id: 'refined', label: 'Refined Products', icon: Droplets },
  { id: 'metals', label: 'Precious Metals', icon: Gem },
];

const ADVERTISEMENTS = [
  {
    id: 1,
    title: 'Digiwell Premium Trading',
    subtitle: 'Zero service fees with DigiCoin payments',
    cta: 'Start Trading Now',
    gradient: 'from-[#D4AF37] to-[#B8941F]',
    textColor: 'text-slate-900',
  },
  {
    id: 2,
    title: 'OPEC-Certified Platform',
    subtitle: 'Trade crude oil, natural gas, gold & more with live pricing',
    cta: 'Explore Products',
    gradient: 'from-blue-600 to-purple-700',
    textColor: 'text-white',
  },
  {
    id: 3,
    title: 'Secure Escrow Trading',
    subtitle: 'Blockchain-powered escrow for safe commodity transactions',
    cta: 'Learn More',
    gradient: 'from-emerald-600 to-teal-700',
    textColor: 'text-white',
  },
];

function SentimentBadge({ sentiment, score }: { sentiment: string; score: number }) {
  const config = {
    bullish: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: TrendingUp },
    bearish: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: TrendingDown },
    neutral: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', icon: Minus },
  };
  const c = config[sentiment as keyof typeof config] || config.neutral;
  const Icon = c.icon;

  return (
    <Badge className={`${c.bg} ${c.text} ${c.border} border text-[10px]`}>
      <Icon className="w-3 h-3 mr-0.5" />
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </Badge>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function OilMarketNewsFeed() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [breakingEvents, setBreakingEvents] = useState<BreakingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showBreakingBanner, setShowBreakingBanner] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchNews = async (category?: string, query?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('energy-news', {
        body: {
          query: query || undefined,
          category: category !== 'all' ? category : undefined,
          count: 30,
        }
      });

      if (data?.success) {
        setArticles(data.articles || []);
        setBreakingEvents(data.breakingEvents || []);
      }
    } catch (e) {
      console.error('Failed to fetch news:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Refresh every 5 minutes
    const interval = setInterval(() => fetchNews(), 300000);
    return () => clearInterval(interval);
  }, []);

  // Rotate ads
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % ADVERTISEMENTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    fetchNews(activeCategory, searchQuery);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    fetchNews(cat, searchQuery);
  };

  const filteredArticles = useMemo(() => {
    let result = [...articles];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'all') {
      result = result.filter(a => a.category === activeCategory);
    }
    return result;
  }, [articles, searchQuery, activeCategory]);

  const breakingArticles = filteredArticles.filter(a => a.isBreaking);
  const regularArticles = filteredArticles.filter(a => !a.isBreaking);

  const sentimentSummary = useMemo(() => {
    const bull = articles.filter(a => a.sentiment === 'bullish').length;
    const bear = articles.filter(a => a.sentiment === 'bearish').length;
    const neut = articles.filter(a => a.sentiment === 'neutral').length;
    return { bull, bear, neut, total: articles.length };
  }, [articles]);

  const currentAd = ADVERTISEMENTS[currentAdIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-[#D4AF37]" />
            Oil Market News & Analysis
          </h2>
          <p className="text-slate-400 text-sm">Real-time energy market headlines with AI sentiment analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
            <TrendingUp className="w-3 h-3 mr-1" />{sentimentSummary.bull} Bullish
          </Badge>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">
            <TrendingDown className="w-3 h-3 mr-1" />{sentimentSummary.bear} Bearish
          </Badge>
          <Button onClick={() => fetchNews(activeCategory, searchQuery)} variant="outline" size="sm" className="border-white/20 text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Breaking News Banner */}
      {showBreakingBanner && (breakingArticles.length > 0 || breakingEvents.length > 0) && (
        <div className="relative bg-gradient-to-r from-red-900/80 to-red-800/60 border border-red-500/50 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-bold text-sm uppercase tracking-wider">Breaking</span>
            </div>
            <div ref={tickerRef} className="flex-1 overflow-hidden">
              <div className="flex animate-marquee whitespace-nowrap">
                {(breakingArticles.length > 0 ? breakingArticles : breakingEvents.map(e => ({ title: e.title, source: 'Breaking' } as any))).map((item, i) => (
                  <span key={i} className="text-white text-sm mx-8">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />
                    {item.title}
                    <span className="text-red-400 ml-2">({item.source})</span>
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setShowBreakingBanner(false)} className="text-red-400 hover:text-white shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <style>{`
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .animate-marquee { animation: marquee 30s linear infinite; }
          `}</style>
        </div>
      )}

      {/* Advertisement Banner */}
      <div className={`relative bg-gradient-to-r ${currentAd.gradient} rounded-xl overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Megaphone className={`w-6 h-6 ${currentAd.textColor}`} />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${currentAd.textColor}`}>{currentAd.title}</h3>
              <p className={`text-sm ${currentAd.textColor} opacity-80`}>{currentAd.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 font-bold">
              {currentAd.cta}
            </Button>
            <div className="flex gap-1">
              {ADVERTISEMENTS.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentAdIndex ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>
        </div>
        <Badge className="absolute top-2 right-2 bg-black/20 text-white/60 text-[9px] border-0">Sponsored</Badge>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search news by keyword (e.g., OPEC, Brent, sanctions)..."
            className="pl-9 bg-white/10 border-white/20 text-white"
          />
        </div>
        <Button onClick={handleSearch} className="bg-[#D4AF37] text-slate-900 font-bold">
          <Search className="w-4 h-4 mr-1" />Search
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.id === 'all' ? articles.length : articles.filter(a => a.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#D4AF37] text-slate-900'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
              <span className={`text-xs ${activeCategory === cat.id ? 'text-slate-700' : 'text-slate-500'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* News Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-12 text-center">
            <Newspaper className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No News Found</h3>
            <p className="text-slate-400">Try adjusting your search or category filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Featured / Top Story */}
          {filteredArticles[0] && (
            <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {filteredArticles[0].imageUrl && (
                    <div className="md:w-1/3 h-48 md:h-auto bg-slate-700">
                      <img
                        src={filteredArticles[0].imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      {filteredArticles[0].isBreaking && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" />Breaking
                        </Badge>
                      )}
                      <SentimentBadge sentiment={filteredArticles[0].sentiment} score={filteredArticles[0].sentimentScore} />
                      <Badge className="bg-slate-700 text-slate-300 text-[10px]">{filteredArticles[0].category}</Badge>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{filteredArticles[0].title}</h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-3">{filteredArticles[0].body}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{filteredArticles[0].source}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(filteredArticles[0].dateTime)}</span>
                      </div>
                      {filteredArticles[0].url && filteredArticles[0].url !== '#' && (
                        <a href={filteredArticles[0].url} target="_blank" rel="noopener noreferrer"
                          className="text-[#00D4FF] text-xs flex items-center gap-1 hover:underline">
                          Read Full Article <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.slice(1).map(article => (
              <Card key={article.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {article.isBreaking && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-[10px]">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Breaking
                      </Badge>
                    )}
                    <SentimentBadge sentiment={article.sentiment} score={article.sentimentScore} />
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
                    {article.title}
                  </h4>
                  <p className="text-slate-400 text-xs mb-3 line-clamp-3">{article.body}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{article.source}</span>
                      <span>{timeAgo(article.dateTime)}</span>
                    </div>
                    {article.url && article.url !== '#' && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-[#00D4FF] text-[10px] flex items-center gap-0.5 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                        Read <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Summary Footer */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-medium text-slate-300">Market Sentiment</h4>
              <div className="flex items-center gap-1 h-3 w-48 bg-slate-700 rounded-full overflow-hidden">
                {sentimentSummary.total > 0 && (
                  <>
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${(sentimentSummary.bull / sentimentSummary.total) * 100}%` }} />
                    <div className="h-full bg-slate-500 transition-all" style={{ width: `${(sentimentSummary.neut / sentimentSummary.total) * 100}%` }} />
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${(sentimentSummary.bear / sentimentSummary.total) * 100}%` }} />
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {articles.length} articles analyzed • Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
