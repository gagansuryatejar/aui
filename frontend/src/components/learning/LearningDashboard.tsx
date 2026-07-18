'use client';

import React, { useEffect, useState } from 'react';
import {
  Brain,
  TrendingUp,
  Cpu,
  HelpCircle,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  payload: string;
  benefits: string;
  risks: string;
  confidence: number;
  status: string;
}

interface Report {
  id: string;
  content: string;
  optimizationsCount: number;
  createdAt: string;
}

interface PerformanceData {
  totalRuns: number;
  avgAccuracy: string;
  avgClarity: string;
  avgLatency: number;
  failedCount: number;
}

export default function LearningDashboard() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'optimizations' | 'metrics' | 'reports'>('optimizations');

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>('/api/learning/dashboard');
      setSuggestions(res.suggestions || []);
      setReports(res.reports || []);
      setPerformance(res.performance || null);
    } catch (err) {
      console.error('Failed to load learning metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSuggestion = async (id: string) => {
    try {
      await apiPost(`/api/learning/suggestions/${id}/approve`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      loadLearningData();
      alert('Optimization approved and applied successfully!');
    } catch (err) {
      alert('Failed to approve suggestion');
    }
  };

  const handleRejectSuggestion = async (id: string) => {
    try {
      await apiPost(`/api/learning/suggestions/${id}/reject`);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert('Failed to dismiss suggestion');
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await apiPost('/api/learning/reports/generate');
      loadLearningData();
      alert('New Weekly Improvement Report generated successfully!');
    } catch (err) {
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '2rem' }}>
        Loading continuous learning indices…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metrics Cards */}
      {performance && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Accuracy */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', marginBottom: '4px' }}>
              <TrendingUp size={16} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Accuracy Judge</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {performance.avgAccuracy}/5.0
            </div>
          </div>

          {/* Clarity */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', marginBottom: '4px' }}>
              <CheckCircle size={16} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Clarity Rating</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {performance.avgClarity}/5.0
            </div>
          </div>

          {/* Latency */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginBottom: '4px' }}>
              <Cpu size={16} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Avg Response Time</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {performance.avgLatency}ms
            </div>
          </div>

          {/* Failed */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-secondary)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'inline-flex', padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '4px' }}>
              <XCircle size={16} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Issues Detected</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ef4444' }}>
              {performance.failedCount}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
        {(['optimizations', 'metrics', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              fontSize: '0.8125rem',
              fontWeight: activeTab === tab ? 600 : 400,
              borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div style={{ minHeight: '200px' }}>
        {activeTab === 'optimizations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                <Sparkles size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                No pending optimizations. System behavior is optimized!
              </div>
            ) : (
              suggestions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--brand-primary)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        Confidence: {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {s.description}
                    </div>
                  </div>

                  {/* Impact details */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-primary)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#22c55e', fontWeight: 600 }}>Expected Benefits</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>{s.benefits}</div>
                    </div>
                    <div>
                      <div style={{ color: '#ef4444', fontWeight: 600 }}>Potential Risks</div>
                      <div style={{ color: 'var(--text-tertiary)' }}>{s.risks}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
                    <button
                      onClick={() => handleRejectSuggestion(s.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-primary)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleApproveSuggestion(s.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: 'var(--brand-primary)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Approve & Apply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Self-Improvement loop is monitoring active provider outputs. Gaps in responses generate prompt tweak suggestions automatically.
            </div>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <HelpCircle size={20} style={{ color: 'var(--brand-primary)' }} />
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                System Judge evaluates accuracy, completeness, and clarity metrics in real-time. Failed workflows log automated logs to the Audit Log.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Weekly Progress Reports
              </span>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--brand-primary)',
                  color: 'white',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                {generatingReport ? 'Compiling…' : 'Compile Report Now'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                  No reports compiled yet. Click compile above to generate your first progress snapshot!
                </div>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-primary)',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Report of {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                        {report.optimizationsCount} Optimizations
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'var(--bg-primary)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {report.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
