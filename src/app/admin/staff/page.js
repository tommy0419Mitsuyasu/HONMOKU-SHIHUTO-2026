'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/lib/providers';
import { getStaffTypeLabel, formatCurrency } from '@/lib/utils';
import './staff.css';

export default function StaffPage() {
  const { staff, createStaff, updateStaff, deleteStaff, initialized } = useData();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, high_school, general
  const [submitError, setSubmitError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    staff_type: 'general',
    is_minor: false,
    hourly_wage: 1100
  });

  useEffect(() => {
    if (initialized) setLoading(false);
  }, [initialized]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchSearch = s.full_name.includes(searchTerm) || s.email.includes(searchTerm);
      const matchType = typeFilter === 'all' || s.staff_type === typeFilter;
      return matchSearch && matchType && s.role !== 'admin';
    });
  }, [staff, searchTerm, typeFilter]);

  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        full_name: staffMember.full_name,
        email: staffMember.email,
        staff_type: staffMember.staff_type,
        is_minor: staffMember.is_minor,
        hourly_wage: staffMember.hourly_wage
      });
    } else {
      setEditingStaff(null);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        staff_type: 'general',
        is_minor: false,
        hourly_wage: 1100
      });
    }
    setSubmitError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    if (name === 'hourly_wage') newValue = parseInt(value, 10);
    
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'staff_type' && value === 'high_school') {
        updated.is_minor = true;
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      if (editingStaff) {
        const { password, ...updateData } = formData;
        await updateStaff(editingStaff.id, updateData);
      } else {
        await createStaff(formData);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Staff save error:', err);
      setSubmitError(err.message || '保存に失敗しました');
    }
  };

  const handleDelete = async (staffMember) => {
    if (!window.confirm(`${staffMember.full_name}さんを削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }
    try {
      await deleteStaff(staffMember.id);
    } catch (err) {
      console.error('Staff delete error:', err);
      alert(err.message || '削除に失敗しました');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page-enter staff-page">
      <div className="page-header">
        <h1 className="page-title">スタッフ管理</h1>
        <p className="page-subtitle">スタッフ情報の登録・編集</p>
      </div>

      <div className="staff-controls">
        <div className="search-bar">
          <input 
            type="text" 
            className="form-input search-input" 
            placeholder="名前やメールで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-group">
            <button className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>全員</button>
            <button className={`filter-btn ${typeFilter === 'high_school' ? 'active' : ''}`} onClick={() => setTypeFilter('high_school')}>高校生</button>
            <button className={`filter-btn ${typeFilter === 'general' ? 'active' : ''}`} onClick={() => setTypeFilter('general')}>一般</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ 新規スタッフ登録</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>メール</th>
              <th>種別</th>
              <th>18歳未満</th>
              <th>時給</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                <td><span className="badge">{getStaffTypeLabel(s.staff_type)}</span></td>
                <td>{s.is_minor ? '✓' : '−'}</td>
                <td>{formatCurrency(s.hourly_wage)}</td>
                <td><span className={`badge ${s.is_active ? 'badge-approved' : 'badge-cancelled'}`}>{s.is_active ? '有効' : '無効'}</span></td>
                <td>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleOpenModal(s)}>編集</button>
                  <button className="btn btn-sm btn-danger" style={{ marginLeft: '4px' }} onClick={() => handleDelete(s)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStaff.length === 0 && (
          <div className="empty-state" style={{ padding: '40px' }}>
            <div className="empty-title">該当するスタッフが見つかりません</div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingStaff ? 'スタッフ情報編集' : '新規スタッフ登録'}</h2>
            <form className="modal-form" onSubmit={handleSubmit}>
              {submitError && <div className="alert alert-error">{submitError}</div>}
              <div className="form-group">
                <label className="form-label">氏名</label>
                <input required type="text" name="full_name" className="form-input" value={formData.full_name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">メールアドレス</label>
                <input required type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} />
              </div>
              {!editingStaff && (
                <div className="form-group">
                  <label className="form-label">パスワード（6文字以上）</label>
                  <input required type="password" name="password" className="form-input" minLength={6} value={formData.password} onChange={handleChange} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">スタッフ種別</label>
                <select name="staff_type" className="form-select" value={formData.staff_type} onChange={handleChange}>
                  <option value="high_school">高校生</option>
                  <option value="general">一般</option>
                </select>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="is_minor" checked={formData.is_minor} onChange={handleChange} disabled={formData.staff_type === 'high_school'} />
                  18歳未満 (深夜勤務制限あり)
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">時給 (円)</label>
                <input required type="number" name="hourly_wage" className="form-input" min="1000" step="10" value={formData.hourly_wage} onChange={handleChange} />
              </div>
              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>キャンセル</button>
                <button type="submit" className="btn btn-primary">{editingStaff ? '更新する' : '登録する'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
