'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { ShieldX, LogOut } from 'lucide-react';

export default function AccessDeniedPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-danger/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden text-center">
          {/* Red top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-danger via-danger/80 to-danger" />

          {/* Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-danger/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldX className="w-10 h-10 text-danger" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              Access Denied
            </h1>
            <p className="text-text-secondary">
              You don't have permission to access this application.
              Please contact your administrator if you believe this is an error.
            </p>
          </div>

          <Button
            onClick={logout}
            variant="secondary"
            className="w-full"
            icon={LogOut}
          >
            Sign Out
          </Button>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-text-muted">
              Need help? Contact{' '}
              <a href="mailto:support@company.com" className="text-primary-purple hover:text-primary-pink transition-colors">
                support@company.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
