import React, { useEffect, useState } from 'react';
import { enrollMFA, verifyMFAEnrollment } from '@/api/auth';

/**
 * MFA Enrollment page for merchant admins.
 * Shows QR code and activates TOTP on first verification.
 * SFP-138, SFP-147, SFP-155, SFP-157, SFP-211, SFP-228
 */
export default function MFAEnrollPage(): React.ReactElement {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const result = await enrollMFA();
        setQrDataUrl(result.qrDataUrl);
        setOtpauthUrl(result.otpauthUrl);
      } catch {
        setError('Failed to start MFA enrollment. Please try again.');
      }
    })();
  }, []);

  async function handleVerify(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyMFAEnrollment(token);
      setBackupCodes(result.backupCodes);
    } catch {
      setError('Invalid code. Please check your authenticator app and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (backupCodes) {
    return (
      <main className="mfa-enroll-page">
        <h1>MFA Enabled</h1>
        <p>Save these backup codes in a secure place. Each can only be used once.</p>
        {/* SFP-158, SFP-212, SFP-229 */}
        <ul className="backup-codes">
          {backupCodes.map((code) => (
            <li key={code}><code>{code}</code></li>
          ))}
        </ul>
        <a href="/">Continue to dashboard</a>
      </main>
    );
  }

  return (
    <main className="mfa-enroll-page">
      <h1>Set up Two-Factor Authentication</h1>
      <p>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.).</p>
      {error && <p className="error">{error}</p>}
      {qrDataUrl ? (
        <>
          <img src={qrDataUrl} alt="MFA QR code" width={200} height={200} />
          <p>
            Or enter manually:{' '}
            <a href={otpauthUrl ?? '#'} className="otpauth-link">
              {otpauthUrl}
            </a>
          </p>
          <form onSubmit={handleVerify}>
            <label>
              Verification code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                autoFocus
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Activate MFA'}
            </button>
          </form>
        </>
      ) : (
        <p>Loading QR code…</p>
      )}
    </main>
  );
}
