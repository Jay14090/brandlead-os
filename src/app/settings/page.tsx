'use client';

import { useState, useEffect } from 'react';

interface SettingsData {
  openAIKey: string;
  openAIModel: string;
  geminiKey: string;
  geminiModel: string;
  geminiFastModel: string;
  firecrawlKey: string;
  exaKey: string;
  strictnessModeDefault: string;
  maxLeadsPerSearch: number;
  maxPagesPerLead: number;
  requestDelay: number;
  hasOpenAIKey: boolean;
  hasGeminiKey: boolean;
  hasFirecrawlKey: boolean;
  hasExaKey: boolean;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; error?: string; model?: string }> | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          // Convert string to numbers for specific fields
          maxLeadsPerSearch: Number(data.maxLeadsPerSearch),
          maxPagesPerLead: Number(data.maxPagesPerLead),
          requestDelay: Number(data.requestDelay),
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      // Send raw unmasked keys if changed, otherwise don't test
      const testPayload: Record<string, string> = {};
      if (data?.openAIKey && !data.openAIKey.includes('••')) testPayload.openAIKey = data.openAIKey;
      if (data?.geminiKey && !data.geminiKey.includes('••')) testPayload.geminiKey = data.geminiKey;
      if (data?.exaKey && !data.exaKey.includes('••')) testPayload.exaKey = data.exaKey;
      if (data?.firecrawlKey && !data.firecrawlKey.includes('••')) testPayload.firecrawlKey = data.firecrawlKey;

      if (Object.keys(testPayload).length === 0) {
        alert("Please enter new API keys before testing. Can't test masked keys.");
        setTesting(false);
        return;
      }

      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });
      const results = await res.json();
      setTestResults(results);
    } catch {
      setMessage({ type: 'error', text: 'Failed to test keys' });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !data) {
    return <div className="skeleton" style={{ height: '400px' }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Configure AI models, API keys, and pipeline defaults.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Left Column: API Keys & Models */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>OpenAI Configuration</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">OpenAI API Key</label>
                <input 
                  type="password" 
                  className="input" 
                  value={data.openAIKey} 
                  onChange={e => setData({...data, openAIKey: e.target.value})}
                  placeholder="sk-..."
                />
                {data.hasOpenAIKey && data.openAIKey.includes('••') && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>✓ Key securely stored</p>
                )}
              </div>
              
              <div>
                <label className="label">OpenAI Model</label>
                <input 
                  type="text" 
                  className="input" 
                  value={data.openAIModel} 
                  onChange={e => setData({...data, openAIModel: e.target.value})}
                  placeholder="gpt-5.5"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Used for reasoning and search logic.</p>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Gemini Configuration</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Gemini API Key</label>
                <input 
                  type="password" 
                  className="input" 
                  value={data.geminiKey} 
                  onChange={e => setData({...data, geminiKey: e.target.value})}
                  placeholder="AIza..."
                />
                {data.hasGeminiKey && data.geminiKey.includes('••') && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.25rem' }}>✓ Key securely stored</p>
                )}
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Primary Model</label>
                <input 
                  type="text" 
                  className="input" 
                  value={data.geminiModel} 
                  onChange={e => setData({...data, geminiModel: e.target.value})}
                  placeholder="gemini-3.1-pro-preview"
                />
              </div>

              <div>
                <label className="label">Fast Model</label>
                <input 
                  type="text" 
                  className="input" 
                  value={data.geminiFastModel} 
                  onChange={e => setData({...data, geminiFastModel: e.target.value})}
                  placeholder="gemini-3.5-flash"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Search Providers & Defaults */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Optional Search Providers</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Exa API Key</label>
                <input 
                  type="password" 
                  className="input" 
                  value={data.exaKey} 
                  onChange={e => setData({...data, exaKey: e.target.value})}
                  placeholder="Optional"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>For higher quality company discovery.</p>
              </div>

              <div>
                <label className="label">Firecrawl API Key</label>
                <input 
                  type="password" 
                  className="input" 
                  value={data.firecrawlKey} 
                  onChange={e => setData({...data, firecrawlKey: e.target.value})}
                  placeholder="Optional"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>For higher quality website scraping.</p>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Pipeline Defaults</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="label">Max Leads / Search</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={data.maxLeadsPerSearch} 
                    onChange={e => setData({...data, maxLeadsPerSearch: Number(e.target.value)})}
                    min={1} max={100}
                  />
                </div>
                <div>
                  <label className="label">Max Pages / Lead</label>
                  <input 
                    type="number" 
                    className="input" 
                    value={data.maxPagesPerLead} 
                    onChange={e => setData({...data, maxPagesPerLead: Number(e.target.value)})}
                    min={1} max={10}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Request Delay (ms)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={data.requestDelay} 
                  onChange={e => setData({...data, requestDelay: Number(e.target.value)})}
                  min={500} max={10000}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Time to wait between scrape requests to avoid IP bans.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Default Strictness Mode</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Default strictness setting for new searches
                    </div>
                  </div>
                  <select
                    className="select"
                    value={data.strictnessModeDefault}
                    onChange={e => setData({...data, strictnessModeDefault: e.target.value})}
                  >
                    <option value="Lenient">Lenient</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Strict">Strict</option>
                  </select>
              </div>
            </div>

          </div>
        </div>

        {/* Actions Bottom Bar */}
        <div style={{ 
          marginTop: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <div>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? 'Testing Keys...' : 'Test API Keys'}
            </button>
            {testResults && (
              <div style={{ marginTop: '1rem', fontSize: '0.8125rem' }}>
                {Object.entries(testResults).map(([provider, res]) => (
                  <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ textTransform: 'capitalize', width: '80px' }}>{provider}:</span>
                    {res.success ? (
                      <span className="badge badge-green">Valid {res.model && `(${res.model})`}</span>
                    ) : (
                      <span className="badge badge-red">Failed: {res.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Toast Notification */}
      {message.text && (
        <div className={`toast ${message.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}
    </div>
  );
}
