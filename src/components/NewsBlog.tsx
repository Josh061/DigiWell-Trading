import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Calendar, 
  Clock, 
  ArrowRight, 
  ChevronLeft,
  User,
  Share2,
  Bookmark,
  TrendingUp,
  Building2,
  Newspaper,
  Filter,
  X,
  MessageCircle,
  ThumbsUp,
  Reply,
  Send,
  MoreVertical,
  Trash2,
  Flag
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'News' | 'Market Analysis' | 'Company Updates' | 'Industry Insights' | string;
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number;
  image: string;
  featured: boolean;
  tags: string[];
}


interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes_count: number;
  created_at: string;
  user_name?: string;
  user_email?: string;
  replies?: Comment[];
  liked_by_user?: boolean;
}

const articlesData: Article[] = [
  {
    id: '1',
    title: 'Digiwell Trading Expands Operations to European Markets',
    excerpt: 'Strategic expansion into London and Amsterdam positions Digiwell as a key player in the global commodity trading landscape.',
    content: `Digiwell Trading LLC is pleased to announce its strategic expansion into European markets, with new offices opening in London and Amsterdam. This milestone represents a significant step in our mission to become a leading multinational energy player.

The London office will serve as our European headquarters, focusing on Brent crude oil trading and natural gas derivatives. Our Amsterdam presence will specialize in agricultural commodities and sustainable energy certificates.

"This expansion reflects our commitment to serving clients across multiple time zones with local expertise," said the CEO of Digiwell Trading. "European markets offer tremendous opportunities for growth, and we're excited to bring our innovative tokenization solutions to this region."

Key highlights of the expansion include:
• 50+ new positions across trading, compliance, and technology
• Partnership with major European banks for seamless settlements
• Integration with EU regulatory frameworks
• Launch of EUR-denominated token trading pairs

The expansion is expected to increase our trading volume by 40% within the first year of operations. Existing clients will benefit from extended trading hours and improved liquidity across all asset classes.

We remain committed to our African roots while building a truly global presence. This expansion is just the beginning of our journey to revolutionize commodity trading through technology and innovation.`,
    category: 'Company Updates',
    author: 'Corporate Communications',
    authorRole: 'Digiwell Trading',
    publishedAt: '2026-01-13',
    readTime: 5,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380718322_52350214.png',
    featured: true,
    tags: ['Expansion', 'Europe', 'Growth']
  },
  {
    id: '2',
    title: 'Q4 2025 Market Analysis: Crude Oil Price Trends and Forecasts',
    excerpt: 'Our analysts examine the key factors driving crude oil prices and provide insights for Q1 2026 trading strategies.',
    content: `The fourth quarter of 2025 saw significant volatility in crude oil markets, with Brent crude fluctuating between $72 and $89 per barrel. Our market analysis team has identified several key factors that will continue to influence prices in 2026.

Supply Dynamics:
OPEC+ production cuts remained in effect throughout Q4, supporting prices despite concerns about global demand. The cartel's decision to extend cuts through Q1 2026 suggests continued price support in the near term.

Demand Factors:
Chinese economic recovery showed mixed signals, with manufacturing PMI hovering around the expansion threshold. Meanwhile, Indian demand continued its strong growth trajectory, partially offsetting weakness in developed markets.

Geopolitical Considerations:
Middle Eastern tensions and shipping disruptions in the Red Sea added risk premiums to oil prices. Our models suggest a $3-5 per barrel geopolitical premium is currently priced into Brent crude.

Technical Analysis:
Key support levels for Brent crude are established at $75 and $70, with resistance at $85 and $90. The 200-day moving average at $78 serves as a crucial pivot point.

Our Q1 2026 Forecast:
We expect Brent crude to trade in a range of $75-88 per barrel, with potential upside if geopolitical tensions escalate or OPEC+ announces additional cuts. Downside risks include a sharper-than-expected economic slowdown in China.

Trading Recommendations:
• Consider accumulating positions on dips below $76
• Use options strategies to hedge against volatility
• Monitor weekly inventory reports for short-term trading signals
• Diversify exposure across different crude grades`,
    category: 'Market Analysis',
    author: 'Dr. Adebayo Okonkwo',
    authorRole: 'Chief Market Analyst',
    publishedAt: '2026-01-10',
    readTime: 8,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380745758_4c5608ea.png',
    featured: true,
    tags: ['Crude Oil', 'Market Analysis', 'Forecast']
  },
  {
    id: '3',
    title: 'Introducing Tokenized Gold: A New Era of Precious Metal Trading',
    excerpt: 'Digiwell launches gold-backed tokens, enabling fractional ownership of physical gold stored in secure vaults.',
    content: `Digiwell Trading is proud to announce the launch of DGOLD, our new gold-backed token that revolutionizes precious metal investment.`,
    category: 'News',
    author: 'Product Team',
    authorRole: 'Digiwell Trading',
    publishedAt: '2026-01-08',
    readTime: 4,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380839433_d3016032.png',
    featured: false,
    tags: ['Gold', 'Tokens', 'Launch']
  },
  {
    id: '4',
    title: 'Shipping & Logistics: New Partnership with Global Maritime Leaders',
    excerpt: 'Strategic partnership enhances our physical delivery capabilities with real-time tracking and improved insurance coverage.',
    content: `Digiwell Trading has entered into a strategic partnership with three of the world's leading maritime logistics companies.`,
    category: 'Company Updates',
    author: 'Operations Team',
    authorRole: 'Digiwell Trading',
    publishedAt: '2026-01-05',
    readTime: 6,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380771743_5eee7b27.png',
    featured: false,
    tags: ['Shipping', 'Partnership', 'Logistics']
  },
  {
    id: '5',
    title: 'The Future of Energy: Sustainable Trading in the Digital Age',
    excerpt: 'How blockchain technology and tokenization are driving the transition to sustainable energy markets.',
    content: `The global energy transition is accelerating, and Digiwell Trading is at the forefront.`,
    category: 'Market Analysis',
    author: 'Sustainability Team',
    authorRole: 'Digiwell Trading',
    publishedAt: '2026-01-03',
    readTime: 7,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380791662_29c51b30.jpg',
    featured: false,
    tags: ['Sustainability', 'Energy', 'Future']
  },
  {
    id: '6',
    title: 'Blockchain Technology: Revolutionizing Commodity Trading',
    excerpt: 'Deep dive into how distributed ledger technology is transforming traditional commodity markets.',
    content: `Blockchain technology is fundamentally changing how commodities are traded, settled, and tracked.`,
    category: 'News',
    author: 'Technology Team',
    authorRole: 'Digiwell Trading',
    publishedAt: '2025-12-28',
    readTime: 9,
    image: 'https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1768380693492_94410ff8.png',
    featured: false,
    tags: ['Blockchain', 'Technology', 'Innovation']
  }
];

const categories = [
  { id: 'all', name: 'All Articles', icon: Newspaper },
  { id: 'News', name: 'News', icon: Newspaper },
  { id: 'Market Analysis', name: 'Market Analysis', icon: TrendingUp },
  { id: 'Company Updates', name: 'Company Updates', icon: Building2 }
];

// Comment Component
const CommentItem: React.FC<{
  comment: Comment;
  onReply: (parentId: string) => void;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  depth?: number;
}> = ({ comment, onReply, onLike, onDelete, currentUserId, depth = 0 }) => {
  const [showReplies, setShowReplies] = useState(true);
  
  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-slate-700 pl-4' : ''}`}>
      <div className="bg-slate-800/30 rounded-lg p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{comment.user_name || 'Anonymous'}</p>
              <p className="text-slate-500 text-xs">
                {new Date(comment.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          {currentUserId === comment.user_id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(comment.id)}
              className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <p className="text-slate-300 text-sm mb-3">{comment.content}</p>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(comment.id)}
            className={`h-8 px-2 ${comment.liked_by_user ? 'text-blue-400' : 'text-slate-400'}`}
          >
            <ThumbsUp className={`w-4 h-4 mr-1 ${comment.liked_by_user ? 'fill-current' : ''}`} />
            {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
          </Button>
          {depth < 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-slate-400 h-8 px-2"
            >
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
      
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {showReplies && comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Comments Section Component
const CommentsSection: React.FC<{ articleId: string }> = ({ articleId }) => {
  const { user, userProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [articleId]);

  const loadComments = async () => {
    try {
      // Load comments
      const { data: commentsData, error } = await supabase
        .from('article_comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load user names
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Load likes for current user
      let userLikes: string[] = [];
      if (user) {
        const { data: likesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id);
        userLikes = likesData?.map(l => l.comment_id) || [];
      }

      // Build comment tree
      const commentsWithUsers = commentsData?.map(c => ({
        ...c,
        user_name: userMap.get(c.user_id)?.full_name || 'Anonymous',
        user_email: userMap.get(c.user_id)?.email,
        liked_by_user: userLikes.includes(c.id),
        replies: [] as Comment[]
      })) || [];

      // Organize into tree structure
      const rootComments: Comment[] = [];
      const commentMap = new Map<string, Comment>();
      
      commentsWithUsers.forEach(c => commentMap.set(c.id, c));
      
      commentsWithUsers.forEach(c => {
        if (c.parent_id && commentMap.has(c.parent_id)) {
          commentMap.get(c.parent_id)!.replies!.push(c);
        } else if (!c.parent_id) {
          rootComments.push(c);
        }
      });

      setComments(rootComments);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (content: string, parentId: string | null = null) => {
    if (!user || !content.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('article_comments')
        .insert({
          article_id: articleId,
          user_id: user.id,
          parent_id: parentId,
          content: content.trim()
        });

      if (error) throw error;

      setNewComment('');
      setReplyContent('');
      setReplyingTo(null);
      await loadComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const comment = comments.find(c => c.id === commentId) || 
        comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
      
      if (!comment) return;

      if (comment.liked_by_user) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        
        await supabase
          .from('article_comments')
          .update({ likes_count: Math.max(0, comment.likes_count - 1) })
          .eq('id', commentId);
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        
        await supabase
          .from('article_comments')
          .update({ likes_count: comment.likes_count + 1 })
          .eq('id', commentId);
      }

      await loadComments();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('article_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      await loadComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="border-t border-slate-700 pt-6 mt-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-[#D4AF37]" />
        Comments ({totalComments})
      </h3>

      {/* New Comment Form */}
      {user ? (
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white resize-none mb-2"
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => submitComment(newComment)}
                  disabled={!newComment.trim() || submitting}
                  className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-center">
          <p className="text-slate-400">Please log in to leave a comment</p>
        </div>
      )}

      {/* Reply Form */}
      {replyingTo && user && (
        <div className="mb-6 ml-8 bg-slate-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Replying to comment</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="text-slate-400 h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            placeholder="Write your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white resize-none mb-2"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => submitComment(replyContent, replyingTo)}
              disabled={!replyContent.trim() || submitting}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
            >
              Reply
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={setReplyingTo}
              onLike={handleLike}
              onDelete={handleDelete}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NewsBlog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());

  const filteredArticles = articlesData.filter(article => {
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = filteredArticles.filter(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured);

  const toggleSaveArticle = (articleId: string) => {
    const newSaved = new Set(savedArticles);
    if (newSaved.has(articleId)) {
      newSaved.delete(articleId);
    } else {
      newSaved.add(articleId);
    }
    setSavedArticles(newSaved);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'News': return 'bg-blue-500';
      case 'Market Analysis': return 'bg-green-500';
      case 'Company Updates': return 'bg-purple-500';
      default: return 'bg-slate-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-900/50 to-slate-900 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-slate-800/30 opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-4 py-2 mb-6">
              <Newspaper className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">News & Insights</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Stay Informed with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Digiwell Insights</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              Market analysis, company updates, and industry news to keep you ahead of the curve.
            </p>

            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400">
            Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              Featured Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="bg-slate-800/50 border-slate-700 overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    <Badge className={`absolute top-4 left-4 ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </Badge>
                    <Badge className="absolute top-4 right-4 bg-amber-500">Featured</Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-slate-400 mb-4 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(article.publishedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {article.readTime} min
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveArticle(article.id);
                        }}
                        className={savedArticles.has(article.id) ? 'text-amber-400' : 'text-slate-400'}
                      >
                        <Bookmark className={`w-4 h-4 ${savedArticles.has(article.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Articles Grid */}
        {filteredArticles.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <Newspaper className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No articles found</h3>
              <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                View All Articles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">
              {selectedCategory === 'all' ? 'Latest Articles' : selectedCategory}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchQuery || selectedCategory !== 'all' ? filteredArticles : regularArticles).map((article) => (
                <Card
                  key={article.id}
                  className="bg-slate-800/50 border-slate-700 overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    <Badge className={`absolute top-3 left-3 ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(article.publishedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveArticle(article.id);
                        }}
                        className={`p-1 ${savedArticles.has(article.id) ? 'text-amber-400' : 'text-slate-400'}`}
                      >
                        <Bookmark className={`w-4 h-4 ${savedArticles.has(article.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-900/50 via-purple-900/50 to-blue-900/50 rounded-2xl p-8 md:p-12 border border-blue-500/20">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Subscribe to Our Newsletter
            </h3>
            <p className="text-slate-300 mb-6">
              Get the latest market insights delivered directly to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-slate-800 border-slate-700 text-white"
              />
              <Button className="bg-blue-600 hover:bg-blue-700">
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Article Detail Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArticle(null)}
                    className="text-slate-400 hover:text-white -ml-2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                </div>
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden mb-6">
                  <img
                    src={selectedArticle.image}
                    alt={selectedArticle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  <Badge className={`absolute bottom-4 left-4 ${getCategoryColor(selectedArticle.category)}`}>
                    {selectedArticle.category}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  {selectedArticle.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{selectedArticle.author}</p>
                    <p className="text-slate-400 text-xs">{selectedArticle.authorRole}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 ml-auto">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedArticle.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedArticle.readTime} min read
                  </span>
                </div>
              </div>

              <div className="py-6">
                <div className="prose prose-invert max-w-none">
                  {selectedArticle.content.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-slate-300 leading-relaxed mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 py-4 border-t border-slate-700">
                {selectedArticle.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="border-slate-600 text-slate-400">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSaveArticle(selectedArticle.id)}
                    className={`border-slate-600 ${savedArticles.has(selectedArticle.id) ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300'}`}
                  >
                    <Bookmark className={`w-4 h-4 mr-2 ${savedArticles.has(selectedArticle.id) ? 'fill-current' : ''}`} />
                    {savedArticles.has(selectedArticle.id) ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-300">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Comments Section */}
              <CommentsSection articleId={selectedArticle.id} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsBlog;
