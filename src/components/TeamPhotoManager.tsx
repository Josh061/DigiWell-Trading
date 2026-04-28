import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Loader2, Trash2, Edit, Plus, Save, X,
  Linkedin, Twitter, Eye, EyeOff, Camera,
  CheckCircle, AlertCircle, Users, ArrowUp, ArrowDown,
  RefreshCw, Shield, Globe, Link2, Database, Activity,
  Download, Image, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LINKEDIN_PHOTO_REGISTRY,
  checkAllLinkedInPhotos,
  syncPhotosToDatabase,
  getRecentSyncLogs,
  type PhotoHealthResult,
  type LinkedInPhotoEntry
} from '@/lib/linkedinPhotoSync';

interface TeamMember {
  id: string; name: string; role: string; bio: string; image_url: string;
  linkedin_url: string; twitter_url: string; display_order: number;
  is_active: boolean; created_at: string; updated_at: string;
}

export default function TeamPhotoManager() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMember, setNewMember] = useState({ name: '', role: '', bio: '', image_url: '', linkedin_url: '', twitter_url: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('members');
  const [healthResults, setHealthResults] = useState<PhotoHealthResult[]>([]);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linkedinUrlInput, setLinkedinUrlInput] = useState('');
  const [fetchingLinkedin, setFetchingLinkedin] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('team_members').select('*').order('display_order', { ascending: true });
      setMembers(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const resizedFile = await resizeImage(file, 800, 800);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `team/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('team-photos').upload(path, resizedFile, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('team-photos').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e) {
      toast({ title: 'Upload Failed', description: 'Failed to upload image.', variant: 'destructive' });
      return null;
    } finally { setUploading(false); }
  };

  const resizeImage = (file: File, maxW: number, maxH: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width *= ratio; height *= ratio;
        }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDrop = useCallback(async (e: React.DragEvent, memberId?: string) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = await uploadImage(file);
    if (!url) return;
    if (memberId) {
      await supabase.from('team_members').update({ image_url: url, updated_at: new Date().toISOString() }).eq('id', memberId);
      fetchMembers();
      toast({ title: 'Photo Updated' });
    } else {
      setNewMember(prev => ({ ...prev, image_url: url }));
      setPreviewImage(url);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, memberId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (!url) return;
    if (memberId && editingMember) {
      setEditingMember({ ...editingMember, image_url: url });
    } else {
      setNewMember(prev => ({ ...prev, image_url: url }));
      setPreviewImage(url);
    }
  };

  const addMember = async () => {
    if (!newMember.name || !newMember.role) {
      toast({ title: 'Error', description: 'Name and role are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const maxOrder = members.length > 0 ? Math.max(...members.map(m => m.display_order)) : 0;
      await supabase.from('team_members').insert({ ...newMember, display_order: maxOrder + 1, is_active: true });
      setNewMember({ name: '', role: '', bio: '', image_url: '', linkedin_url: '', twitter_url: '' });
      setPreviewImage(null); setShowAddForm(false);
      fetchMembers();
      toast({ title: 'Member Added', description: `${newMember.name} has been added.` });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add team member.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateMember = async () => {
    if (!editingMember) return;
    setSaving(true);
    try {
      await supabase.from('team_members').update({
        name: editingMember.name, role: editingMember.role, bio: editingMember.bio,
        image_url: editingMember.image_url, linkedin_url: editingMember.linkedin_url,
        twitter_url: editingMember.twitter_url, is_active: editingMember.is_active,
        updated_at: new Date().toISOString()
      }).eq('id', editingMember.id);
      setEditingMember(null); fetchMembers();
      toast({ title: 'Member Updated' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const deleteMember = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    await supabase.from('team_members').delete().eq('id', id);
    fetchMembers();
    toast({ title: 'Removed', description: `${name} removed.` });
  };

  const moveOrder = async (id: string, dir: 'up' | 'down') => {
    const idx = members.findIndex(m => m.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === members.length - 1)) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    await supabase.from('team_members').update({ display_order: members[swapIdx].display_order }).eq('id', members[idx].id);
    await supabase.from('team_members').update({ display_order: members[idx].display_order }).eq('id', members[swapIdx].id);
    fetchMembers();
  };

  const toggleActive = async (m: TeamMember) => {
    await supabase.from('team_members').update({ is_active: !m.is_active, updated_at: new Date().toISOString() }).eq('id', m.id);
    fetchMembers();
  };

  // LinkedIn CDN Health
  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    try {
      const results = await checkAllLinkedInPhotos();
      setHealthResults(results);
      const expired = results.filter(r => r.cdnStatus === 'expired');
      toast({ title: expired.length > 0 ? 'CDN URLs Expired' : 'All CDN URLs Active', description: expired.length > 0 ? `${expired.length} expired` : 'All valid.', variant: expired.length > 0 ? 'destructive' : 'default' });
    } catch (e) { toast({ title: 'Failed', variant: 'destructive' }); }
    setCheckingHealth(false);
  };

  const handleSyncToDatabase = async () => {
    setSyncing(true);
    try {
      const result = await syncPhotosToDatabase();
      toast({ title: result.success ? 'Sync Complete' : 'Sync Partial', description: `${result.updated} updated.` });
      fetchMembers();
    } catch (e) { toast({ title: 'Sync Failed', variant: 'destructive' }); }
    setSyncing(false);
  };

  const handleFetchLogs = async () => {
    setLoadingLogs(true);
    const logs = await getRecentSyncLogs(30);
    setSyncLogs(logs);
    setLoadingLogs(false);
  };

  // LinkedIn Photo Extraction
  const handleFetchLinkedInPhoto = async () => {
    if (!linkedinUrlInput.trim()) return;
    setFetchingLinkedin(true);
    try {
      // Since we can't directly scrape LinkedIn, we use the URL as the linkedin_url
      // and set a placeholder. Admin can then upload the actual photo.
      toast({ 
        title: 'LinkedIn URL Captured', 
        description: 'LinkedIn profile URL saved. Upload the profile photo manually or use the CDN URL if available.' 
      });
      setNewMember(prev => ({ ...prev, linkedin_url: linkedinUrlInput.trim() }));
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
    setFetchingLinkedin(false);
  };

  // Bulk Import from Registry
  const handleBulkImport = async () => {
    if (LINKEDIN_PHOTO_REGISTRY.length === 0) {
      toast({ title: 'Registry Empty', description: 'No entries in the LinkedIn Photo Registry to import.', variant: 'destructive' });
      return;
    }
    setBulkImporting(true);
    let imported = 0;
    for (const entry of LINKEDIN_PHOTO_REGISTRY) {
      if (!entry.isActive) continue;
      try {
        // Check if member already exists
        const { data: existing } = await supabase.from('team_members').select('id').ilike('name', `%${entry.name}%`).limit(1);
        const bestUrl = entry.fallbackUrl || entry.cdnUrl; // Prefer permanent fallback
        
        if (existing && existing.length > 0) {
          await supabase.from('team_members').update({
            image_url: bestUrl, linkedin_url: entry.linkedinUrl, updated_at: new Date().toISOString()
          }).eq('id', existing[0].id);
        } else {
          await supabase.from('team_members').insert({
            name: entry.name, role: entry.role, bio: '',
            image_url: bestUrl, linkedin_url: entry.linkedinUrl,
            twitter_url: '', display_order: imported + 1, is_active: true
          });
        }
        imported++;
      } catch (e) { console.error(`Failed to import ${entry.name}:`, e); }
    }
    toast({ title: 'Bulk Import Complete', description: `${imported} member(s) imported/updated from registry.` });
    fetchMembers();
    setBulkImporting(false);
  };

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold">Admin Access Required</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-[#D4AF37]" />Team Photo Management</h2>
          <p className="text-slate-400 text-sm">Manage team photos, bios, social links, and LinkedIn CDN health</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"><Plus className="w-4 h-4 mr-2" />Add Team Member</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-700/50">
          <TabsTrigger value="members" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"><Users className="w-4 h-4 mr-1.5" />Team Members</TabsTrigger>
          <TabsTrigger value="linkedin" className="data-[state=active]:bg-[#0077B5] data-[state=active]:text-white"><Linkedin className="w-4 h-4 mr-1.5" />LinkedIn CDN Health</TabsTrigger>
          <TabsTrigger value="registry" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"><Database className="w-4 h-4 mr-1.5" />Photo Registry</TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><Activity className="w-4 h-4 mr-1.5" />Sync Logs</TabsTrigger>
        </TabsList>

        {/* Tab: Team Members */}
        <TabsContent value="members" className="space-y-6">
          {showAddForm && (
            <Card className="bg-white/10 backdrop-blur-md border-[#D4AF37]/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Add New Team Member</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-slate-400"><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => handleDrop(e)}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragOver ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-white/20 hover:border-white/40'}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} onChange={e => handleFileSelect(e)} className="hidden" accept="image/*" />
                    {previewImage || newMember.image_url ? (
                      <div className="relative inline-block">
                        <img src={previewImage || newMember.image_url} alt="Preview" className="w-40 h-40 object-cover rounded-xl mx-auto" />
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Camera className="w-8 h-8 text-white" /></div>
                      </div>
                    ) : uploading ? (
                      <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto mb-3" />
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-white font-medium">Drop image here or click to upload</p>
                        <p className="text-slate-400 text-sm mt-1">JPG, PNG up to 5MB</p>
                      </>
                    )}
                  </div>
                  <div className="space-y-4">
                    {/* LinkedIn URL fetch */}
                    <div className="bg-[#0077B5]/10 border border-[#0077B5]/30 rounded-lg p-3">
                      <label className="text-sm text-[#0077B5] mb-1 block font-medium flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" />Import from LinkedIn Profile</label>
                      <div className="flex gap-2">
                        <Input value={linkedinUrlInput} onChange={e => setLinkedinUrlInput(e.target.value)} placeholder="https://linkedin.com/in/..." className="bg-white/5 border-white/20 text-white text-sm flex-1" />
                        <Button onClick={handleFetchLinkedInPhoto} disabled={fetchingLinkedin} size="sm" className="bg-[#0077B5] text-white hover:bg-[#005885]">
                          {fetchingLinkedin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Full Name *</label>
                      <Input value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Smith" className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Role / Title *</label>
                      <Input value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))} placeholder="e.g. Chief Executive Officer" className="bg-white/5 border-white/20 text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Bio</label>
                      <Textarea value={newMember.bio} onChange={e => setNewMember(p => ({ ...p, bio: e.target.value }))} placeholder="Brief biography..." className="bg-white/5 border-white/20 text-white" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">LinkedIn URL</label>
                        <Input value={newMember.linkedin_url} onChange={e => setNewMember(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." className="bg-white/5 border-white/20 text-white text-sm" />
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Twitter URL</label>
                        <Input value={newMember.twitter_url} onChange={e => setNewMember(p => ({ ...p, twitter_url: e.target.value }))} placeholder="https://twitter.com/..." className="bg-white/5 border-white/20 text-white text-sm" />
                      </div>
                    </div>
                    <Button onClick={addMember} disabled={saving || !newMember.name || !newMember.role} className="w-full bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Add Team Member
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
          ) : members.length === 0 ? (
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">No Team Members Yet</h3>
                <p className="text-slate-400 text-sm mb-4">Add your first team member to get started</p>
                <Button onClick={() => setShowAddForm(true)} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"><Plus className="w-4 h-4 mr-2" />Add First Member</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member, idx) => (
                <Card key={member.id} className={`bg-white/5 border-white/10 overflow-hidden transition-all ${!member.is_active ? 'opacity-50' : 'hover:border-[#D4AF37]/30'}`}>
                  <div className="relative h-56 overflow-hidden group">
                    {member.image_url ? (
                      <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Camera className="w-12 h-12 text-slate-600" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <input type="file" id={`file-${member.id}`} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file).then(url => {
                          if (url) supabase.from('team_members').update({ image_url: url }).eq('id', member.id).then(() => fetchMembers());
                        });
                      }} className="hidden" accept="image/*" />
                      <label htmlFor={`file-${member.id}`} className="p-2 bg-[#D4AF37] rounded-lg cursor-pointer hover:bg-[#B8941F]"><Camera className="w-5 h-5 text-slate-900" /></label>
                      <button onClick={() => setEditingMember(member)} className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600"><Edit className="w-5 h-5 text-white" /></button>
                      <button onClick={() => deleteMember(member.id, member.name)} className="p-2 bg-red-500 rounded-lg hover:bg-red-600"><Trash2 className="w-5 h-5 text-white" /></button>
                    </div>
                    {!member.is_active && <Badge className="absolute top-2 left-2 bg-red-500/80 text-white">Hidden</Badge>}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      <button onClick={() => moveOrder(member.id, 'up')} disabled={idx === 0} className="p-1 bg-slate-900/80 rounded hover:bg-slate-900 disabled:opacity-30"><ArrowUp className="w-3 h-3 text-white" /></button>
                      <button onClick={() => moveOrder(member.id, 'down')} disabled={idx === members.length - 1} className="p-1 bg-slate-900/80 rounded hover:bg-slate-900 disabled:opacity-30"><ArrowDown className="w-3 h-3 text-white" /></button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-white font-bold">{member.name}</h3>
                    <p className="text-[#D4AF37] text-sm">{member.role}</p>
                    <p className="text-slate-400 text-xs mt-2 line-clamp-2">{member.bio}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#0077B5]/20 rounded hover:bg-[#0077B5]/40"><Linkedin className="w-3.5 h-3.5 text-[#0077B5]" /></a>}
                        {member.twitter_url && <a href={member.twitter_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#1DA1F2]/20 rounded hover:bg-[#1DA1F2]/40"><Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" /></a>}
                      </div>
                      <button onClick={() => toggleActive(member)} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${member.is_active ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                        {member.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {member.is_active ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: LinkedIn CDN Health */}
        <TabsContent value="linkedin" className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleCheckHealth} disabled={checkingHealth} className="bg-[#0077B5] text-white hover:bg-[#005885]">
              {checkingHealth ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}Check LinkedIn CDN Health
            </Button>
            <Button onClick={handleSyncToDatabase} disabled={syncing} variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}Sync Photos to Database
            </Button>
            <Button onClick={handleBulkImport} disabled={bulkImporting} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
              {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}Bulk Import from LinkedIn
            </Button>
          </div>

          {healthResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-[#D4AF37]" />CDN Health Results</h3>
              {healthResults.map((result, idx) => (
                <Card key={idx} className={`bg-white/5 border-white/10 ${result.cdnStatus === 'expired' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-green-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{result.name}</h4>
                        <p className="text-slate-400 text-xs mt-1 truncate max-w-md">CDN: {result.cdnUrl.substring(0, 80)}...</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={result.cdnStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {result.cdnStatus === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                          {result.cdnStatus === 'active' ? 'CDN Active' : 'CDN Expired'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {healthResults.length === 0 && !checkingHealth && (
            <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Click "Check LinkedIn CDN Health" to test photo URLs</p></CardContent></Card>
          )}
        </TabsContent>

        {/* Tab: Photo Registry */}
        <TabsContent value="registry" className="space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-purple-400" />LinkedIn Photo Registry ({LINKEDIN_PHOTO_REGISTRY.length} entries)</h3>
          {LINKEDIN_PHOTO_REGISTRY.length === 0 ? (
            <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><Database className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Registry is empty. Add team members via the Team Members tab to populate the registry.</p></CardContent></Card>
          ) : LINKEDIN_PHOTO_REGISTRY.map((entry, idx) => (
            <Card key={idx} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                    <img src={entry.cdnUrl} alt={entry.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = entry.fallbackUrl; }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{entry.name}</h4>
                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">{entry.role}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><Link2 className="w-3 h-3 text-[#0077B5]" /><a href={entry.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#0077B5] text-xs hover:underline truncate">{entry.linkedinUrl}</a></div>
                      <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-blue-400" /><span className="text-slate-400 text-xs truncate">CDN: {entry.cdnUrl.substring(0, 70)}...</span></div>
                      <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-amber-400" /><span className="text-slate-400 text-xs truncate">Fallback: {entry.fallbackUrl.substring(0, 70)}...</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab: Sync Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Button onClick={handleFetchLogs} disabled={loadingLogs} variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
            {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}Load Sync Logs
          </Button>
          {syncLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10"><th className="text-left text-slate-400 py-2 px-3">Member</th><th className="text-left text-slate-400 py-2 px-3">Status</th><th className="text-left text-slate-400 py-2 px-3">Error</th><th className="text-left text-slate-400 py-2 px-3">Date</th></tr></thead>
                <tbody>
                  {syncLogs.map((log, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-white">{log.member_name}</td>
                      <td className="py-2 px-3"><Badge className={log.status === 'active' ? 'bg-green-500/20 text-green-400' : log.status === 'fallback_active' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>{log.status}</Badge></td>
                      <td className="py-2 px-3 text-slate-400 text-xs">{log.error_message || '-'}</td>
                      <td className="py-2 px-3 text-slate-400 text-xs">{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10"><CardContent className="p-8 text-center"><Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">Click "Load Sync Logs" to view history</p></CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
          <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg">
            <DialogHeader><DialogTitle className="text-white">Edit Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {editingMember.image_url ? (
                  <img src={editingMember.image_url} alt={editingMember.name} className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-slate-800 rounded-xl flex items-center justify-center"><Camera className="w-8 h-8 text-slate-600" /></div>
                )}
                <div className="flex-1">
                  <input type="file" id="edit-photo" onChange={e => handleFileSelect(e, editingMember.id)} className="hidden" accept="image/*" />
                  <label htmlFor="edit-photo" className="inline-flex items-center gap-2 px-3 py-2 bg-[#D4AF37] text-slate-900 rounded-lg cursor-pointer hover:bg-[#B8941F] text-sm font-medium">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Change Photo
                  </label>
                </div>
              </div>
              <div><label className="text-sm text-slate-300 mb-1 block">Name</label><Input value={editingMember.name} onChange={e => setEditingMember({ ...editingMember, name: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
              <div><label className="text-sm text-slate-300 mb-1 block">Role</label><Input value={editingMember.role} onChange={e => setEditingMember({ ...editingMember, role: e.target.value })} className="bg-white/5 border-white/20 text-white" /></div>
              <div><label className="text-sm text-slate-300 mb-1 block">Bio</label><Textarea value={editingMember.bio || ''} onChange={e => setEditingMember({ ...editingMember, bio: e.target.value })} className="bg-white/5 border-white/20 text-white" rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm text-slate-300 mb-1 block">LinkedIn</label><Input value={editingMember.linkedin_url || ''} onChange={e => setEditingMember({ ...editingMember, linkedin_url: e.target.value })} className="bg-white/5 border-white/20 text-white text-sm" /></div>
                <div><label className="text-sm text-slate-300 mb-1 block">Twitter</label><Input value={editingMember.twitter_url || ''} onChange={e => setEditingMember({ ...editingMember, twitter_url: e.target.value })} className="bg-white/5 border-white/20 text-white text-sm" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMember(null)} className="border-white/20 text-white">Cancel</Button>
                <Button onClick={updateMember} disabled={saving} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
