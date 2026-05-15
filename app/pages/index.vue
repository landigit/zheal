<template>
  <div class="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30">
    <!-- Premium Gradient Background -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse"></div>
      <div class="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style="animation-delay: 2s"></div>
    </div>

    <header class="relative z-10 border-b border-white/5 backdrop-blur-md sticky top-0">
      <nav class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span class="text-2xl font-bold">Z</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">
            Zheal
          </h1>
        </div>
        <div class="flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#" class="hover:text-emerald-400 transition-colors">Dashboard</a>
          <a href="#" class="hover:text-emerald-400 transition-colors">Bio-Analysis</a>
          <a href="#" class="hover:text-emerald-400 transition-colors">Remedies</a>
          <button class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-full transition-all active:scale-95 font-bold">
            Connect Device
          </button>
        </div>
      </nav>
    </header>

    <main class="relative z-10 max-w-7xl mx-auto px-6 py-16">
      <div class="grid lg:grid-cols-2 gap-16 items-center">
        <!-- Left: Introduction -->
        <div class="space-y-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Next-Gen Bio-Intelligence
          </div>
          <h2 class="text-5xl lg:text-7xl font-bold leading-[1.1]">
            Your Health, <br/>
            <span class="text-slate-500">Encoded & Reborn.</span>
          </h2>
          <p class="text-lg text-slate-400 max-w-xl leading-relaxed">
            Project Zheal combines Ayurvedic wisdom with post-quantum security and predictive AI to map your biological destiny. Track, analyze, and heal in a continuous circular loop.
          </p>
          <div class="flex flex-wrap gap-4 pt-4">
            <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex-1 min-w-[200px] hover:border-emerald-500/30 transition-colors group">
              <div class="text-emerald-400 font-bold mb-1">98%</div>
              <div class="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">Prediction Accuracy</div>
            </div>
            <div class="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex-1 min-w-[200px] hover:border-blue-500/30 transition-colors group">
              <div class="text-blue-400 font-bold mb-1">PQC</div>
              <div class="text-sm text-slate-500 group-hover:text-slate-300 transition-colors">Quantum Security</div>
            </div>
          </div>
        </div>

        <!-- Right: Circular Flow Visualization -->
        <div class="relative flex items-center justify-center">
          <!-- Central Core -->
          <div class="w-48 h-48 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse relative">
            <div class="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
            <div class="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center">
              <span class="text-4xl">🧬</span>
            </div>
          </div>

          <!-- Circular Orbitals -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-[350px] h-[350px] border border-white/10 rounded-full animate-[spin_20s_linear_infinite]">
              <div class="absolute -top-6 left-1/2 -translate-x-1/2 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <span class="text-xl">📊</span>
              </div>
              <div class="absolute top-1/2 -right-6 -translate-y-1/2 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <span class="text-xl">🧠</span>
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <span class="text-xl">🌿</span>
              </div>
              <div class="absolute top-1/2 -left-6 -translate-y-1/2 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <span class="text-xl">✨</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature Grid -->
      <section class="mt-32 grid md:grid-cols-3 gap-8">
        <div class="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-emerald-500/20 transition-all group">
          <div class="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <span class="text-2xl">🔥</span>
          </div>
          <h3 class="text-xl font-bold mb-3 text-white">Metabolism Tracking</h3>
          <p class="text-slate-400 leading-relaxed">Continuous bio-monitoring to optimize your energy levels and nutrient absorption.</p>
        </div>
        <div class="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-blue-500/20 transition-all group">
          <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
            <span class="text-2xl">☢️</span>
          </div>
          <h3 class="text-xl font-bold mb-3 text-white">Microplastic Analysis</h3>
          <p class="text-slate-400 leading-relaxed">Advanced fluid analysis to detect and guide the elimination of environmental toxins.</p>
        </div>
        <div class="p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-purple-500/20 transition-all group">
          <div class="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
            <span class="text-2xl">📜</span>
          </div>
          <h3 class="text-xl font-bold mb-3 text-white">Traditional Wisdom</h3>
          <p class="text-slate-400 leading-relaxed">Harnessing Ayurvedic and Hadith principles for holistic, natural healing paths.</p>
        </div>
      </section>
    </main>

    <footer class="relative z-10 border-t border-white/5 py-12 mt-32 text-center">
      <p class="text-slate-500 text-sm">© 2026 Project Zheal • Built with Nuxt & Bio-Intelligence</p>
    </footer>
  </div>
</template>

<style>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
