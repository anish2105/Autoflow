import React, { useState } from 'react';
import {
  Globe,
  FileCode,
  Calculator,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Layers,
  ChevronRight,
  Search,
  Check,
  Cpu,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Terminal,
  Activity,
  Workflow,
  Download,
  Sliders,
  Database,
  ArrowUpRight,
  Eye,
  Play,
  RotateCw,
  ExternalLink,
  ShieldAlert,
  Bot,
  Brain,
  Crown,
  Shield,
  XCircle,
  UserCheck,
  Users,
  Lock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  PleasantIllustration,
  JackIllustration,
  KingIllustration,
  AceIllustration
} from './TierIllustrations';

interface LandingPageProps {
  onStartAsGuest: (initialPrompt?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartAsGuest }) => {
  const { signInWithGoogle, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'research' | 'vision' | 'graph' | 'vault'>('research');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const samplePrompts = [
    {
      title: 'Cloud Infrastructure Comparison & PDF Export',
      query: 'Compare AWS Bedrock and Azure OpenAI pricing, scrape latest models from documentation, and export as an executive PDF report.',
      tag: 'Multi-Tool & Export',
      badgeColor: '#0284C7',
      badgeBg: '#F0F7FF',
    },
    {
      title: 'Firecrawl Web Scrape & Architecture Analysis',
      query: 'Scrape https://firecrawl.dev/docs and analyze its supported scraping formats, parsers, and API endpoints.',
      tag: 'Web Scrape (Firecrawl)',
      badgeColor: '#D946EF',
      badgeBg: '#FDF4FF',
    },
    {
      title: 'Financial Compound Growth & Math Evaluation',
      query: 'Calculate compound annual growth rate of $150,000 growing to $425,000 over 4.5 years with 5.5% annual inflation. Provide LaTeX formula steps.',
      tag: 'Deterministic Math',
      badgeColor: '#7E22CE',
      badgeBg: '#FAF5FF',
    },
    {
      title: 'Global Timezone Coordination',
      query: 'What is the exact current date, time, and UTC offset in Tokyo, New York, London, and Sydney?',
      tag: 'Temporal Engine',
      badgeColor: '#15803D',
      badgeBg: '#F0FDF4',
    },
  ];

  const handleLaunchWithPrompt = (query: string) => {
    onStartAsGuest(query);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="landing-page-root"
      style={{
        minHeight: '100vh',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        background: 'var(--color-canvas)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Decorative Ambient Radial Mesh Glows */}
      <div className="landing-hero-glow" />
      <div style={{
        position: 'absolute',
        top: '600px',
        right: '-100px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(91, 114, 238, 0.06) 0%, transparent 65%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        top: '1400px',
        left: '-150px',
        width: '700px',
        height: '700px',
        background: 'radial-gradient(circle, rgba(217, 70, 239, 0.05) 0%, transparent 65%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Top Navbar */}
      <nav style={{
        height: '68px',
        padding: '0 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(251, 249, 245, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0D3273 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 10px rgba(13, 50, 115, 0.25)',
          }}>
            <Sparkles size={18} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.45rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              AutoFlow
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '9999px',
              background: 'rgba(13, 50, 115, 0.08)',
              color: '#0D3273',
              letterSpacing: '0.04em',
            }}>
              v1.2
            </span>
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden-mobile">
          <a
            href="#showcase"
            onClick={e => scrollToSection(e, 'showcase')}
            style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Interactive Preview
          </a>
          <a
            href="#tools"
            onClick={e => scrollToSection(e, 'tools')}
            style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Tool Engines
          </a>
          <a
            href="#architecture"
            onClick={e => scrollToSection(e, 'architecture')}
            style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            LangGraph Flow
          </a>
          <a
            href="#prompts"
            onClick={e => scrollToSection(e, 'prompts')}
            style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Sample Queries
          </a>
          <a
            href="#tiers"
            onClick={e => scrollToSection(e, 'tiers')}
            style={{ fontSize: '0.86rem', fontWeight: 600, color: '#0D3273', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2563EB'}
            onMouseLeave={e => e.currentTarget.style.color = '#0D3273'}
          >
            Tiers & Access
          </a>
          <a
            href="#comparison"
            onClick={e => scrollToSection(e, 'comparison')}
            style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s ease', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            Comparison Matrix
          </a>
        </div>


        {/* Status Chip & Auth / Launch CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Engine Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '5px 12px',
            borderRadius: '9999px',
            background: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid rgba(5, 150, 105, 0.2)',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#059669',
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#059669',
              boxShadow: '0 0 8px rgba(5, 150, 105, 0.8)',
              animation: 'landingPulseGlow 2s infinite',
            }} />
            <span>Gemini 2.5 Flash</span>
          </div>

          <button
            onClick={() => onStartAsGuest()}
            style={{
              background: 'var(--color-surface-white)',
              border: '1.5px solid var(--border-strong)',
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#0D3273';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Guest Demo
          </button>

          <button
            onClick={user ? () => onStartAsGuest() : signInWithGoogle}
            className="pill-button-primary"
            style={{
              padding: '8px 20px',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(13, 50, 115, 0.25)',
            }}
          >
            {user ? (
              <>
                <Bot size={15} />
                <span>Open Workspace</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 24px 90px 24px', zIndex: 10 }}>

        {/* HERO SECTION */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '980px', textAlign: 'center', position: 'relative' }}>
          
          {/* Hero Top Pill Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            borderRadius: '9999px',
            background: 'rgba(13, 50, 115, 0.07)',
            border: '1px solid rgba(13, 50, 115, 0.16)',
            color: '#0D3273',
            fontSize: '0.76rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: '26px',
            boxShadow: '0 2px 8px rgba(13, 50, 115, 0.04)',
          }}>
            <Sparkles size={14} color="#0D3273" />
            <span>AUTONOMOUS MULTI-AGENT REASONING • ZERO TOKEN BLOAT</span>
          </div>

          {/* Hero Headline */}
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.5rem, 5.8vw, 4.2rem)',
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
            marginBottom: '20px',
            maxWidth: '920px',
          }}>
            Think Deeper. Research Faster.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #0D3273 0%, #2563EB 55%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}>
              Verify Everything.
            </span>
          </h1>

          {/* Hero Description */}
          <p style={{
            fontSize: '1.14rem',
            lineHeight: 1.68,
            color: 'var(--text-secondary)',
            maxWidth: '740px',
            marginBottom: '38px',
          }}>
            AutoFlow coordinates live parallel web searches, Firecrawl DOM scraping, exact mathematical computation, and automated completeness verification. Equipped with a perpetual 10-turn rolling memory that eliminates context limits and hallucinations.
          </p>

          {/* Hero Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '46px' }}>
            <button
              onClick={user ? () => onStartAsGuest() : signInWithGoogle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #0D3273 0%, #174291 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.98rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(13, 50, 115, 0.28)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(13, 50, 115, 0.38)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(13, 50, 115, 0.28)';
              }}
            >
              <Zap size={18} fill="#FFFFFF" />
              <span>{user ? 'Open Workspace' : 'Launch Workspace with Google'}</span>
              <ArrowRight size={17} />
            </button>

            <button
              onClick={() => onStartAsGuest()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 26px',
                borderRadius: '9999px',
                background: 'var(--color-surface-white)',
                border: '1.5px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0D3273';
                e.currentTarget.style.background = 'var(--color-surface-subtle)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.background = 'var(--color-surface-white)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Explore Guest Demo</span>
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Quick Engine Trust Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            padding: '12px 24px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#059669" />
              <span><strong>8 Parallel Tools</strong> Built-In</span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#059669" />
              <span><strong>LangGraph</strong> Stateful Pipeline</span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#059669" />
              <span><strong>Firecrawl</strong> Live DOM Scraper</span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#059669" />
              <span><strong>10-Turn</strong> Rolling Memory</span>
            </div>
          </div>
        </section>

        {/* SECTION: INTERACTIVE WORKSPACE SHOWCASE (WOW FACTOR) */}
        <section id="showcase" style={{
          width: '100%',
          maxWidth: '1160px',
          marginTop: '70px',
          marginBottom: '80px',
        }}>
          {/* Showcase Heading */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#0D3273',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}>
              LIVE WORKSPACE SIMULATION
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Autonomous Execution at a Glance
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '6px auto 0 auto' }}>
              Toggle between real-time capabilities to experience how AutoFlow solves complex multi-step user tasks.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            {[
              { id: 'research', label: 'Parallel Research & Synthesis', icon: Globe },
              { id: 'vision', label: 'Multimodal Vision & OCR', icon: ImageIcon },
              { id: 'graph', label: 'LangGraph Live Trace', icon: Workflow },
              { id: 'vault', label: 'Digitized Vault & Tools', icon: Database },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    background: isActive ? '#0D3273' : 'var(--color-surface-white)',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    border: `1.5px solid ${isActive ? '#0D3273' : 'var(--border-subtle)'}`,
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 4px 14px rgba(13, 50, 115, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={15} color={isActive ? '#FFFFFF' : 'currentColor'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Showcase Window Chrome Frame */}
          <div className="landing-glass-card" style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px -10px rgba(13, 50, 115, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04)',
          }}>
            {/* Top Chrome Window Bar */}
            <div style={{
              background: '#F8FAFC',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#EF4444' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#F59E0B' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', marginLeft: '12px', fontFamily: 'var(--font-mono)' }}>
                  autoflow-workspace://session-72db1706
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#DCFCE7', color: '#15803D' }}>
                  VALIDATOR: 100% SUFFICIENT
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#1E40AF' }}>
                  LATENCY: 482ms
                </span>
              </div>
            </div>

            {/* Tab 1 Content: Parallel Research & Synthesis */}
            {activeTab === 'research' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '440px' }} className="showcase-grid">
                {/* Left: User Prompt & Parallel Tool Traces */}
                <div style={{
                  padding: '24px',
                  borderRight: '1px solid var(--border-subtle)',
                  background: 'var(--color-canvas)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  {/* User Message Bubble */}
                  <div style={{
                    alignSelf: 'flex-end',
                    maxWidth: '92%',
                    background: '#0D3273',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: '16px 16px 2px 16px',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                  }}>
                    Analyze AWS Bedrock vs Azure OpenAI Q3 cloud infrastructure margins. Scrape Firecrawl docs for benchmark parameters, evaluate the growth rate, and export an executive PDF report.
                  </div>

                  {/* Parallel Execution Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <Activity size={15} color="#0D3273" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0D3273', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Parallel Tool Node Dispatched (4 Tools Concurrently)
                    </span>
                  </div>

                  {/* Parallel Tool Chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-white)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={15} color="#0284C7" />
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>web_search("AWS vs Azure Q3 AI cloud gross margin")</code>
                      </div>
                      <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.74rem' }}>✓ 312ms</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-white)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCode size={15} color="#D946EF" />
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>web_scrape("https://firecrawl.dev/docs")</code>
                      </div>
                      <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.74rem' }}>✓ 418ms (Clean MD)</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-white)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calculator size={15} color="#7E22CE" />
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>calculate("((82.4 - 68.1) / 68.1) * 100")</code>
                      </div>
                      <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.74rem' }}>✓ +21.0% (11ms)</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: 'var(--color-surface-white)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} color="#EA580C" />
                        <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>export_chat_pdf("Cloud_AI_Margins_Report.pdf")</code>
                      </div>
                      <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.74rem' }}>✓ Base64 Ready</span>
                    </div>
                  </div>

                  {/* Validator Gate Status */}
                  <div style={{
                    marginTop: 'auto',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <ShieldCheck size={18} color="#15803D" />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803D' }}>
                        Completeness Gate Passed (Confidence: 99.4%)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#166534' }}>
                        All sub-questions addressed: margin metrics, Firecrawl API benchmarks, growth formula, and PDF generation.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Synthesized Executive Response Preview */}
                <div style={{
                  padding: '24px',
                  background: 'var(--color-surface-white)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#0D3273', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Bot size={14} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>AutoFlow Synthesizer</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569', fontFamily: 'var(--font-mono)' }}>
                      Iteration 1 • Direct Finish
                    </span>
                  </div>

                  {/* Synthesized Response Body */}
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '6px', color: '#0F172A' }}>
                      Executive Cloud AI Margin & Infrastructure Brief
                    </h3>
                    <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      Based on Q3 financial disclosures [1] and live Firecrawl technical parsing [2], here is the verified breakdown:
                    </p>

                    {/* Formatted Markdown Table */}
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', margin: '8px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                        <thead>
                          <tr style={{ background: '#F8FAFC', textAlign: 'left' }}>
                            <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>Platform</th>
                            <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>Q3 AI Margin</th>
                            <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>Primary Driver</th>
                            <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>AWS Bedrock</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)', color: '#059669', fontWeight: 600 }}>38.4%</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>Custom Inferentia chips</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>[1]</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 10px', fontWeight: 600 }}>Azure OpenAI</td>
                            <td style={{ padding: '6px 10px', color: '#059669', fontWeight: 600 }}>34.2%</td>
                            <td style={{ padding: '6px 10px' }}>Enterprise Copilot expansion</td>
                            <td style={{ padding: '6px 10px' }}>[2]</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <strong>Deterministic Growth:</strong> Calculated relative efficiency gain of <strong>+20.99%</strong> utilizing formula:
                      <code style={{ marginLeft: '6px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>((82.4 - 68.1) / 68.1) * 100</code>
                    </p>

                    {/* PDF Export Notification Card */}
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#FFF7ED',
                      border: '1px solid #FFEDD5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#EA580C" />
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9A3412' }}>
                          Cloud_AI_Margins_Report.pdf (Formatted 2 Pages)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C2410C', cursor: 'pointer' }}>
                        Download Base64 ↓
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Multimodal Vision & OCR */}
            {activeTab === 'vision' && (
              <div style={{ padding: '32px', background: 'var(--color-surface-white)', minHeight: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Multimodal Document Digitization & OCR Inspection
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Upload PNG, JPEG, or WEBP photos of receipts, invoices, architectural schematics, or whiteboard drawings for instant semantic extraction.
                    </p>
                  </div>
                  <span style={{ padding: '6px 14px', borderRadius: '9999px', background: '#FDF2F8', color: '#BE185D', fontSize: '0.76rem', fontWeight: 700 }}>
                    ENGINE: process_image (Gemini Vision)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
                  {/* Upload Mockup Card */}
                  <div style={{
                    border: '1.5px dashed #0D3273',
                    borderRadius: '16px',
                    padding: '20px',
                    background: 'rgba(13, 50, 115, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '10px',
                  }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={24} color="#4338CA" />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Q3_Balance_Sheet.png</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>640 KB • Extracted 34 line items</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <CheckCircle2 size={14} color="#059669" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>OCR Sanitized & Parsed</span>
                    </div>
                  </div>

                  {/* Digitized Table Result */}
                  <div style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '20px',
                    background: 'var(--color-canvas)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0D3273' }}>
                        Digitized Table Output & Auto-Formula Detection
                      </span>
                      <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        <FileSpreadsheet size={13} />
                        <span>Export as Excel (.xlsx)</span>
                      </button>
                    </div>

                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      background: 'var(--color-surface-white)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      lineHeight: 1.6,
                    }}>
                      <div style={{ color: '#64748B' }}># Revenue by Segment (Extracted via Gemini Multimodal OCR)</div>
                      <div style={{ color: '#0F172A', fontWeight: 600 }}>| Segment | Gross Revenue | YoY Change | Operating Margin |</div>
                      <div>| AI Cloud Platform | $4,240,000 | +38.2% | 42.1% |</div>
                      <div>| Enterprise SaaS | $7,110,000 | +14.6% | 31.8% |</div>
                      <div>| Consumer Subscriptions | $2,890,000 | +9.4% | 19.3% |</div>
                      <div style={{ color: '#059669', marginTop: '6px' }}>✓ All math reconciled with Deterministic Calculator node.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3 Content: LangGraph Live Node Graph */}
            {activeTab === 'graph' && (
              <div style={{ padding: '32px', background: 'var(--color-surface-white)', minHeight: '440px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Stateful LangGraph Workflow Machine
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Deterministic graph transitions between Agent reasoning, concurrent tool gathering, and strict quality validation.
                    </p>
                  </div>
                  <span style={{ padding: '6px 14px', borderRadius: '9999px', background: '#EEF2FF', color: '#4338CA', fontSize: '0.76rem', fontWeight: 700 }}>
                    STATE: CHECKPOINTED IN-MEMORY
                  </span>
                </div>

                {/* Node Pipeline Visualizer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '24px',
                  borderRadius: '16px',
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--border-subtle)',
                  overflowX: 'auto',
                }}>
                  {/* Step 1: START */}
                  <div style={{ textAlign: 'center', minWidth: '110px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#059669',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}>
                      START
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700 }}>Human Input</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>0ms</div>
                  </div>

                  <ArrowRight size={20} color="var(--border-strong)" />

                  {/* Step 2: Agent Node */}
                  <div style={{ textAlign: 'center', minWidth: '130px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#4F46E5',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                      boxShadow: '0 0 16px rgba(79, 70, 229, 0.4)',
                    }}>
                      <Brain size={20} />
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#4F46E5' }}>Agent (Decision)</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Tool Planning • 210ms</div>
                  </div>

                  <ArrowRight size={20} color="var(--border-strong)" />

                  {/* Step 3: Parallel Tools */}
                  <div style={{ textAlign: 'center', minWidth: '140px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#D946EF',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                    }}>
                      <Layers size={20} />
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#D946EF' }}>parallel_tools</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Async Gather (6x) • 320ms</div>
                  </div>

                  <ArrowRight size={20} color="var(--border-strong)" />

                  {/* Step 4: Validator Gate */}
                  <div style={{ textAlign: 'center', minWidth: '130px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#D97706',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                    }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#D97706' }}>Validator Gate</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Confidence Check • 98ms</div>
                  </div>

                  <ArrowRight size={20} color="var(--border-strong)" />

                  {/* Step 5: END */}
                  <div style={{ textAlign: 'center', minWidth: '110px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#0891B2',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}>
                      END
                    </div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700 }}>Stream Output</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Completed</div>
                  </div>
                </div>

                {/* Observability Details */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Terminal size={16} color="#0D3273" />
                    <span><strong>Real-Time Trace:</strong> Every node logs latency, input arguments, and output structures for full debugging visibility.</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#0D3273', cursor: 'pointer' }} onClick={() => onStartAsGuest()}>
                    Inspect Live Graph →
                  </span>
                </div>
              </div>
            )}

            {/* Tab 4 Content: Digitized Vault & Dynamic Tools */}
            {activeTab === 'vault' && (
              <div style={{ padding: '32px', background: 'var(--color-surface-white)', minHeight: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Zero-Local-Bloat Digitized Documents & Tool Control
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      All files are stored as Base64 encodings in the database table and converted back into downloads on user demand.
                    </p>
                  </div>
                  <span style={{ padding: '6px 14px', borderRadius: '9999px', background: '#ECFDF5', color: '#047857', fontSize: '0.76rem', fontWeight: 700 }}>
                    LOCAL STORAGE: 0 BYTES
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px' }}>
                  {/* Documents Vault Table Mockup */}
                  <div style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '0.82rem' }}>
                      Digitized Document Vault
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--color-canvas)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>Filename</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>Digitized?</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>Q3_Earnings_Report.pdf</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', color: '#059669', fontWeight: 700 }}>Yes (OCR'd)</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: '#0D3273', fontWeight: 600, cursor: 'pointer' }}>Download ↓</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 12px' }}>AI_Infrastructure_Models.xlsx</td>
                          <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 700 }}>Yes (Tables)</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: '#0D3273', fontWeight: 600, cursor: 'pointer' }}>Download ↓</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Dynamic Tool Toggle Sliders */}
                  <div style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    padding: '16px',
                    background: 'var(--color-canvas)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0D3273' }}>
                      Dynamic Tool Permissions
                    </div>
                    {[
                      { name: 'Live Web Search', status: true },
                      { name: 'Firecrawl Scraper', status: true },
                      { name: 'Deterministic Math', status: true },
                      { name: 'PDF & Excel Exporters', status: true },
                    ].map((tool, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        padding: '6px 10px',
                        background: 'var(--color-surface-white)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        <span style={{ fontWeight: 600 }}>{tool.name}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}>
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* METRICS / BENCHMARK BAR */}
        <section style={{
          width: '100%',
          maxWidth: '1160px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '80px',
        }}>
          {[
            {
              stat: '0 ms',
              title: 'Thread Cold-Start',
              desc: 'Instant state recall with MemorySaver checkpointer.',
              color: '#0D3273',
            },
            {
              stat: '6x',
              title: 'Parallel Tool Concurrency',
              desc: 'Non-blocking simultaneous tool execution with asyncio.gather.',
              color: '#4F46E5',
            },
            {
              stat: '10-Turn',
              title: 'Rolling Memory Window',
              desc: 'Perpetual sliding window summarization without token bloat.',
              color: '#059669',
            },
            {
              stat: '100%',
              title: 'Evidence Validation Gate',
              desc: 'Strict completeness checking eliminates hallucinations.',
              color: '#D97706',
            },
          ].map((card, idx) => (
            <div key={idx} className="landing-glass-card" style={{ padding: '28px 24px' }}>
              <div style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.4rem',
                fontWeight: 700,
                color: card.color,
                lineHeight: 1,
                marginBottom: '8px',
              }}>
                {card.stat}
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {card.desc}
              </div>
            </div>
          ))}
        </section>

        {/* SECTION: 8 PRODUCTION TOOL ENGINES */}
        <section id="tools" style={{
          width: '100%',
          maxWidth: '1160px',
          marginBottom: '90px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#0D3273',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}>
              INTEGRATED CAPABILITY SUITE
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Eight Specialized Autonomous Engines
            </h2>
            <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '8px auto 0 auto' }}>
              AutoFlow dynamically binds tools to Google Gemini based on the requirements of your query.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '22px',
          }}>
            {/* Tool 1: Web Search */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#F0F7FF',
                  border: '1px solid #BAE6FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Globe size={22} color="#0284C7" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#F0F7FF', color: '#0284C7', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  web_search
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Live Web Search
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Scans verified web sources, real-time news, documentation, and returns structured findings with bracket citation links.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>Powered by Tavily API</span>
              </div>
            </div>

            {/* Tool 2: Web Scrape (Firecrawl) */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FDF4FF',
                  border: '1px solid #F5D0FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileCode size={22} color="#C026D3" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#FDF4FF', color: '#C026D3', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  web_scrape
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Firecrawl DOM Scraper
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Extracts clean Markdown content and text directly from any web URL or online PDF link, ignoring ads and boilerplate.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>Powered by Firecrawl Engine</span>
              </div>
            </div>

            {/* Tool 3: Math Engine */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Calculator size={22} color="#7E22CE" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#FAF5FF', color: '#7E22CE', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  calculate
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Deterministic Math Engine
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Computes exact financial formulas, compound annual growth, percentages, and algebraic evaluations without approximation.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>Exact SymPy / AST Evaluation</span>
              </div>
            </div>

            {/* Tool 4: Vision Analysis */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ImageIcon size={22} color="#4338CA" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#EEF2FF', color: '#4338CA', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  process_image
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Multimodal Vision & OCR
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Inspects user-uploaded photos, balance sheets, diagrams, and invoices to extract dense text tables and visual insights.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>Gemini Multimodal Native</span>
              </div>
            </div>

            {/* Tool 5: Time & Timezone */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Clock size={22} color="#15803D" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#F0FDF4', color: '#15803D', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  get_current_time
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Temporal Clock & Dates
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Resolves current local and international timestamps, ISO dates, day-of-week, and timezone offsets to prevent stale queries.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>Global IANA Clock Resolution</span>
              </div>
            </div>

            {/* Tool 6: PDF Exporter */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileText size={22} color="#EA580C" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#FFF7ED', color: '#EA580C', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  export_chat_pdf
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Executive PDF Generator
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Generates styled PDF briefs with justified typography, numbered citations, and clean tables for formal distribution.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>ReportLab PDF Canvas</span>
              </div>
            </div>

            {/* Tool 7: Excel Exporter */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileSpreadsheet size={22} color="#16A34A" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#F0FDF4', color: '#16A34A', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  export_chat_excel
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Excel Spreadsheet Engine
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Transforms research comparisons into formatted `.xlsx` workbooks with bold center headers and alternating row shading.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>OpenPyXL Spreadsheet Generator</span>
              </div>
            </div>

            {/* Tool 8: Text Exporter */}
            <div className="landing-tool-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Terminal size={22} color="#475569" />
                </div>
                <code style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#F8FAFC', color: '#475569', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  export_chat_txt
                </code>
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Plain Text Transcripts
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  Produces lightweight, clean text transcripts of complete conversation histories for terminal pipes and documentation archives.
                </p>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                <span>UTF-8 Formatted Transcripts</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: ARCHITECTURE WORKFLOW */}
        <section id="architecture" style={{
          width: '100%',
          maxWidth: '1160px',
          background: 'var(--color-surface-white)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '48px 36px',
          marginBottom: '80px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#0D3273',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}>
              DETERMINISTIC REASONING FLOW
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              How AutoFlow Reasons & Validates
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '6px auto 0 auto' }}>
              Unlike naive chatbots that hallucinate when queried on complex tasks, AutoFlow enforces an automated quality gate.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#0D3273',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}>
                01
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Intent & Tool Planning
              </h4>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                The Decision Maker node analyzes your prompt. If multiple sub-questions or computations are identified, it dispatches focused tool calls simultaneously.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#D946EF',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}>
                02
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Concurrent Execution
              </h4>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Up to 6 tools are executed in parallel via <code style={{ fontFamily: 'var(--font-mono)' }}>asyncio.gather</code>, fetching web citations and computing values in hundreds of milliseconds.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#D97706',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}>
                03
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Completeness Gate
              </h4>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                A dedicated validator evaluates whether every sub-question was answered. If any part was missed, the workflow re-enters the agent for exhaustive completion.
              </p>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}>
                04
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                10-Turn Rolling Memory
              </h4>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Keeps 10 conversations active in history. On the 11th turn, turns 1–5 are synthesized into a persistent summary, retaining turns 6–10 clean forever.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: TRY SAMPLE PROMPTS PLAYGROUND */}
        <section id="prompts" style={{
          width: '100%',
          maxWidth: '1160px',
          marginBottom: '80px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#0D3273',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px',
            }}>
              ONE-CLICK EXPLORATION
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Try AutoFlow with Real Scenarios
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '6px auto 0 auto' }}>
              Click any query below to launch directly into the workspace with that task executed.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
          }}>
            {samplePrompts.map((p, idx) => (
              <div
                key={idx}
                className="landing-glass-card"
                onClick={() => handleLaunchWithPrompt(p.query)}
                style={{
                  padding: '22px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    background: p.badgeBg,
                    color: p.badgeColor,
                  }}>
                    {p.tag}
                  </span>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-surface-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ArrowUpRight size={15} color="#0D3273" />
                  </div>
                </div>

                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {p.title}
                </h4>

                <p style={{
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  "{p.query}"
                </p>

                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#0D3273',
                }}>
                  <Play size={13} fill="#0D3273" />
                  <span>Execute in Workspace</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION: USER ROLES & TIER-BASED ACCESS CONTROL */}
        {/* ============================================================== */}
        <section id="tiers" style={{
          width: '100%',
          maxWidth: '1200px',
          padding: '60px 0 30px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '36px',
        }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '9999px',
              background: 'rgba(13, 50, 115, 0.08)',
              color: '#0D3273',
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '14px',
            }}>
              <ShieldCheck size={14} color="#0D3273" />
              <span>TIER-BASED ACCESS CONTROL & QUOTAS</span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '14px',
            }}>
              Select the Tier Built for Your Research Needs
            </h2>
            <p style={{
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
            }}>
              AutoFlow enforces rigorous backend role-based access control. From instant guest demos to enterprise administration, each tier provides dedicated document, vision, and tool allocations.
            </p>
          </div>

          {/* Four Tier Cards Grid with Artwork Pictures Above */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}>
            {/* TIER 1: PLEASANT (GUEST / DEMO) */}
            <div style={{
              background: 'var(--color-surface-white)',
              borderRadius: '18px',
              border: '1.5px solid var(--border-subtle)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(5, 150, 105, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(5, 150, 105, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}>
              {/* Picture / Artwork Header */}
              <PleasantIllustration />

              <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#ECFDF5',
                    color: '#047857',
                  }}>
                    Tier 1 • Guest
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                    No Login
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Pleasant
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                  Ideal for first-time visitors seeking to test AutoFlow's reasoning and speed without creating an account.
                </p>

                {/* Quotas & Features */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle)',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chat messages:</span>
                    <strong style={{ color: '#047857' }}>5 total inputs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Document upload:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>1 document</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Image vision:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>1 image</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Available tools:</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Restricted (Basic)</span>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.82rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#059669" />
                    <span>Instant demo with zero sign-up</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#059669" />
                    <span>Calculator & date-time tools</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)' }}>
                    <AlertCircle size={15} color="#9CA3AF" />
                    <span>Register to unlock extended quotas</span>
                  </li>
                </ul>

                <button
                  onClick={() => onStartAsGuest()}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#047857',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#065F46'}
                  onMouseLeave={e => e.currentTarget.style.background = '#047857'}
                >
                  <span>Launch Pleasant Demo</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* TIER 2: JACK (REGISTERED USER) */}
            <div style={{
              background: 'var(--color-surface-white)',
              borderRadius: '18px',
              border: '2px solid #2563EB',
              boxShadow: '0 8px 28px rgba(37, 99, 235, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 36px rgba(37, 99, 235, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 28px rgba(37, 99, 235, 0.12)';
            }}>
              {/* Popular / Standard Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#2563EB',
                color: '#FFFFFF',
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                padding: '3px 8px',
                borderRadius: '6px',
                zIndex: 10,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              }}>
                MOST POPULAR
              </div>

              {/* Picture / Artwork Header */}
              <JackIllustration />

              <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                  }}>
                    Tier 2 • Registered
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563EB' }}>
                    Free Account
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Jack
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                  For individual researchers wanting document RAG, live web search, and persistent session history.
                </p>

                {/* Quotas & Features */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle)',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chat messages:</span>
                    <strong style={{ color: '#1D4ED8' }}>25 total inputs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Document upload:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>3 documents</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Image vision:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>5 images</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Available tools:</span>
                    <span style={{ color: '#1D4ED8', fontWeight: 600 }}>Standard Suite</span>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.82rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#2563EB" />
                    <span>Real-time Web Search (Tavily)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#2563EB" />
                    <span>Multi-document RAG context</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#2563EB" />
                    <span>Live remaining quota monitoring</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#2563EB" />
                    <span>Request upgrade to King anytime</span>
                  </li>
                </ul>

                <button
                  onClick={user ? () => onStartAsGuest() : signInWithGoogle}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                  onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
                >
                  <Zap size={15} fill="#FFFFFF" />
                  <span>{user ? 'Enter Workspace' : 'Sign in as Jack'}</span>
                </button>
              </div>
            </div>

            {/* TIER 3: KING (PREMIUM) */}
            <div style={{
              background: 'var(--color-surface-white)',
              borderRadius: '18px',
              border: '1.5px solid rgba(124, 58, 237, 0.35)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.35)';
            }}>
              {/* Picture / Artwork Header */}
              <KingIllustration />

              <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#FAF5FF',
                    color: '#7C3AED',
                  }}>
                    Tier 3 • Premium
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706' }}>
                    Extended Quotas
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  King
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                  Unrestricted research capacity for power users demanding complete tool access and heavy document processing.
                </p>

                {/* Quotas & Features */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle)',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chat messages:</span>
                    <strong style={{ color: '#7C3AED' }}>Unlimited Messages</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Document upload:</span>
                    <strong style={{ color: '#7C3AED' }}>15 documents</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Image vision:</span>
                    <strong style={{ color: '#7C3AED' }}>Unlimited images</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Available tools:</span>
                    <span style={{ color: '#7C3AED', fontWeight: 700 }}>All Tools Enabled</span>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.82rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Firecrawl deep URL markdown scraping</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>Full Excel, PDF & TXT export generators</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#7C3AED" />
                    <span>15 indexed documents with dense vectors</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={15} color="#7C3AED" />
                    <span>Request upgrade from Ace owner</span>
                  </li>
                </ul>

                <button
                  onClick={user ? () => onStartAsGuest() : signInWithGoogle}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#6D28D9',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#5B21B6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#6D28D9'}
                >
                  <Crown size={15} color="#FDE047" />
                  <span>{user ? 'Request King Upgrade' : 'Sign in to Request'}</span>
                </button>
              </div>
            </div>

            {/* TIER 4: ACE (OWNER / SUPER ADMIN) */}
            <div style={{
              background: 'var(--color-surface-white)',
              borderRadius: '18px',
              border: '1.5px solid rgba(13, 50, 115, 0.4)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(13, 50, 115, 0.2)';
              e.currentTarget.style.borderColor = '#0D3273';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(13, 50, 115, 0.4)';
            }}>
              {/* Picture / Artwork Header */}
              <AceIllustration />

              <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(13, 50, 115, 0.1)',
                    color: '#0D3273',
                  }}>
                    Tier 4 • Super Admin
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0D3273' }}>
                    Owner Tier
                  </span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Ace
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '18px' }}>
                  Reserved exclusively for the application owners with complete governance and real-time user management.
                </p>

                {/* Quotas & Features */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--color-surface-subtle)',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Chat messages:</span>
                    <strong style={{ color: '#0D3273' }}>Unlimited Messages</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Document upload:</span>
                    <strong style={{ color: '#0D3273' }}>Unlimited Documents</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Image vision:</span>
                    <strong style={{ color: '#0D3273' }}>Unlimited Images</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Admin Dashboard:</span>
                    <strong style={{ color: '#0D3273' }}>Full Super Admin</strong>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0', display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '0.82rem' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={15} color="#0D3273" />
                    <span>View all registered users & search by email</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={15} color="#0D3273" />
                    <span>Upgrade / downgrade any user across tiers</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={15} color="#0D3273" />
                    <span>Manually increase limits & quota overrides</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={15} color="#0D3273" />
                    <span>Review & approve pending upgrade requests</span>
                  </li>
                </ul>

                <button
                  onClick={signInWithGoogle}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    background: '#0D3273',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#092350'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0D3273'}
                >
                  <ShieldCheck size={16} />
                  <span>Owner Authentication</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* SECTION: TIER COMPARISON MATRIX */}
        {/* ============================================================== */}
        <section id="comparison" style={{
          width: '100%',
          maxWidth: '1200px',
          padding: '40px 0 60px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(1.8rem, 3vw, 2.3rem)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: '10px',
            }}>
              Side-by-Side Tier Comparison
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Evaluate granular feature boundaries, quotas, and administrative capabilities across all four tiers.
            </p>
          </div>

          {/* Matrix Table */}
          <div style={{
            background: 'var(--color-surface-white)',
            borderRadius: '18px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
            overflowX: 'auto',
          }}>
            <table style={{
              width: '100%',
              minWidth: '760px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-subtle)', borderBottom: '2px solid var(--border-subtle)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)', width: '28%' }}>
                    Capability & Limits
                  </th>
                  <th style={{ padding: '16px 14px', fontWeight: 700, color: '#047857', textAlign: 'center', width: '18%' }}>
                    <div>Pleasant</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>Guest / Demo</span>
                  </th>
                  <th style={{ padding: '16px 14px', fontWeight: 700, color: '#2563EB', textAlign: 'center', width: '18%' }}>
                    <div>Jack</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>Registered User</span>
                  </th>
                  <th style={{ padding: '16px 14px', fontWeight: 700, color: '#7C3AED', textAlign: 'center', width: '18%' }}>
                    <div>King</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>Premium</span>
                  </th>
                  <th style={{ padding: '16px 14px', fontWeight: 700, color: '#0D3273', textAlign: 'center', width: '18%' }}>
                    <div>Ace</div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-tertiary)' }}>Super Admin</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Authentication
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: '#047857', fontWeight: 600 }}>
                    No Login Required
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Google Sign-In
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Google Sign-In
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: '#0D3273', fontWeight: 700 }}>
                    Owner Whitelist
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Chat Message Limit
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#DC2626' }}>
                    5 total inputs
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#2563EB' }}>
                    25 total inputs
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                    Unlimited
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                    Unlimited
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Document Uploads (RAG)
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    1 document
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    3 documents
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>
                    15 documents
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#0D3273' }}>
                    Unlimited
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Multimodal Vision Analysis
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    1 image
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    5 images
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                    Unlimited
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                    Unlimited
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Basic Tools (Math, Timezones)
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Live Web Search & Document Context
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#2563EB" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Deep Web Scrape (Firecrawl) & Exports
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#7C3AED" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" style={{ margin: '0 auto' }} />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.01)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Dedicated Ace Admin Dashboard
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <CheckCircle2 size={16} color="#0D3273" style={{ margin: '0 auto' }} />
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    User Quota Modifiers & Tier Controls
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center' }}>
                    <XCircle size={16} color="#9CA3AF" style={{ margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#0D3273' }}>
                    Full Super Admin
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Upgrade Mechanism
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <button
                      onClick={signInWithGoogle}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#047857',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Register Free
                    </button>
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <button
                      onClick={user ? () => onStartAsGuest() : signInWithGoogle}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Request King
                    </button>
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <button
                      onClick={user ? () => onStartAsGuest() : signInWithGoogle}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#6D28D9',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Request Ace
                    </button>
                  </td>
                  <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                    <button
                      onClick={signInWithGoogle}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#0D3273',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Owner Sign-in
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* BOTTOM CALL-TO-ACTION BANNER */}
        <section style={{
          width: '100%',
          maxWidth: '1160px',
          background: 'linear-gradient(135deg, #0D3273 0%, #153D86 60%, #1E4D9C 100%)',
          borderRadius: '28px',
          padding: '56px 40px',
          color: '#FFFFFF',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(13, 50, 115, 0.25)',
          marginBottom: '40px',
        }}>
          {/* Ambient Glow Inside Banner */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '720px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.12)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '20px',
            }}>
              <Sparkles size={14} color="#60A5FA" />
              <span>READY FOR REAL-TIME AUTONOMOUS ASSISTANCE</span>
            </div>

            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '16px',
            }}>
              Step Into the Future of Verifiable Research
            </h2>

            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.85)',
              marginBottom: '36px',
            }}>
              Launch AutoFlow today. Experience seamless parallel tools, clean sliding-window memory, and guaranteed task completeness.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={user ? () => onStartAsGuest() : signInWithGoogle}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 34px',
                  borderRadius: '9999px',
                  background: '#FFFFFF',
                  color: '#0D3273',
                  border: 'none',
                  fontSize: '0.98rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Zap size={17} color="#0D3273" fill="#0D3273" />
                <span>{user ? 'Open Workspace' : 'Sign in with Google'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => onStartAsGuest()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 26px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Launch Live Guest Demo</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{
        padding: '30px 40px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(251, 249, 245, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: '16px',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#0D3273',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}>
            <Sparkles size={12} />
          </div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>AutoFlow Intelligence</span>
          <span style={{ color: 'var(--text-tertiary)' }}>•</span>
          <span>© 2026 Autonomous Research Engine</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669' }} />
            <span style={{ color: '#059669', fontWeight: 600 }}>All Systems Operational</span>
          </div>
          <span style={{ color: 'var(--border-strong)' }}>|</span>
          <span>LangGraph + Google Gemini + Firecrawl</span>
        </div>
      </footer>
    </div>
  );
};
