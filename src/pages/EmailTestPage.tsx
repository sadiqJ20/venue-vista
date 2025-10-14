import React, { useEffect } from 'react';
import EmailNotificationTester from '@/components/EmailNotificationTester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Settings, CheckCircle, TestTube } from 'lucide-react';
import { testEmailJSIntegration, testEmailRecipientFlow } from '@/utils/testEmailJS';

const EmailTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EmailJS Integration Test</h1>
          <p className="text-gray-600">Test all email notification scenarios with EmailJS</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Setup Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">EmailJS Package Installed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Utility Functions Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Edge Function Deployed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Database Triggers Updated</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>• Faculty books hall → HOD notification</div>
                <div>• HOD approves → Principal notification</div>
                <div>• Principal approves → PRO notification</div>
                <div>• PRO approves → Faculty confirmation</div>
                <div>• Any rejection → Faculty notification</div>
                <div>• Hall change → Faculty notification</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Quick Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  Test EmailJS integration with a simple email:
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={async () => {
                      const result = await testEmailJSIntegration();
                      alert(result.success ? '✅ Test successful!' : `❌ Test failed: ${result.message}`);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    Test EmailJS Integration
                  </Button>
                  <Button 
                    onClick={async () => {
                      const result = await testEmailRecipientFlow();
                      alert(result.success ? '✅ Flow test completed! Check console for details.' : `❌ Test failed: ${result.message}`);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    Test Email Recipient Flow
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  Test EmailJS integration and recipient flow logic.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <EmailNotificationTester />
      </div>
    </div>
  );
};

export default EmailTestPage;
