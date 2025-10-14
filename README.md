# Hall Flow Hub

A comprehensive hall booking management system built with modern web technologies. This application provides a streamlined workflow for managing hall reservations across educational institutions with role-based access control.

## Features

- **Role-based Dashboard**: Separate interfaces for Faculty, HOD, Principal, and PRO
- **Booking Management**: Create, approve, and manage hall bookings
- **Real-time Notifications**: Email notifications for booking status changes
- **Hall Availability**: Check hall availability and manage conflicts
- **Approval Workflow**: Multi-level approval process (HOD → Principal → PRO)
- **Responsive Design**: Modern UI built with shadcn/ui and Tailwind CSS

## you wana try
Link : venue-vista-pvm8.vercel.app

## Tech Stack

This project is built with:

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <YOUR_REPOSITORY_URL>
cd hall-flow-hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add your Supabase and EmailJS configuration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

4. Set up EmailJS (for email notifications):
```bash
# Create EmailJS account at https://www.emailjs.com
# Follow the setup guide in EMAILJS_TEMPLATE_SETUP.md
# Configure your email service and template
# Add environment variables as shown above
```

5. Set up the database:
```bash
# Run Supabase migrations
supabase db reset
```

6. Deploy Supabase Edge Function:
```bash
# Set EmailJS secrets in Supabase
supabase secrets set EMAILJS_SERVICE_ID=your_service_id
supabase secrets set EMAILJS_TEMPLATE_ID=your_template_id
supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key

# Deploy the EmailJS edge function
supabase functions deploy send-emailjs-notification
```

7. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── dashboards/     # Role-specific dashboard components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility functions
├── pages/              # Application pages
└── supabase/           # Database migrations and functions
```

## Database Schema

The application uses a PostgreSQL database with the following key tables:
- `bookings` - Hall booking requests
- `booking_approvals` - Approval history
- `profiles` - User profiles with roles
- `halls` - Available halls
- `notifications` - System notifications

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Deploy to Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Set environment variables in Netlify dashboard

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
