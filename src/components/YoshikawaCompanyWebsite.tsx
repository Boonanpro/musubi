import React, { useState, useEffect } from 'react';

const YoshikawaCompanyWebsite: React.FC = () => {
  const [currentSection, setCurrentSection] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sections = [
    { id: 'home', name: 'ホーム' },
    { id: 'about', name: '会社概要' },
    { id: 'services', name: 'サービス' },
    { id: 'works', name: '施工実績' },
    { id: 'contact', name: 'お問い合わせ' }
  ];

  const services = [
    {
      title: '特装車両製造',
      description: '消防車、救急車、パトカーなどの特殊車両の製造・改造を行っています。',
      image: '🚒'
    },
    {
      title: '車両整備・修理',
      description: '特殊車両から一般車両まで、幅広い車両の整備・修理に対応しています。',
      image: '🔧'
    },
    {
      title: 'カスタムボディ製作',
      description: 'お客様のご要望に応じた特殊ボディの設計・製作を承ります。',
      image: '🚛'
    }
  ];

  const works = [
    { title: '消防車両改造', client: '米子市消防署', year: '2023年' },
    { title: '救急車メンテナンス', client: '鳥取県西部医療センター', year: '2023年' },
    { title: '特装トラック製作', client: '地方自治体', year: '2022年' }
  ];

  const styles = {
    container: {
      fontFamily: '"Noto Sans JP", Arial, sans-serif',
      margin: 0,
      padding: 0,
      lineHeight: 1.6,
      color: '#333'
    },
    header: {
      backgroundColor: '#2c5aa0',
      color: 'white',
      padding: '1rem 0',
      position: 'fixed' as const,
      top: 0,
      width: '100%',
      zIndex: 1000,
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold'
    },
    nav: {
      display: 'flex',
      gap: '2rem'
    },
    navItem: {
      cursor: 'pointer',
      padding: '0.5rem 1rem',
      borderRadius: '5px',
      transition: 'background-color 0.3s'
    },
    navItemActive: {
      backgroundColor: 'rgba(255,255,255,0.2)'
    },
    mobileMenuButton: {
      display: 'none',
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '1.5rem',
      cursor: 'pointer'
    },
    main: {
      marginTop: '80px',
      minHeight: 'calc(100vh - 80px)'
    },
    section: {
      padding: '4rem 20px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    hero: {
      backgroundColor: '#f5f7fa',
      textAlign: 'center' as const,
      padding: '6rem 20px'
    },
    heroTitle: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: '#2c5aa0'
    },
    heroSubtitle: {
      fontSize: '1.2rem',
      color: '#666',
      marginBottom: '2rem'
    },
    button: {
      backgroundColor: '#e74c3c',
      color: 'white',
      padding: '1rem 2rem',
      border: 'none',
      borderRadius: '5px',
      fontSize: '1.1rem',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    sectionTitle: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '3rem',
      textAlign: 'center' as const,
      color: '#2c5aa0'
    },
    serviceGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      marginTop: '2rem'
    },
    serviceCard: {
      backgroundColor: '#fff',
      padding: '2rem',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      textAlign: 'center' as const
    },
    serviceIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    serviceTitle: {
      fontSize: '1.3rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: '#2c5aa0'
    },
    worksList: {
      display: 'grid',
      gap: '1rem',
      marginTop: '2rem'
    },
    workItem: {
      backgroundColor: '#fff',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #2c5aa0'
    },
    companyInfo: {
      backgroundColor: '#f9f9f9',
      padding: '2rem',
      borderRadius: '10px',
      marginTop: '2rem'
    },
    companyTable: {
      width: '100%',
      borderCollapse: 'collapse' as const
    },
    companyTableRow: {
      borderBottom: '1px solid #ddd'
    },
    companyTableHeader: {
      padding: '1rem',
      backgroundColor: '#2c5aa0',
      color: 'white',
      textAlign: 'left' as const,
      width: '30%'
    },
    companyTableData: {
      padding: '1rem'
    },
    contactForm: {
      backgroundColor: '#f9f9f9',
      padding: '2rem',
      borderRadius: '10px',
      marginTop: '2rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: 'bold',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '1rem'
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '5px',
      fontSize: '1rem',
      minHeight: '120px',
      resize: 'vertical' as const
    },
    footer: {
      backgroundColor: '#333',
      color: 'white',
      textAlign: 'center' as const,
      padding: '2rem',
      marginTop: '4rem'
    }
  };

  const renderHome = () => (
    <>
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>有限会社吉川特装</h1>
        <p style={styles.heroSubtitle}>
          鳥取県米子市で特装車両の製造・整備を手がけて30年<br/>
          確かな技術で地域の安全を支えます
        </p>
        <button 
          style={styles.button}
          onClick={() => setCurrentSection('contact')}
        >
          お問い合わせ
        </button>
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>主なサービス</h2>
        <div style={styles.serviceGrid}>
          {services.map((service, index) => (
            <div key={index} style={styles.serviceCard}>
              <div style={styles.serviceIcon}>{service.image}</div>
              <h3 style={styles.serviceTitle}>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderAbout = () => (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>会社概要</h2>
      <div style={styles.companyInfo}>
        <table style={styles.companyTable}>
          <tbody>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>会社名</td>
              <td style={styles.companyTableData}>有限会社吉川特装</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>所在地</td>
              <td style={styles.companyTableData}>〒683-0000 鳥取県米子市○○町1-2-3</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>電話番号</td>
              <td style={styles.companyTableData}>0859-xx-xxxx</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>FAX番号</td>
              <td style={styles.companyTableData}>0859-xx-xxxx</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>設立</td>
              <td style={styles.companyTableData}>1993年</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>代表者</td>
              <td style={styles.companyTableData}>代表取締役 吉川 ○○</td>
            </tr>
            <tr style={styles.companyTableRow}>
              <td style={styles.companyTableHeader}>事業内容</td>
              <td style={styles.companyTableData}>
                特装車両の製造・改造・整備<br/>
                一般車両の整備・修理<br/>
                カスタムボディの設計・製作
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style={{marginTop: '2rem', lineHeight: '1.8'}}>
        有限会社吉川特装は1993年の設立以来、鳥取県米子市を拠点に特装車両の製造・整備を手がけてまいりました。
        消防車、救急車、パトカーなどの緊急車両から、特殊用途車まで幅広く対応し、
        地域の安全・安心を支える車両づくりに取り組んでいます。
      </p>
    </div>
  );

  const renderServices = () => (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>サービス</h2>
      <div style={styles.serviceGrid}>
        {services.map((service, index) => (
          <div key={index} style={styles.serviceCard}>
            <div style={styles.serviceIcon}>{service.image}</div>
            <h3 style={styles.serviceTitle}>{service.title}</h3>
            <p>{service.description}</p>
          </div>
        ))}
      </div>
      <div style={{marginTop: '3rem'}}>
        <h3 style={{fontSize: '1.5rem', marginBottom: '1rem', color: '#2c5aa0'}}>対応車両</h3>
        <ul style={{listStyle: 'none', padding: 0}}>
          <li style={{padding: '0.5rem 0', borderBottom: '1px solid #eee'}}>🚒 消防車両（ポンプ車、はしご車、救助車等）</li>
          <li style={{padding: '0.5rem 0', borderBottom: '1px solid #eee'}}>🚑 救急車両</li>
          <li style={{padding: '0.5rem 0', borderBottom: '1px solid #eee'}}>🚔 警察車両（パトカー、交通取締車等）</li>
          <li style={{padding: '0.5rem 0', borderBottom: '1px solid #eee'}}>🚛 特殊用途車（クレーン車、高所作業車等）</li>
          <li style={{padding: '0.5rem 0', borderBottom: '1px solid #eee'}}>🚐 その他特装車両</li>
        </ul>
      </div>
    </div>
  );

  const renderWorks = () => (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>施工実績</h2>
      <div style={styles.worksList}>
        {works.map((work, index) => (
          <div key={index} style={styles.workItem}>
            <h3 style={{margin: '0 0 0.5rem 0', color: '#2c5aa0'}}>{work.title}</h3>
            <p style={{margin: '0', color: '#666'}}>
              <strong>発注者:</strong> {work.client} | <strong>施工年:</strong> {work.year}
            </p>
          </div>
        ))}
      </div>
      <div style={{marginTop: '3rem', textAlign: 'center'}}>
        <p style={{fontSize: '1.1rem', marginBottom: '1rem'}}>
          その他多数の実績がございます。<br/>
          詳細はお気軽にお問い合わせください。
        </p>
        <button 
          style={styles.button}
          onClick={() => setCurrentSection('contact')}
        >
          実績についてお問い合わせ
        </button>
      </div>
    </div>
  );

  const renderContact = () => (
    <div style={styles.section}>
      <h2 style={styles.sectionTitle}>お問い合わせ</h2>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem'}}>
        <div>
          <h3 style={{color: '#2c5aa0', marginBottom: '1rem'}}>お電話でのお問い合わせ</h3>
          <p style={{fontSize: '1.5rem', color: '#2c5aa0', fontWeight: 'bold'}}>0859-xx-xxxx</p>
          <p>営業時間: 平日 8:00～17:00</p>
        </div>
        <div>
          <h3 style={{color: '#2c5aa0', marginBottom: '1rem'}}>アクセス</h3>
          <p>
            〒683-0000<br/>
            鳥取県米子市○○町1-2-3<br/>
            JR米子駅から車で15分
          </p>
        </div>
      </div>
      
      <div style={styles.contactForm}>
        <h3 style={{marginBottom: '1.5rem', color: '#2c5aa0'}}>メールでのお問い合わせ</h3>
        <form>
          <div style={styles.formGroup}>
            <label style={styles.label}>お名前 *</label>
            <input type="text" style={styles.input} placeholder="お名前を入力してください" required />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>会社名</label>
            <input type="text" style={styles.input} placeholder="会社名を入力してください" />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>メールアドレス *</label>
            <input type="email" style={styles.input} placeholder="メールアドレスを入力してください" required />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>電話番号</label>
            <input type="tel" style={styles.input} placeholder="電話番号を入力してください" />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>お問い合わせ内容 *</label>
            <textarea 
              style={styles.textarea} 
              placeholder="お問い合わせ内容を詳しくお書きください"
              required
            />
          </div>
          
          <button type="submit" style={styles.button}>
            送信する
          </button>
        </form>
      </div>
    </div>
  );

  const renderContent = () => {
    switch(currentSection) {
      case 'about': return renderAbout();
      case 'services': return renderServices();
      case 'works': return renderWorks();
      case 'contact': return renderContact();
      default: return renderHome();
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>有限会社吉川特装</div>
          <nav style={styles.nav}>
            {sections.map(section => (
              <div
                key={section.id}
                style={{
                  ...styles.navItem,
                  ...(currentSection === section.id ? styles.navItemActive : {})
                }}
                onClick={() => setCurrentSection(section.id)}
              >
                {section.name}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        {renderContent()}
      </main>

      <footer style={styles.footer}>
        <p>&copy; 2023 有限会社吉川特装. All rights reserved.</p>
        <p>〒683-0000 鳥取県米子市○○町1-2-3 | TEL: 0859-xx-xxxx</p>
      </footer>
    </div>
  );
};

export default YoshikawaCompanyWebsite;