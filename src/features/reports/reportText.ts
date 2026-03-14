export const DEFAULT_REPORT_EMOJIS = {
  focus: '🚩',
  routine: '📌',
  results: '📄',
  nextMove: '🔜',
  issues: '⚠️',
} as const;

export const getCurrentTimeHM = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const sanitizeList = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

export const buildDailyLineItems = (items: string[], prefix: string) =>
  sanitizeList(items)
    .map((item, index) => (prefix === '✔️' ? `${prefix} ${item}` : `• ${prefix}${index + 1}] ${item}`))
    .join('\n\n');

export const getReportClosing = (gender: 'male' | 'female') =>
  (gender === 'female' ? 'ขอบคุณค่ะ' : 'ขอบคุณครับ');

export const buildMorningReportText = (report: {
  nickname: string;
  date: string;
  gender: 'male' | 'female';
  checkInTime: string;
  focusItems: string[];
  focusEmoji: string;
}) => {
  const focusText = buildDailyLineItems(report.focusItems, 'F') || '-';
  const timeStr = report.checkInTime ? `${report.checkInTime} น.` : '-';
  return `MORNING REPORT: ${report.nickname}
Date: ${report.date}
Check-in Time: ${timeStr}

-----------------------------------
${report.focusEmoji} FOCUS (งานที่โฟกัสหรือเร่งด่วนวันนี้)

${focusText}

-----------------------------------
🙏 ${getReportClosing(report.gender)}`;
};

export const buildEveningReportText = (report: {
  nickname: string;
  date: string;
  gender: 'male' | 'female';
  routineItems: string[];
  resultItems: string[];
  nextMoveItems: string[];
  issues: string;
  issueStatus: 'resolved' | 'unresolved';
  issueDetail: string;
  issueNextStep: string;
  routineEmoji: string;
  resultsEmoji: string;
  nextMoveEmoji: string;
  issuesEmoji: string;
}) => {
  const routineText = buildDailyLineItems(report.routineItems, '✔️') || '✔️ -';
  const resultsText = buildDailyLineItems(report.resultItems, 'R') || '• R1] -';
  const nextMoveText = buildDailyLineItems(report.nextMoveItems, 'N') || '• N1] -';
  let issueSection = `${report.issuesEmoji}ISSUES (ปัญหาที่พบในวันนี้): ${report.issues.trim() || 'ไม่มี'}`;
  if (report.issues.trim() && report.issues.trim() !== 'ไม่มี') {
    issueSection += `\nสถานะ: ${report.issueStatus === 'resolved' ? '✅ แก้ไขได้แล้ว' : '❌ ยังแก้ไขไม่ได้'}`;
    if (report.issueDetail.trim()) issueSection += `\nรายละเอียด: ${report.issueDetail.trim()}`;
    if (report.issueNextStep.trim()) issueSection += `\nแนวทางดำเนินการต่อ: ${report.issueNextStep.trim()}`;
  }
  return `EVENING REPORT: ${report.nickname}
Date: ${report.date}

-----------------------------------
${report.routineEmoji} ROUTINE

${routineText}

-----------------------------------
${report.resultsEmoji}RESULTS (ผลลัพธ์ของงานวันนี้):

${resultsText}

-----------------------------------
${report.nextMoveEmoji}NEXT MOVE (พรุ่งนี้จะทำอะไรต่อ):

${nextMoveText}

-----------------------------------
${issueSection}

-----------------------------------
🙏 ${getReportClosing(report.gender)}`;
};
