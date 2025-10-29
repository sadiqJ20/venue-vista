import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import FacultyDashboard from "@/components/dashboards/FacultyDashboard";
import HODDashboard from "@/components/dashboards/HODDashboard";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";
import PRODashboard from "@/components/dashboards/PRODashboard";
import ChairmanDashboard from "@/components/dashboards/ChairmanDashboard";
import { Loader2, GraduationCap, LogOut, Bell, Home, Calendar, MapPin, User, Settings, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/NotificationCenter";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<{
    status: 'checking' | 'authenticated' | 'unauthenticated' | 'error';
    message?: string;
  }>({ status: 'checking' });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Dashboard: Checking authentication status...');
        
        // If we're still loading auth state, wait
        if (loading) {
          console.log('Dashboard: Auth is still loading...');
          return;
        }

        // No user and not loading means not authenticated
        if (!user) {
          console.log('Dashboard: No user found, redirecting to login');
          setAuthState({ 
            status: 'unauthenticated',
            message: 'Please log in to continue' 
          });
          navigate('/auth');
          return;
        }

        // We have a user but no profile yet
        if (!profile) {
          console.log('Dashboard: User found but profile is loading...');
          return;
        }

        // Verify user role
        const validRoles = ['faculty', 'hod', 'principal', 'pro', 'chairman'];
        if (!validRoles.includes(profile.role)) {
          console.log(`Dashboard: Unauthorized role: ${profile.role}`);
          setAuthState({ 
            status: 'unauthenticated',
            message: 'You do not have permission to access this page' 
          });
          navigate('/auth');
          return;
        }

        console.log(`Dashboard: User authenticated as ${profile.role}`);
        setAuthState({ status: 'authenticated' });
        
      } catch (error) {
        console.error('Dashboard: Authentication check failed:', error);
        setAuthState({ 
          status: 'error',
          message: 'An error occurred while checking authentication' 
        });
      }
    };

    checkAuth();
  }, [user, profile, loading, navigate]);

  // Show loading state
  if (loading || authState.status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-gray-600">Loading your dashboard...</p>
          <p className="text-sm text-gray-500">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (authState.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
          <p className="text-gray-600">
            {authState.message || 'An unexpected error occurred while loading the dashboard.'}
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
            <Button onClick={() => signOut()}>
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (authState.status === 'unauthenticated' || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800">Access Required</h2>
          <p className="text-gray-600">
            {authState.message || 'You need to be logged in to view this page.'}
          </p>
          <div className="pt-4">
            <Button onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'faculty': return 'Faculty Member';
      case 'hod': return 'Head of Department';
      case 'principal': return 'Principal';
      case 'pro': return 'Public Relations Officer';
      case 'chairman': return 'Chairman';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'faculty': return <User className="h-5 w-5" />;
      case 'hod': return <GraduationCap className="h-5 w-5" />;
      case 'principal': return <GraduationCap className="h-5 w-5" />;
      case 'pro': return <User className="h-5 w-5" />;
      case 'chairman': return <Shield className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const renderDashboard = () => {
    switch (profile.role) {
      case 'faculty':
        return <FacultyDashboard />;
      case 'hod':
        return <HODDashboard />;
      case 'principal':
        return <PrincipalDashboard />;
      case 'pro':
        return <PRODashboard />;
      case 'chairman':
        return <ChairmanDashboard />;
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between items-center h-32">
            {/* Left: Logo */}
            <div className="flex items-center">
              <img
                src="/logos/pmc-logo.jpg"
                alt="PMC Tech Logo"
                className="h-14 w-auto object-contain"
              />
            </div>

            {/* Center: Title */}
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Seminar Hall Booking</h1>
              <p className="text-sm text-gray-500">Smart Campus System</p>
            </div>

            {/* Right: Notifications and User */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="transition-transform duration-200 hover:scale-105">
                <NotificationCenter />
              </div>
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-base font-semibold text-gray-900">{profile.name}</p>
                  <p className="text-xs text-gray-500">{getRoleDisplayName(profile.role)}</p>
                </div>
                <div className="bg-gradient-to-r from-primary to-secondary p-2.5 rounded-full transition-transform duration-200 hover:scale-105">
                  {getRoleIcon(profile.role)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={signOut}
                  className="border-gray-300 text-gray-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {/* Separator color bar to differentiate navbar and welcome section */}
      <div className="h-2 bg-gradient-to-b from-secondary/30 to-transparent"></div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-secondary shadow-inner ring-1 ring-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-0.5">
              Welcome back, {profile.name}!
            </h2>
            <p className="text-white/90 text-xs">
              {getRoleDisplayName(profile.role)}
              {profile.department && ` • ${profile.department} Department`}
            </p>
            {/* <div className="mt-1">
              <Badge className="bg-white/30 text-white border-white/40 px-1.5 py-0.5 text-[9px]">
                {profile.role.toUpperCase()} 
              </Badge>
            </div> */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;