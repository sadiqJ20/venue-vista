import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PMCHeader from "@/components/PMCHeader";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
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
      <div className="container mx-auto px-6 py-16 pt-48 relative z-20 flex-1">
        {/* Subtle shadow from nav bar */}
        <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-b from-gray-100/50 to-transparent pointer-events-none"></div>
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-primary to-secondary rounded-full mb-6 shadow-lg">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Seminar Hall Booking System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamlined hall booking management for colleges with role-based access and approval workflows
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')} 
            className="bg-primary hover:bg-primary-hover text-white shadow-button hover:shadow-button-hover rounded-button transition-all duration-200 block mx-auto"
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
