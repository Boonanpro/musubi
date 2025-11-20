'use client';

import ProjectDevelopmentPage from '@/components/ProjectDevelopmentPage';

export default function Home() {
  return (
    <div>
      {/* Header */}
      <header style={{
        height: '60px',
        background: '#1976d2',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            🌟 Musubi
          </h1>
          <p style={{ fontSize: '11px', opacity: 0.9 }}>
            産霊（むすひ）- Zero Person Company OS
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px'
        }}>
          <span>●</span>
          <span>接続中</span>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ height: 'calc(100vh - 60px)' }}>
        <ProjectDevelopmentPage />
      </div>
    </div>
  );
}
