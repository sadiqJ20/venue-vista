import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Users, UserCheck, Briefcase, Shield } from "lucide-react";
import PMCHeader from "@/components/PMCHeader";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Define the Department type from the database enum
type Department = Database['public']['Enums']['department_name'];
type UserRole = Database['public']['Enums']['user_role'];

// Create a type-safe way to get all department values
const ALL_DEPARTMENTS: readonly Department[] = [
  'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'CHEMICAL', 'AIDS', 'CSBS',
  'MCA', 'MBA', 'TRAINING', 'PLACEMENT', 'SCIENCE & HUMANITIES',
  'HR', 'INNOVATION', 'AI_ML', 'NCC', 'NSS', 'III', 'IEDC', 'PRO'
] as const satisfies readonly string[] as unknown as Department[];

// Export the departments array with the correct type
const departments: Department[] = [...ALL_DEPARTMENTS];

const Auth = () => {
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    mobile: '',
    email: '',
    name: ''
  });

  // Redirect if already authenticated
  if (user) {
    navigate('/dashboard');
    return null;
  }

  // Sign Up State{REGISTRATION}
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    name: '',
    mobile: '',
    role: '' as UserRole,
    department: '' as Department,
    uniqueId: ''
  });

  // Validate phone number (10 digits, numeric only)
  const validatePhoneNumber = (phone: string) => {
    if (!phone) {
      setValidationErrors(prev => ({ ...prev, mobile: '' }));
      return true;
    }
    if (!/^\d*$/.test(phone)) {
      setValidationErrors(prev => ({ ...prev, mobile: 'Only numeric characters (0-9) are allowed' }));
      return false;
    }
    if (phone.length !== 10) {
      setValidationErrors(prev => ({ ...prev, mobile: 'Phone number must be exactly 10 digits' }));
      return false;
    }
    setValidationErrors(prev => ({ ...prev, mobile: '' }));
    return true;
  };

  // Check if email already exists
  const checkEmailUniqueness = async (email: string) => {
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: '' }));
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (data) {
        setValidationErrors(prev => ({ ...prev, email: 'This email is already registered.' }));
      } else {
        setValidationErrors(prev => ({ ...prev, email: '' }));
      }
    } catch (err) {
      console.error('Error checking email:', err);
    }
  };

  // Check if name already exists
  const checkNameUniqueness = async (name: string) => {
    if (!name) {
      setValidationErrors(prev => ({ ...prev, name: '' }));
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('name', name)
        .maybeSingle();

      if (data) {
        setValidationErrors(prev => ({ ...prev, name: 'This name is already taken.' }));
      } else {
        setValidationErrors(prev => ({ ...prev, name: '' }));
      }
    } catch (err) {
      console.error('Error checking name:', err);
    }
  };

  // Sign In State{LOGIN}
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    role: '' as UserRole,
    department: '' as Department,
    uniqueId: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!validatePhoneNumber(signUpData.mobile)) {
      return;
    }

    // Check for validation errors
    if (validationErrors.mobile || validationErrors.email || validationErrors.name) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before submitting.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, {
        name: signUpData.name,
        mobile_number: signUpData.mobile,
        role: signUpData.role,
        department: signUpData.department || undefined,
        unique_id: signUpData.uniqueId || undefined
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success!",
          description: "Account created successfully. Please check your email to verify your account.",
          variant: "default"
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(
        signInData.email, 
        signInData.password,
        signInData.role || undefined,
        signInData.department || undefined,
        signInData.uniqueId || undefined
      );

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'faculty': return <Users className="h-5 w-5" />;
      case 'hod': return <UserCheck className="h-5 w-5" />;
      case 'principal': return <GraduationCap className="h-5 w-5" />;
      case 'pro': return <Briefcase className="h-5 w-5" />;
      case 'chairman': return <Shield className="h-5 w-5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pmc-bg.webp')",
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
      </div>

      <PMCHeader />

      <div className="container mx-auto px-6 py-16 pt-48 relative z-20 flex-1">
        <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-b from-gray-100/50 to-transparent pointer-events-none"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="flex flex-col items-center justify-center text-center h-full">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-full mb-6 shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Seminar Hall Booking</h1>
            <p className="text-gray-900 text-lg">College Management System</p>
          </div>

          <div className="w-full max-w-2xl md:max-w-none md:ml-0 md:-translate-x-4 lg:-translate-x-6 transition-transform">
            <Card className="shadow-card border border-border rounded-card bg-card/95 backdrop-blur-sm shimmer-border shimmer-blue">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Welcome</CardTitle>
                <CardDescription className="text-center">
                  Sign in to your account or create a new one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200 rounded-card">
                    <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-white">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-white">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="signin-email">Email</Label>
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="Enter your email"
                            value={signInData.email}
                            onChange={(e) => setSignInData({...signInData, email: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="signin-password">Password</Label>
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="Enter your password"
                            value={signInData.password}
                            onChange={(e) => setSignInData({...signInData, password: e.target.value})}
                            required
                          />
                        </div>
                        <div className="relative">
                          <Label htmlFor="signin-role">Role</Label>
                          <Select onValueChange={(value) => setSignInData({...signInData, role: value as UserRole})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="faculty">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('faculty')}
                                  Faculty
                                </div>
                              </SelectItem>
                              <SelectItem value="hod">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('hod')}
                                  HOD
                                </div>
                              </SelectItem>
                              <SelectItem value="principal">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('principal')}
                                  Principal
                                </div>
                              </SelectItem>
                              <SelectItem value="pro">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('pro')}
                                  PRO
                                </div>
                              </SelectItem>
                              <SelectItem value="chairman">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('chairman')}
                                  Chairman
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {(signInData.role === 'faculty' || signInData.role === 'hod') && (
                          <>
                            <div className="relative">
                              <Label htmlFor="signin-department">Department</Label>
                              <Select onValueChange={(value) => setSignInData({...signInData, department: value as Department})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {departments.map(dept => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="signin-uniqueid">Unique ID</Label>
                              <Input
                                id="signin-uniqueid"
                                placeholder="Enter your unique ID"
                                value={signInData.uniqueId}
                                onChange={(e) => setSignInData({...signInData, uniqueId: e.target.value})}
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white shadow-button hover:shadow-button-hover rounded-button transition-all duration-200" 
                        disabled={loading}
                      >
                        {loading ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input
                            id="signup-name"
                            placeholder="Enter your full name"
                            value={signUpData.name}
                            onChange={(e) => {
                              setSignUpData({...signUpData, name: e.target.value});
                              setValidationErrors(prev => ({ ...prev, name: '' }));
                            }}
                            onBlur={(e) => checkNameUniqueness(e.target.value)}
                            required
                            className={validationErrors.name ? 'border-red-500' : ''}
                          />
                          {validationErrors.name && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email"
                            value={signUpData.email}
                            onChange={(e) => {
                              setSignUpData({...signUpData, email: e.target.value});
                              setValidationErrors(prev => ({ ...prev, email: '' }));
                            }}
                            onBlur={(e) => checkEmailUniqueness(e.target.value)}
                            required
                            className={validationErrors.email ? 'border-red-500' : ''}
                          />
                          {validationErrors.email && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Create a password"
                            value={signUpData.password}
                            onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="signup-mobile">Mobile Number</Label>
                          <Input
                            id="signup-mobile"
                            placeholder="Enter your mobile number (10 digits)"
                            value={signUpData.mobile}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow numeric input and max 10 characters
                              if (/^\d*$/.test(value) && value.length <= 10) {
                                setSignUpData({...signUpData, mobile: value});
                                validatePhoneNumber(value);
                              }
                            }}
                            maxLength={10}
                            required
                            className={validationErrors.mobile ? 'border-red-500' : ''}
                          />
                          {validationErrors.mobile && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.mobile}</p>
                          )}
                        </div>
                        <div className="relative">
                          <Label htmlFor="signup-role">Role</Label>
                          <Select onValueChange={(value) => setSignUpData({...signUpData, role: value as UserRole})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="faculty">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('faculty')}
                                  Faculty
                                </div>
                              </SelectItem>
                              <SelectItem value="hod">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('hod')}
                                  HOD
                                </div>
                              </SelectItem>
                              <SelectItem value="principal">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('principal')}
                                  Principal
                                </div>
                              </SelectItem>
                              <SelectItem value="pro">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('pro')}
                                  PRO
                                </div>
                              </SelectItem>
                              <SelectItem value="chairman">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon('chairman')}
                                  Chairman
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {(signUpData.role === 'faculty' || signUpData.role === 'hod') && (
                          <>
                            <div className="relative">
                              <Label htmlFor="signup-department">Department</Label>
                              <Select onValueChange={(value) => setSignUpData({...signUpData, department: value as Department})}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {departments.map(dept => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="signup-uniqueid">Unique ID</Label>
                              <Input
                                id="signup-uniqueid"
                                placeholder="Enter your unique ID"
                                value={signUpData.uniqueId}
                                onChange={(e) => setSignUpData({...signUpData, uniqueId: e.target.value})}
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-primary-hover text-white shadow-button hover:shadow-button-hover rounded-button transition-all duration-200" 
                        disabled={loading}
                      >
                        {loading ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Auth;