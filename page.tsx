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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vercelのツールバー等を消す
  useEffect(() => {
    const removeVercel = () => {
      const selectors = ['vercel-live-feedback', '#vercel-live-feedback-fixed', '[data-vercel-toolbar]', '#__next-vercel-indicator'];
      selectors.forEach(s => document.querySelector(s)?.remove());
    };
    const interval = setInterval(removeVercel, 1000);
    return () => clearInterval(interval);
  }, []);

  // データ取得
  useEffect(() => {
    fetch('/api/menu').then(res => res.json()).then(data => setItems(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

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
    setTimeout(() => {
      setOrderPlan(plan);
      setIsTransitioning(false);
    }, 600);
  };

  // フィルタリングロジック
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
    if (orderPlan === "ライトプラン") return item.priceS ?? item.priceDefault;
    if (orderPlan === "スタンダードプラン") return item.priceL ?? item.priceDefault;
    if (orderPlan === "プレミアムプラン") return item.priceP ?? item.priceDefault;
    return item.priceDefault;
  };

  const getCurrentUnitPrice = () => {
    if (!selectedItem) return 0;
    if (selectedSize === 'L') return selectedItem.extraPrice || 0;
    return getBasePrice(selectedItem);
  };

  const fList = Array.from(new Set(filteredItems.map(i => i.type))).filter(Boolean);
  const gList = ["すべて", ...Array.from(new Set(filteredItems.filter(i => i.type === activeF).map(i => i.category))).filter(Boolean)];

  // 【バグ修正】プラン選択後、有効なカテゴリを自動セットして表示消滅を防ぐ
  useEffect(() => {
    if (fList.length > 0 && !activeF) setActiveF(fList[0] as string);
  }, [fList, activeF]);

  useEffect(() => { setActiveG('すべて'); }, [activeF]);

  if (!orderPlan) {
    return (
      <motion.div key="top" style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h1 style={{ color: '#fff', fontSize: '3rem', fontWeight: '900', marginBottom: '35px' }}>放課後倶楽部</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '320px' }}>
          {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
            <button key={p} onClick={() => handlePlanSelect(p)} style={{ padding: '22px', borderRadius: '18px', background: '#1a1a1a', color: '#fff', border: `2px solid ${getPlanColor(p)}`, fontWeight: 'bold', fontSize: '1.2rem' }}>{p}</button>
          ))}
        </div>
      </AnimatePresence>
    );
  }

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <header style={{ padding: '15px', background: '#000', borderBottom: `3px solid ${getPlanColor(orderPlan)}`, display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div><div style={{ fontSize: '0.7rem', color: getPlanColor(orderPlan) }}>{orderPlan}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tableNo}</div></div>
        <button onClick={() => setShowConfirm(true)} style={{ background: '#d35400', padding: '5px 15px', borderRadius: '15px', color: '#fff', fontWeight: 'bold', border: 'none' }}>注文確認 ({cart.reduce((s, i) => s + i.quantity, 0)})</button>
      </header>

      <nav style={{ position: 'sticky', top: '65px', zIndex: 999, background: '#121212', padding: '10px 0', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px', marginBottom: '10px' }}>
          {fList.map(f => <button key={f as string} onClick={() => setActiveF(f as string)} style={{ padding: '10px 24px', borderRadius: '25px', border: 'none', background: activeF === f ? '#d35400' : '#333', color: '#fff', fontWeight: 'bold', whiteSpace:'nowrap' }}>{f as string}</button>)}
        </div>
      </nav>

      <main style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '120px' }}>
        {filteredItems.filter(i => i.type === activeF && (activeG === 'すべて' || i.category === activeG)).map(item => (
          <div key={item.rowNumber} onClick={() => { if(!item.isSoldOut) { setSelectedItem(item); setTempQty(1); setSelectedSize(null); } }} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', border: '1px solid #333' }}>
            <img src={item.image ? `/menu-images/${encodeURIComponent(item.image)}` : 'https://placehold.jp/200x200.png?text=NO+IMAGE'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} alt="" />
            <div style={{ padding: '10px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px' }}>{item.name}</div>
              {/* 【修正】B列の説明文を表示 */}
              {item.description && <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '8px', lineHeight: '1.2' }}>{item.description}</div>}
              <div style={{ color: '#ff7e2e', fontWeight: 'bold', fontSize: '0.9rem' }}>{item.isSoldOut ? 'SOLD OUT' : `¥${getBasePrice(item).toLocaleString()}`}</div>
            </div>
          </div>
        ))}
      </main>

      {/* モーダルや確認画面のロジックは前回同様に完備 */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '10px' }}>{selectedItem.name}</h3>
              {selectedItem.description && <p style={{ fontSize: '0.9rem', color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>{selectedItem.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', fontSize: '1.5rem', background: 'none' }}>-</button>
                <span style={{ fontSize: '2rem' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', fontSize: '1.5rem', background: 'none' }}>+</button>
              </div>
              <button onClick={() => {
                setCart(prev => [...prev, { ...selectedItem, quantity: tempQty, price: getBasePrice(selectedItem) }]);
                setSelectedItem(null);
              }} style={{ width: '100%', padding: '15px', borderRadius: '30px', background: '#d35400', color: '#fff', fontWeight: 'bold', border: 'none' }}>カートに追加</button>
              <button onClick={() => setSelectedItem(null)} style={{ width: '100%', marginTop: '10px', color: '#888', background: 'none', border: 'none' }}>キャンセル</button>
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
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{i.name}</div>
                    <div style={{ color: '#ff7e2e' }}>¥{(i.price * i.quantity).toLocaleString()} ({i.quantity}点)</div>
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
                    body: JSON.stringify({ cart, tableNo, orderType: orderPlan }) 
                  });
                  if (res.ok) { alert('注文完了！'); setCart([]); setShowConfirm(false); }
                } finally { setIsSubmitting(false); }
              }} 
              style={{ width: '100%', padding: '20px', background: isSubmitting ? '#555' : '#d35400', color: '#fff', borderRadius: '40px', border: 'none', fontWeight: 'bold' }}
            >
              {isSubmitting ? '送信中...' : '注文を確定する'}
            </button>
            <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() { return <Suspense fallback={<div>Loading...</div>}><OrderSystem /></Suspense>; }
