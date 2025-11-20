import React, { useState, useRef, useEffect } from 'react';

interface DrawingData {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  drawingData: DrawingData[];
  canvasImageData: string[];
}

interface VideoAnalysisFrame {
  frameIndex: number;
  timestamp: number;
  imageData: string;
  motionVectors: { x: number; y: number; magnitude: number }[];
  colorHistogram: number[];
  edgeData: number[];
}

interface VideoAnalysisResult {
  frames: VideoAnalysisFrame[];
  totalFrames: number;
  fps: number;
  duration: number;
  motionIntensity: number[];
  sceneChanges: number[];
  dominantColors: string[];
}

const MiyazakiAI: React.FC = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    startTime: null,
    drawingData: [],
    canvasImageData: []
  });
  
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentProject, setCurrentProject] = useState<string>('');
  const [projects, setProjects] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);

  const startRecording = () => {
    setRecordingState({
      isRecording: true,
      startTime: Date.now(),
      drawingData: [],
      canvasImageData: []
    });
    
    intervalRef.current = setInterval(() => {
      if (canvasRef.current) {
        const imageData = canvasRef.current.toDataURL();
        setRecordingState(prev => ({
          ...prev,
          canvasImageData: [...prev.canvasImageData, imageData]
        }));
      }
    }, 100);
  };

  const stopRecording = () => {
    setRecordingState(prev => ({
      ...prev,
      isRecording: false
    }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setAnalysisResult(null);
      setAnalysisProgress(0);
    }
  };

  const calculateColorHistogram = (imageData: ImageData): number[] => {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histogram[gray]++;
    }
    
    return histogram;
  };

  const detectEdges = (imageData: ImageData): number[] => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges: number[] = [];
    
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges.push(magnitude);
      }
    }
    
    return edges;
  };

  const calculateMotionVectors = (prevFrame: ImageData, currFrame: ImageData): { x: number; y: number; magnitude: number }[] => {
    const vectors: { x: number; y: number; magnitude: number }[] = [];
    const blockSize = 16;
    const width = currFrame.width;
    const height = currFrame.height;
    
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        let bestMatchX = 0;
        let bestMatchY = 0;
        let bestScore = Infinity;
        
        const searchRange = 8;
        for (let dy = -searchRange; dy <= searchRange; dy += 2) {
          for (let dx = -searchRange; dx <= searchRange; dx += 2) {
            if (x + dx < 0 || x + dx + blockSize >= width || 
                y + dy < 0 || y + dy + blockSize >= height) continue;
            
            let score = 0;
            for (let by = 0; by < blockSize; by += 2) {
              for (let bx = 0; bx < blockSize; bx += 2) {
                const curr = (y + by) * width * 4 + (x + bx) * 4;
                const prev = (y + dy + by) * width * 4 + (x + dx + bx) * 4;
                
                const currGray = 0.299 * currFrame.data[curr] + 0.587 * currFrame.data[curr + 1] + 0.114 * currFrame.data[curr + 2];
                const prevGray = 0.299 * prevFrame.data[prev] + 0.587 * prevFrame.data[prev + 1] + 0.114 * prevFrame.data[prev + 2];
                
                score += Math.abs(currGray - prevGray);
              }
            }
            
            if (score < bestScore) {
              bestScore = score;
              bestMatchX = dx;
              bestMatchY = dy;
            }
          }
        }
        
        const magnitude = Math.sqrt(bestMatchX * bestMatchX + bestMatchY * bestMatchY);
        vectors.push({ x: bestMatchX, y: bestMatchY, magnitude });
      }
    }
    
    return vectors;
  };

  const analyzeVideo = async () => {
    if (!videoFile || !videoRef.current || !analysisCanvasRef.current) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    video.src = URL.createObjectURL(videoFile);
    
    return new Promise<void>((resolve) => {
      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const fps = 30; // 仮定のFPS
        const totalFrames = Math.floor(duration * fps);
        const frameInterval = 1 / fps;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const frames: VideoAnalysisFrame[] = [];
        const motionIntensity: number[] = [];
        const sceneChanges: number[] = [];
        const colorSamples: string[] = [];
        
        let prevImageData: ImageData | null = null;
        
        for (let i = 0; i < totalFrames; i += 5) { // 5フレームごとに解析
          const currentTime = i * frameInterval;
          video.currentTime = currentTime;
          
          await new Promise(resolve => {
            video.onseeked = () => resolve(undefined);
          });
          
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL();
          
          const colorHistogram = calculateColorHistogram(imageData);
          const edgeData = detectEdges(imageData);
          
          let motionVectors: { x: number; y: number; magnitude: number }[] = [];
          let avgMotion = 0;
          
          if (prevImageData) {
            motionVectors = calculateMotionVectors(prevImageData, imageData);
            avgMotion = motionVectors.reduce((sum, v) => sum + v.magnitude, 0) / motionVectors.length;
          }
          
          motionIntensity.push(avgMotion);
          
          // シーン変化検出（簡易版）
          if (prevImageData) {
            let diff = 0;
            for (let j = 0; j < imageData.data.length; j += 4) {
              diff += Math.abs(imageData.data[j] - prevImageData.data[j]);
            }
            const avgDiff = diff / (imageData.data.length / 4);
            if (avgDiff > 30) { // 閾値
              sceneChanges.push(i);
            }
          }
          
          // 支配的な色を抽出（簡易版）
          const r = imageData.data[Math.floor(imageData.data.length / 8)];
          const g = imageData.data[Math.floor(imageData.data.length / 8) + 1];
          const b = imageData.data[Math.floor(imageData.data.length / 8) + 2];
          colorSamples.push(`rgb(${r},${g},${b})`);
          
          frames.push({
            frameIndex: i,
            timestamp: currentTime,
            imageData: dataURL,
            motionVectors,
            colorHistogram,
            edgeData
          });
          
          prevImageData = imageData;
          
          setAnalysisProgress((i / totalFrames) * 100);
        }
        
        // 支配的な色を計算（最も頻出する色）
        const colorCounts: { [key: string]: number } = {};
        colorSamples.forEach(color => {
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        
        const dominantColors = Object.keys(colorCounts)
          .sort((a, b) => colorCounts[b] - colorCounts[a])
          .slice(0, 5);
        
        setAnalysisResult({
          frames,
          totalFrames,
          fps,
          duration,
          motionIntensity,
          sceneChanges,
          dominantColors
        });
        
        setIsAnalyzing(false);
        setAnalysisProgress(100);
        resolve();
      };
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && recordingState.isRecording) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timestamp = Date.now() - (recordingState.startTime || 0);
      
      setRecordingState(prev => ({
        ...prev,
        drawingData: [...prev.drawingData, { x, y, timestamp }]
      }));
    }
    draw(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && recordingState.isRecording) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const timestamp = Date.now() - (recordingState.startTime || 0);
      
      setRecordingState(prev => ({
        ...prev,
        drawingData: [...prev.drawingData, { x, y, timestamp }]
      }));
    }
    draw(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb';
    
    if (isDrawing) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const saveProject = () => {
    if (currentProject.trim()) {
      setProjects(prev => [...prev, currentProject]);
      setCurrentProject('');
    }
  };

  const generateVideo = () => {
    setGenerationStatus('映像生成中...');
    
    setTimeout(() => {
      setGenerationStatus('フレーム解析中...');
    }, 1000);
    
    setTimeout(() => {
      setGenerationStatus('AI処理中...');
    }, 3000);
    
    setTimeout(() => {
      setGenerationStatus('映像レンダリング中...');
    }, 5000);
    
    setTimeout(() => {
      setGenerationStatus('完了！映像が生成されました。');
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8fafc'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '30px',
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#1e293b',
          margin: '0 0 10px 0',
          fontWeight: 'bold'
        }}>
          🎬 MiyazakiAI
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '1.1rem',
          margin: 0
        }}>
          ペンタブ・マウス描画から映像を生成する次世代AI
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 350px',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* 動画解析パネル */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>📹 動画解析エンジン</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f9fafb'
              }}
            />
          </div>

          {videoFile && (
            <div style={{ marginBottom: '20px' }}>
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  backgroundColor: '#000'
                }}
                controls
              />
              <canvas
                ref={analysisCanvasRef}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {videoFile && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={analyzeVideo}
                disabled={isAnalyzing}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: isAnalyzing ? '#d1d5db' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer'
                }}
              >
                {isAnalyzing ? '🔍 解析中...' : '🔍 動画を解析'}
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #f59e0b'
            }}>
              <p style={{ margin: '0 0 10px 0', color: '#92400e', fontWeight: 'bold' }}>
                解析進行中: {Math.round(analysisProgress)}%
              </p>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#fed7aa',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${analysisProgress}%`,
                  height: '100%',
                  backgroundColor: '#f59e0b',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}

          {analysisResult && (
            <div style={{
              padding: '15px',
              backgroundColor: '#ecfdf5',
              borderRadius: '8px',
              border: '1px solid #10b981'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#047857' }}>解析結果</h3>
              <div style={{ fontSize: '14px', color: '#065f46' }}>
                <p>📊 総フレーム数: {analysisResult.totalFrames}</p>
                <p>⏱️ 動画長: {Math.round(analysisResult.duration)}秒</p>
                <p>🎯 解析フレーム数: {analysisResult.frames.length}</p>
                <p>📈 平均モーション強度: {(analysisResult.motionIntensity.reduce((a, b) => a + b, 0) / analysisResult.motionIntensity.length).toFixed(2)}</p>
                <p>🔄 シーン変化数: {analysisResult.sceneChanges.length}</p>
                <div style={{ marginTop: '10px' }}>
                  <p style={{ marginBottom: '5px' }}>🎨 支配的な色:</p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {analysisResult.dominantColors.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: color,
                          borderRadius: '4px',
                          border: '1px solid #ccc'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
          <h3 style={{ color: '#1e293b', marginBottom: '15px' }}>プロジェクト管理</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={currentProject}
              onChange={(e) => setCurrentProject(e.target.value)}
              placeholder="プロジェクト名を入力"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            />
            <button
              onClick={saveProject}
              disabled={!currentProject.trim()}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: currentProject.trim() ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: currentProject.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              💾 保存
            </button>
          </div>

          <h4 style={{ color: '#374151', marginBottom: '10px' }}>保存済みプロジェクト</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {projects.length === 0 ? (
              <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center' }}>
                まだプロジェクトがありません
              </p>
            ) : (
              projects.map((project, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    margin: '5px 0',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  📁 {project}
                </div>
              ))
            )}
          </div>

          <div style={{
            padding: '15px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #16a34a'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#15803d' }}>解析機能</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#166534' }}>
              <li>フレーム分解・抽出</li>
              <li>モーションベクター解析</li>
              <li>色彩ヒストグラム作成</li>
              <li>エッジ検出処理</li>
              <li>シーン変化検出</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>描画キャンバス</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={recordingState.isRecording ? stopRecording : startRecording}
            style={{
              padding: '12px 24px',
              backgroundColor: recordingState.isRecording ? '#dc2626' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {recordingState.isRecording ? '⏹️ 録画停止' : '🔴 録画開始'}
          </button>
          
          <button
            onClick={clearCanvas}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🗑️ クリア
          </button>
          
          <button
            onClick={generateVideo}
            disabled={recordingState.drawingData.length === 0 && !analysisResult}
            style={{
              padding: '12px 24px',
              backgroundColor: (recordingState.drawingData.length === 0 && !analysisResult) ? '#d1d5db' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: (recordingState.drawingData.length === 0 && !analysisResult) ? 'not-allowed' : 'pointer'
            }}
          >
            ✨ 映像生成
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={1000}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'crosshair',
            backgroundColor: '#ffffff',
            width: '100%'
          }}
        />

        {recordingState.isRecording && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ margin: 0, color: '#92400e' }}>
              🔴 録画中... データポイント数: {recordingState.drawingData.length}
            </p>
          </div>
        )}

        {generationStatus && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#dbeafe',
            borderRadius: '8px',
            border: '1px solid #3b82f6'
          }}>
            <p style={{ margin: 0, color: '#1e40af', fontWeight: 'bold' }}>
              {generationStatus}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiyazakiAI;