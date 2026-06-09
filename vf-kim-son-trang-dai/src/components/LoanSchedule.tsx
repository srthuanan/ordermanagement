import React, { useState, useMemo } from 'react';
import { Calculator, Calendar, DollarSign, TrendingUp, PieChart, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { generateLoanSchedule, RepaymentMethod } from '../utils/finance';
import { formatCurrency } from '../data/vinfastPricing';

interface LoanScheduleProps {
  carPrice: number;
}

export const LoanSchedule: React.FC<LoanScheduleProps> = ({ carPrice }) => {
  const [prepaymentPercent, setPrepaymentPercent] = useState<number>(20);
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(Math.round(carPrice * 0.2));
  const [loanTermYears, setLoanTermYears] = useState<number>(8);
  const [fixedRate, setFixedRate] = useState<number>(8);
  const [fixedMonths, setFixedMonths] = useState<number>(24);
  const [floatingRate, setFloatingRate] = useState<number>(12);
  const [method, setMethod] = useState<RepaymentMethod>('annuity');
  const [showTable, setShowTable] = useState(false);

  React.useEffect(() => {
    setPrepaymentAmount(Math.round(carPrice * (prepaymentPercent / 100)));
  }, [carPrice, prepaymentPercent]);

  const handlePercentChange = (val: number) => {
    setPrepaymentPercent(val);
    setPrepaymentAmount(Math.round(carPrice * (val / 100)));
  };

  const handleAmountChange = (val: number) => {
    setPrepaymentAmount(val);
    if (carPrice > 0) {
      setPrepaymentPercent(Number(((val / carPrice) * 100).toFixed(2)));
    }
  };

  const principal = Math.max(0, carPrice - prepaymentAmount);
  const termMonths = loanTermYears * 12;

  const summary = useMemo(() => {
    if (principal <= 0 || termMonths <= 0) return null;
    return generateLoanSchedule(principal, termMonths, fixedRate, fixedMonths, floatingRate, method);
  }, [principal, termMonths, fixedRate, fixedMonths, floatingRate, method]);

  const chartData = useMemo(() => {
    if (!summary) return [];
    const maxPoints = 24;
    const step = Math.max(1, Math.floor(termMonths / maxPoints));
    return summary.schedule.filter((item) => item.month % step === 0 || item.month === 1 || item.month === termMonths).map(item => ({
      name: `Tháng ${item.month}`,
      'Tiền gốc': item.principalPayment,
      'Tiền lãi': item.interestPayment,
      'Tổng trả': item.totalPayment
    }));
  }, [summary, termMonths]);

  if (carPrice <= 0) {
    return null;
  }

  return (
    <div className="loan-schedule-wrapper" style={{ marginTop: '32px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      {/* Header VinFast Style */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>
          <Calculator size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Tùy chọn Trả góp (Vay Ngân hàng)</h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>Tự động đồng bộ số liệu với bảng tính lăn bánh hiện tại</p>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Cột Trái: Thông số cấu hình */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>Trả trước</span>
              <strong style={{ fontSize: '18px', color: '#0f172a' }}>{formatCurrency(prepaymentAmount)}</strong>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={prepaymentPercent}
                onChange={(e) => handlePercentChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#2563eb' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px' }}>
                <input 
                  type="number" 
                  value={prepaymentPercent}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  style={{ width: '40px', border: 'none', outline: 'none', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}
                />
                <span style={{ color: '#64748b', fontWeight: 600 }}>%</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[20, 30, 50, 80].map(pct => (
                <button 
                  key={pct}
                  onClick={() => handlePercentChange(pct)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
                    background: prepaymentPercent === pct ? '#2563eb' : '#fff',
                    color: prepaymentPercent === pct ? '#fff' : '#64748b',
                    border: prepaymentPercent === pct ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  }}
                >{pct}%</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Cần vay (VNĐ)</span>
              <input 
                type="text" 
                value={formatCurrency(principal)} 
                readOnly
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 700, color: '#1e3a8a', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Thời hạn (Năm)</span>
              <select 
                value={loanTermYears} 
                onChange={(e) => setLoanTermYears(Number(e.target.value))}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer', outline: 'none' }}
              >
                {[1,2,3,4,5,6,7,8].map(y => <option key={y} value={y}>{y} năm ({y*12} tháng)</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Lãi ưu đãi ban đầu</span>
              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <input 
                  type="number" step="0.1"
                  value={fixedRate} 
                  onChange={(e) => setFixedRate(Number(e.target.value))}
                  style={{ flex: 1, padding: '12px', border: 'none', fontWeight: 600, color: '#0f172a', outline: 'none' }}
                />
                <span style={{ padding: '0 12px', color: '#64748b', fontWeight: 600, fontSize: '13px', background: '#f8fafc', borderLeft: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', height: '100%' }}>%/năm</span>
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Thời gian ưu đãi</span>
              <select 
                value={fixedMonths} 
                onChange={(e) => setFixedMonths(Number(e.target.value))}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer', outline: 'none' }}
              >
                <option value={0}>Không ưu đãi</option>
                <option value={6}>6 tháng</option>
                <option value={12}>12 tháng</option>
                <option value={24}>24 tháng</option>
                <option value={36}>36 tháng</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Lãi thả nổi dự kiến sau ưu đãi</span>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <input 
                type="number" step="0.1"
                value={floatingRate} 
                onChange={(e) => setFloatingRate(Number(e.target.value))}
                style={{ flex: 1, padding: '12px', border: 'none', fontWeight: 600, color: '#0f172a', outline: 'none' }}
              />
              <span style={{ padding: '0 12px', color: '#64748b', fontWeight: 600, fontSize: '13px', background: '#f8fafc', borderLeft: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', height: '100%' }}>%/năm</span>
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Phương thức trả nợ</span>
            <select 
              value={method} 
              onChange={(e) => setMethod(e.target.value as RepaymentMethod)}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              <option value="annuity">Niên kim (Gốc, Lãi chia đều hằng tháng)</option>
              <option value="declining">Dư nợ giảm dần (Gốc cố định)</option>
            </select>
          </label>

        </div>

        {/* Cột Phải: Biểu đồ & Kết quả */}
        {summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Tổng tiền gốc cần trả</span>
                <strong style={{ fontSize: '18px', color: '#0f172a' }}>{formatCurrency(summary.totalPrincipal)}</strong>
              </div>
              <div style={{ background: '#fff1f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#be123c', fontWeight: 600 }}>Tổng tiền lãi phải trả</span>
                <strong style={{ fontSize: '18px', color: '#9f1239' }}>{formatCurrency(summary.totalInterest)}</strong>
              </div>
            </div>
            
            <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', color: '#1d4ed8', fontWeight: 600, marginBottom: '6px' }}>Tổng tiền phải trả (Gốc + Lãi)</span>
                <strong style={{ fontSize: '28px', color: '#1e3a8a', letterSpacing: '-0.5px' }}>{formatCurrency(summary.totalPayment)}</strong>
              </div>
              <div style={{ background: '#bfdbfe', padding: '12px', borderRadius: '50%' }}>
                <PieChart size={32} color="#1d4ed8" />
              </div>
            </div>

            <div style={{ height: '260px', width: '100%', marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} dy={10} />
                  <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(0)}Tr`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} dx={-10} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)', padding: '12px' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '4px 0' }}
                    labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 500 }} iconType="circle" />
                  <Bar dataKey="Tiền lãi" stackId="a" fill="#f43f5e" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Tiền gốc" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bảng chi tiết */}
      {summary && (
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={() => setShowTable(!showTable)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: showTable ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#1e40af', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = showTable ? '#f8fafc' : 'transparent'}
          >
            {showTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {showTable ? 'Ẩn bảng chi tiết' : 'Xem chi tiết lịch trả nợ từng tháng'}
          </button>
          
          {showTable && (
            <div style={{ overflowX: 'auto', padding: '0 24px 24px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0' }}>
                <button 
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <FileText size={16} />
                  In lịch trả nợ
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', background: '#f1f5f9' }}>
                    <th style={{ padding: '14px 12px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Kỳ (Tháng)</th>
                    <th style={{ padding: '14px 12px', color: '#475569', fontWeight: 700 }}>Dư nợ đầu kỳ</th>
                    <th style={{ padding: '14px 12px', color: '#475569', fontWeight: 700 }}>Lãi suất</th>
                    <th style={{ padding: '14px 12px', color: '#2563eb', fontWeight: 700 }}>Tiền gốc</th>
                    <th style={{ padding: '14px 12px', color: '#e11d48', fontWeight: 700 }}>Tiền lãi</th>
                    <th style={{ padding: '14px 12px', color: '#0f172a', fontWeight: 800 }}>Tổng trả</th>
                    <th style={{ padding: '14px 12px', color: '#475569', fontWeight: 700 }}>Dư nợ cuối kỳ</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.schedule.map((item) => (
                    <tr key={item.month} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{item.month}</td>
                      <td style={{ padding: '12px', color: '#334155' }}>{formatCurrency(item.beginningBalance)}</td>
                      <td style={{ padding: '12px', color: '#64748b' }}>{item.rate}%</td>
                      <td style={{ padding: '12px', color: '#3b82f6', fontWeight: 500 }}>{formatCurrency(item.principalPayment)}</td>
                      <td style={{ padding: '12px', color: '#f43f5e', fontWeight: 500 }}>{formatCurrency(item.interestPayment)}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.totalPayment)}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{formatCurrency(item.endingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
