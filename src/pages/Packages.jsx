import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Package, Plus, Trash2, Edit2, ShoppingCart, Check, X, Clock, BookOpen, Users, Zap, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ICONS = { BookOpen, Users, Zap, Star, Crown, Package };
const ICON_NAMES = ['BookOpen', 'Users', 'Zap', 'Star', 'Crown', 'Package'];
const COLORS = [
  { name: 'Blue', bg: 'bg-blue-50 border-blue-200', accent: 'bg-blue-600', text: 'text-blue-600', value: 'blue' },
  { name: 'Purple', bg: 'bg-purple-50 border-purple-200', accent: 'bg-purple-600', text: 'text-purple-600', value: 'purple' },
  { name: 'Emerald', bg: 'bg-emerald-50 border-emerald-200', accent: 'bg-emerald-600', text: 'text-emerald-600', value: 'emerald' },
  { name: 'Amber', bg: 'bg-amber-50 border-amber-200', accent: 'bg-amber-600', text: 'text-amber-600', value: 'amber' },
  { name: 'Rose', bg: 'bg-rose-50 border-rose-200', accent: 'bg-rose-600', text: 'text-rose-600', value: 'rose' },
];

function getColor(val) { return COLORS.find(c => c.value === val) || COLORS[0]; }
function getIcon(name) { return ICONS[name] || Package; }

// ─── Admin: Package Form ────────────────────────────────
function PackageForm({ pkg, onSave, onCancel }) {
  const [form, setForm] = useState(pkg || {
    name: '', description: '', price: '', currency: 'GBP', duration_hours: '', level: 'A1-A2',
    features: [''], icon: 'BookOpen', color: 'blue', status: 'active', popular: false,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setFeature = (i, v) => { const f = [...form.features]; f[i] = v; set('features', f); };
  const addFeature = () => set('features', [...form.features, '']);
  const removeFeature = (i) => set('features', form.features.filter((_, j) => j !== i));

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-lg">{pkg ? 'Edit Package' : 'New Package'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Package Name</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. IELTS Intensive" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Level</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.level} onChange={e => set('level', e.target.value)}>
            {['A1', 'A1-A2', 'A2', 'B1', 'B1-B2', 'B2', 'C1', 'C1-C2', 'All Levels'].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Price</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.price} onChange={e => set('price', e.target.value)} placeholder="1200" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Duration (hours)</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder="60" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Icon</label>
          <div className="flex gap-2 mt-1">
            {ICON_NAMES.map(name => { const I = ICONS[name]; return (
              <button key={name} onClick={() => set('icon', name)} className={`p-2 rounded-lg border ${form.icon === name ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <I className="w-4 h-4" />
              </button>
            ); })}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <div className="flex gap-2 mt-1">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => set('color', c.value)} className={`w-8 h-8 rounded-lg ${c.accent} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`} />
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Package description..." />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Features</label>
        {form.features.map((f, i) => (
          <div key={i} className="flex gap-2 mt-1">
            <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" value={f} onChange={e => setFeature(i, e.target.value)} placeholder="Feature..." />
            <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={addFeature} className="text-xs text-primary mt-1 hover:underline">+ Add feature</button>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.popular} onChange={e => set('popular', e.target.checked)} id="popular" />
        <label htmlFor="popular" className="text-sm">Mark as Popular</label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave({ ...form, price: parseFloat(form.price), duration_hours: parseInt(form.duration_hours) })}>Save Package</Button>
      </div>
    </div>
  );
}

// ─── Student: Package Card ──────────────────────────────
function PackageCard({ pkg, isStudent, onBuy, buying }) {
  const color = getColor(pkg.color);
  const Icon = getIcon(pkg.icon);
  return (
    <div className={`relative rounded-2xl border-2 ${color.bg} p-6 flex flex-col transition-all hover:shadow-lg ${pkg.popular ? 'ring-2 ring-primary shadow-md' : ''}`}>
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
          ⭐ Most Popular
        </div>
      )}
      <div className={`w-12 h-12 rounded-xl ${color.accent} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 flex-1">{pkg.description}</p>
      <div className="mb-4">
        <span className={`text-3xl font-black ${color.text}`}>£{pkg.price}</span>
        <span className="text-sm text-muted-foreground ml-1">/ {pkg.duration_hours}h</span>
      </div>
      <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Level: {pkg.level}</div>
      <ul className="space-y-2 mb-6">
        {(pkg.features || []).filter(Boolean).map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className={`w-4 h-4 ${color.text} flex-shrink-0`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {isStudent && (
        <Button
          onClick={() => onBuy(pkg)}
          disabled={buying}
          className={`w-full ${color.accent} hover:opacity-90 text-white`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {buying ? 'Processing...' : 'Enroll Now'}
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function Packages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [buying, setBuying] = useState(false);

  const role = user?.matched_role || user?.role;
  const isAdmin = ['admin', 'team_admin'].includes(role);
  const isStudent = role === 'student';

  useEffect(() => { loadData(); }, []);

  // Handle Stripe return — user yüklendikten sonra çalışsın
  useEffect(() => {
    if (!user) return;  // auth yüklenmesini bekle
    if (searchParams.get('success') === 'true') {
      const sessionId = searchParams.get('session_id');
      const packageId = searchParams.get('package_id');
      if (sessionId && packageId) {
        handleStripeSuccess(sessionId, packageId);
      }
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Payment Canceled', description: 'You can try again anytime.', variant: 'destructive' });
    }
  }, [searchParams, user]);  // user değişince de tekrar kontrol et

  const handleStripeSuccess = async (sessionId, packageId) => {
    try {
      // 1) Backend'e sync-all isteği at (backend doğrudan Firestore'a yazar)
      try {
        const syncRes = await fetch('http://localhost:3044/api/stripe/sync-all', { method: 'POST' });
        const syncData = await syncRes.json();
        console.log('[Stripe Sync]', syncData);
        toast({ title: '✅ Ödeme Alındı!', description: 'Paketiniz hesabınıza tanımlandı.' });
        loadData();
        return;
      } catch (backendErr) {
        console.warn('[Stripe Sync] Backend unavailable, falling back to client:', backendErr.message);
      }

      // 2) Fallback: Paketin detaylarını çek
      const pkgs = await base44.entities.Package.list();
      const pkg = pkgs.find(p => p.id === packageId);
      const pkgName = pkg?.name || 'Package';
      const pkgPrice = parseFloat(pkg?.price || 0);
      const pkgLevel = pkg?.level || '';

      // 3) Duplicate prevention - list + client-side filter
      const allExistingOrders = await base44.entities.Order.list();
      const dupOrder = allExistingOrders.find(o => o.stripe_session_id === sessionId);
      if (dupOrder) {
        toast({ title: '✅ Payment already recorded!', description: 'Your enrollment is active.' });
        loadData();
        return;
      }

      // 3) Order oluştur
      // Gerçek öğrenci kaydını email ile bul
      let realStudentId = user?.id;
      let realStudentEmail = user?.email;
      let realStudentName = user?.full_name;
      try {
        const students = await base44.entities.Student.filter({ email: user?.email });
        if (students.length > 0) {
          realStudentId = students[0].id;
          realStudentEmail = students[0].email;
          realStudentName = students[0].full_name;
        }
      } catch (_) {}

      await base44.entities.Order.create({
        student_id: realStudentId,
        student_email: realStudentEmail,
        student_name: realStudentName,
        package_id: packageId,
        package_name: pkgName,
        stripe_session_id: sessionId,
        status: 'paid',
        order_date: new Date().toISOString(),
        amount: pkgPrice,
      });

      // 4) Invoice oluştur (Faturalar sekmesinde görünsün)
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
      await base44.entities.Invoice.create({
        invoice_number: invoiceNumber,
        student_id: realStudentId,
        student_name: realStudentName,
        student_email: realStudentEmail,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        status: 'paid',
        subtotal: pkgPrice,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: pkgPrice,
        line_items: [{
          description: pkgName,
          quantity: 1,
          unit_price: pkgPrice,
          total: pkgPrice,
        }],
        notes: `Stripe Session: ${sessionId}`,
        package_id: packageId,
        source: 'stripe',
      });

      // 5) Payment kaydı oluştur
      await base44.entities.Payment.create({
        student_id: realStudentId,
        student_name: realStudentName,
        student_email: realStudentEmail,
        amount: pkgPrice,
        status: 'paid',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'credit_card',
        description: pkgName,
        package_id: packageId,
        source: 'stripe',
        stripe_session_id: sessionId,
      });

      // 6) Öğrenciyi ilgili kurslara otomatik kaydet
      if (realStudentId) {
        try {
          const allCourses = await base44.entities.Course.filter({});
          // Paketin level'ıyla eşleşen kursları bul
          const matchingCourses = allCourses.filter(c =>
            pkgLevel === 'All Levels' ||
            (c.cefr_level && (c.cefr_level === pkgLevel || pkgLevel.includes(c.cefr_level)))
          );
          // Her eşleşen kursa öğrenciyi ekle
          await Promise.all(matchingCourses.map(async course => {
            const enrolled = course.enrolled_students || [];
            if (!enrolled.includes(realStudentId)) {
              await base44.entities.Course.update(course.id, {
                enrolled_students: [...enrolled, realStudentId],
              });
            }
          }));
        } catch (enrollErr) {
          console.warn('Auto-enrollment partial error:', enrollErr);
        }
      }

      toast({ title: '✅ Payment Successful!', description: `${pkgName} - Enrollment confirmed. Invoice created.` });
      loadData();
    } catch (err) {
      console.error('Stripe success handler error:', err);
      toast({ title: '✅ Payment Received', description: 'Enrollment processing. Please refresh shortly.', variant: 'default' });
      loadData();
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const pkgs = await base44.entities.Package.list();
      setPackages(pkgs.filter(p => isAdmin || p.status === 'active'));
      if (isStudent && user?.email) {
        // list() + client-side filter - backend filter queries are unreliable
        const allOrds = await base44.entities.Order.list();
        const myOrds = allOrds.filter(o =>
          o.student_email === user.email ||
          o.student_id === user.id
        );
        setOrders(myOrds);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSave = async (data) => {
    try {
      if (editPkg) {
        await base44.entities.Package.update(editPkg.id, data);
        toast({ title: 'Package updated' });
      } else {
        await base44.entities.Package.create(data);
        toast({ title: 'Package created' });
      }
      setShowForm(false); setEditPkg(null);
      loadData();
    } catch (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this package?')) return;
    await base44.entities.Package.delete(id);
    toast({ title: 'Package deleted' });
    loadData();
  };

  const handleBuy = async (pkg) => {
    setBuying(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: pkg.name,
          price: pkg.price,
          currency: pkg.currency || 'gbp',
          studentEmail: user?.email,
          studentName: user?.full_name,
          packageId: pkg.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      toast({ title: 'Payment Error', description: err.message, variant: 'destructive' });
      setBuying(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" />
            {isStudent ? 'Course Packages' : 'Manage Packages'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isStudent ? 'Browse and enroll in our course packages' : 'Create and manage course packages for students'}
          </p>
        </div>
        {isAdmin && !showForm && (
          <Button onClick={() => { setEditPkg(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Package
          </Button>
        )}
      </div>

      {/* Admin: Form */}
      {isAdmin && showForm && (
        <div className="mb-8">
          <PackageForm pkg={editPkg} onSave={handleSave} onCancel={() => { setShowForm(false); setEditPkg(null); }} />
        </div>
      )}

      {/* Student: Orders */}
      {isStudent && orders.length > 0 && (
        <div className="mb-8 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-emerald-800 mb-2">✅ My Enrollments</h3>
          {orders.map(o => {
            const pkg = packages.find(p => p.id === o.package_id);
            return (
              <div key={o.id} className="flex items-center gap-3 py-1.5 text-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">{pkg?.name || 'Package'}</span>
                <span className="text-muted-foreground">— {new Date(o.order_date).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Grid */}
      {packages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No packages available yet.</p>
          {isAdmin && <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Create First Package</Button>}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="relative">
              <PackageCard pkg={pkg} isStudent={isStudent} onBuy={handleBuy} buying={buying} />
              {isAdmin && (
                <div className="absolute top-3 right-3 flex gap-1">
                  <button onClick={() => { setEditPkg(pkg); setShowForm(true); }} className="p-1.5 rounded-lg bg-white/80 hover:bg-white shadow border border-border/50">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded-lg bg-white/80 hover:bg-white shadow border border-border/50 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
