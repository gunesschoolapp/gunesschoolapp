import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Clock, Award, CheckCircle, ChevronRight, Calendar,
  Video, User, MapPin, Star, Package
} from 'lucide-react';

export default function MyPackages() {
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [myPackages, setMyPackages] = useState([]);
  const [orders, setOrders] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [pkgCourses, setPkgCourses] = useState([]);

  useEffect(() => {
    if (!authUser) return;
    loadMyPackages();
  }, [authUser]);

  const loadMyPackages = async () => {
    try {
      setLoading(true);

      // Öğrenci kaydını email ile bul (gerçek Student entity ID)
      const students = await base44.entities.Student.list();
      const student = students.find(s => s.email === authUser?.email);
      const studentId = student?.id;

      // Tüm Order'ları getir, client-side filtrele
      const allOrders = await base44.entities.Order.list();
      const myOrders = allOrders.filter(o =>
        (studentId && o.student_id === studentId) ||
        (authUser?.email && o.student_email === authUser.email)
      ).sort((a, b) => new Date(b.order_date || b.created_date || 0) - new Date(a.order_date || a.created_date || 0));
      setOrders(myOrders);

      // Invoice'lardan da paket ID'leri topla (Order yoksa invoice'dan da göster)
      const allInvs = await base44.entities.Invoice.list();
      const myInvs = allInvs.filter(inv =>
        (studentId && inv.student_id === studentId) ||
        (authUser?.email && inv.student_email === authUser.email)
      );

      // Tüm benzersiz paket ID'leri
      const pkgIdsFromOrders = myOrders.map(o => o.package_id).filter(Boolean);
      const pkgIdsFromInvoices = myInvs.map(i => i.package_id).filter(Boolean);
      const allPkgIds = new Set([...pkgIdsFromOrders, ...pkgIdsFromInvoices]);

      if (allPkgIds.size > 0) {
        const allPkgs = await base44.entities.Package.list();
        const pkgMap = {};
        allPkgs.forEach(p => { pkgMap[p.id] = p; });

        // Her Order için paket bilgisini ekle (aynı paket birden fazla kez göster)
        const ordersWithPkg = myOrders.map(o => ({
          ...o,
          packageData: pkgMap[o.package_id] || { name: o.package_name || 'Bilinmeyen Paket', id: o.package_id }
        }));

        // Invoice'dan gelen paketler için (Order'da olmayan)
        const orderPkgSet = new Set(myOrders.map(o => o.package_id));
        const invoiceOnlyOrders = myInvs
          .filter(inv => inv.package_id && !orderPkgSet.has(inv.package_id))
          .map(inv => ({
            id: inv.id,
            package_id: inv.package_id,
            package_name: inv.package_name,
            order_date: inv.issue_date,
            amount: inv.total_amount || inv.amount,
            status: inv.status,
            packageData: pkgMap[inv.package_id] || { name: inv.package_name || 'Bilinmeyen Paket', id: inv.package_id }
          }));

        setMyPackages([...ordersWithPkg, ...invoiceOnlyOrders]);
      } else {
        setMyPackages([]);
      }

      // Öğrencinin kayıtlı olduğu kursları yükle
      if (studentId) {
        const allCourses = await base44.entities.Course.list();
        const myCourses = allCourses.filter(c =>
          (c.enrolled_students || []).includes(studentId)
        );
        setCourses(myCourses);
      }

    } catch (e) {
      console.error('MyPackages load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openPackage = async (pkg) => {
    setSelectedPackage(pkg);
    // Bu paketle ilişkili kursları bul (level eşleşmesi)
    const related = courses.filter(c =>
      pkg.level === 'All Levels' ||
      !pkg.level ||
      (c.cefr_level && (c.cefr_level === pkg.level || pkg.level.includes(c.cefr_level)))
    );
    setPkgCourses(related);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'tr' ? 'Paketlerim' : 'My Packages'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {language === 'tr'
              ? 'Satın aldığınız paketler ve kurs detayları'
              : 'Your purchased packages and course details'}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {myPackages.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {language === 'tr' ? 'Henüz paket almadınız' : 'No packages yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'tr'
              ? 'Paketler sayfasından bir paket satın alabilirsiniz.'
              : 'You can purchase a package from the All Packages page.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '#/Packages'}>
            <BookOpen className="w-4 h-4 mr-2" />
            {language === 'tr' ? 'Paketlere Git' : 'Browse Packages'}
          </Button>
        </div>
      )}

      {/* Package cards — her Order ayrı kart olarak gösterilir */}
      <div className="space-y-4">
        {myPackages.map((item, idx) => {
          const pkg = item.packageData || item;
          const orderDate = item.order_date
            ? new Date(item.order_date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-GB')
            : null;
          const displayAmount = item.amount ?? pkg.price;

          return (
            <Card
              key={item.id || idx}
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/40 group"
              onClick={() => openPackage(pkg)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 transition-all">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base">{pkg.name || item.package_name || '—'}</h3>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 flex-shrink-0 text-xs">
                        ✅ {language === 'tr' ? 'Aktif' : 'Active'}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {pkg.level && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Award className="w-3.5 h-3.5" /> {pkg.level}
                        </span>
                      )}
                      {pkg.duration_hours && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" /> {pkg.duration_hours} {language === 'tr' ? 'saat' : 'hours'}
                        </span>
                      )}
                      {orderDate && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" /> {language === 'tr' ? 'Alım:' : 'Purchased:'} {orderDate}
                        </span>
                      )}
                      {displayAmount != null && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                          £{parseFloat(displayAmount).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Features */}
                    {(pkg.features || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pkg.features.slice(0, 3).map((f, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3 text-emerald-500" /> {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enrolled Courses (from this package) */}
      {courses.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {language === 'tr' ? '🎓 Kayıtlı Kurslarım' : '🎓 My Enrolled Courses'}
          </h2>
          <div className="space-y-2">
            {courses.map(course => (
              <div key={course.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{course.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {course.teacher_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> {course.teacher_name}
                      </span>
                    )}
                    {course.schedule && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {course.schedule}
                      </span>
                    )}
                    {course.room && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {course.room}
                      </span>
                    )}
                  </div>
                </div>
                {course.cefr_level && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">{course.cefr_level}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package Detail Dialog */}
      <Dialog open={!!selectedPackage} onOpenChange={() => { setSelectedPackage(null); setPkgCourses([]); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {selectedPackage?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-0">✅ {language === 'tr' ? 'Aktif' : 'Active'}</Badge>
                {selectedPackage.level && <Badge variant="outline">{selectedPackage.level}</Badge>}
                {selectedPackage.popular && <Badge className="bg-amber-100 text-amber-700 border-0">⭐ Popular</Badge>}
              </div>

              {/* Description */}
              {selectedPackage.description && (
                <p className="text-sm text-muted-foreground">{selectedPackage.description}</p>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {selectedPackage.duration_hours && (
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{language === 'tr' ? 'Süre' : 'Duration'}</p>
                    <p className="font-bold text-sm">{selectedPackage.duration_hours} {language === 'tr' ? 'saat' : 'hrs'}</p>
                  </div>
                )}
                {selectedPackage.price && (
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <Star className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{language === 'tr' ? 'Ücret' : 'Price'}</p>
                    <p className="font-bold text-sm">£{parseFloat(selectedPackage.price).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Features */}
              {(selectedPackage.features || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {language === 'tr' ? 'İçerik' : 'Includes'}
                  </p>
                  <ul className="space-y-1.5">
                    {selectedPackage.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Courses */}
              {pkgCourses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {language === 'tr' ? 'Bu Paketteki Kurslar' : 'Courses in This Package'}
                  </p>
                  <div className="space-y-2">
                    {pkgCourses.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-sm p-2.5 bg-muted/40 rounded-lg">
                        <Video className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="flex-1 font-medium">{c.name}</span>
                        {c.cefr_level && <span className="text-xs text-muted-foreground">{c.cefr_level}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={() => { setSelectedPackage(null); setPkgCourses([]); }}>
                {language === 'tr' ? 'Kapat' : 'Close'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
