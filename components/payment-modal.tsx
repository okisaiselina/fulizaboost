'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { submitBoostRequest, initializePaystackPayment, verifyPaystackPayment } from '@/app/actions';
import { useActionToast } from '@/components/action-toasts';

interface PaymentModalProps {
  isOpen: boolean;
  newLimit: number;
  processingFee: number;
  onClose: () => void;
  onSuccess: (phoneNumber: string, newLimit: number) => void;
}

const PAYMENT_TIMEOUT = 30000;
const STATUS_CHECK_INTERVAL = 2000; // Check status every 2 seconds
const MAX_STATUS_CHECKS = 15; // Max 30 seconds of polling (15 checks × 2 seconds)
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

type PaymentStatus = 'form' | 'processing' | 'successful' | 'failed';

export function PaymentModal({
  isOpen,
  newLimit,
  processingFee,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [idNumber, setIdNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBoostId, setLastBoostId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('form');
  const [statusMessage, setStatusMessage] = useState('');
  
  const { showSuccess, showError, showInfo, dismiss } = useActionToast();

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== 'processing' || !reference) return;

    let checkCount = 0;
    let interval: NodeJS.Timeout;
    let isCleanedUp = false;

    const pollStatus = async () => {
      if (isCleanedUp) return;
      
      checkCount++;

      const result = await verifyPaystackPayment(reference);

      if (isCleanedUp) return;

      if (result.status === 'successful') {
        clearInterval(interval);
        isCleanedUp = true;
        setPaymentStatus('successful');
        setStatusMessage('Payment Successful!');
      } else if (result.status === 'failed') {
        clearInterval(interval);
        isCleanedUp = true;
        setPaymentStatus('failed');
        setStatusMessage('Payment Failed');
        setIsLoading(false);
      } else if (checkCount >= MAX_STATUS_CHECKS) {
        clearInterval(interval);
        isCleanedUp = true;
        setPaymentStatus('failed');
        setStatusMessage('Payment Timeout - Please try again');
        setIsLoading(false);
      }
    };

    interval = setInterval(pollStatus, STATUS_CHECK_INTERVAL);
    return () => {
      isCleanedUp = true;
      clearInterval(interval);
    };
  }, [paymentStatus, reference]);

  // Auto-reload and close on success
  useEffect(() => {
    if (paymentStatus === 'successful') {
      setTimeout(() => {
        // Show success message
        const maskedPhone = phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-3);
        showSuccess(
          `✓ ${maskedPhone} - Payment successful! Limit boosted to Ksh ${newLimit.toLocaleString()}`,
          { duration: 4000 }
        );
        
        // Reset and close
        setIdNumber('');
        setPhoneNumber('');
        setEmail('');
        setError(null);
        setLastBoostId(null);
        setReference(null);
        setPaymentStatus('form');
        onSuccess(phoneNumber, newLimit);
        
        // Reload page after modal closes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }, 1000);
    }
  }, [paymentStatus, phoneNumber, newLimit, onSuccess, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError('Payment processing timed out. Please try again or use the Retry button.');
      showError('Payment processing timed out.');
    }, PAYMENT_TIMEOUT);

    try {
      // Submit the boost request
      const submitResult = await submitBoostRequest({
        idNumber,
        phoneNumber,
        newLimit,
        processingFee,
      });

      if (!submitResult.success) {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setError(submitResult.error || 'Failed to submit request');
        showError(submitResult.error || 'Failed to submit request');
        return;
      }

      setLastBoostId(submitResult.boostId || null);

      // Initialize payment with Paystack
      const paymentResult = await initializePaystackPayment(
        submitResult.boostId || '',
        phoneNumber,
        processingFee,
        email
      );

      clearTimeout(timeoutId);

      if (paymentResult.success) {
        // Use the authorization URL with a popup window instead of inline
        if (!paymentResult.authorizationUrl) {
          setIsLoading(false);
          setError('No payment URL received from Paystack');
          showError('Payment initialization failed');
          return;
        }

        console.log('[v0] Opening Paystack payment in popup:', paymentResult.reference);

        // Open payment URL in a popup window
        const width = 800;
        const height = 600;
        const left = Math.max(0, window.innerWidth / 2 - width / 2);
        const top = Math.max(0, window.innerHeight / 2 - height / 2);

        const paymentWindow = window.open(
          paymentResult.authorizationUrl,
          'PaystackPayment',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!paymentWindow || paymentWindow.closed) {
          setIsLoading(false);
          setError('Payment window blocked. Please allow popups.');
          showError('Payment window could not be opened');
          return;
        }

        setReference(paymentResult.reference || null);
        setPaymentStatus('processing');
        setStatusMessage('Opening Paystack payment page...');
        setIsLoading(true);
        showInfo('Payment window opened. Complete payment to boost your limit.');

        // Poll for payment completion
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          
          if (paymentWindow.closed) {
            clearInterval(checkInterval);
            console.log('[v0] Payment window closed');
            
            // Verify payment status after window closes
            verifyPaystackPayment(paymentResult.reference || '').then(result => {
              if (result.status === 'successful') {
                handlePaymentSuccess();
              } else {
                setIsLoading(false);
                setPaymentStatus('processing');
                setStatusMessage('Verifying payment status...');
              }
            });
          }

          if (checkCount >= 120) { // 4 minutes max (120 checks × 2 seconds)
            clearInterval(checkInterval);
            setIsLoading(false);
            setPaymentStatus('processing');
            setStatusMessage('Verifying payment...Please wait');
          }
        }, 2000);

        return () => clearInterval(checkInterval);
      } else {
        setIsLoading(false);
        setError(paymentResult.error || 'Failed to initiate payment');
        showError(paymentResult.error || 'Failed to initiate payment');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setIsLoading(false);
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      console.error('[v0] Error:', errorMsg);
      setError(`Error: ${errorMsg}`);
      showError(`Error: ${errorMsg}`);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('successful');
    setStatusMessage('Payment Successful!');
  };

  const handlePaymentError = (message: string) => {
    setPaymentStatus('failed');
    setStatusMessage(message || 'Payment Failed');
    setIsLoading(false);
    setError(message || 'Payment was not completed');
  };

  const handleRetry = async () => {
    if (!lastBoostId) {
      setError('Cannot retry without boost ID. Please submit form again.');
      showError('Cannot retry. Please submit form again.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setPaymentStatus('processing');

    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setPaymentStatus('failed');
      setStatusMessage('Payment Timeout');
      showError('Payment retry timed out.');
    }, PAYMENT_TIMEOUT);

    try {
      const paymentResult = await initializePaystackPayment(
        lastBoostId,
        phoneNumber,
        processingFee,
        email
      );

      clearTimeout(timeoutId);

      if (paymentResult.success) {
        // Use the authorization URL with a popup window
        if (!paymentResult.authorizationUrl) {
          setIsLoading(false);
          setError('No payment URL received from Paystack');
          showError('Payment initialization failed');
          return;
        }

        console.log('[v0] Retry: Opening Paystack payment in popup:', paymentResult.reference);

        const width = 800;
        const height = 600;
        const left = Math.max(0, window.innerWidth / 2 - width / 2);
        const top = Math.max(0, window.innerHeight / 2 - height / 2);

        const paymentWindow = window.open(
          paymentResult.authorizationUrl,
          'PaystackPayment',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!paymentWindow || paymentWindow.closed) {
          setIsLoading(false);
          setError('Payment window blocked. Please allow popups.');
          showError('Payment window could not be opened');
          return;
        }

        setReference(paymentResult.reference || null);
        setPaymentStatus('processing');
        setStatusMessage('Opening Paystack payment page...');
        setIsLoading(true);
        showInfo('Payment window opened. Complete payment to boost your limit.');

        // Poll for payment completion
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          
          if (paymentWindow.closed) {
            clearInterval(checkInterval);
            console.log('[v0] Payment window closed');
            
            // Verify payment status after window closes
            verifyPaystackPayment(paymentResult.reference || '').then(result => {
              if (result.status === 'successful') {
                handlePaymentSuccess();
              } else {
                setIsLoading(false);
                setPaymentStatus('processing');
                setStatusMessage('Verifying payment status...');
              }
            });
          }

          if (checkCount >= 120) {
            clearInterval(checkInterval);
            setIsLoading(false);
            setPaymentStatus('processing');
            setStatusMessage('Verifying payment...Please wait');
          }
        }, 2000);
      } else {
        setIsLoading(false);
        setPaymentStatus('failed');
        setError(paymentResult.error || 'Failed to initiate payment');
        showError(paymentResult.error || 'Failed to initiate payment');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setPaymentStatus('failed');
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      console.error('[v0] Retry error:', errorMsg);
      setError(`Error: ${errorMsg}`);
      showError(`Error: ${errorMsg}`);
    }
  };

  const handleCloseModal = () => {
    // Allow closing anytime, even during processing
    // Reset state
    setIdNumber('');
    setPhoneNumber('');
    setEmail('');
    setError(null);
    setLastBoostId(null);
    setReference(null);
    setPaymentStatus('form');
    setStatusMessage('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-md" onPointerDownOutside={undefined} aria-describedby="payment-modal-description">
        {/* Form State */}
        {paymentStatus === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl">Complete Your Request</DialogTitle>
              <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                Enter your details to boost your Fuliza limit
              </p>
            </DialogHeader>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">New limit</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Ksh {newLimit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Processing fee</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Ksh {processingFee.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 font-medium">{error}</p>
                  {lastBoostId && (
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">Click Retry to send prompt again.</p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">ID Number</label>
                <Input
                  type="text"
                  placeholder="e.g. 12345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  disabled={isLoading}
                  required
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  M-Pesa Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  maxLength="12"
                  required
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Format: 0712345678 (starts with 07 or 01)
                </p>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Required for payment receipt
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isLoading}
                  className="w-full sm:flex-1 dark:border-slate-600 dark:text-white"
                >
                  Close
                </Button>
                {lastBoostId && error && (
                  <Button
                    type="button"
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrying
                      </>
                    ) : (
                      'Retry'
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing
                    </>
                  ) : (
                    'Pay now'
                  )}
                </Button>
              </div>
            </form>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              Secure payment powered by M-Pesa
            </p>
          </>
        )}

        {/* Processing State */}
        {paymentStatus === 'processing' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl">Processing Payment</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="mb-6">
                <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                Processing your payment...
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                Please enter your M-Pesa PIN on your phone to complete the transaction.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="w-full dark:border-slate-600 dark:text-white"
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Success State */}
        {paymentStatus === 'successful' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl">Payment Successful</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="mb-6">
                <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-200 text-center mb-2">
                Payment Successful!
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
                Your Fuliza limit has been successfully boosted. Reloading...
              </p>
            </div>
          </>
        )}

        {/* Failed State */}
        {paymentStatus === 'failed' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-lg sm:text-xl">Payment Failed</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <div className="mb-6">
                <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-red-900 dark:text-red-200 text-center mb-2">
                Payment Failed
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                {statusMessage || 'Your payment could not be processed. Please try again.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="w-full sm:flex-1 dark:border-slate-600 dark:text-white"
              >
                Close
              </Button>
              {lastBoostId && (
                <Button
                  type="button"
                  onClick={handleRetry}
                  className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white"
                >
                  Retry Payment
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
