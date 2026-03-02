'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function OrderSystem() {
  const searchParams = useSearchParams();
  const tableNo = searchParams.get('table') || '未設定';
  
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orderPlan, setOrderPlan] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<'S' | 'L' | null>(null);
  const [selectedWari, setSelectedWari] = useState<string>('ロック');
  const [activeF, setActiveF] = useState(''); 
  const [activeG, setActiveG] = useState('すべて');

  const [flashColor, setFlashColor] = useState<string>('transparent');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 送信中フラグ

  useEffect(() => {
    const removeVercel = () => {
      const selectors = ['vercel-live-feedback', '#vercel-live-feedback-fixed', '[data-vercel-toolbar]', '#__next-vercel-indicator'];
      selectors.forEach(s => document.querySelector(s)?.remove());
    };
    const interval = setInterval(removeVercel, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/menu').then(res => res.json()).then(data => setItems(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeF, activeG, orderPlan]);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "ライトプラン": return "#ffcc00";
      case "スタンダードプラン": return "#ff8800";
      case "プレミアムプラン": return "#720017";
      default: return "#ffffff";
    }
  };

  const handlePlanSelect = (plan: string) => {
    setFlashColor(getPlanColor(plan));
    setIsTransitioning(true);
    setTimeout(() => { setOrderPlan(plan); setIsTransitioning(false); }, 600);
  };

  const filteredItems = items.filter(item => {
    if (!orderPlan || orderPlan === "単品オーダー" || item.type === "フード") return true;
    const limit = item.planLimit || "";
    if (orderPlan === "ライトプラン") return limit.includes("L");
    if (orderPlan === "スタンダードプラン") return limit.includes("S") || limit.includes("L");
    if (orderPlan === "プレミアムプラン") return limit.includes("P") || limit.includes("S") || limit.includes("L");
    return false;
  });

  const getBasePrice = (item: any) => {
    if (item.type === "フード" || orderPlan === "単品オーダー") return item.priceDefault;
    let p = null;
    if (orderPlan === "ライトプラン") p = item.priceS;
    if (orderPlan === "スタンダードプラン") p = item.priceL;
    if (orderPlan === "プレミアムプラン") p = item.priceP;
    return (p !== null && p !== undefined) ? p : item.priceDefault; // プラン価格がなければ通常価格
  };

  const getCurrentUnitPrice = () => {
    if (!selectedItem) return 0;
    if (selectedSize === 'L') return selectedItem.extraPrice || 0;
    return getBasePrice(selectedItem);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const fList = Array.from(new Set(filteredItems.map(i => i.type))).filter(Boolean);
  const gList = ["すべて", ...Array.from(new Set(filteredItems.filter(i => i.type === activeF).map(i => i.category))).filter(Boolean)];

  useEffect(() => { if (fList.length > 0 && !activeF) setActiveF(fList[0] as string); }, [fList, activeF]);
  useEffect(() => { setActiveG('すべて'); }, [activeF]);

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh', position: 'relative' }}>
      
      <AnimatePresence>
        {isTransitioning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: flashColor }} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!orderPlan ? (
          <motion.div key="top" initial={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <h1 style={{ color: '#fff', fontSize: '4.8rem', fontWeight: '900', marginBottom: '35px' }}>放課後倶<span style={{ color: '#ff0000' }}>楽</span>部</h1>
            <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: '50px', width: '100%', maxWidth: '400px', height: '140px', border: '1px solid #333', borderRadius: '24px', background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)', overflow: 'hidden' }}>
              <div style={{ flex: '0 0 140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
                <img src="/menu-images/星ロゴ.png" alt="logo" style={{ maxWidth: '80%' }} />
              </div>
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '25px', borderLeft: '2px solid #ff0000' }}>
                <div style={{ color: '#d35400', fontSize: '1rem', fontWeight: 'bold' }}>TABLE</div>
                <div style={{ color: '#fff', fontSize: '2.4rem', fontWeight: '900' }}>{tableNo}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '320px' }}>
              {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
                <button key={p} onClick={() => handlePlanSelect(p)} style={{ padding: '22px', borderRadius: '18px', background: '#1a1a1a', color: '#fff', border: `2px solid ${getPlanColor(p)}`, fontWeight: 'bold', fontSize: '1.2rem' }}>{p}</button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <header style={{ padding: '15px', background: '#000', borderBottom: `3px solid ${getPlanColor(orderPlan)}`, display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 }}>
              <div><div style={{ fontSize: '0.7rem', color: getPlanColor(orderPlan) }}>{orderPlan}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tableNo}</div></div>
              <button onClick={() => setShowConfirm(true)} style={{ background: '#d35400', padding: '5px 15px', borderRadius: '15px', color: '#fff', fontWeight: 'bold' }}>注文確認 ({cart.reduce((s, i) => s + i.quantity, 0)})</button>
            </header>

            <nav style={{ position: 'sticky', top: '65px', zIndex: 999, background: '#121212', padding: '10px 0', borderBottom: '1px solid #333' }}>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px', marginBottom: '10px' }}>
                {fList.map(f => <button key={f as string} onClick={() => setActiveF(f as string)} style={{ padding: '10px 24px', borderRadius: '25px', background: activeF === f ? '#d35400' : '#333', color: '#fff', fontWeight: 'bold', whiteSpace:'nowrap', border:'none' }}>{f as string}</button>)}
              </div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '18px', padding: '0 15px' }}>
                {gList.map(g => <button key={g as string} onClick={() => setActiveG(g as string)} style={{ background: 'none', border: 'none', color: activeG === g ? '#ff7e2e' : '#666', borderBottom: activeG === g ? '2px solid #ff7e2e' : 'none', paddingBottom: '6px', whiteSpace:'nowrap' }}>{g as string}</button>)}
              </div>
            </nav>

            <main style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '120px' }}>
              {filteredItems.filter(i => i.type === activeF && (activeG === 'すべて' || i.category === activeG)).map(item => (
                <div key={item.rowNumber} onClick={() => { if(!item.isSoldOut) { setSelectedItem(item); setTempQty(1); setSelectedSize((item.optionType === '1' || item.optionType === '2' || item.optionType === '3' || item.optionType === '5') ? 'S' : null); setSelectedWari('ロック'); } }} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', opacity: item.isSoldOut ? 0.5 : 1 }}>
                  <img src={item.image ? `/menu-images/${encodeURIComponent(item.image)}` : 'https://placehold.jp/200x200.png?text=NO+IMAGE'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} alt="" />
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.name}</div>
                    <div style={{ color: '#ff7e2e', fontWeight: 'bold' }}>{item.isSoldOut ? 'SOLD OUT' : `¥${getBasePrice(item).toLocaleString()}`}</div>
                  </div>
                </div>
              ))}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', padding: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
              <img src={selectedItem.image ? `/menu-images/${encodeURIComponent(selectedItem.image)}` : 'https://placehold.jp/200x200.png?text=NO+IMAGE'} style={{ width: '100%', borderRadius: '15px', marginBottom: '15px', aspectRatio: '1.2', objectFit: 'cover' }} alt="" />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center' }}>{selectedItem.name}</h3>
              
              {/* optionType 1, 2, 3 の時はサイズ選択 */}
              {(['1','2','3'].includes(selectedItem.optionType)) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <button onClick={() => setSelectedSize('S')} style={{ padding: '10px', borderRadius: '10px', background: selectedSize === 'S' ? '#d35400' : '#333', color: '#fff', border:'none' }}>
                    {(['1','3'].includes(selectedItem.optionType)) ? 'グラス' : '通常'}
                  </button>
                  <button onClick={() => setSelectedSize('L')} style={{ padding: '10px', borderRadius: '10px', background: selectedSize === 'L' ? '#d35400' : '#333', color: '#fff', border:'none' }}>
                    {(['1','3'].includes(selectedItem.optionType)) ? 'ボトル' : 'メガ'}
                  </button>
                </div>
              )}
              {/* optionType 5 は「グラス」固定表示 */}
              {selectedItem.optionType === '5' && <div style={{ textAlign: 'center', marginBottom: '15px' }}><div style={{ display: 'inline-block', padding: '8px 30px', borderRadius: '10px', background: '#d35400', color: '#fff', fontWeight: 'bold' }}>グラス</div></div>}

              {/* 割り方表示：1かつS、または 5 の時 */}
              {((selectedItem.optionType === '1' && selectedSize === 'S') || selectedItem.optionType === '5') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
                  {['ロック', '水割り', '炭酸割り', 'ウーロン割り', '緑茶割り', 'さんぴん割り'].map(w => (
                    <button key={w} onClick={() => setSelectedWari(w)} style={{ padding: '12px 5px', borderRadius: '8px', background: selectedWari === w ? '#d35400' : '#444', color: '#fff', border:'none' }}>{w}</button>
                  ))}
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '20px' }}><div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff7e2e' }}>¥{(getCurrentUnitPrice() * tempQty).toLocaleString()}</div></div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>-</button>
                <span style={{ fontSize: '1.8rem' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>+</button>
              </div>
              <button onClick={() => {
                let p = getCurrentUnitPrice();
                let lb = "";
                if(selectedSize==='L') lb = (['1','3'].includes(selectedItem.optionType)) ? "(ボトル)" : "(メガ)";
                else if(['1','5'].includes(selectedItem.optionType)) lb = `(${selectedWari})`;
                setCart(prev => [...prev, { ...selectedItem, quantity: tempQty, price: p, name: `${selectedItem.name}${lb}` }]);
                setSelectedItem(null);
              }} style={{ width: '100%', padding: '15px', borderRadius: '30px', background: '#d35400', color: '#fff', fontWeight: 'bold', border:'none' }}>カートに追加</button>
              <button onClick={() => setSelectedItem(null)} style={{ width: '100%', marginTop: '10px', color: '#888', background: 'none', border:'none' }}>キャンセル</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} style={{ position: 'fixed', inset: 0, background: '#121212', zIndex: 3000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ color: '#d35400', textAlign: 'center', marginBottom: '20px' }}>注文内容確認</h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.map((i, idx) => (
                <div key={idx} style={{ padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 'bold' }}>{i.name}</div><div style={{ color: '#ff7e2e' }}>¥{(i.price * i.quantity).toLocaleString()}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px' }}>
                    <button onClick={() => updateCartQty(idx, -1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>-</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => updateCartQty(idx, 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>+</button>
                  </div>
                  <button onClick={() => setCart(prev => prev.filter((_, j) => idx !== j))} style={{ color: '#ff4444', background: 'none', border: 'none' }}>削除</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'right', color: '#d35400', margin: '20px 0' }}>合計: ¥{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</div>
            <button 
              disabled={isSubmitting || cart.length === 0}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  const res = await fetch('/api/menu', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ cart, tableNo, orderType: orderPlan, hasFood: cart.some(i => i.type === "フード"), hasDrink: cart.some(i => i.type === "ドリンク") }) 
                  });
                  if (res.ok) { alert('注文完了！'); setCart([]); setShowConfirm(false); }
                } finally { setIsSubmitting(false); }
              }} 
              style={{ width: '100%', padding: '20px', background: isSubmitting ? '#555' : '#d35400', color: '#fff', borderRadius: '40px', border: 'none', fontWeight: 'bold' }}
            >
              {isSubmitting ? '注文送信中...' : '注文を確定する'}
            </button>
            <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() { return <Suspense fallback={<div>Loading...</div>}><OrderSystem /></Suspense>; }
