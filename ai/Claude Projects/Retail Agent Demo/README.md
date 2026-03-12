# Retail Agent Demo

A GenZ-focused AI-powered grocery shopping demo built on **Nutanix Enterprise AI (NAI)**. Demonstrates real-time persona detection via webcam, conversational product search with tool-calling, semantic inventory search via embeddings, and a fully simulated checkout experience — all running in a single Docker container on Kubernetes.

---

## Architecture Overview

![Architecture Diagram](docs/architecture.svg)

> An interactive version of this diagram is also available at **`/architecture`** within the running app.

---

## AI Flow: How the Agent Works

```
User types: "I need something high in protein under $10"
                │
                ▼
POST /api/chat  (persona + cart injected into system prompt)
                │
                ▼
   ┌──────────────────────────────────┐
   │  LLM System Prompt              │
   │  · FreshBot assistant persona   │
   │  · Customer profile + vibe      │
   │  · Current cart contents        │
   └──────────────────────────────────┘
                │
                ▼
LLM decides → call tool: search_inventory
                │
      SSE event pushed to client:
      { type: 'tool_call', name: 'search_inventory', status: 'running' }
                │
                ▼
embeddings-cache.ts:
cosine_sim(embed(query), cached_product_embeddings)
→ returns top-6 ranked product IDs
                │
      SSE events pushed:
      { type: 'products', data: [ ...Product[] ] }
      { type: 'tool_call', name: 'search_inventory', status: 'done' }
                │
                ▼
LLM generates final response
                │
      SSE event pushed:
      { type: 'message', content: "Here are some great options..." }
```

---

## Persona Detection Flow

```
User clicks "Scan Me"
        │
        ▼
useWebcam.ts captures frame → base64 JPEG
        │
        ▼
POST /api/analyze-user { image: base64 }
        │
        ▼
NAI Vision Model → return persona JSON
        │
  ┌─────┴──────────────────────────┐
  │  Success          Failure      │
  ▼                  ▼             │
Persona JSON    DEFAULT_PERSONA    │
{ name, ageGroup, style,           │
  interests, preferredPayment,     │
  paymentDetails, shippingPref,    │
  personalizedDeals, pastOrders }  │
        │                          │
        └──────────────────────────┘
        ▼
PersonaContext → localStorage → /shop
```

---

## Data Flow: Cart & State

```
PersonaContext  (React Context + localStorage "futurestore_persona")
       │
       └── persona.pastOrders ─→ PastOrdersModal
                                   ├── "Reorder All"       → ADD all items to cart
                                   └── cherry-pick items   → ADD selected to cart

CartContext  (React Context + localStorage "futurestore_cart")
       │
       ├── /api/chat  add_to_cart tool   → dispatches SYNC action
       ├── ProductCard "Add to Cart"     → dispatches ADD action
       └── CartSidebar → /checkout
                          ├── Apple Pay panel   (black branded, Face ID)
                          ├── Venmo panel       (blue branded, @handle)
                          └── Card form         (pre-filled last 4 digits)
```

---

## Project Structure

```
retail-agent-demo/
├── app/
│   ├── layout.tsx                # Root layout: Plus Jakarta Sans, providers
│   ├── globals.css               # Tailwind base + shimmer/float animations
│   ├── page.tsx                  # /          — Welcome: personas + webcam
│   ├── shop/page.tsx             # /shop      — 3-col: chat | products | cart
│   ├── checkout/page.tsx         # /checkout  — payment + shipping + confirm
│   └── architecture/page.tsx    # /architecture — visual infra diagram
│
├── app/api/
│   ├── analyze-user/route.ts     # POST: base64 JPEG → vision → UserPersona
│   ├── chat/route.ts             # POST: SSE agentic loop (LLM + tool calls)
│   ├── search-products/route.ts  # POST: query → embeddings → Product[]
│   ├── scan-list/route.ts        # POST: grocery list image → Product[]
│   ├── products/[id]/route.ts    # GET:  single product lookup
│   └── cart/route.ts             # POST: server-side cart CRUD
│
├── components/
│   ├── camera/
│   │   ├── WebcamCapture.tsx     # getUserMedia wrapper, canvas snapshot
│   │   └── PersonaCard.tsx       # Name, deals, payment method display
│   ├── chat/
│   │   ├── ChatPanel.tsx         # Message list, input, quick prompts
│   │   └── MessageBubble.tsx     # Message bubble + tool-call status chips
│   ├── products/
│   │   ├── ProductGrid.tsx       # Animated grid (Framer Motion stagger)
│   │   ├── ProductCard.tsx       # Image, price, sale/BOGO badges, rating
│   │   └── AisleBadge.tsx        # Aisle location pill
│   ├── cart/
│   │   ├── CartSidebar.tsx       # Cart panel: items, subtotal, checkout CTA
│   │   └── CartItem.tsx          # Item row: qty ±, remove
│   ├── orders/
│   │   └── PastOrdersModal.tsx   # Order history: reorder all or cherry-pick
│   ├── scanner/
│   │   └── GroceryListScanner.tsx  # Camera → OCR → auto-search products
│   └── ui/
│       ├── GlassCard.tsx         # Reusable card container
│       ├── NeonButton.tsx        # Brand CTA button
│       └── LoadingSpinner.tsx    # Loading indicator
│
├── context/
│   ├── CartContext.tsx           # Cart state + localStorage persistence
│   └── PersonaContext.tsx        # Persona state + localStorage persistence
│
├── hooks/
│   ├── useStreamingChat.ts       # SSE consumer: tool_call / products / message
│   └── useWebcam.ts              # Camera access + base64 frame capture
│
├── lib/
│   ├── nai-client.ts             # OpenAI SDK → NAI endpoint, model constants
│   ├── agent-tools.ts            # LLM tool definitions (function-calling schema)
│   ├── embeddings-cache.ts       # Module-level vector cache + cosine similarity
│   └── types.ts                  # All TypeScript interfaces
│
├── data/
│   └── products.json             # 42 mock grocery products, 9 categories
│
├── docs/
│   └── architecture.svg          # Architecture diagram (embedded above)
│
├── public/
│   └── store-logo.svg
│
├── ai/
│   └── retail-agent.yaml         # K8s: Namespace + ConfigMap + Secret + Deployment + Service
│
├── Dockerfile                    # Multi-stage: deps → builder → runner (~150MB)
├── .dockerignore                 # Excludes node_modules, .env*, .next, secrets
├── next.config.js                # output: 'standalone'
└── tailwind.config.ts            # brand-* colors (#F33F3F), custom animations
```

---

## Agent Tools (Function Calling)

The LLM agent has access to 6 tools defined in `lib/agent-tools.ts`:

| Tool                    | Description                                          |
|-------------------------|------------------------------------------------------|
| `search_inventory`      | Natural language → embeddings → ranked product list  |
| `get_product_details`   | Full product info: price, nutrition, aisle, stock    |
| `add_to_cart`           | Add product by ID and quantity to session cart       |
| `get_promotions`        | List all active sales and BOGO deals                 |
| `get_cart`              | Retrieve current cart contents                       |
| `get_personalized_deals`| Return deals matched to this shopper's persona       |

---

## Demo Personas

Four pre-built personas on the welcome screen (skip webcam):

| Name             | Age Group         | Payment                    | Shipping   |
|------------------|-------------------|----------------------------|------------|
| Sarah Mitchell   | Millennial (26–40)| Visa ending in ****        | Express    |
| Jordan Rivera    | Young Adult (18–25)| Apple Pay                 | Overnight  |
| Marcus Chen      | Gen X (41–55)     | Venmo @marcuschen88        | Standard   |
| Dorothy Walsh    | Boomer (55+)      | Mastercard Debit ending ****| Standard  |

Each persona includes:
- 3 style/interest tags
- 2 personalized deals (e.g., "20% OFF Produce", "BOGO Meat & Seafood")
- 2–3 past orders with real product IDs and prices

---

## Checkout Payment Simulation

| Payment Type        | UI                                                          |
|---------------------|-------------------------------------------------------------|
| **Apple Pay**       | Black panel, Face ID indicator, "Double-click to Pay"       |
| **Venmo**           | Blue panel, @handle display, Venmo branded button           |
| **Credit/Debit Card**| Animated card preview, pre-filled last 4, expiry/CVV form |

Shipping is pre-selected based on persona preference. Costs: Standard free · Express $9.99 · Overnight $24.99.

---

## Product Inventory

42 products across 9 categories, all with full nutritional data:

| Category           | Count |
|--------------------|-------|
| Produce            | 5     |
| Dairy & Eggs       | 4     |
| Meat & Seafood     | 4     |
| Bakery & Bread     | 3     |
| Frozen Foods       | 3     |
| Pantry & Dry Goods | 4     |
| Beverages          | 3     |
| Snacks             | 2     |
| Deli               | 2     |

Each product includes: `id`, `name`, `category`, `price`, `salePrice`, `bogoOffer`, `inStock`, `aisle`, `description`, `imageUrl`, `tags`, `rating`, `reviewCount`, and full `nutrition` (calories, fat, protein, carbs, sodium, sugar, fiber + optional vitamins/minerals).

---

## Environment Variables

| Variable                       | Source    | Description                                       |
|--------------------------------|-----------|---------------------------------------------------|
| `NAI_BASE_URL`                 | ConfigMap | NAI endpoint, e.g. `https://<host>/enterpriseai/v1` |
| `NAI_API_KEY`                  | Secret    | Bearer token — injected at runtime only           |
| `NAI_LLM_MODEL`                | ConfigMap | LLM model name                                    |
| `NAI_VISION_MODEL`             | ConfigMap | Vision model name                                 |
| `NAI_EMBEDDINGS_MODEL`         | ConfigMap | Embeddings model name                             |
| `NODE_TLS_REJECT_UNAUTHORIZED` | ConfigMap | Set to `0` for self-signed cluster certs          |

> Verify available model names before deploy:
> ```bash
> curl -H "Authorization: Bearer $NAI_API_KEY" $NAI_BASE_URL/models
> ```

---

## Local Development

```bash
npm install

NAI_BASE_URL=https://<nai-host>/enterpriseai/v1 \
NAI_API_KEY=<your-key> \
NAI_LLM_MODEL=<llm-model-name> \
NAI_VISION_MODEL=<vision-model-name> \
NAI_EMBEDDINGS_MODEL=<embeddings-model-name> \
NODE_TLS_REJECT_UNAUTHORIZED=0 \
npm run dev
```

Or use a `.env.local` file (never committed — excluded by `.dockerignore`):

```env
NAI_BASE_URL=https://<nai-host>/enterpriseai/v1
NAI_API_KEY=your-key-here
NAI_LLM_MODEL=your-llm-model
NAI_VISION_MODEL=your-vision-model
NAI_EMBEDDINGS_MODEL=your-embeddings-model
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## Docker Build & Run

```bash
# Build
docker build -t <registry>/retail-agent-demo:v4 .

# Run locally
docker run -p 3000:3000 \
  -e NAI_BASE_URL=https://<nai-host>/enterpriseai/v1 \
  -e NAI_API_KEY=<your-key> \
  -e NAI_LLM_MODEL=<llm-model-name> \
  -e NAI_VISION_MODEL=<vision-model-name> \
  -e NAI_EMBEDDINGS_MODEL=<embeddings-model-name> \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  <registry>/retail-agent-demo:v4

# Push
docker push <registry>/retail-agent-demo:v4
```

---

## Kubernetes Deployment

```bash
# Deploy
kubectl apply -f ai/retail-agent.yaml

# Verify rollout
kubectl rollout status deployment/retail-agent -n retail-agent

# Check pods
kubectl get pods -n retail-agent

# Get LoadBalancer IP
kubectl get svc -n retail-agent
```

The manifest creates:

```
Namespace: retail-agent
  ├── ConfigMap  retail-agent-config   (NAI URLs + model names)
  ├── Secret     retail-agent-secret   (NAI_API_KEY — runtime only)
  ├── Deployment retail-agent          (1 replica · image :v4)
  └── Service    retail-agent          (LoadBalancer · 80 → 3000)
```

Resource limits: 250m–1000m CPU · 256Mi–512Mi memory

---

## Tech Stack

| Layer            | Technology                                                |
|------------------|-----------------------------------------------------------|
| Framework        | Next.js 14 (App Router, TypeScript)                       |
| Styling          | Tailwind CSS 3 + Framer Motion                            |
| Icons            | Lucide React                                              |
| AI Client        | OpenAI SDK v4 → NAI endpoint (OpenAI-compatible)          |
| State            | React Context + useReducer + localStorage                 |
| Semantic Search  | In-process cosine similarity (no external vector DB)      |
| Container        | Docker multi-stage, `output: 'standalone'` (~150MB)       |
| Orchestration    | Kubernetes (K3s), MetalLB LoadBalancer                    |
| Runtime          | Node.js 20 Alpine                                         |

---

## Key Design Decisions

**No external vector database** — Product embeddings are computed once at module init and cached in memory. Single container, zero external dependencies.

**Streaming agent loop** — `/api/chat` uses Server-Sent Events to stream tool-call status and final responses in real time. The client renders "Searching inventory..." chips before results arrive.

**Persona fallback** — If vision analysis fails or returns non-JSON, the app silently falls back to `DEFAULT_PERSONA`. The shopping flow is never blocked by AI errors.

**Secrets from K8s only** — `NAI_API_KEY` is injected at runtime via K8s Secret. The Dockerfile and `.dockerignore` ensure no `.env` files are ever baked into image layers.

**Single-replica session state** — Cart state is stored in a module-level Map on the server (keyed by session ID) and mirrored in localStorage on the client. Sufficient for a demo; production would use Redis.
