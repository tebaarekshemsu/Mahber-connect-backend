import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-bold text-gold drop-shadow-md">
            MahberConnect
          </Link>
          <p className="text-text-secondary mt-2">Community Financial Management</p>
        </div>
        
        <div className="glass rounded-card p-6 md:p-8 relative overflow-hidden">
          {/* Decorative glow behind the card content */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gold/50 blur-xl"></div>
          {children}
        </div>
      </div>
    </div>
  );
}
