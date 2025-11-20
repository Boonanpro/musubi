'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  version: string;
  componentName?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [evaluationScore, setEvaluationScore] = useState(75);
  const [evaluationComments, setEvaluationComments] = useState('');
  
  // プロジェクトごとのプレビューURLを管理
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      const componentName = selectedProject.componentName || selectedProject.name.replace(/\s+/g, '');
      const previewUrl = `http://localhost:3003/preview/${componentName}?t=${Date.now()}`;
      
      setPreviewUrls(prev => ({
        ...prev,
        [selectedProject.id]: previewUrl
      }));
    }
  }, [selectedProject]);

  // 現在選択中のプロジェクトのプレビューURL
  const currentPreviewUrl = selectedProject ? previewUrls[selectedProject.id] : '';

  const loadProjects = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
        if (data.current) {
          setSelectedProject(data.current);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;
    
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 削除したプロジェクトが選択中だった場合、選択解除
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
        
        // プロジェクト一覧を再読み込み
        await loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const [developmentProgress, setDevelopmentProgress] = useState<{
    currentStep: number;
    totalSteps: number;
    phase: string;
    status: string;
    thinkingLog?: string;
  } | null>(null);

  const createProject = async () => {
    if (!newProjectDesc.trim() || isCreating) return;

    setIsCreating(true);

    try {
      // Step 1: Create project immediately (instant response!)
      const tempProjectName = `Project_${Date.now()}`;
      const projectResponse = await fetch('http://localhost:3002/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tempProjectName,
          description: newProjectDesc,
          tags: ['developing'],
          componentName: tempProjectName,
        }),
      });

      const projectData = await projectResponse.json();

      if (!projectData.success) {
        throw new Error('Failed to create project');
      }

      // Immediately show the project
      setNewProjectDesc('');
      await loadProjects();
      
      if (projectData.project) {
        setSelectedProject(projectData.project);
      }

      setIsCreating(false);

      // Step 2: Start development in background with real-time updates
      setDevelopmentProgress({ 
        currentStep: 0, 
        totalSteps: 6, 
        phase: '🧠 要件を分析しています...', 
        status: 'planning' 
      });

      const response = await fetch('http://localhost:3002/api/development/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectData.project.id,
          description: newProjectDesc,
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue; // 空行をスキップ
              
              const data = JSON.parse(jsonStr);

              if (data.type === 'progress') {
              const { plan } = data;
              
              setDevelopmentProgress({
                currentStep: plan.currentStep + 1,
                totalSteps: plan.totalSteps,
                phase: plan.detailedPhase || plan.steps[plan.currentStep]?.phase || 'Processing...',
                status: plan.status,
                thinkingLog: plan.thinkingLog || '',
              });

              // Update project name and componentName if it changed
              if (plan.projectName && plan.projectName !== tempProjectName) {
                // Update project with real component name
                await fetch(`http://localhost:3002/api/projects/${projectData.project.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: plan.projectName,
                    componentName: plan.projectName,
                  }),
                });
                
                await loadProjects();
              }

              // 開発中はプレビュー更新しない（他のプロジェクトに影響を与えないため）
              // 開発完了時のみ更新する
            } else if (data.type === 'completed') {
              setDevelopmentProgress(null);
              
              // 開発完了 - プロジェクトをリロードしてプレビューを更新
              await loadProjects();
              
              // プレビューを強制更新
              const { plan } = data;
              const finalComponentName = plan.projectName || tempProjectName;
              const finalPreviewUrl = `http://localhost:3003/preview/${finalComponentName}?t=${Date.now()}`;
              
              setPreviewUrls(prev => ({
                ...prev,
                [projectData.project.id]: finalPreviewUrl
              }));
              
              // 開発完了したプロジェクトを選択状態にする
              const updatedProjects = await fetch('http://localhost:3002/api/projects').then(r => r.json());
              if (updatedProjects.success) {
                const completedProject = updatedProjects.projects.find((p: Project) => p.id === projectData.project.id);
                if (completedProject) {
                  setSelectedProject(completedProject);
                }
              }
              
            } else if (data.type === 'error') {
              setDevelopmentProgress(null);
              
              // エラーが出ても開発は継続されている
              // プロジェクトをリロードしてプレビューを更新
              await loadProjects();
              
              // プレビューを更新（エラーでもそれまでの成果物を表示）
              const componentName = data.plan?.projectName || tempProjectName;
              const errorPreviewUrl = `http://localhost:3003/preview/${componentName}?t=${Date.now()}`;
              
              setPreviewUrls(prev => ({
                ...prev,
                [projectData.project.id]: errorPreviewUrl
              }));
              
              // エラーログは静かに記録（アラート表示しない）
              console.error('Development error:', data.error);
            }
            } catch (parseError) {
              // JSONパースエラーは静かにスキップ
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      // アラート削除 - 静かにログに記録
      setDevelopmentProgress(null);
      setIsCreating(false);
    }
  };

  const submitEvaluation = async () => {
    if (!selectedProject) return;

    try {
      const evalResponse = await fetch('http://localhost:3002/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          actionId: 'manual',
          componentName: selectedProject.componentName || selectedProject.name,
          filePath: `src/components/${selectedProject.componentName || selectedProject.name}.tsx`,
          score: evaluationScore,
          feedback: {
            comments: evaluationComments,
            issues: [],
            suggestions: []
          },
        }),
      });

      const evalResult = await evalResponse.json();
      if (!evalResult.success) {
        console.error('Failed to submit evaluation:', evalResult);
        alert('評価の送信に失敗しました');
        return;
      }

      console.log('Evaluation submitted successfully:', evalResult);
      
      // Save values before clearing
      const submittedScore = evaluationScore;
      const submittedComments = evaluationComments;
      
      // Clear evaluation form
      setEvaluationScore(50);
      setEvaluationComments('');
      
      alert('✅ 評価を記録しました！\n\n💡 Musubiが分析中です。データ分析ページで提案を確認できます。');

      // Trigger auto-improvement if score is low or has comments
      if (submittedScore < 80 || submittedComments.trim()) {
        await fetch('http://localhost:3002/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${selectedProject.name}の評価: ${submittedScore}点。コメント: ${submittedComments}。自分を直して改善してください。`,
            conversationHistory: [],
          }),
        }).then(async (res) => {
          const data = await res.json();
          if (data.actions && data.actions.length > 0) {
            // Auto-approve and execute
            for (const action of data.actions) {
              await fetch(`http://localhost:3002/api/code/actions/${action.id}/approve`, {
                method: 'PUT',
              });
              await fetch(`http://localhost:3002/api/code/actions/${action.id}/execute`, {
                method: 'POST',
              });
            }
            
            // Create new version
            await fetch(`http://localhost:3002/api/projects/${selectedProject.id}/versions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: `評価${evaluationScore}点に基づく自動改善`,
                componentPath: `src/components/${selectedProject.name.replace(' ', '')}.tsx`,
              }),
            });

            alert('✅ 改善を実行しました！プレビューをリロードして再評価してください。');
            // Reload preview for this project
            const componentName = selectedProject.componentName || selectedProject.name.replace(/\s+/g, '');
            const newPreviewUrl = `http://localhost:3003/preview/${componentName}?t=${Date.now()}`;
            
            setPreviewUrls(prev => ({
              ...prev,
              [selectedProject.id]: newPreviewUrl
            }));
          }
        });
      } else {
        alert('✅ 評価ありがとうございます！');
      }

      setEvaluationComments('');
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Left: New Project Form */}
      <div style={{
        width: '320px',
        background: 'white',
        borderRight: '2px solid #e0e0e0',
        padding: '24px',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
          ➕ 新規プロジェクト
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
            何を作りたいですか？
          </label>
          <textarea
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && newProjectDesc.trim() && !isCreating) {
                createProject();
              }
            }}
            placeholder="例: 画像編集ツールを作りたい。トリミング、フィルター適用、テキスト追加ができるようにしてほしい。"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minHeight: '120px',
              resize: 'vertical'
            }}
          />
          <div style={{ 
            fontSize: '11px', 
            color: '#999', 
            marginTop: '6px',
            textAlign: 'right'
          }}>
            Ctrl + Enter で作成
          </div>
        </div>

        <button
          onClick={createProject}
          disabled={!newProjectDesc.trim() || isCreating}
          style={{
            width: '100%',
            padding: '12px',
            background: !newProjectDesc.trim() || isCreating ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: !newProjectDesc.trim() || isCreating ? 'not-allowed' : 'pointer'
          }}
        >
          {isCreating ? '作成中...' : '作成'}
        </button>

        {/* Progress Display */}
        {developmentProgress && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #0284c7'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#0369a1',
              marginBottom: '8px'
            }}>
              🔨 {developmentProgress.phase}
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#0c4a6e',
              marginBottom: '8px'
            }}>
              ステップ {developmentProgress.currentStep} / {developmentProgress.totalSteps}
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e0f2fe',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(developmentProgress.currentStep / developmentProgress.totalSteps) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
                transition: 'width 0.3s ease-in-out'
              }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#666' }}>
            📌 プロジェクト一覧
          </h3>
          
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: selectedProject?.id === project.id ? '#e3f2fd' : '#f9f9f9',
                border: `1px solid ${selectedProject?.id === project.id ? '#2196f3' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onClick={() => setSelectedProject(project)}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', paddingRight: '30px' }}>
                {project.name}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {project.version}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(project.id);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Center & Right: Preview & Evaluation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedProject ? (
          <>
            {/* Preview */}
            <div style={{ 
              flex: 1,
              background: 'white',
              borderBottom: '2px solid #e0e0e0',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {selectedProject.name}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {selectedProject.description}
                  </p>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {selectedProject.version}
                </div>
              </div>

              {/* Development Progress Overlay */}
              {developmentProgress && (
                <div style={{
                  position: 'absolute',
                  top: '70px',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  background: 'rgba(255, 255, 255, 0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}>
                  <div style={{
                    textAlign: 'center',
                    maxWidth: '600px',
                    padding: '40px'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '20px'
                    }}>
                      {developmentProgress.status === 'planning' ? '🧠' : '✍️'}
                    </div>
                    
                    <div style={{
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: '12px'
                    }}>
                      {developmentProgress.phase}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '24px'
                    }}>
                      ステップ {developmentProgress.currentStep} / {developmentProgress.totalSteps}
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '12px',
                      background: '#e0f2fe',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(developmentProgress.currentStep / developmentProgress.totalSteps) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0ea5e9, #0284c7)',
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </div>

                    <div style={{
                      marginTop: '20px',
                      fontSize: '14px',
                      color: '#333',
                      textAlign: 'left',
                      width: '100%',
                      maxWidth: '1000px',
                      padding: '24px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      lineHeight: '2',
                      minHeight: '400px',
                      maxHeight: '600px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {developmentProgress.thinkingLog || 'Musubi が開発中です...'}
                    </div>
                  </div>
                </div>
              )}
              
              {currentPreviewUrl && !developmentProgress && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    zIndex: 20
                  }}>
                    <button
                      onClick={() => window.open(currentPreviewUrl, '_blank')}
                      style={{
                        padding: '8px 16px',
                        background: '#0ea5e9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      プレビューを確認
                    </button>
                  </div>
                  <iframe
                    key={currentPreviewUrl}
                    src={currentPreviewUrl}
                    style={{
                      width: '100%',
                      height: 'calc(100% - 70px)',
                      border: 'none'
                    }}
                  />
                </>
              )}
            </div>

            {/* Evaluation Form */}
            <div style={{
              height: '280px',
              background: 'white',
              padding: '24px',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                ⭐ 評価
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{ fontSize: '14px', fontWeight: '500' }}>
                    スコア
                  </label>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2196f3' }}>
                    {evaluationScore}点
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={evaluationScore}
                  onChange={(e) => setEvaluationScore(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  コメント・要望
                </label>
                <textarea
                  value={evaluationComments}
                  onChange={(e) => setEvaluationComments(e.target.value)}
                  placeholder="改善してほしい点や要望を入力..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={submitEvaluation}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                評価を送信
              </button>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '18px'
          }}>
            プロジェクトを選択してください
          </div>
        )}
      </div>
    </div>
  );
}

