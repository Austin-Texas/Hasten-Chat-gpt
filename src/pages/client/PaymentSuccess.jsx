import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const invoiceId = searchParams.get("invoiceId");

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/client/invoices");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="glass-card rounded-xl p-8 border border-green-500/20 bg-green-500/5 text-center space-y-4 max-w-md animate-slide-up">
        <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
        <h1 className="text-white font-heading font-bold text-2xl">Payment Received!</h1>
        <p className="text-slate-400">Your payment has been processed successfully.</p>
        <p className="text-slate-500 text-sm">Redirecting you back to invoices in a few seconds...</p>
        <button
          onClick={() => navigate("/client/invoices")}
          className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
        >
          Back to Invoices
        </button>
      </div>
    </div>
  );
}