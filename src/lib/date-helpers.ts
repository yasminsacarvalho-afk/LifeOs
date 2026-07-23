export interface FinancialPeriod {
  startStr: string; // YYYY-MM-DD
  endStr: string;   // YYYY-MM-DD
  startDate: Date;
  endDate: Date;
  daysInPeriod: number;
}

export function getLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Retorna as datas de início e fim da "Competência Financeira" com base na data de referência.
 * Regra: do dia 26 de um mês até o final do dia 25 do mês seguinte.
 * Exemplo: 
 * - Se referenceDate é 10/06/2026, o período é 26/05/2026 a 25/06/2026.
 * - Se referenceDate é 27/06/2026, o período é 26/06/2026 a 25/07/2026.
 */
export function getFinancialPeriod(referenceDate: Date = new Date()): FinancialPeriod {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let startYear = year;
  let startMonth = month;
  let endYear = year;
  let endMonth = month;

  // Se o dia atual for menor ou igual a 25, a competência fecha neste mês, então começou no mês anterior.
  // Se o dia atual for 26 ou mais, a competência começou neste mês e fechará no próximo.
  if (day <= 25) {
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  } else {
    endMonth = month + 1;
    if (endMonth > 11) {
      endMonth = 0;
      endYear += 1;
    }
  }

  // Cria as datas considerando o fuso horário local corretamente (evitando problemas de UTC)
  const startDate = new Date(startYear, startMonth, 26, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, 25, 23, 59, 59, 999);

  // Formato YYYY-MM-DD
  const formatIso = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const startStr = formatIso(startDate);
  const endStr = formatIso(endDate);

  // Calcula dias no período
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Normalmente 30 ou 31 dias

  return {
    startStr,
    endStr,
    startDate,
    endDate,
    daysInPeriod
  };
}

/**
 * Verifica se uma data string (YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS) 
 * está dentro do período financeiro de referência.
 */
export function isWithinFinancialPeriod(dateString: string, referenceDate: Date = new Date()): boolean {
  if (!dateString) return false;
  const period = getFinancialPeriod(referenceDate);
  const targetDateStr = dateString.split("T")[0].split(" ")[0]; // Pega apenas YYYY-MM-DD
  return targetDateStr >= period.startStr && targetDateStr <= period.endStr;
}

/**
 * Retorna o dia atual dentro da competência (ex: se o período começou dia 26, e hoje é 27, retorna 2).
 * Útil para cálculo de "Pacing" diário.
 */
export function getCurrentDayOfFinancialPeriod(referenceDate: Date = new Date()): number {
  const period = getFinancialPeriod(referenceDate);
  const diffTime = Math.abs(referenceDate.getTime() - period.startDate.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
