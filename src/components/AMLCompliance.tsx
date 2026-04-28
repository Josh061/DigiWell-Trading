import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  BookOpen,
  UserCheck,
  Search,
  AlertTriangle,
  FileText,
  Clock,
  Ban,
  GraduationCap,
  BarChart3,
  Scale,
  ChevronRight,
  ChevronDown,
  Printer,
  Download,
  ArrowUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  Building,
  Globe,
  Lock,
  Database,
  Activity,
  Flag,
  FileSearch,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Landmark,
  Briefcase,
  CreditCard,
  TrendingUp,
  Target,
  Layers,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Award
} from 'lucide-react';

interface Section {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface ComplianceStatusProps {
  onNavigateToKYC?: () => void;
}

export default function AMLCompliance({ onNavigateToKYC }: ComplianceStatusProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['aml-overview']);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const expandAll = () => {
    setExpandedSections(sections.map(s => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  // Compliance Status Indicators
  const complianceMetrics = [
    { label: 'KYC Verification', status: 'active', percentage: 98, color: 'green' },
    { label: 'Transaction Monitoring', status: 'active', percentage: 100, color: 'green' },
    { label: 'Sanctions Screening', status: 'active', percentage: 100, color: 'green' },
    { label: 'Staff Training', status: 'active', percentage: 95, color: 'green' },
    { label: 'Risk Assessment', status: 'active', percentage: 92, color: 'amber' },
    { label: 'SAR Filing', status: 'active', percentage: 100, color: 'green' }
  ];

  const sections: Section[] = [
    {
      id: 'aml-overview',
      number: 1,
      title: 'AML Policy Overview',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            <span className="text-[#D4AF37] font-semibold">Digiwell Trading</span> is committed to maintaining the highest 
            standards of Anti-Money Laundering (AML) compliance. Our comprehensive AML program is designed to prevent, 
            detect, and report suspicious activities that may involve money laundering or terrorist financing.
          </p>

          {/* Policy Objectives */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="text-white font-semibold text-lg">Policy Objectives</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Prevent the use of Digiwell Trading for money laundering activities</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Comply with all applicable AML laws and regulations</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Protect the integrity of the petroleum trading ecosystem</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Maintain robust systems for detecting suspicious transactions</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Report suspicious activities to relevant authorities</span>
              </li>
            </ul>
          </div>

          {/* Compliance Framework */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Compliance Framework</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <Shield className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                <p className="text-white font-medium">Prevention</p>
                <p className="text-slate-400 text-xs">KYC & Due Diligence</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-white font-medium">Detection</p>
                <p className="text-slate-400 text-xs">Transaction Monitoring</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <Flag className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-white font-medium">Reporting</p>
                <p className="text-slate-400 text-xs">SAR & Regulatory</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Our AML program is reviewed annually by independent auditors and updated to reflect regulatory changes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'cdd',
      number: 2,
      title: 'Customer Due Diligence (CDD)',
      icon: UserCheck,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Customer Due Diligence (CDD) is the cornerstone of our AML program. We verify the identity of all users 
            and assess the risk they may pose before allowing them to trade on our platform.
          </p>

          {/* Standard CDD Requirements */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Standard CDD Requirements</h4>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00D4FF]" />
                  Individual Traders
                </h5>
                <ul className="space-y-1 text-slate-300 text-sm">
                  <li>• Government-issued photo ID (passport, national ID, driver's license)</li>
                  <li>• Proof of address (utility bill, bank statement - less than 3 months old)</li>
                  <li>• Source of funds declaration</li>
                  <li>• Tax identification number</li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#D4AF37]" />
                  Corporate Entities
                </h5>
                <ul className="space-y-1 text-slate-300 text-sm">
                  <li>• Certificate of incorporation</li>
                  <li>• Memorandum and Articles of Association</li>
                  <li>• Board resolution authorizing trading</li>
                  <li>• Ultimate Beneficial Owner (UBO) identification</li>
                  <li>• Director and shareholder information</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CDD Process Flow */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">CDD Verification Process</h4>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-[#D4AF37] font-bold text-sm">1</span>
                </div>
                <p className="text-white text-sm font-medium">Document Collection</p>
                <p className="text-slate-400 text-xs">Upload required documents</p>
              </div>
              <div className="hidden md:flex items-center">
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold text-sm">2</span>
                </div>
                <p className="text-white text-sm font-medium">Identity Verification</p>
                <p className="text-slate-400 text-xs">Automated & manual checks</p>
              </div>
              <div className="hidden md:flex items-center">
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-400 font-bold text-sm">3</span>
                </div>
                <p className="text-white text-sm font-medium">Risk Assessment</p>
                <p className="text-slate-400 text-xs">Assign risk rating</p>
              </div>
              <div className="hidden md:flex items-center">
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 bg-slate-900/50 p-3 rounded-lg text-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-400 font-bold text-sm">4</span>
                </div>
                <p className="text-white text-sm font-medium">Approval</p>
                <p className="text-slate-400 text-xs">Account activation</p>
              </div>
            </div>
          </div>

          {/* Link to KYC */}
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <p className="text-[#D4AF37] font-medium">Complete Your KYC Verification</p>
                  <p className="text-slate-400 text-sm">Verify your identity to start trading on Digiwell</p>
                </div>
              </div>
              {onNavigateToKYC && (
                <Button 
                  onClick={onNavigateToKYC}
                  className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
                >
                  Start KYC
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'edd',
      number: 3,
      title: 'Enhanced Due Diligence (EDD)',
      icon: Search,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Enhanced Due Diligence (EDD) applies additional scrutiny to high-risk customers, transactions, 
            and business relationships that present elevated money laundering or terrorist financing risks.
          </p>

          {/* High-Risk Categories */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-amber-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">High-Risk Categories Requiring EDD</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-red-500/20 text-red-400 mt-0.5">PEP</Badge>
                <span className="text-slate-300 text-sm">Politically Exposed Persons and their associates</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-amber-500/20 text-amber-400 mt-0.5">High-Risk</Badge>
                <span className="text-slate-300 text-sm">Customers from high-risk jurisdictions</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-purple-500/20 text-purple-400 mt-0.5">Complex</Badge>
                <span className="text-slate-300 text-sm">Complex ownership structures or shell companies</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-blue-500/20 text-blue-400 mt-0.5">Large</Badge>
                <span className="text-slate-300 text-sm">Unusually large or frequent transactions</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-cyan-500/20 text-cyan-400 mt-0.5">Cash</Badge>
                <span className="text-slate-300 text-sm">Cash-intensive businesses</span>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg flex items-start gap-3">
                <Badge className="bg-pink-500/20 text-pink-400 mt-0.5">Adverse</Badge>
                <span className="text-slate-300 text-sm">Adverse media or negative news coverage</span>
              </div>
            </div>
          </div>

          {/* EDD Measures */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Enhanced Due Diligence Measures</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Extended Document Requirements</span>
                  <p className="text-slate-400 text-sm">Additional identity documents and verification sources</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Source of Wealth Investigation</span>
                  <p className="text-slate-400 text-sm">Detailed verification of how wealth was accumulated</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Senior Management Approval</span>
                  <p className="text-slate-400 text-sm">All high-risk relationships require executive sign-off</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Enhanced Monitoring</span>
                  <p className="text-slate-400 text-sm">Increased transaction monitoring frequency and thresholds</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Periodic Reviews</span>
                  <p className="text-slate-400 text-sm">More frequent customer information updates (every 6 months)</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Failure to satisfy EDD requirements may result in account restrictions or termination.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'transaction-monitoring',
      number: 4,
      title: 'Transaction Monitoring',
      icon: Activity,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Our advanced transaction monitoring system analyzes all trading activities in real-time to detect 
            patterns indicative of money laundering, terrorist financing, or other illicit activities.
          </p>

          {/* Monitoring System */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <h4 className="text-white font-semibold text-lg">Automated Monitoring System</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Real-Time Analysis
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Transaction velocity monitoring
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Volume threshold alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Geographic risk assessment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Counterparty risk scoring
                  </li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Pattern Detection
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Structuring detection (smurfing)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Round-tripping identification
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Layering pattern analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Anomaly detection algorithms
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Alert Thresholds</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-500/20 text-yellow-400">Low</Badge>
                  <span className="text-slate-300 text-sm">Single transaction &gt; $10,000</span>
                </div>
                <span className="text-slate-400 text-sm">Automated review</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-500/20 text-amber-400">Medium</Badge>
                  <span className="text-slate-300 text-sm">Daily volume &gt; $50,000</span>
                </div>
                <span className="text-slate-400 text-sm">Analyst review</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-500/20 text-red-400">High</Badge>
                  <span className="text-slate-300 text-sm">Weekly volume &gt; $250,000</span>
                </div>
                <span className="text-slate-400 text-sm">Senior review</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500/20 text-purple-400">Critical</Badge>
                  <span className="text-slate-300 text-sm">Pattern match or sanctions hit</span>
                </div>
                <span className="text-slate-400 text-sm">Immediate escalation</span>
              </div>
            </div>
          </div>

          <div className="bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg p-4">
            <p className="text-[#00D4FF] text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Our system processes over 10,000 transactions daily with 99.9% uptime and sub-second alert generation.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'sar',
      number: 5,
      title: 'Suspicious Activity Reporting (SAR)',
      icon: Flag,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            When suspicious activity is identified, Digiwell Trading is obligated to file Suspicious Activity Reports (SARs) 
            with the relevant Financial Intelligence Units (FIUs) in accordance with applicable regulations.
          </p>

          {/* SAR Triggers */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">SAR Triggers (Red Flags)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Transactions inconsistent with customer's profile</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Unusual patterns of trading activity</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Attempts to avoid reporting thresholds</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Transactions involving high-risk jurisdictions</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Reluctance to provide required information</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Use of multiple accounts without business reason</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Rapid movement of funds in and out</span>
              </div>
              <div className="flex items-start gap-2 text-slate-300 text-sm">
                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Transactions with no apparent economic purpose</span>
              </div>
            </div>
          </div>

          {/* SAR Process */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">SAR Filing Process</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Detection</p>
                  <p className="text-slate-400 text-sm">Automated system or staff identifies suspicious activity</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Investigation</p>
                  <p className="text-slate-400 text-sm">Compliance team reviews and documents findings</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg">
                <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Decision</p>
                  <p className="text-slate-400 text-sm">MLRO determines if SAR filing is warranted</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-lg">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-400 font-bold text-sm">4</span>
                </div>
                <div>
                  <p className="text-white font-medium">Filing</p>
                  <p className="text-slate-400 text-sm">SAR submitted to FIU within required timeframe</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tipping off: It is a criminal offense to inform a customer that a SAR has been filed about them.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'record-keeping',
      number: 6,
      title: 'Record Keeping Requirements',
      icon: Database,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Digiwell Trading maintains comprehensive records of all customer information, transactions, and compliance 
            activities as required by AML regulations and best practices.
          </p>

          {/* Retention Periods */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="text-white font-semibold text-lg">Record Retention Periods</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-blue-400" />
                  <span className="text-slate-300">Customer identification documents</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400">7 Years</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  <span className="text-slate-300">Transaction records</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400">7 Years</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="text-slate-300">Due diligence records</span>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400">7 Years</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Flag className="w-5 h-5 text-red-400" />
                  <span className="text-slate-300">SAR documentation</span>
                </div>
                <Badge className="bg-red-500/20 text-red-400">10 Years</Badge>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span className="text-slate-300">Monitoring alerts & investigations</span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400">7 Years</Badge>
              </div>
            </div>
          </div>

          {/* Record Types */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Records Maintained</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-[#00D4FF] font-medium mb-2">Customer Records</h5>
                <ul className="space-y-1 text-slate-300 text-sm">
                  <li>• Identity verification documents</li>
                  <li>• Account opening forms</li>
                  <li>• Risk assessments</li>
                  <li>• Correspondence history</li>
                </ul>
              </div>
              <div>
                <h5 className="text-[#D4AF37] font-medium mb-2">Transaction Records</h5>
                <ul className="space-y-1 text-slate-300 text-sm">
                  <li>• Order confirmations</li>
                  <li>• Payment records</li>
                  <li>• Delivery documentation</li>
                  <li>• Escrow agreements</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              All records are stored securely with AES-256 encryption and access is restricted to authorized personnel.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'sanctions-screening',
      number: 7,
      title: 'Sanctions Screening',
      icon: Ban,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Digiwell Trading screens all customers and transactions against international sanctions lists to ensure 
            compliance with global sanctions regimes and prevent prohibited dealings.
          </p>

          {/* Sanctions Lists */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Sanctions Lists Screened</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500/20 text-blue-400">UN</Badge>
                  <span className="text-white font-medium text-sm">United Nations</span>
                </div>
                <p className="text-slate-400 text-xs">UN Security Council Consolidated List</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500/20 text-red-400">OFAC</Badge>
                  <span className="text-white font-medium text-sm">US Treasury</span>
                </div>
                <p className="text-slate-400 text-xs">SDN List, Sectoral Sanctions</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500/20 text-purple-400">EU</Badge>
                  <span className="text-white font-medium text-sm">European Union</span>
                </div>
                <p className="text-slate-400 text-xs">EU Consolidated Financial Sanctions List</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-amber-500/20 text-amber-400">UK</Badge>
                  <span className="text-white font-medium text-sm">United Kingdom</span>
                </div>
                <p className="text-slate-400 text-xs">HM Treasury Sanctions List</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500/20 text-green-400">FATF</Badge>
                  <span className="text-white font-medium text-sm">FATF</span>
                </div>
                <p className="text-slate-400 text-xs">High-Risk & Non-Cooperative Jurisdictions</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-cyan-500/20 text-cyan-400">PEP</Badge>
                  <span className="text-white font-medium text-sm">PEP Lists</span>
                </div>
                <p className="text-slate-400 text-xs">Global Politically Exposed Persons Database</p>
              </div>
            </div>
          </div>

          {/* Screening Process */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Screening Frequency</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-24 text-slate-400 text-sm">Onboarding</div>
                <div className="flex-1 bg-slate-900/50 p-2 rounded">
                  <span className="text-green-400 text-sm">Full screening against all lists</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-slate-400 text-sm">Daily</div>
                <div className="flex-1 bg-slate-900/50 p-2 rounded">
                  <span className="text-blue-400 text-sm">Batch screening of all active customers</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-slate-400 text-sm">Real-time</div>
                <div className="flex-1 bg-slate-900/50 p-2 rounded">
                  <span className="text-amber-400 text-sm">Transaction counterparty screening</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-slate-400 text-sm">List Updates</div>
                <div className="flex-1 bg-slate-900/50 p-2 rounded">
                  <span className="text-purple-400 text-sm">Automatic re-screening on list updates</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Any sanctions match results in immediate account freeze and escalation to the compliance team.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'staff-training',
      number: 8,
      title: 'Staff Training Programs',
      icon: GraduationCap,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            All Digiwell Trading employees receive comprehensive AML training to ensure they understand their 
            obligations and can effectively identify and report suspicious activities.
          </p>

          {/* Training Programs */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Training Programs</h4>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-medium">Onboarding Training</h5>
                  <Badge className="bg-green-500/20 text-green-400">Mandatory</Badge>
                </div>
                <p className="text-slate-400 text-sm mb-2">All new employees within first 30 days</p>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• AML fundamentals and regulatory framework</li>
                  <li>• Company policies and procedures</li>
                  <li>• Red flag identification</li>
                  <li>• Reporting obligations</li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-medium">Annual Refresher</h5>
                  <Badge className="bg-blue-500/20 text-blue-400">Yearly</Badge>
                </div>
                <p className="text-slate-400 text-sm mb-2">All staff members annually</p>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Regulatory updates and changes</li>
                  <li>• Case studies and lessons learned</li>
                  <li>• New typologies and trends</li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-medium">Specialized Training</h5>
                  <Badge className="bg-amber-500/20 text-amber-400">Role-Based</Badge>
                </div>
                <p className="text-slate-400 text-sm mb-2">Compliance team and senior management</p>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Advanced investigation techniques</li>
                  <li>• SAR preparation and filing</li>
                  <li>• Regulatory examination preparation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Training Metrics */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Training Completion Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-green-400">98%</p>
                <p className="text-slate-400 text-xs">Completion Rate</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">4.8/5</p>
                <p className="text-slate-400 text-xs">Avg. Assessment Score</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">12</p>
                <p className="text-slate-400 text-xs">Training Modules</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-amber-400">24h</p>
                <p className="text-slate-400 text-xs">Annual Hours/Employee</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-400 text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Employees who fail to complete mandatory training may face disciplinary action including suspension.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'risk-assessment',
      number: 9,
      title: 'Risk Assessment Methodology',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Digiwell Trading employs a comprehensive risk-based approach to AML compliance, assessing risks at 
            the customer, product, geographic, and channel levels to allocate resources effectively.
          </p>

          {/* Risk Categories */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Risk Assessment Categories</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-[#D4AF37] font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Customer Risk
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Customer type (individual/corporate)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Business nature and industry
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    PEP status and associations
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Adverse media presence
                  </li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Geographic Risk
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Country of residence/incorporation
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Transaction destinations
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    FATF grey/black list status
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    Corruption perception index
                  </li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Product Risk
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Product complexity
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Transaction value and frequency
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Payment methods used
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    Third-party involvement
                  </li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h5 className="text-cyan-400 font-medium mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Channel Risk
                </h5>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    Non-face-to-face transactions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    Third-party introducers
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    Digital asset involvement
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    Cross-border transactions
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Risk Rating Scale */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Customer Risk Rating Scale</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge className="bg-green-500/20 text-green-400 w-20 justify-center">Low</Badge>
                <div className="flex-1">
                  <Progress value={25} className="h-3" />
                </div>
                <span className="text-slate-400 text-sm w-32">Standard CDD</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-amber-500/20 text-amber-400 w-20 justify-center">Medium</Badge>
                <div className="flex-1">
                  <Progress value={50} className="h-3" />
                </div>
                <span className="text-slate-400 text-sm w-32">Enhanced monitoring</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-orange-500/20 text-orange-400 w-20 justify-center">High</Badge>
                <div className="flex-1">
                  <Progress value={75} className="h-3" />
                </div>
                <span className="text-slate-400 text-sm w-32">EDD required</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-red-500/20 text-red-400 w-20 justify-center">Critical</Badge>
                <div className="flex-1">
                  <Progress value={100} className="h-3" />
                </div>
                <span className="text-slate-400 text-sm w-32">Senior approval</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Risk assessments are reviewed quarterly and updated whenever there are material changes to customer profiles.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'regulatory-compliance',
      number: 10,
      title: 'Regulatory Compliance',
      icon: Scale,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            Digiwell Trading complies with international AML standards set by the Financial Action Task Force (FATF) 
            and local regulations in all jurisdictions where we operate.
          </p>

          {/* FATF Compliance */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-[#D4AF37]/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Landmark className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="text-white font-semibold text-lg">FATF Recommendations Compliance</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium text-sm">Rec. 10 - Customer Due Diligence</span>
                  <p className="text-slate-400 text-xs">Full CDD/EDD implementation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium text-sm">Rec. 11 - Record Keeping</span>
                  <p className="text-slate-400 text-xs">7+ year retention policy</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium text-sm">Rec. 12 - PEPs</span>
                  <p className="text-slate-400 text-xs">Enhanced PEP screening</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium text-sm">Rec. 20 - Suspicious Transaction Reporting</span>
                  <p className="text-slate-400 text-xs">SAR filing procedures</p>
                </div>
              </div>
            </div>
          </div>

          {/* Local Regulations */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Local Regulatory Compliance</h4>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500/20 text-green-400">Nigeria</Badge>
                  <span className="text-white font-medium text-sm">Primary Jurisdiction</span>
                </div>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Money Laundering (Prohibition) Act 2011 (as amended)</li>
                  <li>• Central Bank of Nigeria (CBN) AML/CFT Regulations</li>
                  <li>• Nigerian Financial Intelligence Unit (NFIU) Guidelines</li>
                  <li>• Special Control Unit against Money Laundering (SCUML)</li>
                </ul>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-500/20 text-blue-400">International</Badge>
                  <span className="text-white font-medium text-sm">Cross-Border Operations</span>
                </div>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• EU 6th Anti-Money Laundering Directive (6AMLD)</li>
                  <li>• UK Money Laundering Regulations 2017</li>
                  <li>• US Bank Secrecy Act (BSA) / FinCEN Requirements</li>
                  <li>• UAE Federal AML Law and CBUAE Regulations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Compliance Certifications */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-green-500/20 text-green-400 mb-2">FATF</Badge>
              <p className="text-slate-400 text-xs">Compliant</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-blue-500/20 text-blue-400 mb-2">CBN</Badge>
              <p className="text-slate-400 text-xs">Licensed</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-purple-500/20 text-purple-400 mb-2">SCUML</Badge>
              <p className="text-slate-400 text-xs">Registered</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-amber-500/20 text-amber-400 mb-2">ISO 37001</Badge>
              <p className="text-slate-400 text-xs">Certified</p>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Our compliance program undergoes annual independent audits and regulatory examinations.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AML Compliance</h1>
            <p className="text-white/60">Anti-Money Laundering Program</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50">
            Last Updated: January 2026
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
            FATF Compliant
          </Badge>
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50">
            CBN Approved
          </Badge>
        </div>
      </div>

      {/* Compliance Status Dashboard */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            Compliance Status Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {complianceMetrics.map((metric, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">{metric.label}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    metric.color === 'green' ? 'bg-green-400' : 'bg-amber-400'
                  } animate-pulse`}></div>
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-xl font-bold ${
                    metric.color === 'green' ? 'text-green-400' : 'text-amber-400'
                  }`}>{metric.percentage}%</span>
                </div>
                <Progress 
                  value={metric.percentage} 
                  className="h-1 mt-2" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation & Actions */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Collapse All
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  if (!expandedSections.includes(section.id)) {
                    toggleSection(section.id);
                  }
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 transition-colors group"
              >
                <span className="text-[#D4AF37] font-mono text-sm">{section.number}.</span>
                <span className="text-slate-300 text-sm ml-2 group-hover:text-white transition-colors">
                  {section.title}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.includes(section.id);

          return (
            <Card
              key={section.id}
              id={section.id}
              className="bg-slate-900/50 border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3 hover:bg-slate-800/50 transition-colors">
                  <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 rounded-lg flex items-center justify-center border border-[#D4AF37]/30">
                        <Icon className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <span className="text-[#D4AF37] font-mono mr-2">{section.number}.</span>
                        <span>{section.title}</span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-6 border-t border-slate-700/50">
                  <div className="pt-4">{section.content}</div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Compliance Commitment Section */}
      <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Our Commitment to Compliance</h3>
          <p className="text-slate-300 mb-4 max-w-2xl mx-auto">
            Digiwell Trading is committed to maintaining the highest standards of AML compliance. 
            We continuously invest in technology, training, and processes to prevent financial crime 
            and protect the integrity of the global petroleum trading ecosystem.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              FATF Compliant
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              CBN Licensed
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-4 py-2">
              <Award className="w-4 h-4 mr-2" />
              ISO 37001 Certified
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Questions about our AML program?</h3>
              <p className="text-slate-400 text-sm">
                Contact our Compliance Team at <span className="text-[#D4AF37]">compliance@digiwelltrading.com</span>
              </p>
            </div>
            <div className="flex gap-3">
              {onNavigateToKYC && (
                <Button 
                  onClick={onNavigateToKYC}
                  variant="outline"
                  className="border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Start KYC
                </Button>
              )}
              <Button className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 hover:opacity-90">
                <Mail className="w-4 h-4 mr-2" />
                Contact Compliance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 shadow-lg z-50"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
    </div>
  );
}
