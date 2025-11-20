'use client';

import { useState, useEffect } from 'react';

interface AnalysisStep {
  step: number;
  title: string;
  message: string;
  data?: any;
}

interface Suggestion {
  id: string;
  title: string;
  growthEffect: string;
  userAction: string;
  // もともとの生テキスト（デバッグ・チャット用）
  rawContent?: string;
  requirement: string;
}

export default function DataAnalysisPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [latestSuggestion, setLatestSuggestion] = useState<string>('');
  
  // Streaming analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // Chat for specific suggestion
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [suggestionChat, setSuggestionChat] = useState<Array<{ role: string; content: string }>>([]);
  const [suggestionChatInput, setSuggestionChatInput] = useState('');
  const [isSuggestionChatLoading, setIsSuggestionChatLoading] = useState(false);

  useEffect(() => {
    console.log('[Musubi] DataAnalysisPage mounted - useEffect started');
    
    // 初回ロード時は必ずSupabaseから最新データを取得
    console.log('[Musubi] Fetching latest suggestions from Supabase...');
    fetchSuggestionsFromTemporal();

    // Poll for new suggestions every 30 seconds
    const pollInterval = setInterval(() => {
      console.log('[Musubi] Polling for new suggestions...');
      fetchSuggestionsFromTemporal();
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);



  const openSuggestionChat = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setSuggestionChat([{
      role: 'assistant',
      content: `${suggestion.growthEffect || 'この提案を実行すると、Musubiがこの種類の要望に対して自力で対応できる可能性が高まります。'}\n\n【あなたにお願いしたいこと】\n${suggestion.userAction || 'この提案に関連するログや具体例を1〜2件共有してください。'}`
    }]);
  };

  const sendSuggestionChatMessage = async () => {
    if (!suggestionChatInput.trim() || isSuggestionChatLoading || !selectedSuggestion) return;

    const userMessage = { role: 'user', content: suggestionChatInput };
    setSuggestionChat(prev => [...prev, userMessage]);
    setSuggestionChatInput('');
    setIsSuggestionChatLoading(true);

    try {
      const response = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `提案「${selectedSuggestion.title}」について質問です。\n\n[成長効果]\n${selectedSuggestion.growthEffect}\n\n[あなたにお願いしたいアクション]\n${selectedSuggestion.userAction}\n\nユーザーからの質問: ${suggestionChatInput}`,
          conversationHistory: suggestionChat,
        }),
      });

      const data = await response.json();
      
      const assistantMessage = { role: 'assistant', content: data.message };
      setSuggestionChat(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSuggestionChatLoading(false);
    }
  };

  // Temporal版：Supabaseから提案を取得
  const fetchSuggestionsFromTemporal = async () => {
    console.log('[Musubi] Fetching suggestions from Temporal...');
    setIsAnalyzing(true);

    try {
      const response = await fetch('http://localhost:3002/api/temporal/suggestions');
      const result = await response.json();

      if (result.success && result.suggestions) {
        console.log('[Musubi] Received suggestions:', result.suggestions.length);
        
        // Supabaseのフィールド名をフロントエンドの形式に変換
        const formatted: Suggestion[] = result.suggestions.map((s: any) => ({
          id: s.id,
          title: s.title,
          growthEffect: s.description, // Supabaseの description → growthEffect
          userAction: s.user_action,   // Supabaseの user_action → userAction
          rawContent: s.description,
          requirement: s.requirement_id || '',
        }));
        
        setSuggestions(formatted);
        localStorage.setItem('musubi-suggestions', JSON.stringify(formatted));
        localStorage.setItem('musubi-last-analysis', Date.now().toString());
      }
    } catch (error) {
      console.error('[Musubi] Failed to fetch suggestions:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startStreamingAnalysis = async () => {
    console.log('[Musubi] Starting streaming analysis...');
    setIsAnalyzing(true);
    setAnalysisSteps([]);
    setSuggestions([]);

    try {
      console.log('[Musubi] Fetching /api/analysis/stream...');
      const response = await fetch('http://localhost:3002/api/analysis/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('[Musubi] Response received:', response.status);

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
            const data = line.substring(6);
            if (data === '[DONE]') {
              setIsAnalyzing(false);
              return;
            }

            try {
              const step: AnalysisStep = JSON.parse(data);
              
              setAnalysisSteps(prev => [...prev, step]);

              // Extract suggestions from step 4
              if (step.step === 4 && step.data?.suggestions) {
                const newSuggestions: Suggestion[] = step.data.suggestions;
                console.log('[Musubi] Received suggestions:', newSuggestions.length);
                setSuggestions(newSuggestions);
                
                // Save to localStorage
                localStorage.setItem('musubi-suggestions', JSON.stringify(newSuggestions));
                localStorage.setItem('musubi-last-analysis', Date.now().toString());
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('[Musubi] Streaming analysis failed:', error);
      setIsAnalyzing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();
      
      const assistantMessage = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      background: '#f5f5f5'
    }}>
      {/* Left: Stats & Graphs */}
      <div style={{ 
        flex: 1, 
        padding: '40px',
        overflowY: 'auto'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '32px',
          color: '#333'
        }}>
          📊 データ分析
        </h1>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              総プロジェクト数
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#2196f3' }}>
              {stats?.totalProjects || 0}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              総評価数
            </div>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4caf50' }}>
              {stats?.totalEvaluations || 0}
            </div>
          </div>
        </div>

        {/* Analysis Status */}
        {!isAnalyzing && suggestions.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(132, 250, 176, 0.4)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                ✅ 分析完了
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)' }}>
                最終分析: {new Date(parseInt(localStorage.getItem('musubi-last-analysis') || '0')).toLocaleString('ja-JP')}
              </div>
            </div>
            <button
              onClick={startStreamingAnalysis}
              style={{
                padding: '10px 20px',
                background: 'white',
                color: '#8fd3f4',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              🔄 再分析
            </button>
          </div>
        )}
        
        {isAnalyzing && (
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(240, 147, 251, 0.4)',
            marginBottom: '20px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
              🔍 分析中...
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Cursor会話と評価から要望を抽出しています
            </div>
          </div>
        )}

        {/* Real-time Analysis Window */}
        {analysisSteps.length > 0 && (
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
              📊 分析プロセス
            </h3>
            {analysisSteps.map((step, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '12px',
                  padding: '12px',
                  background: step.step === 4 && step.title === '分析完了' ? '#e8f5e9' : '#f5f5f5',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${
                    step.step === 1 ? '#2196f3' :
                    step.step === 2 ? '#ff9800' :
                    step.step === 3 ? '#9c27b0' :
                    '#4caf50'
                  }`
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {step.message}
                </div>
              </div>
            ))}
            {isAnalyzing && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '20px',
                  border: '3px solid #f3f3f3',
                  borderTop: '3px solid #2196f3',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            )}
          </div>
        )}

        {/* Suggestion Cards */}
        {suggestions.length > 0 && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
              💡 Musubiからの提案 ({suggestions.length}件)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    color: 'white'
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                    📌 提案 {index + 1}
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
                    {suggestion.title}
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    marginBottom: '12px'
                  }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                      🧠 この提案でMusubiが成長するポイント
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      {suggestion.growthEffect || 'この提案を実行すると、Musubiがこの種類の要望に対して自力で対応できる可能性が高まります。'}
                    </div>
                    <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>
                      📌 あなたにお願いしたいアクション
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                      {String(suggestion.userAction || 'この提案に関連するログや具体例を1〜2件共有してください。').split(/[・\n]/).filter(s => s.trim()).map((item, i) => (
                        <div key={i} style={{ marginBottom: '6px' }}>
                          • {item.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => openSuggestionChat(suggestion)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#667eea',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                  >
                    💬 詳しく聞く
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion Chat Modal */}
        {selectedSuggestion && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setSelectedSuggestion(null)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>
                    💬 提案について質問
                  </h3>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {selectedSuggestion.title}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSuggestion(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Chat Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px'
              }}>
                {suggestionChat.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: '16px',
                      textAlign: msg.role === 'user' ? 'right' : 'left'
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: msg.role === 'user' ? '#2196f3' : '#f0f0f0',
                        color: msg.role === 'user' ? 'white' : '#333',
                        maxWidth: '80%',
                        textAlign: 'left',
                        whiteSpace: 'pre-wrap',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div style={{
                padding: '20px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: '10px'
              }}>
                <input
                  type="text"
                  value={suggestionChatInput}
                  onChange={(e) => setSuggestionChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendSuggestionChatMessage();
                    }
                  }}
                  placeholder="質問を入力..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={sendSuggestionChatMessage}
                  disabled={isSuggestionChatLoading || !suggestionChatInput.trim()}
                  style={{
                    padding: '12px 20px',
                    background: isSuggestionChatLoading || !suggestionChatInput.trim() ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isSuggestionChatLoading || !suggestionChatInput.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  送信
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Improvement Chart Placeholder */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            改善度の推移
          </h2>
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9',
            borderRadius: '8px',
            color: '#999'
          }}>
            グラフ表示エリア（今後実装）
          </div>
        </div>

        {/* Data Correlation */}
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
            データ相関分析
          </h2>
          <div style={{ color: '#666', lineHeight: '1.8' }}>
            <div>• 会話履歴: 相関度 0.85 ⭐⭐⭐⭐⭐</div>
            <div>• ファイルパス: 相関度 0.72 ⭐⭐⭐⭐</div>
            <div>• コード変更: 相関度 0.68 ⭐⭐⭐</div>
            <div style={{ marginTop: '12px', fontSize: '14px', color: '#999' }}>
              ※ 実際のデータから自動計算（今後実装）
            </div>
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div style={{
        width: '400px',
        background: 'white',
        borderLeft: '2px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            💬 データ分析チャット
          </h2>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            データ改善提案やログ分析について相談
          </p>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {messages.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#999',
              marginTop: '40px'
            }}>
              データ分析や改善提案について<br/>質問してください
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: '16px',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? '#2196f3' : '#f0f0f0',
                  color: msg.role === 'user' ? 'white' : '#333',
                  maxWidth: '80%',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '20px',
          borderTop: '1px solid #e0e0e0'
        }}>
          {/* Quick Action Button */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => {
                setInput('');
                const quickMessage = 'あなたの成長に必要なデータは何？データを分析して教えて。';
                setMessages(prev => [...prev, { role: 'user', content: quickMessage }]);
                setIsLoading(true);
                
                fetch('http://localhost:3002/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: quickMessage,
                    conversationHistory: messages,
                  }),
                })
                .then(res => res.json())
                .then(data => {
                  setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
                })
                .catch(error => {
                  console.error('Failed to send message:', error);
                })
                .finally(() => {
                  setIsLoading(false);
                });
              }}
              disabled={isLoading}
              style={{
                padding: '10px 16px',
                background: isLoading ? '#ccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              🔍 あなたの成長に必要なデータは？
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '12px 24px',
                background: isLoading || !input.trim() ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

