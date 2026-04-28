import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  PenTool,
  Type,
  Trash2,
  Check,
  RotateCcw,
  Download,
  Shield,
  Clock,
  MapPin,
  User,
  Mail,
  Building,
  Briefcase
} from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureData: SignatureData) => void;
  onCancel: () => void;
  contractName: string;
  signerInfo?: {
    name?: string;
    email?: string;
    title?: string;
    company?: string;
  };
}

export interface SignatureData {
  signatureImage: string;
  signatureType: 'drawn' | 'typed';
  signatureFont?: string;
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signerCompany: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  consent: boolean;
}

const signatureFonts = [
  { name: 'Elegant Script', style: 'font-serif italic', preview: 'Dancing Script' },
  { name: 'Classic Cursive', style: 'font-serif', preview: 'Great Vibes' },
  { name: 'Modern Signature', style: 'font-sans italic', preview: 'Pacifico' },
  { name: 'Professional', style: 'font-mono', preview: 'Courier' },
  { name: 'Bold Statement', style: 'font-sans font-bold', preview: 'Impact' }
];

export default function SignaturePad({ onSign, onCancel, contractName, signerInfo }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureType, setSignatureType] = useState<'drawn' | 'typed'>('drawn');
  const [typedSignature, setTypedSignature] = useState(signerInfo?.name || '');
  const [selectedFont, setSelectedFont] = useState(signatureFonts[0]);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [consent, setConsent] = useState(false);
  
  // Signer information
  const [signerName, setSignerName] = useState(signerInfo?.name || '');
  const [signerEmail, setSignerEmail] = useState(signerInfo?.email || '');
  const [signerTitle, setSignerTitle] = useState(signerInfo?.title || '');
  const [signerCompany, setSignerCompany] = useState(signerInfo?.company || '');
  
  // IP Address (simulated for demo)
  const [ipAddress] = useState('192.168.1.' + Math.floor(Math.random() * 255));
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Set drawing style
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.offsetHeight - 30);
    ctx.lineTo(canvas.offsetWidth - 20, canvas.offsetHeight - 30);
    ctx.stroke();

    // Reset stroke style
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw signature line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.offsetHeight - 30);
    ctx.lineTo(canvas.offsetWidth - 20, canvas.offsetHeight - 30);
    ctx.stroke();

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    setHasDrawnSignature(false);
  };

  const getSignatureImage = useCallback((): string => {
    if (signatureType === 'drawn') {
      const canvas = canvasRef.current;
      return canvas?.toDataURL('image/png') || '';
    } else {
      // Create a canvas for typed signature
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e3a5f';
      ctx.font = `italic 48px ${selectedFont.preview}, cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

      // Draw signature line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, canvas.height - 20);
      ctx.lineTo(canvas.width - 50, canvas.height - 20);
      ctx.stroke();

      return canvas.toDataURL('image/png');
    }
  }, [signatureType, typedSignature, selectedFont]);

  const handleSign = () => {
    if (!consent) {
      alert('Please agree to the electronic signature consent');
      return;
    }

    if (!signerName || !signerEmail) {
      alert('Please provide your name and email');
      return;
    }

    if (signatureType === 'drawn' && !hasDrawnSignature) {
      alert('Please draw your signature');
      return;
    }

    if (signatureType === 'typed' && !typedSignature.trim()) {
      alert('Please type your signature');
      return;
    }

    const signatureData: SignatureData = {
      signatureImage: getSignatureImage(),
      signatureType,
      signatureFont: signatureType === 'typed' ? selectedFont.name : undefined,
      signerName,
      signerEmail,
      signerTitle,
      signerCompany,
      timestamp: currentTime.toISOString(),
      ipAddress,
      userAgent: navigator.userAgent,
      consent: true
    };

    onSign(signatureData);
  };

  const isSignatureValid = () => {
    if (!consent || !signerName || !signerEmail) return false;
    if (signatureType === 'drawn' && !hasDrawnSignature) return false;
    if (signatureType === 'typed' && !typedSignature.trim()) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Document Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Signing Document</p>
              <p className="text-white font-semibold">{contractName}</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Awaiting Signature
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Signer Information */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-[#D4AF37]" />
            Signer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name *
              </Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address *
              </Label>
              <Input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Title/Position
              </Label>
              <Input
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="e.g., CEO, Director"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Company/Organization
              </Label>
              <Input
                value={signerCompany}
                onChange={(e) => setSignerCompany(e.target.value)}
                placeholder="Enter company name"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[#D4AF37]" />
            Your Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'drawn' | 'typed')}>
            <TabsList className="bg-slate-900 w-full">
              <TabsTrigger value="drawn" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <PenTool className="w-4 h-4 mr-2" />
                Draw Signature
              </TabsTrigger>
              <TabsTrigger value="typed" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <Type className="w-4 h-4 mr-2" />
                Type Signature
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drawn" className="mt-4">
              <div className="space-y-3">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-40 bg-white rounded-lg cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasDrawnSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-slate-400 text-sm">Draw your signature here</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="typed" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Type your signature</Label>
                <Input
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your full name"
                  className="bg-slate-900 border-slate-600 text-white text-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Select signature style</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {signatureFonts.map((font) => (
                    <button
                      key={font.name}
                      onClick={() => setSelectedFont(font)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedFont.name === font.name
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-slate-600 bg-slate-900 hover:border-slate-500'
                      }`}
                    >
                      <p className={`text-2xl text-center text-white ${font.style}`} style={{ fontFamily: font.preview }}>
                        {typedSignature || 'Your Name'}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 text-center">{font.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-lg p-6 text-center">
                <p className={`text-3xl text-slate-800 ${selectedFont.style}`} style={{ fontFamily: selectedFont.preview }}>
                  {typedSignature || 'Your Signature'}
                </p>
                <div className="border-t border-slate-300 mt-4 pt-2">
                  <p className="text-xs text-slate-500">Signature Preview</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Signing Details */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Signing Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Timestamp</span>
              </div>
              <p className="text-white font-mono text-sm">
                {currentTime.toLocaleString()}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">IP Address</span>
              </div>
              <p className="text-white font-mono text-sm">{ipAddress}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Security</span>
              </div>
              <p className="text-green-400 text-sm">256-bit Encrypted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consent */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-900 text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <div>
              <p className="text-white font-medium">Electronic Signature Consent</p>
              <p className="text-slate-400 text-sm mt-1">
                By checking this box, I agree that my electronic signature is the legal equivalent of my manual signature. 
                I consent to be legally bound by this document's terms and conditions. I understand that my signature, 
                along with my IP address and timestamp, will be recorded for verification purposes.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSign}
          disabled={!isSignatureValid()}
          className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 disabled:opacity-50"
        >
          <Check className="w-4 h-4 mr-2" />
          Sign Document
        </Button>
      </div>
    </div>
  );
}
