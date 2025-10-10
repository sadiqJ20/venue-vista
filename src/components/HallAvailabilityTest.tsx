import React, { useState, useEffect } from 'react';
import { useHallAvailability } from '@/hooks/useHallAvailability';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HallAvailabilityTest = () => {
  const { halls, checkHallAvailability, getHallAvailabilityStatus } = useHallAvailability();
  interface TestResult {
    hallId: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    description?: string;
    isAvailable: boolean;
    status: { available: boolean; reason: string; conflictingBooking?: unknown };
    timestamp: string;
  }

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testData, setTestData] = useState({
    hallId: '',
    eventDate: '',
    startTime: '',
    endTime: ''
  });

  // Auto-populate with current date and time for easier testing
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    setTestData(prev => ({
      ...prev,
      eventDate: today,
      startTime: currentTime,
      endTime: new Date(now.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5) // 1 hour later
    }));
  }, []);

  // Add a refresh button to manually refresh hall availability
  const handleRefresh = () => {
    window.location.reload();
  };

  const runAvailabilityTest = async () => {
    if (!testData.hallId || !testData.eventDate || !testData.startTime || !testData.endTime) {
      alert('Please fill in all test fields');
      return;
    }

    try {
      const [isAvailable, status] = await Promise.all([
        checkHallAvailability(testData.hallId, testData.eventDate, testData.startTime, testData.endTime),
        getHallAvailabilityStatus(testData.hallId, testData.eventDate, testData.startTime, testData.endTime)
      ]);

      const result = {
        ...testData,
        isAvailable,
        status,
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
    } catch (error) {
      console.error('Test error:', error);
      alert('Test failed: ' + error);
    }
  };

  const runComprehensiveTest = async () => {
    if (halls.length === 0) {
      alert('No halls available for testing');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const testScenarios = [
      // Test different time ranges for different halls
      { hallId: halls[0].id, eventDate: today, startTime: currentTime, endTime: new Date(now.getTime() + 30 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), description: 'Hall 1 - Current time + 30min' },
      { hallId: halls[0].id, eventDate: today, startTime: new Date(now.getTime() + 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), endTime: new Date(now.getTime() + 90 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), description: 'Hall 1 - 1 hour from now' },
      { hallId: halls[1]?.id || halls[0].id, eventDate: today, startTime: currentTime, endTime: new Date(now.getTime() + 45 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), description: 'Hall 2 - Current time + 45min' },
      { hallId: halls[1]?.id || halls[0].id, eventDate: today, startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5), description: 'Hall 2 - 2 hours from now' },
    ];

    const results = [];
    for (const scenario of testScenarios) {
      if (!scenario.hallId) continue;
      
      try {
        const [isAvailable, status] = await Promise.all([
          checkHallAvailability(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime),
          getHallAvailabilityStatus(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime)
        ]);

        results.push({
          ...scenario,
          isAvailable,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Test error for scenario:', scenario, error);
        results.push({
          ...scenario,
          isAvailable: false,
          status: { available: false, reason: 'Test failed: ' + error },
          timestamp: new Date().toISOString()
        });
      }
    }

    setTestResults(prev => [...results, ...prev.slice(0, 5)]); // Keep last 15 results
  };

  const runTimeSlotTest = async () => {
    if (halls.length < 2) {
      alert('Need at least 2 halls for this test');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    // Test scenario: Book different halls at different times
    const testScenarios = [
      {
        hallId: halls[0].id,
        eventDate: today,
        startTime: currentTime,
        endTime: new Date(now.getTime() + 30 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        description: `Test: ${halls[0].name} should be UNAVAILABLE now (${currentTime})`
      },
      {
        hallId: halls[1].id,
        eventDate: today,
        startTime: new Date(now.getTime() + 15 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        endTime: new Date(now.getTime() + 45 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        description: `Test: ${halls[1].name} should be AVAILABLE now (${currentTime})`
      }
    ];

    const results = [];
    for (const scenario of testScenarios) {
      try {
        const [isAvailable, status] = await Promise.all([
          checkHallAvailability(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime),
          getHallAvailabilityStatus(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime)
        ]);

        results.push({
          ...scenario,
          isAvailable,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Test error for scenario:', scenario, error);
        results.push({
          ...scenario,
          isAvailable: false,
          status: { available: false, reason: 'Test failed: ' + error },
          timestamp: new Date().toISOString()
        });
      }
    }

    setTestResults(prev => [...results, ...prev.slice(0, 5)]);
  };

  const runCrossFacultyTest = async () => {
    if (halls.length === 0) {
      alert('No halls available for testing');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    // Test scenario: Simulate cross-faculty availability
    const testScenarios = [
      {
        hallId: halls[0].id,
        eventDate: today,
        startTime: currentTime,
        endTime: new Date(now.getTime() + 30 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        description: `Cross-Faculty Test: ${halls[0].name} should be UNAVAILABLE for ALL faculty now (${currentTime})`
      },
      {
        hallId: halls[0].id,
        eventDate: today,
        startTime: new Date(now.getTime() + 45 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        endTime: new Date(now.getTime() + 75 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5),
        description: `Cross-Faculty Test: ${halls[0].name} should be AVAILABLE for ALL faculty at 45min from now`
      }
    ];

    const results = [];
    for (const scenario of testScenarios) {
      try {
        const [isAvailable, status] = await Promise.all([
          checkHallAvailability(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime),
          getHallAvailabilityStatus(scenario.hallId, scenario.eventDate, scenario.startTime, scenario.endTime)
        ]);

        results.push({
          ...scenario,
          isAvailable,
          status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Test error for scenario:', scenario, error);
        results.push({
          ...scenario,
          isAvailable: false,
          status: { available: false, reason: 'Test failed: ' + error },
          timestamp: new Date().toISOString()
        });
      }
    }

    setTestResults(prev => [...results, ...prev.slice(0, 5)]);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hall Availability Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hallId">Select Hall</Label>
              <Select value={testData.hallId} onValueChange={(value) => setTestData({...testData, hallId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hall" />
                </SelectTrigger>
                <SelectContent>
                  {halls.map(hall => (
                    <SelectItem key={hall.id} value={hall.id}>
                      {hall.name} ({hall.block})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={testData.eventDate}
                onChange={(e) => setTestData({...testData, eventDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={testData.startTime}
                onChange={(e) => setTestData({...testData, startTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={testData.endTime}
                onChange={(e) => setTestData({...testData, endTime: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={runAvailabilityTest} className="w-full">
              Test Single Availability
            </Button>
            <Button onClick={runComprehensiveTest} variant="outline" className="w-full">
              Run Comprehensive Test (Multiple Halls & Times)
            </Button>
            <Button onClick={runTimeSlotTest} variant="secondary" className="w-full">
              Test Time-Slot Logic (Current Time)
            </Button>
            <Button onClick={runCrossFacultyTest} variant="destructive" className="w-full">
              Test Cross-Faculty Availability
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Hall Status ({halls.length} halls)
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {halls.map(hall => (
              <div key={hall.id} className="flex justify-between items-center p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{hall.name}</span>
                    <span className="text-sm text-gray-500">({hall.block})</span>
                  </div>
                  {hall.currentBooking && (
                    <div className="text-sm text-red-600 mt-1">
                      Currently booked by: {hall.currentBooking.faculty_name} - {hall.currentBooking.event_name} ({hall.currentBooking.start_time}-{hall.currentBooking.end_time})
                    </div>
                  )}
                  {hall.bookedUntil && !hall.currentBooking && (
                    <div className="text-sm text-orange-600 mt-1">
                      Next booking until: {hall.bookedUntil}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded text-sm font-medium ${
                    hall.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {hall.isAvailable ? 'Available' : 'Booked'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {hall.id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
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
                <div key={index} className="p-3 border rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {result.description || `${result.hallId} - ${result.eventDate} ${result.startTime}-${result.endTime}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        Hall ID: {result.hallId}
                      </div>
                      <div className="text-sm text-gray-600">
                        Time: {result.eventDate} {result.startTime}-{result.endTime}
                      </div>
                      <div className="text-sm text-gray-600">
                        Available: {result.isAvailable ? 'Yes' : 'No'}
                      </div>
                      <div className="text-sm text-gray-600">
                        Reason: {result.status.reason}
                      </div>
                      {result.status.conflictingBooking && (
                        <div className="text-sm text-red-600">
                          Conflicting: {(result.status.conflictingBooking as { event_name: string; start_time: string; end_time: string }).event_name} ({(result.status.conflictingBooking as { event_name: string; start_time: string; end_time: string }).start_time}-{(result.status.conflictingBooking as { event_name: string; start_time: string; end_time: string }).end_time})
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      result.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.isAvailable ? 'Available' : 'Not Available'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HallAvailabilityTest;
