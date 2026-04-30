'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { AdsterraBanner } from '@/components/adsterra-banner';

export function Hero() {
  return (
    <div className="relative bg-gradient-to-b from-green-50 to-white dark:from-slate-900 dark:to-slate-800 py-12 px-4 transition-colors duration-200">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto text-center pt-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 text-balance">
          Boost your <span className="text-green-600 dark:text-green-400">Fuliza Limit</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-balance mb-6">
          Choose your target limit and complete a secure payment to upgrade instantly.
        </p>

        {/* Adsterra Banner Ad */}
        /*<AdsterraBanner />*/
      </div>
    </div>
  );
}
