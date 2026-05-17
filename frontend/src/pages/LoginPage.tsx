import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { initiateOAuthLogin, validateMFA } from '@/api/auth';

/**
 * LoginPage — OAuth 2.0 provider selection + MFA validation step.
 * SFP-135, SFP-138, SFP-145, SFP-147, SFP-151, SFP-155
 * SFP-177, SFP-179, SFP-185, SFP-186, SFP-207, SFP-209
 */
export default function LoginPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      // OAuth error redirect (SFP-179, SFP-186, SFP-209)
      setError(
        errorParam === 'oauth_failed'
          ? 'OAuth login failed. Please try again.'
          : errorParam === 'session_expired'
          ? 'Your session has expired. Please log in again.'
          : errorParam
      );
    }

    // After OAuth callback, server may redirect here with userId+requireMfa params
    const requireMfa = searchParams.get('requireMfa');
    const uid = searchParams.get('userId');
    if (requireMfa === 'true' && uid) {
      setMfaStep(true);
      setUserId(uid);
    }
  }, [searchParams]);

  async function handleMFASubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await validateMFA({ userId, token: mfaToken, trustDevice });
      navigate('/');
    } catch {
      setError('Invalid MFA code. Please try again.');
    }
  }

  if (mfaStep) {
    return (
      <main className="login-page">
        <h1>Two-Factor Authentication</h1>
        <p>Enter the 6-digit code from your authenticator app, or a backup code.</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleMFASubmit}>
          <label>
            Code
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9A-Za-z]{6,10}"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
            Trust this device for 30 days
          </label>
          <button type="submit">Verify</button>
        </form>
      </main>
    );
  }

  return (
    <main className="login-page">
      <h1>Sign in to ShopFlow</h1>
      {error && <p className="error">{error}</p>}
      <div className="oauth-buttons">
        {/* TODO [SFP-185]: generate PKCE challenge before redirect */}
        <button onClick={() => initiateOAuthLogin('github')}>Continue with GitHub</button>
        <button onClick={() => initiateOAuthLogin('google')}>Continue with Google</button>
      </div>
    </main>
  );
}
