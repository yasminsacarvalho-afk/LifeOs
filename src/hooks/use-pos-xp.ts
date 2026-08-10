import { useState, useEffect } from 'react';
import { usePosTasks } from '@/hooks/use-pos-tasks';
import { usePosHabits } from '@/hooks/use-pos-habits';
import { usePosLibrary } from '@/hooks/use-pos-library';
import { usePosStudies } from '@/hooks/use-pos-studies';
import { useTreasuryRealtime } from '@/hooks/use-treasury-realtime';
import { usePosHealth } from '@/hooks/use-pos-health';

export function usePosXP() {
  const { tasks } = usePosTasks();
  const { logs: habitLogs } = usePosHabits();
  const { books, sessions: readingSessions } = usePosLibrary();
  const { courses, sessions: studySessions } = usePosStudies();
  const { accounts: treasuryAccounts } = useTreasuryRealtime();
  const { logs: healthLogs } = usePosHealth();

  const [xpConfig, setXpConfig] = useState({
    tasks: 10,
    habits: 5,
    readingPage: 2,
    readingBook: 100,
    finance: 10
  });
  const [xpGoal, setXpGoal] = useState(10000);
  const [spentXP, setSpentXP] = useState(0);

  useEffect(() => {
    const savedSpent = localStorage.getItem('lifeos_pos_spent_xp');
    if (savedSpent) setSpentXP(Number(savedSpent));

    const savedConfig = localStorage.getItem('lifeos_pos_xp_config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setXpConfig({ ...xpConfig, ...parsed });
    }
    
    const savedGoal = localStorage.getItem('lifeos_pos_xp_goal');
    if (savedGoal) {
      setXpGoal(Number(savedGoal));
    }
  }, []);

  const totalPersonalCaixinhas = treasuryAccounts
    .filter(a => a.account_context === 'personal')
    .reduce((acc, a) => acc + (a.allocations || []).reduce((sum: number, al: any) => sum + Number(al.amount), 0), 0);

  const tasksXP = tasks.filter(t => t.status === 'concluida').length * xpConfig.tasks;
  const habitsXP = habitLogs.filter(l => l.status === 'concluido').length * xpConfig.habits;
  const readingXP = (readingSessions.reduce((acc, s) => acc + (s.pages_read || 0), 0) * xpConfig.readingPage) + (books.filter(b => b.status === 'concluido').length * xpConfig.readingBook);
  const studiesXP = courses.reduce((acc, c) => acc + (c.xp_awarded || 0), 0) + studySessions.reduce((acc, s) => acc + (s.xp_earned || 0), 0);
  const financeXP = Math.floor((totalPersonalCaixinhas / 100) * (xpConfig.finance || 10));

  const healthXP = Object.values(healthLogs).reduce((acc, log) => {
    let pts = 0;
    if (log.workoutDone) pts += 10;
    if (log.waterGlasses) pts += log.waterGlasses;
    if (log.sleepHours >= 7 && (log.sleepQuality === 'bom' || log.sleepQuality === 'excelente')) pts += 5;
    return acc + pts;
  }, 0);

  const totalXPEarned = tasksXP + habitsXP + readingXP + studiesXP + financeXP + healthXP;
  const currentXP = totalXPEarned - spentXP;

  const spendXP = (amount: number) => {
    const newSpent = spentXP + amount;
    setSpentXP(newSpent);
    localStorage.setItem('lifeos_pos_spent_xp', newSpent.toString());
  };

  const refundXP = (amount: number) => {
    const newSpent = Math.max(0, spentXP - amount);
    setSpentXP(newSpent);
    localStorage.setItem('lifeos_pos_spent_xp', newSpent.toString());
  };

  return {
    currentXP,
    totalXPEarned,
    spentXP,
    xpGoal,
    xpConfig,
    tasksXP,
    habitsXP,
    readingXP,
    studiesXP,
    financeXP,
    healthXP,
    spendXP,
    refundXP
  };
}
