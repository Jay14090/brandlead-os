'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'reasoning'>('overview');

  useEffect(() => {
    fetch(`/api/leads/${params.leadId}`)
      .then(res => res.json())
      .then(data => {
        setLead(data);
        setLoading(false);
      });
  }, [params.leadId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      router.push('/leads');
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLead({ ...lead, status });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: '500px' }} />;
  if (!lead) return <div>Lead not found</div>;

  const renderStatusBadge = (status: string, label: string) => {
    let colorClass = 'badge-gray';
    if (status === 'Verified') colorClass = 'badge-green';
    if (status === 'Likely' || status === 'Possible' || status === 'Conflict') colorClass = 'badge-amber';
    if (status === 'Not found' || status === 'Rejected') colorClass = 'badge-red';
    
    return (
      <span className={`badge ${colorClass}`} title={label}>
        {label}: {status}
      </span>
    );
  };

  const warnings = lead.warnings ? JSON.parse(lead.warnings) : [];
  const conflicts = lead.conflicts ? JSON.parse(lead.conflicts) : [];

  const ensureUrlProtocol = (url: string | null | undefined) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link href="/leads" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            ← Back to Leads
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {lead.companyName}
            </h1>
            <select 
              className="select" 
              style={{ width: '150px', padding: '0.25rem 2rem 0.25rem 0.75rem', height: '32px' }}
              value={lead.status}
              onChange={e => updateStatus(e.target.value)}
              disabled={saving}
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Rejected">Rejected</option>
            </select>
            {lead.needsManualReview && (
              <span className="badge badge-amber" style={{ fontWeight: 600 }}>Review Needed</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {renderStatusBadge(lead.companyNameStatus, 'Name')}
            {renderStatusBadge(lead.websiteStatus, 'Web')}
            {renderStatusBadge(lead.locationStatus, 'Location')}
            {renderStatusBadge(lead.companySizeStatus, 'Size')}
            {renderStatusBadge(lead.linkedinStatus, 'LinkedIn')}
            {renderStatusBadge(lead.bestDecisionMakerStatus, 'DM Role')}
            {renderStatusBadge(lead.decisionMakerContactStatus, 'DM Contact')}
          </div>
        </div>
        <div>
          <button onClick={handleDelete} className="btn-danger">Delete Lead</button>
        </div>
      </div>

      {/* Tabs Nav */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('overview')} 
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'overview' ? '2px solid var(--accent-purple)' : '2px solid transparent', color: activeTab === 'overview' ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: activeTab === 'overview' ? 600 : 400, cursor: 'pointer' }}
        >
          Final Outreach Data
        </button>
        <button 
          onClick={() => setActiveTab('evidence')} 
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'evidence' ? '2px solid var(--accent-purple)' : '2px solid transparent', color: activeTab === 'evidence' ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: activeTab === 'evidence' ? 600 : 400, cursor: 'pointer' }}
        >
          Source Evidence
        </button>
        <button 
          onClick={() => setActiveTab('reasoning')} 
          style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'reasoning' ? '2px solid var(--accent-purple)' : '2px solid transparent', color: activeTab === 'reasoning' ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: activeTab === 'reasoning' ? 600 : 400, cursor: 'pointer' }}
        >
          AI Reasoning & Audits
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Outreach Pitch & Angle</h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Observed Pain Points</label>
                {lead.painPoints?.length > 0 ? (
                  <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {lead.painPoints.map((point: string, i: number) => (
                      <li key={i} style={{ marginBottom: '0.5rem' }}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>None observed</p>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">What We Can Pitch</label>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{lead.whatWeCanPitch || 'N/A'}</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="label">Suggested Outreach Angle</label>
                <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.6 }}>
                  "{lead.suggestedOutreachAngle || 'N/A'}"
                </div>
              </div>

              <div>
                <label className="label">Personalized First Line</label>
                <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
                  {lead.personalizedFirstLine || 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Company Identity</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Industry</label>
                  <div>{lead.industry || 'Unknown'}</div>
                </div>
                <div>
                  <label className="label">Location</label>
                  <div>{lead.location || 'Unknown'}</div>
                </div>
                <div>
                  <label className="label">Website</label>
                  <div>
                    {lead.websiteUrl ? (
                      <a href={ensureUrlProtocol(lead.websiteUrl)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                        {lead.websiteUrl}
                      </a>
                    ) : 'Unknown'}
                  </div>
                </div>
                <div>
                  <label className="label">Company Size</label>
                  <div>{lead.companySizeEstimate || 'Unknown'}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">What They Do</label>
                  <p style={{ color: 'var(--text-secondary)' }}>{lead.whatTheyDo || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem', background: lead.bestDecisionMakerName ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', border: `1px solid ${lead.bestDecisionMakerName ? 'var(--accent-purple)' : 'var(--border-subtle)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎯 Best Decision Maker
                </h2>
                <span className="badge badge-purple">Conf: {lead.decisionMakerConfidence}%</span>
              </div>
              
              {lead.bestDecisionMakerName ? (
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {lead.bestDecisionMakerName}
                  </div>
                  <div style={{ color: 'var(--accent-purple)', fontWeight: 600, marginBottom: '1rem' }}>
                    {lead.bestDecisionMakerRole}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {lead.bestDecisionMakerEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>✉️</span> <span style={{ fontWeight: 500 }}>{lead.bestDecisionMakerEmail}</span>
                      </div>
                    )}
                    {lead.bestDecisionMakerPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>📞</span> <span style={{ fontWeight: 500 }}>{lead.bestDecisionMakerPhone}</span>
                      </div>
                    )}
                    {lead.bestDecisionMakerLinkedIn && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🔗</span> <a href={ensureUrlProtocol(lead.bestDecisionMakerLinkedIn)} target="_blank" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>LinkedIn Profile</a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No decision maker found.</p>
              )}
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Company General Contacts</h2>
                <span className="badge badge-blue">Conf: {lead.contactsConfidence}%</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lead.companyGeneralEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✉️</span> <span style={{ fontWeight: 500 }}>{lead.companyGeneralEmail}</span>
                  </div>
                )}
                {lead.companyGeneralPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📞</span> <span style={{ fontWeight: 500 }}>{lead.companyGeneralPhone}</span>
                  </div>
                )}
                {lead.linkedinCompanyUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🔗</span> <a href={ensureUrlProtocol(lead.linkedinCompanyUrl)} target="_blank" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Company LinkedIn</a>
                  </div>
                )}
                {(!lead.companyGeneralEmail && !lead.companyGeneralPhone && !lead.linkedinCompanyUrl) && (
                  <p style={{ color: 'var(--text-muted)' }}>No general contacts found.</p>
                )}
              </div>
              
              {lead.bestOutreachRoute && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <label className="label">Recommended Outreach Route</label>
                  <div style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{lead.bestOutreachRoute}</div>
                </div>
              )}
            </div>
            
            {(warnings.length > 0 || conflicts.length > 0) && (
              <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--accent-amber)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-amber)' }}>⚠️ Data Issues</h2>
                
                {conflicts.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Conflicts:</div>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--accent-red)', fontSize: '0.875rem' }}>
                      {conflicts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
                
                {warnings.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Warnings:</div>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--accent-amber)', fontSize: '0.875rem' }}>
                      {warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Crawled Pages ({lead.crawledPages?.length || 0})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {lead.crawledPages?.map((page: any) => (
                <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <a href={ensureUrlProtocol(page.url)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {page.title || page.url}
                  </a>
                  <span className={`badge ${page.statusCode === 200 ? 'badge-green' : 'badge-red'}`}>{page.statusCode}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Contact Candidates ({lead.contacts?.length || 0})</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {lead.contacts?.map((contact: any) => (
                <div key={contact.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                      {contact.type === 'phone' ? '📞' : contact.type === 'email' ? '✉️' : '🔗'} {contact.value}
                    </div>
                    <span className="badge badge-gray">Conf: {contact.confidence}</span>
                  </div>
                  {contact.role && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{contact.role} {contact.personName && `(${contact.personName})`}</div>}
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div>Source: <a href={ensureUrlProtocol(contact.sourceUrl)} target="_blank" style={{ color: 'inherit' }}>{contact.sourceUrl}</a></div>
                    <div style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{contact.sourceSnippet}"</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Decision Maker Candidates ({lead.decisionMakers?.length || 0})</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {lead.decisionMakers?.map((dm: any) => (
                <div key={dm.id} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{dm.personName}</div>
                      <div style={{ color: 'var(--accent-purple)', fontSize: '0.875rem', fontWeight: 500 }}>{dm.role}</div>
                    </div>
                    <span className={`badge ${dm.verificationStatus === 'Verified' ? 'badge-green' : 'badge-amber'}`}>
                      {dm.verificationStatus} ({dm.confidence}%)
                    </span>
                  </div>
                  
                  {dm.contactEvidences?.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>Discovered Contacts</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {dm.contactEvidences.map((ce: any) => (
                          <div key={ce.id} style={{ fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px' }}>
                            <span>{ce.contactType === 'email' ? '✉️' : ce.contactType === 'phone' ? '📞' : '🔗'} {ce.value}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Conf: {ce.confidence}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                    <div>Source: <a href={ensureUrlProtocol(dm.sourceUrl)} target="_blank" style={{ color: 'inherit' }}>{dm.sourceUrl}</a></div>
                    <div style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>"{dm.sourceSnippet}"</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reasoning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Primary LLM Decision (FinalLeadJudge)</span>
              <span className="badge badge-purple">Confidence: {lead.overallConfidence}%</span>
            </h2>
            
            {lead.auditJson ? (
              <pre style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)', 
                overflowX: 'auto',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)'
              }}>
                {JSON.stringify(lead.auditJson, null, 2)}
              </pre>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No audit JSON available. This lead may have been created before the evidence-first pipeline was deployed.</p>
            )}
          </div>

          <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Secondary Reviewer (Gemini Critic)</span>
            </h2>
            
            {lead.geminiReview ? (
              <pre style={{ 
                background: 'var(--bg-tertiary)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)', 
                overflowX: 'auto',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)'
              }}>
                {JSON.stringify(lead.geminiReview, null, 2)}
              </pre>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No Gemini review available.</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
