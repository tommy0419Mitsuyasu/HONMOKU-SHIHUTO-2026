import React, { useState, useMemo, useRef, useEffect } from 'react';
import { generateRotation } from '@/lib/rotation-engine';
import { useData } from '@/lib/providers';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './timeline.css';

export default function RotationView({ shifts, staff, date, onOpenModal }) {
  const dayTableRef = useRef(null);
  const nightTableRef = useRef(null);
  
  const { rotations, saveRotation, deleteRotation } = useData();
  const [isEditMode, setIsEditMode] = useState(false);
  const [localRotationData, setLocalRotationData] = useState(null);

  const savedRotation = useMemo(() => {
    return rotations.find(r => r.date === date);
  }, [rotations, date]);

  const autoRotationData = useMemo(() => {
    const displayShifts = shifts.filter(s => 
      s.work_date === date && 
      (s.status === 'approved' || s.status === 'cancel_requested')
    );
    return generateRotation(displayShifts, staff);
  }, [shifts, staff, date]);

  // Sync local data with saved or auto data
  useEffect(() => {
    if (savedRotation) {
      setLocalRotationData(savedRotation.data);
    } else {
      // Create a deep copy of auto-generated data so we can mutate it freely
      setLocalRotationData(JSON.parse(JSON.stringify(autoRotationData)));
    }
  }, [savedRotation, autoRotationData]);

  const rotationData = isEditMode ? localRotationData : (savedRotation ? savedRotation.data : autoRotationData);

  const handleSave = async () => {
    await saveRotation(date, localRotationData);
    setIsEditMode(false);
    alert('ローテーションを保存しました');
  };

  const handleRegenerate = async () => {
    if (window.confirm('手動での編集内容を破棄し、自動生成の状態に戻しますか？')) {
      await deleteRotation(date);
      setIsEditMode(false);
    }
  };

  const handleCellChange = (staffId, slotLabel, newPos) => {
    setLocalRotationData(prev => {
      const next = { ...prev };
      const rowIndex = next.rows.findIndex(r => r.staff.id === staffId);
      if (rowIndex !== -1) {
        next.rows[rowIndex].assignments[slotLabel] = newPos;
      }
      return next;
    });
  };

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
                {slots.map(slot => (
                  <td key={slot.label}></td>
                ))}
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
                        fontWeight: assignment ? 'bold' : 'normal',
                        padding: isEditMode && isWorking ? '0' : undefined
                      }}
                    >
                      {isWorking ? (
                        isEditMode ? (
                          <input 
                            list="position-options"
                            value={assignment || ''}
                            onChange={(e) => handleCellChange(row.staff.id, slot.label, e.target.value)}
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              border: 'none', 
                              backgroundColor: 'transparent',
                              textAlign: 'center',
                              outline: 'none',
                              cursor: 'text',
                              padding: '0'
                            }}
                          />
                        ) : (
                          assignment || ''
                        )
                      ) : ''}
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

  const positionOptions = ['', '上', '下', 'T1', 'T2', 'T3', 'T4', 'B', 'A', 'K', '後方', '横', 'F', 'P1', 'P2', '階下', 'St', '当割', '休憩', '掃除', '準備'];

  return (
    <div className="rotation-container">
      <datalist id="position-options">
        {positionOptions.map(opt => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      <div className="rotation-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="rotation-title" style={{ margin: 0 }}>
          {savedRotation ? '手動編集済みローテーション表' : '自動生成ローテーション表'}
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {isEditMode ? (
            <>
              <button className="btn btn-ghost" onClick={() => setIsEditMode(false)}>キャンセル</button>
              <button className="btn btn-success" onClick={handleSave}>💾 保存する</button>
            </>
          ) : (
            <>
              <button className="btn btn-warning" onClick={() => setIsEditMode(true)}>✏️ 編集モード</button>
              {savedRotation && (
                <button className="btn btn-danger" onClick={handleRegenerate}>🔄 自動生成に戻す</button>
              )}
              <button className="btn btn-primary" onClick={handleDownloadPDF}>
                📥 PDFダウンロード
              </button>
            </>
          )}
        </div>
      </div>

      {renderTable(rotationData.daySlots, dayTableRef, 'DAYプール (8:00-17:30)')}
      {renderTable(rotationData.nightSlots, nightTableRef, 'ナイトプール (18:00-21:30)')}
    </div>
  );
}
