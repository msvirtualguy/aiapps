export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RMATicket {
  rma_number: string;
  created_at: string;
  customer_id: string;
  order_id: string;
  product_sku: string;
  defect_description: string;
  decision: "Approved" | "Denied" | "Escalated";
  instructions: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  rmaTicket?: RMATicket;
  streaming?: boolean;
}

export interface PipelineStatus {
  curation: {
    complete: boolean;
    report: {
      generated_at: string;
      files_processed: string[];
      total_entities_found: number;
      total_entities_masked: number;
      masking_rate: number;
      entity_breakdown: Record<string, number>;
    } | null;
  };
  ingestion: {
    complete: boolean;
    collections: Record<string, number>;
  };
  nims: Record<string, "ready" | "not_ready" | "unreachable" | "unknown">;
}
