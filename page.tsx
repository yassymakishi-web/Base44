'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function OrderContent() {
  const searchParams = useSearchParams();
  const tableNo = searchParams.get('table') || '未設定';
  
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orderPlan, setOrderPlan] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<'S' | 'L' | null>(null);
  const [selectedWari, setSelectedWari] = useState<string>('');
  const [activeF, setActiveF] = useState('ドリンク');
  const [activeG, setActiveG] = useState('すべて');

  const [flashColor, setFlashColor] = useState<string>('transparent');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [logoTarget, setLogoTarget] = useState({ x: 0, y: 0 });
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const [cartAnimCoord, setCartAnimCoord] = useState({ x: 0, y: 0, startX: 0, startY: 0 });
  const [isCartAdding, setIsCartAdding] = useState(false);
  const [isOrderFinishing, setIsOrderFinishing] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'success' | 'error' | null>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const menuTopRef = useRef<HTMLDivElement>(null);
  const planBtnRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    fetch('/api/menu').then(res => res.json()).then(data => setItems(data));
  }, []);

  useEffect(() => {
    if (orderPlan && menuTopRef.current) {
      menuTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeF, activeG, orderPlan]);

  const getPlanColor = (plan: string) => {
    const colors: { [key: string]: string } = {
      "ライトプラン": "#ffcc00", "スタンダードプラン": "#ff8800", "プレミアムプラン": "#720017", "単品オーダー": "#00aaff"
    };
    return colors[plan] || "#ffffff";
  };

  const calculateFinalPrice = (item: any, size: 'S' | 'L' | null, plan: string | null) => {
    if (size === 'L' && item.extraPrice !== null) return item.extraPrice;
    if (size === 'S' && item.glassPrice !== null) return item.glassPrice;
    if (item.type !== "フード" && plan && plan !== "単品オーダー") {
      if (plan === "ライトプラン" && item.priceS !== null) return item.priceS;
      if (plan === "スタンダードプラン" && item.priceL !== null) return item.priceL;
      if (plan === "プレミアムプラン" && item.priceP !== null) return item.priceP;
    }
    return item.priceDefault;
  };

  const handlePlanSelect = useCallback((plan: string) => {
    const btn = planBtnRefs.current[plan];
    const logo = logoRef.current;
    if (btn && logo) {
      const b = btn.getBoundingClientRect();
      const l = logo.getBoundingClientRect();
      setLogoTarget({ 
        x: (b.left + b.width/2) - (l.left + l.width/2), 
        y: (b.top + b.height/2) - (l.top + l.height/2) 
      });
      setIsLogoAnimating(true);
      setFlashColor(getPlanColor(plan));
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => { setOrderPlan(plan); setIsTransitioning(false); setIsLogoAnimating(false); }, 600);
      }, 1200);
    } else {
      setOrderPlan(plan);
    }
  }, []);

  const handleOrderSubmit = async () => {
    if (cart.length === 0 || isOrdering) return;
    setIsOrdering(true);
    setOrderStatus(null);
    try {
      const res = await fetch('/api/menu', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, tableNo, orderType: orderPlan }) 
      });
      if (res.ok) {
        setOrderStatus('success');
        setIsOrderFinishing(true);
        setTimeout(() => {
          alert('ご注文を承りました！');
          setCart([]); setShowConfirm(false); 
          if (menuTopRef.current) {
            menuTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          setIsOrderFinishing(false); setOrderStatus(null);
        }, 1500);
      } else { throw new Error(); }
    } catch (e) {
      setOrderStatus('error');
      setIsOrderFinishing(true);
      setTimeout(() => {
        alert('送信に失敗しました。');
        setIsOrderFinishing(false); setOrderStatus(null);
      }, 1500);
    } finally { setIsOrdering(false); }
  };

  const filteredItems = items.filter(item => {
    if (!orderPlan || orderPlan === "単品オーダー") return true;
    const limit = String(item.planLimit || "").toUpperCase();
    if (limit === "") return true;
    if (orderPlan === "ライトプラン") return limit.includes("L");
    if (orderPlan === "スタンダードプラン") return limit.includes("S") || limit.includes("L");
    if (orderPlan === "プレミアムプラン") return limit.includes("P") || limit.includes("S") || limit.includes("L");
    return true;
  });

  const fList = Array.from(new Set(filteredItems.map(i => i.type))).filter(Boolean);
  const currentCategoryItems = filteredItems.filter(i => i.type === activeF);
  const gList = ["すべて", ...Array.from(new Set(currentCategoryItems.map(i => i.category))).filter(Boolean)];

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh', fontFamily: '"YuMincho", "Sawarabi Mincho", serif' }}>
      
      <AnimatePresence>
        {isCartAdding && (
          <motion.img 
            src="/menu-images/星ロゴ.png" 
            initial={{ position: 'fixed', left: cartAnimCoord.startX, top: cartAnimCoord.startY, scale: 0.2, opacity: 0, x: '-50%', y: '-50%', zIndex: 99999 }} 
            animate={{ 
              left: [cartAnimCoord.startX, cartAnimCoord.startX, cartAnimCoord.startX, cartAnimCoord.startX + cartAnimCoord.x],
              top: [cartAnimCoord.startY, cartAnimCoord.startY - 150, cartAnimCoord.startY - 150, cartAnimCoord.startY + cartAnimCoord.y],
              scale: [0.4, 1.5, 1.5, 0.2],
              rotate: [0, 90, 360, 1440],
              opacity: [0, 1, 1, 0]
            }} 
            transition={{ duration: 2.5, times: [0, 0.2, 0.5, 1], ease: ["easeOut", "linear", "anticipate", "easeInOut"] }} 
            style={{ width: '80px', pointerEvents: 'none' }} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{isTransitioning && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: flashColor }} />}</AnimatePresence>

      <AnimatePresence mode="wait">
        {!orderPlan ? (
          <motion.div key="top" initial={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
            <h1 style={{ fontSize: '6rem', fontWeight: '900', marginBottom: '10px', lineHeight: '1.1', letterSpacing: '-0.05em' }}>放課後<br />倶<span style={{ color: '#ff0000' }}>楽</span>部</h1>
            
            <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.3em', marginBottom: '30px', opacity: 0.8 }}>モバイルオーダーメニュー</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '60px' }}>
              <motion.img ref={logoRef} src="/menu-images/星ロゴ.png" animate={isLogoAnimating ? { rotate: [0, 360, 1440], x: [0, 0, logoTarget.x], y: [0, -400, logoTarget.y], scale: [1, 1.3, 1], opacity: [1, 1, 1, 0] } : {}} transition={{ duration: 1.3 }} style={{ width: '110px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '200px' }}>
                <div style={{ color: '#d35400', fontWeight: 'bold', fontSize: '1.4rem', letterSpacing: '0.15em', marginBottom: '5px' }}>TABLE</div>
                <div style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1', textAlign: 'center', whiteSpace: 'nowrap' }}>{tableNo}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '340px' }}>
              {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
                <button key={p} ref={el => planBtnRefs.current[p] = el} onClick={() => handlePlanSelect(p)} style={{ padding: '22px', borderRadius: '18px', background: 'none', border: `2px solid ${getPlanColor(p)}`, color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{p}</button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <header style={{ height: '65px', padding: '0 15px', background: '#000', borderBottom: `3px solid ${getPlanColor(orderPlan)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 }}>
              <div><div style={{ fontSize: '0.7rem', color: getPlanColor(orderPlan), fontWeight: 'bold' }}>{orderPlan}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>TABLE {tableNo}</div></div>
              <motion.button ref={cartBtnRef} animate={isCartBouncing ? { scale: [1, 1.2, 1] } : {}} onClick={() => setShowConfirm(true)} style={{ background: '#d35400', padding: '10px 20px', borderRadius: '25px', color: '#fff', fontWeight: 'bold', border: 'none' }}>注文確認 ({cart.reduce((s, i) => s + i.quantity, 0)})</motion.button>
            </header>
            <nav style={{ position: 'sticky', top: '65px', zIndex: 999, background: '#121212', padding: '10px 0', borderBottom: '1px solid #333' }}>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px', marginBottom: '10px' }}>{fList.map(f => <button key={f as string} onClick={() => { setActiveF(f as string); setActiveG('すべて'); }} style={{ padding: '10px 24px', borderRadius: '25px', border: 'none', background: activeF === f ? '#d35400' : '#333', color: '#fff', fontWeight: 'bold', whiteSpace:'nowrap' }}>{f as string}</button>)}</div>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '18px', padding: '0 15px' }}>{gList.map(g => <button key={g as string} onClick={() => setActiveG(g as string)} style={{ background: 'none', border: 'none', color: activeG === g ? '#ff7e2e' : '#666', borderBottom: activeG === g ? '2px solid #ff7e2e' : '2px solid transparent', paddingBottom: '6px', whiteSpace:'nowrap' }}>{g as string}</button>)}</div>
            </nav>
            <div ref={menuTopRef} style={{ scrollMarginTop: '130px' }} />
            <main style={{ padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingBottom: '120px' }}>
              {currentCategoryItems.filter(i => activeG === 'すべて' || i.category === activeG).map((item, idx) => {
                const isAvail = String(item.isSoldOut).trim() === '1';
                return (
                  <div key={`${item.id}-${idx}`} onClick={() => { 
                    if(isAvail) { 
                      setSelectedItem(item); 
                      setTempQty(1); 
                      const opt = String(item.optionType).trim();
                      setSelectedSize((['1','2','3'].includes(opt)) ? 'S' : null);
                      setSelectedWari(opt === '4' ? '冷' : (['1','5'].includes(opt) ? 'ロック' : '')); 
                    } 
                  }} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', opacity: isAvail ? 1 : 0.5 }}>
                    <img src={item.image ? `/menu-images/${encodeURIComponent(item.image)}` : 'https://placehold.jp/200x200.png'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', height: '2.4em' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '4px', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', height: '2.4em', lineHeight: '1.2em' }}>{item.description}</div>
                      <div style={{ color: '#ff7e2e', fontWeight: 'bold', marginTop: '6px' }}>{isAvail ? `¥${calculateFinalPrice(item, null, orderPlan).toLocaleString()}` : '売切'}</div>
                    </div>
                  </div>
                );
              })}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', padding: '25px', maxHeight: '90vh', overflowY: 'auto' }}>
              <img src={selectedItem.image ? `/menu-images/${encodeURIComponent(selectedItem.image)}` : 'https://placehold.jp/200x200.png'} style={{ width: '100%', borderRadius: '15px' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center', marginTop: '15px' }}>{selectedItem.name}</h3>
              <p style={{ color: '#ccc', fontSize: '0.85rem', textAlign: 'left', margin: '15px 0', lineHeight: '1.5' }}>{selectedItem.description}</p>
              <div style={{ textAlign: 'center', fontSize: '1.8rem', fontWeight: 'bold', color: '#ff7e2e', margin: '15px 0' }}>¥{(calculateFinalPrice(selectedItem, selectedSize, orderPlan) * tempQty).toLocaleString()}</div>
              
              {['1','2','3'].includes(String(selectedItem.optionType).trim()) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <button onClick={() => setSelectedSize('S')} style={{ padding: '12px', background: selectedSize === 'S' ? '#d35400' : '#333', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: 'bold' }}>{['1','3'].includes(String(selectedItem.optionType).trim()) ? 'グラス' : '通常'}</button>
                  <button onClick={() => setSelectedSize('L')} style={{ padding: '12px', background: selectedSize === 'L' ? '#d35400' : '#333', border: 'none', color: '#fff', borderRadius: '10px', fontWeight: 'bold' }}>{['1','3'].includes(String(selectedItem.optionType).trim()) ? 'ボトル' : 'メガ'}</button>
                </div>
              )}

              {['1','5'].includes(String(selectedItem.optionType).trim()) && selectedSize !== 'L' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
                  {['ロック', '水割り', '炭酸割り', 'ウーロン割り', '緑茶割り', 'さんぴん割り'].map(w => (
                    <button key={w} onClick={() => setSelectedWari(w)} style={{ padding: '10px 5px', borderRadius: '8px', background: selectedWari === w ? '#d35400' : '#444', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 'bold' }}>{w}</button>
                  ))}
                </div>
              )}

              {String(selectedItem.optionType).trim() === '4' && selectedSize !== 'L' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  {['冷', '熱燗'].map(w => (
                    <button key={w} onClick={() => setSelectedWari(w)} style={{ padding: '12px', borderRadius: '10px', background: selectedWari === w ? '#d35400' : '#444', color: '#fff', border: 'none', fontWeight: 'bold' }}>{w}</button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', marginBottom: '20px', alignItems: 'center' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>-</button>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>+</button>
              </div>
              
              <button onClick={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                const cartRect = cartBtnRef.current?.getBoundingClientRect();
                if (cartRect) { 
                  setCartAnimCoord({ startX: rect.left + rect.width/2, startY: rect.top + rect.height/2, x: (cartRect.left + cartRect.width/2)-(rect.left + rect.width/2), y: (cartRect.top + cartRect.height/2)-(rect.top + rect.height/2) });
                  setIsCartAdding(true); 
                }
                const p = calculateFinalPrice(selectedItem, selectedSize, orderPlan);
                let label = "";
                if(selectedSize === 'L') label = ['1','3'].includes(String(selectedItem.optionType).trim()) ? " [ボトル]" : " [メガ]";
                if(selectedSize === 'S' && ['1','3'].includes(String(selectedItem.optionType).trim())) label = " [グラス]";
                if(selectedWari && selectedSize !== 'L') label += ` (${selectedWari})`;
                
                setCart([...cart, { ...selectedItem, name: `${selectedItem.name}${label}`, quantity: tempQty, price: p }]);
                setTimeout(() => { setIsCartAdding(false); setSelectedItem(null); setIsCartBouncing(true); setTimeout(() => setIsCartBouncing(false), 300); }, 2500);
              }} style={{ width: '100%', padding: '18px', borderRadius: '35px', background: '#d35400', color: '#fff', fontWeight: 'bold', border: 'none' }}>カートに追加</button>
              <button onClick={() => setSelectedItem(null)} style={{ width: '100%', marginTop: '10px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} style={{ position: 'fixed', inset: 0, background: '#121212', zIndex: 3000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ textAlign: 'center', color: '#d35400', marginBottom: '20px' }}>注文内容の確認</h2>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 'bold' }}>{item.name}</div><div style={{ color: '#ff7e2e' }}>¥{item.price.toLocaleString()}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#222', padding: '5px 10px', borderRadius: '15px' }}>
                      <button onClick={() => { const n = [...cart]; if(n[idx].quantity > 1) { n[idx].quantity -= 1; setCart(n); } }} style={{ background: 'none', border: 'none', color: '#fff' }}>－</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => { const n = [...cart]; n[idx].quantity += 1; setCart(n); }} style={{ background: 'none', border: 'none', color: '#fff' }}>＋</button>
                    </div>
                    <div style={{ fontWeight: 'bold', minWidth: '70px', textAlign: 'right' }}>¥{(item.price * item.quantity).toLocaleString()}</div>
                    <button onClick={() => setCart(prev => prev.filter((_, j) => idx !== j))} style={{ color: '#ff4444', background: 'none', border: 'none' }}>削除</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1.8rem', textAlign: 'right', margin: '20px 0', color: '#d35400', fontWeight: 'bold' }}>合計: ¥{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</div>
            <button disabled={isOrdering} onClick={handleOrderSubmit} style={{ width: '100%', padding: '20px', background: '#d35400', color: '#fff', borderRadius: '40px', fontWeight: 'bold', border: 'none' }}>{isOrdering ? '送信中...' : '注文を確定する'}</button>
            <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderFinishing && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: orderStatus === 'error' ? 'rgba(255,0,0,0.2)' : 'transparent' }}>
            {[...Array(orderStatus === 'success' ? 12 : 6)].map((_, i) => (
              <motion.img key={i} src="/menu-images/星ロゴ.png" initial={{ scale: 0, x: 0, y: 0, opacity: 1 }} animate={orderStatus === 'success' ? { scale: [0, 1.5, 0], x: (Math.random()-0.5)*600, y: (Math.random()-0.5)*800, rotate: 720 } : { scale: [0, 1, 0.8], x: (Math.random()-0.5)*100, y: 500, rotate: -180, opacity: [1, 1, 0], filter: 'sepia(1) saturate(100) hue-rotate(-50deg)' }} transition={{ duration: 1.5 }} style={{ position: 'absolute', width: '80px' }} />
            ))}
            <motion.div animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 1.2] }} transition={{ duration: 1.5 }} style={{ color: orderStatus === 'success' ? '#ff7e2e' : '#ff0000', fontSize: '3rem', fontWeight: '900', textShadow: '0 0 20px #fff' }}>{orderStatus === 'success' ? 'ORDER SUCCESS!!' : 'ORDER FAILED'}</motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>読み込み中...</div>}>
      <OrderContent />
    </Suspense>
  );
}
