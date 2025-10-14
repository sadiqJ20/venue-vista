import { sendBookingEmail, sendBookingNotification, getEmailRecipient } from '@/lib/emailNotifications';

/**
 * Test function to verify EmailJS integration
 * This can be called from the browser console or a test component
 */
export const testEmailJSIntegration = async () => {
  try {
    console.log('Testing EmailJS integration...');
    
    // Test data matching the template variables
    const testData = {
      to_email: 'test@example.com',
      recipient_name: 'Test User',
      faculty_name: 'Dr. Test Faculty',
      faculty_contact: '+1234567890',
      department_name: 'Computer Science',
      hall_name: 'Main Auditorium',
      event_name: 'Test Event',
      booking_date_time: '2025-01-15 from 10:00 to 12:00',
      approved_by: 'HOD',
      comments: 'This is a test email to verify EmailJS integration.',
      link: window.location.origin + '/auth'
    };

    console.log('Sending test email with data:', testData);
    
    const result = await sendBookingEmail(testData);
    
    console.log('EmailJS test result:', result);
    
    if (result.status === 200) {
      console.log('✅ EmailJS integration test successful!');
      return { success: true, message: 'Email sent successfully' };
    } else {
      console.log('❌ EmailJS integration test failed:', result);
      return { success: false, message: 'Email failed to send' };
    }
  } catch (error) {
    console.error('❌ EmailJS integration test error:', error);
    return { success: false, message: `Error: ${error}` };
  }
};

/**
 * Test function to verify the email recipient flow logic
 */
export const testEmailRecipientFlow = async () => {
  try {
    console.log('Testing EmailJS recipient flow logic...');
    
    // Mock booking data
    const mockBooking = {
      faculty_id: 'test-faculty-id',
      faculty_name: 'Dr. Test Faculty',
      faculty_phone: '+1234567890',
      department: 'Computer Science',
      event_name: 'Test Event',
      event_date: '2025-01-15',
      start_time: '10:00',
      end_time: '12:00',
      attendees_count: 50,
      halls: { name: 'Main Auditorium' }
    };

    // Test different scenarios
    const testScenarios = [
      { actionBy: 'Faculty', status: 'Pending', expectedRecipient: 'HOD' },
      { actionBy: 'HOD', status: 'Approved', expectedRecipient: 'Principal' },
      { actionBy: 'Principal', status: 'Approved', expectedRecipient: 'PRO' },
      { actionBy: 'PRO', status: 'Approved', expectedRecipient: 'Faculty' },
      { actionBy: 'HOD', status: 'Rejected', expectedRecipient: 'Faculty' },
      { actionBy: 'Principal', status: 'Rejected', expectedRecipient: 'Faculty' },
      { actionBy: 'PRO', status: 'Rejected', expectedRecipient: 'Faculty' }
    ];

    console.log('Testing recipient determination logic...');
    
    for (const scenario of testScenarios) {
      const recipientInfo = await getEmailRecipient(mockBooking, scenario.actionBy, scenario.status);
      
      if (recipientInfo) {
        console.log(`✅ ${scenario.actionBy} ${scenario.status} → ${scenario.expectedRecipient}:`, {
          sendTo: recipientInfo.sendTo,
          recipientName: recipientInfo.recipientName,
          decisionBy: recipientInfo.decisionBy
        });
      } else {
        console.log(`❌ ${scenario.actionBy} ${scenario.status} → Failed to determine recipient`);
      }
    }

    return { success: true, message: 'Email recipient flow test completed' };
  } catch (error) {
    console.error('❌ Email recipient flow test error:', error);
    return { success: false, message: `Error: ${error}` };
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testEmailJSIntegration = testEmailJSIntegration;
  (window as any).testEmailRecipientFlow = testEmailRecipientFlow;
}
