'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  tags: string[];
}

interface ProjectStats {
  totalEvaluations: number;
  averageScore: number;
  latestScore: number;
  scoreImprovement: number;
  versions: number;
}

export default function ProjectSidebar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<Map<string, ProjectStats>>(new Map());
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
        setCurrentProject(data.current);
        
        // Load stats for each project
        for (const project of data.projects) {
          loadProjectStats(project.id);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadProjectStats = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(prev => new Map(prev).set(projectId, data.stats));
      }
    } catch (error) {
      console.error(`Failed to load stats for ${projectId}:`, error);
    }
  };

  const switchProject = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/switch`, {
        method: 'PUT',
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentProject(data.project);
        // Reload the page to refresh chat history
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to switch project:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('http://localhost:3002/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          tags: [],
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setShowNewProject(false);
        setNewProjectName('');
        setNewProjectDesc('');
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          fontWeight: '600',
          color: '#666'
        }}>
          📁 プロジェクト
        </h3>
        
        {currentProject && (
          <div style={{
            padding: '12px',
            background: '#e3f2fd',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              marginBottom: '4px'
            }}>
              {currentProject.name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#666',
              marginBottom: '8px'
            }}>
              {currentProject.description}
            </div>
            {stats.get(currentProject.id) && (
              <div style={{ fontSize: '11px', color: '#777' }}>
                📊 評価: {stats.get(currentProject.id)!.totalEvaluations}件 | 
                平均: {stats.get(currentProject.id)!.averageScore}点 |
                v{currentProject.version}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        {projects.map(project => {
          const projectStats = stats.get(project.id);
          const isCurrent = currentProject?.id === project.id;
          
          return (
            <div
              key={project.id}
              onClick={() => !isCurrent && switchProject(project.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                background: isCurrent ? '#e8f5e9' : '#fff',
                border: `1px solid ${isCurrent ? '#4caf50' : '#e0e0e0'}`,
                borderRadius: '6px',
                cursor: isCurrent ? 'default' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.borderColor = '#2196f3';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }
              }}
            >
              <div style={{ 
                fontSize: '14px', 
                fontWeight: isCurrent ? 'bold' : 'normal',
                marginBottom: '4px'
              }}>
                {isCurrent && '✓ '}{project.name}
              </div>
              {projectStats && (
                <div style={{ fontSize: '11px', color: '#777' }}>
                  {projectStats.totalEvaluations}件 | 
                  平均{projectStats.averageScore}点
                  {projectStats.scoreImprovement !== 0 && (
                    <span style={{ 
                      color: projectStats.scoreImprovement > 0 ? '#4caf50' : '#f44336',
                      marginLeft: '4px'
                    }}>
                      {projectStats.scoreImprovement > 0 ? '+' : ''}
                      {projectStats.scoreImprovement}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showNewProject ? (
        <button
          onClick={() => setShowNewProject(true)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          + 新規プロジェクト
        </button>
      ) : (
        <div style={{ 
          padding: '12px', 
          background: 'white',
          borderRadius: '6px',
          border: '1px solid #e0e0e0'
        }}>
          <input
            type="text"
            placeholder="プロジェクト名"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <textarea
            placeholder="説明（任意）"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              resize: 'vertical',
              minHeight: '60px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={createProject}
              style={{
                flex: 1,
                padding: '8px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              作成
            </button>
            <button
              onClick={() => {
                setShowNewProject(false);
                setNewProjectName('');
                setNewProjectDesc('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

