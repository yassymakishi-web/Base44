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

  useEffect(() => {
    fetch('/api/menu').then(res => res.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
    }).catch(err => console.error("Data fetch error:", err));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeF, activeG]);

  const filteredItems = items.filter(item => {
    if (!orderPlan) return false;
    if (orderPlan === "単品オーダー") return true;
    if (item.type === "フード") return true;
    const limit = item.planLimit || "";
    if (orderPlan === "ライトプラン") return limit.includes("L");
    if (orderPlan === "スタンダードプラン") return limit.includes("S") || limit.includes("L");
    if (orderPlan === "プレミアムプラン") return limit.includes("P") || limit.includes("S") || limit.includes("L");
    return false;
  });

  const fList = Array.from(new Set(filteredItems.map(i => i.type))).filter(Boolean);
  const gList = ["すべて", ...Array.from(new Set(filteredItems.filter(i => i.type === activeF).map(i => i.category))).filter(Boolean)];

  useEffect(() => { if (fList.length > 0 && !activeF) setActiveF(fList[0] as string); }, [fList, activeF]);
  useEffect(() => { setActiveG('すべて'); }, [activeF]);

  const getBasePrice = (item: any) => {
    if (item.type === "フード") return item.priceDefault;
    if (orderPlan === "ライトプラン") return item.priceS ?? 0;
    if (orderPlan === "スタンダードプラン") return item.priceL ?? 0;
    if (orderPlan === "プレミアムプラン") return item.priceP ?? 0;
    return item.priceDefault;
  };

  // ポップアップ内での「現在の1個あたりの価格」を計算する関数
  const getCurrentUnitPrice = () => {
    if (!selectedItem) return 0;
    if (selectedSize === 'L') {
      // 飲み放題プランかつメガ/ボトルの場合、追加料金(extraPrice)があるか確認
      return orderPlan !== "単品オーダー" ? (selectedItem.extraPrice || 0) : (selectedItem.extraPrice || 0);
    }
    return getBasePrice(selectedItem);
  };

  if (!orderPlan) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
      <h1 style={{ color: '#fff', fontSize: '4.2rem', fontWeight: '900', marginBottom: '10px' }}>放課後<br /><span style={{ color: '#ff0000' }}>倶</span>楽部</h1>
      <div style={{ color: '#d35400', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '40px' }}>TABLE: {tableNo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '280px' }}>
        {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
          <button key={p} onClick={() => setOrderPlan(p)} style={{ padding: '20px', borderRadius: '15px', background: '#1a1a1a', color: '#fff', border: '2px solid #d35400', fontWeight: 'bold' }}>{p}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <header style={{ padding: '15px', background: '#000', borderBottom: '3px solid #d35400', display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div><div style={{ fontSize: '0.7rem', color: '#d35400' }}>{orderPlan}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tableNo}</div></div>
        <button onClick={() => setShowConfirm(true)} style={{ background: '#d35400', padding: '5px 15px', borderRadius: '15px', color: '#fff', fontWeight: 'bold', border: 'none' }}>注文確認 ({cart.reduce((s, i) => s + i.quantity, 0)})</button>
      </header>

      <nav style={{ position: 'sticky', top: '65px', zIndex: 999, background: '#121212', padding: '10px 0', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px', marginBottom: '10px' }}>
          {fList.map(f => (
            <button key={f as string} onClick={() => setActiveF(f as string)} style={{ padding: '10px 24px', borderRadius: '25px', border: 'none', background: activeF === f ? '#d35400' : '#333', color: '#fff', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{f as string}</button>
          ))}
        </div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '18px', padding: '0 15px' }}>
          {gList.map(g => (
            <button key={g as string} onClick={() => setActiveG(g as string)} style={{ background: 'none', border: 'none', color: activeG === g ? '#ff7e2e' : '#666', whiteSpace: 'nowrap', borderBottom: activeG === g ? '2px solid #ff7e2e' : '2px solid transparent', fontSize: '0.95rem', paddingBottom: '6px' }}>{g as string}</button>
          ))}
        </div>
      </nav>

      <main style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '120px' }}>
        {filteredItems.filter(i => i.type === activeF && (activeG === 'すべて' || i.category === activeG)).map(item => (
          <div key={item.rowNumber} onClick={() => { if(!item.isSoldOut) { setSelectedItem(item); setTempQty(1); setSelectedSize(item.optionType === '1' || item.optionType === '2' ? 'S' : null); setSelectedWari('ロック'); } }} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', opacity: item.isSoldOut ? 0.5 : 1 }}>
            <img src={item.image ? `/menu-images/${encodeURIComponent(item.image)}` : 'https://placehold.jp/200x200.png?text=NO+IMAGE'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ fontSize: '0.65rem', color: '#aaa', margin: '4px 0' }}>{item.description}</div>
              <div style={{ color: '#ff7e2e', fontWeight: 'bold' }}>{item.isSoldOut ? 'SOLD OUT' : `¥${getBasePrice(item).toLocaleString()}`}</div>
            </div>
          </div>
        ))}
      </main>

      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', padding: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{selectedItem.name}</h3>
              <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '10px 0 20px' }}>{selectedItem.description}</p>
              
              {/* 価格表示エリアの追加 */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.9rem', color: '#888' }}>単価: ¥{getCurrentUnitPrice().toLocaleString()}</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff7e2e' }}>
                   合計: ¥{(getCurrentUnitPrice() * tempQty).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>-</button>
                <span style={{ fontSize: '1.8rem' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>+</button>
              </div>

              {(selectedItem.optionType === '1' || selectedItem.optionType === '2') && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <button onClick={() => setSelectedSize('S')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: selectedSize === 'S' ? '#d35400' : '#333', color: '#fff', border: 'none' }}>{selectedItem.optionType === '1' ? 'グラス' : '通常'}</button>
                  <button onClick={() => setSelectedSize('L')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: selectedSize === 'L' ? '#d35400' : '#333', color: '#fff', border: 'none' }}>{selectedItem.optionType === '1' ? 'ボトル' : 'メガ'}</button>
                </div>
              )}

              {selectedItem.optionType === '1' && selectedSize === 'S' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                  {['ロック', '水割り', '炭酸割り', 'ウーロン割り'].map(w => (
                    <button key={w} onClick={() => setSelectedWari(w)} style={{ padding: '8px', borderRadius: '8px', background: selectedWari === w ? '#ff7e2e' : '#444', color: '#fff', border: 'none', fontSize: '0.8rem' }}>{w}</button>
                  ))}
                </div>
              )}

              <button onClick={() => {
                let price = getCurrentUnitPrice();
                let label = "";
                if (selectedSize === 'L') {
                  label = selectedItem.optionType === '1' ? "(ボトル)" : "(メガ)";
                } else if (selectedItem.optionType === '1') label = `(${selectedWari})`;
                setCart(prev => [...prev, { ...selectedItem, quantity: tempQty, price, name: `${selectedItem.name}${label}` }]);
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
            <h2 style={{ color: '#d35400', textAlign: 'center' }}>注文内容確認</h2>
            <div style={{ flex: 1, overflowY: 'auto', margin: '20px 0' }}>
              {cart.map((i, idx) => (
                <div key={idx} style={{ padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                  <div><div>{i.name}</div><div style={{ color: '#ff7e2e' }}>¥{(i.price * i.quantity).toLocaleString()} ({i.quantity})</div></div>
                  <button onClick={() => setCart(prev => prev.filter((_, j) => idx !== j))} style={{ color: '#ff4444', background: 'none', border: 'none' }}>削除</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'right', color: '#d35400', marginBottom: '20px' }}>合計: ¥{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</div>
            <button onClick={async () => {
              const res = await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart, tableNo, orderType: orderPlan }) });
              if (res.ok) { alert('注文完了！'); setCart([]); setShowConfirm(false); }
            }} style={{ width: '100%', padding: '20px', background: '#d35400', color: '#fff', borderRadius: '40px', border: 'none', fontWeight: 'bold' }}>注文を確定する</button>
            <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><OrderSystem /></Suspense>;
}
