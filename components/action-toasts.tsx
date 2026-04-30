'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle, Info, Loader } from 'lucide-react';

// Action toast types
export type ActionToastType = 'success' | 'error' | 'info' | 'loading';

interface ActionToastOptions {
  duration?: number;
  dismissible?: boolean;
}

/**
 * Hook for displaying action-based toasts
 * Usage: const { showSuccess, showError, showInfo, showLoading } = useActionToast();
 */
export const useActionToast = () => {
  const showSuccess = useCallback(
    (message: string, options?: ActionToastOptions) => {
      return toast.success(message, {
        icon: <CheckCircle2 className="w-5 h-5" />,
        style: {
          background: '#16a34a',
          color: 'white',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '6px',
          padding: '12px 16px',
        },
        duration: options?.duration ?? 4000,
        position: 'bottom-left',
        dismissible: options?.dismissible ?? true,
      });
    },
    []
  );

  const showError = useCallback(
    (message: string, options?: ActionToastOptions) => {
      return toast.error(message, {
        icon: <AlertCircle className="w-5 h-5" />,
        style: {
          background: '#dc2626',
          color: 'white',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '6px',
          padding: '12px 16px',
        },
        duration: options?.duration ?? 4000,
        position: 'bottom-left',
        dismissible: options?.dismissible ?? true,
      });
    },
    []
  );

  const showInfo = useCallback(
    (message: string, options?: ActionToastOptions) => {
      return toast.info(message, {
        icon: <Info className="w-5 h-5" />,
        style: {
          background: '#2563eb',
          color: 'white',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '6px',
          padding: '12px 16px',
        },
        duration: options?.duration ?? 3000,
        position: 'bottom-left',
        dismissible: options?.dismissible ?? true,
      });
    },
    []
  );

  const showLoading = useCallback(
    (message: string) => {
      return toast.loading(message, {
        icon: <Loader className="w-5 h-5 animate-spin" />,
        style: {
          background: '#0ea5e9',
          color: 'white',
          border: 'none',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '6px',
          padding: '12px 16px',
        },
        position: 'bottom-left',
        dismissible: false,
      });
    },
    []
  );

  return {
    showSuccess,
    showError,
    showInfo,
    showLoading,
    dismiss: toast.dismiss,
    dismissAll: () => toast.dismiss(),
  };
};
