import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import FacultyDashboard from "@/components/dashboards/FacultyDashboard";
import HODDashboard from "@/components/dashboards/HODDashboard";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";
import PRODashboard from "@/components/dashboards/PRODashboard";
import { Loader2, GraduationCap, LogOut, Bell, Home, Calendar, MapPin, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/NotificationCenter";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'faculty': return 'Faculty Member';
      case 'hod': return 'Head of Department';
      case 'principal': return 'Principal';
      case 'pro': return 'Public Relations Officer';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'faculty': return <User className="h-5 w-5" />;
      case 'hod': return <GraduationCap className="h-5 w-5" />;
      case 'principal': return <GraduationCap className="h-5 w-5" />;
      case 'pro': return <User className="h-5 w-5" />;
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
      default:
        return <div>Invalid role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-32">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-primary to-secondary p-3 rounded-xl">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Seminar Hall Booking</h1>
                  <p className="text-sm text-gray-500">Smart Campus System</p>
                </div>
              </div>
            </div>

            {/* Right Side - Notifications and User */}
            <div className="flex flex-wrap items-center gap-2">
              <NotificationCenter />
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-base font-semibold text-gray-900">{profile.name}</p>
                  <p className="text-xs text-gray-500">{getRoleDisplayName(profile.role)}</p>
                </div>
                <div className="bg-gradient-to-r from-primary to-secondary p-2.5 rounded-full">
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