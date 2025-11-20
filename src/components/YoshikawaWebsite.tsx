import React, { useEffect } from 'react';

const YoshikawaWebsite: React.FC = () => {
  useEffect(() => {
    // Google Analyticsの初期化
    const initializeAnalytics = () => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
      document.head.appendChild(script);

      const dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    };

    initializeAnalytics();
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>有限会社吉川特捜</h1>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            <li><a href="#" style={{ color: 'blue', textDecoration: 'none' }}>ホーム</a></li>
            <li><a href="#" style={{ color: 'blue', textDecoration: 'none' }}>会社概要</a></li>
            <li><a href="#services" style={{ color: 'blue', textDecoration: 'none' }}>サービス</a></li>
            <li><a href="#contact" style={{ color: 'blue', textDecoration: 'none' }}>お問い合わせ</a></li>
          </ul>
        </nav>
      </header>
      
      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>私たちについて</h2>
          <p style={{ textAlign: 'justify' }}>鳥取県米子市を拠点に活動する<strong>探偵事務所</strong>です。<strong>浮気調査</strong>、<strong>人探し</strong>、<strong>家出人調査</strong>など、幅広い<strong>調査サービス</strong>を提供しています。当社は長年の経験と高い調査力で、お客様のお悩みを解決へと導きます。</p>
        </section>
        
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>当社の強み</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '1rem' }}>
              <strong>豊富な経験と実績</strong>
              <p>当社は長年にわたり数多くの<strong>調査</strong>を手掛けてきました。その経験と実績を活かし、お客様のニーズに合わせた最適な調査を提供します。</p>
            </li>
            <li style={{ marginBottom: '1rem' }}>
              <strong>迅速かつ丁寧な対応</strong>
              <p>お客様のご相談にはスピード感を持って対応し、丁寧にヒアリングを行います。調査の進捗状況も随時ご報告いたします。</p>
            </li>
            <li>
              <strong>高い調査力と機動力</strong>
              <p>熟練の調査員が最新の調査機器を駆使し、迅速かつ正確な<strong>調査</strong>を行います。山陰地方を中心に広範囲で機動的な調査が可能です。</p>
            </li>
          </ul>
        </section>
        
        <section id="services" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>サービス内容</h2>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '0 1rem', margin: '0', listStyle: 'none' }}>
            <li><strong>浮気調査</strong></li>
            <li><strong>人探し調査</strong></li>
            <li><strong>家出人調査</strong></li>
            <li><strong>素行調査</strong></li>
          </ul>
        </section>

        <section id="contact">
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>お問い合わせ</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label htmlFor="name" style={{ fontWeight: 'bold' }}>お名前</label>
            <input type="text" id="name" name="name" required style={{ padding: '0.5rem', fontSize: '1rem' }} />

            <label htmlFor="email" style={{ fontWeight: 'bold' }}>メールアドレス</label>
            <input type="email" id="email" name="email" required style={{ padding: '0.5rem', fontSize: '1rem' }} />

            <label htmlFor="message" style={{ fontWeight: 'bold' }}>お問い合わせ内容</label>
            <textarea id="message" name="message" required style={{ padding: '0.5rem', minHeight: '150px', fontSize: '1rem' }}></textarea>

            <button type="submit" style={{ backgroundColor: 'blue', color: 'white', padding: '0.5rem 1rem', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', fontSize: '1rem' }}>送信</button>
          </form>
        </section>
      </main>
      
      <footer style={{ marginTop: '2rem', textAlign: 'center' }}>
        <p>鳥取県米子市の探偵事務所 有限会社吉川特捜 | 浮気調査・人探し・家出人調査なら当社へ</p>
        <p>&copy; 2023 有限会社吉川特捜. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default YoshikawaWebsite;