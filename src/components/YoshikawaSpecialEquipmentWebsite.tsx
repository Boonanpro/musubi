import React, { useState } from 'react';

const YoshikawaSpecialEquipmentWebsite: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');

  // 基本情報
  const companyInfo = {
    name: '有限会社 吉川特装',
    address: '鳥取県米子市',
    phone: '0859-XX-XXXX',
    email: 'info@yoshikawa-tokuso.co.jp',
    businessHours: '平日 8:00-17:00',
    services: [
      '特殊車両製造',
      '車両改造・カスタマイズ',
      '産業機械製造',
      'メンテナンス・修理',
      'オーダーメイド設計'
    ]
  };

  // カラーパレット
  const colors = {
    primary: '#1e3a8a',      // 深いブルー（信頼性・技術力）
    primaryLight: '#3b82f6', // ライトブルー
    secondary: '#f97316',    // オレンジ（活力・革新）
    secondaryLight: '#fb923c',
    dark: '#1f2937',         // ダークグレー
    light: '#f8fafc',        // ライトグレー
    white: '#ffffff',
    text: '#374151',
    textLight: '#6b7280',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b'
  };

  // 共通スタイル
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px'
    },
    section: {
      padding: '80px 20px'
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      padding: '30px',
      border: `1px solid ${colors.border}`,
      transition: 'all 0.3s ease'
    },
    button: {
      padding: '15px 30px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-block',
      textAlign: 'center' as const
    },
    primaryButton: {
      backgroundColor: colors.primary,
      color: colors.white,
    },
    secondaryButton: {
      backgroundColor: colors.secondary,
      color: colors.white,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
    }
  };

  // ページコンテンツ
  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div>
            {/* ヒーローセクション */}
            <section style={{ 
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
              padding: '120px 20px',
              textAlign: 'center',
              color: colors.white,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 背景装飾 */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-15%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                zIndex: 0
              }} />
              
              <div style={{ ...styles.container, position: 'relative', zIndex: 1 }}>
                <h1 style={{ 
                  fontSize: 'clamp(32px, 5vw, 64px)',
                  fontWeight: '700',
                  marginBottom: '20px',
                  lineHeight: '1.2',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  有限会社 吉川特装
                </h1>
                <p style={{ 
                  fontSize: 'clamp(18px, 3vw, 28px)',
                  marginBottom: '20px',
                  opacity: 0.9,
                  fontWeight: '300'
                }}>
                  鳥取県米子市の特殊車両・産業機械のプロフェッショナル
                </p>
                <p style={{ 
                  fontSize: '18px',
                  marginBottom: '50px',
                  opacity: 0.8,
                  maxWidth: '600px',
                  margin: '0 auto 50px'
                }}>
                  確かな技術力と豊富な経験で、お客様の特別なニーズにお応えします
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setCurrentPage('services')}
                    style={{ 
                      ...styles.button,
                      ...styles.secondaryButton,
                      fontSize: '18px',
                      padding: '18px 36px',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                      transform: 'translateY(0)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(249, 115, 22, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                    }}
                  >
                    サービス内容を見る
                  </button>
                  <button 
                    onClick={() => setCurrentPage('contact')}
                    style={{ 
                      ...styles.button,
                      ...styles.outlineButton,
                      fontSize: '18px',
                      padding: '18px 36px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: colors.white,
                      border: `2px solid ${colors.white}`,
                      backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.white;
                      e.currentTarget.style.color = colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = colors.white;
                    }}
                  >
                    お問い合わせ
                  </button>
                </div>
              </div>
            </section>
            
            {/* 強みセクション */}
            <section style={{ ...styles.section, backgroundColor: colors.light }}>
              <div style={styles.container}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                  <h2 style={{ 
                    fontSize: 'clamp(28px, 4vw, 42px)',
                    color: colors.dark,
                    marginBottom: '20px',
                    fontWeight: '700'
                  }}>
                    私たちの強み
                  </h2>
                  <div style={{
                    width: '80px',
                    height: '4px',
                    backgroundColor: colors.secondary,
                    margin: '0 auto',
                    borderRadius: '2px'
                  }} />
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                  gap: '30px' 
                }}>
                  {[
                    {
                      title: '豊富な経験',
                      description: '長年にわたる特殊車両製造の経験と技術で、お客様のニーズに最適な解決策を提供します。',
                      icon: '🔧'
                    },
                    {
                      title: 'オーダーメイド対応',
                      description: '標準的な車両では対応できない特殊な要求にも、一台一台丁寧にカスタマイズして対応します。',
                      icon: '⚙️'
                    },
                    {
                      title: '地域密着',
                      description: '鳥取県米子市を拠点に、中国地方全域のお客様に迅速なサービスを提供しています。',
                      icon: '🏢'
                    }
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      style={{
                        ...styles.card,
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                      }}
                    >
                      <div style={{
                        fontSize: '48px',
                        marginBottom: '20px',
                        display: 'block'
                      }}>
                        {item.icon}
                      </div>
                      <h3 style={{ 
                        color: colors.dark, 
                        marginBottom: '15px',
                        fontSize: '24px',
                        fontWeight: '600'
                      }}>
                        {item.title}
                      </h3>
                      <p style={{ 
                        color: colors.textLight, 
                        lineHeight: '1.6',
                        fontSize: '16px'
                      }}>
                        {item.description}
                      </p>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA セクション */}
            <section style={{ 
              ...styles.section, 
              backgroundColor: colors.dark,
              color: colors.white,
              textAlign: 'center'
            }}>
              <div style={styles.container}>
                <h2 style={{ 
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  marginBottom: '20px',
                  fontWeight: '700'
                }}>
                  お客様のご要望をお聞かせください
                </h2>
                <p style={{ 
                  fontSize: '18px',
                  marginBottom: '40px',
                  opacity: 0.8,
                  maxWidth: '600px',
                  margin: '0 auto 40px'
                }}>
                  どんな特殊な要求でも、まずはお気軽にご相談ください。<br />
                  経験豊富なスタッフが最適なソリューションをご提案いたします。
                </p>
                <button 
                  onClick={() => setCurrentPage('contact')}
                  style={{ 
                    ...styles.button,
                    ...styles.secondaryButton,
                    fontSize: '18px',
                    padding: '18px 40px',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.secondaryLight;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  今すぐお問い合わせ
                </button>
              </div>
            </section>
          </div>
        );
        
      case 'services':
        return (
          <div style={{ backgroundColor: colors.light, minHeight: '80vh' }}>
            <section style={styles.section}>
              <div style={styles.container}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                  <h1 style={{ 
                    fontSize: 'clamp(32px, 5vw, 48px)',
                    color: colors.dark,
                    marginBottom: '20px',
                    fontWeight: '700'
                  }}>
                    サービス内容
                  </h1>
                  <div style={{
                    width: '100px',
                    height: '4px',
                    backgroundColor: colors.secondary,
                    margin: '0 auto',
                    borderRadius: '2px'
                  }} />
                </div>
                <div style={{ display: 'grid', gap: '30px' }}>
                  {companyInfo.services.map((service, index) => (
                    <div 
                      key={index} 
                      style={{
                        ...styles.card,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '30px',
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderLeft = `6px solid ${colors.primary}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderLeft = `1px solid ${colors.border}`;
                      }}
                    >
                      <div style={{
                        minWidth: '80px',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: colors.primary,
                        color: colors.white,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: '700'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          color: colors.dark, 
                          marginBottom: '15px', 
                          fontSize: '28px',
                          fontWeight: '600'
                        }}>
                          {service}
                        </h3>
                        <p style={{ 
                          color: colors.textLight, 
                          fontSize: '16px', 
                          lineHeight: '1.7',
                          marginBottom: '20px'
                        }}>
                          お客様の具体的なご要望に合わせて、最適なソリューションを提供いたします。
                          豊富な経験と確かな技術力で、どのような特殊な要求にもお応えします。
                        </p>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: colors.primary,
                          fontSize: '14px',
                          fontWeight: '600',
                          gap: '8px'
                        }}>
                          詳細はお問い合わせください →
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );
        
      case 'contact':
        return (
          <div style={{ backgroundColor: colors.light, minHeight: '80vh' }}>
            <section style={styles.section}>
              <div style={styles.container}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                  <h1 style={{ 
                    fontSize: 'clamp(32px, 5vw, 48px)',
                    color: colors.dark,
                    marginBottom: '20px',
                    fontWeight: '700'
                  }}>
                    お問い合わせ
                  </h1>
                  <div style={{
                    width: '100px',
                    height: '4px',
                    backgroundColor: colors.secondary,
                    margin: '0 auto',
                    borderRadius: '2px'
                  }} />
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '40px' 
                }}>
                  <div style={styles.card}>
                    <h3 style={{ 
                      color: colors.dark, 
                      marginBottom: '30px',
                      fontSize: '24px',
                      fontWeight: '600'
                    }}>
                      会社情報
                    </h3>
                    <div style={{ color: colors.text, lineHeight: '2' }}>
                      {[
                        { label: '会社名', value: companyInfo.name },
                        { label: '所在地', value: companyInfo.address },
                        { label: '電話番号', value: companyInfo.phone },
                        { label: 'メール', value: companyInfo.email },
                        { label: '営業時間', value: companyInfo.businessHours }
                      ].map((item, index) => (
                        <div 
                          key={index}
                          style={{
                            display: 'flex',
                            marginBottom: '15px',
                            padding: '12px 0',
                            borderBottom: `1px solid ${colors.border}`
                          }}
                        >
                          <strong style={{ 
                            minWidth: '120px',
                            color: colors.primary,
                            fontWeight: '600'
                          }}>
                            {item.label}:
                          </strong>
                          <span style={{ marginLeft: '20px' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{
                      marginTop: '30px',
                      padding: '20px',
                      backgroundColor: colors.light,
                      borderRadius: '8px',
                      borderLeft: `4px solid ${colors.success}`
                    }}>
                      <p style={{ 
                        color: colors.text,
                        fontSize: '14px',
                        margin: 0,
                        lineHeight: '1.6'
                      }}>
                        <strong>📞 お急ぎの場合は直接お電話ください</strong><br />
                        営業時間内であれば、すぐにご対応いたします。
                      </p>
                    </div>
                  </div>
                  
                  <div style={styles.card}>
                    <h3 style={{ 
                      color: colors.dark, 
                      marginBottom: '30px',
                      fontSize: '24px',
                      fontWeight: '600'
                    }}>
                      お問い合わせフォーム
                    </h3>
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          color: colors.text,
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          お名前 <span style={{ color: colors.secondary }}>*</span>
                        </label>
                        <input 
                          type="text" 
                          placeholder="山田 太郎" 
                          style={{ 
                            width: '100%',
                            padding: '15px', 
                            border: `2px solid ${colors.border}`, 
                            borderRadius: '8px',
                            fontSize: '16px',
                            transition: 'border-color 0.3s ease',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.primary;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                          }}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          color: colors.text,
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          メールアドレス <span style={{ color: colors.secondary }}>*</span>
                        </label>
                        <input 
                          type="email" 
                          placeholder="example@email.com" 
                          style={{ 
                            width: '100%',
                            padding: '15px', 
                            border: `2px solid ${colors.border}`, 
                            borderRadius: '8px',
                            fontSize: '16px',
                            transition: 'border-color 0.3s ease',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.primary;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                          }}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          color: colors.text,
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          お問い合わせ内容 <span style={{ color: colors.secondary }}>*</span>
                        </label>
                        <textarea 
                          placeholder="どのようなご要望でも、お気軽にお聞かせください..." 
                          rows={6}
                          style={{ 
                            width: '100%',
                            padding: '15px', 
                            border: `2px solid ${colors.border}`, 
                            borderRadius: '8px',
                            fontSize: '16px',
                            resize: 'vertical',
                            transition: 'border-color 0.3s ease',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.primary;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                          }}
                        />
                      </div>
                      <button 
                        type="submit" 
                        style={{ 
                          ...styles.button,
                          ...styles.primaryButton,
                          fontSize: '18px',
                          padding: '18px',
                          boxShadow: `0 4px 12px rgba(30, 58, 138, 0.3)`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primaryLight;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primary;
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        送信する
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
        
      default:
        return (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <h2 style={{ color: colors.dark, fontSize: '32px' }}>ページが見つかりません</h2>
          </div>
        );
    }
  };

  return (
    <div style={{ 
      fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic Medium', 'Meiryo', sans-serif",
      minHeight: '100vh',
      backgroundColor: colors.white,
      color: colors.text
    }}>
      {/* ヘッダー */}
      <header style={{ 
        backgroundColor: colors.white,
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: `1px solid ${colors.border}`
      }}>
        <div style={{ ...styles.container, padding: '0 20px' }}>
          <nav style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            height: '80px'
          }}>
            <div 
              onClick={() => setCurrentPage('home')}
              style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                cursor: 'pointer',
                color: colors.primary,
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.primary;
              }}
            >
              吉川特装
            </div>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
              {[
                { key: 'home', label: 'ホーム' },
                { key: 'services', label: 'サービス' },
                { key: 'contact', label: 'お問い合わせ' }
              ].map((nav) => (
                <button 
                  key={nav.key}
                  onClick={() => setCurrentPage(nav.key)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: currentPage === nav.key ? colors.primary : colors.text, 
                    fontSize: '18px', 
                    cursor: 'pointer',
                    fontWeight: currentPage === nav.key ? '600' : '400',
                    padding: '10px 0',
                    position: 'relative',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = currentPage === nav.key ? colors.primary : colors.text;
                  }}
                >
                  {nav.label}
                  {currentPage === nav.key && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: colors.secondary,
                      borderRadius: '2px'
                    }} />
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main>
        {renderPage()}
      </main>

      {/* フッター */}
      <footer style={{ 
        backgroundColor: colors.dark,
        color: colors.white,
        textAlign: 'center',
        padding: '50px 20px 30px',
        marginTop: '0'
      }}>
        <div style={styles.container}>
          <div style={{
            borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
            paddingTop: '30px'
          }}>
            <p style={{ 
              margin: 0,
              fontSize: '16px',
              opacity: 0.8
            }}>
              &copy; 2024 {companyInfo.name}. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default YoshikawaSpecialEquipmentWebsite;