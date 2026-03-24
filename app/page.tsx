import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50/50">
      <div className="text-center space-y-8 max-w-md w-full px-8 py-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900">AZMUTH</h1>
          <p className="text-gray-500 text-lg font-medium">Cognitive Intelligence Platform</p>
        </div>
        
        <div className="pt-6">
          <Link 
            href="/auth/login" 
            className="inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-sm font-medium text-white shadow transition-all hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
          >
            Enter Platform
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
