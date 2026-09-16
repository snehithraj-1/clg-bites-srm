import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Utensils,
  Store,
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';

export default function MenuManagerModal({ isOpen, onClose, assignedRestaurantId = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState(assignedRestaurantId || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'SOLD_OUT'
  const [togglingId, setTogglingId] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Add / Edit Modal state
  const [editingItem, setEditingItem] = useState(null); // null = closed, {} = add, { ...item } = edit
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch menu items from shared backend
  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/menu?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || data.menu || []);
      if (Array.isArray(list) && list.length > 0) {
        setItems(list);
      }
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (assignedRestaurantId) {
        setSelectedRestaurant(assignedRestaurantId);
      }
      loadMenu();
    }
  }, [isOpen, assignedRestaurantId]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  // Filtered dishes with robust stock filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const inStock = item.is_available !== false && item.is_available !== 'false' && item.is_available !== 0;
      const matchSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchRest = assignedRestaurantId
        ? item.restaurant_id === assignedRestaurantId
        : (selectedRestaurant === 'ALL' || item.restaurant_id === selectedRestaurant);
      const matchCat =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'IN_STOCK' && inStock) ||
        (stockFilter === 'SOLD_OUT' && !inStock);
      return matchSearch && matchRest && matchCat && matchStock;
    });
  }, [items, searchQuery, selectedRestaurant, selectedCategory, stockFilter, assignedRestaurantId]);

  const totalDishes = items.length;
  const soldOutCount = items.filter((i) => i.is_available === false || i.is_available === 'false' || i.is_available === 0).length;
  const availableCount = totalDishes - soldOutCount;

  // 1-Click Toggle Availability (Sold Out vs In Stock) with multi-method resilience
  const handleToggleAvailability = async (item) => {
    const currentStatus = item.is_available !== false && item.is_available !== 'false' && item.is_available !== 0;
    const nextStatus = !currentStatus;
    setTogglingId(item.id);

    // Optimistic UI update immediately
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: nextStatus } : i))
    );

    try {
      const payload = { is_available: nextStatus, id: item.id };
      let success = false;

      // 1. Try PATCH /api/menu/:id/availability
      try {
        const res = await fetch(`/api/menu/${encodeURIComponent(item.id)}/availability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.success !== false) success = true;
        }
      } catch (patchErr) {
        console.warn('PATCH toggle request failed, will retry with POST:', patchErr.message);
      }

      // 2. Fallback: POST /api/menu/:id/availability
      if (!success) {
        try {
          const resPost = await fetch(`/api/menu/${encodeURIComponent(item.id)}/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (resPost.ok) {
            const dataPost = await resPost.json().catch(() => ({}));
            if (dataPost.success !== false) success = true;
          }
        } catch (postErr) {
          console.warn('POST toggle request failed, will retry generic endpoint:', postErr.message);
        }
      }

      // 3. Fallback: generic POST /api/menu/availability
      if (!success) {
        const resAlt = await fetch('/api/menu/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resAlt.ok) {
          const dataAlt = await resAlt.json().catch(() => ({}));
          if (dataAlt.success !== false) success = true;
        }
      }

      if (!success) {
        throw new Error('Server returned an error when saving availability.');
      }
    } catch (e) {
      console.error('Failed to toggle dish availability:', e);
      // Revert optimistic update only on total failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: currentStatus } : i))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk toggle availability for currently filtered restaurant or all
  const handleBulkAvailability = async (targetStock) => {
    const label = targetStock ? 'IN STOCK' : 'SOLD OUT';
    const restName = selectedRestaurant === 'ALL' ? 'ALL restaurants' : (selectedRestaurant === 'clg-bites-biryani-nation' ? 'Clg Bites Biryani Nation' : 'Local Home Kitchen');
    if (!window.confirm(`Are you sure you want to mark ALL dishes for ${restName} as ${label}?`)) {
      return;
    }

    setBulkUpdating(true);
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => {
        if (selectedRestaurant === 'ALL' || i.restaurant_id === selectedRestaurant) {
          return { ...i, is_available: targetStock };
        }
        return i;
      })
    );

    try {
      await fetch('/api/menu/bulk-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant === 'ALL' ? 'all' : selectedRestaurant,
          is_available: targetStock
        })
      });
    } catch (err) {
      console.error('Failed bulk availability update:', err);
      loadMenu();
    } finally {
      setBulkUpdating(false);
    }
  };

  // Delete a dish
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.name}" from the menu?`)) {
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      await fetch(`/api/menu/${item.id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete item:', e);
      loadMenu();
    }
  };

  // Upload image from file picker
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image file is too large (max 10MB). Please select a smaller photo.');
      return;
    }

    setUploadingImage(true);
    setFormError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        // Optimistically set preview immediately
        setEditingItem((prev) => ({ ...prev, image_url: base64Data }));

        // Try server upload to store statically
        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, name: file.name })
          });
          const data = await res.json();
          if (data.success && data.url) {
            setEditingItem((prev) => ({ ...prev, image_url: data.url }));
          }
        } catch (uploadErr) {
          console.warn('Server upload endpoint fallback:', uploadErr);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setFormError('Failed to read image file.');
      setUploadingImage(false);
    }
  };

  // Save Dish (Add or Edit)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!editingItem.name || !editingItem.price || !editingItem.category) {
      setFormError('Please fill in all required fields (Name, Price, Category).');
      return;
    }

    setIsSaving(true);
    const isEdit = Boolean(editingItem.id);

    try {
      if (isEdit) {
        const res = await fetch(`/api/menu/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingItem)
        });
        const data = await res.json();
        if (data.success) {
          setItems((prev) =>
            prev.map((i) => (i.id === editingItem.id ? { ...i, ...editingItem, price: Number(editingItem.price) } : i))
          );
          setEditingItem(null);
        } else {
          setFormError(data.error || 'Failed to update dish.');
        }
      } else {
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingItem)
        });
        const data = await res.json();
        if (data.success && data.item) {
          setItems((prev) => [data.item, ...prev]);
          setEditingItem(null);
        } else {
          setFormError(data.error || 'Failed to add dish.');
        }
      }
    } catch (err) {
      setFormError(err.message || 'Network error saving dish.');
    } finally {
      setIsSaving(false);
    }
  };

  const getFallbackImage = (isVeg) => {
    return isVeg
      ? 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80'
      : 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Utensils size={20} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] tracking-tight flex items-center gap-2">
                  <span>Kitchen Menu & Food Catalog</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    Neon DB Live
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage dishes, upload food photos, adjust prices, and toggle <strong className="text-rose-400">Sold Out</strong> status live.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="text-slate-400">Available:</span>
              <strong className="text-emerald-400 font-bold">{availableCount}</strong>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Sold Out:</span>
              <strong className="text-rose-400 font-bold">{soldOutCount}</strong>
            </div>

            <button
              onClick={() => {
                const effectiveRest = assignedRestaurantId || (selectedRestaurant !== 'ALL' ? selectedRestaurant : 'local-home-kitchen');
                const effectiveName = effectiveRest === 'clg-bites-biryani-nation' ? 'Clg Bites Biryani Nation' : 'Local Home Kitchen';
                setEditingItem({
                  restaurant_id: effectiveRest,
                  restaurant_name: effectiveName,
                  category: 'Biryani',
                  name: '',
                  description: '',
                  price: '',
                  image_url: '',
                  is_veg: true,
                  is_available: true,
                  preparation_time: '15-20 mins'
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Dish</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:px-6 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes by name or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Restaurant Filter */}
          <div className="flex items-center gap-2">
            <Store size={14} className="text-slate-400" />
            <select
              value={assignedRestaurantId || selectedRestaurant}
              disabled={Boolean(assignedRestaurantId)}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-75"
            >
              {!assignedRestaurantId && <option value="ALL">All Kitchens ({items.length})</option>}
              {(!assignedRestaurantId || assignedRestaurantId === 'local-home-kitchen') && (
                <option value="local-home-kitchen">Local Home Kitchen</option>
              )}
              {(!assignedRestaurantId || assignedRestaurantId === 'clg-bites-biryani-nation') && (
                <option value="clg-bites-biryani-nation">Clg Bites Biryani Nation</option>
              )}
            </select>
          </div>

          {/* Stock Filter Pills: All | In Stock | Sold Out */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalDishes})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('IN_STOCK')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === 'IN_STOCK' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>In Stock ({availableCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('SOLD_OUT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                stockFilter === 'SOLD_OUT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Sold Out ({soldOutCount})</span>
            </button>
          </div>

          {/* Quick Bulk Stock Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => handleBulkAvailability(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Mark all dishes in current kitchen filter as In Stock"
            >
              <Check size={12} />
              <span>All In Stock</span>
            </button>
            <button
              type="button"
              disabled={bulkUpdating}
              onClick={() => handleBulkAvailability(false)}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Mark all dishes in current kitchen filter as Sold Out"
            >
              <AlertCircle size={12} />
              <span>All Sold Out</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar pt-2 border-t border-slate-800/40">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Dish Items Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw size={28} className="animate-spin text-amber-500" />
              <p className="text-xs text-slate-400 font-medium">Loading dishes from Neon database...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Utensils size={24} />
              </div>
              <p className="text-sm font-bold text-slate-300">No dishes match your search.</p>
              <p className="text-xs text-slate-500">Try changing the category, restaurant filter, or add a new dish.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const inStock = item.is_available !== false && item.is_available !== 'false' && item.is_available !== 0;
                const isToggling = togglingId === item.id;

                return (
                <div
                  key={item.id}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    inStock
                      ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700 shadow-md'
                      : 'bg-rose-950/15 border-rose-900/40 opacity-80'
                  }`}
                >
                  <div>
                    {/* Dish Row with Image Thumbnail */}
                    <div className="flex items-start gap-3">
                      
                      {/* Food Image Thumbnail */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 relative">
                        <img
                          src={item.image_url || getFallbackImage(item.is_veg)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getFallbackImage(item.is_veg);
                          }}
                        />
                        <span
                          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            item.is_veg
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.is_veg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>

                      {/* Dish Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm leading-snug line-clamp-1 font-['Outfit'] ${inStock ? 'text-white' : 'text-slate-400 line-through'}`}>
                            {item.name}
                          </h4>
                          <span className={`text-sm font-extrabold font-mono shrink-0 ${inStock ? 'text-amber-400' : 'text-slate-400'}`}>
                            ₹{item.price}
                          </span>
                        </div>

                        {/* Kitchen & Category */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                            {item.category}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Store size={11} className="shrink-0" />
                            <span className="truncate">{item.restaurant_name || item.restaurant_id}</span>
                          </span>
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Prep Time */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <Clock size={11} />
                          <span>{item.preparation_time || '15 mins'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Live Availability Toggle & Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between gap-3">
                    
                    {/* 1-Click Availability Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isToggling
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : inStock
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                      }`}
                      title={inStock ? 'Click to mark as Sold Out' : 'Click to mark as In Stock'}
                    >
                      {isToggling ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-amber-400" />
                          <span>Saving...</span>
                        </>
                      ) : inStock ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} />
                          <span>SOLD OUT</span>
                        </>
                      )}
                    </button>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingItem({ ...item })}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Dish Details & Price"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer border border-rose-900/30"
                        title="Delete Dish"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                  </div>

                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredItems.length}</strong> of{' '}
            <strong className="text-white">{items.length}</strong> dishes
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* Add / Edit Dish Sub-Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white font-['Outfit']">
                {editingItem.id ? '✏️ Edit Dish' : '➕ Add New Food Item'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicken Dum Biryani, Paneer Fried Rice"
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Kitchen / Restaurant *
                  </label>
                  <select
                    value={editingItem.restaurant_id || (assignedRestaurantId || 'local-home-kitchen')}
                    disabled={Boolean(assignedRestaurantId)}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        restaurant_id: e.target.value,
                        restaurant_name:
                          e.target.value === 'clg-bites-biryani-nation'
                            ? 'Clg Bites Biryani Nation'
                            : 'Local Home Kitchen'
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white cursor-pointer focus:outline-none focus:border-amber-500 disabled:opacity-75"
                  >
                    {(!assignedRestaurantId || assignedRestaurantId === 'local-home-kitchen') && (
                      <option value="local-home-kitchen">Local Home Kitchen</option>
                    )}
                    {(!assignedRestaurantId || assignedRestaurantId === 'clg-bites-biryani-nation') && (
                      <option value="clg-bites-biryani-nation">Clg Bites Biryani Nation</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Biryani, Starters, Fried Rice"
                    value={editingItem.category || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="190"
                    value={editingItem.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Preparation Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 15-20 mins"
                    value={editingItem.preparation_time || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, preparation_time: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Food Image Upload & Preview */}
              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2.5">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-400" />
                    <span>Food Item Image</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Device Upload or Image URL</span>
                </label>
                
                <div className="flex items-center gap-3">
                  {/* Thumbnail Preview */}
                  <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 relative">
                    {editingItem.image_url ? (
                      <img
                        src={editingItem.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getFallbackImage(editingItem.is_veg);
                        }}
                      />
                    ) : (
                      <ImageIcon size={22} className="text-slate-500" />
                    )}
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <RefreshCw size={16} className="text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Device Upload Button and URL input */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="dish-file-upload"
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Upload size={13} />
                        <span>Upload Photo from Device</span>
                      </label>
                      <input
                        id="dish-file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageFileChange}
                      />
                      {editingItem.image_url && (
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, image_url: '' })}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Image URL or DB Path (auto-filled on upload)"
                      value={editingItem.image_url || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 1-Click Popular Food Presets */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">Presets:</span>
                  {[
                    { label: '🍗 Dum Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80' },
                    { label: '🍗 Fry Biryani', url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80' },
                    { label: '🥗 Veg Biryani', url: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=80' },
                    { label: '🍚 Fried Rice', url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80' },
                    { label: '🍜 Noodles', url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80' },
                    { label: '🍗 Starters', url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80' },
                    { label: '🥤 Soft Drinks', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80' }
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setEditingItem({ ...editingItem, image_url: preset.url })}
                      className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] whitespace-nowrap transition-colors cursor-pointer border border-slate-600/40"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Ingredients, spice level, or special recipe notes..."
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Food Classification:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, is_veg: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editingItem.is_veg
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    🟢 Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, is_veg: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !editingItem.is_veg
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    🔴 Non-Veg
                  </button>
                </div>
              </div>

              {/* Dish Live Availability Toggle in Form */}
              <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Stock Availability:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, is_available: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editingItem.is_available !== false
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    🟢 In Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, is_available: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editingItem.is_available === false
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    🔴 Sold Out
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw size={13} className="animate-spin" />}
                  <span>{editingItem.id ? 'Update Dish' : 'Add to Menu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
