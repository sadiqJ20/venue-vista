import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Calendar, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PMCHeader from "@/components/PMCHeader";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pmc-bg.webp')",
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
      </div>
      
      {/* PMC Style Header */}
      <PMCHeader />
      
      {/* Hero Section - Add padding for fixed header */}
      <div className="container mx-auto px-6 py-16 pt-24 relative z-10">
        {/* Subtle shadow from nav bar */}
        <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-b from-gray-100/50 to-transparent pointer-events-none"></div>
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
          <Card className="bg-white/90 backdrop-blur-md border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Easy Booking</CardTitle>
              <CardDescription>Book seminar halls with a simple, intuitive interface</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white/90 backdrop-blur-md border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>Different dashboards for Faculty, HOD, Principal, and PRO</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-white/90 backdrop-blur-md border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
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
