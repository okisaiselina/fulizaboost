'use client';

import { useState, useEffect } from 'react';
import { Hero } from '@/components/hero';
import { Features } from '@/components/features';
import { LimitCard } from '@/components/limit-card';
import { PaymentModal } from '@/components/payment-modal';
import { ContinuousToastNotifications } from '@/components/continuous-toasts';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

const LIMIT_TIERS = [
  { limit: 7500, fee: 99, popular: false },
  { limit: 10000, fee: 149, popular: false },
  { limit: 12500, fee: 210, popular: false },
  { limit: 16000, fee: 450, popular: false },
  { limit: 21000, fee: 550, popular: false },
  { limit: 25500, fee: 649, popular: true },
  { limit: 30000, fee: 700, popular: false },
  { limit: 35000, fee: 850, popular: true },
  { limit: 40000, fee: 1000, popular: false },
  { limit: 45000, fee: 1250, popular: false },
  { limit: 50000, fee: 1500, popular: false },
  { limit: 60000, fee: 1750, popular: false },
  { limit: 70000, fee: 2050, popular: false },
];

export default function Home() {
  const [selectedLimit, setSelectedLimit] = useState<number | null>(null);
  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successData, setSuccessData] = useState<{ phoneNumber: string; newLimit: number } | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Auto-select popular tier on load
    const popular = LIMIT_TIERS.find((tier) => tier.popular);
    if (popular) {
      setSelectedLimit(popular.limit);
      setSelectedFee(popular.fee);
    }
  }, []);

  const handleSelectLimit = (limit: number, fee: number) => {
    setSelectedLimit(limit);
    setSelectedFee(fee);
  };

  const handleContinueToPayment = () => {
    if (selectedLimit && selectedFee !== null) {
      setIsModalOpen(true);
    }
  };

  const handlePaymentSuccess = (phoneNumber: string, newLimit: number) => {
    setSuccessData({ phoneNumber, newLimit });
    setShowSuccessMessage(true);
    // Auto-hide message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <ContinuousToastNotifications />
      <Hero />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pb-32 sm:pb-36 md:pb-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <Features />

          {/* Limit Selection Grid */}
          <div className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {LIMIT_TIERS.map((tier) => (
                <LimitCard
                  key={tier.limit}
                  limit={tier.limit}
                  fee={tier.fee}
                  isPopular={tier.popular}
                  isSelected={selectedLimit === tier.limit}
                  onSelect={handleSelectLimit}
                />
              ))}
            </div>
          </div>

          {/* Footer Content - In Scrollable Area */}
          <Footer />
        </div>
      </div>

      {/* Sticky Bottom Section - Not Scrollable */}
      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          {/* Activation Fee - Dynamic based on selected tier */}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
            Activation fee{' '}
            <span className="font-semibold text-gray-900 dark:text-white">Ksh {selectedFee || 0}</span>
          </p>

          {/* Continue Button */}
          <Button
            onClick={handleContinueToPayment}
            disabled={!selectedLimit}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-lg transition-colors duration-200"
          >
            Continue to payment
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        newLimit={selectedLimit || 0}
        processingFee={selectedFee || 0}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </main>
  );
}
