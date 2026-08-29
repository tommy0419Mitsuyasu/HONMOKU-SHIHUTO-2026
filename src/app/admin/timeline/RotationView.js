import React, { useMemo, useRef } from 'react';
import { generateRotation } from '@/lib/rotation-engine';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './timeline.css';

export default function RotationView({ shifts, staff, date, onOpenModal }) {
  const dayTableRef = useRef(null);
  const nightTableRef = useRef(null);

  const rotationData = useMemo(() => {
    const displayShifts = shifts.filter(s => 
      s.work_date === date && 
      (s.status === 'approved' || s.status === 'cancel_requested')
    );
    return generateRotation(displayShifts, staff);
  }, [shifts, staff, date]);

  const handleDownloadPDF = async () => {
    if (!dayTableRef.current) return;

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Export Day Table
      const canvasDay = await html2canvas(dayTableRef.current, { scale: 2, useCORS: true, logging: false });
      const imgDataDay = canvasDay.toDataURL('image/png');
      
      let renderWidthDay = pdfWidth;
      let renderHeightDay = (canvasDay.height * pdfWidth) / canvasDay.width;
      
      // もし縦幅がページに収まらない場合、縦幅を基準に縮小する
      if (renderHeightDay > pdfHeight) {
        renderHeightDay = pdfHeight;
        renderWidthDay = (canvasDay.width * pdfHeight) / canvasDay.height;
      }
      
      const xDay = (pdfWidth - renderWidthDay) / 2;
      const yDay = (pdfHeight - renderHeightDay) / 2;
      
      pdf.addImage(imgDataDay, 'PNG', xDay, yDay, renderWidthDay, renderHeightDay);

      // Export Night Table if it exists/visible
      if (nightTableRef.current) {
        pdf.addPage();
        const canvasNight = await html2canvas(nightTableRef.current, { scale: 2, useCORS: true, logging: false });
        const imgDataNight = canvasNight.toDataURL('image/png');
        
        let renderWidthNight = pdfWidth;
        let renderHeightNight = (canvasNight.height * pdfWidth) / canvasNight.width;
        
        if (renderHeightNight > pdfHeight) {
          renderHeightNight = pdfHeight;
          renderWidthNight = (canvasNight.width * pdfHeight) / canvasNight.height;
        }
        
        const xNight = (pdfWidth - renderWidthNight) / 2;
        const yNight = (pdfHeight - renderHeightNight) / 2;
        
        pdf.addImage(imgDataNight, 'PNG', xNight, yNight, renderWidthNight, renderHeightNight);
      }

      pdf.save(`ローテーション表_${date}.pdf`);
    } catch (err) {
      console.error('PDF生成エラー:', err);
      alert('PDFの生成に失敗しました。');
    }
  };

  if (!rotationData || (!rotationData.daySlots.length && !rotationData.nightSlots.length)) {
    return (
      <div className="empty-state" style={{ marginTop: '40px' }}>
        <div className="empty-icon">📅</div>
        <div className="empty-title">表示できるシフトがありません</div>
      </div>
    );
  }

  const getCellColor = (pos) => {
    if (!pos) return 'transparent';
    if (pos === '準備') return 'transparent';
    if (pos === '掃除') return '#888888'; // Grey
    if (pos === '休憩') return '#00E5FF'; // Cyan
    if (pos === 'St') return '#FFEB3B'; // Yellow
    if (pos === '当割') return '#E0E0E0'; // Light grey
    // 横, T1-T4, B, 上, 下, etc
    return '#FF9800'; 
  };

  const adminRows = Array.from({ length: 5 }, (_, i) => i);

  const renderTable = (slots, tableRef, title) => {
    if (slots.length === 0) return null;
    return (
      <div className="rotation-table-wrapper" ref={tableRef} style={{ marginBottom: '40px' }}>
        <div className="rotation-date-header">
          {date} - {title} ローテーション表
        </div>
        <table className="rotation-table">
          <thead>
            <tr>
              <th className="staff-col">氏名</th>
              <th className="time-col">出勤</th>
              <th className="time-col">退社</th>
              <th className="time-col">計</th>
              <th className="time-col">休憩</th>
              {slots.map(slot => (
                <th key={slot.label}>{slot.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 責任者枠 (5行固定) */}
            {adminRows.map((_, i) => (
              <tr key={`admin-${i}`}>
                <td className="staff-col" style={{ fontWeight: 'bold' }}>{i === 0 ? '責任者' : '責任者'}</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                {slots.map(slot => {
                  // 17:00-18:00, 20:30-21:30 is 掃除
                  const isCleaning = (slot.start >= 1020 && slot.start < 1080) || (slot.start >= 1230 && slot.start < 1290);
                  const content = isCleaning ? '掃除' : '';
                  const bgColor = isCleaning ? '#888888' : '#FFEB3B'; // Yellow for admin empty
                  return (
                    <td key={slot.label} style={{ backgroundColor: bgColor, color: isCleaning ? 'white' : 'black', fontWeight: 'bold' }}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
            
            {/* スタッフ枠 */}
            {rotationData.rows.filter(row => row.startMins < slots[slots.length - 1].end && row.endMins > slots[0].start).map(row => (
              <tr key={row.staff.id}>
                <td 
                  className="staff-col" 
                  style={{ color: 'red', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => onOpenModal(row.shift)}
                  title="シフトを編集"
                >
                  {row.staff.full_name}
                </td>
                <td>{row.shift.start_time}</td>
                <td>{row.shift.end_time}</td>
                <td>{row.durationHours}</td>
                <td>{row.hasBreak ? '有り' : ''}</td>
                {slots.map(slot => {
                  const assignment = row.assignments[slot.label];
                  const bgColor = getCellColor(assignment);
                  const isWorking = slot.start >= row.startMins && slot.start < row.endMins;
                  
                  return (
                    <td 
                      key={slot.label}
                      style={{ 
                        backgroundColor: isWorking ? bgColor : '#FFFFFF',
                        color: assignment === '掃除' ? 'white' : 'black',
                        fontWeight: assignment ? 'bold' : 'normal'
                      }}
                    >
                      {isWorking ? (assignment || '') : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="rotation-container">
      <div className="rotation-header-actions">
        <h2 className="rotation-title">自動生成ローテーション表</h2>
        <button className="btn btn-primary" onClick={handleDownloadPDF}>
          📥 PDFダウンロード（DAY/NIGHT一括）
        </button>
      </div>

      {renderTable(rotationData.daySlots, dayTableRef, 'DAYプール (8:00-17:30)')}
      {renderTable(rotationData.nightSlots, nightTableRef, 'ナイトプール (18:00-21:30)')}
    </div>
  );
}
