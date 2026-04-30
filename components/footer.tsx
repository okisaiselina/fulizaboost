'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 sm:mt-16 transition-colors duration-200">
      <div>
        {/* Copyright Section */}
        <div className="text-center border-t border-gray-200 dark:border-slate-700 pt-6">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            &copy; {currentYear} Fuliza Limit Boost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
