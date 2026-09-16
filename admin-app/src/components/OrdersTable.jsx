import React, { useState } from 'react';
import { Eye, Ban, Trash2, Search, Download, Calendar, MapPin, Phone, Mail, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { exportOrdersToExcel } from '../lib/excelExport';

function safeFormatDateTime(rawDate) {
  if (!rawDate) return { date: 'Today', time: 'Just now' };
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return { date: 'Today', time: 'Just now' };
    const date = d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  } catch {
    return { date: 'Today', time: 'Just now' };
  }
}

function safeExtractItems(order) {
  if (!order) return [];
  const raw = order.items || order.order_items || [];
  let list = [];
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { list = []; }
  } else if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    list = Object.values(raw);
  }

  return list.map((item, idx) => ({
    name: item.name || item.item_name || item.title || `Item ${idx + 1}`,
    quantity: Number(item.quantity ?? item.qty ?? 1),
    price: Number(item.price ?? item.unit_price ?? 0)
  }));
}

export default function OrdersTable({
  orders = [],
  activeRestaurantTab = 'all',
  onSelectRestaurantTab,
  restaurantName = 'All Restaurants',
  isRestaurantAdmin = false,
  onInspectOrder,
  onCancelOrder,
  onPromptDeleteOrder,
  onUpdateStatus
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTimeframe, setExportTimeframe] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 1. Filter orders by restaurant tab, status, and search query
  const filteredOrders = orders.filter((order) => {
    // Restaurant filter
    if (activeRestaurantTab !== 'all' && order.restaurant_id !== activeRestaurantTab) {
      return false;
    }

    // Status filter - CONFIRMED, COMPLETED, CANCELLED
    if (filterStatus === 'CONFIRMED') {
      if (order.status !== 'CONFIRMED') return false;
    } else if (filterStatus === 'COMPLETED') {
      if (order.status !== 'COMPLETED' && order.status !== 'DELIVERED') return false;
    } else if (filterStatus === 'CANCELLED') {
      if (order.status !== 'CANCELLED') return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (order.id && order.id.toLowerCase().includes(q)) ||
      (order.student_name && order.student_name.toLowerCase().includes(q)) ||
      (order.student_email && order.student_email.toLowerCase().includes(q)) ||
      (order.student_phone && order.student_phone.includes(q)) ||
      (order.restaurant_name && order.restaurant_name.toLowerCase().includes(q))
    );
  });

  const handleQuickExport = () => {
    exportOrdersToExcel(filteredOrders, {
      timeframe: 'ALL',
      restaurantName
    });
  };

  const handleTriggerExport = () => {
    exportOrdersToExcel(filteredOrders, {
      timeframe: exportTimeframe,
      startDate: customStartDate,
      endDate: customEndDate,
      restaurantName
    });
    setShowExportModal(false);
  };

  const getStatusBadge = (status) => {
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-bold';
    }
    if (status === 'CANCELLED') {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/40 font-bold';
    }
    return 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold';
  };

  return (
    <div id="admin-orders-section" className="space-y-4 scroll-mt-20">
      
      {/* Top Header: Restaurant Switcher Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        
        {/* Restaurant Tabs or Scoped Kitchen Badge */}
        {isRestaurantAdmin ? (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-white font-['Outfit']">
              {restaurantName} Staff Portal
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold uppercase border border-emerald-500/30 font-['Outfit']">
              Isolated
            </span>
          </div>
        ) : onSelectRestaurantTab ? (
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none font-['Outfit']">
            <button
              onClick={() => onSelectRestaurantTab('local-home-kitchen')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none whitespace-nowrap ${
                activeRestaurantTab === 'local-home-kitchen'
                  ? 'bg-[#FF5722] text-white shadow-xs'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Local Home Kitchen
            </button>
            <button
              onClick={() => onSelectRestaurantTab('clg-bites-biryani-nation')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none whitespace-nowrap ${
                activeRestaurantTab === 'clg-bites-biryani-nation'
                  ? 'bg-[#FF5722] text-white shadow-xs'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Biryani Nation
            </button>
            <button
              onClick={() => onSelectRestaurantTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none whitespace-nowrap ${
                activeRestaurantTab === 'all'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              All Restaurants
            </button>
          </div>
        ) : null}

        {/* Search, Filter & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search ID, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Status Filter: CONFIRMED, COMPLETED, CANCELLED */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-slate-600 font-semibold cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* 1-Click Instant Export to Excel */}
          <div className="inline-flex items-center rounded-xl bg-emerald-600 shadow-xs overflow-hidden font-['Outfit']">
            <button
              onClick={handleQuickExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer border-none font-['Outfit']"
              title="Instantly download Excel spreadsheet for all currently visible orders"
            >
              <Download size={13} />
              <span>EXPORT TO EXCEL</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs transition-colors cursor-pointer border-none border-l border-emerald-500/40"
              title="Custom Date Filter & Timeframe Export Options"
            >
              <Calendar size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* Orders Count and Filter Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <strong className="text-white">{filteredOrders.length}</strong> orders for{' '}
          <span className="text-[#FF5722] font-bold">{restaurantName}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP TABLE VIEW                                       */}
      {/* ======================================================== */}
      <div className="hidden md:block bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Order ID & Date</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Restaurant</th>
              <th className="py-3 px-4">Ordered Items</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                  No orders found matching the selected filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const itemsArr = safeExtractItems(order);
                const { date: dateFormatted, time: timeFormatted } = safeFormatDateTime(order.created_at);

                return (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Order ID & Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-black text-white text-xs">
                        #{order.id}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={11} />
                        <span>{dateFormatted}, {timeFormatted}</span>
                      </div>
                    </td>

                    {/* Student Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{order.student_name || 'Student'}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-[#FF5722]" />
                        <span>{order.student_phone || '—'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {order.delivery_location || 'Gate 3'}
                      </div>
                    </td>

                    {/* Restaurant */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white text-xs truncate max-w-[140px]">
                        {order.restaurant_name || restaurantName}
                      </div>
                    </td>

                    {/* Items & Qty */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-300 max-w-[220px] line-clamp-2">
                        {itemsArr.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">No items breakdown</span>
                        ) : (
                          itemsArr.map((i, idx) => (
                            <span key={idx} className="inline-block mr-1.5">
                              {i.name} <strong className="text-slate-100">x{i.quantity || 1}</strong>
                              {idx < itemsArr.length - 1 ? ',' : ''}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-black text-sm text-emerald-400">
                      ₹{order.total_amount}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase border ${getStatusBadge(order.status)}`}>
                        {(order.status === 'COMPLETED' || order.status === 'DELIVERED') ? 'COMPLETED' : (order.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED')}
                      </span>
                    </td>

                    {/* Actions: View, Cancel, Delete */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onInspectOrder && onInspectOrder(order)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border-none"
                          title="View Order Details"
                        >
                          <Eye size={13} />
                        </button>

                        {onUpdateStatus && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onUpdateStatus(order.id, 'COMPLETED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border-none shadow-xs"
                            title="Mark Order as Completed"
                          >
                            <CheckCircle2 size={11} />
                            <span>Complete</span>
                          </button>
                        )}

                        {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            <span>Completed</span>
                          </span>
                        )}

                        {order.status !== 'CANCELLED' && onCancelOrder && (
                          <button
                            onClick={() => onCancelOrder(order.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer border-none"
                            title="Cancel Order"
                          >
                            <Ban size={13} />
                          </button>
                        )}

                        {onPromptDeleteOrder && (
                          <button
                            onClick={() => onPromptDeleteOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer border-none"
                            title="Delete Order"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* MOBILE CARDS VIEW: Clean, Compact, Zero Clutter          */}
      {/* ======================================================== */}
      <div className="block md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-8 text-center text-slate-500 text-xs border border-slate-800">
            No orders found matching the filter.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const itemsArr = safeExtractItems(order);
            const { time: timeFormatted } = safeFormatDateTime(order.created_at);

            return (
              <div
                key={order.id}
                className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-['Outfit'] font-black text-sm text-[#FF5722]">
                      #{order.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {timeFormatted}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border font-['Outfit'] ${getStatusBadge(order.status)}`}>
                    {order.status === 'DELIVERED' ? 'DELIVERED' : (order.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED')}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-['Outfit'] font-bold uppercase">Student:</span>
                    <span className="font-bold text-white text-xs block truncate font-['Outfit']">{order.student_name || 'Student'}</span>
                    <span className="text-slate-400 text-[11px] font-mono block">{order.student_phone || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block font-['Outfit'] font-bold uppercase">Total Amount:</span>
                    <span className="font-['Outfit'] font-black text-emerald-400 text-sm block">₹{order.total_amount}</span>
                    <span className="text-slate-400 text-[10px] block truncate">{order.restaurant_name || restaurantName}</span>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-['Outfit']">
                    Items:
                  </div>
                  <div className="space-y-0.5">
                    {itemsArr.length === 0 ? (
                      <span className="text-slate-500 text-xs italic">Order items recorded</span>
                    ) : (
                      itemsArr.map((i, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate pr-2">{i.name}</span>
                          <span className="font-['Outfit'] font-bold text-slate-100 shrink-0">x{i.quantity || 1}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onInspectOrder && onInspectOrder(order)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer border-none font-['Outfit']"
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>

                  {onUpdateStatus && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'COMPLETED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer border-none shadow-xs font-['Outfit']"
                    >
                      <CheckCircle2 size={12} />
                      <span>Complete</span>
                    </button>
                  )}

                  {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Completed</span>
                    </span>
                  )}

                  {order.status !== 'CANCELLED' && onCancelOrder && (
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/30 text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer border-none"
                    >
                      <Ban size={12} />
                      <span>Cancel</span>
                    </button>
                  )}

                  {onPromptDeleteOrder && (
                    <button
                      onClick={() => onPromptDeleteOrder(order)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer border-none"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* EXPORT TO EXCEL TIMEFRAME MODAL                          */}
      {/* ======================================================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Download size={16} className="text-emerald-400" />
                <h4 className="font-black text-sm font-['Outfit']">Export Orders to Excel</h4>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Exporting orders for <strong className="text-white">{restaurantName}</strong>. Select the timeframe for the export file:
            </div>

            {/* Timeframe Radio Buttons */}
            <div className="space-y-2 text-xs">
              {[
                { id: 'ALL', label: 'All Orders' },
                { id: 'TODAY', label: "Today's Orders" },
                { id: 'THIS_WEEK', label: "This Week's Orders" },
                { id: 'THIS_MONTH', label: "This Month's Orders" },
                { id: 'CUSTOM', label: 'Custom Date Range' }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                    exportTimeframe === opt.id
                      ? 'bg-slate-800 border-emerald-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportTimeframe"
                    checked={exportTimeframe === opt.id}
                    onChange={() => setExportTimeframe(opt.id)}
                    className="accent-emerald-500"
                  />
                  <span className="font-semibold">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Custom Date Range Inputs */}
            {exportTimeframe === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-transparent text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerExport}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
              >
                <Download size={13} />
                <span>Download Spreadsheet</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
