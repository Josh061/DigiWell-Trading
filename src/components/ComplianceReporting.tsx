import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import CronJobMonitor from './CronJobMonitor';
import {
  FileText, Download, Shield, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, Clock, Calendar, BarChart3, PieChart, Activity,
  FileCheck, RefreshCw, Filter, Printer, Eye, ChevronRight, ArrowUp,
  ArrowDown, Minus, FileWarning, History, Users, Lock, Globe,
  CalendarClock, RotateCcw, Share2, Upload, Trash2, Search, Mail,
  Plus, Settings, Send, UserPlus, X, Play, Pause, Edit2, CalendarDays, Zap
} from 'lucide-react';


interface ComplianceMetrics {
  totalDocuments: number;
  activeDocuments: number;
  expiredDocuments: number;
  expiringWithin30Days: number;
  expiringWithin7Days: number;
  renewedThisMonth: number;
  complianceScore: number;
  documentsByType: { type: string; count: number; expired: number }[];
  documentsByStatus: { status: string; count: number }[];
  recentActivity: ActivityLog[];
  renewalHistory: RenewalRecord[];
  monthlyTrends: MonthlyTrend[];
}

interface ActivityLog {
  id: string;
  action: string;
  documentName: string;
  documentType: string;
  userId: string;
  timestamp: string;
  ipAddress: string;
  metadata?: any;
}

interface RenewalRecord {
  id: string;
  documentName: string;
  documentType: string;
  oldExpiration: string;
  newExpiration: string;
  renewedAt: string;
  renewedBy: string;
  notes?: string;
}

interface MonthlyTrend {
  month: string;
  uploaded: number;
  renewed: number;
  expired: number;
  shared: number;
}

interface ExpirationCategory {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface ReportSchedule {
  id: string;
  user_id: string;
  schedule_name: string;
  frequency: 'weekly' | 'monthly' | 'quarterly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  template_type: string;
  include_charts: boolean;
  include_audit_trail: boolean;
  include_renewal_history: boolean;
  include_expiration_forecast: boolean;
  date_range_days: number;
  is_active: boolean;
  last_sent_at?: string;
  next_scheduled_at?: string;
  created_at: string;
  compliance_report_recipients: Recipient[];
}

interface Recipient {
  id: string;
  schedule_id: string;
  email: string;
  name: string;
  role: string;
  is_primary: boolean;
}

interface ReportHistory {
  id: string;
  schedule_id?: string;
  user_id: string;
  report_type: string;
  template_type: string;
  date_range_start: string;
  date_range_end: string;
  recipients: { email: string; name: string }[];
  compliance_score: number;
  total_documents: number;
  expiring_documents: number;
  delivery_status: string;
  sent_at: string;
}

const documentTypeColors: Record<string, string> = {
  contract: '#3B82F6',
  invoice: '#10B981',
  bill_of_lading: '#8B5CF6',
  certificate: '#F59E0B',
  other: '#6B7280'
};

const documentTypeLabels: Record<string, string> = {
  contract: 'Contracts',
  invoice: 'Invoices',
  bill_of_lading: 'Bills of Lading',
  certificate: 'Certificates',
  other: 'Other'
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ComplianceReporting() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30');
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityFilter, setActivityFilter] = useState('all');
  const reportRef = useRef<HTMLDivElement>(null);

  // Schedule state
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState<string | null>(null);

  // New schedule form
  const [scheduleForm, setScheduleForm] = useState({
    scheduleName: '',
    frequency: 'weekly' as 'weekly' | 'monthly' | 'quarterly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '09:00',
    templateType: 'comprehensive',
    includeCharts: true,
    includeAuditTrail: true,
    includeRenewalHistory: true,
    includeExpirationForecast: true,
    dateRangeDays: 30,
    recipients: [] as { email: string; name: string; role: string }[]
  });

  // New recipient form
  const [recipientForm, setRecipientForm] = useState({
    email: '',
    name: '',
    role: 'Compliance Officer'
  });

  const userId = 'user-' + Math.random().toString(36).substr(2, 9);

  const loadComplianceMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { action: 'get_compliance_metrics', userId, daysRange: parseInt(dateRange) }
      });

      if (data?.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error loading compliance metrics:', error);
      toast({ title: 'Error', description: 'Failed to load compliance metrics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, dateRange, toast]);

  const loadActivityLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { 
          action: 'get_compliance_activity', 
          userId, 
          filter: activityFilter,
          limit: 100 
        }
      });

      if (data?.logs) {
        setActivityLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  }, [userId, activityFilter]);

  const loadSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'get_schedules', userId }
      });

      if (data?.schedules) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }, [userId]);

  const loadReportHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'get_report_history', userId, limit: 50 }
      });

      if (data?.history) {
        setReportHistory(data.history);
      }
    } catch (error) {
      console.error('Error loading report history:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadComplianceMetrics();
  }, [loadComplianceMetrics]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadActivityLogs();
    } else if (activeTab === 'schedules') {
      loadSchedules();
      loadReportHistory();
    }
  }, [activeTab, loadActivityLogs, loadSchedules, loadReportHistory]);

  const generatePDFReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('document-vault', {
        body: { action: 'generate_compliance_report', userId, daysRange: parseInt(dateRange) }
      });

      if (data?.success) {
        const pdfContent = generatePDFContent(data.reportData);
        downloadPDF(pdfContent, `compliance-report-${new Date().toISOString().split('T')[0]}.html`);
        toast({ title: 'Report Generated', description: 'Compliance report has been downloaded' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const createSchedule = async () => {
    if (!scheduleForm.scheduleName || scheduleForm.recipients.length === 0) {
      toast({ title: 'Error', description: 'Please provide a name and at least one recipient', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: {
          action: 'create_schedule',
          userId,
          scheduleName: scheduleForm.scheduleName,
          frequency: scheduleForm.frequency,
          dayOfWeek: scheduleForm.frequency === 'weekly' ? scheduleForm.dayOfWeek : undefined,
          dayOfMonth: scheduleForm.frequency !== 'weekly' ? scheduleForm.dayOfMonth : undefined,
          timeOfDay: scheduleForm.timeOfDay + ':00',
          templateType: scheduleForm.templateType,
          includeCharts: scheduleForm.includeCharts,
          includeAuditTrail: scheduleForm.includeAuditTrail,
          includeRenewalHistory: scheduleForm.includeRenewalHistory,
          includeExpirationForecast: scheduleForm.includeExpirationForecast,
          dateRangeDays: scheduleForm.dateRangeDays,
          recipients: scheduleForm.recipients
        }
      });

      if (data?.success) {
        toast({ title: 'Schedule Created', description: 'Report schedule has been created successfully' });
        setShowScheduleModal(false);
        resetScheduleForm();
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create schedule', variant: 'destructive' });
    }
  };

  const updateSchedule = async () => {
    if (!editingSchedule) return;

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: {
          action: 'update_schedule',
          scheduleId: editingSchedule.id,
          userId,
          scheduleName: scheduleForm.scheduleName,
          frequency: scheduleForm.frequency,
          dayOfWeek: scheduleForm.frequency === 'weekly' ? scheduleForm.dayOfWeek : undefined,
          dayOfMonth: scheduleForm.frequency !== 'weekly' ? scheduleForm.dayOfMonth : undefined,
          timeOfDay: scheduleForm.timeOfDay + ':00',
          templateType: scheduleForm.templateType,
          includeCharts: scheduleForm.includeCharts,
          includeAuditTrail: scheduleForm.includeAuditTrail,
          includeRenewalHistory: scheduleForm.includeRenewalHistory,
          includeExpirationForecast: scheduleForm.includeExpirationForecast,
          dateRangeDays: scheduleForm.dateRangeDays
        }
      });

      if (data?.success) {
        toast({ title: 'Schedule Updated', description: 'Report schedule has been updated' });
        setShowScheduleModal(false);
        setEditingSchedule(null);
        resetScheduleForm();
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'delete_schedule', scheduleId, userId }
      });

      if (data?.success) {
        toast({ title: 'Schedule Deleted', description: 'Report schedule has been deleted' });
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete schedule', variant: 'destructive' });
    }
  };

  const toggleScheduleActive = async (schedule: ReportSchedule) => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: {
          action: 'update_schedule',
          scheduleId: schedule.id,
          userId,
          isActive: !schedule.is_active
        }
      });

      if (data?.success) {
        toast({ 
          title: schedule.is_active ? 'Schedule Paused' : 'Schedule Activated',
          description: `Report schedule has been ${schedule.is_active ? 'paused' : 'activated'}`
        });
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' });
    }
  };

  const sendReportNow = async (scheduleId: string) => {
    setSendingReport(scheduleId);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'send_report_now', scheduleId, userId }
      });

      if (data?.success) {
        toast({ 
          title: 'Report Sent', 
          description: `Compliance report sent to ${data.emailResult?.results?.length || 0} recipients`
        });
        loadSchedules();
        loadReportHistory();
      } else {
        toast({ title: 'Error', description: data?.error || 'Failed to send report', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send report', variant: 'destructive' });
    } finally {
      setSendingReport(null);
    }
  };

  const addRecipient = async () => {
    if (!selectedScheduleId || !recipientForm.email || !recipientForm.name) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: {
          action: 'add_recipient',
          scheduleId: selectedScheduleId,
          email: recipientForm.email,
          name: recipientForm.name,
          role: recipientForm.role
        }
      });

      if (data?.success) {
        toast({ title: 'Recipient Added', description: 'Recipient has been added to the schedule' });
        setShowRecipientModal(false);
        setRecipientForm({ email: '', name: '', role: 'Compliance Officer' });
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add recipient', variant: 'destructive' });
    }
  };

  const removeRecipient = async (recipientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'remove_recipient', recipientId }
      });

      if (data?.success) {
        toast({ title: 'Recipient Removed', description: 'Recipient has been removed' });
        loadSchedules();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove recipient', variant: 'destructive' });
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      scheduleName: '',
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: '09:00',
      templateType: 'comprehensive',
      includeCharts: true,
      includeAuditTrail: true,
      includeRenewalHistory: true,
      includeExpirationForecast: true,
      dateRangeDays: 30,
      recipients: []
    });
  };

  const openEditSchedule = (schedule: ReportSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      scheduleName: schedule.schedule_name,
      frequency: schedule.frequency,
      dayOfWeek: schedule.day_of_week || 1,
      dayOfMonth: schedule.day_of_month || 1,
      timeOfDay: schedule.time_of_day?.slice(0, 5) || '09:00',
      templateType: schedule.template_type,
      includeCharts: schedule.include_charts,
      includeAuditTrail: schedule.include_audit_trail,
      includeRenewalHistory: schedule.include_renewal_history,
      includeExpirationForecast: schedule.include_expiration_forecast,
      dateRangeDays: schedule.date_range_days,
      recipients: schedule.compliance_report_recipients?.map(r => ({
        email: r.email,
        name: r.name,
        role: r.role
      })) || []
    });
    setShowScheduleModal(true);
  };

  const addRecipientToForm = () => {
    if (!recipientForm.email || !recipientForm.name) return;
    setScheduleForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, { ...recipientForm }]
    }));
    setRecipientForm({ email: '', name: '', role: 'Compliance Officer' });
  };

  const removeRecipientFromForm = (index: number) => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  const generatePDFContent = (reportData: any) => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compliance Report - ${currentDate}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 40px; margin: -40px -40px 40px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .section { margin-bottom: 32px; page-break-inside: avoid; }
    .section-title { font-size: 18px; font-weight: 600; color: #1e40af; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric-card { background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; }
    .metric-value { font-size: 32px; font-weight: 700; color: #1e40af; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .score-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .score-value { font-size: 48px; font-weight: 700; }
    .score-label { font-size: 14px; opacity: 0.9; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .table th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
    @media print { .container { padding: 20px; } .header { margin: -20px -20px 20px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Document Compliance Report</h1>
      <p>Generated on ${currentDate}</p>
    </div>

    <div class="section">
      <div class="score-card">
        <div class="score-value">${reportData?.complianceScore || metrics?.complianceScore || 0}%</div>
        <div class="score-label">Overall Compliance Score</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Document Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${reportData?.totalDocuments || metrics?.totalDocuments || 0}</div>
          <div class="metric-label">Total Documents</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: #10b981;">${reportData?.activeDocuments || metrics?.activeDocuments || 0}</div>
          <div class="metric-label">Active</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: #f59e0b;">${reportData?.expiringWithin30Days || metrics?.expiringWithin30Days || 0}</div>
          <div class="metric-label">Expiring Soon</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: #ef4444;">${reportData?.expiredDocuments || metrics?.expiredDocuments || 0}</div>
          <div class="metric-label">Expired</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Documents by Type</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Document Type</th>
            <th>Total</th>
            <th>Active</th>
            <th>Expired</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData?.documentsByType || metrics?.documentsByType || []).map((item: any) => `
          <tr>
            <td>${documentTypeLabels[item.type] || item.type}</td>
            <td>${item.count}</td>
            <td>${item.count - item.expired}</td>
            <td>${item.expired}</td>
            <td><span class="badge ${item.expired === 0 ? 'badge-success' : item.expired < item.count / 2 ? 'badge-warning' : 'badge-danger'}">${item.expired === 0 ? 'Compliant' : 'Needs Attention'}</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Renewal History (Last ${dateRange} Days)</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Type</th>
            <th>Previous Expiry</th>
            <th>New Expiry</th>
            <th>Renewed On</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData?.renewalHistory || metrics?.renewalHistory || []).slice(0, 10).map((item: any) => `
          <tr>
            <td>${item.documentName}</td>
            <td>${documentTypeLabels[item.documentType] || item.documentType}</td>
            <td>${new Date(item.oldExpiration).toLocaleDateString()}</td>
            <td>${new Date(item.newExpiration).toLocaleDateString()}</td>
            <td>${new Date(item.renewedAt).toLocaleDateString()}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Recent Activity</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Document</th>
            <th>Date/Time</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          ${(reportData?.recentActivity || metrics?.recentActivity || []).slice(0, 15).map((item: any) => `
          <tr>
            <td><span class="badge badge-info">${item.action}</span></td>
            <td>${item.documentName}</td>
            <td>${new Date(item.timestamp).toLocaleString()}</td>
            <td>${item.ipAddress}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>This report was automatically generated by Digiwell Document Vault</p>
      <p>For compliance inquiries, contact compliance@digiwell.com</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const downloadPDF = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const content = generatePDFContent(metrics);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload className="w-4 h-4 text-green-500" />;
      case 'view': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'download': return <Download className="w-4 h-4 text-purple-500" />;
      case 'share': return <Share2 className="w-4 h-4 text-amber-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'renewal': return <RotateCcw className="w-4 h-4 text-green-500" />;
      case 'expiration_update': return <CalendarClock className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreGradient = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-600';
    if (score >= 70) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getFrequencyLabel = (schedule: ReportSchedule) => {
    if (schedule.frequency === 'weekly') {
      return `Every ${daysOfWeek[schedule.day_of_week || 0]}`;
    } else if (schedule.frequency === 'monthly') {
      return `Monthly on day ${schedule.day_of_month || 1}`;
    } else {
      return `Quarterly on day ${schedule.day_of_month || 1}`;
    }
  };

  const expirationCategories: ExpirationCategory[] = metrics ? [
    { category: 'Active', count: metrics.activeDocuments - metrics.expiringWithin30Days, percentage: ((metrics.activeDocuments - metrics.expiringWithin30Days) / metrics.totalDocuments) * 100, color: '#10B981' },
    { category: 'Expiring (30d)', count: metrics.expiringWithin30Days - metrics.expiringWithin7Days, percentage: ((metrics.expiringWithin30Days - metrics.expiringWithin7Days) / metrics.totalDocuments) * 100, color: '#3B82F6' },
    { category: 'Expiring (7d)', count: metrics.expiringWithin7Days, percentage: (metrics.expiringWithin7Days / metrics.totalDocuments) * 100, color: '#F59E0B' },
    { category: 'Expired', count: metrics.expiredDocuments, percentage: (metrics.expiredDocuments / metrics.totalDocuments) * 100, color: '#EF4444' }
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Compliance Reporting</h1>
              <p className="text-blue-200">Document health, expiration tracking & audit trails</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={printReport}
              className="border-slate-600 text-slate-300"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={generatePDFReport}
              disabled={generating}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Report
            </Button>
          </div>
        </div>

        {/* Compliance Score Card */}
        <Card className={`bg-gradient-to-r ${getScoreGradient(metrics?.complianceScore || 0)} border-0 mb-6`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{metrics?.complianceScore || 0}%</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Compliance Score</h2>
                  <p className="text-white/80">
                    {(metrics?.complianceScore || 0) >= 90 ? 'Excellent - All documents are well maintained' :
                     (metrics?.complianceScore || 0) >= 70 ? 'Good - Some documents need attention' :
                     'Needs Improvement - Multiple documents require action'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{metrics?.totalDocuments || 0}</p>
                  <p className="text-xs text-white/70">Total</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{metrics?.activeDocuments || 0}</p>
                  <p className="text-xs text-white/70">Active</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{metrics?.expiringWithin30Days || 0}</p>
                  <p className="text-xs text-white/70">Expiring</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{metrics?.renewedThisMonth || 0}</p>
                  <p className="text-xs text-white/70">Renewed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
              <PieChart className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expiration" className="data-[state=active]:bg-blue-600">
              <CalendarClock className="w-4 h-4 mr-2" />
              Expiration
            </TabsTrigger>
            <TabsTrigger value="renewals" className="data-[state=active]:bg-blue-600">
              <RotateCcw className="w-4 h-4 mr-2" />
              Renewals
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-blue-600">
              <History className="w-4 h-4 mr-2" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="schedules" className="data-[state=active]:bg-blue-600">
              <Mail className="w-4 h-4 mr-2" />
              Scheduled Reports
            </TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-blue-600">
              <Zap className="w-4 h-4 mr-2" />
              Automation
            </TabsTrigger>
          </TabsList>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <CronJobMonitor />
          </TabsContent>


          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Documents by Type */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Documents by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.documentsByType?.map((item) => (
                      <div key={item.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: documentTypeColors[item.type] || '#6B7280' }}
                            />
                            <span className="text-white">{documentTypeLabels[item.type] || item.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">{item.count} total</span>
                            {item.expired > 0 && (
                              <Badge className="bg-red-500/20 text-red-400 text-xs">
                                {item.expired} expired
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress 
                          value={(item.count / (metrics?.totalDocuments || 1)) * 100} 
                          className="h-2 bg-slate-700"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Expiration Distribution */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-400" />
                    Expiration Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {expirationCategories.reduce((acc, cat, idx) => {
                          const offset = acc.offset;
                          const dashArray = cat.percentage;
                          acc.elements.push(
                            <circle
                              key={cat.category}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={cat.color}
                              strokeWidth="20"
                              strokeDasharray={`${dashArray} ${100 - dashArray}`}
                              strokeDashoffset={-offset}
                              className="transition-all duration-500"
                            />
                          );
                          acc.offset += dashArray;
                          return acc;
                        }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-white">{metrics?.totalDocuments || 0}</p>
                          <p className="text-xs text-slate-400">Documents</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {expirationCategories.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-400 text-sm">{cat.category}</span>
                        <span className="text-white font-medium ml-auto">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Document Activity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end gap-2">
                  {(metrics?.monthlyTrends || []).map((trend, idx) => (
                    <div key={trend.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1 items-end h-48">
                        <div 
                          className="flex-1 bg-green-500 rounded-t transition-all"
                          style={{ height: `${(trend.uploaded / 20) * 100}%`, minHeight: trend.uploaded > 0 ? '8px' : '0' }}
                          title={`Uploaded: ${trend.uploaded}`}
                        />
                        <div 
                          className="flex-1 bg-blue-500 rounded-t transition-all"
                          style={{ height: `${(trend.renewed / 20) * 100}%`, minHeight: trend.renewed > 0 ? '8px' : '0' }}
                          title={`Renewed: ${trend.renewed}`}
                        />
                        <div 
                          className="flex-1 bg-amber-500 rounded-t transition-all"
                          style={{ height: `${(trend.shared / 20) * 100}%`, minHeight: trend.shared > 0 ? '8px' : '0' }}
                          title={`Shared: ${trend.shared}`}
                        />
                        <div 
                          className="flex-1 bg-red-500 rounded-t transition-all"
                          style={{ height: `${(trend.expired / 20) * 100}%`, minHeight: trend.expired > 0 ? '8px' : '0' }}
                          title={`Expired: ${trend.expired}`}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{trend.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span className="text-xs text-slate-400">Uploaded</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span className="text-xs text-slate-400">Renewed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    <span className="text-xs text-slate-400">Shared</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs text-slate-400">Expired</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expiration Tab */}
          <TabsContent value="expiration" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Active & Valid</p>
                      <p className="text-3xl font-bold text-green-400">
                        {(metrics?.activeDocuments || 0) - (metrics?.expiringWithin30Days || 0)}
                      </p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Expiring (30 days)</p>
                      <p className="text-3xl font-bold text-blue-400">{metrics?.expiringWithin30Days || 0}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-blue-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Expiring (7 days)</p>
                      <p className="text-3xl font-bold text-amber-400">{metrics?.expiringWithin7Days || 0}</p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Expired</p>
                      <p className="text-3xl font-bold text-red-400">{metrics?.expiredDocuments || 0}</p>
                    </div>
                    <XCircle className="w-10 h-10 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expiration Timeline */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-amber-400" />
                  Upcoming Expirations by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.documentsByType?.filter(t => t.expired > 0 || t.count > 0).map((item) => {
                    const activeCount = item.count - item.expired;
                    const healthPercentage = item.count > 0 ? (activeCount / item.count) * 100 : 100;
                    
                    return (
                      <div key={item.type} className="p-4 bg-slate-900/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: documentTypeColors[item.type] + '20' }}
                            >
                              <FileText className="w-5 h-5" style={{ color: documentTypeColors[item.type] }} />
                            </div>
                            <div>
                              <h4 className="text-white font-medium">{documentTypeLabels[item.type] || item.type}</h4>
                              <p className="text-sm text-slate-400">{item.count} documents</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${healthPercentage >= 90 ? 'text-green-400' : healthPercentage >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                              {healthPercentage.toFixed(0)}%
                            </div>
                            <p className="text-xs text-slate-500">Health Score</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-green-400">Active: {activeCount}</span>
                              <span className="text-red-400">Expired: {item.expired}</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-green-500 transition-all"
                                style={{ width: `${healthPercentage}%` }}
                              />
                              <div 
                                className="bg-red-500 transition-all"
                                style={{ width: `${100 - healthPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Renewals Tab */}
          <TabsContent value="renewals" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-green-400" />
                  Renewal History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.renewalHistory?.length === 0 ? (
                  <div className="text-center py-12">
                    <RotateCcw className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Renewals Yet</h3>
                    <p className="text-slate-400">Document renewals will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-3 text-slate-400 font-medium">Document</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Type</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Previous Expiry</th>
                          <th className="text-left p-3 text-slate-400 font-medium">New Expiry</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Renewed On</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics?.renewalHistory?.map((renewal) => (
                          <tr key={renewal.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileCheck className="w-4 h-4 text-green-400" />
                                <span className="text-white">{renewal.documentName}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge 
                                style={{ 
                                  backgroundColor: documentTypeColors[renewal.documentType] + '20',
                                  color: documentTypeColors[renewal.documentType]
                                }}
                              >
                                {documentTypeLabels[renewal.documentType] || renewal.documentType}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-400">{formatDate(renewal.oldExpiration)}</td>
                            <td className="p-3 text-green-400">{formatDate(renewal.newExpiration)}</td>
                            <td className="p-3 text-slate-400">{formatDate(renewal.renewedAt)}</td>
                            <td className="p-3 text-slate-500 max-w-xs truncate">{renewal.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Audit Trail
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="upload">Uploads</SelectItem>
                      <SelectItem value="view">Views</SelectItem>
                      <SelectItem value="download">Downloads</SelectItem>
                      <SelectItem value="share">Shares</SelectItem>
                      <SelectItem value="renewal">Renewals</SelectItem>
                      <SelectItem value="delete">Deletions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadActivityLogs}
                    className="border-slate-600 text-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Activity Recorded</h3>
                    <p className="text-slate-400">Document activity will be logged here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors">
                        <div className="p-2 bg-slate-800 rounded-lg">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-slate-600 text-slate-400 capitalize">
                              {log.action.replace('_', ' ')}
                            </Badge>
                            <span className="text-white truncate">{log.documentName}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDateTime(log.timestamp)} • IP: {log.ipAddress}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            style={{ 
                              backgroundColor: documentTypeColors[log.documentType] + '20',
                              color: documentTypeColors[log.documentType]
                            }}
                            className="text-xs"
                          >
                            {documentTypeLabels[log.documentType] || log.documentType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduled Reports Tab */}
          <TabsContent value="schedules" className="space-y-6">
            {/* Schedule Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Automated Report Schedules</h2>
                <p className="text-slate-400 text-sm">Configure automated compliance reports sent to your team</p>
              </div>
              <Button
                onClick={() => {
                  setEditingSchedule(null);
                  resetScheduleForm();
                  setShowScheduleModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Schedule
              </Button>
            </div>

            {/* Schedules List */}
            <div className="grid gap-4">
              {schedules.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-12 text-center">
                    <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Scheduled Reports</h3>
                    <p className="text-slate-400 mb-6">Create a schedule to automatically send compliance reports to your team</p>
                    <Button
                      onClick={() => {
                        setEditingSchedule(null);
                        resetScheduleForm();
                        setShowScheduleModal(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Schedule
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                schedules.map((schedule) => (
                  <Card key={schedule.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${schedule.is_active ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                            <CalendarDays className={`w-6 h-6 ${schedule.is_active ? 'text-green-400' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold text-white">{schedule.schedule_name}</h3>
                              <Badge className={schedule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}>
                                {schedule.is_active ? 'Active' : 'Paused'}
                              </Badge>
                              <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                                {schedule.frequency}
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-sm mb-3">
                              {getFrequencyLabel(schedule)} at {schedule.time_of_day?.slice(0, 5) || '09:00'}
                            </p>
                            
                            {/* Recipients */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Users className="w-4 h-4 text-slate-500" />
                              {schedule.compliance_report_recipients?.slice(0, 3).map((recipient) => (
                                <Badge key={recipient.id} variant="outline" className="border-slate-600 text-slate-300">
                                  {recipient.name}
                                </Badge>
                              ))}
                              {(schedule.compliance_report_recipients?.length || 0) > 3 && (
                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                  +{(schedule.compliance_report_recipients?.length || 0) - 3} more
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedScheduleId(schedule.id);
                                  setShowRecipientModal(true);
                                }}
                                className="text-blue-400 hover:text-blue-300 h-6 px-2"
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            </div>

                            {/* Schedule Info */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              {schedule.last_sent_at && (
                                <span>Last sent: {formatDateTime(schedule.last_sent_at)}</span>
                              )}
                              {schedule.next_scheduled_at && (
                                <span>Next: {formatDateTime(schedule.next_scheduled_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendReportNow(schedule.id)}
                            disabled={sendingReport === schedule.id}
                            className="border-slate-600 text-slate-300"
                          >
                            {sendingReport === schedule.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleScheduleActive(schedule)}
                            className="border-slate-600 text-slate-300"
                          >
                            {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSchedule(schedule)}
                            className="border-slate-600 text-slate-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSchedule(schedule.id)}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Template Options */}
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-500">Includes:</span>
                          {schedule.include_charts && (
                            <Badge variant="outline" className="border-slate-700 text-slate-400">Charts</Badge>
                          )}
                          {schedule.include_audit_trail && (
                            <Badge variant="outline" className="border-slate-700 text-slate-400">Audit Trail</Badge>
                          )}
                          {schedule.include_renewal_history && (
                            <Badge variant="outline" className="border-slate-700 text-slate-400">Renewal History</Badge>
                          )}
                          {schedule.include_expiration_forecast && (
                            <Badge variant="outline" className="border-slate-700 text-slate-400">Expiration Forecast</Badge>
                          )}
                          <span className="text-slate-500 ml-auto">Last {schedule.date_range_days} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Report History */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Report Delivery History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No reports have been sent yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left p-3 text-slate-400 font-medium">Sent At</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Type</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Recipients</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Score</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Documents</th>
                          <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportHistory.map((report) => (
                          <tr key={report.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-3 text-white">{formatDateTime(report.sent_at)}</td>
                            <td className="p-3">
                              <Badge className="bg-blue-500/20 text-blue-400 capitalize">
                                {report.report_type}
                              </Badge>
                            </td>
                            <td className="p-3 text-slate-400">
                              {report.recipients?.map(r => r.name).join(', ') || '-'}
                            </td>
                            <td className="p-3">
                              <span className={`font-semibold ${
                                report.compliance_score >= 90 ? 'text-green-400' :
                                report.compliance_score >= 70 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {report.compliance_score}%
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">
                              {report.total_documents} total / {report.expiring_documents} expiring
                            </td>
                            <td className="p-3">
                              <Badge className={
                                report.delivery_status === 'sent' ? 'bg-green-500/20 text-green-400' :
                                report.delivery_status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                              }>
                                {report.delivery_status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSchedule ? 'Edit Report Schedule' : 'Create Report Schedule'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Schedule Name */}
            <div className="space-y-2">
              <Label className="text-slate-300">Schedule Name</Label>
              <Input
                value={scheduleForm.scheduleName}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduleName: e.target.value }))}
                placeholder="e.g., Weekly Compliance Report"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Frequency</Label>
                <Select 
                  value={scheduleForm.frequency} 
                  onValueChange={(v: 'weekly' | 'monthly' | 'quarterly') => setScheduleForm(prev => ({ ...prev, frequency: v }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleForm.frequency === 'weekly' ? (
                <div className="space-y-2">
                  <Label className="text-slate-300">Day of Week</Label>
                  <Select 
                    value={scheduleForm.dayOfWeek.toString()} 
                    onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {daysOfWeek.map((day, idx) => (
                        <SelectItem key={day} value={idx.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-slate-300">Day of Month</Label>
                  <Select 
                    value={scheduleForm.dayOfMonth.toString()} 
                    onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dayOfMonth: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Time and Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Time of Day</Label>
                <Input
                  type="time"
                  value={scheduleForm.timeOfDay}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, timeOfDay: e.target.value }))}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Report Period (Days)</Label>
                <Select 
                  value={scheduleForm.dateRangeDays.toString()} 
                  onValueChange={(v) => setScheduleForm(prev => ({ ...prev, dateRangeDays: parseInt(v) }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Report Content Options */}
            <div className="space-y-3">
              <Label className="text-slate-300">Report Content</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Include Charts</span>
                  <Switch
                    checked={scheduleForm.includeCharts}
                    onCheckedChange={(v) => setScheduleForm(prev => ({ ...prev, includeCharts: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Audit Trail</span>
                  <Switch
                    checked={scheduleForm.includeAuditTrail}
                    onCheckedChange={(v) => setScheduleForm(prev => ({ ...prev, includeAuditTrail: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Renewal History</span>
                  <Switch
                    checked={scheduleForm.includeRenewalHistory}
                    onCheckedChange={(v) => setScheduleForm(prev => ({ ...prev, includeRenewalHistory: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Expiration Forecast</span>
                  <Switch
                    checked={scheduleForm.includeExpirationForecast}
                    onCheckedChange={(v) => setScheduleForm(prev => ({ ...prev, includeExpirationForecast: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Recipients (only for new schedules) */}
            {!editingSchedule && (
              <div className="space-y-3">
                <Label className="text-slate-300">Recipients</Label>
                
                {/* Add Recipient Form */}
                <div className="flex gap-2">
                  <Input
                    value={recipientForm.name}
                    onChange={(e) => setRecipientForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                    className="bg-slate-800 border-slate-700 text-white flex-1"
                  />
                  <Input
                    value={recipientForm.email}
                    onChange={(e) => setRecipientForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    type="email"
                    className="bg-slate-800 border-slate-700 text-white flex-1"
                  />
                  <Select 
                    value={recipientForm.role} 
                    onValueChange={(v) => setRecipientForm(prev => ({ ...prev, role: v }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addRecipientToForm} className="bg-blue-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Recipients List */}
                {scheduleForm.recipients.length > 0 && (
                  <div className="space-y-2">
                    {scheduleForm.recipients.map((recipient, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm">{recipient.name}</p>
                            <p className="text-slate-500 text-xs">{recipient.email}</p>
                          </div>
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                            {recipient.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipientFromForm(idx)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button 
              onClick={editingSchedule ? updateSchedule : createSchedule}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
              disabled={!scheduleForm.scheduleName || (!editingSchedule && scheduleForm.recipients.length === 0)}
            >
              {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Recipient Modal */}
      <Dialog open={showRecipientModal} onOpenChange={setShowRecipientModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Recipient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input
                value={recipientForm.name}
                onChange={(e) => setRecipientForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Smith"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                value={recipientForm.email}
                onChange={(e) => setRecipientForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
                type="email"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Role</Label>
              <Select 
                value={recipientForm.role} 
                onValueChange={(v) => setRecipientForm(prev => ({ ...prev, role: v }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipientModal(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={addRecipient} className="bg-gradient-to-r from-blue-600 to-purple-600">
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
