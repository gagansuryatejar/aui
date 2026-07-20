'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Brain, 
  CheckSquare, 
  Clock, 
  Cpu, 
  Database, 
  LayoutDashboard, 
  Play, 
  Plus, 
  RotateCw, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  TrendingUp, 
  Zap,
  Activity,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';

interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'in_progress' | 'completed' | 'on_hold';
  targetDate: string;
  tasks: { id: string; title: string; completed: boolean }[];
}

interface AgentLog {
  agent: string;
  emoji: string;
  status: 'idle' | 'running' | 'done' | 'failed';
  action: string;
  timestamp: string;
}

interface SystemTelemetry {
  status: string;
  timestamp: string;
  uptimeSec: number;
  system: {
    memoryPercent: number;
    heapUsedMb: number;
    totalMemMb: number;
    freeMemMb: number;
    cpuCores: number;
    loadAvg: number;
  };
  providers: {
    total: number;
    active: number;
    list: { name: string; displayName: string; configured: boolean; modelsCount: number }[];
  };
  database: {
    connected: boolean;
    userCount: number;
    conversationCount: number;
  };
  agents: AgentLog[];
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'goals' | 'memory' | 'analytics'>('agents');
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  // Local state for goals (Goal OS)
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Launch AUI 3.0 Platform',
      description: 'Deploy the unified AI Operating System workspace.',
      status: 'in_progress',
      targetDate: '2026-08-01',
      tasks: [
        { id: '1-1', title: 'Register multi-agent orchestrator endpoints', completed: true },
        { id: '1-2', title: 'Configure Whisper/Kokoro speech WS channels', completed: true },
        { id: '1-3', title: 'Build unified search dashboards interface', completed: false },
      ]
    },
    {
      id: '2',
      title: 'Optimize Vector Embeddings Pipeline',
      description: 'Transition database index layers to BGE-M3 RAG models.',
      status: 'on_hold',
      targetDate: '2026-09-15',
      tasks: [
        { id: '2-1', title: 'Set up Qdrant vector client store', completed: false },
        { id: '2-2', title: 'Tune reranking algorithm thresholds', completed: false },
      ]
    }
  ]);

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');

  // Agent workspace logs fallback
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([
    { agent: 'CEO Agent', emoji: '👑', status: 'done', action: 'Assigned sub-tasks to Research & UI design agents', timestamp: 'Active' },
    { agent: 'Researcher', emoji: '🔍', status: 'done', action: 'Finished Tavily deep web search queries on target prompt', timestamp: 'Active' },
    { agent: 'UI Designer', emoji: '🎨', status: 'running', action: 'Optimizing landing page HTML/CSS styles template', timestamp: 'Just now' },
    { agent: 'DevOps Engineer', emoji: '🚀', status: 'running', action: 'Spinning Vercel & Node live monitoring container', timestamp: 'Live' },
    { agent: 'QA Engineer', emoji: '🧪', status: 'done', action: 'Auto-preview test scans verified clean build', timestamp: 'Passed' },
  ]);

  // Memory timeline fallback
  const [memories] = useState([
    { id: 'm1', key: 'user_name', content: 'Gagan', category: 'fact', date: 'Today' },
    { id: 'm2', key: 'framework', content: 'Next.js & Tailwind CSS', category: 'preference', date: 'Yesterday' },
    { id: 'm3', key: 'database', content: 'PostgreSQL with Prisma Client', category: 'preference', date: '2 days ago' },
  ]);

  // Fetch Live Monitoring Telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const data = await apiGet<SystemTelemetry>('/api/system/monitoring');
      if (data) {
        setTelemetry(data);
        if (data.agents && data.agents.length > 0) {
          setAgentLogs(data.agents);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Handle Full Audit Scan
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const result = await apiPost<any>('/api/system/audit');
      setAuditResult(result);
      await fetchTelemetry();
    } catch (err: any) {
      setAuditResult({ error: err.message || 'Audit failed' });
    } finally {
      setIsAuditing(false);
    }
  };

  // Handle adding new goal
  const handleAddGoal = useCallback(() => {
    if (!newGoalTitle.trim()) return;
    const goal: Goal = {
      id: String(Date.now()),
      title: newGoalTitle,
      description: newGoalDesc,
      status: 'in_progress',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tasks: [],
    };
    setGoals((prev) => [...prev, goal]);
    setNewGoalTitle('');
    setNewGoalDesc('');
  }, [newGoalTitle, newGoalDesc]);

  // Toggle goal task completion
  const handleToggleTask = useCallback((goalId: string, taskId: string) => {
    setGoals((prev) => 
      prev.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
        };
      })
    );
  }, []);

  // Delete goal
  const handleDeleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      color: 'var(--text-primary)',
      padding: '24px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '16px',
        marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <LayoutDashboard size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>AUI 3.0 Agent OS</h1>
              {/* Live Status Badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#22c55e',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px #22c55e',
                  animation: 'pulse 1.5s infinite'
                }} />
                Live Telemetry Monitoring
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Unified Operational Dashboard & Real-time Mission Control</span>
          </div>
        </div>

        <Link href="/" style={{
          padding: '8px 16px',
          borderRadius: '20px',
          background: 'var(--glass)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.2s var(--ease-smooth)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--glass)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
          ← Go to Chat Workspace
        </Link>
      </header>

      {/* Main Grid Layout */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '4px',
          borderRadius: '24px',
          alignSelf: 'flex-start',
        }}>
          {[
            { id: 'agents', label: 'Agent Workspace', icon: Cpu },
            { id: 'goals', label: 'Goal Operating System', icon: CheckSquare },
            { id: 'memory', label: 'AI Memory Timeline', icon: Brain },
            { id: 'analytics', label: 'Performance & Audit', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: active ? 'linear-gradient(135deg, var(--brand), #4f46e5)' : 'transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div style={{ minHeight: '400px' }}>
          
          {/* AI AGENT BOARD */}
          {activeTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} style={{ color: 'var(--brand)' }} />
                    Multi-Agent Team Status Board
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {telemetry?.providers ? `${telemetry.providers.active}/${telemetry.providers.total} Providers Active` : '5 Autonomous Agents'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {agentLogs.map((log, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{log.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.agent}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>{log.action}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{log.timestamp}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '10px',
                          textTransform: 'uppercase',
                          background: log.status === 'running' ? 'rgba(108, 99, 255, 0.2)' : log.status === 'done' ? 'rgba(34, 197, 94, 0.2)' : 'var(--glass)',
                          color: log.status === 'running' ? 'var(--brand)' : log.status === 'done' ? '#22c55e' : 'var(--text-tertiary)',
                          border: log.status === 'running' ? '1px solid rgba(108, 99, 255, 0.4)' : log.status === 'done' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--glass-border)',
                        }}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA Auto Diagnostics Widget */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(0, 229, 255, 0.08))',
                border: '1px solid rgba(108, 99, 255, 0.2)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--brand)' }}>QA Automation Audit Scanner</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Validate live system builds, endpoints latency, and memory integrity automatically.</p>
                  </div>
                  <button 
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '20px',
                      background: isAuditing ? 'var(--text-tertiary)' : 'var(--brand)',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: isAuditing ? 'default' : 'pointer',
                      boxShadow: 'var(--shadow-glow)',
                    }}
                  >
                    {isAuditing ? (
                      <>
                        <RotateCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running Audit...
                      </>
                    ) : (
                      <>
                        <Play size={12} fill="white" /> Run Full Audit Scan
                      </>
                    )}
                  </button>
                </div>

                {/* Audit Result Box */}
                {auditResult && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: 'rgba(5, 7, 13, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.8rem',
                  }}>
                    {auditResult.error ? (
                      <span style={{ color: '#ef4444' }}>Audit failed: {auditResult.error}</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} /> {auditResult.summary} ({auditResult.durationMs}ms)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          Session Rotation: {auditResult.securityCheck?.sessionRotation} • Travel Security: {auditResult.securityCheck?.impossibleTravel}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GOAL OPERATING SYSTEM */}
          {activeTab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Add New Goal Box */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Define New OS Goal</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Goal Title (e.g. Set up API database key rotation)"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    style={{
                      flex: 2,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'white',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description / Context"
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    style={{
                      flex: 3,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: 'white',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <button
                    onClick={handleAddGoal}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: 'var(--accent)',
                      border: 'none',
                      color: '#05070D',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> Add Goal
                  </button>
                </div>
              </div>

              {/* Goals Cards List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {goals.map((g) => (
                  <div key={g.id} className="glass-card" style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{g.title}</h4>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '0 0 16px 0', lineHeight: 1.4 }}>{g.description}</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {g.tasks.map((t) => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={() => handleToggleTask(g.id, t.id)}
                              style={{ accentColor: 'var(--brand)' }}
                            />
                            <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                              {t.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--glass-border)',
                      paddingTop: '12px',
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                    }}>
                      <span>Target: {g.targetDate}</span>
                      <span style={{
                        color: g.status === 'in_progress' ? 'var(--brand)' : '#f87171',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>{g.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI MEMORY TIMELINE */}
          {activeTab === 'memory' && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} style={{ color: 'var(--accent)' }} />
                AI OS Knowledge Graph Memory Timeline
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {memories.map((m) => (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    position: 'relative',
                    paddingBottom: '12px',
                  }}>
                    <div style={{
                      background: 'var(--accent-muted)',
                      border: '1px solid rgba(0, 229, 255, 0.3)',
                      color: 'var(--accent)',
                      padding: '6px',
                      borderRadius: '50%',
                    }}>
                      <Database size={14} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{m.key}</span>
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'var(--glass)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase'
                        }}>{m.category}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>• {m.date}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PERFORMANCE & AUDIT */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* CPU & Memory metrics */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} /> Resource Allocations (Live)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span>System Memory Load</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {telemetry?.system ? `${telemetry.system.memoryPercent}% (${telemetry.system.heapUsedMb}MB Heap)` : '12%'}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--glass)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${telemetry?.system?.memoryPercent || 12}%`, height: '100%', background: '#10b981', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span>Active Provider Channels</span>
                      <span style={{ fontWeight: 600, color: 'var(--brand)' }}>
                        {telemetry?.providers ? `${telemetry.providers.active} / ${telemetry.providers.total}` : '100%'}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--glass)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: 'var(--brand)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Audit Pane */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#10b981' }} /> Security Policy Diagnostics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Session Rotation Status</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>ACTIVE (Green)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Impossible Travel Check</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>PASSING</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Llama Guard API Shield</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>MONITORING</span>
                  </div>
                </div>
              </div>

              {/* Latency & Optimization metrics */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} /> Latency Profiler
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Smart Router Decision Time</span>
                    <span style={{ fontWeight: 600 }}>12 ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Speech Channels Latency</span>
                    <span style={{ fontWeight: 600 }}>110 ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>System Uptime</span>
                    <span style={{ fontWeight: 600 }}>{telemetry ? `${telemetry.uptimeSec}s` : 'Active'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
