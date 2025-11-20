'use client';

import { useState, useRef, useEffect } from 'react';

interface Action {
  id: string;
  type: string;
  description: string;
  status: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: Action[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'こんにちは！Musubiです。何か作りたいソフトウェアはありますか？それとも、データ品質について相談しますか？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [currentComponentName, setCurrentComponentName] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [evaluationScore, setEvaluationScore] = useState(75);
  const [evaluationComments, setEvaluationComments] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('musubi-chat-history');
    const savedPreviewUrl = localStorage.getItem('musubi-preview-url');
    const savedActionId = localStorage.getItem('musubi-action-id');
    let savedComponentName = localStorage.getItem('musubi-component-name');
    const savedFilePath = localStorage.getItem('musubi-file-path');
    
    // Fix old component names
    if (savedComponentName === 'ScreenRecorderWithInk' || savedComponentName === 'MiyazakiAI') {
      savedComponentName = 'Miyazaki';
      localStorage.setItem('musubi-component-name', 'Miyazaki');
    }
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
    
    if (savedPreviewUrl) {
      // Fix old preview URLs
      const fixedUrl = savedPreviewUrl.replace(/ScreenRecorderWithInk|MiyazakiAI/g, 'Miyazaki');
      setPreviewUrl(fixedUrl);
      if (fixedUrl !== savedPreviewUrl) {
        localStorage.setItem('musubi-preview-url', fixedUrl);
      }
    }
    if (savedActionId) setCurrentActionId(savedActionId);
    if (savedComponentName) setCurrentComponentName(savedComponentName);
    if (savedFilePath) setCurrentFilePath(savedFilePath);
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    localStorage.setItem('musubi-chat-history', JSON.stringify(messages));
  }, [messages]);

  // Save preview state to localStorage
  useEffect(() => {
    if (previewUrl) {
      localStorage.setItem('musubi-preview-url', previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (currentActionId) {
      localStorage.setItem('musubi-action-id', currentActionId);
    }
  }, [currentActionId]);

  useEffect(() => {
    if (currentComponentName) {
      localStorage.setItem('musubi-component-name', currentComponentName);
    }
  }, [currentComponentName]);

  useEffect(() => {
    if (currentFilePath) {
      localStorage.setItem('musubi-file-path', currentFilePath);
    }
  }, [currentFilePath]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Musubiバックエンドと通信
      const response = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(data.timestamp),
        actions: data.actions || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '申し訳ありません。接続エラーが発生しました。Musubiバックエンドが起動しているか確認してください。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      // Approve action
      const approveResponse = await fetch(`http://localhost:3002/api/code/actions/${actionId}/approve`, {
        method: 'POST',
      });

      if (!approveResponse.ok) {
        throw new Error('Failed to approve action');
      }

      // Execute action
      const executeResponse = await fetch(`http://localhost:3002/api/code/actions/${actionId}/execute`, {
        method: 'POST',
      });

      if (!executeResponse.ok) {
        throw new Error('Failed to execute action');
      }

      const result = await executeResponse.json();

      // Check if preview URL is available
      if (result.previewUrl) {
        setPreviewUrl(result.previewUrl);
        setCurrentActionId(result.actionId || actionId);
        setCurrentComponentName(result.componentName);
        setCurrentFilePath(result.filePath);
        
        setActiveTab('preview');
      }

      // Add success message
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ アクションを実行しました！\n\n${result.result}${result.previewUrl ? '\n\n🎨 プレビュータブで確認できます！' : ''}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, successMessage]);

    } catch (error) {
      console.error('Error executing action:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ アクションの実行に失敗しました：${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      await fetch(`http://localhost:3002/api/code/actions/${actionId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'User rejected' }),
      });

      const rejectMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ アクションを却下しました。',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, rejectMessage]);

    } catch (error) {
      console.error('Error rejecting action:', error);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!currentActionId || !currentComponentName || !currentFilePath) {
      alert('評価情報が不足しています');
      return;
    }

    try {
      const response = await fetch('http://localhost:3002/api/evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: currentActionId,
          componentName: currentComponentName,
          filePath: currentFilePath,
          score: evaluationScore,
          feedback: {
            strengths: [],
            weaknesses: [],
            comments: evaluationComments,
          },
          sourceData: {
            logCount: 0,
            hasFilePath: true,
            hasCodeReview: false,
            hasErrorHandling: false,
            hasTestExamples: false,
            dataQuality: 'medium',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit evaluation');
      }

      const data = await response.json();

      setShowEvaluationForm(false);
      setEvaluationComments('');
      setEvaluationScore(75);

      // Add success message
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ 評価ありがとうございます！\n\n${currentComponentName}: ${evaluationScore}点\n\nフィードバックを記録しました。この評価データを使って、より良い成果物を生成できるように改善していきます。`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, successMessage]);
      setActiveTab('chat');

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('評価の送信に失敗しました');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Musubiとの対話
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ソフトウェア開発の相談、データ品質の改善提案など
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              💬 チャット
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={!previewUrl}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white'
                  : previewUrl
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
            >
              🎨 プレビュー
            </button>
          </div>
        </div>
      </header>

      {/* Chat View */}
      {activeTab === 'chat' && (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {message.role === 'user' ? 'あなた' : '🌟 Musubi'}
                </span>
                <span className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Action buttons */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-4 space-y-2">
                  {message.actions.map((action) => (
                    <div key={action.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{action.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Type: {action.type} • Status: {action.status}
                          </p>
                        </div>
                        {action.status === 'pending' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleApproveAction(action.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleRejectAction(action.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                            >
                              却下
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-3xl rounded-lg px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">🌟 Musubi</span>
                <span className="text-xs opacity-70">入力中...</span>
              </div>
              <div className="flex gap-1 mt-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      )}

      {/* Preview View */}
      {activeTab === 'preview' && previewUrl && (
        <div className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-900">
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">プレビュー:</span>
              <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {currentComponentName}
              </code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEvaluationForm(!showEvaluationForm)}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                ⭐ 評価する
              </button>
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                🔗 新しいタブで開く
              </button>
            </div>
          </div>
          
          {/* Evaluation Form */}
          {showEvaluationForm && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                このコンポーネントを評価してください
              </h3>
              
              <div className="space-y-4">
                {/* Score Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      スコア
                    </label>
                    <span className="text-2xl font-bold text-blue-600">
                      {evaluationScore}点
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={evaluationScore}
                    onChange={(e) => setEvaluationScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    コメント（オプション）
                  </label>
                  <textarea
                    value={evaluationComments}
                    onChange={(e) => setEvaluationComments(e.target.value)}
                    placeholder="良かった点や改善してほしい点を入力..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitEvaluation}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    評価を送信
                  </button>
                  <button
                    onClick={() => setShowEvaluationForm(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 p-4">
            <iframe
              src={previewUrl}
              className="w-full h-full bg-white rounded-lg shadow-lg"
              title="Component Preview"
            />
          </div>
        </div>
      )}

      {/* Input (only show in chat tab) */}
      {activeTab === 'chat' && (
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Musubiに質問や指示を入力..."
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              送信
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Enter で送信、Shift + Enter で改行
          </p>
        </div>
      </div>
      )}
    </div>
  );
}

