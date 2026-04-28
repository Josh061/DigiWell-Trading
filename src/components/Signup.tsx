import { useState } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, User, Building, Globe, FileText, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';

interface SignupProps {
  onSwitchToLogin: () => void;
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'user', label: 'Individual User', description: 'Personal trading account' },
  { value: 'trader', label: 'Professional Trader', description: 'Licensed trading professional' },
  { value: 'refiner', label: 'Refinery', description: 'Oil refining company' },
  { value: 'marketer', label: 'Marketer', description: 'Petroleum marketing company' },
  { value: 'government_agency', label: 'Government Agency', description: 'Regulatory body' },
  { value: 'pilot', label: 'Pilot/Transporter', description: 'Delivery and logistics' }
];

export default function Signup({ onSwitchToLogin }: SignupProps) {
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'user' as UserRole,
    company: '',
    companyRegistrationNumber: '',
    companyAddress: '',
    companyCountry: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setIsNetworkError(false);
  };

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleRetry = () => {
    setError('');
    setIsNetworkError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNetworkError(false);
    setLoading(true);

    try {
      const companyData = formData.role !== 'user' ? {
        company: formData.company,
        company_registration_number: formData.companyRegistrationNumber,
        company_address: formData.companyAddress,
        company_country: formData.companyCountry
      } : undefined;

      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role,
        companyData
      );

      if (error) {
        const errorMessage = error.message || 'An error occurred during registration';
        setError(errorMessage);
        setIsNetworkError(
          errorMessage.includes('Unable to connect') || 
          errorMessage.includes('internet connection') ||
          errorMessage.includes('Failed to fetch')
        );
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during registration';
      setError(errorMessage);
      setIsNetworkError(
        errorMessage.includes('Unable to connect') || 
        errorMessage.includes('internet connection') ||
        errorMessage.includes('Failed to fetch')
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md auth-card-enter auth-card-shimmer">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Registration Successful!</CardTitle>
          <CardDescription className="text-white/70">
            Please check your email to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-white/80 mb-4">
            We've sent a verification link to <strong className="text-[#D4AF37]">{formData.email}</strong>
          </p>
          <Button
            onClick={onSwitchToLogin}
            className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl auth-card-enter auth-card-shimmer">
      <CardHeader className="text-center">
        <div className="auth-icon-wrap mx-auto mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1565C0] to-[#29B6F6] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(41,182,246,0.4)]">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
        <CardDescription className="text-white/70">
          Join Digiwell
        </CardDescription>

        
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mt-4">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#D4AF37]' : 'bg-white/30'}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#D4AF37]' : 'bg-white/30'}`} />
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className={`${isNetworkError ? 'bg-orange-500/20 border-orange-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
              {isNetworkError ? (
                <WifiOff className="h-4 w-4 text-orange-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={isNetworkError ? 'text-orange-200' : 'text-red-200'}>
                <div className="flex flex-col gap-2">
                  <span>{error}</span>
                  {isNetworkError && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleRetry}
                      className="text-orange-300 hover:text-orange-100 p-0 h-auto text-xs justify-start"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Dismiss and try again
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {step === 1 && (
            <>
              <div className="auth-field space-y-2">
                <Label htmlFor="fullName" className="text-white">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              <div className="auth-field space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              <div className="auth-field space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Create a password (min 8 characters)"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="auth-field space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
              <Button
                type="button"
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-[#1565C0] to-[#29B6F6] text-white font-bold hover:shadow-lg hover:shadow-[#29B6F6]/40 rounded-full transition-all hover:scale-[1.02]"
              >
                Continue
              </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">Account Type</Label>
                <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-slate-500">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role !== 'user' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-white">Company Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => handleChange('company', e.target.value)}
                        placeholder="Enter company name"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regNumber" className="text-white">Registration Number</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="regNumber"
                        value={formData.companyRegistrationNumber}
                        onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                        placeholder="Company registration number"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-white">Country</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="country"
                        value={formData.companyCountry}
                        onChange={(e) => handleChange('companyCountry', e.target.value)}
                        placeholder="Country of operation"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#1565C0] to-[#29B6F6] text-white font-bold hover:shadow-lg hover:shadow-[#29B6F6]/40 rounded-full transition-all hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4">
        <div className="text-center text-white/70 text-sm">
          Already have an account?{' '}
          <Button
            variant="link"
            onClick={onSwitchToLogin}
            className="text-[#00D4FF] hover:text-[#00B8E6] p-0 h-auto"
          >
            Sign In
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
