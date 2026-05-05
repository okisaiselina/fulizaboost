'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const intasendSecretKey = process.env.INTASEND_SECRET_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const boostRequestSchema = z.object({
  idNumber: z.string().min(1, 'ID number is required'),
  phoneNumber: z.string().regex(/^(?:254|\+254|0)([7](?:(?:[01249][0-9])|(?:5[789])|(?:6[789])|(?:9[0-9]))[0-9]{6})$/, 'Invalid M-Pesa phone number'),
  newLimit: z.number().min(7500, 'Invalid limit selected'),
  processingFee: z.number().min(0, 'Invalid fee'),
});

type BoostRequest = z.infer<typeof boostRequestSchema>;

export async function submitBoostRequest(data: BoostRequest) {
  try {
    const validated = boostRequestSchema.parse(data);

    const { data: insertedData, error } = await supabase.from('fuliza_boosts').insert({
      id_number: validated.idNumber,
      phone_number: validated.phoneNumber,
      new_limit: validated.newLimit,
      processing_fee: validated.processingFee,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select();

    if (error) {
      console.error('[v0] Database error:', error);
      return { success: false, error: 'Failed to submit request. Please try again.' };
    }

    return { 
      success: true, 
      message: 'Request submitted successfully',
      boostId: insertedData?.[0]?.id,
      phoneNumber: validated.phoneNumber,
      newLimit: validated.newLimit,
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    console.error('[v0] Unexpected error in submitBoostRequest:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function initializeIntasendPayment(
  boostId: string,
  phoneNumber: string,
  amount: number,
  newLimit: number
) {
  try {
    if (!intasendSecretKey) {
      console.error('[v0] Intasend secret key is missing');
      return { 
        success: false, 
        error: 'Payment gateway not configured. Please contact support.' 
      };
    }

    // Convert phone number to E.164 format (254712345678)
    let formattedPhone = phoneNumber.trim().replace(/\s/g, '');
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('254')) {
      // Already in correct format
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else {
      formattedPhone = '254' + formattedPhone;
    }

    // Only send required fields: phone_number and amount
    const payload = {
      phone_number: formattedPhone,
      amount: String(Math.floor(Number(amount))), // Intasend expects string
    };

    console.log('[v0] Intasend payload:', { ...payload, phone_number: '[MASKED]' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch('https://api.intasend.com/api/v1/payment/mpesa-stk-push/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${intasendSecretKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[v0] Intasend API Response status:', response.status);

    const responseText = await response.text();
    console.log('[v0] Intasend API Response text:', responseText.substring(0, 200));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[v0] Failed to parse response as JSON:', parseErr);
      return {
        success: false,
        error: `API Error (${response.status}): Invalid response. Please try again.`,
      };
    }

    if (!response.ok) {
      const errorMessage = result?.message || result?.error || result?.detail || 'Payment processing failed';
      console.error('[v0] Intasend API Error:', { status: response.status, error: errorMessage });
      return {
        success: false,
        error: `Payment failed: ${errorMessage}. Status: ${response.status}`,
      };
    }

    console.log('[v0] Payment success:', { transactionId: result.id });
    return {
      success: true,
      message: 'M-Pesa prompt sent to your phone. Please enter your PIN to complete payment.',
      transactionId: result.id || result.invoice_id || boostId,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[v0] Payment request timeout');
      return {
        success: false,
        error: 'Request timed out. Your phone may not be reachable. Please try again.',
      };
    }
    console.error('[v0] Payment error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `Error: ${errorMsg}`,
    };
  }
}

export async function checkPaymentStatus(transactionId: string) {
  try {
    if (!intasendSecretKey) {
      console.error('[v0] Intasend secret key is missing');
      return { success: false, error: 'Payment gateway not configured.' };
    }

    console.log('[v0] Checking payment status for:', transactionId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(`https://api.intasend.com/api/v1/payment/${transactionId}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${intasendSecretKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[v0] Status check response:', response.status);

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[v0] Failed to parse status response:', parseErr);
      return { success: false, status: 'unknown', error: 'Could not get status' };
    }

    // Intasend returns status as "completed", "pending", "failed", etc.
    const status = result.status || 'unknown';
    console.log('[v0] Payment status:', status);

    if (status === 'completed' || status === 'successful') {
      return { success: true, status: 'successful', message: 'Payment successful!' };
    } else if (status === 'pending' || status === 'processing') {
      return { success: true, status: 'processing', message: 'Processing payment...' };
    } else if (status === 'failed' || status === 'error') {
      return { success: false, status: 'failed', message: 'Payment failed' };
    } else {
      return { success: true, status: 'processing', message: 'Processing payment...' };
    }
  } catch (err) {
    console.error('[v0] Status check error:', err);
    return { success: false, status: 'unknown', error: 'Could not check status' };
  }
}

export async function initializePaystackPayment(
  boostId: string,
  phoneNumber: string,
  amount: number,
  email: string
) {
  try {
    if (!paystackSecretKey) {
      console.error('[v0] Paystack secret key is missing');
      return { 
        success: false, 
        error: 'Payment gateway not configured. Please contact support.' 
      };
    }

    // Convert phone number to E.164 format (254712345678)
    let formattedPhone = phoneNumber.trim().replace(/\s/g, '');
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('254')) {
      // Already in correct format
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else {
      formattedPhone = '254' + formattedPhone;
    }

    // Paystack expects amount in kobo (multiply by 100)
    const amountInKobo = amount * 100;

    const payload = {
      email: email,
      amount: Math.round(amountInKobo), // Ensure it's a clean integer
      currency: 'KES',
      reference: boostId,
      channels: ['mobile_money'],
      mobile_money: {
        phone: formattedPhone,
        provider: 'mpesa'
      },
      metadata: {
        application_id: boostId,
        phone_number: formattedPhone,
        boost_id: boostId,
        custom_fields: [
          {
            display_name: 'Phone Number',
            variable_name: 'phone_number',
            value: formattedPhone
          },
          {
            display_name: 'Boost ID',
            variable_name: 'boost_id',
            value: boostId
          }
        ]
      }
    };

    console.log('[v0] Paystack payload:', { 
      email: '[MASKED]',
      amount: amountInKobo,
      currency: 'KES',
      reference: boostId,
      channels: ['mobile_money'],
      mobile_money: {
        phone: formattedPhone,
        provider: 'mpesa'
      },
      metadataPhone: formattedPhone
    });

    console.log('[v0] Full JSON payload being sent:', JSON.stringify(payload, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[v0] Paystack API Response status:', response.status);

    const responseText = await response.text();
    console.log('[v0] Paystack API Response text:', responseText.substring(0, 200));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[v0] Failed to parse response as JSON:', parseErr);
      return {
        success: false,
        error: `API Error (${response.status}): Invalid response. Please try again.`,
      };
    }

    if (!response.ok) {
      const errorMessage = result?.message || result?.error || 'Payment initialization failed';
      const errorData = result?.data || {};
      
      // Log detailed error information
      console.error('[v0] Paystack API Error Details:', {
        status: response.status,
        error: errorMessage,
        fullError: result,
        errorData: errorData
      });

      // Provide helpful error messages for common issues
      if (errorMessage.includes('Currency') || errorMessage.includes('currency')) {
        console.error('[v0] CURRENCY ERROR: Your Paystack merchant account may not have KES enabled');
        return {
          success: false,
          error: `Payment Error: ${errorMessage}. Ensure your Paystack account has KES (Kenyan Shilling) currency enabled for M-Pesa payments.`,
        };
      }

      if (errorMessage.includes('mobile_money') || errorMessage.includes('M-Pesa')) {
        console.error('[v0] M-PESA ERROR: Mobile money configuration issue');
        return {
          success: false,
          error: `Payment Error: ${errorMessage}. M-Pesa may not be configured in your Paystack account.`,
        };
      }

      return {
        success: false,
        error: `Payment failed: ${errorMessage}`,
      };
    }

    console.log('[v0] Payment initialization success:', { reference: result.data?.reference });
    return {
      success: true,
      message: 'Payment initialized successfully. Redirecting to payment page...',
      authorizationUrl: result.data?.authorization_url,
      accessCode: result.data?.access_code,
      reference: result.data?.reference,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[v0] Payment request timeout');
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }
    console.error('[v0] Payment error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `Error: ${errorMsg}`,
    };
  }
}

export async function verifyPaystackPayment(reference: string) {
  try {
    if (!paystackSecretKey) {
      console.error('[v0] Paystack secret key is missing');
      return { success: false, error: 'Payment gateway not configured.' };
    }

    console.log('[v0] Verifying payment with reference:', reference);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[v0] Verification response status:', response.status);

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[v0] Failed to parse verification response:', parseErr);
      return { success: false, status: 'unknown', error: 'Could not verify payment' };
    }

    // Paystack returns status as "success" or "failed"
    const paymentStatus = result.data?.status || 'unknown';
    console.log('[v0] Payment verification status:', paymentStatus);

    if (paymentStatus === 'success') {
      return { 
        success: true, 
        status: 'successful', 
        message: 'Payment verified successfully!',
        reference: result.data?.reference,
      };
    } else {
      return { 
        success: false, 
        status: 'failed', 
        message: 'Payment verification failed' 
      };
    }
  } catch (err) {
    console.error('[v0] Verification error:', err);
    return { success: false, status: 'unknown', error: 'Could not verify payment' };
  }
}
