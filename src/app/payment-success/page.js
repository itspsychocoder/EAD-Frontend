'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../css/dashboard.module.css';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const userId = searchParams.get('userId');

      if (!sessionId) {
        setStatus({
          type: 'error',
          message: 'Invalid payment session. No session ID found.'
        });
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('mess_token');
        
        if (!token) {
          setStatus({
            type: 'error',
            message: 'Authentication required. Please login again.'
          });
          setLoading(false);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Confirm payment with backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId })
        });

        if (response.ok) {
          const data = await response.json();
          setStatus({
            type: 'success',
            message: 'Payment successful! Your balance has been updated.'
          });
          setPaymentDetails(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setStatus({
            type: 'error',
            message: errorData.message || 'Payment confirmation failed. Please contact support.'
          });
        }
      } catch (error) {
        console.error('Payment confirmation error:', error);
        setStatus({
          type: 'error',
          message: 'An error occurred while confirming your payment. Please contact support.'
        });
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [searchParams, router]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div style={{
        maxWidth: '600px',
        margin: '50px auto',
        padding: '40px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        {loading ? (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>Processing Payment...</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>Please wait while we confirm your payment.</p>
          </>
        ) : (
          <>
            {status.type === 'success' ? (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <svg
                    width="50"
                    height="50"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h1 style={{
                  color: '#10b981',
                  fontSize: '32px',
                  marginBottom: '15px',
                  fontWeight: '700'
                }}>
                  Payment Successful!
                </h1>
                <p style={{
                  color: '#666',
                  fontSize: '16px',
                  marginBottom: '30px',
                  lineHeight: '1.6'
                }}>
                  {status.message}
                </p>

                {paymentDetails && (
                  <div style={{
                    background: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px',
                    textAlign: 'left'
                  }}>
                    <h3 style={{
                      color: '#333',
                      fontSize: '18px',
                      marginBottom: '15px',
                      textAlign: 'center'
                    }}>
                      Payment Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {paymentDetails.amount && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666', fontWeight: '600' }}>Amount Paid:</span>
                          <span style={{ color: '#333', fontWeight: '700' }}>
                            Rs. {paymentDetails.amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {paymentDetails.transactionId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666', fontWeight: '600' }}>Transaction ID:</span>
                          <span style={{ color: '#333', fontSize: '13px' }}>
                            {paymentDetails.transactionId}
                          </span>
                        </div>
                      )}
                      {paymentDetails.paymentDate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#666', fontWeight: '600' }}>Date:</span>
                          <span style={{ color: '#333' }}>
                            {new Date(paymentDetails.paymentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBackToDashboard}
                  style={{
                    padding: '14px 35px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Back to Dashboard
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#dc3545',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <svg
                    width="50"
                    height="50"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
                <h1 style={{
                  color: '#dc3545',
                  fontSize: '32px',
                  marginBottom: '15px',
                  fontWeight: '700'
                }}>
                  Payment Failed
                </h1>
                <p style={{
                  color: '#666',
                  fontSize: '16px',
                  marginBottom: '30px',
                  lineHeight: '1.6'
                }}>
                  {status.message}
                </p>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    onClick={handleBackToDashboard}
                    style={{
                      padding: '14px 35px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                  >
                    Back to Dashboard
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '14px 35px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
