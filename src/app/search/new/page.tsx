'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGENCY_SERVICES } from '@/lib/constants';

export default function NewSearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    brandType: 'E-commerce Brands',
    location: 'United States',
    leadCount: 10,
    companySize: '1-10 employees',
    businessMaturity: 'Established but outdated online presence',
    contactPreference: ['Public email'],
    extraInstructions: '',
    searchDepth: 'Balanced',
    strictnessMode: 'Balanced',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create Job
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      // 2. Start Pipeline in background
      await fetch(`/api/jobs/${data.id}/run`, { method: 'POST' });

      // 3. Redirect to Job Progress Page
      router.push(`/search/${data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>New Lead Search</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Configure the AI to find exactly the type of companies you want to pitch to.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Target Criteria</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label">Brand/Company Type *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.brandType}
                onChange={e => setFormData({ ...formData, brandType: e.target.value })}
                placeholder="e.g. E-commerce Brands, HVAC Companies"
              />
            </div>
            <div>
              <label className="label">Target Location *</label>
              <input
                type="text"
                className="input"
                required
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. United States, London, Global"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label className="label">Desired Lead Count *</label>
              <input
                type="number"
                className="input"
                required
                min={1}
                max={50}
                value={formData.leadCount}
                onChange={e => setFormData({ ...formData, leadCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Company Size</label>
              <select
                className="select"
                value={formData.companySize}
                onChange={e => setFormData({ ...formData, companySize: e.target.value })}
              >
                <option value="Any">Any</option>
                <option value="1-10 employees">1-10 employees</option>
                <option value="11-50 employees">11-50 employees</option>
                <option value="51-200 employees">51-200 employees</option>
              </select>
            </div>
            <div>
              <label className="label">Business Maturity</label>
              <select
                className="select"
                value={formData.businessMaturity}
                onChange={e => setFormData({ ...formData, businessMaturity: e.target.value })}
              >
                <option value="Any">Any</option>
                <option value="New business">New business</option>
                <option value="Growing business">Growing business</option>
                <option value="Established but outdated online presence">Established but outdated online presence</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="label">Contact Preferences</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              {['Public email', 'Phone', 'LinkedIn', 'Instagram'].map(pref => (
                <label key={pref} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.contactPreference.includes(pref)}
                    onChange={e => {
                      const newPrefs = e.target.checked
                        ? [...formData.contactPreference, pref]
                        : formData.contactPreference.filter(p => p !== pref);
                      setFormData({ ...formData, contactPreference: newPrefs });
                    }}
                    style={{ accentColor: 'var(--accent-purple)' }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{pref}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Extra AI Instructions</label>
            <textarea
              className="input"
              rows={3}
              value={formData.extraInstructions}
              onChange={e => setFormData({ ...formData, extraInstructions: e.target.value })}
              placeholder="e.g. 'Must have an active Instagram account but a poorly designed website', 'Focus on companies that use Shopify'"
            />
          </div>
        </div>

        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Pipeline Settings</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <label className="label" style={{ marginBottom: '0.75rem' }}>Search Depth</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['Fast', 'Balanced', 'Deep'].map(depth => (
                  <label
                    key={depth}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      cursor: 'pointer',
                      borderColor: formData.searchDepth === depth ? 'var(--accent-purple)' : 'var(--border-subtle)',
                      background: formData.searchDepth === depth ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-secondary)',
                    }}
                  >
                    <input
                      type="radio"
                      name="searchDepth"
                      value={depth}
                      checked={formData.searchDepth === depth}
                      onChange={e => setFormData({ ...formData, searchDepth: e.target.value })}
                      style={{ accentColor: 'var(--accent-purple)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{depth}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {depth === 'Fast' && 'Fastest, fewer candidates generated.'}
                        {depth === 'Balanced' && 'Good balance of speed and volume.'}
                        {depth === 'Deep' && 'Exhaustive search. Takes longer but finds more.'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" style={{ marginBottom: '1.5rem' }}>Quality Control</label>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Strictness Mode</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Control how strict the AI judges evidence
                  </div>
                </div>
                <select
                  className="select"
                  value={formData.strictnessMode}
                  onChange={e => setFormData({ ...formData, strictnessMode: e.target.value })}
                >
                  <option value="Lenient">Lenient</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Strict">Strict</option>
                </select>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label className="label">Agency Services context used for pitching:</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6, padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  {AGENCY_SERVICES.slice(0, 5).join(', ')}... (and {AGENCY_SERVICES.length - 5} more)
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                Initializing Pipeline...
              </>
            ) : (
              '✨ Start AI Lead Generation'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
