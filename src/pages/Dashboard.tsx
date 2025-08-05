import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import FacultyDashboard from "@/components/dashboards/FacultyDashboard";
import HODDashboard from "@/components/dashboards/HODDashboard";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";
import PRODashboard from "@/components/dashboards/PRODashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

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

  return renderDashboard();
};

export default Dashboard;