
'use client';

import { useState, useEffect, useRef } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string; // developing, completed, evaluated
  code: string;
  preview_url: string;
  evaluation_score?: number;
  evaluation_comments?: string;
  suggestions?: ImprovementSuggestion[];
  created_at: string;
  updated_at: string;
}

interface ImprovementSuggestion {
  missing_capability: string;
  具体的な手順: string;
  json_template?: string;
}

export default function ProjectDevelopmentPage() {
  const [projectRequest, setProjectRequest] = useState('');
  const [selectedAI, setSelectedAI] = useState('claude-sonnet-4-5');
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [developmentLog, setDevelopmentLog] = useState<string>('');
  const [livePreview, setLivePreview] = useState<string>('');
  const [evaluationScore, setEvaluationScore] = useState(50);
  const [evaluationComments, setEvaluationComments] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [improvementSuggestions, setImprovementSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [questionInput, setQuestionInput] = useState<{ [key: number]: string }>({});
  const [questionResponse, setQuestionResponse] = useState<{ [key: number]: string }>({});
  const [additionalRequest, setAdditionalRequest] = useState('');
  const livePreviewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject?.suggestions) {
      setImprovementSuggestions(selectedProject.suggestions);
    } else {
      setImprovementSuggestions([]);
    }
  }, [selectedProject]);

  // livePreviewが更新されたらiframeのcontentを直接書き換え（チカチカ防止）
  useEffect(() => {
    if (livePreview && livePreviewIframeRef.current) {
      const iframeDoc = livePreviewIframeRef.current.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(livePreview);
        iframeDoc.close();
      }
    }
  }, [livePreview]);

  const loadProjects = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/musubi/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;

    try {
      const response = await fetch(`http://localhost:3002/api/musubi/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const openFullscreen = () => {
    if (livePreview) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(livePreview);
        newWindow.document.close();
      }
    } else if (selectedProject) {
      window.open(selectedProject.preview_url, '_blank');
    }
  };

  const createProject = async () => {
    if (!projectRequest.trim() || isCreating) return;

    setIsCreating(true);
    setDevelopmentLog('');
    setLivePreview('');
    
    try {
      const response = await fetch('http://localhost:3002/api/musubi/create-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            description: projectRequest,
            aiModel: selectedAI
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'message') {
                setDevelopmentLog(prev => prev + data.content);
              } else if (data.type === 'preview') {
                setLivePreview(data.content);
              } else if (data.type === 'done') {
                setProjectRequest('');
                loadProjects();
                setSelectedProject(data.project);
                setLivePreview('');
              }
            } catch (e) {
              // JSONパースエラーは無視（不完全なチャンク）
              console.debug('JSON parse error (incomplete chunk):', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const submitEvaluation = async () => {
    if (!selectedProject || isEvaluating) return;

    setIsEvaluating(true);
    console.log('[submitEvaluation] Starting evaluation...', {
      projectId: selectedProject.id,
      score: evaluationScore,
      comments: evaluationComments,
    });

    try {
      const response = await fetch('http://localhost:3002/api/musubi/evaluate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          score: evaluationScore,
          comments: evaluationComments,
        }),
      });

      console.log('[submitEvaluation] Response status:', response.status);
      const data = await response.json();
      console.log('[submitEvaluation] Response data:', data);

      if (data.success) {
        setImprovementSuggestions(data.suggestions || []);
        loadProjects();
        console.log('[submitEvaluation] Suggestions set:', data.suggestions);
      } else {
        console.error('[submitEvaluation] Error:', data.error);
        alert(`評価に失敗しました: ${data.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const retryProject = async () => {
    if (!selectedProject) return;

    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:3002/api/musubi/retry-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });

      const data = await response.json();
      if (data.success) {
        loadProjects();
        setSelectedProject(data.project);
        setImprovementSuggestions([]);
      }
    } catch (error) {
      console.error('Failed to retry project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const askQuestion = async (index: number, suggestion: ImprovementSuggestion) => {
    const question = questionInput[index];
    if (!question?.trim()) return;

    try {
      const response = await fetch('http://localhost:3002/api/musubi/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          question,
          suggestion,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQuestionResponse({
          ...questionResponse,
          [index]: data.answer,
        });
        setQuestionInput({ ...questionInput, [index]: '' });
      }
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  };

  const submitAdditionalRequest = async () => {
    if (!selectedProject || !additionalRequest.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const response = await fetch('http://localhost:3002/api/musubi/evaluate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          score: 50, // 追加要求なので固定
          comments: additionalRequest, // 追加要求のみを送信
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 既存の提案に追加
        const newSuggestions = [...improvementSuggestions, ...(data.suggestions || [])];
        setImprovementSuggestions(newSuggestions);
        setAdditionalRequest('');
        loadProjects();
      }
    } catch (error) {
      console.error('Failed to submit additional request:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const deleteSuggestion = async (index: number) => {
    if (!selectedProject) return;

    const newSuggestions = improvementSuggestions.filter((_, i) => i !== index);
    setImprovementSuggestions(newSuggestions);

    // Supabaseに保存
    try {
      await fetch(`http://localhost:3002/api/musubi/projects/${selectedProject.id}/suggestions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: newSuggestions }),
      });
    } catch (error) {
      console.error('Failed to delete suggestion:', error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* 左側: プロジェクト一覧 */}
      <div style={{ width: '300px', borderRight: '1px solid #e0e0e0', padding: '1rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          📦 プロジェクト
        </h2>

        {/* 新規作成 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#666' }}>
              AIモデルを選択
            </label>
            <select
                value={selectedAI}
                onChange={(e) => setSelectedAI(e.target.value)}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer'
                }}
            >
                <option value="claude-4-5-sonnet-20250929">Claude Sonnet 4.5 (Anthropic)</option>
                <option value="gpt-5.1-2025-11-13">GPT-5.1 (OpenAI)</option>
                <option value="gemini-3-pro-preview">Gemini 3 Pro (Google)</option>
            </select>
          </div>

          <textarea
            value={projectRequest}
            onChange={(e) => setProjectRequest(e.target.value)}
            placeholder="作りたいものを説明してください&#10;例: LINEを超えるAIチャットアプリ"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
          <button
            onClick={createProject}
            disabled={isCreating || !projectRequest.trim()}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              background: isCreating ? '#ccc' : '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: isCreating ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating ? '開発中...' : '🚀 開発開始'}
          </button>

          {/* 開発ログ表示（Cursor風） */}
          {developmentLog && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#1F2937',
              color: '#10B981',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              maxHeight: '400px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5',
            }}>
              {developmentLog}
              {isCreating && <span style={{ animation: 'blink 1s infinite' }}>▊</span>}
            </div>
          )}
        </div>

        {/* プロジェクト一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: '0.75rem',
                background: selectedProject?.id === project.id ? '#E0E7FF' : 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div onClick={() => setSelectedProject(project)} style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {project.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  {project.status === 'developing' && '🔨 開発中'}
                  {project.status === 'completed' && '✅ 完成'}
                  {project.status === 'evaluated' && `⭐ ${project.evaluation_score}/100`}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(project.id);
                }}
                style={{
                  background: 'transparent',
                  color: '#999',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  lineHeight: '1',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右側: プロジェクト詳細 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        {selectedProject || livePreview ? (
          <>
            {/* プレビュー */}
            <div style={{ flex: 1, borderRight: '1px solid #e0e0e0', position: 'relative' }}>
              {livePreview ? (
                <iframe
                  ref={livePreviewIframeRef}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Live Preview"
                />
              ) : selectedProject ? (
                <iframe
                  src={selectedProject.preview_url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Project Preview"
                />
              ) : null}
              
              {/* 全画面表示ボタン */}
              <button
                onClick={openFullscreen}
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                🖥️ 全画面表示
              </button>

              {livePreview && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#10B981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                }}>
                  🔴 LIVE
                </div>
              )}
            </div>

            {/* 評価・改善提案 */}
            <div style={{ width: '400px', padding: '1.5rem', overflowY: 'auto', background: '#f9fafb' }}>
              {selectedProject && (selectedProject.status === 'completed' || selectedProject.status === 'evaluated') && !improvementSuggestions.length && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    📊 このプロジェクトを評価してください
                  </h3>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      スコア: {evaluationScore}/100
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={evaluationScore}
                      onChange={(e) => setEvaluationScore(parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      コメント
                    </label>
                    <textarea
                      value={evaluationComments}
                      onChange={(e) => setEvaluationComments(e.target.value)}
                      placeholder="改善してほしい点を具体的に..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <button
                    onClick={submitEvaluation}
                    disabled={isEvaluating}
                    style={{
                      padding: '0.75rem 2rem',
                      background: isEvaluating ? '#ccc' : '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: isEvaluating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isEvaluating ? '分析中...' : '評価を送信'}
                  </button>
                </div>
              )}

              {improvementSuggestions.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    💡 Musubiを成長させるために
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Musubiが自走できるように、以下の設定・準備をお願いします
                  </p>
                  {improvementSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        border: '2px solid #FCD34D',
                        position: 'relative',
                      }}
                    >
                      <button
                        onClick={() => deleteSuggestion(index)}
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          right: '0.75rem',
                          background: 'transparent',
                          color: '#999',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.25rem',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          lineHeight: '1',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                      >
                        ✕
                      </button>
                      <h4 style={{ fontWeight: 'bold', marginBottom: '0.75rem', fontSize: '1rem', color: '#1976d2', paddingRight: '2rem' }}>
                        🔧 {suggestion.missing_capability}
                      </h4>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                          📌 あなた（人間）がやること
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#333', lineHeight: '1.7', paddingLeft: '0.75rem', borderLeft: '3px solid #FCD34D', whiteSpace: 'pre-wrap' }}>
                          {suggestion.具体的な手順}
                        </p>
                      </div>
                      {suggestion.json_template && (
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#4F46E5', fontWeight: 'bold', fontSize: '0.875rem' }}>
                            📋 設定例を表示
                          </summary>
                          <pre style={{
                            marginTop: '0.5rem',
                            padding: '1rem',
                            background: '#1F2937',
                            color: '#10B981',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            overflowX: 'auto',
                          }}>
                            {suggestion.json_template}
                          </pre>
                        </details>
                      )}

                      {/* 質問セクション */}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                          💬 この提案について質問する
                        </div>
                        <textarea
                          value={questionInput[index] || ''}
                          onChange={(e) => setQuestionInput({ ...questionInput, [index]: e.target.value })}
                          placeholder="例: .envファイルってどこに作ればいいの？"
                          style={{
                            width: '100%',
                            minHeight: '60px',
                            padding: '0.5rem',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            marginBottom: '0.5rem',
                            resize: 'vertical',
                          }}
                        />
                        <button
                          onClick={() => askQuestion(index, suggestion)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          質問を送信
                        </button>
                        {questionResponse[index] && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            whiteSpace: 'pre-wrap',
                          }}>
                            {questionResponse[index]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={retryProject}
                    disabled={isCreating}
                    style={{
                      padding: '0.75rem 2rem',
                      background: isCreating ? '#ccc' : '#4F46E5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: isCreating ? 'not-allowed' : 'pointer',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {isCreating ? '再開発中...' : '🔄 能力を付与して再開発'}
                  </button>

                  {/* 追加評価セクション */}
                  <div style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '2px solid #F59E0B' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#F59E0B' }}>
                      ➕ 追加評価
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.75rem' }}>
                      提案に含まれていない追加の要求を送信すると、それを網羅的にカバーした提案を追加します
                    </p>
                    <textarea
                      value={additionalRequest}
                      onChange={(e) => setAdditionalRequest(e.target.value)}
                      placeholder="例: アプリをダウンロードできるようにしてほしい"
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        marginBottom: '0.75rem',
                        resize: 'vertical',
                      }}
                    />
                    <button
                      onClick={submitAdditionalRequest}
                      disabled={isEvaluating}
                      style={{
                        padding: '0.5rem 1rem',
                        background: isEvaluating ? '#ccc' : '#F59E0B',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        cursor: isEvaluating ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                      }}
                    >
                      {isEvaluating ? '分析中...' : '追加提案を生成'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
          }}>
            プロジェクトを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
