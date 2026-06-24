import { useRef, useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

export default function SignatureCanvas({ onSave, onCancel, documentType = 'agreement' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#0f1829';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) {
      alert('Please sign before submitting.');
      return;
    }
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-white font-semibold">Sign Document</h3>
            <p className="text-slate-500 text-xs mt-1">
              {documentType === 'w9' ? 'IRS Form W-9' : 'Contractor Agreement'}
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas */}
        <div className="p-4">
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Sign below
          </label>
          <canvas
            ref={canvasRef}
            width={380}
            height={200}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full border border-white/20 rounded-lg cursor-crosshair bg-slate-800"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-white/10">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 text-slate-400 text-sm hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            className="flex-1 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Signature
          </button>
        </div>
      </div>
    </div>
  );
}