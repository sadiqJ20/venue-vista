import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { useToast } from '@/hooks/use-toast';
import { Mail, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const EmailNotificationTester = () => {
  const { 
    loading, 
    notifyHODNewBooking, 
    notifyPrincipalApproval, 
    notifyPROApproval, 
    notifyFacultyFinalApproval, 
    notifyFacultyRejection,
    notifyFacultyHallChange 
  } = useEmailNotifications();
  
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Array<{
    scenario: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: string;
  }>>([]);

  // Test data
  const [testData, setTestData] = useState({
    hodEmail: 'hod@example.com',
    hodName: 'Dr. John Smith',
    principalEmail: 'principal@example.com',
    principalName: 'Dr. Jane Doe',
    proEmail: 'pro@example.com',
    proName: 'Mr. Mike Johnson',
    facultyEmail: 'faculty@example.com',
    facultyName: 'Dr. Sarah Wilson',
    facultyPhone: '+1234567890',
    hallName: 'Main Auditorium',
    eventName: 'Annual Conference',
    departmentName: 'CSE',
    eventDate: '2025-01-15',
    startTime: '10:00',
    endTime: '12:00',
    attendeesCount: 50,
    rejectionReason: 'Hall maintenance scheduled',
    changeReason: 'Capacity requirements changed'
  });

  const addTestResult = (scenario: string, status: 'success' | 'error' | 'pending', message: string) => {
    setTestResults(prev => [{
      scenario,
      status,
      message,
      timestamp: new Date().toLocaleString()
    }, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testNewBookingNotification = async () => {
    try {
      addTestResult('New Booking', 'pending', 'Sending notification to HOD...');
      
      const success = await notifyHODNewBooking({
        hodEmail: testData.hodEmail,
        hodName: testData.hodName,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        hallName: testData.hallName,
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        attendeesCount: testData.attendeesCount
      });

      if (success) {
        addTestResult('New Booking', 'success', 'Email sent successfully to HOD');
        toast({ title: 'Success', description: 'New booking notification sent to HOD', variant: 'default' });
      } else {
        addTestResult('New Booking', 'error', 'Failed to send email to HOD');
        toast({ title: 'Error', description: 'Failed to send new booking notification', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('New Booking', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const testHODApprovalNotification = async () => {
    try {
      addTestResult('HOD Approval', 'pending', 'Sending notification to Principal...');
      
      const success = await notifyPrincipalApproval({
        principalEmail: testData.principalEmail,
        principalName: testData.principalName,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        hallName: testData.hallName,
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        hodName: testData.hodName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        attendeesCount: testData.attendeesCount
      });

      if (success) {
        addTestResult('HOD Approval', 'success', 'Email sent successfully to Principal');
        toast({ title: 'Success', description: 'HOD approval notification sent to Principal', variant: 'default' });
      } else {
        addTestResult('HOD Approval', 'error', 'Failed to send email to Principal');
        toast({ title: 'Error', description: 'Failed to send HOD approval notification', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('HOD Approval', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const testPrincipalApprovalNotification = async () => {
    try {
      addTestResult('Principal Approval', 'pending', 'Sending notification to PRO...');
      
      const success = await notifyPROApproval({
        proEmail: testData.proEmail,
        proName: testData.proName,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        hallName: testData.hallName,
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        hodName: testData.hodName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        attendeesCount: testData.attendeesCount
      });

      if (success) {
        addTestResult('Principal Approval', 'success', 'Email sent successfully to PRO');
        toast({ title: 'Success', description: 'Principal approval notification sent to PRO', variant: 'default' });
      } else {
        addTestResult('Principal Approval', 'error', 'Failed to send email to PRO');
        toast({ title: 'Error', description: 'Failed to send Principal approval notification', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('Principal Approval', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const testFinalApprovalNotification = async () => {
    try {
      addTestResult('Final Approval', 'pending', 'Sending confirmation to Faculty...');
      
      const success = await notifyFacultyFinalApproval({
        facultyEmail: testData.facultyEmail,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        hallName: testData.hallName,
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        hodName: testData.hodName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        attendeesCount: testData.attendeesCount,
        approverName: testData.proName,
        approverRole: 'PRO'
      });

      if (success) {
        addTestResult('Final Approval', 'success', 'Confirmation email sent successfully to Faculty');
        toast({ title: 'Success', description: 'Final approval confirmation sent to Faculty', variant: 'default' });
      } else {
        addTestResult('Final Approval', 'error', 'Failed to send confirmation email to Faculty');
        toast({ title: 'Error', description: 'Failed to send final approval confirmation', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('Final Approval', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const testRejectionNotification = async () => {
    try {
      addTestResult('Rejection', 'pending', 'Sending rejection notification to Faculty...');
      
      const success = await notifyFacultyRejection({
        facultyEmail: testData.facultyEmail,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        hallName: testData.hallName,
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        hodName: testData.hodName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        attendeesCount: testData.attendeesCount,
        rejectorName: testData.hodName,
        rejectorRole: 'HOD',
        rejectionReason: testData.rejectionReason
      });

      if (success) {
        addTestResult('Rejection', 'success', 'Rejection email sent successfully to Faculty');
        toast({ title: 'Success', description: 'Rejection notification sent to Faculty', variant: 'default' });
      } else {
        addTestResult('Rejection', 'error', 'Failed to send rejection email to Faculty');
        toast({ title: 'Error', description: 'Failed to send rejection notification', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('Rejection', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const testHallChangeNotification = async () => {
    try {
      addTestResult('Hall Change', 'pending', 'Sending hall change notification to Faculty...');
      
      const success = await notifyFacultyHallChange({
        facultyEmail: testData.facultyEmail,
        facultyName: testData.facultyName,
        facultyPhone: testData.facultyPhone,
        oldHallName: 'Main Auditorium',
        newHallName: 'Conference Room A',
        eventName: testData.eventName,
        departmentName: testData.departmentName,
        hodName: testData.hodName,
        eventDate: testData.eventDate,
        startTime: testData.startTime,
        endTime: testData.endTime,
        changerName: testData.hodName,
        changeReason: testData.changeReason
      });

      if (success) {
        addTestResult('Hall Change', 'success', 'Hall change email sent successfully to Faculty');
        toast({ title: 'Success', description: 'Hall change notification sent to Faculty', variant: 'default' });
      } else {
        addTestResult('Hall Change', 'error', 'Failed to send hall change email to Faculty');
        toast({ title: 'Error', description: 'Failed to send hall change notification', variant: 'destructive' });
      }
    } catch (error) {
      addTestResult('Hall Change', 'error', `Error: ${error}`);
      toast({ title: 'Error', description: 'Test failed', variant: 'destructive' });
    }
  };

  const runAllTests = async () => {
    const tests = [
      { name: 'New Booking', fn: testNewBookingNotification },
      { name: 'HOD Approval', fn: testHODApprovalNotification },
      { name: 'Principal Approval', fn: testPrincipalApprovalNotification },
      { name: 'Final Approval', fn: testFinalApprovalNotification },
      { name: 'Rejection', fn: testRejectionNotification },
      { name: 'Hall Change', fn: testHallChangeNotification }
    ];

    for (const test of tests) {
      await test.fn();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            EmailJS Notification Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hodEmail">HOD Email</Label>
              <Input
                id="hodEmail"
                value={testData.hodEmail}
                onChange={(e) => setTestData({...testData, hodEmail: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="facultyEmail">Faculty Email</Label>
              <Input
                id="facultyEmail"
                value={testData.facultyEmail}
                onChange={(e) => setTestData({...testData, facultyEmail: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="hallName">Hall Name</Label>
              <Input
                id="hallName"
                value={testData.hallName}
                onChange={(e) => setTestData({...testData, hallName: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={testData.eventName}
                onChange={(e) => setTestData({...testData, eventName: e.target.value})}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testNewBookingNotification} disabled={loading}>
              Test New Booking → HOD
            </Button>
            <Button onClick={testHODApprovalNotification} disabled={loading}>
              Test HOD Approval → Principal
            </Button>
            <Button onClick={testPrincipalApprovalNotification} disabled={loading}>
              Test Principal Approval → PRO
            </Button>
            <Button onClick={testFinalApprovalNotification} disabled={loading}>
              Test Final Approval → Faculty
            </Button>
            <Button onClick={testRejectionNotification} disabled={loading} variant="destructive">
              Test Rejection → Faculty
            </Button>
            <Button onClick={testHallChangeNotification} disabled={loading} variant="secondary">
              Test Hall Change → Faculty
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={runAllTests} disabled={loading} className="w-full">
              {loading ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.scenario}</div>
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                    <div className="text-xs text-muted-foreground">{result.timestamp}</div>
                  </div>
                  <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailNotificationTester;
