import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Edit, Trash2, Eye, EyeOff, Loader2, Save, X,
  Newspaper, Search, Calendar, CheckCircle, Clock, Star, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  author_role: string;
  category: string;
  featured_image: string;
  tags: string[];
  status: string;
  featured: boolean;
  read_time: number;
  publish_date: string;
  created_at: string;
  updated_at: string;
}

const emptyPost = {
  title: '', slug: '', content: '', excerpt: '', author: 'Digiwell Trading',
  author_role: 'Corporate Communications', category: 'News', featured_image: '',
  tags: [] as string[], status: 'draft', featured: false, read_time: 5
};

export default function BlogAdmin() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [newPost, setNewPost] = useState({ ...emptyPost });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => { fetchPosts(); }, [statusFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data } = await query;
      setPosts(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleCreate = async () => {
    if (!newPost.title) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const slug = newPost.slug || generateSlug(newPost.title);
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await supabase.from('blog_posts').insert({
        ...newPost, slug, tags, publish_date: new Date().toISOString()
      });
      setCreating(false);
      setNewPost({ ...emptyPost });
      setTagsInput('');
      fetchPosts();
      toast({ title: 'Post Created', description: `"${newPost.title}" has been created.` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await supabase.from('blog_posts').update({
        title: editing.title, slug: editing.slug, content: editing.content,
        excerpt: editing.excerpt, author: editing.author, author_role: editing.author_role,
        category: editing.category, featured_image: editing.featured_image,
        tags, status: editing.status, featured: editing.featured,
        read_time: editing.read_time, updated_at: new Date().toISOString()
      }).eq('id', editing.id);
      setEditing(null);
      fetchPosts();
      toast({ title: 'Post Updated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from('blog_posts').delete().eq('id', id);
    fetchPosts();
    toast({ title: 'Post Deleted' });
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await supabase.from('blog_posts').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', post.id);
    fetchPosts();
  };

  const toggleFeatured = async (post: BlogPost) => {
    await supabase.from('blog_posts').update({ featured: !post.featured, updated_at: new Date().toISOString() }).eq('id', post.id);
    fetchPosts();
  };

  const filtered = posts.filter(p => {
    if (!searchQuery) return true;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.author.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  if (!hasRole('admin')) {
    return <Card className="bg-white/10 border-white/20"><CardContent className="p-8 text-center"><h3 className="text-white font-bold">Admin Access Required</h3></CardContent></Card>;
  }

  const PostForm = ({ post, setPost, onSave, isNew }: { post: any; setPost: (p: any) => void; onSave: () => void; isNew: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm text-slate-300 mb-1 block">Title *</label><Input value={post.title} onChange={e => setPost({ ...post, title: e.target.value, slug: isNew ? generateSlug(e.target.value) : post.slug })} className="bg-white/5 border-white/20 text-white" /></div>
        <div><label className="text-sm text-slate-300 mb-1 block">Slug</label><Input value={post.slug || ''} onChange={e => setPost({ ...post, slug: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
      </div>
      <div><label className="text-sm text-slate-300 mb-1 block">Excerpt</label><Textarea value={post.excerpt} onChange={e => setPost({ ...post, excerpt: e.target.value })} className="bg-white/5 border-white/20 text-white" rows={2} /></div>
      <div><label className="text-sm text-slate-300 mb-1 block">Content</label><Textarea value={post.content} onChange={e => setPost({ ...post, content: e.target.value })} className="bg-white/5 border-white/20 text-white" rows={8} /></div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="text-sm text-slate-300 mb-1 block">Author</label><Input value={post.author} onChange={e => setPost({ ...post, author: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
        <div><label className="text-sm text-slate-300 mb-1 block">Author Role</label><Input value={post.author_role} onChange={e => setPost({ ...post, author_role: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Category</label>
          <select value={post.category} onChange={e => setPost({ ...post, category: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white text-sm">
            <option value="News" className="bg-slate-800">News</option>
            <option value="Market Analysis" className="bg-slate-800">Market Analysis</option>
            <option value="Company Updates" className="bg-slate-800">Company Updates</option>
            <option value="Industry Insights" className="bg-slate-800">Industry Insights</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="text-sm text-slate-300 mb-1 block">Featured Image URL</label><Input value={post.featured_image} onChange={e => setPost({ ...post, featured_image: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
        <div><label className="text-sm text-slate-300 mb-1 block">Tags (comma-separated)</label><Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Tag1, Tag2, Tag3" className="bg-white/5 border-white/20 text-white" /></div>
        <div><label className="text-sm text-slate-300 mb-1 block">Read Time (min)</label><Input type="number" value={post.read_time} onChange={e => setPost({ ...post, read_time: parseInt(e.target.value) || 5 })} className="bg-white/5 border-white/20 text-white" /></div>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={post.featured} onChange={e => setPost({ ...post, featured: e.target.checked })} className="rounded" />Featured
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <select value={post.status} onChange={e => setPost({ ...post, status: e.target.value })} className="px-2 py-1 bg-white/5 border border-white/20 rounded text-white text-sm">
            <option value="draft" className="bg-slate-800">Draft</option>
            <option value="published" className="bg-slate-800">Published</option>
            <option value="archived" className="bg-slate-800">Archived</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => isNew ? setCreating(false) : setEditing(null)} className="border-white/20 text-white">Cancel</Button>
        <Button onClick={onSave} disabled={saving} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{isNew ? 'Create Post' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Newspaper className="w-6 h-6 text-[#D4AF37]" />Blog Management</h2>
          <p className="text-slate-400 text-sm">Create, edit, and manage blog posts</p>
        </div>
        <Button onClick={() => { setCreating(true); setNewPost({ ...emptyPost }); setTagsInput(''); }} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"><Plus className="w-4 h-4 mr-2" />New Post</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/10 border-white/20"><CardContent className="p-4 flex items-center gap-3"><FileText className="w-8 h-8 text-blue-400" /><div><div className="text-slate-400 text-xs">Total Posts</div><div className="text-xl font-bold text-white">{posts.length}</div></div></CardContent></Card>
        <Card className="bg-green-500/10 border-green-500/20"><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-400" /><div><div className="text-green-400 text-xs">Published</div><div className="text-xl font-bold text-green-400">{publishedCount}</div></div></CardContent></Card>
        <Card className="bg-amber-500/10 border-amber-500/20"><CardContent className="p-4 flex items-center gap-3"><Clock className="w-8 h-8 text-amber-400" /><div><div className="text-amber-400 text-xs">Drafts</div><div className="text-xl font-bold text-amber-400">{draftCount}</div></div></CardContent></Card>
      </div>

      {/* Create Form */}
      {creating && (
        <Card className="bg-white/10 border-[#D4AF37]/30">
          <CardHeader><CardTitle className="text-white">Create New Post</CardTitle></CardHeader>
          <CardContent><PostForm post={newPost} setPost={setNewPost} onSave={handleCreate} isNew={true} /></CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search posts..." className="pl-10 bg-white/5 border-white/20 text-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white/5 border-white/20 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/5 border-white/10"><CardContent className="p-12 text-center"><Newspaper className="w-16 h-16 text-slate-600 mx-auto mb-4" /><h3 className="text-white font-semibold">No Posts Found</h3></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <Card key={post.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {post.featured_image && (
                    <img src={post.featured_image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold truncate">{post.title}</h4>
                      <Badge className={post.status === 'published' ? 'bg-green-500/20 text-green-400' : post.status === 'draft' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}>{post.status}</Badge>
                      <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">{post.category}</Badge>
                      {post.featured && <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]"><Star className="w-2.5 h-2.5 mr-0.5" />Featured</Badge>}
                    </div>
                    <p className="text-slate-400 text-xs truncate">{post.excerpt || post.content?.substring(0, 100)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{post.author}</span>
                      <span>{new Date(post.publish_date || post.created_at).toLocaleDateString()}</span>
                      <span>{post.read_time} min read</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => toggleFeatured(post)} className={post.featured ? 'text-[#D4AF37]' : 'text-slate-400'}><Star className={`w-4 h-4 ${post.featured ? 'fill-current' : ''}`} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(post)} className={post.status === 'published' ? 'text-green-400' : 'text-slate-400'}>{post.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(post); setTagsInput(post.tags?.join(', ') || ''); }} className="text-blue-400"><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id, post.title)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
          <DialogContent className="bg-slate-900 border-white/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-white">Edit Post</DialogTitle></DialogHeader>
            <PostForm post={editing} setPost={setEditing} onSave={handleUpdate} isNew={false} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
