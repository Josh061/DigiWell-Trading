import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Download,
  Mail,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Printer,
  Package,
  Camera,
  PenTool,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Archive,
  BarChart3,
  FileCheck,
  Image,
  Loader2
} from 'lucide-react';

interface PODReport {
  id: string;
  report_number: string;
  tracking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  product_name: string;
  quantity_ordered: number;
  quantity_delivered: number;
  unit: string;
  delivery_status: string;
  signature_data: string;
  photo_urls: string[];
  delivery_timestamp: string;
  gps_latitude: number;
  gps_longitude: number;
  gps_accuracy: number;
  driver_name: string;
  driver_phone: string;
  customer_acknowledged: boolean;
  emailed_to_customer: boolean;
  email_sent_at: string;
  delivery_notes: string;
  special_instructions: string;
  created_at: string;
}

interface PODStats {
  total: number;
  completed: number;
  partial: number;
  refused: number;
  not_home: number;
  with_signature: number;
  with_photos: number;
  emailed: number;
  acknowledged: number;
}

interface BatchExport {
  id: string;
  date_from: string;
  date_to: string;
  total_reports: number;
  processed_reports: number;
  status: string;
  created_at: string;
}

export default function PODReportingSystem() {
  const [activeTab, setActiveTab] = useState('reports');
  const [pods, setPods] = useState<PODReport[]>([]);
  const [stats, setStats] = useState<PODStats | null>(null);
  const [batchExports, setBatchExports] = useState<BatchExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPods, setSelectedPods] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('');

  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);
  const [selectedPod, setSelectedPod] = useState<PODReport | null>(null);
  const [podHtml, setPodHtml] = useState('');

  // Email state
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // Batch export state
  const [batchDateFrom, setBatchDateFrom] = useState('');
  const [batchDateTo, setBatchDateTo] = useState('');
  const [batchStatus, setBatchStatus] = useState('all');
  const [batchExporting, setBatchExporting] = useState(false);

  const fetchPods = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        action: 'list_pods',
        page: currentPage,
        limit: 10
      };

      if (searchQuery) params.search = searchQuery;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (driverFilter) params.driver_name = driverFilter;

      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: params
      });

      if (error) throw error;

      setPods(data.pods || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Error fetching PODs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, dateFrom, dateTo, statusFilter, driverFilter]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: { action: 'get_pod_stats' }
      });

      if (error) throw error;
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchBatchExports = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: { action: 'get_batch_exports', limit: 20 }
      });

      if (error) throw error;
      setBatchExports(data.exports || []);
    } catch (err) {
      console.error('Error fetching batch exports:', err);
    }
  };

  useEffect(() => {
    fetchPods();
    fetchStats();
    fetchBatchExports();
  }, [fetchPods]);

  const viewPod = async (pod: PODReport) => {
    setSelectedPod(pod);
    try {
      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: { action: 'get_pod', pod_id: pod.id }
      });

      if (error) throw error;
      setPodHtml(data.html);
      setViewModalOpen(true);
    } catch (err) {
      console.error('Error fetching POD:', err);
    }
  };

  const openEmailModal = (pod: PODReport) => {
    setSelectedPod(pod);
    setEmailRecipient(pod.customer_email || '');
    setEmailModalOpen(true);
  };

  const sendEmail = async () => {
    if (!selectedPod || !emailRecipient) return;

    setEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: {
          action: 'email_pod',
          pod_id: selectedPod.id,
          recipient_email: emailRecipient,
          recipient_name: selectedPod.customer_name
        }
      });

      if (error) throw error;

      if (data.success) {
        alert('POD email sent successfully!');
        setEmailModalOpen(false);
        fetchPods();
      } else {
        alert('Failed to send email: ' + (data.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      alert('Error sending email: ' + err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const sendBulkEmails = async () => {
    if (selectedPods.length === 0) return;

    setEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: {
          action: 'bulk_email',
          pod_ids: selectedPods
        }
      });

      if (error) throw error;

      alert(`Emails sent: ${data.sent} successful, ${data.failed} failed`);
      setSelectedPods([]);
      fetchPods();
    } catch (err: any) {
      console.error('Error sending bulk emails:', err);
      alert('Error sending bulk emails: ' + err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const runBatchExport = async () => {
    setBatchExporting(true);
    try {
      const params: any = { action: 'batch_export' };
      if (batchDateFrom) params.date_from = batchDateFrom;
      if (batchDateTo) params.date_to = batchDateTo;
      if (batchStatus && batchStatus !== 'all') params.status_filter = batchStatus;

      const { data, error } = await supabase.functions.invoke('pod-reports', {
        body: params
      });

      if (error) throw error;

      // Download the HTML
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `POD-Batch-Export-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Batch export completed! ${data.total_pods} PODs exported.`);
      setBatchExportModalOpen(false);
      fetchBatchExports();
    } catch (err: any) {
      console.error('Error running batch export:', err);
      alert('Error running batch export: ' + err.message);
    } finally {
      setBatchExporting(false);
    }
  };

  const downloadPod = () => {
    if (!selectedPod || !podHtml) return;

    const blob = new Blob([podHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POD-${selectedPod.report_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printPod = () => {
    if (!podHtml) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(podHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const togglePodSelection = (podId: string) => {
    setSelectedPods(prev =>
      prev.includes(podId)
        ? prev.filter(id => id !== podId)
        : [...prev, podId]
    );
  };

  const toggleAllPods = () => {
    if (selectedPods.length === pods.length) {
      setSelectedPods([]);
    } else {
      setSelectedPods(pods.map(p => p.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      refused: 'bg-red-100 text-red-800',
      not_home: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Proof of Delivery Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Generate, view, and manage delivery confirmation reports
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total PODs</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Completed</p>
                    <p className="text-3xl font-bold">{stats.completed}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">With Signature</p>
                    <p className="text-3xl font-bold">{stats.with_signature}</p>
                  </div>
                  <PenTool className="w-10 h-10 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm">With Photos</p>
                    <p className="text-3xl font-bold">{stats.with_photos}</p>
                  </div>
                  <Camera className="w-10 h-10 text-amber-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-sm">Emailed</p>
                    <p className="text-3xl font-bold">{stats.emailed}</p>
                  </div>
                  <Mail className="w-10 h-10 text-cyan-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              POD Reports
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Batch Exports
            </TabsTrigger>
          </TabsList>

          {/* POD Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <CardTitle className="text-lg">Delivery Reports</CardTitle>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search reports..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-48"
                      />
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-36"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-36"
                      />
                    </div>

                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="refused">Refused</SelectItem>
                        <SelectItem value="not_home">Not Home</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={fetchPods}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedPods.length > 0 && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedPods.length} selected
                    </span>
                    <Button
                      size="sm"
                      onClick={sendBulkEmails}
                      disabled={emailSending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {emailSending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Email Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPods([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : pods.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No POD reports found</p>
                  </div>
                ) : (
                  <>
                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left">
                              <Checkbox
                                checked={selectedPods.length === pods.length}
                                onCheckedChange={toggleAllPods}
                              />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Report #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Customer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Delivered
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Proof
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pods.map((pod) => (
                            <tr key={pod.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Checkbox
                                  checked={selectedPods.includes(pod.id)}
                                  onCheckedChange={() => togglePodSelection(pod.id)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm text-blue-600">
                                  {pod.report_number}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">{pod.customer_name}</p>
                                  <p className="text-xs text-gray-500">{pod.customer_email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm">{pod.product_name || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-medium">
                                  {pod.quantity_delivered} / {pod.quantity_ordered}
                                </span>
                                <span className="text-gray-500 text-sm ml-1">{pod.unit}</span>
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(pod.delivery_status)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600">
                                  {formatDate(pod.delivery_timestamp)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {pod.signature_data && (
                                    <span title="Has Signature">
                                      <PenTool className="w-4 h-4 text-green-600" />
                                    </span>
                                  )}
                                  {pod.photo_urls && pod.photo_urls.length > 0 && (
                                    <span title="Has Photos">
                                      <Image className="w-4 h-4 text-blue-600" />
                                    </span>
                                  )}
                                  {pod.emailed_to_customer && (
                                    <span title="Emailed">
                                      <Mail className="w-4 h-4 text-purple-600" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => viewPod(pod)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openEmailModal(pod)}
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {pods.length} of {totalCount} reports
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => p - 1)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(p => p + 1)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Exports Tab */}
          <TabsContent value="batch">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* New Export */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    New Batch Export
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={batchDateFrom}
                      onChange={(e) => setBatchDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={batchDateTo}
                      onChange={(e) => setBatchDateTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Status Filter</Label>
                    <Select value={batchStatus} onValueChange={setBatchStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="refused">Refused</SelectItem>
                        <SelectItem value="not_home">Not Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={runBatchExport}
                    disabled={batchExporting}
                  >
                    {batchExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Generate Export
                  </Button>
                </CardContent>
              </Card>

              {/* Export History */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Export History</CardTitle>
                </CardHeader>
                <CardContent>
                  {batchExports.length === 0 ? (
                    <div className="text-center py-8">
                      <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No batch exports yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {batchExports.map((exp) => (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {exp.date_from || 'All'} to {exp.date_to || 'All'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {exp.total_reports} reports • {formatDate(exp.created_at)}
                            </p>
                          </div>
                          <Badge
                            className={
                              exp.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : exp.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {exp.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* View POD Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                POD Report - {selectedPod?.report_number}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto border rounded-lg bg-white">
              <iframe
                srcDoc={podHtml}
                className="w-full h-[60vh]"
                title="POD Report"
              />
            </div>

            <DialogFooter className="flex-shrink-0 gap-2">
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={printPod}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={downloadPod}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => {
                setViewModalOpen(false);
                if (selectedPod) openEmailModal(selectedPod);
              }}>
                <Mail className="w-4 h-4 mr-2" />
                Email to Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email POD Modal */}
        <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email POD Report
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Report Number</p>
                <p className="font-mono font-medium">{selectedPod?.report_number}</p>
              </div>

              <div>
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  The POD report will be sent as an HTML attachment along with a summary email.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendEmail}
                disabled={emailSending || !emailRecipient}
              >
                {emailSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
