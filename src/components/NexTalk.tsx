import React, { useState, useEffect } from 'react';

// Core Data Models
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: Date;
  status: 'online' | 'away' | 'busy' | 'offline';
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    aiAssistance: boolean;
  };
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  text: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'ai_response' | 'system';
  status: 'sent' | 'delivered' | 'read';
  isUser: boolean;
  isAI?: boolean;
  metadata?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    aiContext?: string;
    reactions?: Reaction[];
  };
}

interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'ai_chat';
  name?: string;
  participants: string[];
  lastMessage: Message | null;
  lastActivity: Date;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  settings: {
    notifications: boolean;
    aiEnabled: boolean;
  };
}

interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  avatar: string;
  isOnline: boolean;
  conversationId?: string;
  unreadCount?: number;
  isPinned?: boolean;
}

interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: Date;
}

interface AIContext {
  id: string;
  conversationId: string;
  context: string;
  timestamp: Date;
  tokens: number;
}

// API Service Layer
class APIService {
  private baseUrl = 'https://api.nextalk.com';

  // User Management
  async getUser(userId: string): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: userId,
          name: 'Current User',
          email: 'user@example.com',
          avatar: '👤',
          isOnline: true,
          lastSeen: new Date(),
          status: 'online',
          preferences: {
            theme: 'light',
            notifications: true,
            aiAssistance: true
          }
        });
      }, 100);
    });
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: userId,
          name: updates.name || 'Current User',
          email: updates.email || 'user@example.com',
          avatar: updates.avatar || '👤',
          isOnline: updates.isOnline ?? true,
          lastSeen: new Date(),
          status: updates.status || 'online',
          preferences: updates.preferences || {
            theme: 'light',
            notifications: true,
            aiAssistance: true
          }
        });
      }, 100);
    });
  }

  // Conversation Management
  async getConversations(): Promise<Conversation[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'conv_1',
            type: 'ai_chat',
            participants: ['user_1', 'ai_assistant'],
            lastMessage: null,
            lastActivity: new Date(),
            unreadCount: 0,
            isArchived: false,
            isPinned: true,
            settings: {
              notifications: true,
              aiEnabled: true
            }
          },
          {
            id: 'conv_2',
            type: 'direct',
            participants: ['user_1', 'user_2'],
            lastMessage: null,
            lastActivity: new Date(Date.now() - 3600000),
            unreadCount: 2,
            isArchived: false,
            isPinned: false,
            settings: {
              notifications: true,
              aiEnabled: false
            }
          }
        ]);
      }, 100);
    });
  }

  async createConversation(type: 'direct' | 'group' | 'ai_chat', participants: string[]): Promise<Conversation> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `conv_${Date.now()}`,
          type,
          participants,
          lastMessage: null,
          lastActivity: new Date(),
          unreadCount: 0,
          isArchived: false,
          isPinned: false,
          settings: {
            notifications: true,
            aiEnabled: type === 'ai_chat'
          }
        });
      }, 100);
    });
  }

  // Message Management
  async getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockMessages: Message[] = [
          {
            id: 'msg_1',
            conversationId,
            senderId: 'ai_assistant',
            text: 'こんにちは！NexTalkへようこそ。AIネイティブなコミュニケーションを体験してください。',
            timestamp: new Date(),
            type: 'text',
            status: 'read',
            isUser: false,
            isAI: true
          }
        ];
        resolve(mockMessages);
      }, 100);
    });
  }

  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...message,
          id: `msg_${Date.now()}`,
          timestamp: new Date(),
          status: 'sent'
        });
      }, 100);
    });
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  // AI Services
  async generateAIResponse(prompt: string, context?: AIContext): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          'とても興味深いですね！詳しく教えてください。',
          'それについて私もサポートできます。どのような点でお困りですか？',
          'なるほど！別の視点から考えてみましょう。',
          'そのアイデア、とても良いと思います！',
          'もう少し詳細を聞かせてください。',
          'AIの観点から分析すると、いくつかの選択肢があります。'
        ];
        resolve(responses[Math.floor(Math.random() * responses.length)]);
      }, 1000);
    });
  }

  async getAIContext(conversationId: string): Promise<AIContext[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 100);
    });
  }
}

// Data Store
class DataStore {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private users: Map<string, User> = new Map();
  private apiService = new APIService();

  async loadConversations(): Promise<Conversation[]> {
    const conversations = await this.apiService.getConversations();
    conversations.forEach(conv => this.conversations.set(conv.id, conv));
    return conversations;
  }

  async loadMessages(conversationId: string): Promise<Message[]> {
    const messages = await this.apiService.getMessages(conversationId);
    this.messages.set(conversationId, messages);
    return messages;
  }

  async addMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> {
    const newMessage = await this.apiService.sendMessage(message);
    const conversationMessages = this.messages.get(message.conversationId) || [];
    this.messages.set(message.conversationId, [...conversationMessages, newMessage]);
    return newMessage;
  }

  getConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) || [];
  }
}

const NexTalk: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'AI アシスタント',
      lastMessage: 'こんにちは！何かお手伝いできることはありますか？',
      timestamp: new Date(),
      avatar: '🤖',
      isOnline: true,
      conversationId: 'conv_1',
      unreadCount: 0,
      isPinned: true
    },
    {
      id: '2',
      name: '田中 太郎',
      lastMessage: '明日の会議の件で相談があります',
      timestamp: new Date(Date.now() - 3600000),
      avatar: '👨',
      isOnline: true,
      conversationId: 'conv_2',
      unreadCount: 2,
      isPinned: false
    },
    {
      id: '3',
      name: '佐藤 花子',
      lastMessage: 'ありがとうございました！',
      timestamp: new Date(Date.now() - 7200000),
      avatar: '👩',
      isOnline: false,
      conversationId: 'conv_3',
      unreadCount: 0,
      isPinned: false
    }
  ]);
  const [activeContact, setActiveContact] = useState<Contact | null>(contacts[0]);
  const [currentView, setCurrentView] = useState<'chat' | 'contacts'>('contacts');
  const [dataStore] = useState(new DataStore());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Initialize data store
    const initializeData = async () => {
      try {
        const apiService = new APIService();
        const user = await apiService.getUser('user_1');
        setCurrentUser(user);

        const convs = await dataStore.loadConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();
  }, [dataStore]);

  useEffect(() => {
    if (activeContact?.conversationId) {
      loadMessages(activeContact.conversationId);
    } else if (activeContact?.id === '1') {
      setMessages([
        {
          id: '1',
          conversationId: 'conv_1',
          senderId: 'ai_assistant',
          text: 'こんにちは！NexTalkへようこそ。AIネイティブなコミュニケーションを体験してください。',
          timestamp: new Date(),
          type: 'text',
          status: 'read',
          isUser: false,
          isAI: true
        }
      ]);
    } else {
      setMessages([
        {
          id: '1',
          conversationId: 'default',
          senderId: 'user_2',
          text: 'こんにちは！',
          timestamp: new Date(Date.now() - 1800000),
          type: 'text',
          status: 'read',
          isUser: false
        },
        {
          id: '2',
          conversationId: 'default',
          senderId: 'user_1',
          receiverId: 'user_2',
          text: 'お疲れ様です！',
          timestamp: new Date(Date.now() - 1200000),
          type: 'text',
          status: 'read',
          isUser: true
        }
      ]);
    }
  }, [activeContact]);

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await dataStore.loadMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContact) return;

    const conversationId = activeContact.conversationId || 'default';
    
    try {
      const newMessage = await dataStore.addMessage({
        conversationId,
        senderId: 'user_1',
        receiverId: activeContact.id === '1' ? 'ai_assistant' : activeContact.id,
        text: inputText,
        type: 'text',
        isUser: true
      });

      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // Update contact's last message
      setContacts(prev => prev.map(contact => 
        contact.id === activeContact.id 
          ? { ...contact, lastMessage: inputText, timestamp: new Date() }
          : contact
      ));

      // AI response for AI assistant
      if (activeContact?.id === '1') {
        setTimeout(async () => {
          try {
            const apiService = new APIService();
            const aiResponse = await apiService.generateAIResponse(inputText);
            
            const aiMessage = await dataStore.addMessage({
              conversationId,
              senderId: 'ai_assistant',
              receiverId: 'user_1',
              text: aiResponse,
              type: 'ai_response',
              isUser: false,
              isAI: true
            });

            setMessages(prev => [...prev, aiMessage]);
          } catch (error) {
            console.error('Failed to get AI response:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '400px',
    margin: '0 auto',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const contactListStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    background: 'white'
  };

  const contactItemStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #e1e8ed',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const chatContainerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'white'
  };

  const messagesStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    background: 'linear-gradient(to bottom, #e3f2fd, #f8f9fa)'
  };

  const messageStyle = (isUser: boolean, isAI?: boolean): React.CSSProperties => ({
    maxWidth: '70%',
    padding: '12px 16px',
    margin: '8px 0',
    borderRadius: '18px',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    background: isAI ? 'linear-gradient(135deg, #ff6b6b, #ee5a24)' :
                isUser ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f3f4',
    color: isUser || isAI ? 'white' : '#333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    animation: 'slideIn 0.3s ease-out',
    position: 'relative'
  });

  const inputContainerStyle: React.CSSProperties = {
    padding: '16px',
    background: 'white',
    borderTop: '1px solid #e1e8ed',
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e1e8ed',
    borderRadius: '24px',
    outline: 'none',
    fontSize: '16px',
    background: '#f8f9fa'
  };

  const sendButtonStyle: React.CSSProperties = {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.2s',
    fontSize: '14px'
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    background: 'white',
    borderTop: '1px solid #e1e8ed'
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '16px',
    textAlign: 'center',
    cursor: 'pointer',
    background: isActive ? '#667eea' : 'white',
    color: isActive ? 'white' : '#666',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.3s'
  });

  const unreadBadgeStyle: React.CSSProperties = {
    background: '#ff4444',
    color: 'white',
    borderRadius: '10px',
    padding: '2px 6px',
    fontSize: '12px',
    fontWeight: 'bold',
    minWidth: '18px',
    textAlign: 'center'
  };

  if (currentView === 'chat' && activeContact) {
    return (
      <div style={containerStyle}>
        <style>
          {`
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>
        <header style={headerStyle}>
          <button 
            onClick={() => setCurrentView('contacts')}
            style={{background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer'}}
          >
            ← 戻る
          </button>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <span style={{fontSize: '20px'}}>{activeContact.avatar}</span>
            <div>
              <div style={{fontWeight: 'bold'}}>{activeContact.name}</div>
              <div style={{fontSize: '12px', opacity: 0.8}}>
                {activeContact.isOnline ? 'オンライン' : 'オフライン'}
              </div>
            </div>
          </div>
          <div style={{fontSize: '20px'}}>⚙️</div>
        </header>

        <div style={chatContainerStyle}>
          <div style={messagesStyle}>
            {messages.map((message) => (
              <div key={message.id} style={{display: 'flex', flexDirection: 'column'}}>
                <div style={messageStyle(message.isUser, message.isAI)}>
                  {message.text}
                  <div style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    textAlign: 'right'
                  }}>
                    {message.status === 'read' ? '既読' : message.status === 'delivered' ? '配信済み' : '送信済み'}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                  margin: '4px 16px'
                }}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
          </div>

          <div style={inputContainerStyle}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="メッセージを入力..."
              style={inputStyle}
            />
            <button 
              onClick={handleSendMessage}
              style={sendButtonStyle}
            >
              送信
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>NexTalk</h1>
        <div style={{fontSize: '20px'}}>🚀</div>
      </header>

      <div style={contactListStyle}>
        {contacts
          .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.timestamp.getTime() - a.timestamp.getTime();
          })
          .map((contact) => (
          <div
            key={contact.id}
            style={{
              ...contactItemStyle,
              background: activeContact?.id === contact.id ? '#f0f2ff' : 'white'
            }}
            onClick={() => {
              setActiveContact(contact);
              setCurrentView('chat');
            }}
          >
            <div style={{
              fontSize: '32px',
              marginRight: '16px',
              position: 'relative'
            }}>
              {contact.avatar}
              {contact.isOnline && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '10px',
                  height: '10px',
                  background: '#4CAF50',
                  borderRadius: '50%',
                  border: '2px solid white'
                }} />
              )}
            </div>
            <div style={{flex: 1}}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {contact.isPinned && <span style={{fontSize: '12px'}}>📌</span>}
                  <h3 style={{
                    margin: 0,
                    fontWeight: 'bold',
                    color: '#333'
                  }}>
                    {contact.name}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    {formatTime(contact.timestamp)}
                  </span>
                  {(contact.unreadCount || 0) > 0 && (
                    <div style={unreadBadgeStyle}>
                      {contact.unreadCount}
                    </div>
                  )}
                </div>
              </div>
              <p style={{
                margin: 0,
                color: '#666',
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {contact.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={tabBarStyle}>
        <div 
          style={tabStyle(currentView === 'contacts')}
          onClick={() => setCurrentView('contacts')}
        >
          💬 チャット
        </div>
        <div 
          style={tabStyle(false)}
          onClick={() => alert('開発中の機能です')}
        >
          🤖 AI機能
        </div>
      </div>
    </div>
  );
};

export default NexTalk;