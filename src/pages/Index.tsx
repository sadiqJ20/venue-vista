import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Calendar, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <GraduationCap className="h-20 w-20 text-primary mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Seminar Hall Booking System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamlined hall booking management for colleges with role-based access and approval workflows
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="mr-4">
            Get Started
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Easy Booking</CardTitle>
              <CardDescription>Book seminar halls with a simple, intuitive interface</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>Different dashboards for Faculty, HOD, Principal, and PRO</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CheckCircle className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>Structured approval process from HOD to Principal to PRO</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
