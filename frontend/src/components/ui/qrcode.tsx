import * as React from "react"
import { cn } from "@/lib/utils"

interface QRCodeProps {
  dataUrl: string;
  size?: number;
  className?: string;
}

const QRCode = ({ dataUrl, size = 200, className }: QRCodeProps) => {
  return (
    <div 
      className={cn("bg-white p-4 rounded-xl inline-block shadow-lg", className)}
      style={{ width: size + 32, height: size + 32 }}
    >
      <img 
        src={dataUrl} 
        alt="QR Code" 
        width={size} 
        height={size} 
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export { QRCode }
