export interface Nutrition {
  servingSize: string
  calories: number
  fat: number
  saturatedFat: number
  cholesterol: number
  sodium: number
  carbohydrates: number
  sugar: number
  fiber: number
  protein: number
  // Optional vitamins / minerals / extras
  vitaminA?: string
  vitaminC?: string
  vitaminD?: string
  vitaminE?: string
  vitaminK?: string
  calcium?: string
  iron?: string
  potassium?: string
  zinc?: string
  omega3?: string
  antioxidants?: string
  caffeine?: string
  probiotics?: string
  minerals?: string
  folate?: string
  niacin?: string
  phosphorus?: string
  selenium?: string
  iodine?: string
  thiamin?: string
  magnesium?: string
  ironDV?: string
}

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
  nutrition?: Nutrition
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface PaymentDetails {
  type: 'apple-pay' | 'venmo' | 'credit-card' | 'debit-card'
  label: string       // e.g. "Visa ending in 4521"
  last4?: string      // last 4 digits for card types
  network?: string    // "Visa", "Mastercard"
  handle?: string     // for Venmo: "@handle"
}

export interface PastOrderItem {
  productId: string
  productName: string
  quantity: number
  priceAtOrder: number
}

export interface PastOrder {
  id: string
  date: string        // ISO date string
  items: PastOrderItem[]
  total: number
  shipping: 'standard' | 'express' | 'overnight'
}

export interface UserPersona {
  name: string
  ageGroup: string
  style: string[]
  interests: string[]
  preferredPayment: 'credit-card' | 'debit-card' | 'apple-pay' | 'venmo'
  paymentDetails: PaymentDetails
  shippingPreference: 'standard' | 'express' | 'overnight'
  personalizedDeals: PersonalizedDeal[]
  vibe: string
  pastOrders: PastOrder[]
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
