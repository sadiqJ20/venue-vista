# EmailJS Template Configuration

## Template Variables
Use these variables in your EmailJS template:

### Basic Information
- `{{to_email}}` - Recipient email address
- `{{subject}}` - Email subject
- `{{current_year}}` - Current year

### Booking Details
- `{{hall_name}}` - Name of the hall
- `{{event_name}}` - Name of the event
- `{{department_name}}` - Department name
- `{{faculty_name}}` - Faculty member name
- `{{faculty_phone}}` - Faculty phone number
- `{{hod_name}}` - Head of Department name
- `{{event_date}}` - Event date
- `{{start_time}}` - Start time
- `{{end_time}}` - End time
- `{{date_time}}` - Combined date and time
- `{{attendees_count}}` - Number of attendees

### Decision Information
- `{{decision}}` - Decision (Approved/Rejected/Pending/Changed)
- `{{decision_by}}` - Who made the decision
- `{{comments}}` - Additional comments
- `{{rejection_reason}}` - Reason for rejection (if applicable)

### Hall Change Information
- `{{old_hall_name}}` - Previous hall name (for changes)
- `{{new_hall_name}}` - New hall name (for changes)
- `{{changer_name}}` - Who changed the hall
- `{{change_reason}}` - Reason for hall change

### Links
- `{{app_link}}` - Link to the application sign-in page

## HTML Email Template

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }
        .content {
            margin: 20px 0;
        }
        .booking-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .booking-details h3 {
            color: #495057;
            margin-top: 0;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
        }
        .detail-row {
            display: flex;
            margin: 8px 0;
        }
        .detail-label {
            font-weight: bold;
            min-width: 120px;
            color: #495057;
        }
        .detail-value {
            color: #212529;
        }
        .decision-section {
            background-color: #e9ecef;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .decision-section h3 {
            color: #495057;
            margin-top: 0;
        }
        .status-approved {
            color: #28a745;
            font-weight: bold;
        }
        .status-rejected {
            color: #dc3545;
            font-weight: bold;
        }
        .status-pending {
            color: #ffc107;
            font-weight: bold;
        }
        .status-changed {
            color: #17a2b8;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 12px;
        }
        .cta-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .cta-button:hover {
            background-color: #0056b3;
        }
        .rejection-reason {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .hall-change {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hall Booking System</h1>
            <p>Smart Campus Management</p>
        </div>

        <div class="content">
            <p>Dear {{faculty_name}},</p>

            {{#if (eq decision "Approved")}}
                <p><strong class="status-approved">Congratulations! Your hall booking has been approved and confirmed.</strong></p>
            {{/if}}

            {{#if (eq decision "Rejected")}}
                <p><strong class="status-rejected">Your hall booking request has been rejected.</strong></p>
            {{/if}}

            {{#if (eq decision "Pending")}}
                <p><strong class="status-pending">A hall booking request requires your approval.</strong></p>
            {{/if}}

            {{#if (eq decision "Changed")}}
                <p><strong class="status-changed">Your hall booking has been changed.</strong></p>
            {{/if}}

            <div class="booking-details">
                <h3>Booking Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Hall:</span>
                    <span class="detail-value">{{hall_name}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Event:</span>
                    <span class="detail-value">{{event_name}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">{{event_date}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">{{start_time}} to {{end_time}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Department:</span>
                    <span class="detail-value">{{department_name}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Faculty:</span>
                    <span class="detail-value">{{faculty_name}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">{{faculty_phone}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">HOD:</span>
                    <span class="detail-value">{{hod_name}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Attendees:</span>
                    <span class="detail-value">{{attendees_count}}</span>
                </div>
            </div>

            {{#if (eq decision "Changed")}}
                <div class="hall-change">
                    <h3>Hall Change Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">From:</span>
                        <span class="detail-value">{{old_hall_name}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">To:</span>
                        <span class="detail-value">{{new_hall_name}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Changed by:</span>
                        <span class="detail-value">{{changer_name}}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Reason:</span>
                        <span class="detail-value">{{change_reason}}</span>
                    </div>
                </div>
            {{/if}}

            <div class="decision-section">
                <h3>Decision Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value status-{{lowercase decision}}">{{decision}}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Decision by:</span>
                    <span class="detail-value">{{decision_by}}</span>
                </div>
                {{#if comments}}
                    <div class="detail-row">
                        <span class="detail-label">Comments:</span>
                        <span class="detail-value">{{comments}}</span>
                    </div>
                {{/if}}
                {{#if rejection_reason}}
                    <div class="rejection-reason">
                        <strong>Rejection Reason:</strong><br>
                        {{rejection_reason}}
                    </div>
                {{/if}}
            </div>

            {{#if (eq decision "Approved")}}
                <p>Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.</p>
            {{/if}}

            {{#if (eq decision "Rejected")}}
                <p>Please contact the {{decision_by}} for more information or to submit a new request.</p>
            {{/if}}

            {{#if (eq decision "Pending")}}
                <p>Please review and approve/reject this booking request in the system.</p>
            {{/if}}

            {{#if (eq decision "Changed")}}
                <p>Please note this change for your event planning.</p>
            {{/if}}

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{app_link}}" class="cta-button">Access Hall Booking System</a>
            </div>
        </div>

        <div class="footer">
            <p>This is an automated notification from the Hall Booking System.</p>
            <p>&copy; {{current_year}} Hall Booking System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## Setup Instructions

1. **Create EmailJS Account**: Go to [EmailJS.com](https://www.emailjs.com) and create an account.

2. **Create Email Service**: 
   - Add your email service provider (Gmail, Outlook, etc.)
   - Note down your Service ID

3. **Create Email Template**:
   - Use the HTML template above
   - Note down your Template ID

4. **Get Public Key**:
   - Go to Account → API Keys
   - Copy your Public Key

5. **Configure Environment Variables**:
   ```bash
   # Add to your .env file
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```

6. **Deploy Supabase Edge Function**:
   ```bash
   # Add EmailJS environment variables to Supabase
   supabase secrets set EMAILJS_SERVICE_ID=your_service_id
   supabase secrets set EMAILJS_TEMPLATE_ID=your_template_id
   supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key
   
   # Deploy the edge function
   supabase functions deploy send-emailjs-notification
   ```

7. **Run Migration**:
   ```bash
   supabase db reset
   # or
   supabase migration up
   ```

## Testing

After setup, test all scenarios:
1. Faculty books hall → HOD receives email
2. HOD approves → Principal receives email  
3. Principal approves → PRO receives email
4. PRO approves → Faculty receives confirmation
5. Any rejection → Faculty receives rejection email with reason
6. Hall change → Faculty receives change notification
