import React from 'react';
import { Calendar as CalendarIcon, ChevronDown, FileText, Minus, Plus, RefreshCw, Upload } from 'lucide-react';
import type { DriveAttachment, LocalFileRef, Task, WorkGroups } from '@/domain/types';

interface LogTabProps {
  orderedGroupKeys: string[];
  kpiConfig: WorkGroups;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  selectedGroup: string;
  setSelectedGroup: (value: string) => void;
  selectedTaskId: string;
  setSelectedTaskId: (value: string) => void;
  expandedGroups: Set<string>;
  setExpandedGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  autoHoverExpand: boolean;
  hoveredGroup: string | null;
  setHoveredGroup: (value: string | null) => void;
  currentTask?: Task;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  notes: string;
  setNotes: (value: string) => void;
  canvaLink: string;
  setCanvaLink: (value: string) => void;
  driveLink: string;
  setDriveLink: (value: string) => void;
  logAttachments: DriveAttachment[];
  setLogAttachments: React.Dispatch<React.SetStateAction<DriveAttachment[]>>;
  pendingLocalFiles: LocalFileRef[];
  setPendingLocalFiles: React.Dispatch<React.SetStateAction<LocalFileRef[]>>;
  logDriveInputRef: React.RefObject<HTMLInputElement | null>;
  handleDriveFilesSelected: (event: React.ChangeEvent<HTMLInputElement>, mode: 'log' | 'edit') => void;
  handlePickLocalFile: () => Promise<LocalFileRef[]>;
  driveUploading: boolean;
  handleAddEntry: () => void;
  isLoading: boolean;
}

export function LogTab({
  orderedGroupKeys,
  kpiConfig,
  selectedDate,
  setSelectedDate,
  selectedGroup,
  setSelectedGroup,
  selectedTaskId,
  setSelectedTaskId,
  expandedGroups,
  setExpandedGroups,
  autoHoverExpand,
  hoveredGroup,
  setHoveredGroup,
  currentTask,
  quantity,
  setQuantity,
  notes,
  setNotes,
  canvaLink,
  setCanvaLink,
  driveLink,
  setDriveLink,
  logAttachments,
  setLogAttachments,
  pendingLocalFiles,
  setPendingLocalFiles,
  logDriveInputRef,
  handleDriveFilesSelected,
  handlePickLocalFile,
  driveUploading,
  handleAddEntry,
  isLoading,
}: LogTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="panel-card rounded-[26px] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <CalendarIcon size={14} className="text-slate-400" />
          <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#2C2A28]">บันทึกงาน</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="section-kicker">วันที่</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl font-semibold text-[#2C2A28] text-[13px] outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="section-kicker">กลุ่มงาน</label>
            <div className="space-y-2">
              {orderedGroupKeys.map((key) => {
                const grp = kpiConfig[key];
                const isActive = selectedGroup === key;
                const isExpanded = expandedGroups.has(key) || (autoHoverExpand && hoveredGroup === key);
                const hasY8 = grp.brands?.includes('y8');
                const hasPv = grp.brands?.includes('pv');
                const brandLabel = hasY8 && hasPv ? 'Y8-PV' : hasY8 ? 'Y8' : hasPv ? 'PV' : null;
                const brandBg = hasY8 && hasPv ? 'linear-gradient(90deg,#FEF3E2,#FDE8F2)' : hasY8 ? '#FEF3E2' : '#FDE8F2';
                const brandColor = hasY8 && hasPv ? '#9D5C1A' : hasY8 ? '#F4823C' : '#E87AA5';

                return (
                  <div
                    key={key}
                    className="rounded-[16px] overflow-hidden border transition-all duration-200"
                    style={{ borderColor: isActive ? grp.color : 'rgb(241 245 249)', background: isActive ? grp.bg : 'white' }}
                    onMouseEnter={() => autoHoverExpand && setHoveredGroup(key)}
                    onMouseLeave={() => autoHoverExpand && setHoveredGroup(null)}
                  >
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                      onClick={() => {
                        setSelectedGroup(key);
                        setSelectedTaskId(grp.tasks[0]?.id || '');
                        setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          next.has(key) ? next.delete(key) : next.add(key);
                          return next;
                        });
                      }}
                    >
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                        style={{ background: grp.color }}
                      >
                        {grp.icon || key.slice(0, 1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12px] font-bold text-[#2C2A28] truncate">{grp.name}</p>
                          {brandLabel && (
                            <span className="text-[7px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: brandBg, color: brandColor }}>
                              {brandLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400">{grp.tasks.length} งาน</p>
                      </div>
                      <ChevronDown
                        size={14}
                        className="text-slate-300 shrink-0 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </button>

                    <div
                      style={{
                        maxHeight: isExpanded ? `${grp.tasks.length * 80 + 60}px` : '0px',
                        overflow: 'hidden',
                        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                      }}
                    >
                      <div className="px-3 pb-2.5 space-y-1.5 border-t" style={{ borderColor: `${grp.color}33` }}>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pt-2">เลือกงาน</p>
                        {grp.tasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setSelectedGroup(key);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left"
                            style={{
                              background: selectedTaskId === task.id && isActive ? grp.color : 'white',
                              color: selectedTaskId === task.id && isActive ? 'white' : '#2C2A28',
                              border: `1px solid ${selectedTaskId === task.id && isActive ? grp.color : 'rgb(241 245 249)'}`,
                            }}
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-black opacity-70 mr-1">[{task.id}]</span>
                              <span className="text-[12px] font-semibold">{task.name}</span>
                            </div>
                            <span className="shrink-0 text-[11px] font-black ml-2 opacity-80">
                              {task.creditPerUnit} Cr/{task.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="section-kicker">จำนวน ({currentTask?.unit})</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-[22px] font-black text-[#2C2A28]">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="section-kicker">Credits</label>
              <div className="h-11 min-w-[76px] rounded-xl px-4 flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg, #F4823C, #F5A855)' }}>
                <span className="text-[22px] font-light text-white">{quantity * (currentTask?.creditPerUnit || 1)}</span>
                <span className="text-[9px] text-white/60 mt-1">Cr.</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="section-kicker">หมายเหตุ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เพิ่มรายละเอียด"
              rows={2}
              className="w-full px-4 py-3 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none resize-none text-[#2C2A28] placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-2">
            <label className="section-kicker">แนบงาน</label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded pointer-events-none" style={{ background: '#7C3AED' }}>C</span>
              <input
                type="url"
                value={canvaLink}
                onChange={(e) => setCanvaLink(e.target.value)}
                placeholder="Canva link..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none text-[#2C2A28] placeholder:text-slate-300"
              />
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white px-1.5 py-0.5 rounded pointer-events-none" style={{ background: '#1D6F42' }}>D</span>
              <input
                type="url"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="Google Drive link..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#FDFAF7] border border-slate-200 rounded-xl text-[13px] outline-none text-[#2C2A28] placeholder:text-slate-300"
              />
            </div>

            {logAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {logAttachments.map((att, index) => (
                  <div key={index} className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 max-w-full">
                    <span className="text-[9px] font-bold text-emerald-700 truncate" style={{ maxWidth: 160 }} title={att.normalizedName}>
                      {att.normalizedName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-emerald-300 active:text-rose-400 ml-1 text-[12px] leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input ref={logDriveInputRef} type="file" multiple className="hidden" onChange={(e) => handleDriveFilesSelected(e, 'log')} />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => logDriveInputRef.current?.click()}
                disabled={driveUploading}
                className={`btn-secondary py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${driveUploading ? 'opacity-60' : ''}`}
              >
                {driveUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                {driveUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด Drive'}
              </button>
              <button
                onClick={() => {
                  void handlePickLocalFile();
                }}
                className="btn-secondary py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <FileText size={13} /> ไฟล์ในเครื่อง
              </button>
            </div>

            {pendingLocalFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pendingLocalFiles.map((localFile, index) => (
                  <div key={index} className="flex items-center gap-1 bg-teal-50 border border-teal-100 rounded-lg px-2 py-1 max-w-full">
                    {localFile.thumbnail && <img src={localFile.thumbnail} className="w-4 h-4 rounded object-cover shrink-0" alt="" />}
                    <span className="text-[9px] font-bold text-teal-700 truncate" style={{ maxWidth: 120 }} title={localFile.name}>
                      {localFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingLocalFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-teal-300 active:text-rose-400 ml-1 text-[12px] leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleAddEntry}
            disabled={isLoading}
            className={`btn-primary w-full rounded-[18px] py-4 text-[13px] font-bold tracking-[0.12em] active:scale-[0.99] ${isLoading ? 'opacity-60' : ''}`}
          >
            {isLoading ? <RefreshCw className="animate-spin mx-auto" size={18} /> : 'บันทึกข้อมูล'}
          </button>
        </div>
      </section>
    </div>
  );
}
