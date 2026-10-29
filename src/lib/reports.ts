// Report deadlines and working calendar helpers for 2026–2027

export type ReportItem = {
  id: string;
  period: "quarterly" | "annual";
  name: string;
  park: string;
  deadlineRule: string;
  fromTo: string;
  eBudget: string;
  basis: string;
};

export const REPORTS: ReportItem[] = [
  {
    id: "ip-prom-exp-q",
    period: "quarterly",
    name: "Отчет о расходах (софинансирование Субсидии)",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "Минпред и туризма РБ → Минэк РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 139-09-2026-046 от 23.12.2025, ПП РФ № 316",
  },
  {
    id: "ip-prom-res-q",
    period: "quarterly",
    name: "Отчет о достижении значений результатов использования Субсидии",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 15-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "Минпред и туризма РБ → Минэк РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 139-09-2026-046 от 23.12.2025, ПП РФ № 316",
  },
  {
    id: "ip-prom-graf-q",
    period: "quarterly",
    name: "График выполнения мероприятия (Приложение № 8)",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 10-го числа месяца, следующего за отчетным кварталом",
    fromTo: "Минпром РБ → Минэк РФ",
    eBudget: "Нет (СЭД)",
    basis: "Фед. соглашение 139-09-2026-046/1 от 02.04.2026, ПП РФ № 316",
  },
  {
    id: "ip-prom-graf-exec-q",
    period: "quarterly",
    name: "Отчет об исполнении графика (Приложение № 9)",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 10-го числа месяца, следующего за отчетным кварталом",
    fromTo: "Минпром РБ → Минэк РФ",
    eBudget: "Нет (СЭД)",
    basis: "Фед. соглашение 139-09-2026-046/1 от 02.04.2026, ПП РФ № 316",
  },
  {
    id: "ip-prom-uk-exp-q",
    period: "quarterly",
    name: "Отчет о расходах (источник — Субсидия)",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 5 рабочего дня, следующего за отчетным кварталом",
    fromTo: "ООО «УК «ПРОМ» → Электронный бюджет",
    eBudget: "Да",
    basis: "Соглашение 10-2026-041005 от 30.05.2026, ПП РФ № 316",
  },
  {
    id: "ip-prom-uk-res-q",
    period: "quarterly",
    name: "Отчет о достижении значений результатов предоставления Субсидии",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 5 рабочего дня, следующего за отчетным кварталом",
    fromTo: "ООО «УК «ПРОМ» → Электронный бюджет",
    eBudget: "Да",
    basis: "Соглашение 10-2026-041005 от 30.05.2026, ПП РФ № 316",
  },
  {
    id: "ip-prom-uk-act-q",
    period: "quarterly",
    name: "Отчет о реализации проекта (Отчет о деятельности)",
    park: "Индустриальный парк «Промышленный»",
    deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "ООО «УК «ПРОМ» → Минпром РБ",
    eBudget: "Нет (СЭД)",
    basis: "Соглашение 10-2026-041005 от 30.05.2026, ПП РФ № 316",
  },
  {
    id: "rv1-res-q",
    period: "quarterly",
    name: "Отчет о достижении значений результатов использования Субсидии",
    park: "Радиоэлектронный технопарк «РВ-1»",
    deadlineRule: "не позднее 15 рабочих дней месяца, следующего за отчетным кварталом",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2023-063 от 08.11.2023, ПП РФ № 1659",
  },
  {
    id: "rv1-res-y",
    period: "annual",
    name: "Отчет о достижении значений результатов использования Субсидии (годовой)",
    park: "Радиоэлектронный технопарк «РВ-1»",
    deadlineRule: "не позднее 30 рабочих дней месяца, следующего за отчетным годом (уточнённый — до 10 февраля)",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2023-063 от 08.11.2023, ПП РФ № 1659",
  },
  {
    id: "rv1-uk-exp-y",
    period: "annual",
    name: "Отчет о расходах (источник — Субсидия)",
    park: "Радиоэлектронный технопарк «РВ-1»",
    deadlineRule: "не позднее 5 рабочего дня, следующего за отчетным годом",
    fromTo: "ООО УК «РВ-1» → Минпром РБ",
    eBudget: "Да",
    basis: "Соглашения 10-2023-095459 / 10-2024-073100, ПП РФ № 1659",
  },
  {
    id: "rv1-uk-res-y",
    period: "annual",
    name: "Отчет о достижении значений показателей результативности",
    park: "Радиоэлектронный технопарк «РВ-1»",
    deadlineRule: "не позднее 5 рабочего дня, следующего за отчетным годом",
    fromTo: "ООО УК «РВ-1» → Минпром РБ",
    eBudget: "Да",
    basis: "Соглашения 10-2023-095459 / 10-2024-073100, ПП РФ № 1659",
  },
  {
    id: "master-exp-y",
    period: "annual",
    name: "Отчет о расходах бюджета РБ (софинансирование)",
    park: "ООО ТПТ «Мастер»",
    deadlineRule: "не позднее 45 числа месяца, следующего за отчетным годом",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2024-106 от 22.01.2024, ПП РФ № 328",
  },
  {
    id: "master-res-y",
    period: "annual",
    name: "Отчет о достижении значений результатов использования Субсидии",
    park: "ООО ТПТ «Мастер»",
    deadlineRule: "не позднее 30 рабочих дней месяца, следующего за отчетным годом (уточнённый — до 10 февраля)",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2024-106 от 22.01.2024, ПП РФ № 328",
  },
  {
    id: "ufim-exp-y",
    period: "annual",
    name: "Отчет о расходах бюджета РБ (софинансирование)",
    park: "Индустриальный парк «Уфимский»",
    deadlineRule: "не позднее 45 числа месяца, следующего за отчетным годом",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2024-107 от 22.01.2024, ПП РФ № 328",
  },
  {
    id: "ufim-res-y",
    period: "annual",
    name: "Отчет о достижении значений результатов использования Субсидии",
    park: "Индустриальный парк «Уфимский»",
    deadlineRule: "не позднее 30 рабочих дней месяца, следующего за отчетным годом (уточнённый — до 10 февраля)",
    fromTo: "Минпром РБ → Минпромторг РФ",
    eBudget: "Да",
    basis: "Фед. соглашение 020-09-2024-107 от 22.01.2024, ПП РФ № 328",
  },
  {
    id: "csi-exp-q",
    period: "quarterly",
    name: "Отчет о расходах (источник — субсидия)",
    park: "АНО «Центр содействия инновациям в РБ»",
    deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "ЦСИ РБ → Минпром РБ",
    eBudget: "Да",
    basis: "Соглашение 40-2026-000193 от 04.03.2026",
  },
  {
    id: "csi-res-q",
    period: "quarterly",
    name: "Отчет о достижении значения результата предоставления субсидии",
    park: "АНО «Центр содействия инновациям в РБ»",
    deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "ЦСИ РБ → Минпром РБ",
    eBudget: "Да",
    basis: "Соглашение 40-2026-000193 от 04.03.2026",
  },
  {
    id: "csi-plan-q",
    period: "quarterly",
    name: "Отчет о реализации плана мероприятий (контрольные точки)",
    park: "АНО «Центр содействия инновациям в РБ»",
    deadlineRule: "не позднее 10-го рабочего дня месяца, следующего за отчетным кварталом",
    fromTo: "ЦСИ РБ → Минпром РБ",
    eBudget: "Частично",
    basis: "Соглашение 40-2026-000193 от 04.03.2026",
  },
  {
    id: "korp-res-q",
    period: "quarterly",
    name: "Отчет о достижении значений показателей результата Субсидии",
    park: "АО «Корпорация развития РБ»",
    deadlineRule: "не позднее 10 рабочего числа следующего за отчетным кварталом",
    fromTo: "Корпорация развития → Минпром РБ",
    eBudget: "Да",
    basis: "ПП РБ № 489, соглашение №1 (Амкодор)",
  },
  {
    id: "korp-ind-q",
    period: "quarterly",
    name: "Отчет по показателям для достижения результатов Субсидии",
    park: "АО «Корпорация развития РБ»",
    deadlineRule: "не позднее 10 рабочего числа следующего за отчетным кварталом",
    fromTo: "Корпорация развития → Минпром РБ",
    eBudget: "Да",
    basis: "ПП РБ № 489, соглашение №1 (Амкодор)",
  },
  {
    id: "korp-plan-q",
    period: "quarterly",
    name: "Отчет о реализации плана мероприятий",
    park: "АО «Корпорация развития РБ»",
    deadlineRule: "не позднее 10 рабочего числа следующего за отчетным кварталом",
    fromTo: "Корпорация развития → Минпром РБ",
    eBudget: "Да",
    basis: "ПП РБ № 489, соглашение №1 (Амкодор)",
  },
  {
    id: "korp-exp-q",
    period: "quarterly",
    name: "Отчет о расходах (источник — Субсидия)",
    park: "АО «Корпорация развития РБ»",
    deadlineRule: "не позднее 10 рабочего числа следующего за отчетным кварталом",
    fromTo: "Корпорация развития → Минпром РБ",
    eBudget: "Да",
    basis: "ПП РБ № 489, соглашение №1 (Амкодор)",
  },
  {
    id: "korp-res-y",
    period: "annual",
    name: "Отчет о достижении значений результата предоставления субсидии",
    park: "АО «Корпорация развития РБ»",
    deadlineRule: "до 1 апреля года, следующего за отчетным годом",
    fromTo: "Корпорация развития → Минпром РБ",
    eBudget: "Да",
    basis: "ПП РБ № 489, соглашение №1 (Амкодор)",
  },
  {
    id: "infra-check-y",
    period: "annual",
    name: "Сведения о проверке объектов инфраструктуры",
    park: "Парки (общее)",
    deadlineRule: "не позднее 15-го числа 2-го месяца 1 квартала",
    fromTo: "→ Минпромторг / Минфин",
    eBudget: "—",
    basis: "Пункт 12 ПП РФ от 30.10.2014 № 1119",
  },
  {
    id: "vas-y",
    period: "annual",
    name: "Информация о сумме совокупной добавленной стоимости на территориях парков",
    park: "Парки (общее)",
    deadlineRule: "ежегодно до 1 марта года, следующего за отчетным годом",
    fromTo: "→ Минпромторг РФ и Минфин РФ",
    eBudget: "—",
    basis: "Пункт 63 ПП РФ от 30.10.2014 № 1119",
  },
];

const HOLIDAYS = new Set([
  "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05",
  "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09",
  "2026-02-21", "2026-02-22", "2026-02-23",
  "2026-03-07", "2026-03-08", "2026-03-09",
  "2026-05-01", "2026-05-02", "2026-05-03",
  "2026-05-09", "2026-05-10", "2026-05-11",
  "2026-06-12", "2026-06-13", "2026-06-14",
  "2026-11-04",
  "2026-12-31",
  "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05",
  "2027-01-06", "2027-01-07", "2027-01-08", "2027-01-09", "2027-01-10",
  "2027-02-21", "2027-02-22", "2027-02-23",
  "2027-03-06", "2027-03-07", "2027-03-08",
  "2027-05-01", "2027-05-02", "2027-05-03",
  "2027-05-08", "2027-05-09", "2027-05-10",
  "2027-06-12", "2027-06-13", "2027-06-14",
  "2027-11-04", "2027-11-05", "2027-11-06", "2027-11-07",
  "2027-12-31",
]);

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAYS.has(iso(d));
}

export function nthWorkingDay(from: Date, n: number): Date {
  const d = new Date(from);
  let count = 0;
  while (true) {
    if (isWorkingDay(d)) {
      count++;
      if (count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

function monthAfterQuarter(year: number, quarter: number): Date {
  const month = quarter * 3;
  if (month === 12) return new Date(year + 1, 0, 1);
  return new Date(year, month, 1);
}

export type CalendarEvent = {
  date: string;
  report: ReportItem;
  periodLabel: string;
};

function deadlineForReport(r: ReportItem, year: number, q: number | null): Date {
  const rule = r.deadlineRule.toLowerCase();
  if (r.period === "quarterly" && q !== null) {
    const start = monthAfterQuarter(year, q);
    if (rule.includes("5 рабоч") && rule.includes("следующего за отчетным кварталом")) {
      return nthWorkingDay(new Date(start), 5);
    }
    if (rule.includes("10-го рабочего дня") || rule.includes("10 рабочего")) {
      return nthWorkingDay(start, 10);
    }
    if (rule.includes("15-го рабочего") || rule.includes("15 рабочих")) {
      return nthWorkingDay(start, 15);
    }
    if (rule.includes("10-го числа")) {
      return new Date(start.getFullYear(), start.getMonth(), 10);
    }
    return nthWorkingDay(start, 10);
  }
  const jan1 = new Date(year, 0, 1);
  if (rule.includes("1 апреля") || rule.includes("до 1 апреля")) return new Date(year, 3, 1);
  if (rule.includes("1 марта") || rule.includes("до 1 марта")) return new Date(year, 2, 1);
  if (rule.includes("15-го числа 2-го месяца")) return new Date(year, 1, 15);
  if (rule.includes("5 рабочего дня")) return nthWorkingDay(jan1, 5);
  if (rule.includes("30 рабочих")) return nthWorkingDay(jan1, 30);
  if (rule.includes("45")) return new Date(year, 1, 14);
  if (rule.includes("10 февраля")) return new Date(year, 1, 10);
  return nthWorkingDay(jan1, 10);
}

export function buildEventsForYear(
  year: number,
  reports: ReportItem[] = REPORTS
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const r of reports) {
    if (r.period === "quarterly") {
      for (let q = 1; q <= 4; q++) {
        const deadline = deadlineForReport(r, year, q);
        events.push({
          date: iso(deadline),
          report: r,
          periodLabel: `Q${q} ${year}`,
        });
      }
    } else {
      const deadline = deadlineForReport(r, year, null);
      events.push({
        date: iso(deadline),
        report: r,
        periodLabel: `Год ${year - 1}`,
      });
    }
  }
  return events;
}

export function eventsByDate(
  year: number,
  reports: ReportItem[] = REPORTS
): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const e of buildEventsForYear(year, reports)) {
    if (!map[e.date]) map[e.date] = [];
    map[e.date].push(e);
  }
  return map;
}

export function mergeReports(
  custom: ReportItem[],
  removedIds: string[]
): ReportItem[] {
  const removed = new Set(removedIds);
  return [...REPORTS.filter((r) => !removed.has(r.id)), ...custom];
}
