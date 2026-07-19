'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Brain, 
  CheckSquare, 
  Clock, 
  Compass, 
  Cpu, 
  Database, 
  FolderGit2, 
  LayoutDashboard, 
  Play, 
  Plus, 
  RotateCw, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  TrendingUp, 
  User, 
  Volume2 
} from 'lucide-react';
import Link from 'next/link';

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'agents' | 'goals' | 'memory' | 'analytics'>('agents');
  
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

  // Agent workspace logs
  const [agentLogs] = useState<AgentLog[]>([
    { agent: 'CEO Agent', emoji: '👑', status: 'done', action: 'Assigned sub-tasks to Research & UI design agents', timestamp: '10 mins ago' },
    { agent: 'Researcher', emoji: '🔍', status: 'done', action: 'Finished Tavily deep web search queries on target prompt', timestamp: '8 mins ago' },
    { agent: 'UI Designer', emoji: '🎨', status: 'running', action: 'Optimizing landing page HTML/CSS styles template', timestamp: 'Just now' },
    { agent: 'DevOps Engineer', emoji: '🚀', status: 'idle', action: 'Waiting for build completion to spin sandbox container', timestamp: 'Idle' },
    { agent: 'QA Engineer', emoji: '🧪', status: 'idle', action: 'Ready to perform auto-preview test scans', timestamp: 'Idle' },
  ]);

  // Memory timeline
  const [memories, setMemories] = useState([
    { id: 'm1', key: 'user_name', content: 'Gagan', category: 'fact', date: 'Today' },
    { id: 'm2', key: 'framework', content: 'Next.js & Tailwind CSS', category: 'preference', date: 'Yesterday' },
    { id: 'm3', key: 'database', content: 'PostgreSQL with Prisma Client', category: 'preference', date: '2 days ago' },
  ]);

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
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>AUI 3.0 Agent OS</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Unified Operational Dashboard & Mission Control</span>
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
                  background: active ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
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
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
                backdropFilter: 'blur(8px)',
              }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: '#818cf8' }} />
                  Multi-Agent Team Status Board
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {agentLogs.map((log, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{log.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.agent}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>{log.action}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.timestamp}</span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '10px',
                          textTransform: 'uppercase',
                          background: log.status === 'running' ? '#6366f133' : log.status === 'done' ? '#10b98133' : 'rgba(255,255,255,0.06)',
                          color: log.status === 'running' ? '#818cf8' : log.status === 'done' ? '#34d399' : '#94a3b8',
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
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#a5b4fc' }}>QA Automation Audit Scanner</h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Validate live system builds, endpoints latency, and memory integrity automatically.</p>
                  </div>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: '#6366f1',
                    border: 'none',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                  }}>
                    <Play size={12} fill="white" /> Run Full Audit Scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GOAL OPERATING SYSTEM */}
          {activeTab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Add New Goal Box */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
              }}>
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
                      border: '1px solid rgba(255,255,255,0.08)',
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
                      border: '1px solid rgba(255,255,255,0.08)',
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
                      background: '#06b6d4',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
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
                  <div key={g.id} style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
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
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0 0 16px 0', lineHeight: 1.4 }}>{g.description}</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {g.tasks.map((t) => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={() => handleToggleTask(g.id, t.id)}
                              style={{ accentColor: '#6366f1' }}
                            />
                            <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#64748b' : '#f1f5f9' }}>
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
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '12px',
                      fontSize: '0.7rem',
                      color: '#64748b',
                    }}>
                      <span>Target: {g.targetDate}</span>
                      <span style={{
                        color: g.status === 'in_progress' ? '#a5b4fc' : '#f87171',
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
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px',
              padding: '24px',
            }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} style={{ color: '#06b6d4' }} />
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
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#06b6d4',
                      padding: '6px',
                      borderRadius: '50%',
                    }}>
                      <Database size={14} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#f1f5f9' }}>{m.key}</span>
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          color: '#94a3b8',
                          textTransform: 'uppercase'
                        }}>{m.category}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>• {m.date}</span>
                      </div>
                      <p style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{m.content}</p>
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
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} /> Resource Allocations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span>Agent Sandboxes CPU Load</span>
                      <span style={{ fontWeight: 600 }}>12%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '12%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                      <span>Active Vector Nodes Cache</span>
                      <span style={{ fontWeight: 600 }}>64%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '64%', height: '100%', background: '#6366f1' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Audit Pane */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={15} style={{ color: '#10b981' }} /> Security Policy Diagnostics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#94a3b8' }}>Session Rotation Status</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>ACTIVE (Green)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#94a3b8' }}>Impossible Travel Check</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>PASSING</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Llama Guard API Shield</span>
                    <span style={{ color: '#34d399', fontWeight: 600 }}>MONITORING</span>
                  </div>
                </div>
              </div>

              {/* Latency & Optimization metrics */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '20px',
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} /> Latency Profiler
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#94a3b8' }}>Smart Router Decision Time</span>
                    <span style={{ fontWeight: 600 }}>18 ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#94a3b8' }}>HuggingFace Speech Latency</span>
                    <span style={{ fontWeight: 600 }}>120 ms</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Average Search Synthesis</span>
                    <span style={{ fontWeight: 600 }}>1.2 sec</span>
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
