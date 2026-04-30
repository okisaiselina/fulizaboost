'use client';

import { Check } from 'lucide-react';

interface LimitCardProps {
  limit: number;
  fee: number;
  isPopular?: boolean;
  isSelected?: boolean;
  onSelect: (limit: number, fee: number) => void;
}

export function LimitCard({
  limit,
  fee,
  isPopular = false,
  isSelected = false,
  onSelect,
}: LimitCardProps) {
  return (
    <button
      onClick={() => onSelect(limit, fee)}
      className={`relative w-full p-6 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-400 dark:hover:border-green-500'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-amber-400 dark:bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="text-left space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">NEW LIMIT</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Ksh {limit.toLocaleString()}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Fee <span className="font-semibold text-gray-900 dark:text-white">Ksh {fee.toLocaleString()}</span>
        </p>
      </div>

      {isSelected && (
        <div className="absolute top-4 right-4">
          <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
      )}
    </button>
  );
}
