import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  user_email: string;
  action_type: string;
  action_details: any;
  ip_address: string;
  created_at: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchEmail, actionTypeFilter, startDate, endDate]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (searchEmail) {
      filtered = filtered.filter(log => 
        log.user_email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (actionTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionTypeFilter);
    }

    if (startDate) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) >= new Date(startDate)
      );
    }

    if (endDate) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) <= new Date(endDate + 'T23:59:59')
      );
    }

    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User Email', 'Action Type', 'IP Address', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email || 'N/A',
      log.action_type,
      log.ip_address,
      JSON.stringify(log.action_details || {})
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="kyc_submission">KYC Submission</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="escrow_created">Escrow Created</SelectItem>
                <SelectItem value="escrow_released">Escrow Released</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
            <Button onClick={exportToCSV} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No logs found</TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.user_email || 'N/A'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {log.action_type}
                        </span>
                      </TableCell>
                      <TableCell>{log.ip_address}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {JSON.stringify(log.action_details || {})}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
