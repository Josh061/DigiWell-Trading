import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  FolderOpen, FileText, Upload, Search, Share2, Clock, Shield, 
  Download, Eye, Trash2, Plus, ChevronRight, Link2, Lock,
  Calendar, Tag, Filter, Grid, List, MoreVertical, Copy,
  History, GitCompare, CheckCircle, XCircle, AlertCircle,
  FileCheck, FilePlus, FolderPlus, ArrowLeft, ExternalLink,
  Users, Mail, RefreshCw, Bell, AlertTriangle, CalendarClock,
  RotateCcw, Timer, Send, FileWarning, BarChart3
} from 'lucide-react';
import ComplianceReporting from './ComplianceReporting';


interface Folder {
  id: string;
  name: string;
  description?: string;
  transaction_id?: string;
  parent_folder_id?: string;
  color: string;
  icon: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  description?: string;
  document_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  current_version: number;
  tags: string[];
  is_signed: boolean;
  expiration_date?: string;
  renewal_status?: string;
  renewal_notes?: string;
  last_reminder_sent?: string;
  days_until_expiry?: number;
  created_at: string;
  updated_at: string;
  vault_folders?: { name: string; color: string };
}

interface Version {
  id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  change_summary: string;
  created_by: string;
  created_at: string;
}

interface Share {
  id: string;
  shared_with_email: string;
  shared_with_name?: string;
  access_level: string;
  share_token: string;
  expires_at?: string;
  max_downloads?: number;
  download_count: number;
  is_active: boolean;
  created_at: string;
  vault_documents?: { name: string };
}

interface AccessLog {
  id: string;
  action: string;
  user_id?: string;
  ip_address: string;
  user_agent: string;
  metadata: any;
  created_at: string;
  vault_documents?: { name: string };
}

interface ExpirationReminder {
  id: string;
  document_id: string;
  reminder_type: string;
  sent_at: string;
  recipient_email: string;
  delivery_status: string;
  vault_documents?: { name: string };
}

const documentTypes = [
  { value: 'contract', label: 'Contract', icon: FileCheck, color: 'bg-blue-500' },
  { value: 'invoice', label: 'Invoice', icon: FileText, color: 'bg-green-500' },
  { value: 'bill_of_lading', label: 'Bill of Lading', icon: FileText, color: 'bg-purple-500' },
  { value: 'certificate', label: 'Certificate', icon: Shield, color: 'bg-amber-500' },
  { value: 'other', label: 'Other', icon: FileText, color: 'bg-gray-500' }
];

const folderColors = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'
];

export default function DocumentVault() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('documents');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Expiration tracking state
  const [expiringDocs, setExpiringDocs] = useState<{
    expired: Document[];
    expiring7Days: Document[];
    expiring14Days: Document[];
    expiring30Days: Document[];
    total: number;
  }>({ expired: [], expiring7Days: [], expiring14Days: [], expiring30Days: [], total: 0 });
  const [reminderHistory, setReminderHistory] = useState<ExpirationReminder[]>([]);
  const [processingReminders, setProcessingReminders] = useState(false);
  
  // Modals
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showRenewal, setShowRenewal] = useState(false);
  const [showReminderHistory, setShowReminderHistory] = useState(false);
  
  // Selected items
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  
  // Form states
  const [newFolder, setNewFolder] = useState({ name: '', description: '', color: '#3B82F6', transactionId: '' });
  const [uploadForm, setUploadForm] = useState({ 
    name: '', description: '', documentType: 'contract', tags: '', file: null as File | null,
    expirationDate: ''
  });
  const [shareForm, setShareForm] = useState({
    email: '', name: '', accessLevel: 'view', expiresAt: '', maxDownloads: '', password: '', usePassword: false
  });
  const [renewalForm, setRenewalForm] = useState({
    newExpirationDate: '', renewalNotes: '', uploadNewVersion: false, file: null as File | null
  });
  const [userEmail, setUserEmail] = useState('user@example.com');

  const userId = 'user-' + Math.random().toString(36).substr(2, 9);

  const loadFolders = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_folders', userId, parentFolderId: currentFolder?.id }
      });
      if (data?.folders) setFolders(data.folders);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, [currentFolder, userId]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { 
          action: 'get_documents', 
          userId, 
          folderId: currentFolder?.id,
          documentType: filterType,
          searchQuery 
        }
      });
      if (data?.documents) setDocuments(data.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, filterType, searchQuery, userId]);

  const loadExpiringDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_expiring_documents', userId, daysAhead: 30 }
      });
      if (data) {
        setExpiringDocs({
          expired: data.expired || [],
          expiring7Days: data.expiring7Days || [],
          expiring14Days: data.expiring14Days || [],
          expiring30Days: data.expiring30Days || [],
          total: data.total || 0
        });
      }
    } catch (error) {
      console.error('Error loading expiring documents:', error);
    }
  }, [userId]);

  const loadReminderHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_reminder_history', userId }
      });
      if (data?.reminders) setReminderHistory(data.reminders);
    } catch (error) {
      console.error('Error loading reminder history:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadFolders();
    loadDocuments();
    loadExpiringDocuments();
  }, [loadFolders, loadDocuments, loadExpiringDocuments]);

  const handleCreateFolder = async () => {
    if (!newFolder.name.trim()) {
      toast({ title: 'Error', description: 'Folder name is required', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'create_folder',
          userId,
          name: newFolder.name,
          description: newFolder.description,
          transactionId: newFolder.transactionId,
          parentFolderId: currentFolder?.id,
          color: newFolder.color
        }
      });

      if (data?.success) {
        toast({ title: 'Success', description: 'Folder created successfully' });
        setShowNewFolder(false);
        setNewFolder({ name: '', description: '', color: '#3B82F6', transactionId: '' });
        loadFolders();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.name.trim() || !uploadForm.file) {
      toast({ title: 'Error', description: 'Name and file are required', variant: 'destructive' });
      return;
    }

    try {
      const filePath = `vault/${userId}/${Date.now()}-${uploadForm.file.name}`;
      
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'upload_document',
          userId,
          folderId: currentFolder?.id,
          name: uploadForm.name,
          description: uploadForm.description,
          documentType: uploadForm.documentType,
          filePath,
          fileSize: uploadForm.file.size,
          mimeType: uploadForm.file.type,
          tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          expirationDate: uploadForm.expirationDate || null
        }
      });

      if (data?.success) {
        toast({ title: 'Success', description: 'Document uploaded successfully' });
        setShowUpload(false);
        setUploadForm({ name: '', description: '', documentType: 'contract', tags: '', file: null, expirationDate: '' });
        loadDocuments();
        loadExpiringDocuments();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload document', variant: 'destructive' });
    }
  };

  const handleShareDocument = async () => {
    if (!selectedDocument || !shareForm.email.trim()) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'share_document',
          documentId: selectedDocument.id,
          userId,
          sharedWithEmail: shareForm.email,
          sharedWithName: shareForm.name,
          accessLevel: shareForm.accessLevel,
          expiresAt: shareForm.expiresAt || null,
          maxDownloads: shareForm.maxDownloads ? parseInt(shareForm.maxDownloads) : null,
          password: shareForm.usePassword ? shareForm.password : null
        }
      });

      if (data?.success) {
        toast({ title: 'Document Shared', description: `Share link sent to ${shareForm.email}` });
        setShowShare(false);
        setShareForm({ email: '', name: '', accessLevel: 'view', expiresAt: '', maxDownloads: '', password: '', usePassword: false });
        loadShares(selectedDocument.id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to share document', variant: 'destructive' });
    }
  };

  const handleRenewDocument = async () => {
    if (!selectedDocument || !renewalForm.newExpirationDate) {
      toast({ title: 'Error', description: 'New expiration date is required', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'renew_document',
          documentId: selectedDocument.id,
          userId,
          newExpirationDate: renewalForm.newExpirationDate,
          renewalNotes: renewalForm.renewalNotes
        }
      });

      if (data?.success) {
        toast({ title: 'Document Renewed', description: 'Expiration date has been updated' });
        setShowRenewal(false);
        setRenewalForm({ newExpirationDate: '', renewalNotes: '', uploadNewVersion: false, file: null });
        loadDocuments();
        loadExpiringDocuments();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to renew document', variant: 'destructive' });
    }
  };

  const handleSendReminder = async (doc: Document) => {
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'send_expiration_reminder',
          documentId: doc.id,
          userId,
          email: userEmail
        }
      });

      if (data?.success) {
        toast({ title: 'Reminder Sent', description: `Expiration reminder sent to ${userEmail}` });
        loadReminderHistory();
      } else {
        toast({ title: 'Error', description: data?.error || 'Failed to send reminder', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send reminder', variant: 'destructive' });
    }
  };

  const handleProcessAllReminders = async () => {
    setProcessingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: {
          action: 'process_expiration_reminders',
          userId,
          email: userEmail
        }
      });

      if (data?.success) {
        const count = data.reminders?.length || 0;
        toast({ 
          title: 'Reminders Processed', 
          description: `${count} reminder${count !== 1 ? 's' : ''} sent` 
        });
        loadReminderHistory();
        loadExpiringDocuments();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process reminders', variant: 'destructive' });
    } finally {
      setProcessingReminders(false);
    }
  };

  const loadVersions = async (documentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_versions', documentId }
      });
      if (data?.versions) setVersions(data.versions);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const loadShares = async (documentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_shares', documentId }
      });
      if (data?.shares) setShares(data.shares);
    } catch (error) {
      console.error('Error loading shares:', error);
    }
  };

  const loadAccessLog = async (documentId?: string) => {
    try {
      const { data } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_access_log', documentId, userId }
      });
      if (data?.logs) setAccessLogs(data.logs);
    } catch (error) {
      console.error('Error loading access log:', error);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const { data } = await supabase.functions.invoke('document-vault', {
        body: { action: 'revoke_share', shareId, userId }
      });
      if (data?.success) {
        toast({ title: 'Success', description: 'Share link revoked' });
        if (selectedDocument) loadShares(selectedDocument.id);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke share', variant: 'destructive' });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('document-vault', {
        body: { action: 'delete_document', documentId, userId }
      });
      if (data?.success) {
        toast({ title: 'Success', description: 'Document deleted' });
        loadDocuments();
        loadExpiringDocuments();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    }
  };

  const navigateToFolder = (folder: Folder) => {
    setFolderPath([...folderPath, currentFolder!].filter(Boolean));
    setCurrentFolder(folder);
  };

  const navigateBack = () => {
    const newPath = [...folderPath];
    const parent = newPath.pop() || null;
    setFolderPath(newPath);
    setCurrentFolder(parent);
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolder(null);
  };

  const openDocumentDetails = (doc: Document) => {
    setSelectedDocument(doc);
    loadVersions(doc.id);
    loadShares(doc.id);
    setShowVersions(true);
  };

  const openRenewalModal = (doc: Document) => {
    setSelectedDocument(doc);
    setRenewalForm({ 
      newExpirationDate: '', 
      renewalNotes: '', 
      uploadNewVersion: false, 
      file: null 
    });
    setShowRenewal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocTypeInfo = (type: string) => {
    return documentTypes.find(t => t.value === type) || documentTypes[4];
  };

  const getExpirationBadge = (doc: Document) => {
    if (!doc.expiration_date) return null;
    
    const today = new Date();
    const expDate = new Date(doc.expiration_date);
    const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (daysUntil <= 7) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <Timer className="w-3 h-3 mr-1" />
          {daysUntil}d left
        </Badge>
      );
    } else if (daysUntil <= 14) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Timer className="w-3 h-3 mr-1" />
          {daysUntil}d left
        </Badge>
      );
    } else if (daysUntil <= 30) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Calendar className="w-3 h-3 mr-1" />
          {daysUntil}d left
        </Badge>
      );
    }
    return null;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload className="w-4 h-4 text-green-500" />;
      case 'view': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'download': return <Download className="w-4 h-4 text-purple-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-amber-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'version_create': return <FilePlus className="w-4 h-4 text-cyan-500" />;
      case 'renewal': return <RotateCcw className="w-4 h-4 text-green-500" />;
      case 'expiration_update': return <CalendarClock className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const ExpiringDocumentCard = ({ doc, urgency }: { doc: Document; urgency: 'expired' | 'critical' | 'warning' | 'info' }) => {
    const urgencyStyles = {
      expired: 'border-red-500/50 bg-red-500/5',
      critical: 'border-red-500/30 bg-red-500/5',
      warning: 'border-amber-500/30 bg-amber-500/5',
      info: 'border-blue-500/30 bg-blue-500/5'
    };
    
    const typeInfo = getDocTypeInfo(doc.document_type);
    const TypeIcon = typeInfo.icon;
    
    return (
      <div className={`p-4 rounded-lg border ${urgencyStyles[urgency]} transition-all hover:scale-[1.01]`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate">{doc.name}</h4>
              <p className="text-sm text-slate-400">{typeInfo.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-500">
                  Expires: {formatDate(doc.expiration_date!)}
                </span>
              </div>
              {doc.days_until_expiry !== undefined && (
                <p className={`text-xs mt-1 ${
                  doc.days_until_expiry <= 0 ? 'text-red-400' :
                  doc.days_until_expiry <= 7 ? 'text-red-400' :
                  doc.days_until_expiry <= 14 ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {doc.days_until_expiry <= 0 
                    ? `Expired ${Math.abs(doc.days_until_expiry)} days ago`
                    : `${doc.days_until_expiry} days remaining`
                  }
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() => openRenewalModal(doc)}
              className="bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Renew
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSendReminder(doc)}
              className="border-slate-600 text-slate-300"
            >
              <Bell className="w-3 h-3 mr-1" />
              Remind
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Document Vault</h1>
              <p className="text-blue-200">Secure storage for contracts, invoices, and certificates</p>
            </div>
          </div>
        </div>

        {/* Expiration Alert Banner */}
        {expiringDocs.total > 0 && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border-amber-500/30 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Document Expiration Alert</h3>
                    <p className="text-slate-400 text-sm">
                      {expiringDocs.expired.length > 0 && (
                        <span className="text-red-400">{expiringDocs.expired.length} expired</span>
                      )}
                      {expiringDocs.expired.length > 0 && expiringDocs.expiring7Days.length > 0 && ' • '}
                      {expiringDocs.expiring7Days.length > 0 && (
                        <span className="text-red-400">{expiringDocs.expiring7Days.length} expiring within 7 days</span>
                      )}
                      {(expiringDocs.expired.length > 0 || expiringDocs.expiring7Days.length > 0) && 
                       (expiringDocs.expiring14Days.length > 0 || expiringDocs.expiring30Days.length > 0) && ' • '}
                      {expiringDocs.expiring14Days.length + expiringDocs.expiring30Days.length > 0 && (
                        <span className="text-amber-400">
                          {expiringDocs.expiring14Days.length + expiringDocs.expiring30Days.length} expiring within 30 days
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveTab('expiring')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="documents" className="data-[state=active]:bg-blue-600">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="expiring" className="data-[state=active]:bg-blue-600 relative">
                <CalendarClock className="w-4 h-4 mr-2" />
                Expiring
                {expiringDocs.total > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {expiringDocs.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="compliance" className="data-[state=active]:bg-blue-600">
                <BarChart3 className="w-4 h-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger value="shared" className="data-[state=active]:bg-blue-600">
                <Share2 className="w-4 h-4 mr-2" />
                Shared
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-blue-600">
                <Clock className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>


            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-slate-600 text-slate-300"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => setShowNewFolder(true)}
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              <Button
                onClick={() => setShowUpload(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {/* Search and Filters */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full md:w-48 bg-slate-900/50 border-slate-600 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Document Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All Types</SelectItem>
                      {documentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={navigateToRoot}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <FolderOpen className="w-4 h-4" />
                Root
              </button>
              {folderPath.map((folder, idx) => (
                <React.Fragment key={folder.id}>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <button
                    onClick={() => {
                      setFolderPath(folderPath.slice(0, idx));
                      setCurrentFolder(folder);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
              {currentFolder && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                  <span className="text-white font-medium">{currentFolder.name}</span>
                </>
              )}
            </div>

            {/* Back Button */}
            {currentFolder && (
              <Button
                variant="ghost"
                onClick={navigateBack}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {/* Folders Grid */}
            {folders.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-700/50 transition-all text-left group"
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: folder.color + '20' }}
                    >
                      <FolderOpen className="w-6 h-6" style={{ color: folder.color }} />
                    </div>
                    <p className="text-white font-medium truncate">{folder.name}</p>
                    {folder.transaction_id && (
                      <p className="text-xs text-slate-400 truncate">TX: {folder.transaction_id}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Documents Grid/List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Documents</h3>
                  <p className="text-slate-400 mb-4">Upload your first document to get started</p>
                  <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map(doc => {
                  const typeInfo = getDocTypeInfo(doc.document_type);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <Card 
                      key={doc.id} 
                      className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer group"
                      onClick={() => openDocumentDetails(doc)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            <TypeIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {doc.is_signed && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Signed
                              </Badge>
                            )}
                            {getExpirationBadge(doc)}
                          </div>
                        </div>
                        <h3 className="text-white font-medium truncate mb-1">{doc.name}</h3>
                        <p className="text-sm text-slate-400 truncate mb-2">{doc.description || 'No description'}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>v{doc.current_version}</span>
                        </div>
                        {doc.expiration_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            <span>Expires: {formatDate(doc.expiration_date)}</span>
                          </div>
                        )}
                        {doc.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="flex-1 text-slate-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 text-slate-400 hover:text-white">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="flex-1 text-slate-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                              setShowShare(true);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden md:table-cell">Type</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Expires</th>
                        <th className="text-left p-4 text-slate-400 font-medium hidden lg:table-cell">Size</th>
                        <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => {
                        const typeInfo = getDocTypeInfo(doc.document_type);
                        const TypeIcon = typeInfo.icon;
                        return (
                          <tr 
                            key={doc.id} 
                            className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                            onClick={() => openDocumentDetails(doc)}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                                  <TypeIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">{doc.name}</p>
                                  <div className="flex items-center gap-2">
                                    {doc.is_signed && (
                                      <Badge className="bg-green-500/20 text-green-400 text-xs">Signed</Badge>
                                    )}
                                    {getExpirationBadge(doc)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400 hidden md:table-cell">{typeInfo.label}</td>
                            <td className="p-4 text-slate-400 hidden lg:table-cell">
                              {doc.expiration_date ? formatDate(doc.expiration_date) : '-'}
                            </td>
                            <td className="p-4 text-slate-400 hidden lg:table-cell">{formatFileSize(doc.file_size)}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-slate-400 hover:text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDocument(doc);
                                    setShowShare(true);
                                  }}
                                >
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Expiring Documents Tab */}
          <TabsContent value="expiring" className="space-y-6">
            {/* Email Settings & Actions */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                      <Label className="text-slate-400 text-sm">Reminder Email</Label>
                      <Input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white mt-1"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadReminderHistory();
                        setShowReminderHistory(true);
                      }}
                      className="border-slate-600 text-slate-300"
                    >
                      <History className="w-4 h-4 mr-2" />
                      History
                    </Button>
                    <Button
                      onClick={handleProcessAllReminders}
                      disabled={processingReminders}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {processingReminders ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send All Reminders
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expiration Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-400">{expiringDocs.expired.length}</p>
                  <p className="text-sm text-slate-400">Expired</p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4 text-center">
                  <Timer className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-400">{expiringDocs.expiring7Days.length}</p>
                  <p className="text-sm text-slate-400">Within 7 Days</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <CalendarClock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-amber-400">{expiringDocs.expiring14Days.length}</p>
                  <p className="text-sm text-slate-400">Within 14 Days</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-400">{expiringDocs.expiring30Days.length}</p>
                  <p className="text-sm text-slate-400">Within 30 Days</p>
                </CardContent>
              </Card>
            </div>

            {/* Expired Documents */}
            {expiringDocs.expired.length > 0 && (
              <Card className="bg-slate-800/50 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Expired Documents
                    <Badge className="bg-red-500/20 text-red-400 ml-2">{expiringDocs.expired.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expiringDocs.expired.map(doc => (
                    <ExpiringDocumentCard key={doc.id} doc={doc} urgency="expired" />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Expiring Within 7 Days */}
            {expiringDocs.expiring7Days.length > 0 && (
              <Card className="bg-slate-800/50 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Timer className="w-5 h-5 text-red-400" />
                    Expiring Within 7 Days
                    <Badge className="bg-red-500/20 text-red-400 ml-2">{expiringDocs.expiring7Days.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expiringDocs.expiring7Days.map(doc => (
                    <ExpiringDocumentCard key={doc.id} doc={doc} urgency="critical" />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Expiring Within 14 Days */}
            {expiringDocs.expiring14Days.length > 0 && (
              <Card className="bg-slate-800/50 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-amber-400" />
                    Expiring Within 14 Days
                    <Badge className="bg-amber-500/20 text-amber-400 ml-2">{expiringDocs.expiring14Days.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expiringDocs.expiring14Days.map(doc => (
                    <ExpiringDocumentCard key={doc.id} doc={doc} urgency="warning" />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Expiring Within 30 Days */}
            {expiringDocs.expiring30Days.length > 0 && (
              <Card className="bg-slate-800/50 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    Expiring Within 30 Days
                    <Badge className="bg-blue-500/20 text-blue-400 ml-2">{expiringDocs.expiring30Days.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expiringDocs.expiring30Days.map(doc => (
                    <ExpiringDocumentCard key={doc.id} doc={doc} urgency="info" />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No Expiring Documents */}
            {expiringDocs.total === 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">All Documents Up to Date</h3>
                  <p className="text-slate-400">No documents expiring within the next 30 days</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <ComplianceReporting />
          </TabsContent>

          {/* Shared Tab */}

          <TabsContent value="shared" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-400" />
                  Shared Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shares.length === 0 ? (
                  <div className="text-center py-8">
                    <Share2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No shared documents yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shares.map(share => (
                      <div key={share.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Link2 className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{share.vault_documents?.name}</p>
                            <p className="text-sm text-slate-400">
                              Shared with {share.shared_with_email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={share.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {share.is_active ? 'Active' : 'Revoked'}
                          </Badge>
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {share.access_level}
                          </Badge>
                          {share.is_active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevokeShare(share.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Activity Log
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAccessLog()}
                  className="border-slate-600 text-slate-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {accessLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No activity recorded yet</p>
                    <Button
                      variant="outline"
                      className="mt-4 border-slate-600 text-slate-300"
                      onClick={() => loadAccessLog()}
                    >
                      Load Activity
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg">
                        <div className="p-2 bg-slate-800 rounded-lg">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white">
                            <span className="capitalize">{log.action.replace('_', ' ')}</span>
                            {log.vault_documents && (
                              <span className="text-slate-400"> - {log.vault_documents.name}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(log.created_at)} • IP: {log.ip_address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Folder Modal */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-400" />
              Create New Folder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Name *</Label>
              <Input
                value={newFolder.name}
                onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                placeholder="e.g., Transaction #12345"
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newFolder.description}
                onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                placeholder="Optional description..."
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>Transaction ID (Optional)</Label>
              <Input
                value={newFolder.transactionId}
                onChange={(e) => setNewFolder({ ...newFolder, transactionId: e.target.value })}
                placeholder="Link to a transaction"
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {folderColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewFolder({ ...newFolder, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${newFolder.color === color ? 'scale-125 ring-2 ring-white' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} className="bg-blue-600 hover:bg-blue-700">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-400" />
              Upload Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name *</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="Enter document name"
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select 
                value={uploadForm.documentType} 
                onValueChange={(v) => setUploadForm({ ...uploadForm, documentType: v })}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={uploadForm.expirationDate}
                onChange={(e) => setUploadForm({ ...uploadForm, expirationDate: e.target.value })}
                className="bg-slate-900/50 border-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Set an expiration date to receive automated reminders
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Optional description..."
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="e.g., gold, 2024, urgent"
                className="bg-slate-900/50 border-slate-600"
              />
            </div>
            <div>
              <Label>File *</Label>
              <div className="mt-2 border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploadForm.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileCheck className="w-8 h-8 text-green-400" />
                      <div className="text-left">
                        <p className="text-white">{uploadForm.file.name}</p>
                        <p className="text-sm text-slate-400">{formatFileSize(uploadForm.file.size)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400">Click to select a file</p>
                      <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} className="bg-green-600 hover:bg-green-700">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Document Modal */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              Share Document
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-white font-medium">{selectedDocument.name}</p>
                <p className="text-sm text-slate-400">{getDocTypeInfo(selectedDocument.document_type).label}</p>
              </div>
              <div>
                <Label>Recipient Email *</Label>
                <Input
                  type="email"
                  value={shareForm.email}
                  onChange={(e) => setShareForm({ ...shareForm, email: e.target.value })}
                  placeholder="recipient@example.com"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div>
                <Label>Recipient Name</Label>
                <Input
                  value={shareForm.name}
                  onChange={(e) => setShareForm({ ...shareForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div>
                <Label>Access Level</Label>
                <Select 
                  value={shareForm.accessLevel} 
                  onValueChange={(v) => setShareForm({ ...shareForm, accessLevel: v })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                    <SelectItem value="edit">Full Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Expires On</Label>
                  <Input
                    type="date"
                    value={shareForm.expiresAt}
                    onChange={(e) => setShareForm({ ...shareForm, expiresAt: e.target.value })}
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
                <div>
                  <Label>Max Downloads</Label>
                  <Input
                    type="number"
                    value={shareForm.maxDownloads}
                    onChange={(e) => setShareForm({ ...shareForm, maxDownloads: e.target.value })}
                    placeholder="Unlimited"
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <Label className="mb-0">Password Protection</Label>
                </div>
                <Switch
                  checked={shareForm.usePassword}
                  onCheckedChange={(v) => setShareForm({ ...shareForm, usePassword: v })}
                />
              </div>
              {shareForm.usePassword && (
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={shareForm.password}
                    onChange={(e) => setShareForm({ ...shareForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="bg-slate-900/50 border-slate-600"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShare(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleShareDocument} className="bg-amber-600 hover:bg-amber-700">
              <Mail className="w-4 h-4 mr-2" />
              Send Share Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Details & Versions Modal */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Document Details
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedDocument.name}</h3>
                    <p className="text-slate-400 mt-1">{selectedDocument.description || 'No description'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {selectedDocument.is_signed && (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    )}
                    {getExpirationBadge(selectedDocument)}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-500">Type</p>
                    <p className="text-white">{getDocTypeInfo(selectedDocument.document_type).label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Size</p>
                    <p className="text-white">{formatFileSize(selectedDocument.file_size)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Version</p>
                    <p className="text-white">v{selectedDocument.current_version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Expires</p>
                    <p className="text-white">
                      {selectedDocument.expiration_date ? formatDate(selectedDocument.expiration_date) : 'Never'}
                    </p>
                  </div>
                </div>
                {selectedDocument.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedDocument.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="border-slate-600 text-slate-400">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  className="border-slate-600"
                  onClick={() => {
                    setShowVersions(false);
                    setShowShare(true);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {selectedDocument.expiration_date && (
                  <Button 
                    variant="outline" 
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                    onClick={() => {
                      setShowVersions(false);
                      openRenewalModal(selectedDocument);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Renew
                  </Button>
                )}
                <Button variant="outline" className="border-slate-600">
                  <FilePlus className="w-4 h-4 mr-2" />
                  New Version
                </Button>
                <Button 
                  variant="outline" 
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    handleDeleteDocument(selectedDocument.id);
                    setShowVersions(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              {/* Version History */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Version History
                </h4>
                <div className="space-y-2">
                  {versions.map((version, idx) => (
                    <div 
                      key={version.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-slate-900/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-blue-500' : 'bg-slate-700'}`}>
                          <span className="text-sm font-bold text-white">v{version.version_number}</span>
                        </div>
                        <div>
                          <p className="text-white">{version.change_summary || 'No summary'}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(version.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx === 0 && (
                          <Badge className="bg-blue-500/20 text-blue-400">Current</Badge>
                        )}
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Shares */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Active Shares
                </h4>
                {shares.filter(s => s.is_active).length === 0 ? (
                  <p className="text-slate-400 text-sm">No active shares</p>
                ) : (
                  <div className="space-y-2">
                    {shares.filter(s => s.is_active).map(share => (
                      <div key={share.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white">{share.shared_with_email}</p>
                            <p className="text-xs text-slate-500">
                              {share.access_level} access • {share.download_count} downloads
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://digiwell.com/shared/${share.share_token}`);
                              toast({ title: 'Link copied!' });
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeShare(share.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renewal Modal */}
      <Dialog open={showRenewal} onOpenChange={setShowRenewal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-green-400" />
              Renew Document
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-white font-medium">{selectedDocument.name}</p>
                <p className="text-sm text-slate-400">
                  Current expiration: {selectedDocument.expiration_date ? formatDate(selectedDocument.expiration_date) : 'Not set'}
                </p>
              </div>
              
              <div>
                <Label>New Expiration Date *</Label>
                <Input
                  type="date"
                  value={renewalForm.newExpirationDate}
                  onChange={(e) => setRenewalForm({ ...renewalForm, newExpirationDate: e.target.value })}
                  className="bg-slate-900/50 border-slate-600"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label>Renewal Notes</Label>
                <Textarea
                  value={renewalForm.renewalNotes}
                  onChange={(e) => setRenewalForm({ ...renewalForm, renewalNotes: e.target.value })}
                  placeholder="Add notes about this renewal..."
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-slate-400" />
                  <Label className="mb-0">Upload New Version</Label>
                </div>
                <Switch
                  checked={renewalForm.uploadNewVersion}
                  onCheckedChange={(v) => setRenewalForm({ ...renewalForm, uploadNewVersion: v })}
                />
              </div>

              {renewalForm.uploadNewVersion && (
                <div>
                  <Label>New Document File</Label>
                  <div className="mt-2 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      onChange={(e) => setRenewalForm({ ...renewalForm, file: e.target.files?.[0] || null })}
                      className="hidden"
                      id="renewal-file-upload"
                    />
                    <label htmlFor="renewal-file-upload" className="cursor-pointer">
                      {renewalForm.file ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileCheck className="w-6 h-6 text-green-400" />
                          <span className="text-white">{renewalForm.file.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">Click to select file</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewal(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleRenewDocument} className="bg-green-600 hover:bg-green-700">
              <RotateCcw className="w-4 h-4 mr-2" />
              Renew Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder History Modal */}
      <Dialog open={showReminderHistory} onOpenChange={setShowReminderHistory}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Reminder History
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {reminderHistory.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No reminders sent yet</p>
              </div>
            ) : (
              reminderHistory.map(reminder => (
                <div key={reminder.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    reminder.reminder_type === 'expired' ? 'bg-red-500/20' :
                    reminder.reminder_type === '7_day' ? 'bg-red-500/20' :
                    reminder.reminder_type === '14_day' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                  }`}>
                    <Bell className={`w-4 h-4 ${
                      reminder.reminder_type === 'expired' ? 'text-red-400' :
                      reminder.reminder_type === '7_day' ? 'text-red-400' :
                      reminder.reminder_type === '14_day' ? 'text-amber-400' : 'text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      {reminder.vault_documents?.name || 'Document'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {reminder.reminder_type.replace('_', ' ')} reminder • Sent to {reminder.recipient_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={reminder.delivery_status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {reminder.delivery_status}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(reminder.sent_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
