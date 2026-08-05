import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Bot, X, Brain, Target, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';

export function VoiceAssistantWidget() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ message: string, persona: 'Estrategista' | 'Executor' | 'Companheiro' } | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const closeTimeoutRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript;
        setTranscript(result);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (recognitionRef.current?.transcriptTemp) {
          processCommand(recognitionRef.current.transcriptTemp);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error("Erro no reconhecimento de voz.");
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Update ref to always have latest transcript when onend fires
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.transcriptTemp = transcript;
    }
  }, [transcript]);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      toast.error("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setAiResponse(null);
      setIsOpen(true);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const processCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setAiResponse(null);
    
    try {
      // Split command string into multiple sub-commands based on common conjunctions
      const commands = text.toLowerCase().split(/ e | e também | depois | em seguida | \. /i).filter(c => c.trim().length > 2);
      
      let overallMessage = "";
      let overallPersona: 'Estrategista' | 'Executor' | 'Companheiro' = 'Companheiro';
      let needsReload = false;

      for (const cmd of commands) {
        let responseMessage = "";
        
        // ==========================================
        // 1. FINANÇAS (CRUD) -> Estrategista
        // ==========================================
        if (cmd.includes('lançar custo') || cmd.includes('lançar despesa') || cmd.includes('adicionar despesa') || cmd.includes('gastei') || cmd.includes('registre um gasto')) {
          const numbers = cmd.match(/\d+(?:[.,]\d+)?/g);
          const amountStr = numbers ? numbers[0].replace(',', '.') : null;
          let title = cmd.replace(/lançar custo|lançar despesa|adicionar despesa|gastei|registre um gasto/i, '').trim();
          if (amountStr) title = title.replace(new RegExp(`${amountStr.replace('.', '\\.')}\\s*(reais|centavos|de|em)?`, 'i'), '').trim();
          title = title.replace(/^(de|com|no|na)\s+/i, '').trim();

          if (amountStr && title) {
            const amount = parseFloat(amountStr);
            const { error } = await supabase.from('pos_expenses').insert([{
              title: title.charAt(0).toUpperCase() + title.slice(1),
              amount: amount, expense_date: format(new Date(), 'yyyy-MM-dd')
            }]);
            if (!error) {
               responseMessage = `R$ ${amount} em ${title} contabilizados.`;
               overallPersona = 'Estrategista';
               needsReload = true;
            }
          } else {
             responseMessage = "Faltou o valor ou o nome da despesa.";
          }
        }
        
        // ==========================================
        // 2. TAREFAS - CRIAR -> Executor
        // ==========================================
        else if (cmd.includes('criar tarefa') || cmd.includes('adicionar tarefa') || cmd.includes('nova tarefa')) {
          let title = cmd.replace(/criar tarefa|adicionar tarefa|nova tarefa/gi, '').trim();
          if (title.startsWith('de') || title.startsWith('para')) title = title.substring(2).trim();

          if (title) {
            const { error } = await supabase.from('pos_tasks').insert([{
              title: title.charAt(0).toUpperCase() + title.slice(1),
              status: 'pendente', priority: 'media', delayed_count: 0
            }]);
            if (!error) {
               responseMessage = `Tarefa "${title}" anotada.`;
               overallPersona = 'Executor';
               needsReload = true;
            }
          }
        }
        
        // ==========================================
        // 3. TAREFAS - CONCLUIR -> Executor
        // ==========================================
        else if (cmd.includes('concluir tarefa') || cmd.includes('tarefa feita') || cmd.includes('terminei a tarefa') || cmd.includes('marque a tarefa')) {
           let title = cmd.replace(/concluir tarefa|tarefa feita|terminei a tarefa|marque a tarefa|como concluída/gi, '').trim();
           title = title.replace(/^(de|a|o)\s+/i, '').trim();
           
           if (title) {
              const { data } = await supabase.from('pos_tasks').select('*').ilike('title', `%${title}%`).eq('status', 'pendente').limit(1);
              if (data && data.length > 0) {
                 await supabase.from('pos_tasks').update({ status: 'concluida' }).eq('id', data[0].id);
                 responseMessage = `Excelente! Tarefa "${data[0].title}" concluída.`;
                 overallPersona = 'Executor';
                 needsReload = true;
              } else {
                 responseMessage = `Não achei nenhuma tarefa pendente parecida com "${title}".`;
              }
           } else {
              responseMessage = "Me diga o nome da tarefa para eu concluir.";
           }
        }

        // ==========================================
        // 4. BIBLIOTECA - MARCAR LIDO -> Estrategista
        // ==========================================
        else if (cmd.includes('marcar livro') || cmd.includes('marcar leitura') || (cmd.includes('livro') && cmd.includes('lido')) || cmd.includes('leitura concluída') || (cmd.includes('leitura') && cmd.includes('concluída'))) {
           let title = cmd.replace(/marcar livro|como lido|já li o livro|já li o|marcar leitura|do capítulo|como concluída|leitura concluída/gi, '').trim();
           title = title.replace(/^(de|a|o|do)\s+/i, '').trim();
           
           if (title) {
              const { data } = await supabase.from('pos_library').select('*').ilike('title', `%${title}%`).limit(1);
              if (data && data.length > 0) {
                 await supabase.from('pos_library').update({ status: 'concluido' }).eq('id', data[0].id);
                 responseMessage = `Parabéns pela leitura! "${data[0].title}" marcado como concluído.`;
                 overallPersona = 'Estrategista';
                 needsReload = true;
              } else {
                 // Try a general update if they just said "marque a leitura como concluída" without a book title
                 const { data: latestReading } = await supabase.from('pos_library').select('*').eq('status', 'lendo').limit(1);
                 if (latestReading && latestReading.length > 0) {
                    await supabase.from('pos_library').update({ status: 'concluido' }).eq('id', latestReading[0].id);
                    responseMessage = `Sua leitura atual "${latestReading[0].title}" foi marcada como concluída!`;
                    overallPersona = 'Estrategista';
                    needsReload = true;
                 } else {
                    responseMessage = `Não encontrei o livro "${title}".`;
                 }
              }
           } else {
               // Fallback when no title provided, look for the first 'lendo'
               const { data: latestReading } = await supabase.from('pos_library').select('*').eq('status', 'lendo').limit(1);
               if (latestReading && latestReading.length > 0) {
                  await supabase.from('pos_library').update({ status: 'concluido' }).eq('id', latestReading[0].id);
                  responseMessage = `Sua leitura atual "${latestReading[0].title}" foi marcada como concluída!`;
                  overallPersona = 'Estrategista';
                  needsReload = true;
               }
           }
        }

        // ==========================================
        // 5. ALARMES & EVENTOS -> Companheiro
        // ==========================================
        else if (cmd.includes('criar alarme') || cmd.includes('me acorde') || cmd.includes('despertar as')) {
          const timeMatch = cmd.match(/(\d{1,2})(:| | e | horas e )?(\d{2})?( horas)?/);
          if (timeMatch) {
            const hour = timeMatch[1].padStart(2, '0');
            const min = (timeMatch[3] || '00').padStart(2, '0');
            const timeStr = `${hour}:${min}`;
            
            const existing = JSON.parse(localStorage.getItem('lifeos_alarms') || '[]');
            existing.push({ id: Date.now().toString(), time: timeStr, label: 'Alarme por Voz', enabled: true, sound: 'radar' });
            localStorage.setItem('lifeos_alarms', JSON.stringify(existing));
            
            responseMessage = `Alarme para as ${timeStr} configurado.`;
            overallPersona = 'Companheiro';
          } else {
            responseMessage = "Diga um horário válido para o alarme.";
          }
        }

        // ==========================================
        // 6. NAVEGAÇÃO
        // ==========================================
        else if (cmd.includes('abrir') || cmd.includes('mostrar') || cmd.includes('ir para')) {
          if (cmd.includes('livro') || cmd.includes('leitura') || cmd.includes('biblioteca')) {
            navigate({ to: '/personal-os', search: { tab: 'leitura' } }); responseMessage = "Abrindo Cosmos Literário."; overallPersona = 'Companheiro';
          } else if (cmd.includes('financeiro') || cmd.includes('dinheiro') || cmd.includes('finanças')) {
            navigate({ to: '/personal-os', search: { tab: 'financeiro' } }); responseMessage = "Abrindo seu financeiro."; overallPersona = 'Estrategista';
          } else if (cmd.includes('tarefa')) {
            navigate({ to: '/personal-os', search: { tab: 'tarefas' } }); responseMessage = "Abrindo tarefas. Foco total!"; overallPersona = 'Executor';
          } else if (cmd.includes('hábito')) {
            navigate({ to: '/personal-os', search: { tab: 'habitos' } }); responseMessage = "Abrindo hábitos."; overallPersona = 'Executor';
          } else if (cmd.includes('meta')) {
            navigate({ to: '/personal-os', search: { tab: 'metas' } }); responseMessage = "Abrindo metas."; overallPersona = 'Estrategista';
          } else if (cmd.includes('agenda') || cmd.includes('compromisso')) {
            navigate({ to: '/personal-os', search: { tab: 'agenda' } }); responseMessage = "Abrindo agenda."; overallPersona = 'Estrategista';
          }
        }
        
        // ==========================================
        // 7. GENÉRICAS
        // ==========================================
        else if (cmd.includes('como estou indo') || cmd.includes('resumo') || cmd.includes('status')) {
           responseMessage = "Você está progredindo! Mantenha a disciplina nos hábitos e foque nas metas de longo prazo.";
           overallPersona = 'Companheiro';
        }
        else if (cmd.includes('o que devo fazer') || cmd.includes('próximo passo')) {
           responseMessage = "Ataque a prioridade mais alta de hoje. Chega de pensar, hora de executar!";
           overallPersona = 'Executor';
        }

        if (responseMessage) {
           overallMessage += overallMessage ? " " + responseMessage : responseMessage;
        }
      }

      if (!overallMessage) {
         overallMessage = "Não consegui identificar a ação. Tente algo como: 'Registre 50 reais de almoço e marque a leitura atual como concluída'.";
         overallPersona = 'Companheiro';
      }

      setAiResponse({ message: overallMessage, persona: overallPersona });

      if (needsReload) {
         setTimeout(() => window.location.reload(), 4000);
      }

    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao processar a voz: " + e.message);
    } finally {
      setIsProcessing(false);
      // Fecha a janela após 8 segundos para dar tempo de ler a resposta
      closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 8000);
    }
  };

  return (
    <>
      {/* Main floating button */}
      <button
        onClick={toggleListen}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 md:bottom-8 md:left-auto md:-translate-x-0 md:right-8 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${isListening ? 'bg-rose-500 scale-110 animate-pulse border-2 border-white' : 'bg-rose-600 border border-rose-400/50 hover:scale-105'} text-white`}
        title="Assistente de Voz"
      >
        {isListening ? <Mic className="size-6" /> : <Bot className="size-6" />}
      </button>

      {/* Overlay for voice feedback */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#111113]/95 border border-[rgba(255,255,255,0.1)] p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 flex flex-col gap-5 relative">
            
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="size-5 text-rose-500" />
                Conselho Pessoal
              </h4>
              <button onClick={() => { setIsOpen(false); if(isListening) recognitionRef.current?.stop(); }} className="text-[#A1A1AA] hover:text-white transition-colors bg-white/5 rounded-full p-1.5">
                <X className="size-4" />
              </button>
            </div>
            
            <div className="min-h-[120px] flex flex-col items-center justify-center text-center">
              {isListening ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex justify-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <p className="text-xl text-white font-bold tracking-tight">
                    {transcript ? `"${transcript}"` : "Pode falar, estou ouvindo..."}
                  </p>
                  
                  {!transcript && (
                    <div className="w-full mt-4 flex flex-col gap-2">
                       <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1 text-left">Exemplos de Comandos:</p>
                       <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-3 rounded-xl text-sm text-white/80 flex items-center gap-3">
                         <Target className="size-4 text-rose-500 shrink-0" />
                         <p className="text-left font-medium">"Crie a tarefa revisar os emails"</p>
                       </div>
                       <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-3 rounded-xl text-sm text-white/80 flex items-center gap-3">
                         <Brain className="size-4 text-blue-400 shrink-0" />
                         <p className="text-left font-medium">"Registre um gasto de 50 reais de lanche"</p>
                       </div>
                    </div>
                  )}
                </div>
              ) : isProcessing ? (
                <div className="flex flex-col items-center gap-3 text-rose-500">
                  <Loader2 className="size-8 animate-spin" />
                  <span className="font-bold text-lg">Processando comando...</span>
                </div>
              ) : aiResponse ? (
                <div className="flex flex-col gap-3 text-left w-full">
                  <div className="flex items-start gap-4">
                    <div className={`size-10 rounded-full border flex items-center justify-center shrink-0 shadow-lg ${aiResponse.persona === 'Estrategista' ? 'bg-blue-500/10 border-blue-500/30' : aiResponse.persona === 'Executor' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      {aiResponse.persona === 'Estrategista' && <Brain className="size-5 text-blue-400" />}
                      {aiResponse.persona === 'Executor' && <Target className="size-5 text-rose-500" />}
                      {aiResponse.persona === 'Companheiro' && <Coffee className="size-5 text-emerald-400" />}
                    </div>
                    <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-4 rounded-2xl rounded-tl-none w-full shadow-inner">
                      <p className={`font-bold mb-1.5 text-xs uppercase tracking-widest ${aiResponse.persona === 'Estrategista' ? 'text-blue-400' : aiResponse.persona === 'Executor' ? 'text-rose-500' : 'text-emerald-400'}`}>{aiResponse.persona}</p>
                      <p className="text-base text-white leading-relaxed">{aiResponse.message}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 text-left w-full mt-1">
                   <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1 text-center">O que você pode dizer:</p>
                   <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-3 rounded-xl text-sm text-white/80 flex items-start gap-3 hover:border-rose-500/30 transition-colors cursor-default">
                     <Target className="size-4 text-rose-500 shrink-0 mt-0.5" />
                     <p>"Crie a tarefa revisar emails e conclua a tarefa reunião"</p>
                   </div>
                   <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-3 rounded-xl text-sm text-white/80 flex items-start gap-3 hover:border-blue-500/30 transition-colors cursor-default">
                     <Brain className="size-4 text-blue-400 shrink-0 mt-0.5" />
                     <p>"Registre um gasto de 50 reais de almoço"</p>
                   </div>
                   <div className="bg-[#1A1A1E] border border-[rgba(255,255,255,0.05)] p-3 rounded-xl text-sm text-white/80 flex items-start gap-3 hover:border-emerald-500/30 transition-colors cursor-default">
                     <Coffee className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                     <p>"Marque minha leitura atual como concluída"</p>
                   </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
