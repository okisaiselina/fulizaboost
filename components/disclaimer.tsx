'use client';

import { AlertCircle } from 'lucide-react';

export function Disclaimer() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 flex gap-3">
      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-yellow-900">Not an official Safaricom platform</p>
        <p className="text-xs text-yellow-800 mt-1">
          This is an independent service for Fuliza limit boosts. Safaricom does not endorse this service. Always verify with official Safaricom channels.
        </p>
      </div>
    </div>
  );
}
