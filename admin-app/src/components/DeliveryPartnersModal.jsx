import React, { useState, useEffect } from 'react';
import { Bike, X, Plus, Trash2, Key, Phone, User, Store, ShieldCheck, Check, Copy, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function DeliveryPartnersModal({ isOpen, onClose, assignedRestaurantId = null }) {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [restaurantId, setRestaurantId] = useState(assignedRestaurantId || 'all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show/hide PIN toggles
  const [visiblePins, setVisiblePins] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery-partners');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.partners)) {
          setPartners(data.partners);
        }
      }
    } catch (e) {
      console.warn('[Fetch Partners Error]:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (assignedRestaurantId) {
        setRestaurantId(assignedRestaurantId);
      }
      fetchPartners();
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen, assignedRestaurantId]);

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(randomPin);
  };

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setError('Please enter the delivery partner name.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanPin = pin.trim();
    if (cleanPin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    setIsSubmitting(true);
    const effectiveRestaurantId = assignedRestaurantId || restaurantId;
    try {
      const res = await fetch('/api/delivery-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanPhone,
          pin: cleanPin,
          restaurant_id: effectiveRestaurantId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Credentials created! ${name.trim()} can log in with Phone: +91 ${cleanPhone} and PIN: ${cleanPin}.`);
        setName('');
        setPhone('');
        setPin('1234');
        setRestaurantId(assignedRestaurantId || 'all');
        fetchPartners();
      } else {
        setError(data.error || 'Failed to create delivery partner credentials.');
      }
    } catch (err) {
      setError('Network error: Unable to create rider credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (partnerId, partnerName) => {
    if (!window.confirm(`Are you sure you want to remove delivery credentials for ${partnerName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/delivery-partners/${partnerId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPartners(prev => prev.filter(p => p.id !== partnerId));
        setSuccessMessage(`Delivery credentials for ${partnerName} removed.`);
      }
    } catch (err) {
      setError('Failed to delete partner.');
    }
  };

  const handleCopyCredentials = (partner) => {
    const text = `Srm : College Bites Rider Credentials:\nName: ${partner.name}\nMobile: +91 ${partner.phone}\nPIN: ${partner.pin || '1234'}\nPortal: http://localhost:5173/#delivery`;
    navigator.clipboard.writeText(text);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const togglePinVisibility = (id) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bike size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white font-['Outfit']">
                  Delivery Partners & Rider Access
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/30">
                  {partners.length} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Create and manage rider mobile numbers and secret security PINs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form: Add New Rider Credentials */}
          <form onSubmit={handleCreatePartner} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-indigo-400" />
                <span>Issue New Rider Credentials</span>
              </span>
              <span className="text-[10px] text-slate-400">Riders use this to log into the delivery app</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Rider Full Name *
                </label>
                <div className="relative">
                  <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Reddy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  10-Digit Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-500 font-bold text-[11px]">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9398414231"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-11 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Security PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400">
                    Security PIN (4–6 Digits) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePin}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 bg-transparent border-none cursor-pointer font-semibold p-0"
                  >
                    🎲 Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Kitchen Scope */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Assigned Kitchen / Fleet
                </label>
                <div className="relative">
                  <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <select
                    value={assignedRestaurantId || restaurantId}
                    disabled={Boolean(assignedRestaurantId)}
                    onChange={(e) => setRestaurantId(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {!assignedRestaurantId && <option value="all">All Kitchens (Campus Fleet)</option>}
                    {(!assignedRestaurantId || assignedRestaurantId === 'local-home-kitchen') && (
                      <option value="local-home-kitchen">Local Home Kitchen</option>
                    )}
                    {(!assignedRestaurantId || assignedRestaurantId === 'clg-bites-biryani-nation') && (
                      <option value="clg-bites-biryani-nation">CLG Bites Biryani Nation</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || phone.length < 10 || !name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-none shadow-md flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>{isSubmitting ? 'Saving...' : 'Create Rider Credentials'}</span>
              </button>
            </div>
          </form>

          {/* Active Partners List */}
          {(() => {
            const visiblePartners = assignedRestaurantId
              ? partners.filter(p => p.restaurant_id === assignedRestaurantId)
              : partners;

            return (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                    Existing Delivery Partners ({visiblePartners.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Gate 3 Security Handover Personnel
                  </span>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading delivery partners...</div>
                ) : visiblePartners.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500">
                    No delivery partners configured for this kitchen yet. Add your first rider above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visiblePartners.map((p) => {
                      const isPinVisible = Boolean(visiblePins[p.id]);
                      const pinDisplay = p.pin || '1234';

                      return (
                        <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center shrink-0 border border-slate-700">
                          <Bike size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">{p.name}</span>
                            <span className="px-2 py-0.2 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                              {p.restaurant_id === 'local-home-kitchen'
                                ? 'Local Home Kitchen'
                                : p.restaurant_id === 'clg-bites-biryani-nation'
                                ? 'Biryani Nation'
                                : 'Campus Fleet'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono text-slate-300 flex items-center gap-1">
                              <Phone size={10} className="text-indigo-400" />
                              +91 {p.phone}
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-1 font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <Key size={10} />
                              <span>PIN: {isPinVisible ? pinDisplay : '••••'}</span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(p.id)}
                                className="text-slate-400 hover:text-white bg-transparent border-none p-0 cursor-pointer ml-1"
                              >
                                {isPinVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={() => handleCopyCredentials(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border-none"
                          title="Copy rider login credentials to clipboard"
                        >
                          {copiedId === p.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedId === p.id ? 'Copied' : 'Share Credentials'}</span>
                        </button>

                        <button
                          onClick={() => handleDeletePartner(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border-none"
                          title="Remove delivery partner"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-slate-400 text-xs">
          <span>Riders log in at: <code className="text-indigo-300">http://localhost:5173/#delivery</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer border-none"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
