import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  BookOpen,
  Database,
  BarChart3,
  Users,
  Lock,
  Eye,
  Globe,
  Baby,
  Mail,
  ChevronRight,
  ChevronDown,
  Printer,
  Download,
  ArrowUp,
  AlertCircle,
  CheckCircle,
  Server,
  Smartphone,
  FileText,
  Cookie,
  Share2,
  Scale,
  UserCheck,
  Trash2,
  RefreshCw,
  Download as DownloadIcon,
  Key,
  ShieldCheck,
  MapPin,
  Clock,
  Building
} from 'lucide-react';

interface Section {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export default function PrivacyPolicy() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['data-collection']);
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

  const sections: Section[] = [
    {
      id: 'data-collection',
      number: 1,
      title: 'Data Collection',
      icon: Database,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            <span className="text-[#D4AF37] font-semibold">Digiwell Trading</span> collects various types of information 
            to provide and improve our petroleum trading services. We are committed to transparency about the data we collect.
          </p>
          
          {/* Personal Information */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Personal Information</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Full name, email address, and phone number</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Government-issued identification (for KYC verification)</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Business registration documents and company information</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Billing address and payment information</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Profile photos and signature specimens</span>
              </li>
            </ul>
          </div>

          {/* Trading Data */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h4 className="text-white font-semibold text-lg">Trading Data</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Transaction history and order details</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Bid and auction participation records</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Portfolio holdings and asset allocations</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Price alert preferences and notification settings</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">DigiCoin wallet balances and transaction logs</span>
              </li>
            </ul>
          </div>

          {/* Device Information */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Device & Technical Information</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">IP address and geolocation data</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Browser type, version, and operating system</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Device identifiers and hardware information</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Session duration and platform usage patterns</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Referral source and navigation paths</span>
              </li>
            </ul>
          </div>

          <div className="bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-lg p-4">
            <p className="text-[#00D4FF] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              We only collect data that is necessary for providing our services and ensuring platform security.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-usage',
      number: 2,
      title: 'Data Usage',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            We use the collected information for specific, legitimate purposes to enhance your trading experience 
            and maintain platform integrity.
          </p>

          {/* Trading Operations */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Trading Operations</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Processing and executing petroleum product orders</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Managing escrow accounts and secure payments</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Facilitating bid auctions and allocation processes</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Providing GPS tracking for shipment deliveries</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Managing DigiCoin wallet transactions</span>
              </li>
            </ul>
          </div>

          {/* Analytics */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Analytics & Improvement</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Analyzing platform usage to improve user experience</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Generating market intelligence and price analytics</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Identifying trends and optimizing trading algorithms</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Conducting security audits and fraud detection</span>
              </li>
            </ul>
          </div>

          {/* Marketing */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Marketing & Communications</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Sending price alerts and market notifications</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Providing order status updates and delivery tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Sharing relevant product offerings and promotions</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-[#D4AF37] mt-1 flex-shrink-0" />
                <span className="text-slate-300">Distributing platform updates and policy changes</span>
              </li>
            </ul>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-400 text-sm">
                You can opt out of marketing communications at any time through your account settings.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-sharing',
      number: 3,
      title: 'Data Sharing',
      icon: Share2,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            We may share your information with third parties only when necessary to provide our services 
            or when required by law. We never sell your personal data.
          </p>

          {/* Third Parties */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Third-Party Service Providers</h4>
            </div>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <Badge className="bg-blue-500/20 text-blue-400 mt-0.5">Payment</Badge>
                <span className="text-slate-300 text-sm">Stripe, Flutterwave, and banking partners for payment processing</span>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <Badge className="bg-green-500/20 text-green-400 mt-0.5">Logistics</Badge>
                <span className="text-slate-300 text-sm">Shipping carriers and GPS tracking service providers</span>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <Badge className="bg-amber-500/20 text-amber-400 mt-0.5">KYC</Badge>
                <span className="text-slate-300 text-sm">Identity verification and compliance partners</span>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <Badge className="bg-purple-500/20 text-purple-400 mt-0.5">Analytics</Badge>
                <span className="text-slate-300 text-sm">OilPrice.com, Investing.com and market data providers</span>
              </div>
              <div className="flex items-start gap-3 bg-slate-900/50 p-3 rounded-lg">
                <Badge className="bg-cyan-500/20 text-cyan-400 mt-0.5">Cloud</Badge>
                <span className="text-slate-300 text-sm">AWS and Supabase for secure data storage</span>
              </div>
            </div>
          </div>

          {/* Legal Requirements */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Legal Requirements</h4>
            </div>
            <p className="text-slate-300 mb-4">We may disclose your information when required to:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Comply with applicable laws, regulations, or legal processes</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Respond to valid government requests and court orders</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Enforce our Terms of Service and protect our rights</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Prevent fraud, money laundering, or illegal activities</span>
              </li>
              <li className="flex items-start gap-3">
                <ChevronRight className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Protect the safety and security of our users</span>
              </li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              We never sell your personal information to third parties for marketing purposes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'data-security',
      number: 4,
      title: 'Data Security',
      icon: Lock,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            We implement industry-leading security measures to protect your data from unauthorized access, 
            disclosure, alteration, or destruction.
          </p>

          {/* Encryption */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Encryption</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">TLS 1.3 encryption for all data in transit</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">AES-256 encryption for data at rest</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">End-to-end encryption for sensitive communications</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Secure hashing algorithms for password storage</span>
              </li>
            </ul>
          </div>

          {/* Access Controls */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-white font-semibold text-lg">Access Controls</h4>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Role-based access control (RBAC) for all systems</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Multi-factor authentication (MFA) for user accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Regular security audits and penetration testing</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Comprehensive audit logging for all data access</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                <span className="text-slate-300">Automated threat detection and response systems</span>
              </li>
            </ul>
          </div>

          {/* Security Certifications */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-green-500/20 text-green-400 mb-2">SOC 2</Badge>
              <p className="text-slate-400 text-xs">Type II Certified</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-blue-500/20 text-blue-400 mb-2">ISO 27001</Badge>
              <p className="text-slate-400 text-xs">Compliant</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-purple-500/20 text-purple-400 mb-2">GDPR</Badge>
              <p className="text-slate-400 text-xs">Compliant</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
              <Badge className="bg-amber-500/20 text-amber-400 mb-2">PCI DSS</Badge>
              <p className="text-slate-400 text-xs">Level 1</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'user-rights',
      number: 5,
      title: 'User Rights',
      icon: UserCheck,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            You have specific rights regarding your personal data. We are committed to helping you exercise 
            these rights easily and transparently.
          </p>

          <div className="grid gap-4">
            {/* Right to Access */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-2">Right to Access</h4>
                  <p className="text-slate-300 text-sm">
                    You can request a copy of all personal data we hold about you. We will provide this 
                    information within 30 days of your request in a commonly used electronic format.
                  </p>
                </div>
              </div>
            </div>

            {/* Right to Correction */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-2">Right to Correction</h4>
                  <p className="text-slate-300 text-sm">
                    You can update or correct inaccurate personal information at any time through your 
                    account settings or by contacting our support team.
                  </p>
                </div>
              </div>
            </div>

            {/* Right to Deletion */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-2">Right to Deletion</h4>
                  <p className="text-slate-300 text-sm">
                    You can request deletion of your personal data, subject to legal retention requirements. 
                    We will delete your data within 30 days unless we are legally required to retain it.
                  </p>
                </div>
              </div>
            </div>

            {/* Right to Portability */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DownloadIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-2">Right to Data Portability</h4>
                  <p className="text-slate-300 text-sm">
                    You can request your data in a structured, machine-readable format (JSON, CSV) to 
                    transfer to another service provider.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4">
            <p className="text-[#D4AF37] text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              To exercise any of these rights, contact us at privacy@digiwelltrading.com or through your account settings.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'cookies-policy',
      number: 6,
      title: 'Cookies Policy',
      icon: Cookie,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            We use cookies and similar tracking technologies to enhance your experience on our platform. 
            Here's how we use them and how you can control them.
          </p>

          <div className="grid gap-4">
            {/* Essential Cookies */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-green-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-green-400" />
                  </div>
                  <h4 className="text-white font-semibold">Essential Cookies</h4>
                </div>
                <Badge className="bg-green-500/20 text-green-400">Required</Badge>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                These cookies are necessary for the platform to function properly and cannot be disabled.
              </p>
              <ul className="space-y-1 text-slate-400 text-sm">
                <li>• Authentication and session management</li>
                <li>• Security features and fraud prevention</li>
                <li>• Load balancing and server optimization</li>
              </ul>
            </div>

            {/* Analytics Cookies */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-blue-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="text-white font-semibold">Analytics Cookies</h4>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400">Optional</Badge>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Help us understand how visitors interact with our platform to improve user experience.
              </p>
              <ul className="space-y-1 text-slate-400 text-sm">
                <li>• Page views and navigation patterns</li>
                <li>• Feature usage statistics</li>
                <li>• Performance monitoring</li>
              </ul>
            </div>

            {/* Marketing Cookies */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-amber-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-400" />
                  </div>
                  <h4 className="text-white font-semibold">Marketing Cookies</h4>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400">Optional</Badge>
              </div>
              <p className="text-slate-300 text-sm mb-3">
                Used to deliver relevant advertisements and measure campaign effectiveness.
              </p>
              <ul className="space-y-1 text-slate-400 text-sm">
                <li>• Personalized product recommendations</li>
                <li>• Retargeting campaigns</li>
                <li>• Social media integration</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="text-white font-medium mb-3">Managing Your Cookie Preferences</h4>
            <p className="text-slate-300 text-sm mb-3">
              You can manage your cookie preferences through:
            </p>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Your browser settings (block or delete cookies)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Our cookie consent banner on first visit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Account settings under Privacy Preferences
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'international-transfers',
      number: 7,
      title: 'International Data Transfers',
      icon: Globe,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            As a global petroleum trading platform, we may transfer your data across international borders. 
            We ensure appropriate safeguards are in place for all transfers.
          </p>

          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <h4 className="text-white font-semibold text-lg">Data Storage Locations</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <MapPin className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-white font-medium">Nigeria</p>
                <p className="text-slate-400 text-xs">Primary Data Center</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <MapPin className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-white font-medium">European Union</p>
                <p className="text-slate-400 text-xs">GDPR Compliant</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                <MapPin className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-white font-medium">United States</p>
                <p className="text-slate-400 text-xs">AWS Infrastructure</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Transfer Safeguards</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Standard Contractual Clauses (SCCs)</span>
                  <p className="text-slate-400 text-sm">EU-approved contractual terms for data transfers</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Binding Corporate Rules</span>
                  <p className="text-slate-400 text-sm">Internal policies governing international transfers</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Adequacy Decisions</span>
                  <p className="text-slate-400 text-sm">Transfers to countries with adequate protection levels</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              All international data transfers comply with applicable data protection laws including GDPR, 
              NDPR (Nigeria Data Protection Regulation), and other relevant frameworks.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'childrens-privacy',
      number: 8,
      title: "Children's Privacy",
      icon: Baby,
      content: (
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Baby className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-lg">Age Restriction</h4>
                <p className="text-red-400 font-medium">Minimum Age: 18 Years</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Digiwell Trading is a B2B petroleum trading platform designed exclusively for adult users. 
              Our services are not intended for individuals under the age of 18.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Our Commitment</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">We do not knowingly collect personal information from children under 18</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">Our KYC verification process includes age verification</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">If we discover data from a minor, we will delete it immediately</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                <span className="text-slate-300">Parents/guardians can contact us to report underage accounts</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              If you believe a minor has provided us with personal information, please contact us immediately at privacy@digiwelltrading.com
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact-information',
      number: 9,
      title: 'Contact Information',
      icon: Mail,
      content: (
        <div className="space-y-6">
          <p className="text-slate-300 leading-relaxed">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
            please don't hesitate to contact us.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Data Protection Officer */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-[#D4AF37]/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Data Protection Officer</h4>
                  <p className="text-slate-400 text-sm">Privacy & Compliance</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#00D4FF]" />
                  dpo@digiwelltrading.com
                </p>
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00D4FF]" />
                  Response within 48 hours
                </p>
              </div>
            </div>

            {/* General Privacy Inquiries */}
            <div className="bg-slate-800/50 rounded-lg p-5 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Privacy Inquiries</h4>
                  <p className="text-slate-400 text-sm">General Questions</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#00D4FF]" />
                  privacy@digiwelltrading.com
                </p>
                <p className="text-slate-300 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00D4FF]" />
                  Response within 72 hours
                </p>
              </div>
            </div>
          </div>

          {/* Headquarters */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Digiwell Trading Headquarters</h4>
                <p className="text-slate-400 text-sm">Registered Office</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-300 text-sm">
                  Digiwell Trading Limited<br />
                  Plot 123, Victoria Island<br />
                  Lagos, Nigeria
                </p>
              </div>
              <div>
                <p className="text-slate-300 text-sm">
                  RC Number: 1234567<br />
                  Phone: +234 800 DIGIWELL<br />
                  Fax: +234 1 234 5678
                </p>
              </div>
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-slate-800/50 rounded-lg p-5 border border-slate-700">
            <h4 className="text-white font-semibold mb-4">Expected Response Times</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-[#D4AF37]">24h</p>
                <p className="text-slate-400 text-xs">Urgent Requests</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">48h</p>
                <p className="text-slate-400 text-xs">Data Requests</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-green-400">72h</p>
                <p className="text-slate-400 text-xs">General Inquiries</p>
              </div>
              <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">30d</p>
                <p className="text-slate-400 text-xs">Data Access</p>
              </div>
            </div>
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
          <div className="w-12 h-12 bg-gradient-to-br from-[#00D4FF] to-[#0099CC] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-white/60">Digiwell Trading Data Protection</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/50">
            Last Updated: January 2026
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
            GDPR Compliant
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50">
            NDPR Compliant
          </Badge>
        </div>
      </div>

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
                className="border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/10"
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
            <BookOpen className="w-5 h-5 text-[#00D4FF]" />
            Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                <span className="text-[#00D4FF] font-mono text-sm">{section.number}.</span>
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
                      <div className="w-10 h-10 bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/10 rounded-lg flex items-center justify-center border border-[#00D4FF]/30">
                        <Icon className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div>
                        <span className="text-[#00D4FF] font-mono mr-2">{section.number}.</span>
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

      {/* Acceptance Section */}
      <Card className="bg-gradient-to-br from-[#00D4FF]/10 to-[#00D4FF]/5 border-[#00D4FF]/30">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-[#00D4FF]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#00D4FF]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Your Privacy Matters</h3>
          <p className="text-slate-300 mb-4 max-w-2xl mx-auto">
            By using Digiwell Trading's platform, you acknowledge that you have read and understood this Privacy Policy. 
            We are committed to protecting your personal data and being transparent about how we use it.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              GDPR Compliant
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              NDPR Compliant
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/50 px-4 py-2">
              <Lock className="w-4 h-4 mr-2" />
              ISO 27001
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold mb-1">Questions about your privacy?</h3>
              <p className="text-slate-400 text-sm">
                Contact our Data Protection Officer at <span className="text-[#00D4FF]">dpo@digiwelltrading.com</span>
              </p>
            </div>
            <Button className="bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white hover:opacity-90">
              Contact Privacy Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scroll to Top Button */}
      <Button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#00D4FF] hover:bg-[#0099CC] text-white shadow-lg z-50"
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
    </div>
  );
}
