import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\styles.css"
premium_css = """
/* =========================================
   PREMIUM UI OVERHAUL (FORMS & MODALS)
========================================= */

.premium-form-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 8px;
}

.premium-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.premium-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.premium-card-header {
  background: linear-gradient(to right, #f8fafc, #ffffff);
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.premium-card-title {
  font-weight: 700;
  font-size: 15px;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.premium-card-body {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.premium-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.premium-label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin: 0;
  display: flex;
  justify-content: space-between;
}

.premium-label span.required {
  color: #ef4444;
}

.premium-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.premium-input,
.premium-select,
.premium-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: #0f172a;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  transition: all 0.2s ease;
  outline: none;
}

.premium-input:focus,
.premium-select:focus,
.premium-textarea:focus {
  background-color: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.premium-input:disabled,
.premium-select:disabled {
  background-color: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

.premium-input::placeholder,
.premium-textarea::placeholder {
  color: #94a3b8;
}

.premium-textarea {
  resize: vertical;
  min-height: 80px;
}

.premium-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: auto;
  padding: 20px 0 0 0;
  border-top: 1px solid #e2e8f0;
}

.premium-btn-secondary {
  padding: 10px 20px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.premium-btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #1e293b;
}

.premium-btn-primary {
  padding: 10px 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0f172a, #334155);
  border: none;
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2);
}

.premium-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #020617, #1e293b);
  transform: translateY(-1px);
  box-shadow: 0 6px 8px -1px rgba(15, 23, 42, 0.3);
}

.premium-btn-primary:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 2px 4px -1px rgba(15, 23, 42, 0.2);
}

.premium-btn-primary:disabled {
  background: #94a3b8;
  box-shadow: none;
  cursor: not-allowed;
}

/* Custom Policy Multi-Select */
.premium-multi-select {
  position: relative;
  width: 100%;
}

.premium-multi-select .select-box {
  width: 100%;
  padding: 8px 14px;
  min-height: 42px;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
}

.premium-multi-select.open .select-box {
  background-color: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.premium-multi-select .dropdown-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
  display: none;
}

.premium-multi-select.open .dropdown-list {
  display: block;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
"""

with open(file_path, "a", encoding="utf-8") as f:
    f.write("\n" + premium_css)

print("CSS appended successfully.")
