'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JobProgressPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${params.jobId}`);
        const data = await res.json();
        setJob(data);
        
        if (data.status === 'completed' || data.status === 'failed') {
          return true; // Done
        }
        return false; // Continue polling
      } catch (error) {
        console.error('Failed to fetch job:', error);
        return false;
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
    
    // Poll every 3 seconds while running
    const interval = setInterval(async () => {
      const isDone = await fetchJob();
      if (isDone) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [params.jobId]);

  if (loading) {
    return <div className="skeleton" style={{ height: '400px' }} />;
  }

  if (!job) {
    return <div>Job not found</div>;
  }

  const p = job.progress || {};
  const progressPercent = p.stageIndex >= 0 ? Math.min(100, Math.round(((p.stageIndex) / p.totalStages) * 100)) : 0;

  const stages = [
    { id: 'queries', label: 'Query Generation' },
    { id: 'evidence_collection', label: 'Evidence Collection' },
    { id: 'company_merge', label: 'Company Merge' },
    { id: 'website_resolution', label: 'Website Resolution' },
    { id: 'crawling', label: 'Deep Crawling' },
    { id: 'contact_extraction', label: 'Contact Extraction' },
    { id: 'decision_maker_discovery', label: 'DM Discovery' },
    { id: 'person_contact_search', label: 'DM Contact Search' },
    { id: 'light_cleaning', label: 'Light Cleaning' },
    { id: 'final_judge', label: 'AI Judging & Saving' }
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Pipeline Status
            {job.status === 'running' && <span className="badge badge-blue animate-pulse">Running</span>}
            {job.status === 'completed' && <span className="badge badge-green">Completed</span>}
            {job.status === 'failed' && <span className="badge badge-red">Failed</span>}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Target: {job.brandType} in {job.location}
          </p>
        </div>
        {job.status === 'completed' && (
          <button 
            onClick={() => router.push(`/leads?jobId=${job.id}`)}
            className="btn-primary"
          >
            View Generated Leads →
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 500 }}>Overall Progress</span>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{progressPercent}%</span>
          </div>
          <div className="progress-bar" style={{ height: '8px' }}>
            <div 
              className="progress-fill" 
              style={{ 
                width: `${progressPercent}%`,
                background: job.status === 'failed' ? 'var(--accent-red)' : job.status === 'completed' ? 'var(--accent-green)' : 'var(--gradient-primary)'
              }} 
            />
          </div>
          <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
            {p.message || 'Initializing...'}
          </div>
        </div>

        {/* Stage List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {stages.map((stage, i) => {
            const isCompleted = p.stageIndex > i || job.status === 'completed';
            const isCurrent = p.stage === stage.id && job.status === 'running';
            const isFailed = p.stage === 'error';
            const isPending = !isCompleted && !isCurrent;

            return (
              <div 
                key={stage.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isCurrent ? 'rgba(124, 58, 237, 0.05)' : 'var(--bg-tertiary)',
                  border: `1px solid ${isCurrent ? 'var(--accent-purple)' : 'var(--border-subtle)'}`,
                  opacity: isPending && !isFailed ? 0.6 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : isCurrent ? 'var(--accent-purple)' : 'var(--bg-elevated)',
                  color: isCompleted ? 'var(--accent-green)' : isCurrent ? 'white' : 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isCurrent ? 600 : 500, color: isCurrent ? 'var(--text-primary)' : 'inherit' }}>
                    {stage.label}
                  </div>
                  {isCurrent && p.details && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '500px' }}>
                      {p.details}
                    </div>
                  )}
                </div>
                {isCurrent && (
                  <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(124, 58, 237, 0.3)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {job.error && (
        <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', borderRadius: 'var(--radius)' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Pipeline Error</h3>
          <p style={{ fontSize: '0.875rem' }}>{job.error}</p>
        </div>
      )}
    </div>
  );
}
