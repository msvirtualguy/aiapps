"""
Agent tools for the RMA customer service workflow.
Each tool is a plain function that the Qwen3 agent calls via function calling.
"""

import json
import random
import string
from datetime import datetime, timezone

import rag


def lookup_customer(customer_id: str) -> str:
    """
    Retrieve a customer record by their customer ID.
    Returns customer details including account info and recent orders.
    """
    result = rag.retrieve_customer(customer_id.strip())
    if result:
        return f"Customer record for {customer_id}:\n{result}"
    # Fallback to semantic search if exact match fails
    results = rag.retrieve("customer_records", f"customer ID {customer_id}", top_k=3)
    if results:
        return f"Customer record found:\n" + "\n---\n".join(results)
    return f"No customer record found for ID: {customer_id}"


def check_return_policy(product_category: str, days_since_purchase: int) -> str:
    """
    Check the return/RMA policy for a given product category and purchase age.
    Returns policy details including eligibility window and conditions.
    """
    query = f"return policy for {product_category} purchased {days_since_purchase} days ago"
    results = rag.retrieve("return_policy", query, top_k=4)
    if results:
        return "Return policy excerpt:\n" + "\n---\n".join(results)
    return f"Return policy not found for category: {product_category}"


def check_rma_exceptions(product_sku: str, defect_type: str) -> str:
    """
    Check RMA exception rules for a specific product SKU and defect type.
    Some defects qualify for advance replacement or extended coverage.
    """
    query = f"RMA exception for SKU {product_sku} with defect: {defect_type}"
    results = rag.retrieve("rma_exceptions", query, top_k=4)
    if results:
        return "RMA exception rules:\n" + "\n---\n".join(results)
    return f"No specific RMA exceptions found for SKU {product_sku} / defect: {defect_type}"


def create_rma_ticket(
    customer_id: str,
    order_id: str,
    product_sku: str,
    defect_description: str,
    decision: str,
) -> str:
    """
    Create an RMA ticket and return the ticket number and next steps.
    Decision must be one of: 'approved', 'denied', 'escalated'.
    """
    rma_number = "RMA-" + datetime.now(timezone.utc).strftime("%Y%m") + "-" + \
                 "".join(random.choices(string.digits, k=5))
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    decision_lower = decision.lower().strip()

    if decision_lower == "approved":
        instructions = (
            "A prepaid return shipping label will be emailed to the address on file. "
            "Please package the defective unit securely and drop it off at any carrier location. "
            "Replacement unit will ship within 2 business days of receiving the defective item."
        )
    elif decision_lower == "escalated":
        instructions = (
            "Your case has been escalated to our senior RMA team for manual review. "
            "A specialist will contact you within 1 business day with next steps."
        )
    else:
        instructions = (
            "Unfortunately this return does not qualify under our current policy. "
            "If you believe this decision is in error, please contact us directly at support@asi-servers.example "
            "and reference this RMA number for case review."
        )

    ticket = {
        "rma_number": rma_number,
        "created_at": created_at,
        "customer_id": customer_id,
        "order_id": order_id,
        "product_sku": product_sku,
        "defect_description": defect_description,
        "decision": decision_lower.capitalize(),
        "instructions": instructions,
    }
    return json.dumps(ticket, indent=2)


# ---------------------------------------------------------------------------
# Tool schemas for Qwen3 function calling
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_customer",
            "description": "Retrieve a customer record by customer ID. Call this first to verify identity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "Customer ID (e.g. CST-00142)"},
                },
                "required": ["customer_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_return_policy",
            "description": "Check the return/RMA policy for a product category and days since purchase.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_category": {"type": "string", "description": "Product category (e.g. 'Network Interface Cards', 'Storage Controllers')"},
                    "days_since_purchase": {"type": "integer", "description": "Number of days since the item was purchased"},
                },
                "required": ["product_category", "days_since_purchase"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_rma_exceptions",
            "description": "Check if a specific SKU / defect type qualifies for RMA exception handling (advance replacement, extended coverage, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku": {"type": "string", "description": "Product SKU number"},
                    "defect_type": {"type": "string", "description": "Brief description of the defect"},
                },
                "required": ["product_sku", "defect_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_rma_ticket",
            "description": "Create an RMA ticket after gathering all required information. Returns ticket number and instructions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "order_id": {"type": "string"},
                    "product_sku": {"type": "string"},
                    "defect_description": {"type": "string"},
                    "decision": {"type": "string", "enum": ["approved", "denied", "escalated"]},
                },
                "required": ["customer_id", "order_id", "product_sku", "defect_description", "decision"],
            },
        },
    },
]

TOOL_DISPATCH = {
    "lookup_customer": lookup_customer,
    "check_return_policy": check_return_policy,
    "check_rma_exceptions": check_rma_exceptions,
    "create_rma_ticket": create_rma_ticket,
}
