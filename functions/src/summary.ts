import type { EntryDocument, MonthlySummaryStats } from './types.js';

export const buildFallbackSummary = (
  nickname: string,
  role: string,
  monthLabel: string,
  stats: MonthlySummaryStats,
  topGroups: Array<{ name: string; credits: number }>,
) => {
  const topGroupText = topGroups.length
    ? `กลุ่มงานเด่นคือ ${topGroups.map((group) => `${group.name} (${group.credits} Cr.)`).join(', ')}`
    : 'ยังไม่มีกลุ่มงานเด่นในเดือนนี้';
  return [
    `${nickname || 'ผู้ใช้งาน'} (${role || 'Custom'}) ทำผลงานในเดือน ${monthLabel} ได้ ${stats.totalCredits} จากเป้า ${stats.targetCredits} Credits (${Math.round(stats.percent)}%).`,
    `มีการบันทึกงานทั้งหมด ${stats.entryCount} รายการ และ ${topGroupText}.`,
    stats.percent >= 100
      ? 'ภาพรวมถือว่าทำได้ถึงเป้าหมายแล้ว ควรรักษาความสม่ำเสมอและคัดงานคุณภาพสูงต่อเนื่อง.'
      : 'ภาพรวมยังไม่ถึงเป้าหมาย ควรโฟกัสกลุ่มงานที่ทำเครดิตได้สูงและเพิ่มความสม่ำเสมอของการบันทึกงาน.',
  ].join(' ');
};

export const buildMonthlyStats = (entries: EntryDocument[], monthlyTarget: number): MonthlySummaryStats => {
  const totalCredits = entries.reduce((sum, entry) => sum + Number(entry.credits || 0), 0);
  const entryCount = entries.length;
  const percent = monthlyTarget > 0 ? Math.min((totalCredits / monthlyTarget) * 100, 100) : 0;
  return {
    totalCredits,
    targetCredits: monthlyTarget,
    entryCount,
    percent,
  };
};

export const topGroupsForEntries = (entries: EntryDocument[]) => {
  const groups = new Map<string, number>();
  for (const entry of entries) {
    const label = entry.groupName || entry.groupId || 'Unknown';
    groups.set(label, (groups.get(label) || 0) + Number(entry.credits || 0));
  }
  return [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, credits]) => ({ name, credits }));
};

export const generateGeminiSummary = async ({
  apiKey,
  nickname,
  role,
  monthLabel,
  stats,
  topGroups,
}: {
  apiKey: string;
  nickname: string;
  role: string;
  monthLabel: string;
  stats: MonthlySummaryStats;
  topGroups: Array<{ name: string; credits: number }>;
}) => {
  const prompt =
    `คุณเป็น KPI analyst ช่วยสรุปผลการทำงานเป็นภาษาไทย 3-5 ประโยค\n` +
    `ชื่อ: ${nickname}\n` +
    `ตำแหน่ง: ${role}\n` +
    `เดือน: ${monthLabel}\n` +
    `Credits: ${stats.totalCredits}/${stats.targetCredits}\n` +
    `จำนวนรายการ: ${stats.entryCount}\n` +
    `กลุ่มเด่น: ${topGroups.map((group) => `${group.name} (${group.credits} Cr.)`).join(', ') || 'ไม่มี'}\n`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!response.ok) {
    throw new Error(`gemini_failed_${response.status}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
};
