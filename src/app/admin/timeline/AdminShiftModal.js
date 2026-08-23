import React, { useState, useEffect } from 'react';
import { generateTimeOptions, getToday } from '@/lib/utils';
import { useAuth } from '@/lib/providers';

export default function AdminShiftModal({ isOpen, onClose, onSave, onDelete, staffList, initialData, defaultDate }) {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    staff_id: '',
    work_date: defaultDate || getToday(),
    start_time: '08:00',
    end_time: '17:00',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timeOptions = generateTimeOptions();

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setFormData({
          staff_id: initialData.staff_id,
          work_date: initialData.work_date,
          start_time: initialData.start_time,
          end_time: initialData.end_time,
        });
      } else {
        setFormData({
          staff_id: staffList.length > 0 ? staffList[0].id : '',
          work_date: defaultDate || getToday(),
          start_time: '08:00',
          end_time: '17:00',
        });
      }
    }
  }, [isOpen, initialData, defaultDate, staffList]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.staff_id) {
      setError('スタッフを選択してください');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setError('終了時刻は開始時刻より後に設定してください');
      return;
    }

    setLoading(true);
    try {
      const shiftPayload = {
        ...formData,
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };
      await onSave(shiftPayload, initialData?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'シフトの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData) return;
    if (!window.confirm('このシフトを削除してもよろしいですか？')) return;
    
    setLoading(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      setError(err.message || 'シフトの削除に失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{initialData ? 'シフトの編集' : '新規シフト登録'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="alert alert-error mb-4">{error}</div>}

          <div className="form-group">
            <label className="form-label">対象スタッフ</label>
            <select
              name="staff_id"
              className="form-input"
              value={formData.staff_id}
              onChange={handleChange}
              disabled={!!initialData} // 編集時はスタッフ変更不可
              required
            >
              <option value="">スタッフを選択...</option>
              {staffList.map(st => (
                <option key={st.id} value={st.id}>{st.full_name} ({st.staff_type === 'high_school' ? '高校生' : '一般'})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">勤務日</label>
            <input
              type="date"
              name="work_date"
              className="form-input"
              value={formData.work_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">開始時刻</label>
              <select
                name="start_time"
                className="form-input"
                value={formData.start_time}
                onChange={handleChange}
                required
              >
                {timeOptions.map(t => (
                  <option key={`start-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">終了時刻</label>
              <select
                name="end_time"
                className="form-input"
                value={formData.end_time}
                onChange={handleChange}
                required
              >
                {timeOptions.map(t => (
                  <option key={`end-${t}`} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {initialData && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  削除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                キャンセル
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
