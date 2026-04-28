import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  MessageSquare, 
  Upload, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  FileText,
  Image,
  Video,
  Send,
  Paperclip,
  User,
  Shield,
  Scale,
  AlertCircle,
  ChevronRight,
  Eye,
  Download,
  RefreshCw,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowRight,
  Gavel,
  UserCheck,
  Flag,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  order_number: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  seller_id: string;
  seller_name: string;
  seller_email: string;
  category: string;
  subcategory: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  resolution_type: string;
  resolution_amount: number;
  resolution_notes: string;
  resolved_by_name: string;
  resolved_at: string;
  assigned_to_name: string;
  assigned_at: string;
  order_total: number;
  order_date: string;
  delivery_date: string;
  product_details: any;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  response_deadline: string;
  messages?: DisputeMessage[];
  evidence?: DisputeEvidence[];
  status_history?: StatusHistory[];
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  message_type: string;
  attachments: any[];
  is_internal: boolean;
  created_at: string;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  uploaded_by_name: string;
  uploaded_by_role: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  evidence_type: string;
  description: string;
  is_verified: boolean;
  created_at: string;
}

interface StatusHistory {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by_name: string;
  changed_by_role: string;
  reason: string;
  created_at: string;
}

interface DisputeStats {
  total: number;
  open: number;
  under_review: number;
  awaiting_response: number;
  mediation: number;
  resolved: number;
  escalated: number;
  closed: number;
  rejected: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  total_refunded: number;
  avg_resolution_time_days: number;
}

const DISPUTE_CATEGORIES = [
  { value: 'quality_issues', label: 'Quality Issues', icon: AlertTriangle },
  { value: 'quantity_mismatch', label: 'Quantity Mismatch', icon: Package },
  { value: 'delivery_damage', label: 'Delivery Damage', icon: AlertCircle },
  { value: 'wrong_item', label: 'Wrong Item Received', icon: XCircle },
  { value: 'not_as_described', label: 'Not As Described', icon: FileText },
  { value: 'late_delivery', label: 'Late Delivery', icon: Clock },
  { value: 'missing_items', label: 'Missing Items', icon: Package },
  { value: 'other', label: 'Other', icon: Flag }
];

const RESOLUTION_TYPES = [
  { value: 'refund_full', label: 'Full Refund' },
  { value: 'refund_partial', label: 'Partial Refund' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'repair', label: 'Repair' },
  { value: 'credit', label: 'Store Credit' },
  { value: 'no_action', label: 'No Action Required' },
  { value: 'other', label: 'Other' }
];

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any }> = {
  open: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: AlertCircle },
  under_review: { color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Eye },
  awaiting_response: { color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Clock },
  mediation: { color: 'text-pink-700', bgColor: 'bg-pink-100', icon: Scale },
  resolved: { color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  escalated: { color: 'text-red-700', bgColor: 'bg-red-100', icon: TrendingUp },
  closed: { color: 'text-gray-700', bgColor: 'bg-gray-100', icon: XCircle },
  rejected: { color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle }
};

const PRIORITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  low: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { color: 'text-red-600', bgColor: 'bg-red-100' }
};

export default function DisputeResolution() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDisputeDetail, setShowDisputeDetail] = useState(false);
  const [showCreateDispute, setShowCreateDispute] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [showProposeResolution, setShowProposeResolution] = useState(false);
  const [showUploadEvidence, setShowUploadEvidence] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New dispute form
  const [newDispute, setNewDispute] = useState({
    order_id: '',
    order_number: '',
    category: '',
    subject: '',
    description: '',
    priority: 'normal'
  });

  // Status update form
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    reason: '',
    assigned_to_name: ''
  });

  // Resolution form
  const [resolution, setResolution] = useState({
    resolution_type: '',
    resolution_amount: '',
    resolution_notes: ''
  });

  // Evidence upload
  const [evidenceUpload, setEvidenceUpload] = useState({
    file: null as File | null,
    evidence_type: 'photo',
    description: ''
  });

  useEffect(() => {
    loadDisputes();
    loadStats();
  }, []);

  useEffect(() => {
    if (selectedDispute && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedDispute?.messages]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispute-resolution', {
        body: { action: 'get_disputes' }
      });
      
      if (data?.success) {
        setDisputes(data.data || []);
      } else {
        loadMockData();
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: { action: 'get_stats' }
      });
      
      if (data?.success) {
        setStats(data.data);
      } else {
        setStats({
          total: 47,
          open: 8,
          under_review: 12,
          awaiting_response: 5,
          mediation: 3,
          resolved: 15,
          escalated: 2,
          closed: 2,
          rejected: 0,
          by_category: { quality_issues: 15, quantity_mismatch: 8, delivery_damage: 12, wrong_item: 5, other: 7 },
          by_priority: { low: 10, normal: 25, high: 8, urgent: 4 },
          total_refunded: 125750,
          avg_resolution_time_days: 4.2
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMockData = () => {
    const mockDisputes: Dispute[] = [
      {
        id: '1',
        dispute_number: 'DSP-M7X9K2-A3B4',
        order_id: 'ord-001',
        order_number: 'ORD-2026-001234',
        buyer_id: 'buyer-001',
        buyer_name: 'Acme Gold Traders',
        buyer_email: 'orders@acmegold.com',
        seller_id: 'seller-001',
        seller_name: 'Premium Metals Inc.',
        seller_email: 'sales@premiummetals.com',
        category: 'quality_issues',
        subcategory: 'Purity below specification',
        subject: 'Gold bars purity below 99.9% specification',
        description: 'The delivered gold bars tested at 99.7% purity instead of the specified 99.9%. Independent assay report attached as evidence.',
        status: 'under_review',
        priority: 'high',
        resolution_type: '',
        resolution_amount: 0,
        resolution_notes: '',
        resolved_by_name: '',
        resolved_at: '',
        assigned_to_name: 'Sarah Johnson',
        assigned_at: '2026-01-10T14:30:00Z',
        order_total: 485000,
        order_date: '2026-01-05T10:00:00Z',
        delivery_date: '2026-01-08T15:30:00Z',
        product_details: { items: [{ name: 'Gold Bar 1kg 99.9%', quantity: 5, price: 97000 }] },
        created_at: '2026-01-09T09:15:00Z',
        updated_at: '2026-01-12T16:45:00Z',
        last_activity_at: '2026-01-12T16:45:00Z',
        response_deadline: '2026-01-16T09:15:00Z',
        messages: [
          { id: 'm1', dispute_id: '1', sender_id: 'system', sender_name: 'System', sender_role: 'system', message: 'Dispute #DSP-M7X9K2-A3B4 has been created. Our team will review your case within 24-48 hours.', message_type: 'system_notification', attachments: [], is_internal: false, created_at: '2026-01-09T09:15:00Z' },
          { id: 'm2', dispute_id: '1', sender_id: 'buyer-001', sender_name: 'Acme Gold Traders', sender_role: 'buyer', message: 'We have conducted an independent assay test and the results show 99.7% purity. This is unacceptable for our manufacturing process.', message_type: 'message', attachments: [], is_internal: false, created_at: '2026-01-09T09:20:00Z' },
          { id: 'm3', dispute_id: '1', sender_id: 'admin-001', sender_name: 'Sarah Johnson', sender_role: 'admin', message: 'Thank you for reporting this issue. I have been assigned to your case and will review the evidence provided. We may request additional documentation from the seller.', message_type: 'message', attachments: [], is_internal: false, created_at: '2026-01-10T14:35:00Z' },
          { id: 'm4', dispute_id: '1', sender_id: 'seller-001', sender_name: 'Premium Metals Inc.', sender_role: 'seller', message: 'We have reviewed our quality control records and all bars passed our internal testing at 99.9%. We request a joint re-testing at an accredited facility.', message_type: 'message', attachments: [], is_internal: false, created_at: '2026-01-11T10:00:00Z' }
        ],
        evidence: [
          { id: 'e1', dispute_id: '1', uploaded_by_name: 'Acme Gold Traders', uploaded_by_role: 'buyer', file_name: 'independent_assay_report.pdf', file_type: 'application/pdf', file_size: 245000, file_url: '', evidence_type: 'document', description: 'Independent assay report from ABC Testing Labs', is_verified: true, created_at: '2026-01-09T09:18:00Z' },
          { id: 'e2', dispute_id: '1', uploaded_by_name: 'Acme Gold Traders', uploaded_by_role: 'buyer', file_name: 'gold_bars_photo.jpg', file_type: 'image/jpeg', file_size: 1250000, file_url: '', evidence_type: 'photo', description: 'Photos of received gold bars with serial numbers', is_verified: false, created_at: '2026-01-09T09:19:00Z' }
        ],
        status_history: [
          { id: 'h1', previous_status: '', new_status: 'open', changed_by_name: 'Acme Gold Traders', changed_by_role: 'buyer', reason: 'Dispute created', created_at: '2026-01-09T09:15:00Z' },
          { id: 'h2', previous_status: 'open', new_status: 'under_review', changed_by_name: 'Sarah Johnson', changed_by_role: 'admin', reason: 'Case assigned for review', created_at: '2026-01-10T14:30:00Z' }
        ]
      },
      {
        id: '2',
        dispute_number: 'DSP-N8Y0L3-C5D6',
        order_id: 'ord-002',
        order_number: 'ORD-2026-001198',
        buyer_id: 'buyer-002',
        buyer_name: 'Swiss Vault Holdings',
        buyer_email: 'procurement@swissvault.ch',
        seller_id: 'seller-002',
        seller_name: 'Global Commodities Ltd',
        seller_email: 'support@globalcommodities.com',
        category: 'quantity_mismatch',
        subcategory: 'Short delivery',
        subject: 'Received 48 silver bars instead of 50',
        description: 'Order was for 50 silver bars but only 48 were delivered. Packing slip shows 50 but physical count confirms 48.',
        status: 'awaiting_response',
        priority: 'normal',
        resolution_type: 'refund_partial',
        resolution_amount: 2400,
        resolution_notes: 'Proposed refund for 2 missing bars',
        resolved_by_name: '',
        resolved_at: '',
        assigned_to_name: 'Michael Chen',
        assigned_at: '2026-01-11T09:00:00Z',
        order_total: 60000,
        order_date: '2026-01-03T14:00:00Z',
        delivery_date: '2026-01-07T11:00:00Z',
        product_details: { items: [{ name: 'Silver Bar 1kg', quantity: 50, price: 1200 }] },
        created_at: '2026-01-08T16:30:00Z',
        updated_at: '2026-01-12T10:00:00Z',
        last_activity_at: '2026-01-12T10:00:00Z',
        response_deadline: '2026-01-15T16:30:00Z',
        messages: [],
        evidence: [],
        status_history: []
      },
      {
        id: '3',
        dispute_number: 'DSP-P9Z1M4-E7F8',
        order_id: 'ord-003',
        order_number: 'ORD-2026-001156',
        buyer_id: 'buyer-003',
        buyer_name: 'Eastern Precious Metals',
        buyer_email: 'imports@easternpm.com',
        seller_id: 'seller-003',
        seller_name: 'African Gold Exports',
        seller_email: 'exports@africangold.co.za',
        category: 'delivery_damage',
        subcategory: 'Packaging damage',
        subject: 'Gold coins damaged during shipping',
        description: 'Several gold coins arrived with scratches and dents. Packaging was inadequate for the value of goods.',
        status: 'mediation',
        priority: 'high',
        resolution_type: '',
        resolution_amount: 0,
        resolution_notes: '',
        resolved_by_name: '',
        resolved_at: '',
        assigned_to_name: 'Emma Williams',
        assigned_at: '2026-01-09T11:00:00Z',
        order_total: 125000,
        order_date: '2025-12-28T09:00:00Z',
        delivery_date: '2026-01-04T14:00:00Z',
        product_details: { items: [{ name: 'Gold Krugerrand 1oz', quantity: 50, price: 2500 }] },
        created_at: '2026-01-05T10:00:00Z',
        updated_at: '2026-01-12T14:00:00Z',
        last_activity_at: '2026-01-12T14:00:00Z',
        response_deadline: '2026-01-12T10:00:00Z',
        messages: [],
        evidence: [],
        status_history: []
      },
      {
        id: '4',
        dispute_number: 'DSP-Q0A2N5-G9H0',
        order_id: 'ord-004',
        order_number: 'ORD-2026-001089',
        buyer_id: 'buyer-004',
        buyer_name: 'Nordic Investment Group',
        buyer_email: 'trading@nordicinvest.no',
        seller_id: 'seller-004',
        seller_name: 'Dubai Gold Souk',
        seller_email: 'wholesale@dubaigold.ae',
        category: 'wrong_item',
        subcategory: 'Different product',
        subject: 'Received 22K gold instead of 24K',
        description: 'Order specified 24K gold jewelry but received 22K items. Hallmarks confirm the discrepancy.',
        status: 'resolved',
        priority: 'urgent',
        resolution_type: 'replacement',
        resolution_amount: 0,
        resolution_notes: 'Seller agreed to replace all items with correct 24K gold products at no additional cost.',
        resolved_by_name: 'Sarah Johnson',
        resolved_at: '2026-01-11T16:00:00Z',
        assigned_to_name: 'Sarah Johnson',
        assigned_at: '2026-01-07T10:00:00Z',
        order_total: 89000,
        order_date: '2025-12-20T11:00:00Z',
        delivery_date: '2025-12-30T09:00:00Z',
        product_details: { items: [{ name: '24K Gold Chain', quantity: 20, price: 4450 }] },
        created_at: '2026-01-02T08:00:00Z',
        updated_at: '2026-01-11T16:00:00Z',
        last_activity_at: '2026-01-11T16:00:00Z',
        response_deadline: '2026-01-09T08:00:00Z',
        messages: [],
        evidence: [],
        status_history: []
      },
      {
        id: '5',
        dispute_number: 'DSP-R1B3O6-I1J2',
        order_id: 'ord-005',
        order_number: 'ORD-2026-001267',
        buyer_id: 'buyer-005',
        buyer_name: 'Pacific Bullion Exchange',
        buyer_email: 'ops@pacificbullion.com.au',
        seller_id: 'seller-005',
        seller_name: 'Canadian Mint Direct',
        seller_email: 'sales@canadianmintdirect.ca',
        category: 'late_delivery',
        subcategory: 'Missed deadline',
        subject: 'Platinum delivery 2 weeks late',
        description: 'Platinum bars were delivered 2 weeks after the agreed delivery date, causing us to miss our client commitment.',
        status: 'open',
        priority: 'normal',
        resolution_type: '',
        resolution_amount: 0,
        resolution_notes: '',
        resolved_by_name: '',
        resolved_at: '',
        assigned_to_name: '',
        assigned_at: '',
        order_total: 156000,
        order_date: '2025-12-15T10:00:00Z',
        delivery_date: '2026-01-10T12:00:00Z',
        product_details: { items: [{ name: 'Platinum Bar 500g', quantity: 4, price: 39000 }] },
        created_at: '2026-01-11T14:00:00Z',
        updated_at: '2026-01-11T14:00:00Z',
        last_activity_at: '2026-01-11T14:00:00Z',
        response_deadline: '2026-01-18T14:00:00Z',
        messages: [],
        evidence: [],
        status_history: []
      }
    ];
    setDisputes(mockDisputes);
  };

  const loadDisputeDetail = async (disputeId: string) => {
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: { action: 'get_dispute', dispute_id: disputeId }
      });
      
      if (data?.success) {
        setSelectedDispute(data.data);
      } else {
        const dispute = disputes.find(d => d.id === disputeId);
        setSelectedDispute(dispute || null);
      }
    } catch (error) {
      const dispute = disputes.find(d => d.id === disputeId);
      setSelectedDispute(dispute || null);
    }
    setShowDisputeDetail(true);
  };

  const handleCreateDispute = async () => {
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: {
          action: 'create_dispute',
          ...newDispute,
          buyer_id: 'current-user-id',
          buyer_name: 'Current User',
          buyer_email: 'user@example.com'
        }
      });
      
      if (data?.success) {
        setDisputes([data.data, ...disputes]);
        setShowCreateDispute(false);
        setNewDispute({ order_id: '', order_number: '', category: '', subject: '', description: '', priority: 'normal' });
        loadStats();
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedDispute) return;
    
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: {
          action: 'update_status',
          dispute_id: selectedDispute.id,
          status: statusUpdate.status,
          reason: statusUpdate.reason,
          assigned_to_name: statusUpdate.assigned_to_name,
          changed_by: 'admin-001',
          changed_by_name: 'Admin User',
          changed_by_role: 'admin'
        }
      });
      
      if (data?.success) {
        setDisputes(disputes.map(d => d.id === selectedDispute.id ? { ...d, status: statusUpdate.status } : d));
        setShowUpdateStatus(false);
        setStatusUpdate({ status: '', reason: '', assigned_to_name: '' });
        loadStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleProposeResolution = async () => {
    if (!selectedDispute) return;
    
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: {
          action: 'propose_resolution',
          dispute_id: selectedDispute.id,
          resolution_type: resolution.resolution_type,
          resolution_amount: parseFloat(resolution.resolution_amount) || 0,
          resolution_notes: resolution.resolution_notes,
          proposed_by: 'admin-001',
          proposed_by_name: 'Admin User',
          proposed_by_role: 'admin'
        }
      });
      
      if (data?.success) {
        setShowProposeResolution(false);
        setResolution({ resolution_type: '', resolution_amount: '', resolution_notes: '' });
        loadDisputeDetail(selectedDispute.id);
      }
    } catch (error) {
      console.error('Error proposing resolution:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedDispute || !newMessage.trim()) return;
    
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: {
          action: 'add_message',
          dispute_id: selectedDispute.id,
          sender_id: 'admin-001',
          sender_name: isAdmin ? 'Admin User' : 'Current User',
          sender_role: isAdmin ? 'admin' : 'buyer',
          message: newMessage
        }
      });
      
      if (data?.success) {
        setSelectedDispute({
          ...selectedDispute,
          messages: [...(selectedDispute.messages || []), data.data]
        });
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleUploadEvidence = async () => {
    if (!selectedDispute || !evidenceUpload.file) return;
    
    // In a real implementation, upload file to storage first
    try {
      const { data } = await supabase.functions.invoke('dispute-resolution', {
        body: {
          action: 'add_evidence',
          dispute_id: selectedDispute.id,
          uploaded_by: 'current-user',
          uploaded_by_name: 'Current User',
          uploaded_by_role: isAdmin ? 'admin' : 'buyer',
          file_name: evidenceUpload.file.name,
          file_type: evidenceUpload.file.type,
          file_size: evidenceUpload.file.size,
          evidence_type: evidenceUpload.evidence_type,
          description: evidenceUpload.description
        }
      });
      
      if (data?.success) {
        setShowUploadEvidence(false);
        setEvidenceUpload({ file: null, evidence_type: 'photo', description: '' });
        loadDisputeDetail(selectedDispute.id);
      }
    } catch (error) {
      console.error('Error uploading evidence:', error);
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = 
      dispute.dispute_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'open' && dispute.status === 'open') ||
      (activeTab === 'active' && ['under_review', 'awaiting_response', 'mediation'].includes(dispute.status)) ||
      (activeTab === 'resolved' && ['resolved', 'closed'].includes(dispute.status)) ||
      (activeTab === 'escalated' && dispute.status === 'escalated');
    
    const matchesCategory = categoryFilter === 'all' || dispute.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter;
    
    return matchesSearch && matchesTab && matchesCategory && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0 gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0`}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const cat = DISPUTE_CATEGORIES.find(c => c.value === category);
    return cat?.icon || AlertTriangle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
          <p className="text-gray-600 mt-1">Manage and resolve order disputes with buyers and sellers</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { loadDisputes(); loadStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDispute(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4 mr-2" />
            Raise Dispute
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-700">Open</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.open}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-purple-700">Review</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-1">{stats.under_review}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-700">Awaiting</span>
              </div>
              <p className="text-2xl font-bold text-amber-900 mt-1">{stats.awaiting_response}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-pink-600" />
                <span className="text-sm text-pink-700">Mediation</span>
              </div>
              <p className="text-2xl font-bold text-pink-900 mt-1">{stats.mediation}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">{stats.resolved}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700">Escalated</span>
              </div>
              <p className="text-2xl font-bold text-red-900 mt-1">{stats.escalated}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">Refunded</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{formatCurrency(stats.total_refunded)}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span className="text-sm text-indigo-700">Avg Days</span>
              </div>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.avg_resolution_time_days}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search disputes by number, order, buyer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {DISPUTE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({disputes.filter(d => d.status === 'open').length})</TabsTrigger>
              <TabsTrigger value="active">Active ({disputes.filter(d => ['under_review', 'awaiting_response', 'mediation'].includes(d.status)).length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({disputes.filter(d => ['resolved', 'closed'].includes(d.status)).length})</TabsTrigger>
              <TabsTrigger value="escalated">Escalated ({disputes.filter(d => d.status === 'escalated').length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No disputes found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDisputes.map((dispute) => {
                const CategoryIcon = getCategoryIcon(dispute.category);
                return (
                  <div
                    key={dispute.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => loadDisputeDetail(dispute.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`p-3 rounded-lg ${STATUS_CONFIG[dispute.status]?.bgColor || 'bg-gray-100'}`}>
                          <CategoryIcon className={`h-6 w-6 ${STATUS_CONFIG[dispute.status]?.color || 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-gray-500">{dispute.dispute_number}</span>
                            {getStatusBadge(dispute.status)}
                            {getPriorityBadge(dispute.priority)}
                          </div>
                          <h3 className="font-semibold text-gray-900 mt-1 truncate">{dispute.subject}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {dispute.order_number}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {dispute.buyer_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDate(dispute.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Order Value</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(dispute.order_total)}</p>
                        </div>
                        {dispute.assigned_to_name && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                            <UserCheck className="h-4 w-4 text-gray-600" />
                            <span className="text-sm text-gray-700">{dispute.assigned_to_name}</span>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dispute Detail Modal */}
      <Dialog open={showDisputeDetail} onOpenChange={setShowDisputeDetail}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedDispute && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">Dispute #{selectedDispute.dispute_number}</DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">{selectedDispute.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedDispute.status)}
                    {getPriorityBadge(selectedDispute.priority)}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="details" className="h-full flex flex-col">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="messages">Messages ({selectedDispute.messages?.length || 0})</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence ({selectedDispute.evidence?.length || 0})</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="flex-1 overflow-auto mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Order Information */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Order Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order Number</span>
                            <span className="font-medium">{selectedDispute.order_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order Date</span>
                            <span className="font-medium">{formatDate(selectedDispute.order_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Delivery Date</span>
                            <span className="font-medium">{formatDate(selectedDispute.delivery_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order Total</span>
                            <span className="font-bold text-lg">{formatCurrency(selectedDispute.order_total)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Parties Involved */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Parties Involved
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-medium">BUYER</p>
                            <p className="font-semibold text-gray-900">{selectedDispute.buyer_name}</p>
                            <p className="text-sm text-gray-500">{selectedDispute.buyer_email}</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-amber-600 font-medium">SELLER</p>
                            <p className="font-semibold text-gray-900">{selectedDispute.seller_name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{selectedDispute.seller_email || 'N/A'}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Dispute Details */}
                      <Card className="md:col-span-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Dispute Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Category</p>
                              <p className="font-medium">{selectedDispute.category.replace(/_/g, ' ').toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Response Deadline</p>
                              <p className="font-medium">{formatDate(selectedDispute.response_deadline)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-2">Description</p>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedDispute.description}</p>
                          </div>
                          {selectedDispute.resolution_type && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm text-green-600 font-medium mb-2">RESOLUTION</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">Type</p>
                                  <p className="font-medium">{selectedDispute.resolution_type.replace(/_/g, ' ').toUpperCase()}</p>
                                </div>
                                {selectedDispute.resolution_amount > 0 && (
                                  <div>
                                    <p className="text-sm text-gray-500">Amount</p>
                                    <p className="font-bold text-green-700">{formatCurrency(selectedDispute.resolution_amount)}</p>
                                  </div>
                                )}
                              </div>
                              {selectedDispute.resolution_notes && (
                                <p className="text-sm text-gray-700 mt-2">{selectedDispute.resolution_notes}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="messages" className="flex-1 overflow-hidden flex flex-col mt-4">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-4">
                        {selectedDispute.messages?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_role === 'buyer' ? 'justify-start' : msg.sender_role === 'seller' ? 'justify-end' : 'justify-center'}`}
                          >
                            {msg.message_type === 'system_notification' || msg.message_type === 'status_update' ? (
                              <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full max-w-md text-center">
                                {msg.message}
                              </div>
                            ) : (
                              <div className={`max-w-md ${
                                msg.sender_role === 'buyer' 
                                  ? 'bg-blue-100' 
                                  : msg.sender_role === 'seller' 
                                    ? 'bg-amber-100' 
                                    : 'bg-purple-100'
                              } rounded-lg p-3`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-medium ${
                                    msg.sender_role === 'buyer' 
                                      ? 'text-blue-700' 
                                      : msg.sender_role === 'seller' 
                                        ? 'text-amber-700' 
                                        : 'text-purple-700'
                                  }`}>
                                    {msg.sender_name} ({msg.sender_role.toUpperCase()})
                                  </span>
                                </div>
                                <p className="text-gray-800">{msg.message}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDate(msg.created_at)}</p>
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="evidence" className="flex-1 overflow-auto mt-4">
                    <div className="space-y-4">
                      <Button variant="outline" onClick={() => setShowUploadEvidence(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Evidence
                      </Button>
                      
                      {selectedDispute.evidence?.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">No evidence uploaded yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedDispute.evidence?.map((ev) => (
                            <Card key={ev.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-gray-100 rounded-lg">
                                    {ev.evidence_type === 'photo' ? (
                                      <Image className="h-6 w-6 text-gray-600" />
                                    ) : ev.evidence_type === 'video' ? (
                                      <Video className="h-6 w-6 text-gray-600" />
                                    ) : (
                                      <FileText className="h-6 w-6 text-gray-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{ev.file_name}</p>
                                    <p className="text-sm text-gray-500">{ev.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-gray-400">
                                        {(ev.file_size / 1024).toFixed(1)} KB
                                      </span>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-400">
                                        {ev.uploaded_by_name}
                                      </span>
                                      {ev.is_verified && (
                                        <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="flex-1 overflow-auto mt-4">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                      <div className="space-y-6">
                        {selectedDispute.status_history?.map((history, index) => {
                          const config = STATUS_CONFIG[history.new_status] || STATUS_CONFIG.open;
                          const Icon = config.icon;
                          return (
                            <div key={history.id} className="relative flex gap-4 pl-10">
                              <div className={`absolute left-2 p-1.5 rounded-full ${config.bgColor}`}>
                                <Icon className={`h-4 w-4 ${config.color}`} />
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900">
                                    {history.new_status.replace(/_/g, ' ').toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-500">{formatDate(history.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{history.reason}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  By {history.changed_by_name} ({history.changed_by_role})
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Admin Actions */}
              {isAdmin && !['resolved', 'closed', 'rejected'].includes(selectedDispute.status) && (
                <div className="flex gap-3 pt-4 border-t mt-4">
                  <Button variant="outline" onClick={() => setShowUpdateStatus(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button variant="outline" onClick={() => setShowProposeResolution(true)}>
                    <Gavel className="h-4 w-4 mr-2" />
                    Propose Resolution
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      setStatusUpdate({ status: 'escalated', reason: '', assigned_to_name: '' });
                      setShowUpdateStatus(true);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dispute Modal */}
      <Dialog open={showCreateDispute} onOpenChange={setShowCreateDispute}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise New Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Order Number</Label>
              <Input
                placeholder="ORD-2026-XXXXXX"
                value={newDispute.order_number}
                onChange={(e) => setNewDispute({ ...newDispute, order_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newDispute.category} onValueChange={(v) => setNewDispute({ ...newDispute, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={newDispute.priority} onValueChange={(v) => setNewDispute({ ...newDispute, priority: v })}>
                <SelectTrigger>
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
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Brief description of the issue"
                value={newDispute.subject}
                onChange={(e) => setNewDispute({ ...newDispute, subject: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Provide detailed information about the dispute..."
                value={newDispute.description}
                onChange={(e) => setNewDispute({ ...newDispute, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDispute(false)}>Cancel</Button>
            <Button onClick={handleCreateDispute} className="bg-red-600 hover:bg-red-700">
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={showUpdateStatus} onOpenChange={setShowUpdateStatus}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Dispute Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={statusUpdate.status} onValueChange={(v) => setStatusUpdate({ ...statusUpdate, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                  <SelectItem value="mediation">Mediation</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To (Optional)</Label>
              <Input
                placeholder="Admin name"
                value={statusUpdate.assigned_to_name}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, assigned_to_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                placeholder="Explain the reason for this status change..."
                value={statusUpdate.reason}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateStatus(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Propose Resolution Modal */}
      <Dialog open={showProposeResolution} onOpenChange={setShowProposeResolution}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Propose Resolution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution Type</Label>
              <Select value={resolution.resolution_type} onValueChange={(v) => setResolution({ ...resolution, resolution_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {['refund_full', 'refund_partial', 'credit'].includes(resolution.resolution_type) && (
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={resolution.resolution_amount}
                  onChange={(e) => setResolution({ ...resolution, resolution_amount: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Describe the resolution details..."
                value={resolution.resolution_notes}
                onChange={(e) => setResolution({ ...resolution, resolution_notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposeResolution(false)}>Cancel</Button>
            <Button onClick={handleProposeResolution} className="bg-green-600 hover:bg-green-700">
              Propose Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Evidence Modal */}
      <Dialog open={showUploadEvidence} onOpenChange={setShowUploadEvidence}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Evidence Type</Label>
              <Select value={evidenceUpload.evidence_type} onValueChange={(v) => setEvidenceUpload({ ...evidenceUpload, evidence_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="shipping_label">Shipping Label</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) => setEvidenceUpload({ ...evidenceUpload, file: e.target.files?.[0] || null })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this evidence shows..."
                value={evidenceUpload.description}
                onChange={(e) => setEvidenceUpload({ ...evidenceUpload, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadEvidence(false)}>Cancel</Button>
            <Button onClick={handleUploadEvidence}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
