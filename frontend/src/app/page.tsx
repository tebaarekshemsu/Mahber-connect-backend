import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-bold text-gold drop-shadow-lg mb-6">
          MahberConnect
        </h1>
        <p className="text-xl md:text-2xl text-text-secondary mb-12">
          The modern platform for Ethiopian community financial management. Manage your Mahber, Equb, and Iddir with ease.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="px-8 py-4 bg-gold text-background-dark font-semibold rounded-input hover:bg-gold-light transition-colors text-lg">
            Login
          </Link>
          <Link href="/register" className="px-8 py-4 bg-surface hover:bg-surface-hover border border-border-glass text-text-primary font-semibold rounded-input transition-colors text-lg">
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
