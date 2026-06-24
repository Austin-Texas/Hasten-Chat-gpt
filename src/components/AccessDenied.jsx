import { Link } from 'react-router-dom';
import { Lock, Home, Shield, AlertTriangle } from 'lucide-react';

export default function AccessDenied({ reason = "You don't have permission to access this section." }) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
      <div className="glass-card rounded-xl border border-white/5 p-8 max-w-md text-center space-y-4 animate-slide-up">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div>
          <h1 className="text-white font-heading font-bold text-2xl">Access Denied</h1>
          <p className="text-slate-400 text-sm mt-2">{reason}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-left">
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400" />
            <div>
              <p className="font-medium text-white mb-1">Why you see this:</p>
              <ul className="space-y-0.5 text-slate-500">
                <li>• Your role doesn't have permission for this section</li>
                <li>• Your account may be restricted</li>
                <li>• Contact your administrator if you think this is an error</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500 text-white font-medium text-sm hover:bg-orange-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-colors"
          >
            Go Back
          </button>
        </div>

        <p className="text-xs text-slate-600 pt-2">
          If you need access, request from your administrator
        </p>
      </div>
    </div>
  );
}