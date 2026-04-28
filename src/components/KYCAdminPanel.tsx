import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function KYCAdminPanel() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data } = await supabase.functions.invoke('kyc-verification-trigger', {
        body: { action: 'list_all' }
      });
      if (data?.submissions) setSubmissions(data.submissions);
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, status: string) => {
    try {
      await supabase.functions.invoke('kyc-verification-trigger', {
        body: {
          action: 'review',
          submissionId,
          status,
          reviewerId: 'admin_' + Math.random().toString(36).substr(2, 9),
          rejectionReason: status === 'rejected' ? rejectionReason : null,
          verificationNotes: reviewNotes
        }
      });
      toast.success(`KYC ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedSubmission(null);
      loadSubmissions();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: any = {
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle }
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return <Badge variant={variant}><Icon className="w-3 h-3 mr-1" />{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>KYC Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading submissions...</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{sub.user_name}</p>
                    <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(sub.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(sub.status)}
                    <Button size="sm" variant="outline" onClick={() => setSelectedSubmission(sub)}>
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review KYC Submission</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.user_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.user_email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Business</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.business_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <p className="text-sm text-muted-foreground">{selectedSubmission.business_type || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Documents</p>
                <div className="space-y-1">
                  {selectedSubmission.id_document_url && <p className="text-xs">✓ ID Document</p>}
                  {selectedSubmission.address_document_url && <p className="text-xs">✓ Address Proof</p>}
                  {selectedSubmission.business_document_url && <p className="text-xs">✓ Business Registration</p>}
                </div>
              </div>
              <Textarea placeholder="Review notes..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
              <Textarea placeholder="Rejection reason (if rejecting)..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => handleReview(selectedSubmission.id, 'approved')} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button onClick={() => handleReview(selectedSubmission.id, 'rejected')} variant="destructive" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
