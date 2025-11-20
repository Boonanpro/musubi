/**
 * Musubi - Preview Server
 * 
 * Dynamically renders generated components for preview
 */

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import path from 'path';

const PREVIEW_PORT = 3003;
const app = express();

// Enable CORS for preview and disable caching
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  // Disable caching
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

/**
 * GET /preview/:component
 * Render a component for preview
 */
app.get('/preview/:component', (req, res) => {
  const { component } = req.params;
  
  try {
    // Generate HTML wrapper for the component
    const html = generatePreviewHTML(component);
    res.send(html);
  } catch (error) {
    logger.error(`Preview error for ${component}`, error);
    res.status(500).send(generateErrorHTML(error));
  }
});

/**
 * GET /api/preview/list
 * List available previews
 */
app.get('/api/preview/list', (req, res) => {
  // TODO: Scan src/components for available components
  res.json({
    success: true,
    components: ['TodoList'],
  });
});

/**
 * Generate preview HTML
 */
function generatePreviewHTML(componentName: string): string {
  // プロジェクトファイルのパス（public/previews/）
  const projectPath = path.resolve(process.cwd(), `public/previews/${componentName}.html`);
  
  // プロジェクトファイルが存在する場合はそのまま返す
  if (existsSync(projectPath)) {
    return readFileSync(projectPath, 'utf-8');
  }
  
  // 旧形式のコンポーネント（src/components/）
  const componentPath = path.resolve(process.cwd(), `src/components/${componentName}.tsx`);
  
  if (!existsSync(componentPath)) {
    return generateErrorHTML(new Error(`Component not found: ${componentName}`));
  }

  // Read component source
  const componentSource = readFileSync(componentPath, 'utf-8');

  // Generate HTML with React renderer
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${componentName} - Musubi Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      padding: 0;
      margin: 0;
    }
    #root {
      min-height: 100vh;
    }
    h2 {
      margin-bottom: 20px;
      color: #333;
    }
    input[type="text"] {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      margin-right: 10px;
      min-width: 200px;
    }
    button {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
    }
    button:hover {
      background: #0056b3;
    }
    ul {
      list-style: none;
      margin-top: 20px;
    }
    li {
      padding: 12px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    li label {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    li input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    li button {
      background: #dc3545;
      padding: 6px 12px;
      font-size: 12px;
    }
    li button:hover {
      background: #c82333;
    }
    .completed {
      text-decoration: line-through;
      color: #999;
    }
    .preview-header {
      background: #f8f9fa;
      padding: 15px;
      margin: -30px -30px 30px -30px;
      border-bottom: 1px solid #dee2e6;
      border-radius: 8px 8px 0 0;
    }
    .preview-header h1 {
      font-size: 20px;
      color: #495057;
      margin: 0;
    }
    .preview-header p {
      font-size: 14px;
      color: #6c757d;
      margin: 5px 0 0 0;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    // Extract React hooks
    const { useState, useRef, useEffect, useCallback, useMemo } = React;

    ${(() => {
      let cleaned = componentSource;
      
      // Remove all imports
      cleaned = cleaned.replace(/^import.*$/gm, '');
      
      // Remove all exports
      cleaned = cleaned.replace(/export default .*;?$/gm, '');
      cleaned = cleaned.replace(/^export \{[^}]*\};?$/gm, '');
      
      // Remove interface/type definitions
      let prevLength = 0;
      while (cleaned.length !== prevLength) {
        prevLength = cleaned.length;
        cleaned = cleaned.replace(/interface\s+\w+\s*\{[^{}]*\}/gs, '');
        cleaned = cleaned.replace(/type\s+\w+\s*=\s*\{[^{}]*\};?/gs, '');
        cleaned = cleaned.replace(/type\s+\w+\s*=\s*[^;{]+;/g, '');
      }
      
      // Remove generic types from hooks (but NOT JSX)
      cleaned = cleaned.replace(/\b(useRef|useState|useCallback|useMemo|useEffect|Array|Set|Map|Promise|Record)\s*<[^>]+>/g, '$1');
      
      // Remove function parameter types: (param: Type) => (param)
      // Look for parameter followed by : and type, then closing paren
      cleaned = cleaned.replace(/\(([a-zA-Z_$][\w$]*)\s*:\s*[^)]+\)/g, '($1)');
      
      // Remove destructured parameter types: ({ a, b }: { a: Type, b: Type }) => ({ a, b })
      cleaned = cleaned.replace(/\(\s*\{([^}]+)\}\s*:\s*\{[^}]+\}\s*\)/gs, '({ $1 })');
      
      // Remove function return types (including complex types like arrays and objects)
      // ): Type => or ): ComplexType => becomes ) =>
      cleaned = cleaned.replace(/\)\s*:\s*[^=]*?=>/g, ') =>');
      
      // ): Type { or ): ComplexType { becomes ) {
      cleaned = cleaned.replace(/\)\s*:\s*[^{]*?\{/g, ') {');
      
      // Remove type assertions: as const, as Type
      cleaned = cleaned.replace(/\s+as\s+const\b/g, '');
      cleaned = cleaned.replace(/\s+as\s+[A-Z]\w*/g, '');
      
      // Clean up
      cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      return cleaned;
    })()}

    // Render
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<${componentName} />);
  </script>
</body>
</html>`;
}

/**
 * Generate error HTML
 */
function generateErrorHTML(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Error</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .error {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
    }
    h1 {
      color: #dc3545;
      font-size: 24px;
      margin: 0 0 10px 0;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="error">
    <h1>⚠️ Preview Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

/**
 * Start preview server
 */
export function startPreviewServer() {
  app.listen(PREVIEW_PORT, () => {
    logger.success(`Preview Server running on http://localhost:${PREVIEW_PORT}`);
  });
}

