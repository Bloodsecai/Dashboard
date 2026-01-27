# Sales CRM Dashboard

A premium, feature-rich Sales CRM Dashboard built with Next.js 14, TypeScript, and Firebase. Features real-time analytics, Google Sheets import, and a modern glassmorphism UI.

## 🚀 Features

- **Real-time Dashboard**: Live KPI metrics and charts
- **Sales Management**: Add, edit, delete, and search sales records
- **Customer Analytics**: View customer purchase history and statistics
- **Google Sheets Import**: Import data directly from Google Sheets with duplicate detection
- **CSV Export**: Export filtered or all sales data
- **Admin Authentication**: Firebase email/password authentication with allowlist
- **Responsive Design**: Works on desktop and mobile devices
- **Premium UI**: Glassmorphism design with smooth animations

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Authentication**: Firebase Auth
- **Database**: Firestore (real-time)
- **Date Handling**: date-fns
- **CSV Processing**: PapaParse
- **Notifications**: Sonner

## 📋 Prerequisites

- Node.js 18+ required
- Firebase project with Firestore enabled
- Google account for Sheets import (optional)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sales-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.local.example` to `.env.local`
   - The Firebase credentials are already configured

4. **Firebase Configuration**
   - Go to your Firebase Console
   - Navigate to Firestore Database → Rules
   - Paste the following security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isAdmin() {
         return request.auth != null &&
                request.auth.token.email in [
                  'admin@whitekeymarketing.com',
                  'sales@whitekeymarketing.com'
                ];
       }

       match /sales/{saleId} {
         allow read, write: if isAdmin();
       }

       match /imports/{importId} {
         allow read, write: if isAdmin();
       }
     }
   }
   ```

5. **Add Admin Users**
   - Edit `src/config/admins.ts`
   - Add your admin email addresses to `ADMIN_ALLOWLIST`
   - Update the Firestore rules with the same emails

## 🏃 Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📊 Google Sheets Import Guide

### Method 1: Published CSV URL
1. Open your Google Sheet
2. Go to File → Share → Publish to web
3. Select "Comma-separated values (.csv)"
4. Copy the published URL
5. Use this URL in the import page

### Method 2: Public Sheet
1. Make your Google Sheet publicly viewable
2. Copy the sheet URL
3. The app will automatically convert it to a CSV endpoint

### Supported Data Format
Your CSV should have columns like:
- Amount (numeric)
- Product (text)
- Date (various formats supported)
- Customer (optional)
- Status (optional: paid/pending/refunded)
- Notes (optional)

## 📁 Project Structure

```
sales-crm/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (redirect logic)
│   │   ├── login/
│   │   ├── access-denied/
│   │   └── dashboard/
│   │       ├── layout.tsx (sidebar)
│   │       ├── page.tsx (overview)
│   │       ├── sales/
│   │       ├── customers/
│   │       ├── import/
│   │       └── settings/
│   ├── components/
│   │   ├── ui/ (reusable components)
│   │   ├── auth/
│   │   ├── dashboard/ (charts, KPIs)
│   │   ├── sales/ (table, modals)
│   │   └── customers/
│   ├── hooks/ (useSales, useKPIs)
│   ├── lib/ (firebase, csv utils)
│   ├── types/
│   ├── config/
│   └── constants/
├── firestore.rules
├── .env.local
└── README.md
```

## 🔐 Authentication

The app uses Firebase Authentication with an admin allowlist. Only users with emails in the `ADMIN_ALLOWLIST` can access the dashboard.

## 🎨 Design System

- **Colors**: Dark theme with glassmorphism effects
- **Typography**: Inter font family
- **Components**: Reusable UI components with consistent styling
- **Animations**: Smooth transitions and hover effects

## 📈 Features Overview

### Dashboard Overview
- Real-time KPI cards (Total Revenue, Sales Count, Today's Revenue, Monthly Revenue)
- Revenue trend line chart
- Top products bar chart
- Sales status distribution pie chart
- Recent sales widget

### Sales Management
- Sortable and searchable sales table
- Add/edit/delete sales with form validation
- CSV export of filtered data
- Pagination (10/25/50/100 per page)

### Customer Analytics
- Customer cards with spending statistics
- Customer details drawer with purchase history
- Search and filter customers

### Google Sheets Import
- URL-based import from published sheets
- Data preview and column mapping
- Duplicate detection using fingerprints
- Import history tracking

### Settings
- Admin user management
- Currency and date format settings
- Data export options

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support or questions, contact the development team.

---

Built with ❤️ using Next.js and Firebase
