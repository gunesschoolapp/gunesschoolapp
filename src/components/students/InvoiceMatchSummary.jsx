import { CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InvoiceMatchSummary({ coursePrice, invoices, onNavigate }) {
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => {
    if (inv.status === 'paid') return sum + (inv.amount || 0);
    if (inv.payment_status === 'paid') return sum + (inv.amount || 0);
    if (inv.payment_status === 'partially_paid') return sum + (inv.amount_paid || 0);
    return sum;
  }, 0);

  const isMatched = Math.abs(totalInvoiced - coursePrice) < 0.01;
  const diff = coursePrice - totalInvoiced;

  return (
    <div className={`rounded-xl border p-4 ${isMatched ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMatched ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isMatched
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              : <AlertCircle className="w-5 h-5 text-amber-600" />
            }
          </div>
          <div>
            <p className={`font-semibold text-sm ${isMatched ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isMatched ? 'Fatura eşleşiyor' : 'Fatura eksik veya farklı'}
            </p>
            <div className="mt-1.5 space-y-0.5">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Kurs ücreti:</span>
                <span className="font-semibold">£{Number(coursePrice).toLocaleString('en-GB')}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Toplam fatura:</span>
                <span className="font-semibold">£{totalInvoiced.toLocaleString('en-GB')}</span>
              </div>
              {totalPaid > 0 && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">Ödenen:</span>
                  <span className="font-semibold text-emerald-700">£{totalPaid.toLocaleString('en-GB')}</span>
                </div>
              )}
              {!isMatched && diff !== 0 && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{diff > 0 ? 'Eksik fatura:' : 'Fazla fatura:'}</span>
                  <span className={`font-bold ${diff > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                    £{Math.abs(diff).toLocaleString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="flex-shrink-0 gap-1 text-xs" onClick={onNavigate}>
          <Link2 className="w-3.5 h-3.5" /> Faturalara Git
        </Button>
      </div>
    </div>
  );
}