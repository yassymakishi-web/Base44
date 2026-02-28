'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OrderSystem() {
  const searchParams = useSearchParams();
  const tableNo = searchParams.get('table') || '未設定';
  
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orderPlan, setOrderPlan] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [tempQty, setTempQty] = useState(1);

  const [activeF, setActiveF] = useState(''); 
  const [activeG, setActiveG] = useState('すべて');

  const [selectedSize, setSelectedSize] = useState<'glass' | 'bottle' | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState('');
  const subOptions = ["ロック", "水割り", "ソーダ割り", "お茶割り", "ストレート"];

  // メニュー取得
  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.ok ? res.json() : Promise.reject('Error'))
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        if (data.length > 0) {
          const firstType = Array.from(new Set(data.map((i: any) => i.type))).filter(Boolean)[0];
          setActiveF(String(firstType || ''));
        }
      })
      .catch(err => console.error(err));
  }, []);

  // 【復活】タブ（ジャンル・カテゴリー）切り替え時にページトップへスクロール
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeF, activeG, orderPlan]);

  const getPrice = (item: any) => {
    if (!item) return 0;
    if (orderPlan === 'ライトプラン' && item.priceL !== null) return item.priceL;
    if (orderPlan === 'スタンダードプラン' && item.priceS !== null) return item.priceS;
    if (orderPlan === 'プレミアムプラン' && item.priceP !== null) return item.priceP;
    return item.priceDefault;
  };

  const handleItemClick = (item: any) => {
    const p = getPrice(item);
    if (item.isDrinkOption || item.priceGlass !== null || item.priceBottle !== null) {
      setSelectedItem(item);
      setTempQty(1);
      setSelectedSubOption('');
      if (item.priceGlass !== null) setSelectedSize('glass');
      else if (item.priceBottle !== null) setSelectedSize('bottle');
      else setSelectedSize(null);
      setShowConfirm(true);
      return;
    }
    if (orderPlan !== '単品オーダー' && p === 0) {
      setCart(prev => [...prev, { ...item, name: item.name, price: 0, quantity: 1, rowNumber: Date.now() }]);
      return;
    }
    setSelectedItem(item);
    setTempQty(1);
    setShowConfirm(true);
  };

  const addToCart = () => {
    if (!selectedItem) return;
    if ((selectedItem.priceGlass !== null || selectedItem.priceBottle !== null) && !selectedSize) {
      alert("サイズを選択してください"); return;
    }
    let price = getPrice(selectedItem);
    let name = selectedItem.name;
    if (selectedSize === 'glass') {
      price = selectedItem.priceGlass ?? price;
      name += " (グラス)";
      if (selectedItem.isDrinkOption && selectedSubOption) name += ` / ${selectedSubOption}`;
    } else if (selectedSize === 'bottle') {
      price = selectedItem.priceBottle ?? price;
      name += " (ボトル)";
    }
    setCart([...cart, { ...selectedItem, name, price, quantity: tempQty, rowNumber: Date.now() }]);
    setSelectedItem(null);
    setShowConfirm(false);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNo, cart, orderType: orderPlan })
      });
      if (res.ok) { alert("注文を確定しました"); setCart([]); setShowConfirm(false); }
    } catch (e) { alert("通信エラー"); }
  };

  const filteredByPlan = items.filter(item => {
    if (!orderPlan || orderPlan === "単品オーダー") return true;
    const limit = item.planLimit || "";
    if (limit === "") return true; 
    if (orderPlan === "ライトプラン") return limit.includes("L");
    if (orderPlan === "スタンダードプラン") return limit.includes("L") || limit.includes("S");
    if (orderPlan === "プレミアムプラン") return limit.includes("L") || limit.includes("S") || limit.includes("P");
    return false;
  });

  if (!orderPlan) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ color: '#fff', fontSize: '4.5rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '10px' }}>放課後<br /><span style={{ color: '#ff0000' }}>倶</span>楽部</h1>
        <div style={{ color: '#d35400', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '40px' }}>TABLE: {tableNo}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '280px' }}>
          {["単品オーダー", "ライトプラン", "スタンダードプラン", "プレミアムプラン"].map(p => (
            <button key={p} onClick={() => setOrderPlan(p)} style={{ padding: '20px', borderRadius: '15px', background: '#1a1a1a', color: '#fff', border: '2px solid #d35400', fontWeight: 'bold' }}>{p}</button>
          ))}
        </div>
      </div>
    );
  }

  const types = Array.from(new Set(filteredByPlan.map(i => i.type))).filter(Boolean);
  const displayItems = filteredByPlan.filter(i => (activeF === '' || i.type === activeF) && (activeG === 'すべて' || i.category === activeG));
  const gList = ['すべて', ...Array.from(new Set(filteredByPlan.filter(i => i.type === activeF).map(i => i.category))).filter(Boolean)];

  return (
    <div style={{ background: '#121212', color: '#fff', minHeight: '100vh', paddingBottom: '120px' }}>
      <header style={{ padding: '15px', background: '#000', borderBottom: '3px solid #d35400', display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div><div style={{ fontSize: '0.7rem', color: '#d35400' }}>{orderPlan}</div><div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tableNo}</div></div>
        <button onClick={() => {setSelectedItem(null); setShowConfirm(true);}} style={{ background: '#d35400', padding: '5px 15px', borderRadius: '15px', color: '#fff', fontWeight: 'bold', border: 'none' }}>注文確認 ({cart.reduce((s, i) => s + i.quantity, 0)})</button>
      </header>

      <nav style={{ position: 'sticky', top: '65px', zIndex: 999, background: '#121212', padding: '10px 0', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px', marginBottom: '10px' }}>
          {types.map(f => (
            <button key={f} onClick={() => {setActiveF(String(f)); setActiveG('すべて');}} style={{ padding: '10px 24px', borderRadius: '25px', border: 'none', background: activeF === f ? '#d35400' : '#333', color: '#fff', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{f}</button>
          ))}
        </div>
        {activeF && (
          <div style={{ display: 'flex', overflowX: 'auto', gap: '18px', padding: '0 15px' }}>
            {gList.map(g => (
              <button key={g} onClick={() => setActiveG(g)} style={{ background: 'none', border: 'none', color: activeG === g ? '#ff7e2e' : '#666', whiteSpace: 'nowrap', borderBottom: activeG === g ? '2px solid #ff7e2e' : '2px solid transparent', paddingBottom: '6px' }}>{g}</button>
            ))}
          </div>
        )}
      </nav>

      <main style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {displayItems.map((item, idx) => (
          <div key={idx} onClick={() => handleItemClick(item)} style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={item.image ? `/menu-images/${item.image}` : 'https://placehold.jp/200x200.png'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} alt="" />
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', height: '2.5em', overflow: 'hidden' }}>{item.name}</div>
              {/* B列の説明文 */}
              <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '2px', height: '1.2em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.description}</div>
              <div style={{ color: '#ff7e2e', fontWeight: 'bold', marginTop: '4px' }}>¥{(getPrice(item) || 0).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </main>

      {showConfirm && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1a1a1a', width: '100%', maxWidth: '400px', borderRadius: '25px', overflow: 'hidden' }}>
            <img src={selectedItem.image ? `/menu-images/${selectedItem.image}` : 'https://placehold.jp/400x300.png'} style={{ width: '100%', height: '220px', objectFit: 'cover' }} alt="" />
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '5px' }}>{selectedItem.name}</h3>
              <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '15px' }}>{selectedItem.description}</p>
              
              {(selectedItem.priceGlass !== null || selectedItem.priceBottle !== null) && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  {selectedItem.priceGlass !== null && <button onClick={() => setSelectedSize('glass')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: selectedSize === 'glass' ? '#d35400' : '#333', color: '#fff', border: 'none' }}>グラス<br/>¥{selectedItem.priceGlass}</button>}
                  {selectedItem.priceBottle !== null && <button onClick={() => setSelectedSize('bottle')} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: selectedSize === 'bottle' ? '#d35400' : '#333', color: '#fff', border: 'none' }}>ボトル<br/>¥{selectedItem.priceBottle}</button>}
                </div>
              )}
              {selectedItem.isDrinkOption && selectedSize === 'glass' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginBottom: '15px' }}>
                  {subOptions.map(o => <button key={o} onClick={() => setSelectedSubOption(o)} style={{ padding: '8px', borderRadius: '5px', background: selectedSubOption === o ? '#d35400' : '#333', border: 'none', color: '#fff', fontSize: '0.7rem' }}>{o}</button>)}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', margin: '20px 0' }}>
                <button onClick={() => setTempQty(Math.max(1, tempQty - 1))} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>-</button>
                <span style={{ fontSize: '1.8rem' }}>{tempQty}</span>
                <button onClick={() => setTempQty(tempQty + 1)} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #d35400', color: '#fff', background: 'none' }}>+</button>
              </div>
              <button onClick={addToCart} style={{ width: '100%', padding: '18px', background: '#d35400', color: '#fff', borderRadius: '35px', border: 'none', fontWeight: 'bold' }}>カートに追加</button>
              <button onClick={() => {setSelectedItem(null); setShowConfirm(false);}} style={{ width: '100%', marginTop: '10px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && !selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: '#121212', zIndex: 3000, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: '#d35400', textAlign: 'center', marginBottom: '20px' }}>注文内容の確認</h2>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {cart.map(i => (
              <div key={i.rowNumber} style={{ padding: '15px 0', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 'bold' }}>{i.name}</div><div style={{ color: '#ff7e2e' }}>¥{(i.price * i.quantity).toLocaleString()} ({i.quantity}点)</div></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <button onClick={() => setCart(prev => prev.filter(c => c.rowNumber !== i.rowNumber))} style={{ color: '#ff4444', background: 'none', border: 'none' }}>削除</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '20px 0', fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'right', color: '#d35400' }}>合計: ¥{cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</div>
          <button onClick={submitOrder} disabled={cart.length === 0} style={{ width: '100%', padding: '20px', background: cart.length === 0 ? '#444' : '#d35400', color: '#fff', borderRadius: '40px', border: 'none', fontWeight: 'bold', fontSize: '1.2rem' }}>注文を確定する</button>
          <button onClick={() => setShowConfirm(false)} style={{ width: '100%', marginTop: '15px', color: '#888', background: 'none', border: 'none' }}>戻る</button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>Loading...</div>}><OrderSystem /></Suspense>;
}