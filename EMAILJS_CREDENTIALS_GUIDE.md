# EmailJS Credentials Location Guide

## 📍 Where to Find Each Credential

### 1. Service ID (`VITE_EMAILJS_SERVICE_ID`)

**Path:** Dashboard → Email Services

1. **Login to EmailJS:** Go to [https://www.emailjs.com](https://www.emailjs.com)
2. **Navigate to Email Services:**
   - Click "Email Services" in the left sidebar
   - You'll see a list of your email services
3. **Copy Service ID:**
   - Look for a service (e.g., Gmail, Outlook)
   - The Service ID is displayed next to the service name
   - Format: `service_abc123def`
   - Copy this value

### 2. Template ID (`VITE_EMAILJS_TEMPLATE_ID`)

**Path:** Dashboard → Email Templates

1. **Navigate to Email Templates:**
   - Click "Email Templates" in the left sidebar
   - You'll see a list of your templates
2. **Copy Template ID:**
   - Look for your template (you may need to create one first)
   - The Template ID is displayed next to the template name
   - Format: `template_xyz789ghi`
   - Copy this value

### 3. Public Key (`VITE_EMAILJS_PUBLIC_KEY`)

**Path:** Dashboard → Account → API Keys

1. **Navigate to Account:**
   - Click "Account" in the left sidebar
2. **Go to API Keys:**
   - Click on the "API Keys" tab
3. **Copy Public Key:**
   - You'll see your Public Key displayed
   - Format: `user_abcdef123456789`
   - Copy this value

## 🔧 If You Don't Have These Yet

### Create Email Service (if you don't have one):
1. Go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended)
4. Follow the authorization steps
5. Copy the Service ID that appears

### Create Email Template (if you don't have one):
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use the HTML template from `EMAILJS_TEMPLATE_SETUP.md`
4. Save the template
5. Copy the Template ID that appears

## 📝 Example of What You'll See

### In Email Services:
```
Service Name: Gmail
Service ID: service_abc123def  ← Copy this
Status: Active
```

### In Email Templates:
```
Template Name: Hall Booking Notification
Template ID: template_xyz789ghi  ← Copy this
Status: Active
```

### In API Keys:
```
Public Key: user_abcdef123456789  ← Copy this
Private Key: (hidden)
```

## ✅ After Getting All 3 Credentials

Update your `.env` file with the real values:

```env
VITE_EMAILJS_SERVICE_ID=service_abc123def
VITE_EMAILJS_TEMPLATE_ID=template_xyz789ghi
VITE_EMAILJS_PUBLIC_KEY=user_abcdef123456789
```

## 🚨 Important Notes

- **Service ID** starts with `service_`
- **Template ID** starts with `template_`
- **Public Key** starts with `user_`
- All values are case-sensitive
- Don't include quotes around the values in `.env`
- Make sure there are no extra spaces

## 🔍 Troubleshooting

**If you can't find these:**
1. Make sure you're logged into the correct EmailJS account
2. Check if you've created an email service first
3. Check if you've created an email template first
4. The Public Key should always be visible in Account → API Keys

**If you see different formats:**
- EmailJS may have updated their interface
- Look for similar naming patterns
- The important thing is to get the unique identifiers
