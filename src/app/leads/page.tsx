'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [jobId, setJobId] = useState(searchParams.get('jobId') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [hasEmail, setHasEmail] = useState(searchParams.get('hasEmail') === 'true');

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (jobId) query.append('jobId', jobId);
        if (status) query.append('status', status);
        if (search) query.append('search', search);
        if (hasEmail) query.append('hasEmail', 'true');

        const res = await fetch(`/api/leads?${query.toString()}`);
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [jobId, status, search, hasEmail]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const query = new URLSearchParams();
    if (jobId) query.append('jobId', jobId);
    window.location.href = `/api/export/${format}?${query.toString()}`;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Leads Database</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Manage and export your AI-generated and verified leads.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => handleExport('csv')} className="btn-secondary">Export CSV</button>
          <button onClick={() => handleExport('xlsx')} className="btn-primary">Export Excel</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="label">Search Companies</label>
          <input 
            type="text" 
            className="input" 
            placeholder="Name or domain..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: '150px' }}>
          <label className="label">Status</label>
          <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div style={{ paddingBottom: '0.625rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={hasEmail}
              onChange={e => setHasEmail(e.target.checked)}
              style={{ accentColor: 'var(--accent-purple)' }}
            />
            Has Email
          </label>
        </div>
        {jobId && (
          <div style={{ paddingBottom: '0.625rem' }}>
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Filtered by Job 
              <button 
                onClick={() => { setJobId(''); router.push('/leads'); }} 
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
            <span className="animate-spin" style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(124, 58, 237, 0.3)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }} />
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</p>
            <p>No leads found matching your criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Identity</th>
                  <th>Decision Maker</th>
                  <th>Contact</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.companyName}</div>
                      {lead.industry && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.industry}</div>}
                      {lead.needsManualReview && <span className="badge badge-amber" style={{ marginTop: '0.25rem' }}>Review Needed</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className={`badge ${
                          lead.companyNameStatus === 'Verified' ? 'badge-green' :
                          lead.companyNameStatus === 'Likely' ? 'badge-amber' : 'badge-red'
                        }`}>
                          Name: {lead.companyNameStatus}
                        </span>
                        <span className={`badge ${
                          lead.websiteStatus === 'Verified' ? 'badge-green' :
                          lead.websiteStatus === 'Likely' ? 'badge-amber' : 'badge-red'
                        }`}>
                          Web: {lead.websiteStatus}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lead.bestDecisionMakerName || 'No DM Found'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.bestDecisionMakerRole || ''}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(lead.companyGeneralEmail || lead.bestDecisionMakerEmail) ? <span title={lead.bestDecisionMakerEmail || lead.companyGeneralEmail}>📧</span> : <span style={{ opacity: 0.2 }}>📧</span>}
                        {(lead.companyGeneralPhone || lead.bestDecisionMakerPhone) ? <span title={lead.bestDecisionMakerPhone || lead.companyGeneralPhone}>📞</span> : <span style={{ opacity: 0.2 }}>📞</span>}
                        {(lead.linkedinCompanyUrl || lead.bestDecisionMakerLinkedIn) ? <span title="LinkedIn">🔗</span> : <span style={{ opacity: 0.2 }}>🔗</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <div className="badge" style={{ background: lead.overallConfidence >= 80 ? 'rgba(34, 197, 94, 0.1)' : lead.overallConfidence >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: lead.overallConfidence >= 80 ? 'var(--accent-green)' : lead.overallConfidence >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)', fontWeight: 600 }}>
                        {lead.overallConfidence}%
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{lead.status}</span>
                    </td>
                    <td>
                      <Link href={`/leads/${lead.id}`} className="btn-ghost" style={{ textDecoration: 'none' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
