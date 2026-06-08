import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const whereClause = session.role === 'admin' ? {} : { userId: session.userId };
  const jobWhereClause = session.role === 'admin' ? {} : { userId: session.userId };

  // Get stats
  const totalLeads = await prisma.lead.count({ where: whereClause });
  const verifiedLeads = await prisma.lead.count({ where: { ...whereClause, websiteStatus: 'Verified' } });
  const leadsWithEmail = await prisma.lead.count({ where: { ...whereClause, companyGeneralEmail: { not: null } } });
  const leadsWithPhone = await prisma.lead.count({ where: { ...whereClause, companyGeneralPhone: { not: null } } });

  const leads = await prisma.lead.findMany({ where: whereClause, select: { overallConfidence: true } });
  const avgConfidence = totalLeads > 0 
    ? Math.round(leads.reduce((sum, l) => sum + l.overallConfidence, 0) / totalLeads) 
    : 0;

  const recentJobs = await prisma.searchJob.findMany({
    where: jobWhereClause,
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { leads: { select: { id: true } } },
  });

  const stats = [
    { label: 'Total Leads', value: totalLeads, icon: '👥', color: '#7c3aed' },
    { label: 'Verified', value: verifiedLeads, icon: '✅', color: '#22c55e' },
    { label: 'Avg Confidence', value: `${avgConfidence}%`, icon: '📈', color: '#3b82f6' },
    { label: 'With Email', value: leadsWithEmail, icon: '✉️', color: '#eab308' },
    { label: 'With Phone', value: leadsWithPhone, icon: '📞', color: '#f97316' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Overview of your lead generation performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/leads" className="btn-secondary" style={{ textDecoration: 'none' }}>
            📥 Export All
          </Link>
          <Link href="/search/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            ✨ New Search
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {stat.value}
                </p>
              </div>
              <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
            </div>
            <div style={{
              marginTop: '0.75rem',
              height: '3px',
              borderRadius: '2px',
              background: `linear-gradient(90deg, ${stat.color}, transparent)`,
              opacity: 0.3,
            }} />
          </div>
        ))}
      </div>

      {/* Recent Searches */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Searches</h2>
        </div>

        {recentJobs.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</p>
            <p style={{ fontSize: '0.9375rem', marginBottom: '0.25rem' }}>No searches yet</p>
            <p style={{ fontSize: '0.8125rem' }}>Start your first lead search to see results here.</p>
            <Link href="/search/new" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1rem', display: 'inline-flex' }}>
              ✨ Start First Search
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Location</th>
                <th>Leads</th>
                <th>Depth</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{job.brandType}</td>
                  <td>{job.location}</td>
                  <td>{job.leads.length} / {job.leadCount}</td>
                  <td><span className="badge badge-purple">{job.searchDepth}</span></td>
                  <td>
                    <span className={`badge ${
                      job.status === 'completed' ? 'badge-green' :
                      job.status === 'running' ? 'badge-blue' :
                      job.status === 'failed' ? 'badge-red' : 'badge-gray'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {job.createdAt.toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      href={job.status === 'completed' ? `/leads?jobId=${job.id}` : `/search/${job.id}`}
                      className="btn-ghost"
                      style={{ textDecoration: 'none', fontSize: '0.8125rem' }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
