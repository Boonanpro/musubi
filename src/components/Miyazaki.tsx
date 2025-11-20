import React, { useRef, useState } from 'react';

const Miyazaki: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true,
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        chunksRef.current = [];
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
    } catch (error) {
      alert('画面収録の開始に失敗しました: ' + (error as Error).message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadVideo = () => {
    if (!recordedUrl) return;
    const a = document.createElement('a');
    a.href = recordedUrl;
    a.download = `miyazaki-recording-${Date.now()}.webm`;
    a.click();
  };

  return (
    <div style={{ 
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 16px 0', color: '#333' }}>
          🎬 Miyazaki AI - Screen Recorder
        </h1>
        <p style={{ fontSize: '18px', color: '#666' }}>
          画面収録 + ペンタブ/マウスで加筆できる映像生成ツール
        </p>
      </div>

      <div style={{ 
        background: '#f8f9fa',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0 }}>📹 収録コントロール</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={startRecording}
            disabled={isRecording}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: isRecording ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isRecording ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isRecording ? '🔴 収録中...' : '▶️ 収録開始'}
          </button>
          
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: !isRecording ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !isRecording ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            ⏹️ 収録停止
          </button>

          <button
            onClick={clearCanvas}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🧹 加筆をクリア
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>✍️ 加筆エリア (マウス/ペンタブ)</h2>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              backgroundColor: '#fff',
              cursor: 'crosshair',
              display: 'block'
            }}
          />
          <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
            マウスをドラッグして加筆できます
          </p>
        </div>
      </div>

      {recordedUrl && (
        <div style={{ 
          background: '#ffffff',
          padding: '30px',
          borderRadius: '12px',
          border: '2px solid #28a745'
        }}>
          <h2 style={{ marginTop: 0 }}>✅ 収録完了</h2>
          <video
            src={recordedUrl}
            controls
            style={{
              width: '100%',
              maxHeight: '500px',
              borderRadius: '8px',
              backgroundColor: '#000',
              marginBottom: '20px'
            }}
          />
          <button
            onClick={downloadVideo}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            💾 動画をダウンロード
          </button>
        </div>
      )}

      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        background: '#e9ecef',
        borderRadius: '8px'
      }}>
        <h3 style={{ marginTop: 0 }}>💡 使い方</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li>「収録開始」で画面選択</li>
          <li>上のキャンバスでマウス/ペンタブで加筆</li>
          <li>「収録停止」で終了</li>
          <li>プレビューを確認してダウンロード</li>
        </ol>
      </div>
    </div>
  );
};

export default Miyazaki;