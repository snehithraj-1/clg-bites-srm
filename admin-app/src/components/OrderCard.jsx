import React from 'react';
import {
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  XCircle,
  Eye,
  Trash2,
  Utensils
} from 'lucide-react';

function getTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function OrderCard({
  order,
  onStatusUpdate,
  onViewDetails,
  onDeleteOrder,
  isUpdating = false
}) {
  const status = (order.status || 'pending').toLowerCase();

  const getStatusBadge = (st) => {
    switch (st) {
      case 'pending':
        return {
          label: 'New Order',
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30 animate-pulse',
          icon: Clock
        };
      case 'accepted':
        return {
          label: 'Accepted',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: CheckCircle2
        };
      case 'preparing':
        return {
          label: 'Preparing in Kitchen',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: ChefHat
        };
      case 'ready':
        return {
          label: 'Ready for Pickup',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: PackageCheck
        };
      case 'delivered':
        return {
          label: 'Delivered',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: CheckCircle2
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: XCircle
        };
      default:
        return {
          label: st.toUpperCase(),
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Clock
        };
    }
  };

  const badge = getStatusBadge(status);
  const StatusIcon = badge.icon;

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items || '[]')
    : [];

  const studentName = order.student_name || order.studentName || 'Student';
  const studentPhone = order.student_phone || order.studentPhone || '';
  const restaurantName = order.restaurant_name || order.restaurantName || (order.restaurant_id === 'clg-bites-biryani-nation' ? 'Biryani Nation' : 'Local Home Kitchen');
  const deliveryLocation = order.delivery_location || order.deliveryLocation || 'SRM AP - Gate 3';
  const totalAmount = Number(order.total_amount || order.totalAmount) || 0;
  const shortId = (order.id || '').toString().slice(-6).toUpperCase();

  return (
    <div className="bg-[#0F172A]/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-sm transition-all space-y-3.5 flex flex-col justify-between">
      {/* Top Header: ID, Kitchen & Status Badge */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-['Outfit'] text-white">
              #{shortId}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              • {getTimeAgo(order.created_at)}
            </span>
          </div>
          <span className="text-xs font-bold text-orange-400 flex items-center gap-1 mt-0.5">
            <Utensils size={12} />
            <span>{restaurantName}</span>
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 ${badge.bg}`}>
          <StatusIcon size={13} />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="flex items-center justify-between font-bold text-white">
          <span>{studentName}</span>
          {studentPhone && (
            <a
              href={`tel:${studentPhone}`}
              className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-[11px] transition-colors"
            >
              <Phone size={12} />
              <span>{studentPhone}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <MapPin size={12} className="text-slate-500 shrink-0" />
          <span className="truncate">{deliveryLocation}</span>
        </div>
      </div>

      {/* Items Summary */}
      <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-1 text-xs">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-300">
              <span className="truncate max-w-[200px]">
                {item.name || item.dish_name}
              </span>
              <span className="font-extrabold text-white text-[11px]">
                x{item.quantity || 1}
              </span>
            </div>
          ))
        ) : (
          <span className="text-slate-400 text-[11px] italic">No items detailed</span>
        )}
      </div>

      {/* Pricing & Footer Actions */}
      <div className="pt-2 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">Total Amount</span>
          <span className="text-base font-black font-['Outfit'] text-emerald-400">
            ₹{totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Action Buttons depending on status */}
        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(order.id, 'accepted')}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-emerald-600/20"
              >
                Accept Order
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-bold transition-all cursor-pointer"
              >
                Reject
              </button>
            </>
          )}

          {status === 'accepted' && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(order.id, 'preparing')}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-blue-600/20"
              >
                Start Preparing
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}

          {status === 'preparing' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusUpdate(order.id, 'ready')}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-amber-600/20"
            >
              Mark Ready for Pickup
            </button>
          )}

          {status === 'ready' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusUpdate(order.id, 'delivered')}
              className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-purple-600/20"
            >
              Mark Delivered
            </button>
          )}

          {/* Details & Delete icons */}
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="View Full Order Details"
          >
            <Eye size={16} />
          </button>

          {onDeleteOrder && (
            <button
              type="button"
              onClick={() => onDeleteOrder(order.id)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Delete Order Record"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
