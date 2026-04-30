'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Generate random phone numbers with masking
const generateMaskedPhone = (): string => {
  const prefix = Math.random() > 0.5 ? '07' : '01';
  const middleDigits = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0')
    .slice(0, 4);
  const lastDigits = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}****${lastDigits}`;
};

const boostLimits = [16000, 21000, 25500, 30000, 35000, 40000, 45000, 50000];

export function ContinuousToastNotifications() {
  const toastIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const usedPhonesRef = useRef<Set<string>>(new Set());
  const currentToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const showToast = () => {
      // Dismiss previous toast if exists
      if (currentToastIdRef.current) {
        toast.dismiss(currentToastIdRef.current);
      }

      let maskedPhone = generateMaskedPhone();
      
      // Ensure we don't repeat the same phone within the last 5 toasts
      let attempts = 0;
      while (usedPhonesRef.current.has(maskedPhone) && attempts < 10) {
        maskedPhone = generateMaskedPhone();
        attempts++;
      }

      const randomLimit = boostLimits[Math.floor(Math.random() * boostLimits.length)];

      // Show new toast and store its ID
      currentToastIdRef.current = toast.success(
        `✓ ${maskedPhone} - Limit boosted to Ksh ${randomLimit.toLocaleString()}`,
        {
          style: {
            background: '#16a34a',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '6px',
            padding: '12px 16px',
          },
          duration: 3000, // Auto-dismiss after 3 seconds
          position: 'top-right',
          dismissible: true,
        }
      );

      // Update used phones (keep only last 5)
      usedPhonesRef.current.add(maskedPhone);
      if (usedPhonesRef.current.size > 5) {
        const firstItem = Array.from(usedPhonesRef.current)[0];
        usedPhonesRef.current.delete(firstItem);
      }
    };

    // Show first toast immediately
    showToast();

    // Then show new toast every 3.5 seconds (3s display + 0.5s buffer)
    toastIntervalRef.current = setInterval(showToast, 3500);

    return () => {
      if (toastIntervalRef.current) {
        clearInterval(toastIntervalRef.current);
      }
      // Cleanup: dismiss any remaining toast
      if (currentToastIdRef.current) {
        toast.dismiss(currentToastIdRef.current);
      }
    };
  }, []); // Empty dependency array - runs only once on mount

  return null;
}
