import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import SignaturePad, { SignatureData } from './SignaturePad';
import {
  FileText,
  Download,
  Eye,
  Search,
  Shield,
  Scale,
  Truck,
  AlertTriangle,
  Gavel,
  CreditCard,
  CheckCircle,
  Info,
  FileCheck,
  BookOpen,
  Building,
  Ship,
  Globe,
  Clock,
  Printer,
  Copy,
  ExternalLink,
  Handshake,
  PenTool,
  FileSignature,
  History,
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Hash
} from 'lucide-react';

interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  color: string;
  lastUpdated: string;
  version: string;
  pages: number;
  content: string;
  keyTerms: string[];
  useCases: string[];
  relatedTemplates: string[];
}

interface SignedContract {
  id: string;
  contract_template_id: string;
  contract_name: string;
  signer_name: string;
  signer_email: string;
  signer_title: string;
  signer_company: string;
  signature_type: string;
  signed_at: string;
  verification_code: string;
  document_hash: string;
  status: string;
}

interface AuditEntry {
  action: string;
  timestamp: string;
  actor: string;
  details?: string;
}

const contractTemplates: ContractTemplate[] = [
  {
    id: 'purchase-agreement',
    name: 'Purchase Agreement',
    category: 'Sales',
    description: 'Standard purchase agreement for petroleum products including crude oil, refined products, and natural gas.',
    icon: FileText,
    color: 'blue',
    lastUpdated: '2026-01-10',
    version: '3.2',
    pages: 12,
    keyTerms: ['Purchase Price', 'Quantity', 'Quality Standards', 'Delivery Schedule', 'Payment Terms', 'Warranties'],
    useCases: ['Spot purchases', 'Term contracts', 'Bulk orders'],
    relatedTemplates: ['sales-contract', 'quality-specs', 'delivery-terms'],
    content: `PETROLEUM PRODUCT PURCHASE AGREEMENT

This Purchase Agreement ("Agreement") is entered into as of [DATE] by and between:

BUYER: [BUYER NAME]
Address: [BUYER ADDRESS]
Registration No.: [REGISTRATION NUMBER]

SELLER: [SELLER NAME]
Address: [SELLER ADDRESS]
Registration No.: [REGISTRATION NUMBER]

RECITALS

WHEREAS, Seller is engaged in the business of producing/supplying petroleum products; and
WHEREAS, Buyer desires to purchase petroleum products from Seller on the terms and conditions set forth herein.

NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the parties agree as follows:

ARTICLE 1 - DEFINITIONS

1.1 "Products" means the petroleum products specified in Schedule A attached hereto.
1.2 "Contract Price" means the price per unit as specified in Schedule B.
1.3 "Delivery Point" means the location specified in Schedule C.
1.4 "Quality Specifications" means the specifications set forth in Schedule D.

ARTICLE 2 - PURCHASE AND SALE

2.1 Subject to the terms and conditions of this Agreement, Seller agrees to sell and deliver to Buyer, and Buyer agrees to purchase and accept from Seller, the Products in the quantities specified.

ARTICLE 3 - PRICE AND PAYMENT

3.1 The Contract Price shall be determined as follows:
    (a) For spot purchases: [PRICING MECHANISM]
    (b) For term contracts: [PRICING FORMULA]

3.2 Payment shall be made within [PAYMENT TERMS] days of delivery.

ARTICLE 4 - DELIVERY

4.1 Delivery shall be made [DELIVERY TERMS - FOB/CIF/CFR] at the Delivery Point.

ARTICLE 5 - QUALITY AND INSPECTION

5.1 All Products delivered shall conform to the Quality Specifications.

ARTICLE 6 - FORCE MAJEURE

6.1 Neither party shall be liable for failure to perform due to Force Majeure events.

ARTICLE 7 - DISPUTE RESOLUTION

7.1 Any dispute arising from this Agreement shall first be resolved through negotiation.

ARTICLE 8 - GOVERNING LAW

This Agreement shall be governed by the laws of [JURISDICTION].

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

BUYER:                              SELLER:
_____________________              _____________________
Name:                              Name:
Title:                             Title:
Date:                              Date:`
  },
  {
    id: 'sales-contract',
    name: 'Sales Contract',
    category: 'Sales',
    description: 'Comprehensive sales contract for commodity trading including terms of sale, warranties, and liability provisions.',
    icon: Handshake,
    color: 'green',
    lastUpdated: '2026-01-08',
    version: '2.8',
    pages: 15,
    keyTerms: ['Sale Terms', 'Warranties', 'Liability', 'Indemnification', 'Insurance', 'Termination'],
    useCases: ['Direct sales', 'Distributor agreements', 'Export contracts'],
    relatedTemplates: ['purchase-agreement', 'delivery-terms', 'escrow-agreement'],
    content: `PETROLEUM PRODUCTS SALES CONTRACT

CONTRACT NO.: [CONTRACT NUMBER]
DATE: [DATE]

PARTIES:

SELLER:
Name: [SELLER NAME]
Address: [SELLER ADDRESS]

BUYER:
Name: [BUYER NAME]
Address: [BUYER ADDRESS]

1. SUBJECT MATTER

1.1 The Seller agrees to sell and the Buyer agrees to purchase petroleum products as specified.

2. QUANTITY

2.1 Total Contract Quantity: [QUANTITY] metric tons (+/- 5% at Seller's option)

3. QUALITY SPECIFICATIONS

3.1 Products shall meet the specifications set forth in Annex 2.

4. PRICE

4.1 Base Price: [PRICING FORMULA]

5. PAYMENT TERMS

5.1 Payment Method: [PAYMENT METHOD]

6. DELIVERY TERMS

6.1 Incoterms: [INCOTERM - FOB/CIF/CFR/DDP]

7. WARRANTIES

7.1 Seller warrants that Products conform to specifications.

8. LIABILITY AND INDEMNIFICATION

8.1 Seller's liability is limited to replacement of non-conforming Products.

9. FORCE MAJEURE

[Standard force majeure clause]

10. TERMINATION

10.1 Either party may terminate upon [NOTICE PERIOD] days written notice.

SIGNATURES:

SELLER:                              BUYER:
_____________________              _____________________`
  },
  {
    id: 'escrow-agreement',
    name: 'Escrow Agreement',
    category: 'Financial',
    description: 'Escrow agreement template for securing transactions through Digiwell\'s escrow service.',
    icon: Shield,
    color: 'purple',
    lastUpdated: '2026-01-12',
    version: '4.0',
    pages: 10,
    keyTerms: ['Escrow Agent', 'Release Conditions', 'Dispute Resolution', 'Fees', 'Termination', 'Liability'],
    useCases: ['Large transactions', 'New trading partners', 'International trades'],
    relatedTemplates: ['purchase-agreement', 'dispute-resolution', 'letter-of-credit'],
    content: `ESCROW AGREEMENT

This Escrow Agreement ("Agreement") is made and entered into as of [DATE] by and among:

BUYER: [BUYER NAME] ("Depositor")
SELLER: [SELLER NAME] ("Beneficiary")
ESCROW AGENT: Digiwell Trading Limited ("Escrow Agent")

1. APPOINTMENT OF ESCROW AGENT

1.1 Depositor and Beneficiary hereby appoint Digiwell Trading Limited as Escrow Agent.

2. ESCROW DEPOSIT

2.1 Depositor shall deposit the following with Escrow Agent:
    Amount: [ESCROW AMOUNT]
    Currency: [CURRENCY]

3. RELEASE CONDITIONS

3.1 Escrow Agent shall release the Escrow Deposit to Beneficiary upon receipt of required documents.

4. DISPUTE RESOLUTION

4.1 In case of dispute, Escrow Agent shall hold funds pending resolution.

5. ESCROW FEES

5.1 Escrow Fee: [FEE PERCENTAGE]% of Escrow Amount

6. LIABILITY

6.1 Escrow Agent's liability is limited to gross negligence or willful misconduct.

IN WITNESS WHEREOF, the parties have executed this Agreement.

DEPOSITOR:                          BENEFICIARY:
_____________________              _____________________

ESCROW AGENT:
_____________________
Digiwell Trading Limited`
  },
  {
    id: 'letter-of-credit',
    name: 'Letter of Credit Template',
    category: 'Financial',
    description: 'Documentary letter of credit template for international petroleum trade.',
    icon: CreditCard,
    color: 'amber',
    lastUpdated: '2026-01-05',
    version: '2.5',
    pages: 8,
    keyTerms: ['Issuing Bank', 'Beneficiary', 'Documents', 'Expiry', 'Amendment', 'Discrepancies'],
    useCases: ['International trade', 'First-time buyers', 'High-value transactions'],
    relatedTemplates: ['escrow-agreement', 'purchase-agreement'],
    content: `IRREVOCABLE DOCUMENTARY LETTER OF CREDIT

APPLICATION FOR DOCUMENTARY CREDIT

TO: [ISSUING BANK NAME]

Date: [DATE]
Our Reference: [REFERENCE NUMBER]

1. APPLICANT (Buyer)
Name: [APPLICANT NAME]
Address: [APPLICANT ADDRESS]

2. BENEFICIARY (Seller)
Name: [BENEFICIARY NAME]
Address: [BENEFICIARY ADDRESS]

3. CREDIT DETAILS

Amount: [CURRENCY] [AMOUNT]
Type: Irrevocable

4. SHIPMENT DETAILS

From: [LOADING PORT]
To: [DISCHARGE PORT]

5. GOODS DESCRIPTION

[DETAILED DESCRIPTION OF PETROLEUM PRODUCTS]

6. DOCUMENTS REQUIRED

6.1 Commercial Invoice in triplicate
6.2 Full set of clean on board Bills of Lading
6.3 Certificate of Origin
6.4 Certificate of Quality
6.5 Certificate of Quantity

APPLICANT'S SIGNATURE:
_____________________`
  },
  {
    id: 'delivery-terms',
    name: 'Delivery Terms (Incoterms)',
    category: 'Logistics',
    description: 'Comprehensive guide to delivery terms including FOB, CIF, CFR, DDP.',
    icon: Truck,
    color: 'cyan',
    lastUpdated: '2026-01-03',
    version: '2.0',
    pages: 14,
    keyTerms: ['FOB', 'CIF', 'CFR', 'DDP', 'Risk Transfer', 'Cost Allocation'],
    useCases: ['All petroleum trades', 'Shipping arrangements', 'Cost calculations'],
    relatedTemplates: ['purchase-agreement', 'sales-contract'],
    content: `DELIVERY TERMS GUIDE - INCOTERMS 2020

1. FOB (Free On Board)

SELLER'S OBLIGATIONS:
- Deliver goods on board the vessel
- Clear goods for export

BUYER'S OBLIGATIONS:
- Nominate vessel and notify seller
- Bear all costs from loading onwards

2. CIF (Cost, Insurance, Freight)

SELLER'S OBLIGATIONS:
- Deliver goods on board vessel
- Contract and pay for freight to destination
- Obtain minimum insurance

3. CFR (Cost and Freight)

SELLER'S OBLIGATIONS:
- Same as CIF except NO insurance obligation

4. DDP (Delivered Duty Paid)

SELLER'S OBLIGATIONS:
- Deliver goods cleared for import at destination
- Bear all costs and risks to destination`
  },
  {
    id: 'quality-specs',
    name: 'Quality Specifications',
    category: 'Technical',
    description: 'Standard quality specification templates for various petroleum products.',
    icon: FileCheck,
    color: 'emerald',
    lastUpdated: '2026-01-07',
    version: '3.1',
    pages: 20,
    keyTerms: ['API Gravity', 'Sulfur Content', 'Viscosity', 'Flash Point', 'Pour Point'],
    useCases: ['Product specifications', 'Quality disputes', 'Contract annexes'],
    relatedTemplates: ['purchase-agreement', 'sales-contract', 'dispute-resolution'],
    content: `PETROLEUM PRODUCT QUALITY SPECIFICATIONS

1. CRUDE OIL SPECIFICATIONS

BONNY LIGHT CRUDE OIL (NIGERIA)
- API Gravity: 32.9° - 35.0°
- Sulfur Content: 0.14% max
- Pour Point: -3°C max

2. REFINED PRODUCTS

PREMIUM MOTOR SPIRIT (PMS/GASOLINE)
- Research Octane Number: 91 min
- Density @ 15°C: 720-775 kg/m³
- Sulfur Content: 50 ppm max

AUTOMOTIVE GAS OIL (AGO/DIESEL)
- Cetane Number: 48 min
- Flash Point: 55°C min
- Sulfur Content: 50 ppm max`
  },
  {
    id: 'force-majeure',
    name: 'Force Majeure Clauses',
    category: 'Legal',
    description: 'Comprehensive force majeure clause templates covering various scenarios.',
    icon: AlertTriangle,
    color: 'red',
    lastUpdated: '2026-01-02',
    version: '2.3',
    pages: 6,
    keyTerms: ['Force Majeure Events', 'Notice Requirements', 'Mitigation', 'Suspension', 'Termination'],
    useCases: ['All contracts', 'Risk management', 'Contract negotiations'],
    relatedTemplates: ['purchase-agreement', 'sales-contract', 'dispute-resolution'],
    content: `FORCE MAJEURE CLAUSES

1. DEFINITION

"Force Majeure" means any event beyond the reasonable control of the affected party.

2. FORCE MAJEURE EVENTS

- Natural disasters
- War, armed conflict, terrorism
- Government actions, embargoes
- Pandemics

3. NOTICE REQUIREMENTS

The affected party shall provide written notice within 48-72 hours.

4. EFFECTS

- Affected obligations are suspended
- No liability for non-performance during suspension

5. TERMINATION

If Force Majeure continues for more than 90 days, either party may terminate.`
  },
  {
    id: 'dispute-resolution',
    name: 'Dispute Resolution Procedures',
    category: 'Legal',
    description: 'Comprehensive dispute resolution framework including negotiation, mediation, and arbitration.',
    icon: Gavel,
    color: 'slate',
    lastUpdated: '2026-01-11',
    version: '3.0',
    pages: 12,
    keyTerms: ['Negotiation', 'Mediation', 'Arbitration', 'ICC Rules', 'Expert Determination'],
    useCases: ['Contract disputes', 'Quality claims', 'Payment disputes'],
    relatedTemplates: ['purchase-agreement', 'escrow-agreement', 'force-majeure'],
    content: `DISPUTE RESOLUTION PROCEDURES

1. TIERED DISPUTE RESOLUTION

- Tier 1: Negotiation (30 days)
- Tier 2: Mediation (30 days)
- Tier 3: Arbitration (binding)

2. ARBITRATION

"Any dispute shall be finally resolved by arbitration under ICC Rules."

Number of Arbitrators: Three
Seat of Arbitration: London, UK
Language: English

3. ENFORCEMENT

Awards enforceable under New York Convention (1958).`
  }
];

const categoryColors: Record<string, string> = {
  Sales: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Financial: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Logistics: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Technical: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Legal: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export default function ContractTemplates() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [viewSignedOpen, setViewSignedOpen] = useState(false);
  const [selectedSigned, setSelectedSigned] = useState<SignedContract | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');

  const categories = ['all', ...Array.from(new Set(contractTemplates.map(t => t.category)))];

  useEffect(() => {
    loadSignedContracts();
  }, []);

  const loadSignedContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('signed_contracts')
        .select('*')
        .order('signed_at', { ascending: false });

      if (data && !error) {
        setSignedContracts(data);
      }
    } catch (err) {
      console.error('Error loading signed contracts:', err);
    }
  };

  const filteredTemplates = contractTemplates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.keyTerms.some(term => term.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (template: ContractTemplate) => {
    const blob = new Blob([template.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}-template.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSign = async (signatureData: SignatureData) => {
    if (!selectedTemplate) return;

    setSigning(true);
    try {
      // Call the edge function to process the signature
      const { data, error } = await supabase.functions.invoke('contract-signing', {
        body: {
          action: 'sign',
          data: {
            contractTemplateId: selectedTemplate.id,
            contractName: selectedTemplate.name,
            contractContent: selectedTemplate.content,
            signerName: signatureData.signerName,
            signerEmail: signatureData.signerEmail,
            signerTitle: signatureData.signerTitle,
            signerCompany: signatureData.signerCompany,
            signatureData: signatureData.signatureImage,
            signatureType: signatureData.signatureType,
            signatureFont: signatureData.signatureFont,
            ipAddress: signatureData.ipAddress,
            userAgent: signatureData.userAgent
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Store in database
        const { error: dbError } = await supabase
          .from('signed_contracts')
          .insert({
            contract_template_id: selectedTemplate.id,
            contract_name: selectedTemplate.name,
            contract_content: selectedTemplate.content,
            signer_name: signatureData.signerName,
            signer_email: signatureData.signerEmail,
            signer_title: signatureData.signerTitle,
            signer_company: signatureData.signerCompany,
            signature_data: signatureData.signatureImage,
            signature_type: signatureData.signatureType,
            signature_font: signatureData.signatureFont,
            ip_address: signatureData.ipAddress,
            user_agent: signatureData.userAgent,
            signed_at: signatureData.timestamp,
            document_hash: data.signedContract.documentHash,
            verification_code: data.signedContract.verificationCode,
            status: 'signed'
          });

        if (dbError) {
          console.error('Database error:', dbError);
        }

        // Add audit trail entry
        await supabase.from('signature_audit_trail').insert({
          action: 'Document Signed',
          actor_name: signatureData.signerName,
          actor_email: signatureData.signerEmail,
          actor_ip: signatureData.ipAddress,
          details: { template: selectedTemplate.name, verificationCode: data.signedContract.verificationCode }
        });

        // Download signed PDF
        if (data.signedContract.pdfBase64) {
          const blob = new Blob([atob(data.signedContract.pdfBase64)], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Signed-${selectedTemplate.name.replace(/\s+/g, '-')}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        alert(`Document signed successfully!\n\nVerification Code: ${data.signedContract.verificationCode}\n\nA confirmation email has been sent to ${signatureData.signerEmail}`);
        setSignModalOpen(false);
        loadSignedContracts();
      }
    } catch (err) {
      console.error('Signing error:', err);
      alert('Error signing document. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode.trim()) {
      alert('Please enter a verification code');
      return;
    }

    try {
      // Check database for the verification code
      const { data, error } = await supabase
        .from('signed_contracts')
        .select('*')
        .eq('verification_code', verifyCode.trim().toUpperCase())
        .single();

      if (data && !error) {
        setVerifyResult({
          verified: true,
          message: `Document verified!\n\nContract: ${data.contract_name}\nSigned by: ${data.signer_name}\nDate: ${new Date(data.signed_at).toLocaleString()}\nStatus: ${data.status}`
        });
      } else {
        setVerifyResult({
          verified: false,
          message: 'Verification code not found. Please check the code and try again.'
        });
      }
    } catch (err) {
      setVerifyResult({
        verified: false,
        message: 'Error verifying document. Please try again.'
      });
    }
  };

  const loadAuditTrail = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('signature_audit_trail')
        .select('*')
        .eq('signed_contract_id', contractId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        setAuditTrail(data.map(entry => ({
          action: entry.action,
          timestamp: entry.created_at,
          actor: entry.actor_name || entry.actor_email || 'System',
          details: JSON.stringify(entry.details)
        })));
      }
    } catch (err) {
      console.error('Error loading audit trail:', err);
    }
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-400 bg-blue-500/20',
      green: 'text-green-400 bg-green-500/20',
      purple: 'text-purple-400 bg-purple-500/20',
      amber: 'text-amber-400 bg-amber-500/20',
      cyan: 'text-cyan-400 bg-cyan-500/20',
      emerald: 'text-emerald-400 bg-emerald-500/20',
      red: 'text-red-400 bg-red-500/20',
      slate: 'text-slate-400 bg-slate-500/20'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl flex items-center justify-center">
            <FileSignature className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Contract Templates</h1>
            <p className="text-white/60">Legal Document Library with E-Signatures</p>
          </div>
        </div>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Access professionally drafted contract templates and sign them electronically with legally binding digital signatures.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 w-full justify-start">
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="signed" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <FileSignature className="w-4 h-4 mr-2" />
            Signed Documents ({signedContracts.length})
          </TabsTrigger>
          <TabsTrigger value="verify" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verify Signature
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Search and Filter */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={selectedCategory === category 
                        ? 'bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]'
                        : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                      }
                    >
                      {category === 'all' ? 'All' : category}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[#D4AF37]">{contractTemplates.length}</div>
                <div className="text-slate-400 text-sm">Templates</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{signedContracts.length}</div>
                <div className="text-slate-400 text-sm">Signed</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">E-SIGN</div>
                <div className="text-slate-400 text-sm">Compliant</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">256-bit</div>
                <div className="text-slate-400 text-sm">Encrypted</div>
              </CardContent>
            </Card>
          </div>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              return (
                <Card 
                  key={template.id} 
                  className="bg-slate-900/50 border-slate-700 hover:border-[#D4AF37]/50 transition-all group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getIconColor(template.color)}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge className={categoryColors[template.category]}>
                        {template.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-white mt-3 group-hover:text-[#D4AF37] transition-colors">
                      {template.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-400 text-sm line-clamp-2">{template.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        v{template.version}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {template.pages} pages
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.keyTerms.slice(0, 3).map(term => (
                        <Badge key={term} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setPreviewOpen(true);
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setSignModalOpen(true);
                        }}
                        className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                      >
                        <PenTool className="w-4 h-4 mr-1" />
                        Sign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Signed Documents Tab */}
        <TabsContent value="signed" className="space-y-6 mt-6">
          {signedContracts.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <FileSignature className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Signed Documents</h3>
                <p className="text-slate-400">Sign a contract template to see it here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {signedContracts.map(contract => (
                <Card key={contract.id} className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{contract.contract_name}</h3>
                          <p className="text-slate-400 text-sm">
                            Signed by {contract.signer_name} on {new Date(contract.signed_at).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              {contract.status}
                            </Badge>
                            <span className="text-slate-500 text-xs font-mono">
                              {contract.verification_code}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSigned(contract);
                            loadAuditTrail(contract.id);
                            setViewSignedOpen(true);
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <History className="w-4 h-4 mr-1" />
                          Audit Trail
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-6 mt-6">
          <Card className="bg-slate-900/50 border-slate-700 max-w-xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                Verify Document Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400 text-sm">
                Enter the verification code from a signed document to verify its authenticity.
              </p>
              <div className="space-y-2">
                <Label className="text-slate-300">Verification Code</Label>
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="bg-slate-800 border-slate-700 text-white font-mono text-lg tracking-wider"
                />
              </div>
              <Button
                onClick={handleVerify}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify Signature
              </Button>

              {verifyResult && (
                <div className={`p-4 rounded-lg border ${
                  verifyResult.verified 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {verifyResult.verified ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-semibold ${verifyResult.verified ? 'text-green-400' : 'text-red-400'}`}>
                        {verifyResult.verified ? 'Signature Verified' : 'Verification Failed'}
                      </p>
                      <p className="text-slate-300 text-sm whitespace-pre-line mt-1">
                        {verifyResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Important Notice */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Electronic Signature Legal Notice</h3>
              <p className="text-slate-300 text-sm">
                Electronic signatures on this platform are legally binding under the E-SIGN Act and UETA. 
                All signatures are encrypted, timestamped, and include IP address verification for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh]">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(selectedTemplate.color)}`}>
                    <selectedTemplate.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-white">{selectedTemplate.name}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Version {selectedTemplate.version}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="h-[400px] rounded-lg border border-slate-700 bg-slate-900 p-4 mt-4">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                  {selectedTemplate.content}
                </pre>
              </ScrollArea>

              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700">
                <Button
                  onClick={() => handleDownload(selectedTemplate)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => {
                    setPreviewOpen(false);
                    setSignModalOpen(true);
                  }}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Sign This Document
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && !signing && (
            <SignaturePad
              contractName={selectedTemplate.name}
              onSign={handleSign}
              onCancel={() => setSignModalOpen(false)}
            />
          )}
          {signing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
              <p className="text-white text-lg">Processing signature...</p>
              <p className="text-slate-400 text-sm">Please wait while we secure your document</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Trail Modal */}
      <Dialog open={viewSignedOpen} onOpenChange={setViewSignedOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          {selectedSigned && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#D4AF37]" />
                  Audit Trail - {selectedSigned.contract_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Signer</p>
                        <p className="text-white">{selectedSigned.signer_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Email</p>
                        <p className="text-white">{selectedSigned.signer_email}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Verification Code</p>
                        <p className="text-white font-mono">{selectedSigned.verification_code}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Document Hash</p>
                        <p className="text-white font-mono text-xs">{selectedSigned.document_hash}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Activity Log</h4>
                  {auditTrail.length > 0 ? (
                    auditTrail.map((entry, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div className="w-2 h-2 bg-[#D4AF37] rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-white text-sm">{entry.action}</p>
                          <p className="text-slate-400 text-xs">
                            {entry.actor} • {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-white text-sm">Document Signed</p>
                        <p className="text-slate-400 text-xs">
                          {selectedSigned.signer_name} • {new Date(selectedSigned.signed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
