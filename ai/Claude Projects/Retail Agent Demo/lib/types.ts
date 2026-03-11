export interface Product {
  id: string
  name: string
  category: string
  price: number
  salePrice: number | null
  bogoOffer: string | null
  inStock: boolean
  aisle: string
  description: string
  imageUrl: string
  tags: string[]
  rating: number
  reviewCount: number
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface UserPersona {
  ageGroup: string
  style: string[]
  interests: string[]
  preferredPayment: 'card' | 'apple-pay' | 'google-pay' | 'buy-now-pay-later'
  shippingPreference: 'standard' | 'express' | 'overnight'
  personalizedDeals: PersonalizedDeal[]
  vibe: string
}

export interface PersonalizedDeal {
  title: string
  description: string
  discount: string
  category: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallEvent[]
  timestamp: Date
}

export interface ToolCallEvent {
  name: string
  status: 'running' | 'done'
  summary?: string
}

export type ShippingOption = {
  id: 'standard' | 'express' | 'overnight'
  label: string
  price: number
  eta: string
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'standard', label: 'Standard Shipping', price: 0, eta: '5–7 business days' },
  { id: 'express', label: 'Express Shipping', price: 9.99, eta: '2–3 business days' },
  { id: 'overnight', label: 'Overnight Delivery', price: 24.99, eta: 'Next business day' },
]
