'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

function OrderSystem() {
  const searchParams = useSearchParams();
  const tableNo = searchParams.get('table') || '未設定';
  
  const SESSION_TIMEOUT_SEC = 3600;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderPlan, setOrderPlan] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [tempQty, setTempQty] = useState(1);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // アニメーション方向管理用
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const storedTime = localStorage.getItem(`qr_load_time_${tableNo}`);
    if (searchParams.has('table')) {
      localStorage.setItem(`qr_load_time_${tableNo}`, now.toString());
      setIsSessionExpired(false);
    } else if (storedTime) {
      if (now - parseInt(storedTime) > SESSION_TIMEOUT_SEC) setIsSessionExpired(true);
    } else {
      setIsSessionExpired(true);
    }

    fetch('/api/menu').then(res => res.json()).then(data => setItems(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, [searchParams, tableNo]);

  const filteredItems = items.filter(item => {
    if (!orderPlan) return false;
    if (orderPlan === "単品オーダー") return true;
    if (item.type === "フード") return true;
    const planName = orderPlan.replace("プラン", "");
    return item.availablePlans && item.availablePlans.includes(planName);
  });

  const categories = Array.from(new Set(filteredItems.map(item => item.category)));

  useEffect(() => {
    if (categories.length > 0 && !activeTab) setActiveTab(categories[0]);
  }, [categories, activeTab]);

  const handleTabChange = (targetCat: string) => {
    const currentIndex = categories.indexOf(activeTab);
    const targetIndex = categories.indexOf(targetCat);
    setSlideDir(targetIndex > currentIndex ? 'right' : 'left');
    setActiveTab(targetCat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // スワイプ処理
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.targetTouches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const currentIndex = categories.indexOf(activeTab);
    if (distance > 70 && currentIndex < categories.length - 1) {
      handleTabChange(categories[currentIndex + 1]);
    } else if (distance < -70 && currentIndex > 0) {
      handleTabChange(categories[currentIndex - 1]);
    }
    touchStartX.current = null; touchEndX.current = null;
  };

  const getDisplayPrice = (item: any) => {
    if (orderPlan === "ライトプラン") return item.priceLight ?? item.priceDefault;
    if (orderPlan === "スタンダードプラン") return item.priceStandard ?? item.priceDefault;
    if (orderPlan === "プレミアムプラン") return item.pricePremium ?? item.priceDefault;
    return item.priceDefault;
  };

  const addToCart = () => {
    if (!selectedItem) return;
    const currentPrice = getDisplayPrice(selectedItem);
    setCart(prev => {
      const existing = prev.find(c => c.rowNumber === selectedItem.rowNumber);
      if (existing) return prev.map(c => c.rowNumber === selectedItem.rowNumber ? { ...c, quantity: c.quantity + tempQty, price: currentPrice } : c);
      return [...prev, { ...selectedItem, quantity: tempQty, price: currentPrice }];
    });
    setSelectedItem(null); setTempQty(1);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, tableNo, orderType: orderPlan }),
    });
    if (res.ok) { alert("注文を送信しました！"); setCart([]); setShowConfirm(false); }
  };

  // 表示ロジック開始
  if (isSessionExpired) return (
    <div style={{backgroundColor:'#000',color:'#fff',height:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'20px'}}>
      <div style={{fontSize:'4rem',marginBottom:'20px'}}>⌛</div>
      <h2>セッションの有効期限切れ</h2>
      <p>セキュリティのため、QRコードを再度読み込んでください。</p>
    </div>
  );

  if (!orderPlan) return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ textAlign: 'center', lineHeight: '1.1', marginBottom: '20px' }}>
        <div style={{ color: '#fff', fontSize: '4.5rem', fontWeight: '900' }}>放課後</div>
        <div style={{ color: '#fff', fontSize: '4.5rem', fontWeight: '900' }}><span style={{ color: '#ff0000' }}>倶</span>楽部</div>
      </div>
      <div style={{ color: '#d35400', fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '40px', borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '5px 40px' }}>{tableNo}</div>
      <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
          <button key={p} onClick={() => setOrderPlan(p)} style={{ width: '100%', padding: '22px', borderRadius: '15px', border: '2px solid #d35400', background: 'linear-gradient(145deg, #1a1a1a, #000)', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{p}</button>
        ))}
      </div>
    </div>
  );

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: '100px' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#121212', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <style>{`
        @keyframes slideFromRight { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideFromLeft { from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slide-right { animation: slideFromRight 0.3s ease-out forwards; }
        .slide-left { animation: slideFromLeft 0.3s ease-out forwards; }
      `}</style>

      <header style={{ padding: '15px', background: '#000', borderBottom: '3px solid #d35400', display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#d35400' }}>{orderPlan}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{tableNo}</div>
        </div>
        <button onClick={() => setShowConfirm(true)} style={{ background: '#d35400', padding: '5px 15px', borderRadius: '15px', color:'#fff', border:'none', fontWeight: 'bold' }}>
          注文確認 ({cart.reduce((s,i)=>s+i.quantity, 0)})
        </button>
      </header>

      <div style={{ position: 'sticky', top: '65px', zIndex: 90, background: '#121212', padding: '10px', display: 'flex', overflowX: 'auto', gap: '10px', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => handleTabChange(cat)} style={{ padding: '8px 20px', borderRadius: '20px', border: 'none', background: activeTab === cat ? '#d35400' : '#333', color: '#fff', whiteSpace: 'nowrap' }}>{cat}</button>
        ))}
      </div>

      <main key={activeTab} className={slideDir === 'right' ? 'slide-right' : 'slide-left'} style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingBottom: '120px' }}>
        {filteredItems.filter(i => i.category === activeTab).map(item => (
          <div key={item.rowNumber} onClick={() => { setSelectedItem(item); setTempQty(1); }} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={item.attr && item.attr.includes('.') ? `/menu-images/${item.attr}` : 'https://placehold.jp/24/333333/ffffff/200x200.png?text=No%20Image'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', height: '2.4em' }}>{item.name}</div>
              <div style={{ color: '#ff7e2e', fontWeight: 'bold' }}>¥{getDisplayPrice(item).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </main>

      {/* 商品詳細モーダル */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', overflow: 'hidden' }}>
            <img src={selectedItem.attr && selectedItem.attr.includes('.') ? `/menu-images/${selectedItem.attr}` : 'https://placehold.jp/24/333333/ffffff/450x300.png?text=No%20Image'} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '20px' }}>
              <h3>{selectedItem.name}</h3>
              <p style={{ color: '#ccc', fontSize: '0.85rem', margin: '10px 0' }}>{selectedItem.description}</p>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', margin: '20px 0' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', background: 'none', color: '#fff' }}>-</button>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #d35400', background: 'none', color: '#fff' }}>+</button>
              </div>
              <button onClick={addToCart} style={{ width: '100%', padding: '15px', borderRadius: '30px', background: '#d35400', color: '#fff', border: 'none', fontWeight: 'bold' }}>カートに追加</button>
              <button onClick={() => setSelectedItem(null)} style={{ width: '100%', marginTop: '10px', color: '#888', background: 'none', border: 'none' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 注文確定画面 (数量調整機能) */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: '#121212', zIndex: 3000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#d35400', textAlign: 'center', marginBottom: '20px' }}>注文内容の確認</h2>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '50px', color: '#888' }}>カートは空です</div>
            ) : (
              cart.map(i => (
                <div key={i.rowNumber} style={{ display: 'flex', flexDirection: 'column', padding: '15px 0', borderBottom: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>{i.name}</span>
                    <span style={{ color: '#ff7e2e' }}>¥{(i.price * i.quantity).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => setCart(prev => prev.filter(c => c.rowNumber !== i.rowNumber))} style={{ background: 'none', border: 'none', color: '#ff4444', marginRight: 'auto', fontSize: '0.9rem' }}>削除</button>
                    <button onClick={() => setCart(prev => prev.map(c => c.rowNumber === i.rowNumber ? { ...c, quantity: Math.max(1, c.quantity - 1) } : c))} style={{ width: '35px', height: '35px', borderRadius: '50%', border: '1px solid #d35400', background: 'none', color: '#fff' }}>-</button>
                    <span style={{ fontSize: '1.2rem', minWidth: '20px', textAlign: 'center' }}>{i.quantity}</span>
                    <button onClick={() => setCart(prev => prev.map(c => c.rowNumber === i.rowNumber ? { ...c, quantity: c.quantity + 1 } : c))} style={{ width: '35px', height: '35px', borderRadius: '50%', border: '2px solid #d35400', background: 'none', color: '#fff' }}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ textAlign: 'right', padding: '20px 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#d35400', borderTop: '2px solid #333', marginTop: '10px' }}>
            合計: ¥{cart.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
          </div>
          <button disabled={cart.length === 0} onClick={submitOrder} style={{ width: '100%', padding: '20px', background: cart.length === 0 ? '#444' : '#d35400', color: '#fff', borderRadius: '40px', border: 'none', fontWeight: 'bold', fontSize: '1.2rem' }}>注文を確定する</button>
          <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>メニューに戻る</button>
        </div>
      )}
    </div>
  );
}

export default function Page() { return <Suspense fallback={null}><OrderSystem /></Suspense>; }