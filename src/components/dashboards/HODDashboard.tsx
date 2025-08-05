import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, UserCheck } from "lucide-react";

const HODDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">HOD Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name}</p>
          </div>
          <Button variant="outline" onClick={signOut} size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Department Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">HOD approval functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HODDashboard;