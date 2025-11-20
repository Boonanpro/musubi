'use client';

import { useState } from 'react';

interface SplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export default function SplitView({ leftPanel, rightPanel }: SplitViewProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'left' | 'right'>('none');

  const handleLeftClick = () => {
    if (activePanel !== 'left') {
      setActivePanel('left');
    }
  };

  const handleRightClick = () => {
    if (activePanel !== 'right') {
      setActivePanel('right');
    }
  };

  const handleMouseEnterLeft = () => {
    if (activePanel === 'right') {
      setActivePanel('left');
    }
  };

  const handleMouseEnterRight = () => {
    if (activePanel === 'left') {
      setActivePanel('right');
    }
  };

  const getLeftWidth = () => {
    if (activePanel === 'none') return '50%';
    if (activePanel === 'left') return '95%';
    return '5%';
  };

  const getRightWidth = () => {
    if (activePanel === 'none') return '50%';
    if (activePanel === 'right') return '95%';
    return '5%';
  };

  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Left Panel */}
      <div
        onClick={handleLeftClick}
        onMouseEnter={handleMouseEnterLeft}
        style={{
          width: getLeftWidth(),
          height: '100%',
          transition: 'width 0.3s ease-in-out',
          overflow: activePanel === 'left' || activePanel === 'none' ? 'auto' : 'hidden',
          cursor: activePanel === 'right' ? 'pointer' : 'default',
          borderRight: '2px solid #e0e0e0'
        }}
      >
        {leftPanel}
      </div>

      {/* Right Panel */}
      <div
        onClick={handleRightClick}
        onMouseEnter={handleMouseEnterRight}
        style={{
          width: getRightWidth(),
          height: '100%',
          transition: 'width 0.3s ease-in-out',
          overflow: activePanel === 'right' || activePanel === 'none' ? 'auto' : 'hidden',
          cursor: activePanel === 'left' ? 'pointer' : 'default'
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
}

