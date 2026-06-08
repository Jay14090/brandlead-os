'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [error, setError] = useState('');
  
  // Activity Drawer State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<{username: string, jobs: any[], leads: any[]} | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [scrapping, setScrapping] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setUsers([data, ...users]);
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const toggleUserAccess = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'restore'} access for this user?`)) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map(u => u.id === id ? updated : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleAddCredits = async (id: string) => {
    const amountStr = prompt('Enter amount of credits to add (e.g. 10 or -5):');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return alert('Invalid amount');

    try {
      const res = await fetch(`/api/admin/users/${id}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      
      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === id ? { ...u, credits: updatedUser.credits } : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update credits');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleScrapLeads = async () => {
    if (!confirm('Are you sure you want to permanently delete all leads with less than 50% confidence across all users? This cannot be undone.')) return;
    
    setScrapping(true);
    try {
      const res = await fetch('/api/admin/leads/scrap?maxConfidence=49', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully deleted ${data.deletedCount} low-confidence leads.`);
        fetchUsers(); // Refresh counts
      } else {
        alert(data.error || 'Failed to delete leads');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setScrapping(false);
    }
  };

  const viewUserActivity = async (userId: string) => {
    setSelectedUserId(userId);
    setActivityData(null);
    setLoadingActivity(true);
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      const data = await res.json();
      if (res.ok) {
        setActivityData(data);
      } else {
        alert(data.error || 'Failed to fetch activity');
        setSelectedUserId(null);
      }
    } catch (err) {
      alert('Network error');
      setSelectedUserId(null);
    } finally {
      setLoadingActivity(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Admin Panel</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Manage users, view system activity, and maintain data hygiene.
          </p>
        </div>
        <div>
          <button 
            onClick={handleScrapLeads} 
            disabled={scrapping}
            className="btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {scrapping ? 'Scrapping...' : '🗑️ Scrap Low Confidence Leads (< 50%)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Create User Form */}
        <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Create New User</h2>
          
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: '4px', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            
            <div>
              <label className="label">Username</label>
              <input 
                type="text" 
                className="input" 
                required 
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
              />
            </div>
            
            <div>
              <label className="label">Password</label>
              <input 
                type="password" 
                className="input" 
                required 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Role</label>
              <select className="select" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="user">User (Search & Leads only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
              Create User
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Active Users & Activity</h2>
          
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Credits</th>
                  <th>Activity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {user.username}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {new Date(user.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <span className={user.role === 'admin' ? 'badge badge-purple' : 'badge badge-gray'}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                        ${(user.credits || 0).toFixed(2)}
                      </div>
                      <button 
                        onClick={() => handleAddCredits(user.id)}
                        className="btn-ghost"
                        style={{ padding: '0.125rem 0.25rem', fontSize: '0.75rem', marginTop: '0.25rem' }}
                      >
                        ± Adjust
                      </button>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>{user._count.jobs} Jobs</div>
                        <div style={{ color: 'var(--text-muted)' }}>{user._count.leads} Leads</div>
                      </div>
                    </td>
                    <td>
                      <span className={user.isActive ? 'badge badge-green' : 'badge badge-red'}>
                        {user.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => viewUserActivity(user.id)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          👁️ View Activity
                        </button>
                        <button 
                          onClick={() => toggleUserAccess(user.id, user.isActive)}
                          className={user.isActive ? 'btn-danger' : 'btn-secondary'}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {user.isActive ? 'Revoke' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Activity Drawer */}
      {selectedUserId && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '600px',
          background: 'var(--bg-primary)', borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              User Activity: {activityData?.username || '...'}
            </h2>
            <button onClick={() => setSelectedUserId(null)} className="btn-ghost" style={{ padding: '0.5rem' }}>✕ Close</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {loadingActivity ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading activity...</div>
            ) : activityData ? (
              <>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Search Jobs ({activityData.jobs.length})</h3>
                {activityData.jobs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>No search jobs yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {activityData.jobs.map((job) => (
                      <div key={job.id} className="card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 500 }}>{job.brandType} - {job.location}</span>
                          <span className={`badge ${job.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>{job.status}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Requested {job.leadCount} leads • Generated {job._count.leads} • Depth: {job.searchDepth}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          {new Date(job.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Leads</h3>
                {activityData.leads.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No leads generated yet.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityData.leads.map((lead) => (
                        <tr key={lead.id}>
                          <td style={{ fontWeight: 500 }}>{lead.companyName}</td>
                          <td>
                            <span className="badge" style={{ background: lead.overallConfidence >= 80 ? 'rgba(34, 197, 94, 0.1)' : lead.overallConfidence >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: lead.overallConfidence >= 80 ? 'var(--accent-green)' : lead.overallConfidence >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                              {lead.overallConfidence}%
                            </span>
                          </td>
                          <td><span className="badge badge-gray">{lead.websiteStatus}</span></td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(lead.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--accent-red)' }}>Failed to load activity.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
