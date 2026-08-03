import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, Controls, MiniMap, addEdge, 
  useNodesState, useEdgesState, Handle, Position, Node, Edge, Connection
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Trash2, GitBranch, BookOpen, Youtube } from 'lucide-react';

const EvidenceNode = ({ data }: any) => {
  let borderColor = "border-gray-500";
  let badgeColor = "bg-gray-500";
  let badgeText = "Desconhecido";

  switch(data.evidenceType) {
    case 'strong':
      borderColor = "border-emerald-500";
      badgeColor = "bg-emerald-500/20 text-emerald-400";
      badgeText = "🟢 Forte";
      break;
    case 'complementary':
      borderColor = "border-yellow-500";
      badgeColor = "bg-yellow-500/20 text-yellow-400";
      badgeText = "🟡 Complementar";
      break;
    case 'contestable':
      borderColor = "border-rose-500";
      badgeColor = "bg-rose-500/20 text-rose-400";
      badgeText = "🔴 Contestável";
      break;
    case 'opinion':
      borderColor = "border-slate-300";
      badgeColor = "bg-slate-300/20 text-slate-300";
      badgeText = "⚪ Opinião";
      break;
  }

  return (
    <div className={`bg-[#0F0F13] border-2 ${borderColor} rounded-xl p-3 w-[250px] shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-500 border-none" />
      <div className="flex flex-col gap-2">
         <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded w-fit ${badgeColor}`}>
           {badgeText}
         </div>
         <div className="text-sm text-white font-bold">{data.label}</div>
         {data.content && <div className="text-xs text-[#A1A1AA] mt-1">{data.content}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-500 border-none" />
    </div>
  );
};

const BookNode = ({ data }: any) => (
  <div className="bg-[#111113] border-2 border-indigo-500/50 rounded-xl p-3 w-[200px] shadow-lg">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500 border-none" />
    <div className="flex flex-col gap-2">
       <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest">
         <BookOpen className="size-3" /> Livro Ref.
       </div>
       <div className="text-sm text-white font-bold">{data.title}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-none" />
  </div>
);

const VideoNode = ({ data }: any) => (
  <div className="bg-[#111113] border-2 border-rose-500/50 rounded-xl p-3 w-[200px] shadow-lg">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-rose-500 border-none" />
    <div className="flex flex-col gap-2">
       <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-widest">
         <Youtube className="size-3" /> Vídeo Ref.
       </div>
       <div className="text-sm text-white font-bold">{data.title}</div>
       {data.description && <div className="text-xs text-[#A1A1AA] line-clamp-2 mt-1">{data.description}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-rose-500 border-none" />
  </div>
);

const nodeTypes = {
  evidence: EvidenceNode,
  book: BookNode,
  video: VideoNode,
};

interface PosLibraryInvestigationBoardProps {
  nodes: Node[];
  edges: Edge[];
  onChange: (nodes: Node[], edges: Edge[]) => void;
  timeline: any[];
  onTimelineSave: (snapshotName: string) => void;
  availableBooks?: { id: string; title: string }[];
  availableVideos?: { id: string; title: string; description: string }[];
}

export function PosLibraryInvestigationBoard({ 
  nodes: initialNodes, 
  edges: initialEdges, 
  onChange,
  timeline,
  onTimelineSave,
  availableBooks = [],
  availableVideos = []
}: PosLibraryInvestigationBoardProps) {
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);

  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeContent, setNewNodeContent] = useState('');
  const [newNodeType, setNewNodeType] = useState<'strong'|'complementary'|'contestable'|'opinion'>('strong');
  
  const [selectedRefBook, setSelectedRefBook] = useState('');
  const [selectedRefVideo, setSelectedRefVideo] = useState('');

  // Sync to parent when internal state changes
  useEffect(() => {
    onChange(nodes, edges);
  }, [nodes, edges]);

  // Update local state when parent props change 
  useEffect(() => {
    if (initialNodes && initialNodes.length !== nodes.length && nodes.length === 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleAddNode = () => {
    if (!newNodeLabel) return;
    const newNode: Node = {
      id: Math.random().toString(36).substring(7),
      type: 'evidence',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { 
        label: newNodeLabel, 
        content: newNodeContent, 
        evidenceType: newNodeType 
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setNewNodeLabel('');
    setNewNodeContent('');
  };

  const handleAddBookNode = () => {
    if (!selectedRefBook) return;
    const book = availableBooks.find(b => b.id === selectedRefBook);
    if (!book) return;
    const newNode: Node = {
      id: Math.random().toString(36).substring(7),
      type: 'book',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { title: book.title },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedRefBook('');
  };

  const handleAddVideoNode = () => {
    if (!selectedRefVideo) return;
    const video = availableVideos.find(v => v.id === selectedRefVideo);
    if (!video) return;
    const newNode: Node = {
      id: Math.random().toString(36).substring(7),
      type: 'video',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { title: video.title, description: video.description },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedRefVideo('');
  };

  const handleCreateSnapshot = () => {
    const name = prompt("Nome desta versão da investigação:");
    if (name) {
      onTimelineSave(name);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#050505] relative rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)]">
      
      {/* TOOLBAR */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-4 bg-[#0A0A0C]/90 backdrop-blur-md border border-[rgba(255,255,255,0.06)] p-4 rounded-xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* ADD EVIDENCE */}
        <div className="flex flex-col gap-2">
          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-1">Adicionar Evidência</h3>
          <input 
            type="text" 
            value={newNodeLabel} 
            onChange={e => setNewNodeLabel(e.target.value)} 
            placeholder="Título da Evidência"
            className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
          <textarea 
            value={newNodeContent} 
            onChange={e => setNewNodeContent(e.target.value)} 
            placeholder="Comentário ou detalhe..."
            className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-[#A1A1AA] focus:outline-none resize-none h-16"
          />
          <select 
            value={newNodeType} 
            onChange={(e: any) => setNewNodeType(e.target.value)}
            className="w-full bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="strong">🟢 Forte</option>
            <option value="complementary">🟡 Complementar</option>
            <option value="contestable">🔴 Contestável</option>
            <option value="opinion">⚪ Opinião</option>
          </select>
          <button 
            onClick={handleAddNode}
            className="w-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="size-3" /> Adicionar Evidência
          </button>
        </div>

        <div className="h-px bg-[rgba(255,255,255,0.06)] my-1"></div>

        {/* ADD REFERENCES */}
        <div className="flex flex-col gap-2">
          <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-1">Inserir Referências</h3>
          
          <div className="flex gap-2">
            <select 
              value={selectedRefBook} onChange={e => setSelectedRefBook(e.target.value)}
              className="flex-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">Selecione Livro...</option>
              {availableBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <button onClick={handleAddBookNode} className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg hover:bg-indigo-500/30 transition-colors shrink-0"><Plus className="size-4" /></button>
          </div>

          <div className="flex gap-2">
            <select 
              value={selectedRefVideo} onChange={e => setSelectedRefVideo(e.target.value)}
              className="flex-1 bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">Selecione Vídeo...</option>
              {availableVideos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
            <button onClick={handleAddVideoNode} className="bg-rose-500/20 text-rose-400 p-2 rounded-lg hover:bg-rose-500/30 transition-colors shrink-0"><Plus className="size-4" /></button>
          </div>
        </div>

        <div className="h-px bg-[rgba(255,255,255,0.06)] my-1"></div>

        <button 
          onClick={handleCreateSnapshot}
          className="w-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <GitBranch className="size-3" /> Salvar na Linha do Tempo
        </button>
      </div>

      {/* TIMELINE VISUALIZER */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-[#0A0A0C]/90 backdrop-blur-md border border-[rgba(255,255,255,0.06)] p-3 rounded-xl shadow-2xl w-48 max-h-[300px] overflow-y-auto custom-scrollbar">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-widest text-center mb-1">
          Histórico (Timeline)
        </h3>
        {timeline && timeline.length > 0 ? (
          timeline.map((snap, i) => (
            <div key={i} className="flex flex-col bg-[#111113] p-2 rounded-lg border border-[rgba(255,255,255,0.02)]">
               <span className="text-xs text-white font-bold">{snap.name}</span>
               <span className="text-[9px] text-[#71717A]">{new Date(snap.timestamp).toLocaleString('pt-BR')}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-center text-[#71717A] italic">Sem snapshots</div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#050505]"
      >
        <Background color="#333" gap={16} />
        <Controls className="bg-[#111113] border-[rgba(255,255,255,0.06)] fill-white" />
        <MiniMap 
          nodeColor={(node: any) => {
            if (node.type === 'book') return '#6366f1';
            if (node.type === 'video') return '#f43f5e';
            switch (node.data?.evidenceType) {
              case 'strong': return '#10b981';
              case 'complementary': return '#eab308';
              case 'contestable': return '#f43f5e';
              default: return '#94a3b8';
            }
          }}
          className="bg-[#111113] border-[rgba(255,255,255,0.06)]"
        />
      </ReactFlow>
    </div>
  );
}
