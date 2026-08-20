import React, { useState, useEffect } from "react";
import { Briefcase, Upload, Image as ImageIcon, Download, Settings, RefreshCw, AlertCircle, X, Check, Copy, Folder, ChevronRight, File, FolderPlus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  name: string;
  url?: string;
  mimeType?: string;
  thumbnail?: string;
  isFolder: boolean;
}

export function PosProfessional() {
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem('lifeos_media_script_url') || "");
  const [folderId, setFolderId] = useState(() => localStorage.getItem('lifeos_media_folder_id') || "");
  const [showSettings, setShowSettings] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([]);

  // Selected File Preview State
  const [selectedFile, setSelectedFile] = useState<MediaItem | null>(null);

  // CRUD Modals State
  const [modalState, setModalState] = useState<{
    type: 'createFolder' | 'rename' | 'delete' | null;
    item?: MediaItem;
    inputValue?: string;
  }>({ type: null });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (folderId) {
      setFolderStack([{id: folderId, name: 'Galeria Raiz'}]);
    } else {
      setFolderStack([]);
    }
  }, [folderId]);

  const saveSettings = (url: string, folder: string) => {
    setScriptUrl(url);
    setFolderId(folder);
    localStorage.setItem('lifeos_media_script_url', url);
    localStorage.setItem('lifeos_media_folder_id', folder);
  };

  const fetchMedia = async () => {
    const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : folderId;
    if (!scriptUrl || !currentFolderId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${scriptUrl}?folderId=${currentFolderId}`);
      if (!response.ok) throw new Error("Erro na rede");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setMediaList(data);
    } catch (e: any) {
      console.error(e);
      alert(`Falha ao buscar documentos: ${e.message}\n\nVerifique a URL do script, o ID da pasta, e se o Web App está acessível a 'Qualquer Pessoa'.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scriptUrl && folderStack.length > 0) {
      fetchMedia();
    }
  }, [scriptUrl, folderStack]);

  const handleUpload = () => {
    const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : folderId;
    if (!currentFolderId) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,application/pdf,.doc,.docx,.xls,.xlsx";
    input.onchange = async (e: any) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      let hasError = false;
      let uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const base64Full = ev.target?.result as string;
              const base64Data = base64Full.split(",")[1];
              
              const response = await fetch(scriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                  action: 'upload',
                  folderId: currentFolderId,
                  base64: base64Data,
                  name: file.name,
                  mimeType: file.type
                })
              });
              const result = await response.json();
              if (result.success) {
                uploadedCount++;
              } else {
                hasError = true;
                console.error("Upload error for file", file.name, result.error);
              }
            } catch (err) {
              hasError = true;
              console.error("Upload request failed for file", file.name, err);
            } finally {
              resolve();
            }
          };
          reader.readAsDataURL(file);
        });
      }

      setIsUploading(false);
      
      if (hasError) {
        alert(`Upload finalizado com alertas. ${uploadedCount} de ${files.length} arquivos foram enviados.`);
      }
      
      if (uploadedCount > 0) {
        fetchMedia();
      }
    };
    input.click();
  };

  const handleAction = async () => {
    if (!modalState.type || isProcessing) return;
    setIsProcessing(true);

    try {
      const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : folderId;
      
      const payload: any = { action: modalState.type };
      
      if (modalState.type === 'createFolder') {
        if (!modalState.inputValue?.trim()) return setIsProcessing(false);
        payload.folderId = currentFolderId;
        payload.name = modalState.inputValue.trim();
      } else if (modalState.type === 'rename') {
        if (!modalState.item || !modalState.inputValue?.trim()) return setIsProcessing(false);
        payload.id = modalState.item.id;
        payload.name = modalState.inputValue.trim();
        payload.isFolder = modalState.item.isFolder;
      } else if (modalState.type === 'delete') {
        if (!modalState.item) return setIsProcessing(false);
        payload.id = modalState.item.id;
        payload.isFolder = modalState.item.isFolder;
      }

      const response = await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (result.success) {
        setModalState({ type: null });
        fetchMedia();
      } else {
        alert("Erro na operação: " + result.error);
      }
    } catch (err) {
      alert("Erro ao executar ação. Verifique as permissões ou atualize o script.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (file: MediaItem) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const appsScriptCode = `function doGet(e) {
  try {
    var folderId = e.parameter.folderId;
    if (!folderId) return ContentService.createTextOutput(JSON.stringify({error: "Missing folderId"})).setMimeType(ContentService.MimeType.JSON);
    
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    var folders = folder.getFolders();
    var result = [];
    
    while (folders.hasNext()) {
      var f = folders.next();
      result.push({
        id: f.getId(),
        name: f.getName(),
        isFolder: true
      });
    }
    
    while (files.hasNext()) {
      try {
        var file = files.next();
        var dlUrl = "";
        var thumbUrl = "";
        
        try { dlUrl = file.getDownloadUrl() || ""; } catch(e){}
        try { thumbUrl = file.getThumbnailUrl() || dlUrl; } catch(e){}
        
        result.push({
          id: file.getId(),
          name: file.getName(),
          url: dlUrl,
          mimeType: file.getMimeType(),
          thumbnail: thumbUrl,
          isFolder: false
        });
      } catch(fileErr) {
        // Ignora arquivos que não puderem ser lidos
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'upload';

    if (action === 'createFolder') {
      var parent = DriveApp.getFolderById(data.folderId);
      var newFolder = parent.createFolder(data.name);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: newFolder.getId() })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    if (action === 'delete') {
      if (data.isFolder) DriveApp.getFolderById(data.id).setTrashed(true);
      else DriveApp.getFileById(data.id).setTrashed(true);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'rename') {
      if (data.isFolder) DriveApp.getFolderById(data.id).setName(data.name);
      else DriveApp.getFileById(data.id).setName(data.name);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'upload') {
      var folder = DriveApp.getFolderById(data.folderId);
      var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType, data.name);
      var file = folder.createFile(blob);
      return ContentService.createTextOutput(JSON.stringify({ success: true, id: file.getId() })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({error: "Ação desconhecida"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const folders = mediaList.filter(item => item.isFolder).sort((a,b) => a.name.localeCompare(b.name));
  const files = mediaList.filter(item => !item.isFolder);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 sm:px-6 lg:px-8">
      
      {/* Header Premium */}
      <div className="relative mb-12 mt-6">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                <Briefcase className="size-8 text-blue-500" />
              </div>
              Central de Docs
            </h1>
            <p className="text-[#A1A1AA] mt-4 max-w-xl text-sm leading-relaxed font-medium">
              Repositório central de artes, divulgações e documentos das empresas. Sincronizado em tempo real diretamente com a nuvem.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-3.5 bg-[#111113]/80 backdrop-blur-md hover:bg-white/5 text-[#A1A1AA] hover:text-white rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {!scriptUrl || !folderId ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#111113] to-[#0A0A0C] border border-[rgba(255,255,255,0.04)] p-10 md:p-16 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-2xl group mt-8">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-1000"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
              <AlertCircle className="size-10 text-blue-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Galeria Desconectada</h2>
            <p className="text-[#A1A1AA] max-w-md mb-10 text-sm leading-relaxed">
              Para visualizar, enviar e gerenciar os documentos da empresa, você precisa configurar a URL do Apps Script e o ID da pasta raiz do seu Google Drive.
            </p>
            <button 
              onClick={() => setShowSettings(true)} 
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)]"
            >
              <Settings className="size-5" /> Configurar Integração
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Sub-header e Breadcrumbs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111113]/60 backdrop-blur-2xl p-4 md:p-5 rounded-[2rem] border border-[rgba(255,255,255,0.06)] shadow-2xl">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0 px-2 flex-1">
              {folderStack.length > 0 ? folderStack.map((f, index) => (
                <React.Fragment key={f.id}>
                  {index > 0 && <ChevronRight className="size-4 shrink-0 text-[#71717A]" />}
                  <button 
                    onClick={() => setFolderStack(folderStack.slice(0, index + 1))}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all whitespace-nowrap",
                      index === folderStack.length - 1 
                        ? "bg-white/10 text-white shadow-inner border border-white/10" 
                        : "text-[#71717A] hover:text-white hover:bg-white/5"
                    )}
                  >
                    {index === 0 ? <Briefcase className="size-3.5" /> : <Folder className={cn("size-3.5", index === folderStack.length - 1 ? "fill-white/20" : "fill-current opacity-40")} />}
                    {f.name}
                  </button>
                </React.Fragment>
              )) : (
                <div className="px-4 py-2 flex items-center gap-2 text-white text-[11px] uppercase tracking-wider font-bold bg-white/5 rounded-full border border-white/5">
                  <Briefcase className="size-3.5" /> Galeria Raiz
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 px-2 lg:px-0">
              <button 
                onClick={fetchMedia} 
                disabled={isLoading} 
                className="h-12 w-12 flex items-center justify-center bg-[#1A1A1E] hover:bg-white/10 text-[#A1A1AA] hover:text-white rounded-2xl border border-[rgba(255,255,255,0.08)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
              >
                <RefreshCw className={cn("size-4.5", isLoading && "animate-spin")} />
              </button>
              
              <button 
                onClick={() => setModalState({ type: 'createFolder', inputValue: '' })} 
                className="h-12 px-4 bg-white/5 hover:bg-white/10 text-white text-xs uppercase tracking-widest font-bold rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-[rgba(255,255,255,0.06)]"
              >
                <FolderPlus className="size-4" /> Pasta
              </button>
              
              <button 
                onClick={handleUpload} 
                disabled={isUploading} 
                className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase tracking-widest font-bold rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
              >
                {isUploading ? <RefreshCw className="size-4 animate-spin" /> : <Upload className="size-4" />} 
                {isUploading ? 'Enviando...' : 'Fazer Upload'}
              </button>
            </div>
          </div>

          {/* Estado de Carregamento */}
          {isLoading && mediaList.length === 0 && (
            <div className="w-full py-32 flex flex-col items-center justify-center">
              <RefreshCw className="size-8 text-blue-500 animate-spin mb-4" />
              <p className="text-[#A1A1AA] text-sm font-medium animate-pulse">Sincronizando com o Google Drive...</p>
            </div>
          )}

          {/* Pastas */}
          {folders.length > 0 && !isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] font-bold mb-4 ml-4 flex items-center gap-2">
                <Folder className="size-3" /> Pastas ({folders.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {folders.map(folder => (
                  <div key={folder.id} className="group relative bg-[#111113]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.06)] hover:border-blue-500/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(37,99,235,0.1)] aspect-square overflow-hidden cursor-pointer" onClick={() => setFolderStack([...folderStack, {id: folder.id, name: folder.name}])}>
                    
                    {/* Ações CRUD */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModalState({ type: 'rename', item: folder, inputValue: folder.name })} className="p-2 bg-black/50 hover:bg-blue-600 rounded-full text-white transition-colors">
                        <Edit2 className="size-3" />
                      </button>
                      <button onClick={() => setModalState({ type: 'delete', item: folder })} className="p-2 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors">
                        <Trash2 className="size-3" />
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 w-16 h-16 mb-4 rounded-2xl bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/10 transition-all duration-300 shadow-inner pointer-events-none">
                      <Folder className="size-8 text-blue-500/80 fill-blue-500/10 group-hover:fill-blue-500/20 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <p className="relative z-10 text-white font-bold text-xs break-words w-full px-1 line-clamp-2 leading-tight group-hover:text-blue-200 transition-colors pointer-events-none">{folder.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Arquivos */}
          {files.length > 0 && !isLoading && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] font-bold mb-4 ml-4 mt-8 flex items-center gap-2">
                <ImageIcon className="size-3" /> Arquivos e Documentos ({files.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map(file => (
                  <div key={file.id} onClick={() => setSelectedFile(file)} className="group bg-[#0A0A0C] border border-[rgba(255,255,255,0.06)] rounded-3xl overflow-hidden relative aspect-square transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] hover:border-white/20 hover:-translate-y-1 flex items-center justify-center cursor-pointer">
                    
                    {/* Ações CRUD */}
                    <div className="absolute top-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-40">
                      <button onClick={(e) => { e.stopPropagation(); setModalState({ type: 'rename', item: file, inputValue: file.name }); }} className="p-2 bg-black/60 backdrop-blur-md hover:bg-blue-600 rounded-full text-white transition-colors">
                        <Edit2 className="size-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setModalState({ type: 'delete', item: file }); }} className="p-2 bg-black/60 backdrop-blur-md hover:bg-red-600 rounded-full text-white transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    {/* Fallback Icon */}
                    <div className="fallback-icon hidden absolute inset-0 flex flex-col items-center justify-center bg-[#111113]">
                       <ImageIcon className="size-10 text-[#71717A] mb-2 opacity-50" />
                    </div>

                    <img 
                      src={`https://lh3.googleusercontent.com/d/${file.id}`} 
                      alt={file.name} 
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 relative z-10" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const fallback1 = `https://drive.google.com/uc?export=view&id=${file.id}`;
                        const fallback2 = file.thumbnail || "";
                        
                        if (target.src.includes('lh3.googleusercontent.com')) {
                          target.src = fallback1;
                        } else if (target.src.includes('drive.google.com/uc')) {
                          if (fallback2) target.src = fallback2;
                          else {
                            target.style.display = 'none';
                            target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                          }
                        } else {
                          target.style.display = 'none';
                          target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }
                      }}
                    />
                    
                    {/* Gradient Overlay (Sempre visível) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/80 to-transparent opacity-90 z-20 pointer-events-none transition-opacity group-hover:opacity-100"></div>
                    
                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 p-4 z-30 flex flex-col items-center justify-end h-full">
                      <div className="flex-1"></div>
                      <p className="text-white text-[11px] font-bold line-clamp-3 break-words w-full px-1 text-center tracking-wide drop-shadow-lg mb-2">
                        {file.name}
                      </p>
                      
                      {/* Botão Download */}
                      <div className="h-10 opacity-100 md:h-0 md:opacity-0 overflow-hidden md:group-hover:h-10 md:group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }} 
                          className="h-10 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full hover:scale-110 transition-transform shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                        >
                          <Download className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {mediaList.length === 0 && !isLoading && (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-dashed border-[rgba(255,255,255,0.1)] rounded-[3rem] bg-[#111113]/30 backdrop-blur-sm animate-in zoom-in-95 duration-500 mt-8">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <File className="size-8 text-[#71717A]" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Pasta Vazia</h3>
              <p className="text-[#A1A1AA] text-sm max-w-sm text-center leading-relaxed">
                Nenhum arquivo ou subpasta foi encontrado neste diretório. Faça um upload para começar a organizar.
              </p>
              <div className="flex items-center gap-4 mt-8">
                <button onClick={() => setModalState({ type: 'createFolder', inputValue: '' })} className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white text-xs uppercase tracking-widest font-bold rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 border border-[rgba(255,255,255,0.06)]">
                  <FolderPlus className="size-4" /> Nova Pasta
                </button>
                <button onClick={handleUpload} disabled={isUploading} className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase tracking-widest font-bold rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  {isUploading ? <RefreshCw className="size-4 animate-spin" /> : <Upload className="size-4" />} 
                  Subir Arquivo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRUD Modals */}
      {modalState.type && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setModalState({ type: null })}>
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.08)] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {modalState.type === 'delete' ? (
                  <><Trash2 className="size-5 text-red-500" /> Excluir Item</>
                ) : modalState.type === 'rename' ? (
                  <><Edit2 className="size-5 text-blue-500" /> Renomear</>
                ) : (
                  <><FolderPlus className="size-5 text-blue-500" /> Nova Pasta</>
                )}
              </h3>
              <button onClick={() => setModalState({ type: null })} className="p-2 text-[#A1A1AA] hover:text-white rounded-full hover:bg-white/5 transition-colors">
                <X className="size-4" />
              </button>
            </div>
            
            <div className="p-6">
              {modalState.type === 'delete' ? (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="size-8 text-red-500" />
                  </div>
                  <p className="text-white text-lg font-medium">Tem certeza que deseja apagar?</p>
                  <p className="text-[#A1A1AA] text-sm break-words px-4">"{modalState.item?.name}" será enviado para a Lixeira do seu Google Drive.</p>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <label className="text-xs uppercase font-bold text-[#71717A] tracking-wider block">
                    {modalState.type === 'rename' ? 'Novo Nome' : 'Nome da Pasta'}
                  </label>
                  <input 
                    type="text" 
                    value={modalState.inputValue || ''} 
                    onChange={e => setModalState({ ...modalState, inputValue: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleAction()}
                    placeholder="Digite o nome..." 
                    className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-[#111113] border-t border-[rgba(255,255,255,0.04)] flex justify-end gap-3">
              <button onClick={() => setModalState({ type: null })} disabled={isProcessing} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button 
                onClick={handleAction} 
                disabled={isProcessing || (modalState.type !== 'delete' && !modalState.inputValue?.trim())} 
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg",
                  modalState.type === 'delete' ? "bg-red-600 hover:bg-red-500 shadow-red-600/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                )}
              >
                {isProcessing ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                {modalState.type === 'delete' ? 'Sim, Excluir' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Arquivo */}
      {selectedFile && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300" onClick={() => setSelectedFile(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* Fechar */}
            <button 
              onClick={() => setSelectedFile(null)} 
              className="absolute -top-12 right-0 sm:-right-12 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-50"
            >
              <X className="size-6" />
            </button>
            
            {/* Visualização */}
            <div className="relative w-full flex-1 min-h-[40vh] max-h-[70vh] flex items-center justify-center rounded-[2rem] overflow-hidden bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] shadow-2xl group">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111113]">
                 <ImageIcon className="size-16 text-[#71717A] mb-4 opacity-50" />
                 <span className="text-[#A1A1AA] text-sm font-medium">Visualização não disponível</span>
              </div>
              <img 
                src={`https://lh3.googleusercontent.com/d/${selectedFile.id}`} 
                alt={selectedFile.name} 
                className="w-full h-full object-contain relative z-10" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const fallback1 = `https://drive.google.com/uc?export=view&id=${selectedFile.id}`;
                  const fallback2 = selectedFile.thumbnail || "";
                  
                  if (target.src.includes('lh3.googleusercontent.com')) {
                    target.src = fallback1;
                  } else if (target.src.includes('drive.google.com/uc')) {
                    if (fallback2) target.src = fallback2;
                    else target.style.display = 'none';
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            </div>
            
            {/* Painel Inferior de Informações e Ações */}
            <div className="w-full mt-6 bg-[#111113]/80 backdrop-blur-md border border-[rgba(255,255,255,0.06)] rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h3 className="text-white font-bold text-lg truncate w-full px-2 sm:px-0">
                  {selectedFile.name}
                </h3>
                <p className="text-[#71717A] text-xs mt-1 uppercase tracking-wider font-bold">
                  Documento Google Drive
                </p>
              </div>
              
              <div className="flex items-center justify-center sm:justify-end gap-3 shrink-0">
                <button 
                  onClick={() => { setSelectedFile(null); setModalState({ type: 'rename', item: selectedFile, inputValue: selectedFile.name }); }} 
                  className="p-3 bg-white/5 hover:bg-blue-600/20 text-[#A1A1AA] hover:text-blue-400 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                  title="Renomear"
                >
                  <Edit2 className="size-5" />
                </button>
                <button 
                  onClick={() => { setSelectedFile(null); setModalState({ type: 'delete', item: selectedFile }); }} 
                  className="p-3 bg-white/5 hover:bg-red-600/20 text-[#A1A1AA] hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                  title="Excluir"
                >
                  <Trash2 className="size-5" />
                </button>
                <button 
                  onClick={() => handleDownload(selectedFile)} 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  <Download className="size-5" />
                  <span className="hidden sm:inline">Baixar/Abrir</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuração do Drive */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowSettings(false)}>
          <div className="bg-[#09090B] border border-[rgba(255,255,255,0.08)] rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between bg-[#111113]/50">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Settings className="size-5 text-blue-500" />
                  </div>
                  Configuração de Nuvem
                </h3>
                <p className="text-[#A1A1AA] text-xs mt-2 font-medium">Configure a integração com o Google Drive</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-gradient-to-b from-[#09090B] to-[#111113]/50">
              <div className="space-y-6">
                <div className="bg-[#111113] p-5 rounded-3xl border border-[rgba(255,255,255,0.04)]">
                  <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">1</span>
                    ID da Pasta Raiz
                  </label>
                  <input 
                    type="text" 
                    value={folderId} 
                    onChange={e => saveSettings(scriptUrl, e.target.value)} 
                    placeholder="Ex: 1A2b3C4d5E6f7G8h9I0j" 
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#3F3F46]" 
                  />
                  <p className="text-[11px] text-[#71717A] mt-3 leading-relaxed">
                    Copie o código presente na barra de endereço ao abrir a pasta "POSTS" no seu Google Drive pelo navegador.
                  </p>
                </div>
                
                <div className="bg-[#111113] p-5 rounded-3xl border border-[rgba(255,255,255,0.04)]">
                  <label className="text-[10px] uppercase font-bold text-[#71717A] tracking-widest block mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">2</span>
                    URL do Apps Script
                  </label>
                  <input 
                    type="text" 
                    value={scriptUrl} 
                    onChange={e => saveSettings(e.target.value, folderId)} 
                    placeholder="https://script.google.com/macros/s/.../exec" 
                    className="w-full bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-[#3F3F46]" 
                  />
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.04)] pt-8">
                <h4 className="text-sm font-bold text-white mb-4">Atualização do Script:</h4>
                <ol className="list-decimal pl-5 text-sm text-[#A1A1AA] space-y-3 mb-6">
                  <li>Acesse o <a href="https://script.google.com" target="_blank" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">Google Apps Script</a>.</li>
                  <li>Cole o <strong>novo código</strong> abaixo substituindo o existente.</li>
                  <li>Clique em <strong>Implantar {'>'} Nova Implantação</strong>.</li>
                  <li>Copie a nova URL gerada e cole no campo acima.</li>
                </ol>
                <div className="relative group">
                  <pre className="bg-[#111113] border border-[rgba(255,255,255,0.04)] p-6 rounded-3xl text-[11px] text-blue-300/80 overflow-x-auto custom-scrollbar shadow-inner leading-relaxed font-mono">
                    {appsScriptCode}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(appsScriptCode)}
                    className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2 hover:scale-105"
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

