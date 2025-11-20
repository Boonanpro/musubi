import React from 'react';

export default function Header() {
  return (
    <header>
      <h1>有限会社吉川特装</h1>
      <nav>
        <ul>
          <li><a href="/">ホーム</a></li>
          <li><a href="/about">会社概要</a></li>
          <li><a href="/services">事業内容</a></li>
          <li><a href="/contact">お問い合わせ</a></li>
        </ul>
      </nav>
    </header>
  );
}