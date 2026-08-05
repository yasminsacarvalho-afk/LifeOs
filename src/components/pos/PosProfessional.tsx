import React, { useState, useEffect } from "react";
import { Briefcase, Upload, Image as ImageIcon, Download, Settings, RefreshCw, AlertCircle, X, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  thumbnail?: string;
}

export function PosProfessional() {
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem('lifeos_media_script_url') || "");
  const [folderId, setFolderId] = useState(() => localStorage.getItem('lifeos_media_folder_id') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const saveSettings = (url: string, folder: string) => {
    setScriptUrl(url);
    setFolderId(folder);
    localStorage.setItem('lifeos_media_script_url', url);
    localStorage.setItem('lifeos_media_folder_id', folder);
  };

  const fetchMedia = async () => {
    if (!scriptUrl || !folderId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${scriptUrl}?folderId=${folderId}`);
      if (!response.ok) throw new Error("Erro na rede");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMediaList(data);
    } catch (e) {
      console.error(e);
      alert("Falha ao buscar mídia. Verifique a URL do script e o ID da pasta. Lembre-se que o script do Drive precisa estar publicado como Web App acessível a 'Qualquer Pessoa'.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scriptUrl && folderId && mediaList.length === 0) {
      fetchMedia();
    }
  }, [scriptUrl, folderId]);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Full = ev.target?.result as string;
        const base64Data = base64Full.split(",")[1];
        
        setIsUploading(true);
        try {
          const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({
              folderId,
              base64: base64Data,
              name: file.name,
              mimeType: file.type
            })
          });
          const result = await response.json();
          if (result.success) {
            fetchMedia(); // recarrega a lista
          } else {
            alert("Erro: " + result.error);
          }
        } catch (err) {
          alert("Erro no upload. Verifique as permissões do script.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleDownload = (file: MediaFile) => {
    window.open(file.url, '_blank');
  };

  const appsScriptCode = `function doGet(e) {
  var folderId = e.parameter.folderId;
  if (!folderId) return ContentService.createTextOutput(JSON.stringify({error: "Missing folderId"})).setMimeType(ContentService.MimeType.JSON);
  
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var result = [];
  
  while (files.hasNext()) {
    var file = files.next();
    result.push({
      id: file.getId(),
      name: file.getName(),
      url: file.getDownloadUrl(),
      mimeType: file.getMimeType(),
      thumbnail: file.getThumbnailUrl() || file.getDownloadUrl()
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folder = DriveApp.getFolderById(data.folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.name);
    var file = folder.createFile(blob);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: file.getId() })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <Briefcase className="size-8 text-blue-500" /> Profissional
        </h1>
        <div className="flex gap-3">
          <button onClick={() => setShowSettings(true)} className="p-3 bg-[#111113] hover:bg-[#1A1A1E] text-white rounded-xl border border-[rgba(255,255,255,0.06)] transition-colors">
            <Settings className="size-5" />
          </button>
        </div>
      </div>

      {!scriptUrl || !folderId ? (
        <div className="bg-[#111113]/50 border border-blue-500/20 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
          <AlertCircle className="size-16 text-blue-500 mb-6" />
          <h2 className="text-2xl font-black text-white mb-2">Conecte sua Galeria de Mídia</h2>
          <p className="text-[#A1A1AA] max-w-lg mb-8">Para enviar e receber imagens diretamente do seu Google Drive, você precisa configurar a URL do Apps Script e o ID da pasta de destino.</p>
          <button onClick={() => setShowSettings(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Settings className="size-5" /> Configurar Integração Drive
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="size-5 text-blue-400" /> Galeria de Mídia
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={fetchMedia} disabled={isLoading} className="p-3 bg-[#111113] hover:bg-[#1A1A1E] text-[#A1A1AA] hover:text-white rounded-xl border border-[rgba(255,255,255,0.06)] transition-colors disabled:opacity-50">
                <RefreshCw className={cn("size-5", isLoading && "animate-spin")} />
              </button>
              <button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                {isUploading ? <RefreshCw className="size-5 animate-spin" /> : <Upload className="size-5" />} 
                {isUploading ? 'Enviando...' : 'Subir Imagem'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaList.map(file => (
              <div key={file.id} className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden group relative aspect-square">
                <img src={file.thumbnail || file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                  <p className="text-white text-xs font-bold text-center truncate w-full mb-4">{file.name}</p>
                  <button onClick={() => handleDownload(file)} className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform">
                    <Download className="size-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {mediaList.length === 0 && !isLoading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-3xl">
                <ImageIcon className="size-12 text-[#71717A] mb-4" />
                <p className="text-[#A1A1AA] font-bold">Nenhuma mídia encontrada na pasta.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Configuração do Drive */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between sticky top-0 bg-[#09090B] z-10 rounded-t-3xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="size-6 text-blue-500" /> Configuração do Drive
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-[#A1A1AA] hover:text-white transition-colors p-2 rounded-full hover:bg-[#1A1A1E]">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">1. ID da Pasta no Google Drive</label>
                  <input type="text" value={folderId} onChange={e => saveSettings(scriptUrl, e.target.value)} placeholder="Ex: 1A2b3C4d5E6f7G8h9I0j" className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                  <p className="text-[11px] text-[#A1A1AA] mt-2">O ID é o código que aparece na URL quando você abre a pasta no Google Drive.</p>
                </div>
                
                <div>
                  <label className="text-[11px] uppercase font-bold text-[#71717A] tracking-widest block mb-2">2. URL do Apps Script (Web App)</label>
                  <input type="text" value={scriptUrl} onChange={e => saveSettings(e.target.value, folderId)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.06)] pt-6">
                <h4 className="text-sm font-bold text-white mb-4">Como criar o Script:</h4>
                <ol className="list-decimal pl-5 text-sm text-[#A1A1AA] space-y-2 mb-4">
                  <li>Acesse <a href="https://script.google.com" target="_blank" className="text-blue-400 hover:underline">script.google.com</a> e crie um "Novo Projeto".</li>
                  <li>Cole o código abaixo substituindo tudo.</li>
                  <li>Clique em "Implantar" (Deploy) {'>'} "Nova Implantação".</li>
                  <li>Selecione o tipo "App da Web". Acesso: "Qualquer pessoa".</li>
                  <li>Copie a URL gerada e cole no campo acima!</li>
                </ol>
                <div className="relative group">
                  <pre className="bg-[#111113] border border-[rgba(255,255,255,0.06)] p-4 rounded-xl text-[10px] sm:text-xs text-blue-300 overflow-x-auto custom-scrollbar">
                    {appsScriptCode}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(appsScriptCode)}
                    className="absolute top-2 right-2 p-2 bg-[#1A1A1E] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
                  >
                    <Copy className="size-4" /> Copiar Código
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
