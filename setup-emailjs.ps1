# EmailJS Integration Setup Script for Windows PowerShell
# This script helps set up EmailJS integration for the Hall Booking System

Write-Host "🚀 EmailJS Integration Setup for Hall Booking System" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ .env file created. Please edit it with your actual values." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📧 Create EmailJS Account:" -ForegroundColor White
Write-Host "   - Go to https://www.emailjs.com" -ForegroundColor Gray
Write-Host "   - Sign up for a free account" -ForegroundColor Gray
Write-Host "   - Verify your email address" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔧 Set up Email Service:" -ForegroundColor White
Write-Host "   - Go to Email Services in your dashboard" -ForegroundColor Gray
Write-Host "   - Add your email service (Gmail, Outlook, etc.)" -ForegroundColor Gray
Write-Host "   - Note down your Service ID" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 📄 Create Email Template:" -ForegroundColor White
Write-Host "   - Go to Email Templates" -ForegroundColor Gray
Write-Host "   - Create a new template" -ForegroundColor Gray
Write-Host "   - Use the HTML template from EMAILJS_TEMPLATE_SETUP.md" -ForegroundColor Gray
Write-Host "   - Note down your Template ID" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🔑 Get API Keys:" -ForegroundColor White
Write-Host "   - Go to Account → API Keys" -ForegroundColor Gray
Write-Host "   - Copy your Public Key" -ForegroundColor Gray
Write-Host ""
Write-Host "5. ⚙️  Update Environment Variables:" -ForegroundColor White
Write-Host "   - Edit your .env file with the following values:" -ForegroundColor Gray
Write-Host "     VITE_EMAILJS_SERVICE_ID=your_service_id" -ForegroundColor DarkGray
Write-Host "     VITE_EMAILJS_TEMPLATE_ID=your_template_id" -ForegroundColor DarkGray
Write-Host "     VITE_EMAILJS_PUBLIC_KEY=your_public_key" -ForegroundColor DarkGray
Write-Host ""
Write-Host "6. 🚀 Deploy Supabase Edge Function:" -ForegroundColor White
Write-Host "   - Set EmailJS secrets in Supabase:" -ForegroundColor Gray
Write-Host "     supabase secrets set EMAILJS_SERVICE_ID=your_service_id" -ForegroundColor DarkGray
Write-Host "     supabase secrets set EMAILJS_TEMPLATE_ID=your_template_id" -ForegroundColor DarkGray
Write-Host "     supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   - Deploy the edge function:" -ForegroundColor Gray
Write-Host "     supabase functions deploy send-emailjs-notification" -ForegroundColor DarkGray
Write-Host ""
Write-Host "7. 🗄️  Run Database Migration:" -ForegroundColor White
Write-Host "   - Apply the EmailJS migration:" -ForegroundColor Gray
Write-Host "     supabase db reset" -ForegroundColor DarkGray
Write-Host "     # or" -ForegroundColor DarkGray
Write-Host "     supabase migration up" -ForegroundColor DarkGray
Write-Host ""
Write-Host "8. 🧪 Test Email Notifications:" -ForegroundColor White
Write-Host "   - Start the development server:" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor DarkGray
Write-Host "   - Navigate to http://localhost:8080/email-test" -ForegroundColor DarkGray
Write-Host "   - Run all email notification tests" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "- EmailJS Template Setup: EMAILJS_TEMPLATE_SETUP.md" -ForegroundColor Gray
Write-Host "- Cross-Faculty Availability: CROSS_FACULTY_AVAILABILITY.md" -ForegroundColor Gray
Write-Host "- Project README: README.md" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Setup Complete! Follow the steps above to configure EmailJS." -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Yellow
Write-Host "- Test with real email addresses to verify delivery" -ForegroundColor Gray
Write-Host "- Check your email service provider's spam folder" -ForegroundColor Gray
Write-Host "- Monitor the Supabase logs for any edge function errors" -ForegroundColor Gray
Write-Host "- Use the test page at /email-test to verify all scenarios" -ForegroundColor Gray
