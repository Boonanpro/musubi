import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';

// 基本的なデータ型定義
interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'ai' | 'image' | 'voice';
  aiAssisted?: boolean;
  aiSuggestions?: string[];
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  name?: string;
  aiEnabled: boolean;
}

interface AIAssistant {
  id: string;
  name: string;
  type: 'translator' | 'emotion' | 'scheduler' | 'general';
  isActive: boolean;
}

// メモ化されたチャット項目コンポーネント
const ChatItem = memo(({ chat, partner, onClick }: { 
  chat: Chat; 
  partner: User; 
  onClick: () => void; 
}) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '10px',
      marginBottom: '10px',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transform: 'translateZ(0)',
      willChange: 'transform'
    }}
  >
    <div style={{ fontSize: '30px', marginRight: '15px', position: 'relative' }}>
      {partner.avatar}
      {partner.isOnline && (
        <div style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '10px',
          height: '10px',
          backgroundColor: '#4caf50',
          borderRadius: '50%',
          border: '2px solid white'
        }} />
      )}
    </div>
    
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{partner.name}</span>
        {chat.unreadCount > 0 && (
          <span style={{
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {chat.unreadCount}
          </span>
        )}
      </div>
      
      {chat.lastMessage && (
        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
          {chat.lastMessage.content.length > 30 
            ? chat.lastMessage.content.substring(0, 30) + '...'
            : chat.lastMessage.content
          }
        </div>
      )}
      
      {chat.aiEnabled && (
        <div style={{ fontSize: '12px', color: '#2196f3', marginTop: '3px' }}>
          🤖 AI支援有効
        </div>
      )}
    </div>
  </div>
));

// メモ化されたメッセージコンポーネント
const MessageBubble = memo(({ message, isCurrentUser, onSuggestionClick }: {
  message: Message;
  isCurrentUser: boolean;
  onSuggestionClick: (suggestion: string) => void;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
      willChange: 'transform'
    }}
  >
    <div style={{
      maxWidth: '80%',
      padding: '12px 16px',
      borderRadius: '20px',
      backgroundColor: isCurrentUser 
        ? '#2196f3' 
        : message.type === 'ai' 
          ? '#e8f5e8' 
          : 'white',
      color: isCurrentUser ? 'white' : '#333',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      border: message.type === 'ai' ? '1px solid #4caf50' : 'none'
    }}>
      {message.type === 'ai' && (
        <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '5px' }}>
          🤖 AI支援メッセージ
        </div>
      )}
      
      <div>{message.content}</div>
      
      {message.aiSuggestions && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', marginBottom: '5px', opacity: 0.8 }}>
            AI提案:
          </div>
          {message.aiSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px',
                marginBottom: '5px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                color: isCurrentUser ? 'white' : '#333',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      <div style={{ 
        fontSize: '10px', 
        opacity: 0.7, 
        marginTop: '5px',
        textAlign: 'right'
      }}>
        {message.timestamp.toLocaleTimeString()}
      </div>
    </div>
  </div>
));

const AiConnect: React.FC = () => {
  // 状態管理
  const [currentUser] = useState<User>({
    id: 'user1',
    name: '山田太郎',
    avatar: '👤',
    isOnline: true,
    lastSeen: new Date()
  });

  const [users] = useState<User[]>([
    {
      id: 'user2',
      name: '佐藤花子',
      avatar: '👩',
      isOnline: true,
      lastSeen: new Date()
    },
    {
      id: 'user3',
      name: '田中次郎',
      avatar: '👨',
      isOnline: false,
      lastSeen: new Date(Date.now() - 300000)
    }
  ]);

  const [chats, setChats] = useState<Chat[]>([
    {
      id: 'chat1',
      participants: ['user1', 'user2'],
      unreadCount: 2,
      isGroup: false,
      aiEnabled: true,
      lastMessage: {
        id: 'msg1',
        senderId: 'user2',
        receiverId: 'user1',
        content: '今日のミーティング、どうだった？',
        timestamp: new Date(),
        type: 'text'
      }
    },
    {
      id: 'chat2',
      participants: ['user1', 'user3'],
      unreadCount: 0,
      isGroup: false,
      aiEnabled: true,
      lastMessage: {
        id: 'msg2',
        senderId: 'user1',
        receiverId: 'user3',
        content: 'ありがとうございます！',
        timestamp: new Date(Date.now() - 3600000),
        type: 'text'
      }
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg1',
      senderId: 'user2',
      receiverId: 'user1',
      content: '今日のミーティング、どうだった？',
      timestamp: new Date(),
      type: 'text',
      aiSuggestions: ['順調でした', 'いくつか課題がありました', 'とても良い議論ができました']
    }
  ]);

  const [aiAssistants, setAiAssistants] = useState<AIAssistant[]>([
    { id: 'ai1', name: '翻訳AI', type: 'translator', isActive: true },
    { id: 'ai2', name: '感情分析AI', type: 'emotion', isActive: true },
    { id: 'ai3', name: 'スケジュールAI', type: 'scheduler', isActive: false },
    { id: 'ai4', name: '汎用AI', type: 'general', isActive: true }
  ]);

  const [currentView, setCurrentView] = useState<'chats' | 'chat' | 'settings'>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');

  // メモ化されたユーザー検索
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach(user => map.set(user.id, user));
    map.set(currentUser.id, currentUser);
    return map;
  }, [users, currentUser]);

  const getUserById = useCallback((id: string): User | undefined => {
    return userMap.get(id);
  }, [userMap]);

  // メモ化されたチャットパートナー取得
  const getChatPartner = useCallback((chat: Chat): User | undefined => {
    const partnerId = chat.participants.find(id => id !== currentUser.id);
    return partnerId ? getUserById(partnerId) : undefined;
  }, [currentUser.id, getUserById]);

  // メモ化されたアクティブAI数
  const activeAiCount = useMemo(() => {
    return aiAssistants.filter(ai => ai.isActive).length;
  }, [aiAssistants]);

  // メモ化されたチャットメッセージ
  const chatMessages = useMemo(() => {
    if (!selectedChatId) return [];
    
    const chat = chats.find(c => c.id === selectedChatId);
    const partner = chat ? getChatPartner(chat) : null;
    
    return messages.filter(m => 
      (m.senderId === currentUser.id && m.receiverId === partner?.id) ||
      (m.senderId === partner?.id && m.receiverId === currentUser.id)
    );
  }, [messages, selectedChatId, chats, getChatPartner, currentUser.id]);

  // デバウンスされた入力処理
  const [inputTimeout, setInputTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    if (inputTimeout) {
      clearTimeout(inputTimeout);
    }
    
    setInputTimeout(setTimeout(() => {
      // AI予測やタイピング表示などの処理をここに
    }, 300));
  }, [inputTimeout]);

  // 最適化されたメッセージ送信
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedChatId) return;

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat) return;

    const receiverId = chat.participants.find(id => id !== currentUser.id);
    if (!receiverId) return;

    const message: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: currentUser.id,
      receiverId,
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    // バッチ更新で複数の状態を一度に更新
    requestAnimationFrame(() => {
      setMessages(prev => [...prev, message]);
      setChats(prev => prev.map(c => 
        c.id === selectedChatId 
          ? { ...c, lastMessage: message }
          : c
      ));
      setNewMessage('');
    });

    // AIの応答をシミュレート
    if (chat.aiEnabled) {
      setTimeout(() => {
        const aiMessage: Message = {
          id: `ai_${Date.now()}_${Math.random()}`,
          senderId: receiverId,
          receiverId: currentUser.id,
          content: 'AIが感情を分析して返答を提案しています...',
          timestamp: new Date(),
          type: 'ai',
          aiSuggestions: ['了解しました', 'ありがとうございます', 'もう少し詳しく教えてください']
        };
        setMessages(prev => [...prev, aiMessage]);
      }, 1000);
    }
  }, [newMessage, selectedChatId, chats, currentUser.id]);

  // キーボードイベント最適化
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // チャット選択最適化
  const selectChat = useCallback((chatId: string) => {
    if (selectedChatId !== chatId) {
      setSelectedChatId(chatId);
      setCurrentView('chat');
    }
  }, [selectedChatId]);

  // 提案クリック最適化
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setNewMessage(suggestion);
  }, []);

  // AI設定トグル最適化
  const toggleAiAssistant = useCallback((aiId: string) => {
    setAiAssistants(prev => prev.map(ai => 
      ai.id === aiId ? { ...ai, isActive: !ai.isActive } : ai
    ));
  }, []);

  // チャットリストビュー
  const renderChatList = useCallback(() => (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '0 auto', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      transform: 'translateZ(0)',
      willChange: 'transform'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>AiConnect</h1>
        <button 
          onClick={() => setCurrentView('settings')}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ⚙️
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '10px',
          border: '1px solid #2196f3'
        }}>
          <span>🤖</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>AIアシスタント</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {activeAiCount}個のAIが稼働中
            </div>
          </div>
        </div>
      </div>

      {chats.map(chat => {
        const partner = getChatPartner(chat);
        if (!partner) return null;

        return (
          <ChatItem
            key={chat.id}
            chat={chat}
            partner={partner}
            onClick={() => selectChat(chat.id)}
          />
        );
      })}
    </div>
  ), [chats, getChatPartner, activeAiCount, selectChat]);

  // チャットビュー
  const renderChatView = useCallback(() => {
    const chat = chats.find(c => c.id === selectedChatId);
    const partner = chat ? getChatPartner(chat) : null;

    if (!chat || !partner) return null;

    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        maxWidth: '400px', 
        margin: '0 auto',
        backgroundColor: '#fafafa',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '15px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <button
            onClick={() => setCurrentView('chats')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '18px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          
          <div style={{ fontSize: '25px', marginRight: '10px', position: 'relative' }}>
            {partner.avatar}
            {partner.isOnline && (
              <div style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                width: '8px',
                height: '8px',
                backgroundColor: '#4caf50',
                borderRadius: '50%'
              }} />
            )}
          </div>
          
          <div>
            <div style={{ fontWeight: 'bold' }}>{partner.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {partner.isOnline ? 'オンライン' : `最終ログイン: ${partner.lastSeen.toLocaleTimeString()}`}
            </div>
          </div>
        </div>

        {/* メッセージリスト */}
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          willChange: 'scroll-position'
        }}>
          {chatMessages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.senderId === currentUser.id}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
        </div>

        {/* 入力エリア */}
        <div style={{
          padding: '15px',
          backgroundColor: 'white',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            style={{
              flex: 1,
              padding: '12px 15px',
              border: '1px solid #ddd',
              borderRadius: '25px',
              outline: 'none',
              fontSize: '14px'
            }}
          />
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{
              padding: '12px 20px',
              backgroundColor: newMessage.trim() ? '#2196f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            送信
          </button>
        </div>
      </div>
    );
  }, [selectedChatId, chats, getChatPartner, chatMessages, currentUser.id, newMessage, sendMessage, handleKeyPress, handleInputChange, handleSuggestionClick]);

  // 設定ビュー
  const renderSettingsView = useCallback(() => (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '0 auto', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      transform: 'translateZ(0)',
      willChange: 'transform'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => setCurrentView('chats')}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '18px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>設定</h1>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>AIアシスタント</h3>
        {aiAssistants.map(ai => (
          <div key={ai.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #eee'
          }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{ai.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {ai.type === 'translator' && '自動翻訳機能'}
                {ai.type === 'emotion' && '感情分析・返答提案'}
                {ai.type === 'scheduler' && 'スケジュール管理'}
                {ai.type === 'general' && '汎用AIアシスタント'}
              </div>
            </div>
            <div 
              onClick={() => toggleAiAssistant(ai.id)}
              style={{
                width: '50px',
                height: '25px',
                backgroundColor: ai.isActive ? '#4caf50' : '#ccc',
                borderRadius: '15px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: '21px',
                height: '21px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: ai.isActive ? '27px' : '2px',
                transition: 'left 0.2s'
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>プロフィール</h3>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>{currentUser.avatar}</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{currentUser.name}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            {currentUser.isOnline ? 'オンライン' : 'オフライン'}
          </div>
        </div>
      </div>
    </div>
  ), [aiAssistants, currentUser, toggleAiAssistant]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
    };
  }, [inputTimeout]);

  // メインレンダリング
  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transform: 'translateZ(0)',
      willChange: 'transform'
    }}>
      {currentView === 'chats' && renderChatList()}
      {currentView === 'chat' && renderChatView()}
      {currentView === 'settings' && renderSettingsView()}
    </div>
  );
};

export default AiConnect;