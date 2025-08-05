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
import { GraduationCap, Users, UserCheck, Briefcase } from "lucide-react";

type Department = 'CSE' | 'IT' | 'ECE' | 'EEE' | 'MECH' | 'CIVIL' | 'AERO' | 'CHEMICAL' | 'AIDS' | 'CSBS';
type UserRole = 'faculty' | 'hod' | 'principal' | 'pro';

const departments: Department[] = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'CHEMICAL', 'AIDS', 'CSBS'];

const Auth = () => {
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (user) {
    navigate('/dashboard');
    return null;
  }

  // Sign Up State
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    name: '',
    mobile: '',
    role: '' as UserRole,
    department: '' as Department,
    uniqueId: ''
  });

  // Sign In State
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
    role: '' as UserRole,
    department: '' as Department,
    uniqueId: ''
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <GraduationCap className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">Seminar Hall Booking</h1>
          <p className="text-muted-foreground text-lg">College Management System</p>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                    <div>
                      <Label htmlFor="signin-role">Role</Label>
                      <Select onValueChange={(value) => setSignInData({...signInData, role: value as UserRole})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
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
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(signInData.role === 'faculty' || signInData.role === 'hod') && (
                      <>
                        <div>
                          <Label htmlFor="signin-department">Department</Label>
                          <Select onValueChange={(value) => setSignInData({...signInData, department: value as Department})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
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
                  
                  <Button type="submit" className="w-full" disabled={loading}>
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
                        onChange={(e) => setSignUpData({...signUpData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                        required
                      />
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
                        placeholder="Enter your mobile number"
                        value={signUpData.mobile}
                        onChange={(e) => setSignUpData({...signUpData, mobile: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-role">Role</Label>
                      <Select onValueChange={(value) => setSignUpData({...signUpData, role: value as UserRole})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
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
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(signUpData.role === 'faculty' || signUpData.role === 'hod') && (
                      <>
                        <div>
                          <Label htmlFor="signup-department">Department</Label>
                          <Select onValueChange={(value) => setSignUpData({...signUpData, department: value as Department})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
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
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;