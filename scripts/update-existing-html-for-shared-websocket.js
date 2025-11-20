/**
 * 既存のHTMLファイルを共有WebSocketサーバーに接続するように更新
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const previewDir = path.join(__dirname, '..', 'public', 'previews');

if (!fs.existsSync(previewDir)) {
  console.log('Preview directory not found:', previewDir);
  process.exit(1);
}

const htmlFiles = fs.readdirSync(previewDir).filter(f => f.endsWith('.html'));

console.log(`Found ${htmlFiles.length} HTML files to update`);

let updatedCount = 0;

htmlFiles.forEach(file => {
  const filePath = path.join(previewDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  // プロジェクトIDをファイル名から抽出（proj-1234567890.html → proj-1234567890）
  const projectIdMatch = file.match(/^(proj-[\d]+)/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;
  
  if (!projectId) {
    console.log(`Skipping ${file}: Could not extract project ID`);
    return;
  }
  
  // Socket.IO接続部分を検索して更新
  // パターン1: io('http://localhost:3000') または io('http://localhost:3004')（シンプルなパターン）
  const ioPattern1 = /const\s+socket\s*=\s*io\(['"]http:\/\/localhost:300[04]['"]\)/g;
  if (ioPattern1.test(content)) {
    content = content.replace(
      ioPattern1,
      `const socket = io('http://localhost:3004', { query: { projectId: '${projectId}' } })`
    );
    updated = true;
  }
  
  // パターン2: io("http://localhost:3000") または io("http://localhost:3004")（シンプルなパターン）
  const ioPattern2 = /const\s+socket\s*=\s*io\(["']http:\/\/localhost:300[04]["']\)/g;
  if (ioPattern2.test(content)) {
    content = content.replace(
      ioPattern2,
      `const socket = io("http://localhost:3004", { query: { projectId: "${projectId}" } })`
    );
    updated = true;
  }
  
  // パターン3: io('http://localhost:3004', { transports: ... })のような既存のオプションがある場合
  const ioPattern3 = /const\s+socket\s*=\s*io\(['"]http:\/\/localhost:300[04]['"],\s*\{([^}]+)\}\)/g;
  if (ioPattern3.test(content) && !content.includes('query: { projectId')) {
    content = content.replace(
      ioPattern3,
      (match, options) => {
        // 既存のオプションにqueryを追加
        const cleanOptions = options.trim();
        if (cleanOptions.endsWith(',')) {
          return `const socket = io('http://localhost:3004', {${cleanOptions} query: { projectId: '${projectId}' }})`;
        } else {
          return `const socket = io('http://localhost:3004', {${cleanOptions}, query: { projectId: '${projectId}' }})`;
        }
      }
    );
    updated = true;
  }
  
  // パターン4: io("http://localhost:3004", { transports: ... })のような既存のオプションがある場合（ダブルクォート）
  const ioPattern4 = /const\s+socket\s*=\s*io\(["']http:\/\/localhost:300[04][""],\s*\{([^}]+)\}\)/g;
  if (ioPattern4.test(content) && !content.includes('query: { projectId')) {
    content = content.replace(
      ioPattern4,
      (match, options) => {
        // 既存のオプションにqueryを追加
        const cleanOptions = options.trim();
        if (cleanOptions.endsWith(',')) {
          return `const socket = io("http://localhost:3004", {${cleanOptions} query: { projectId: "${projectId}" }})`;
        } else {
          return `const socket = io("http://localhost:3004", {${cleanOptions}, query: { projectId: "${projectId}" }})`;
        }
      }
    );
    updated = true;
  }
  
  // パターン3: プロジェクトID取得ロジックを追加（既に存在しない場合）
  if (!content.includes('projectId') && !content.includes('PROJECT_ID_PLACEHOLDER')) {
    // Socket.IO接続の前にプロジェクトID取得ロジックを追加
    const socketIoScript = content.match(/<script[^>]*>[\s\S]*?const\s+socket\s*=\s*io\(/);
    if (socketIoScript) {
      const beforeSocket = content.substring(0, content.indexOf('const socket = io('));
      const afterSocket = content.substring(content.indexOf('const socket = io('));
      
      const projectIdCode = `
      // プロジェクトIDを取得（URLパラメータから取得、なければファイル名から抽出）
      const urlParams = new URLSearchParams(window.location.search);
      let projectId = urlParams.get('projectId');
      if (!projectId) {
        // URLからプロジェクトIDを抽出（例: /preview/proj-1234567890.html → proj-1234567890）
        const match = window.location.pathname.match(/proj-[\\d]+/);
        projectId = match ? match[0] : '${projectId}';
      }
      `;
      
      content = beforeSocket + projectIdCode + afterSocket.replace(
        /io\(['"]http:\/\/localhost:300[04]['"]\)/,
        `io('http://localhost:3004', { query: { projectId: projectId } })`
      );
      updated = true;
    }
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`✓ Updated ${file}`);
  } else {
    console.log(`- Skipped ${file} (no WebSocket connection found or already updated)`);
  }
});

console.log(`\nUpdated ${updatedCount} out of ${htmlFiles.length} files`);

