import React from 'react';
import { UsersRound } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { statusTone } from '../constants';

interface CustomersPanelProps {
  orders: Order[];
}

interface CustomerListItem {
  name: string;
  phone: string;
  status: OrderStatus;
  lastOrder: string;
  vehicle: string;
}

export const CustomersPanel: React.FC<CustomersPanelProps> = ({ orders }) => {
  // Map and group customers to avoid duplicated listings if a customer has multiple orders.
  const customerMap = new Map<string, CustomerListItem>();
  
  orders.forEach((order) => {
    const key = order.phone.trim();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: order.customer,
        phone: order.phone,
        status: order.status,
        lastOrder: order.id,
        vehicle: `${order.line} / ${order.version}`
      });
    }
  });

  const customers = Array.from(customerMap.values());

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CRM bán hàng</p>
          <h2>Danh sách khách hàng</h2>
        </div>
        <button className="ghost-button" disabled title="Chức năng phân nhóm">
          <UsersRound size={17} />
          <span>Phân nhóm</span>
        </button>
      </div>
      
      <div className="customer-list">
        {customers.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>Chưa ghi nhận thông tin khách hàng.</div>
        ) : (
          customers.map((customer) => (
            <article className="customer-row" key={customer.phone}>
              <div className="avatar">{customer.name.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.phone}</span>
              </div>
              <p className="last-order-cell">Đơn gần nhất: {customer.lastOrder}</p>
              <p className="vehicle-cell">{customer.vehicle}</p>
              <span className={statusTone[customer.status]}>{customer.status}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
};
