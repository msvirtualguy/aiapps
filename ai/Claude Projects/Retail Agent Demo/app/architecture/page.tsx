import Link from 'next/link'
import Image from 'next/image'

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-[#1a3a5c] text-white px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1">
          ← Portal
        </Link>
        <div className="border border-white/40 rounded px-3 py-1">
          <span className="font-bold text-base">Retail Agent Demo</span>
        </div>
        <span className="text-base font-medium">Architecture Overview</span>
      </header>

      <div className="p-8 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-[#1a3a5c] mb-6">Architecture Overview</h2>

        {/* Outer container: Nutanix AHV Hypervisor */}
        <div className="border-2 border-dashed border-slate-400 rounded-2xl p-6 bg-slate-50 relative">
          <span className="absolute -top-3 left-5 bg-slate-50 px-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Nutanix AHV Hypervisor
          </span>

          {/* K3s Kubernetes Cluster */}
          <div className="border-2 border-[#1a6bb5] rounded-xl p-5 bg-blue-50 mb-5 relative">
            <span className="absolute -top-3 left-5 bg-blue-50 px-2 text-xs font-bold text-[#1a6bb5] uppercase tracking-widest">
              K3s Kubernetes Cluster — retail-agent namespace
            </span>

            {/* Top row: App + Service */}
            <div className="grid grid-cols-3 gap-4 mb-4">

              {/* Next.js App */}
              <div className="col-span-2 border-2 border-[#1a6bb5] rounded-lg bg-white p-4">
                <div className="text-center mb-3">
                  <p className="font-bold text-[#1a6bb5] text-sm">Next.js 14 App</p>
                  <p className="text-xs text-slate-500">App Router · TypeScript · Port 3000</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-blue-200 rounded p-2 bg-blue-50 text-center">
                    <p className="text-xs font-semibold text-blue-700">/ Welcome</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Webcam + Demo Personas</p>
                  </div>
                  <div className="border border-blue-200 rounded p-2 bg-blue-50 text-center">
                    <p className="text-xs font-semibold text-blue-700">/shop</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Chat · Products · Cart</p>
                  </div>
                  <div className="border border-blue-200 rounded p-2 bg-blue-50 text-center">
                    <p className="text-xs font-semibold text-blue-700">/checkout</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Payment · Shipping</p>
                  </div>
                </div>
                {/* API Routes sub-row */}
                <div className="mt-2 border border-blue-200 rounded p-2 bg-blue-50">
                  <p className="text-[10px] font-bold text-blue-700 mb-1">API Routes (Server-Side)</p>
                  <div className="flex flex-wrap gap-1">
                    {['/api/analyze-user', '/api/chat', '/api/search-products', '/api/scan-list', '/api/cart', '/api/products/[id]'].map(r => (
                      <span key={r} className="text-[10px] bg-white border border-blue-200 rounded px-1.5 py-0.5 text-slate-600 font-mono">{r}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column: Service + Browser */}
              <div className="flex flex-col gap-3">
                <div className="border-2 border-amber-400 rounded-lg bg-white p-3 text-center">
                  <p className="font-bold text-amber-600 text-sm">MetalLB Service</p>
                  <p className="text-xs text-slate-500">LoadBalancer</p>
                  <p className="text-xs text-slate-500 mt-1">Port 80 → 3000</p>
                </div>
                <div className="border border-slate-300 rounded-lg bg-white p-3 text-center">
                  <p className="font-bold text-slate-600 text-sm">In-Memory State</p>
                  <p className="text-[10px] text-slate-400 mt-1">Cart: module Map&lt;sessionId&gt;</p>
                  <p className="text-[10px] text-slate-400">Embeddings: vector cache</p>
                  <p className="text-[10px] text-slate-400">Persona: localStorage</p>
                </div>
              </div>
            </div>

            {/* RAG / Agentic Pipeline callout */}
            <div className="border border-amber-300 rounded-lg bg-amber-50 px-4 py-2 text-center">
              <p className="text-xs font-bold text-amber-700">Agentic Loop (SSE Stream):</p>
              <p className="text-xs text-amber-600 mt-0.5">
                User Query → LLM (tool decision) → Tool Execution (search / cart / deals) → LLM (response) → Client
              </p>
              <p className="text-xs font-bold text-amber-700 mt-1">Semantic Search Pipeline:</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Query → Embed (NAI Embeddings) → Cosine Similarity (in-process) → Ranked Products
              </p>
            </div>
          </div>

          {/* Bottom row: NAI + Storage */}
          <div className="grid grid-cols-2 gap-5">

            {/* NAI */}
            <div className="border-2 border-[#cc3300] rounded-xl bg-red-50 p-4 relative">
              <span className="absolute -top-3 left-5 bg-red-50 px-2 text-xs font-bold text-[#cc3300] uppercase tracking-widest">
                NAI — Nutanix AI Inference Service
              </span>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="border border-red-200 rounded-lg bg-white p-3">
                  <p className="font-bold text-[#cc3300] text-xs">LLM + Vision</p>
                  <p className="text-[10px] text-slate-500 mt-1">Model: qwen25-vl7b-in-nvfp4</p>
                  <p className="text-[10px] text-slate-500">Chat completions · Tool calling</p>
                  <p className="text-[10px] text-slate-500">Webcam persona detection</p>
                  <p className="text-[10px] text-slate-500">Grocery list OCR</p>
                </div>
                <div className="border border-red-200 rounded-lg bg-white p-3">
                  <p className="font-bold text-[#cc3300] text-xs">Embeddings</p>
                  <p className="text-[10px] text-slate-500 mt-1">Model: ll-nemo-embed-1b-v2</p>
                  <p className="text-[10px] text-slate-500">Product vectorization</p>
                  <p className="text-[10px] text-slate-500">Semantic similarity search</p>
                  <p className="text-[10px] text-slate-500">Zero-shot intent matching</p>
                </div>
              </div>
              <div className="border border-red-300 rounded bg-white/60 px-3 py-1.5 text-center">
                <p className="text-[10px] font-mono text-slate-500">https://192.168.110.51/enterpriseai/v1</p>
              </div>
            </div>

            {/* Nutanix Unified Storage */}
            <div className="border-2 border-[#2e7d32] rounded-xl bg-green-50 p-4 relative">
              <span className="absolute -top-3 left-5 bg-green-50 px-2 text-xs font-bold text-[#2e7d32] uppercase tracking-widest">
                Nutanix Unified Storage
              </span>
              <div className="grid grid-cols-1 gap-3">
                <div className="border border-green-200 rounded-lg bg-white p-3">
                  <p className="font-bold text-[#2e7d32] text-xs">LLM Model Repository</p>
                  <p className="text-[10px] text-slate-500 mt-1">qwen25-vl7b-in-nvfp4 weights &amp; configs</p>
                  <p className="text-[10px] text-slate-500">ll-nemo-embed-1b-v2 weights</p>
                </div>
                <div className="border border-green-200 rounded-lg bg-white p-3">
                  <p className="font-bold text-[#2e7d32] text-xs">Nutanix Volumes</p>
                  <p className="text-[10px] text-slate-500 mt-1">Persistent block storage for model artifacts</p>
                  <p className="text-[10px] text-slate-500">Served directly to NAI inference pods</p>
                </div>
              </div>
            </div>
          </div>

          {/* Arrows / Labels */}
          <div className="mt-4 flex items-start gap-6 text-[10px] text-slate-500 justify-center">
            <div className="flex items-center gap-1">
              <span className="text-blue-500 font-bold">→</span>
              <span>HTTPS API (OpenAI-compatible)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-amber-500 font-bold">→</span>
              <span>SSE Stream (tool calls + messages)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-600 font-bold">→</span>
              <span>Model weights served to NAI</span>
            </div>
          </div>
        </div>

        {/* User/Browser box — outside hypervisor */}
        <div className="mt-4 flex justify-end">
          <div className="border-2 border-slate-400 rounded-xl bg-white p-4 w-72 text-center shadow-sm">
            <p className="font-bold text-slate-700 text-sm">User / Browser</p>
            <p className="text-xs text-slate-500 mt-1">
              HTTPS → MetalLB LoadBalancer IP
            </p>
            <div className="mt-2 flex flex-wrap gap-1 justify-center text-[10px] text-slate-500">
              <span className="bg-slate-100 rounded px-1.5 py-0.5">Webcam (getUserMedia)</span>
              <span className="bg-slate-100 rounded px-1.5 py-0.5">localStorage (persona + cart)</span>
              <span className="bg-slate-100 rounded px-1.5 py-0.5">SSE (streaming chat)</span>
            </div>
          </div>
        </div>

        {/* Component Map */}
        <div className="mt-10">
          <h3 className="text-base font-bold text-[#1a3a5c] mb-4">Component Map</h3>
          <div className="grid grid-cols-3 gap-4">

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
              <p className="text-xs font-bold text-[#1a6bb5] uppercase tracking-wide mb-2">Pages</p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li><span className="font-mono text-[10px] bg-slate-100 rounded px-1">/</span> — Persona select + webcam scan</li>
                <li><span className="font-mono text-[10px] bg-slate-100 rounded px-1">/shop</span> — Chat · Products · Cart</li>
                <li><span className="font-mono text-[10px] bg-slate-100 rounded px-1">/checkout</span> — Payment simulation</li>
                <li><span className="font-mono text-[10px] bg-slate-100 rounded px-1">/architecture</span> — This page</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
              <p className="text-xs font-bold text-[#cc3300] uppercase tracking-wide mb-2">AI Features</p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>🎥 Webcam → Vision → Persona JSON</li>
                <li>💬 Chat → LLM → Tool calls → SSE</li>
                <li>🔍 Query → Embed → Cosine sim</li>
                <li>📷 List photo → Vision → Products</li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
              <p className="text-xs font-bold text-[#2e7d32] uppercase tracking-wide mb-2">State &amp; Data</p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>CartContext — localStorage sync</li>
                <li>PersonaContext — localStorage sync</li>
                <li>42 products · 9 categories</li>
                <li>4 demo personas with past orders</li>
              </ul>
            </div>

          </div>
        </div>

        {/* Agent Tools */}
        <div className="mt-8">
          <h3 className="text-base font-bold text-[#1a3a5c] mb-4">Agent Tools (Function Calling)</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'search_inventory', desc: 'Natural language → embeddings → ranked products', color: 'blue' },
              { name: 'get_product_details', desc: 'Full product info: price, nutrition, aisle, stock', color: 'blue' },
              { name: 'add_to_cart', desc: 'Add product by ID and quantity to session cart', color: 'blue' },
              { name: 'get_promotions', desc: 'List all active sales and BOGO deals', color: 'amber' },
              { name: 'get_cart', desc: 'Retrieve current cart contents and totals', color: 'amber' },
              { name: 'get_personalized_deals', desc: 'Deals matched to this shopper\'s persona', color: 'amber' },
            ].map(t => (
              <div key={t.name} className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
                <p className={`text-[11px] font-mono font-bold mb-1 ${t.color === 'blue' ? 'text-[#1a6bb5]' : 'text-amber-600'}`}>{t.name}</p>
                <p className="text-[11px] text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Deploy info */}
        <div className="mt-8 border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
          <h3 className="text-base font-bold text-[#1a3a5c] mb-3">Deployment</h3>
          <div className="grid grid-cols-3 gap-4 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Container</p>
              <p>Image: <span className="font-mono text-[10px]">msvirtualguy/retail-agent-demo:v4</span></p>
              <p className="mt-1">Multi-stage Docker build</p>
              <p>Node 20 Alpine · ~150MB</p>
              <p>output: standalone</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Kubernetes</p>
              <p>Namespace: <span className="font-mono text-[10px]">retail-agent</span></p>
              <p className="mt-1">1 replica · MetalLB LB</p>
              <p>250m–1000m CPU</p>
              <p>256Mi–512Mi memory</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Config</p>
              <p>ConfigMap: NAI URLs + models</p>
              <p className="mt-1">Secret: NAI_API_KEY</p>
              <p>TLS: self-signed (NODE_TLS=0)</p>
              <p>Health: GET / (readiness + liveness)</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          Retail Agent Demo · Powered by Nutanix Enterprise AI · K3s · Next.js 14
        </p>
      </div>
    </div>
  )
}
