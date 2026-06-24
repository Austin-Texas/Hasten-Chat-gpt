import { useRef, useEffect, useState } from "react";
import { RotateCcw, Download } from "lucide-react";

export default function SignatureCanvas({ onSign, disabled = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#EA580C";
    
    // Clear canvas
    ctx.fillStyle = "#0F1829";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const startDrawing = (e) => {
    if (disabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0F1829";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  const submitSignature = () => {
    if (!hasSignature || disabled) return;
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL("image/png");
    onSign(imageData);
  };

  return (
    <div className="space-y-3">
      <div className="text-white font-semibold text-sm">Sign Here</div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-full bg-surface-2 border border-white/10 rounded-lg cursor-crosshair"
        style={{ height: "200px", touchAction: "none" }}
      />
      <div className="flex gap-2">
        <button
          onClick={clearSignature}
          disabled={disabled || !hasSignature}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Clear
        </button>
        <button
          onClick={submitSignature}
          disabled={disabled || !hasSignature}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Submit Signature
        </button>
      </div>
    </div>
  );
}