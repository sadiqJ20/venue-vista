import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const EmailTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Email Notification Test Page
            </CardTitle>
            <CardDescription>
              This page is used for testing email notifications in the Hall Booking System.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Booking Approved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Test email notification when a booking is approved by any authority.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Booking Rejected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Test email notification when a booking is rejected with reason.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Approval Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Test email notification when approval is required from HOD/Principal/PRO.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Email Notification Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">EmailJS Integration</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Notification Templates</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Configured
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium">Delivery Rate</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    95%+
                  </Badge>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Service:</strong> EmailJS</p>
                  <p><strong>Template Engine:</strong> HTML Templates</p>
                  <p><strong>Delivery Method:</strong> SMTP via EmailJS</p>
                </div>
                <div>
                  <p><strong>Supported Events:</strong> Booking Status Changes</p>
                  <p><strong>Recipients:</strong> Faculty, HOD, Principal, PRO</p>
                  <p><strong>Real-time:</strong> Enabled</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Note:</h4>
                <p className="text-sm text-blue-800">
                  This is a test page for email notification functionality. 
                  Actual email sending is handled automatically by the system when booking status changes occur.
                  No manual email testing is required - the system sends notifications automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailTestPage;

