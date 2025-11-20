import React, { useState } from 'react';

const YoshikawaSpecialBodyworks: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('home');

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '1rem 0',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const navStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 1rem'
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  };

  const menuStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2rem',
    listStyle: 'none',
    margin: 0,
    padding: 0
  };

  const menuItemStyle: React.CSSProperties = {
    cursor: 'pointer',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background-color 0.3s'
  };

  const mainStyle: React.CSSProperties = {
    marginTop: '80px',
    minHeight: 'calc(100vh - 80px)'
  };

  const heroStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '4rem 1rem',
    textAlign: 'center'
  };

  const heroTitleStyle: React.CSSProperties = {
    fontSize: '3rem',
    marginBottom: '1rem',
    fontWeight: 'bold'
  };

  const heroSubtitleStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    marginBottom: '2rem',
    opacity: 0.9
  };

  const ctaButtonStyle: React.CSSProperties = {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    borderRadius: '50px',
    cursor: 'pointer',
    transition: 'transform 0.3s, box-shadow 0.3s',
    boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)'
  };

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '4rem 1rem'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#2c3e50'
  };

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s, box-shadow 0.3s'
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#2c3e50',
    fontWeight: 'bold'
  };

  const footerStyle: React.CSSProperties = {
    backgroundColor: '#34495e',
    color: 'white',
    padding: '3rem 1rem 1rem',
    marginTop: '4rem'
  };

  const companyInfoStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  };

  const contactFormStyle: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.8rem',
    margin: '0.5rem 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical'
  };

  const renderHomePage = () => (
    <>
      <section style={heroStyle}>
        <h1 style={heroTitleStyle}>有限会社吉川特装</h1>
        <p style={heroSubtitleStyle}>鳥取県米子市の特装車両・産業機械のプロフェッショナル</p>
        <button 
          style={ctaButtonStyle}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(231, 76, 60, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(231, 76, 60, 0.3)';
          }}
          onClick={() => setCurrentPage('contact')}
        >
          今すぐお問い合わせ
        </button>
      </section>

      <section style={{...sectionStyle, backgroundColor: '#f8f9fa'}}>
        <h2 style={sectionTitleStyle}>当社の強み</h2>
        <div style={cardGridStyle}>
          <div 
            style={cardStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <h3 style={cardTitleStyle}>豊富な経験と実績</h3>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              長年にわたり特装車両の設計・製造に携わり、お客様のニーズに応える確かな技術力を培ってきました。
            </p>
          </div>
          <div 
            style={cardStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <h3 style={cardTitleStyle}>カスタマイズ対応</h3>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              お客様の業務内容や要望に合わせて、オーダーメイドでの特装車両製造を行っています。
            </p>
          </div>
          <div 
            style={cardStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <h3 style={cardTitleStyle}>アフターサポート</h3>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              納車後のメンテナンスやトラブル対応まで、長期にわたってお客様をサポートいたします。
            </p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>主要サービス</h2>
        <div style={cardGridStyle}>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>特装車両製造</h3>
            <ul style={{color: '#666', lineHeight: '1.8'}}>
              <li>ダンプトラック改造</li>
              <li>冷凍・冷蔵車製造</li>
              <li>移動販売車製造</li>
              <li>作業車改造</li>
            </ul>
          </div>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>産業機械</h3>
            <ul style={{color: '#666', lineHeight: '1.8'}}>
              <li>コンベヤシステム</li>
              <li>産業用機械設計</li>
              <li>自動化設備</li>
              <li>メンテナンス・修理</li>
            </ul>
          </div>
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>その他サービス</h3>
            <ul style={{color: '#666', lineHeight: '1.8'}}>
              <li>設計コンサルティング</li>
              <li>既存設備改修</li>
              <li>定期メンテナンス</li>
              <li>緊急修理対応</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );

  const renderAboutPage = () => (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>会社概要</h2>
      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <tbody>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50', width: '30%'}}>会社名</td>
                <td style={{padding: '1rem', color: '#666'}}>有限会社吉川特装</td>
              </tr>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50'}}>設立</td>
                <td style={{padding: '1rem', color: '#666'}}>1985年</td>
              </tr>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50'}}>所在地</td>
                <td style={{padding: '1rem', color: '#666'}}>〒683-0000 鳥取県米子市○○町○○番地</td>
              </tr>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50'}}>代表者</td>
                <td style={{padding: '1rem', color: '#666'}}>代表取締役 吉川 ○○</td>
              </tr>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50'}}>従業員数</td>
                <td style={{padding: '1rem', color: '#666'}}>15名</td>
              </tr>
              <tr style={{borderBottom: '1px solid #eee'}}>
                <td style={{padding: '1rem', fontWeight: 'bold', color: '#2c3e50'}}>事業内容</td>
                <td style={{padding: '1rem', color: '#666'}}>
                  特装車両の設計・製造<br/>
                  産業機械の設計・製造<br/>
                  メンテナンス・修理サービス
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{marginTop: '3rem', backgroundColor: '#f8f9fa', padding: '2rem', borderRadius: '8px'}}>
          <h3 style={{color: '#2c3e50', marginBottom: '1rem'}}>会社理念</h3>
          <p style={{color: '#666', lineHeight: '1.8', fontSize: '1.1rem'}}>
            私たち有限会社吉川特装は、お客様のビジネスをサポートする特装車両と産業機械を通じて、
            地域社会の発展に貢献することを使命としています。確かな技術力と真摯な姿勢で、
            お客様のご要望にお応えし、長期的なパートナーシップを築いてまいります。
          </p>
        </div>
      </div>
    </section>
  );

  const renderServicesPage = () => (
    <section style={sectionStyle}>
      <h2 style={sectionTitleStyle}>サービス詳細</h2>
      
      <div style={{marginBottom: '4rem'}}>
        <h3 style={{...cardTitleStyle, fontSize: '2rem', textAlign: 'center', marginBottom: '2rem'}}>特装車両製造</h3>
        <div style={cardGridStyle}>
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>ダンプトラック改造</h4>
            <p style={{color: '#666', lineHeight: '1.6', marginBottom: '1rem'}}>
              標準のトラックを、お客様の用途に合わせたダンプトラックに改造いたします。
            </p>
            <ul style={{color: '#666', paddingLeft: '1.2rem'}}>
              <li>土砂運搬用ダンプ</li>
              <li>産業廃棄物運搬用ダンプ</li>
              <li>除雪作業用ダンプ</li>
            </ul>
          </div>
          
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>冷凍・冷蔵車製造</h4>
            <p style={{color: '#666', lineHeight: '1.6', marginBottom: '1rem'}}>
              食品や医薬品の運搬に最適な温度管理システムを搭載した車両を製造します。
            </p>
            <ul style={{color: '#666', paddingLeft: '1.2rem'}}>
              <li>食品配送用冷蔵車</li>
              <li>医薬品配送用車両</li>
              <li>移動販売用冷凍車</li>
            </ul>
          </div>
          
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>移動販売車製造</h4>
            <p style={{color: '#666', lineHeight: '1.6', marginBottom: '1rem'}}>
              キッチンカーや移動店舗など、営業に必要な設備を完備した車両を製造します。
            </p>
            <ul style={{color: '#666', paddingLeft: '1.2rem'}}>
              <li>フードトラック</li>
              <li>移動店舗車</li>
              <li>イベント用販売車</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '4rem'}}>
        <h3 style={{...cardTitleStyle, fontSize: '2rem', textAlign: 'center', marginBottom: '2rem'}}>産業機械</h3>
        <div style={cardGridStyle}>
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>コンベヤシステム</h4>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              工場や物流センターでの効率的な搬送システムを設計・製造いたします。
              お客様の作業環境に最適化されたシステムをご提案します。
            </p>
          </div>
          
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>自動化設備</h4>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              人手不足解消と作業効率向上を実現する自動化設備を設計・製造します。
              既存の設備との連携も考慮したシステムをご提案いたします。
            </p>
          </div>
          
          <div style={cardStyle}>
            <h4 style={cardTitleStyle}>メンテナンス・修理</h4>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              機械の故障や不具合に迅速に対応し、お客様の業務停止時間を最小限に抑えます。
              定期メンテナンスプランもご用意しております。
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderContactPage = () => {
    const [formData, setFormData] = useState({
      name: '',
      company: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      alert('お問い合わせありがとうございます。担当者より折り返しご連絡いたします。');
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    };

    return (
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>お問い合わせ</h2>
        
        <div style={contactFormStyle}>
          <p style={{color: '#666', marginBottom: '2rem', textAlign: 'center'}}>
            ご質問やお見積りのご依頼など、お気軽にお問い合わせください。
          </p>
          
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                お名前 <span style={{color: '#e74c3c'}}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={inputStyle}
                placeholder="山田 太郎"
              />
            </div>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                会社名・団体名
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="株式会社○○"
              />
            </div>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                メールアドレス <span style={{color: '#e74c3c'}}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={inputStyle}
                placeholder="example@email.com"
              />
            </div>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                電話番号
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                style={inputStyle}
                placeholder="0859-xx-xxxx"
              />
            </div>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                お問い合わせ内容 <span style={{color: '#e74c3c'}}>*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                style={inputStyle}
              >
                <option value="">選択してください</option>
                <option value="特装車両について">特装車両について</option>
                <option value="産業機械について">産業機械について</option>
                <option value="メンテナンスについて">メンテナンスについて</option>
                <option value="見積り依頼">見積り依頼</option>
                <option value="その他">その他</option>
              </select>
            </div>
            
            <div style={{marginBottom: '2rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', color: '#2c3e50', fontWeight: 'bold'}}>
                詳細内容 <span style={{color: '#e74c3c'}}>*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                style={textareaStyle}
                placeholder="お問い合わせの詳細をご記入ください。"
              />
            </div>
            
            <button
              type="submit"
              style={{
                ...ctaButtonStyle,
                width: '100%',
                fontSize: '1.1rem'
              }}
            >
              送信する
            </button>
          </form>
        </div>
        
        <div style={{...companyInfoStyle, marginTop: '4rem'}}>
          <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <h3 style={{color: '#2c3e50', marginBottom: '1rem'}}>お電話でのお問い合わせ</h3>
            <p style={{color: '#666', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>0859-xx-xxxx</p>
            <p style={{color: '#666'}}>平日 9:00-18:00</p>
          </div>
          
          <div style={{backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
            <h3 style={{color: '#2c3e50', marginBottom: '1rem'}}>所在地</h3>
            <p style={{color: '#666', lineHeight: '1.6'}}>
              〒683-0000<br/>
              鳥取県米子市○○町○○番地<br/>
              有限会社吉川特装
            </p>
          </div>
        </div>
      </section>
    );
  };

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 'about':
        return renderAboutPage();
      case 'services':
        return renderServicesPage();
      case 'contact':
        return renderContactPage();
      default:
        return renderHomePage();
    }
  };

  return (
    <div style={{fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, backgroundColor: '#f8f9fa'}}>
      <header style={headerStyle}>
        <nav style={navStyle}>
          <div style={logoStyle}>吉川特装</div>
          <ul style={menuStyle}>
            <li 
              style={{
                ...menuItemStyle,
                backgroundColor: currentPage === 'home' ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
              onClick={() => setCurrentPage('home')}
              onMouseOver={(e) => {
                if (currentPage !== 'home') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 'home') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              ホーム
            </li>
            <li 
              style={{
                ...menuItemStyle,
                backgroundColor: currentPage === 'about' ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
              onClick={() => setCurrentPage('about')}
              onMouseOver={(e) => {
                if (currentPage !== 'about') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 'about') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              会社概要
            </li>
            <li 
              style={{
                ...menuItemStyle,
                backgroundColor: currentPage === 'services' ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
              onClick={() => setCurrentPage('services')}
              onMouseOver={(e) => {
                if (currentPage !== 'services') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 'services') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              サービス
            </li>
            <li 
              style={{
                ...menuItemStyle,
                backgroundColor: currentPage === 'contact' ? 'rgba(255,255,255,0.2)' : 'transparent'
              }}
              onClick={() => setCurrentPage('contact')}
              onMouseOver={(e) => {
                if (currentPage !== 'contact') {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 'contact') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              お問い合わせ
            </li>
          </ul>
        </nav>
      </header>

      <main style={mainStyle}>
        {renderCurrentPage()}
      </main>

      <footer style={footerStyle}>
        <div style={companyInfoStyle}>
          <div>
            <h3 style={{color: 'white', marginBottom: '1rem'}}>有限会社吉川特装</h3>
            <p style={{color: '#bdc3c7', lineHeight: '1.6'}}>
              〒683-0000 鳥取県米子市○○町○○番地<br/>
              TEL: 0859-xx-xxxx<br/>
              FAX: 0859-xx-xxxx
            </p>
          </div>
          <div>
            <h4 style={{color: 'white', marginBottom: '1rem'}}>営業時間</h4>
            <p style={{color: '#bdc3c7', lineHeight: '1.6'}}>
              平日: 9:00 - 18:00<br/>
              土曜: 9:00 - 17:00<br/>
              日曜・祝日: 休業
            </p>
          </div>
          <div>
            <h4 style={{color: 'white', marginBottom: '1rem'}}>主要サービス</h4>
            <p style={{color: '#bdc3c7', lineHeight: '1.6'}}>
              特装車両製造<br/>
              産業機械設計・製造<br/>
              メンテナンス・修理
            </p>
          </div>
        </div>
        <div style={{textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid #4a5568', color: '#bdc3c7'}}>
          <p>&copy; 2024 有限会社吉川特装. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default YoshikawaSpecialBodyworks;