import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Stage, Layer, Line, Text as KonvaText } from 'react-konva';
import { PDFDocument, rgb } from 'pdf-lib';
import { PenTool, Highlighter, Eraser, Save, X, Loader2, ChevronLeft, ChevronRight, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfEditorProps {
  url: string;
  filename?: string;
  onClose: () => void;
  onSave: (newUrl: string) => void;
}

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text';

interface DrawLine {
  tool: ToolType;
  points: number[];
  color: string;
  pageNumber: number;
}

interface TextObject {
  id: string;
  x: number;
  y: number;
  text: string;
  pageNumber: number;
}

export function PdfEditor({ url, filename = "Documento", onClose, onSave }: PdfEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [texts, setTexts] = useState<TextObject[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<ToolType>('text'); // Default to text since they want to fill lines
  const [isSaving, setIsSaving] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pageSize, setPageSize] = useState({ width: 800, height: 1130 });
  
  const stageRef = useRef<any>(null);

  useEffect(() => {
    // Fetch the original PDF bytes so we can edit them later
    const loadPdf = async () => {
      try {
        let fetchUrl = url;
        if (url.includes('drive.google.com') && url.includes('/d/')) {
          const match = url.match(/\/d\/(.*?)\//);
          if (match && match[1]) {
            fetchUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
          }
        }
        
        // Fallback mechanism to ensure at least one proxy works for Google Drive files
        const proxies = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${fetchUrl}`
        ];
        
        let arrayBuffer = null;
        let lastError = null;
        
        for (const proxy of proxies) {
          try {
            const res = await fetch(proxy);
            if (!res.ok) throw new Error(`Proxy failed with status ${res.status}`);
            const buffer = await res.arrayBuffer();
            if (buffer.byteLength > 1000) { // Valid PDF size check
              arrayBuffer = buffer;
              break;
            }
          } catch (err) {
            lastError = err;
            console.warn(`Proxy ${proxy} failed:`, err);
          }
        }
        
        if (!arrayBuffer) {
           throw lastError || new Error("All proxies failed");
        }
        
        setPdfBytes(new Uint8Array(arrayBuffer));
      } catch (err) {
        console.error("Error loading PDF bytes:", err);
        toast.error("Falha ao carregar o PDF. Verifique se o arquivo está público no Google Drive.");
      }
    };
    loadPdf();
  }, [url]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = (page: any) => {
    setPageSize({ width: page.originalWidth * 1.2, height: page.originalHeight * 1.2 });
  };

  const handleMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'text') {
      // If we are currently editing a text, don't create a new one, just ignore
      if (editingTextId) return;
      
      const newText: TextObject = {
        id: Date.now().toString(),
        x: pos.x,
        y: pos.y,
        text: '',
        pageNumber
      };
      setTexts([...texts, newText]);
      setEditingTextId(newText.id);
      return;
    }

    setIsDrawing(true);
    setLines([...lines, { tool, points: [pos.x, pos.y], color: tool === 'highlighter' ? '#fde047' : '#ef4444', pageNumber }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'text') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    
    if (tool === 'eraser') {
       const threshold = 15;
       const filteredLines = lines.filter(l => {
          if (l.pageNumber !== pageNumber) return true;
          for (let i = 0; i < l.points.length; i += 2) {
             const px = l.points[i];
             const py = l.points[i+1];
             if (Math.hypot(px - point.x, py - point.y) < threshold) {
                return false;
             }
          }
          return true;
       });
       
       const filteredTexts = texts.filter(t => {
          if (t.pageNumber !== pageNumber) return true;
          // simple hitbox for text
          return Math.hypot(t.x - point.x, t.y - point.y) > 30;
       });

       if (filteredLines.length !== lines.length) setLines(filteredLines);
       if (filteredTexts.length !== texts.length) setTexts(filteredTexts);
       return;
    }

    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    if (tool !== 'text') {
      setIsDrawing(false);
    }
  };

  const handleSave = async () => {
    if (!pdfBytes) {
      toast.error("Erro ao carregar os dados do PDF original. Tente novamente.");
      return;
    }
    
    setIsSaving(true);
    const toastId = toast.loading("Salvando PDF...");
    
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      // Draw lines
      for (const line of lines) {
        if (line.tool === 'eraser' || line.tool === 'text') continue;
        const page = pages[line.pageNumber - 1];
        if (!page) continue;
        
        const { width, height } = page.getSize();
        
        let r = 1, g = 0, b = 0;
        if (line.color === '#fde047') { r = 0.99; g = 0.88; b = 0.28; }
        
        for (let i = 2; i < line.points.length; i += 2) {
           const x1 = line.points[i - 2];
           const y1 = line.points[i - 1];
           const x2 = line.points[i];
           const y2 = line.points[i + 1];
           
           page.drawLine({
             start: { x: x1 / 1.2, y: height - (y1 / 1.2) },
             end: { x: x2 / 1.2, y: height - (y2 / 1.2) },
             thickness: line.tool === 'highlighter' ? 12 : 2,
             color: rgb(r, g, b),
             opacity: line.tool === 'highlighter' ? 0.4 : 1,
           });
        }
      }

      // Draw texts
      for (const t of texts) {
        const page = pages[t.pageNumber - 1];
        if (!page || !t.text) continue;
        const { height } = page.getSize();
        
        page.drawText(t.text, {
          x: t.x / 1.2,
          y: height - (t.y / 1.2) - 12, // adjust baseline
          size: 14,
          color: rgb(0, 0, 1), // blue color to look like pen fill
        });
      }

      const savedPdf = await pdfDoc.saveAsBase64();
      
      const newFilename = filename.replace('.pdf', '') + "_anotado.pdf";
      
      const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_UPLOADER_URL;
      if (!driveUrl) throw new Error("URL de upload não configurada.");
      
      const response = await fetch(driveUrl, {
        method: "POST",
        body: JSON.stringify({
           base64: savedPdf,
           filename: newFilename,
           mimeType: 'application/pdf',
           path: ["O Polimata", "Anotações PDF"]
        }),
        headers: { 'Content-Type': 'text/plain' }
      });

      const result = await response.json();
      
      if (result.status === "success" && result.url) {
        toast.success("PDF Anotado salvo com sucesso!", { id: toastId });
        onSave(result.url);
      } else {
        throw new Error(result.message || "Erro desconhecido");
      }
      
    } catch (error: any) {
      console.error(error);
      toast.error(`Falha ao salvar: ${error.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageLines = lines.filter(l => l.pageNumber === pageNumber);
  const currentPageTexts = texts.filter(t => t.pageNumber === pageNumber);

  return (
    <div className="w-full h-full flex flex-col bg-[#1A1A1E] border border-white/5 rounded-xl overflow-hidden relative">
      {/* Toolbar */}
      <div className="h-14 bg-[#111113] border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setTool('text'); setEditingTextId(null); }} 
            className={cn("p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold", tool === 'text' ? 'bg-blue-500/20 text-blue-400' : 'text-[#A1A1AA] hover:bg-white/5')}
          >
            <Type className="size-4" /> Digitar Texto
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={() => { setTool('highlighter'); setEditingTextId(null); }} 
            className={cn("p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold", tool === 'highlighter' ? 'bg-yellow-500/20 text-yellow-400' : 'text-[#A1A1AA] hover:bg-white/5')}
          >
            <Highlighter className="size-4" /> Marca-texto
          </button>
          <button 
            onClick={() => { setTool('pen'); setEditingTextId(null); }} 
            className={cn("p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold", tool === 'pen' ? 'bg-rose-500/20 text-rose-400' : 'text-[#A1A1AA] hover:bg-white/5')}
          >
            <PenTool className="size-4" /> Caneta
          </button>
          <button 
            onClick={() => { setTool('eraser'); setEditingTextId(null); }} 
            className={cn("p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold", tool === 'eraser' ? 'bg-white/10 text-white' : 'text-[#A1A1AA] hover:bg-white/5')}
          >
            <Eraser className="size-4" /> Borracha
          </button>
        </div>
        
        <div className="flex items-center gap-3">
           {numPages > 0 && (
             <div className="flex items-center gap-2 mr-4 bg-black/30 rounded-lg p-1">
               <button disabled={pageNumber <= 1} onClick={() => { setPageNumber(p => p - 1); setEditingTextId(null); }} className="p-1 hover:text-white text-[#A1A1AA] disabled:opacity-50"><ChevronLeft className="size-4" /></button>
               <span className="text-xs font-bold text-[#A1A1AA] min-w-[3rem] text-center">{pageNumber} / {numPages}</span>
               <button disabled={pageNumber >= numPages} onClick={() => { setPageNumber(p => p + 1); setEditingTextId(null); }} className="p-1 hover:text-white text-[#A1A1AA] disabled:opacity-50"><ChevronRight className="size-4" /></button>
             </div>
           )}
           <button onClick={handleSave} disabled={isSaving || !pdfBytes} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-1.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
             {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
           </button>
           <button onClick={onClose} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
             <X className="size-4" />
           </button>
        </div>
      </div>

      {/* Canvas & PDF Area */}
      <div className="flex-1 overflow-auto flex justify-center bg-black/50 p-4 relative custom-scrollbar">
        {!pdfBytes && (
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
             <Loader2 className="size-8 text-cyan-500 animate-spin" />
             <span className="text-sm text-cyan-400 font-bold">Processando arquivo PDF seguro...</span>
           </div>
        )}
        
        {pdfBytes && (
          <div className="relative shadow-2xl">
            <Document
              file={pdfBytes}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-10 text-cyan-400 font-bold animate-pulse">Carregando documento...</div>}
            >
              <Page 
                pageNumber={pageNumber} 
                renderTextLayer={true} 
                renderAnnotationLayer={false}
                className="bg-white"
                scale={1.2}
                onLoadSuccess={onPageLoadSuccess}
              />
            </Document>
            
            <div className="absolute inset-0 z-10" style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'crosshair' : 'crosshair' }}>
              <Stage
                width={pageSize.width}
                height={pageSize.height}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                ref={stageRef}
              >
                <Layer>
                  {currentPageLines.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={line.tool === 'highlighter' ? 12 : 2}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      opacity={line.tool === 'highlighter' ? 0.4 : 1}
                      globalCompositeOperation={
                        line.tool === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  ))}
                  {currentPageTexts.map((t) => (
                     editingTextId !== t.id ? (
                        <KonvaText 
                          key={t.id}
                          x={t.x}
                          y={t.y}
                          text={t.text}
                          fontSize={16}
                          fontFamily="Inter, sans-serif"
                          fill="#2563eb" // blue pen color
                          onClick={() => setEditingTextId(t.id)}
                          onTap={() => setEditingTextId(t.id)}
                        />
                     ) : null
                  ))}
                </Layer>
              </Stage>
              
              {/* HTML Overlay for Text Input */}
              {currentPageTexts.map((t) => (
                editingTextId === t.id && (
                  <textarea
                    key={`input-${t.id}`}
                    autoFocus
                    className="absolute bg-transparent border-0 outline-none resize-none overflow-hidden m-0 p-0 text-blue-600 font-sans"
                    style={{
                      left: t.x + 'px',
                      top: t.y - 2 + 'px', // tiny offset to match konva render
                      fontSize: '16px',
                      width: '300px',
                      height: '100px',
                    }}
                    value={t.text}
                    onChange={(e) => {
                      const newTexts = texts.map(tx => tx.id === t.id ? { ...tx, text: e.target.value } : tx);
                      setTexts(newTexts);
                    }}
                    onBlur={() => {
                      // If empty, remove it
                      if (!t.text.trim()) {
                         setTexts(texts.filter(tx => tx.id !== t.id));
                      }
                      setEditingTextId(null);
                    }}
                  />
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
