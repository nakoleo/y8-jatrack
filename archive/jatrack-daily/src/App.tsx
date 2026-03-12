/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Copy, 
  History, 
  Sun, 
  Moon, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Clock,
  User,
  LayoutDashboard,
  ArrowRight,
  X,
  Share2,
  Eye,
  Check,
  XCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ReportType = 'morning' | 'evening';

interface Report {
  id?: number;
  type: ReportType;
  name: string;
  gender?: 'male' | 'female';
  date: string;
  check_in_time?: string;
  focus?: string;
  routine?: string;
  results?: string;
  next_move?: string;
  issues?: string;
  issue_status?: 'resolved' | 'unresolved';
  issue_detail?: string;
  issue_next_step?: string;
  created_at?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ReportType | 'history'>('morning');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form states
  const [name, setName] = useState(localStorage.getItem('report_name') || '');
  const [gender, setGender] = useState<'male' | 'female'>((localStorage.getItem('report_gender') as any) || 'male');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  
  const [checkInTime, setCheckInTime] = useState(getCurrentTime());
  
  // Morning specific
  const [focusList, setFocusList] = useState<string[]>(['']);
  
  // Evening specific
  const [routineList, setRoutineList] = useState<string[]>(['']);
  const [resultsList, setResultsList] = useState<string[]>(['']);
  const [nextMoveList, setNextMoveList] = useState<string[]>(['']);
  const [issues, setIssues] = useState('');
  const [issueStatus, setIssueStatus] = useState<'resolved' | 'unresolved'>('resolved');
  const [issueDetail, setIssueDetail] = useState('');
  const [issueNextStep, setIssueNextStep] = useState('');

  useEffect(() => {
    fetchReports();
    // Update time when tab changes to morning
    if (activeTab === 'morning') {
      setCheckInTime(getCurrentTime());
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('report_name', name);
    localStorage.setItem('report_gender', gender);
  }, [name, gender]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    }
  };

  const deleteReport = async (id: number) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) fetchReports();
    } catch (error) {
      console.error('Failed to delete report', error);
    }
  };

  const formatList = (list: string[], prefix: string) => {
    return list
      .filter(item => item.trim() !== '')
      .map((item, index) => {
        if (prefix === '✔️') return `${prefix} ${item}`;
        return `• ${prefix}${index + 1}] ${item}`;
      })
      .join('\n\n');
  };

  const getClosing = (g?: string) => {
    return g === 'female' ? 'ขอบคุณค่ะ' : 'ขอบคุณครับ';
  };

  const generateMorningText = (report: Partial<Report>) => {
    const focusText = Array.isArray(report.focus) 
      ? formatList(report.focus, 'F') 
      : report.focus;
    
    const timeStr = report.check_in_time ? `${report.check_in_time} น.` : '';

    return `MORNING REPORT: ${report.name}
Date: ${report.date}
Check-in Time: ${timeStr}

-----------------------------------
🚩 FOCUS (งานที่โฟกัสหรือเร่งด่วนวันนี้)

${focusText}

-----------------------------------
🙏 ${getClosing(report.gender || gender)}`;
  };

  const generateEveningText = (report: Partial<Report>) => {
    const routineText = Array.isArray(report.routine)
      ? formatList(report.routine, '✔️')
      : report.routine;

    const resultsText = Array.isArray(report.results) 
      ? formatList(report.results, 'R') 
      : report.results;
    
    const nextMoveText = Array.isArray(report.next_move) 
      ? formatList(report.next_move, 'N') 
      : report.next_move;

    let issueSection = `▪️ISSUES (ปัญหาที่พบในวันนี้): ${report.issues || 'ไม่มี'}`;
    if (report.issues && report.issues !== 'ไม่มี') {
      issueSection += `\nสถานะ: ${report.issue_status === 'resolved' ? '✅ แก้ไขได้แล้ว' : '❌ ยังแก้ไขไม่ได้'}`;
      if (report.issue_detail) issueSection += `\nรายละเอียด: ${report.issue_detail}`;
      if (report.issue_next_step) issueSection += `\nแนวทางดำเนินการต่อ: ${report.issue_next_step}`;
    }

    return `EVENING REPORT: ${report.name}
Date: ${report.date}

-----------------------------------
📄 ROUTINE

${routineText}

-----------------------------------
🔹RESULTS (ผลลัพธ์ของงานวันนี้):

${resultsText}

-----------------------------------
▪️NEXT MOVE (พรุ่งนี้จะทำอะไรต่อ):

${nextMoveText}

-----------------------------------
${issueSection}

-----------------------------------
🙏 ${getClosing(report.gender || gender)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const reportData = {
      type: activeTab as ReportType,
      name,
      gender,
      date,
      ...(activeTab === 'morning' 
        ? { check_in_time: checkInTime, focus: formatList(focusList, 'F') } 
        : { 
            routine: formatList(routineList, '✔️'), 
            results: formatList(resultsList, 'R'), 
            next_move: formatList(nextMoveList, 'N'), 
            issues,
            issue_status: issueStatus,
            issue_detail: issueDetail,
            issue_next_step: issueNextStep
          })
    };

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (res.ok) {
        fetchReports();
        if (activeTab === 'morning') setFocusList(['']);
        else {
          setRoutineList(['']);
          setResultsList(['']);
          setNextMoveList(['']);
          setIssues('');
          setIssueStatus('resolved');
          setIssueDetail('');
          setIssueNextStep('');
        }
        setActiveTab('history');
      }
    } catch (error) {
      console.error('Failed to save report', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const handleRemoveListItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[]) => {
    if (list.length > 1) {
      setter(prev => prev.filter((_, i) => i !== index));
    } else {
      setter(['']);
    }
  };

  const handleUpdateListItem = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => {
      const newList = [...prev];
      newList[index] = value;
      return newList;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const previewText = useMemo(() => {
    if (activeTab === 'morning') {
      return generateMorningText({ name, gender, date, check_in_time: checkInTime, focus: focusList as any });
    } else if (activeTab === 'evening') {
      return generateEveningText({ 
        name, gender, date, 
        routine: routineList as any, 
        results: resultsList as any, 
        next_move: nextMoveList as any, 
        issues,
        issue_status: issueStatus,
        issue_detail: issueDetail,
        issue_next_step: issueNextStep
      });
    }
    return '';
  }, [activeTab, name, gender, date, checkInTime, focusList, routineList, resultsList, nextMoveList, issues, issueStatus, issueDetail, issueNextStep]);

  const ListInputGroup = ({ 
    label, 
    icon: Icon, 
    list, 
    prefix, 
    setter 
  }: { 
    label: string, 
    icon: any, 
    list: string[], 
    prefix: string, 
    setter: React.Dispatch<React.SetStateAction<string[]>> 
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" /> {label}
        </label>
        <button 
          type="button"
          onClick={() => handleAddListItem(setter)}
          className="text-xs font-bold text-orange-600 active:scale-95 transition-transform flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {list.map((item, index) => (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={index} 
            className="flex gap-2.5 items-center"
          >
            <div className={`flex-none w-10 h-10 flex items-center justify-center bg-orange-50 rounded-2xl text-[10px] font-bold text-orange-400 border border-orange-100/50`}>
              {prefix === '✔️' ? prefix : `${prefix}${index + 1}`}
            </div>
            <input 
              type="text"
              value={item}
              onChange={(e) => handleUpdateListItem(index, e.target.value, setter)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              className="flex-1 h-12 px-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px]"
            />
            <button 
              type="button"
              onClick={() => handleRemoveListItem(index, setter, list)}
              className="flex-none w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 active:scale-90 transition-all"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF9F5] iphone-top-safe iphone-bottom-safe pb-24 md:pb-8 relative overflow-y-auto overflow-x-hidden">
      {/* Parallax Background Elements */}
      <div className="parallax-bg">
        <motion.div 
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="parallax-circle w-[400px] h-[400px] bg-orange-200 -top-20 -left-20" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 0], 
            y: [0, 60, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="parallax-circle w-[300px] h-[300px] bg-pink-200 top-1/2 -right-20" 
        />
      </div>

      <div className="max-w-xl mx-auto px-5 pt-8 md:pt-12 relative z-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-orange-100 border border-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFD93D] via-[#FF8C42] to-[#FF6B6B] opacity-10 group-hover:opacity-20 transition-opacity" />
                <LayoutDashboard className="w-7 h-7 text-orange-500 relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 logo-gradient">JaTrack Daily</h1>
                <p className="text-[13px] text-slate-400 font-medium">Y8 | PV Reports</p>
              </div>
            </motion.div>
            
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setShowPreview(true)}
              className="md:hidden w-11 h-11 rounded-2xl bg-white/70 backdrop-blur-xl border border-white flex items-center justify-center text-slate-600 active:bg-white transition-colors shadow-sm"
            >
              <Eye className="w-5 h-5" />
            </motion.button>
          </div>
        </header>

        {/* Main Content Area */}
        <main>
          <AnimatePresence mode="wait">
            {activeTab !== 'history' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">User</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        className="w-full h-13 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px]"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Gender</label>
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 h-13">
                      <button 
                        type="button"
                        onClick={() => setGender('male')}
                        className={`flex-1 rounded-xl text-lg transition-all flex items-center justify-center ${gender === 'male' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-slate-300'}`}
                      >
                        ♂
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGender('female')}
                        className={`flex-1 rounded-xl text-lg transition-all flex items-center justify-center ${gender === 'female' ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'text-slate-300'}`}
                      >
                        ♀
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-13 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px]"
                      required
                    />
                  </div>
                </div>

                {activeTab === 'morning' && (
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Check-in</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={checkInTime} 
                          onChange={(e) => setCheckInTime(e.target.value)}
                          className="w-full h-13 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px]"
                        />
                      </div>
                    </div>
                    
                    <ListInputGroup 
                      label="Focus (งานที่โฟกัสหรือเร่งด่วนวันนี้)" 
                      icon={CheckCircle2} 
                      list={focusList} 
                      prefix="F" 
                      setter={setFocusList} 
                    />
                  </div>
                )}

                {activeTab === 'evening' && (
                  <div className="space-y-8">
                    <ListInputGroup 
                      label="Routine" 
                      icon={FileText} 
                      list={routineList} 
                      prefix="✔️" 
                      setter={setRoutineList} 
                    />

                    <ListInputGroup 
                      label="Results (ผลลัพธ์ของงานวันนี้)" 
                      icon={CheckCircle2} 
                      list={resultsList} 
                      prefix="R" 
                      setter={setResultsList} 
                    />

                    <ListInputGroup 
                      label="Next Move (พรุ่งนี้จะทำอะไรต่อ)" 
                      icon={ArrowRight} 
                      list={nextMoveList} 
                      prefix="N" 
                      setter={setNextMoveList} 
                    />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Issues (ปัญหาที่พบในวันนี้)</label>
                        <div className="relative">
                          <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            value={issues} 
                            onChange={(e) => setIssues(e.target.value)}
                            placeholder="มีปัญหาอะไรไหม? (ถ้าไม่มีใส่ 'ไม่มี')"
                            className="w-full h-13 pl-11 pr-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px]"
                          />
                        </div>
                      </div>

                      {issues && issues !== 'ไม่มี' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-4 pt-2"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">สถานะปัญหา</label>
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 h-13">
                              <button 
                                type="button"
                                onClick={() => setIssueStatus('resolved')}
                                className={`flex-1 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${issueStatus === 'resolved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-slate-400'}`}
                              >
                                <Check className="w-4 h-4" /> แก้ไขได้แล้ว
                              </button>
                              <button 
                                type="button"
                                onClick={() => setIssueStatus('unresolved')}
                                className={`flex-1 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${issueStatus === 'unresolved' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'text-slate-400'}`}
                              >
                                <XCircle className="w-4 h-4" /> ยังแก้ไขไม่ได้
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">อย่างไร / รายละเอียด</label>
                            <textarea 
                              value={issueDetail} 
                              onChange={(e) => setIssueDetail(e.target.value)}
                              placeholder="อธิบายรายละเอียดการแก้ไข หรือสาเหตุที่ยังแก้ไม่ได้"
                              rows={2}
                              className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px] resize-none"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">แนวทางการดำเนินการต่อ</label>
                            <textarea 
                              value={issueNextStep} 
                              onChange={(e) => setIssueNextStep(e.target.value)}
                              placeholder="ต้องทำอะไรต่อเพื่อจัดการปัญหานี้?"
                              rows={2}
                              className="w-full p-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-[15px] resize-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Save Report
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {reports.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-white/50 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-white">
                      <History className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-medium">No reports yet</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <motion.div 
                      layout
                      key={report.id} 
                      className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-sm group relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${report.type === 'morning' ? 'bg-orange-50 text-orange-600' : 'bg-pink-50 text-pink-600'}`}>
                            {report.type === 'morning' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-[15px] text-slate-900">{report.type === 'morning' ? 'Morning' : 'Evening'}</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{report.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => copyToClipboard(report.type === 'morning' ? generateMorningText(report) : generateEveningText(report))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 active:bg-orange-50 active:text-orange-600 transition-all border border-slate-100"
                          >
                            <Copy className="w-4.5 h-4.5" />
                          </button>
                          <button 
                            onClick={() => report.id && deleteReport(report.id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-400 active:bg-red-50 active:text-red-500 transition-all border border-slate-100"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[13px] text-slate-500 line-clamp-2 font-medium leading-relaxed">
                        {report.type === 'morning' ? report.focus : report.results}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Desktop Preview (Hidden on Mobile) */}
        <div className="hidden lg:block fixed top-12 right-12 w-96">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Preview</span>
              <button 
                onClick={() => copyToClipboard(previewText)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[13px] font-bold transition-all"
              >
                {copySuccess ? <ClipboardCheck className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                {copySuccess ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="bg-slate-800/40 rounded-3xl p-6 font-mono text-[13px] leading-relaxed text-slate-300 min-h-[400px] border border-white/5 whitespace-pre-wrap">
              {activeTab === 'history' ? 'Select a tab to preview' : previewText}
            </div>
          </div>
        </div>

        {/* Mobile Preview Drawer */}
        <AnimatePresence>
          {showPreview && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreview(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
              />
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 bg-slate-900 rounded-t-[2.5rem] z-50 md:hidden iphone-bottom-safe max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-white font-bold text-lg">Preview</h2>
                    <button 
                      onClick={() => setShowPreview(false)}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 bg-slate-800/40 rounded-3xl p-6 font-mono text-[13px] leading-relaxed text-slate-300 overflow-y-auto whitespace-pre-wrap border border-white/5 mb-8">
                    {previewText || 'No content to preview'}
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(previewText)}
                    className="w-full h-15 bg-white text-slate-900 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl"
                  >
                    {copySuccess ? <ClipboardCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    {copySuccess ? 'Copied to Clipboard' : 'Copy for LINE'}
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Navigation (iPhone Style) */}
        <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 z-40 iphone-bottom-safe">
          <div className="max-w-xl mx-auto px-6 h-20 flex items-center justify-between">
            <NavButton 
              active={activeTab === 'morning'} 
              onClick={() => setActiveTab('morning')} 
              icon={Sun} 
              label="Morning" 
              color="orange"
            />
            <NavButton 
              active={activeTab === 'evening'} 
              onClick={() => setActiveTab('evening')} 
              icon={Moon} 
              label="Evening" 
              color="pink"
            />
            <NavButton 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')} 
              icon={History} 
              label="History" 
              color="slate"
            />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: any, label: string, color: string }) {
  const activeColor = color === 'orange' ? 'text-orange-500' : color === 'pink' ? 'text-pink-500' : 'text-slate-600';
  const activeBg = color === 'orange' ? 'bg-orange-50' : color === 'pink' ? 'bg-pink-50' : 'bg-slate-50';
  const indicatorColor = color === 'orange' ? 'bg-orange-500' : color === 'pink' ? 'bg-pink-500' : 'bg-slate-600';

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all relative ${active ? activeColor : 'text-slate-400'}`}
    >
      <div className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${active ? activeBg : 'bg-transparent'}`}>
        <Icon className={`w-5 h-5 transition-all ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
      </div>
      <span className={`text-[10px] font-bold tracking-wide transition-all ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className={`absolute -top-1 w-1 h-1 ${indicatorColor} rounded-full`}
        />
      )}
    </button>
  );
}
