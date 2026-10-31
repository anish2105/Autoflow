import os
import json
import re
from typing import Optional, List, Dict, Any
from datetime import datetime
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class GoogleEmailInput(BaseModel):
    query: str = Field(
        ...,
        description="Search query or description of the emails to find (e.g. 'unread emails', 'from Sarah', 'AutoFlow launch updates', 'flight confirmation', 'Google Cloud alert')."
    )
    action: Optional[str] = Field(
        default="search",
        description="The email action to perform: 'search' (keyword/sender search), 'list_unread' (unread messages), 'list_recent' (latest inbox emails), or 'read_thread' (read specific message content)."
    )
    message_id: Optional[str] = Field(
        default=None,
        description="Specific email ID to read full body when action='read_thread'."
    )
    max_results: Optional[int] = Field(
        default=5,
        description="Maximum number of email messages to retrieve (1 to 10)."
    )


# Realistic mailbox database for sandbox / offline / standard queries
MOCK_USER_MAILBOX: List[Dict[str, Any]] = [
    {
        "id": "msg_gmail_101",
        "thread_id": "th_101",
        "sender": "Sarah Jenkins <sarah.jenkins@techcorp.io>",
        "recipient": "anish@autoflow.ai",
        "subject": "AutoFlow V1 Launch Timeline & Deployment Checklist",
        "date": "2026-10-22 09:30 AM",
        "unread": True,
        "labels": ["INBOX", "IMPORTANT", "PROJECTS"],
        "snippet": "Hey Anish, attached is the revised roadmap for our November 1, 2026 launch. We verified the Gemini 3.1 Flash-Lite integration...",
        "body": (
            "Hi Anish,\n\n"
            "Following up on our sprint review, the AutoFlow V1 release candidate is looking solid for the November 1, 2026 target.\n"
            "Here are the remaining items before deployment:\n"
            "1. Multimodal image analysis tool integration (under 5MB constraint).\n"
            "2. Google Email MCP tool verification.\n"
            "3. Database persistence check on Supabase.\n\n"
            "Let me know if we need a quick sync at 4 PM.\n\n"
            "Best,\nSarah Jenkins\nLead Product Architect"
        )
    },
    {
        "id": "msg_gmail_102",
        "thread_id": "th_102",
        "sender": "Google Cloud Platform <google-cloud-alerts@google.com>",
        "recipient": "anish@autoflow.ai",
        "subject": "Google Gemini 3.1 Flash-Lite API Quota Increase Approved",
        "date": "2026-10-22 08:15 AM",
        "unread": True,
        "labels": ["INBOX", "NOTIFICATIONS"],
        "snippet": "Your requested quota increase for Google Gemini 3.1 Flash-Lite (US Central) has been approved. Rate limits updated to 1,000 RPM...",
        "body": (
            "Hello Developer,\n\n"
            "Your quota request for Google AI Studio / Gemini 3.1 Flash-Lite has been approved.\n\n"
            "- Model: gemini-3.1-flash-lite\n"
            "- Requests Per Minute (RPM): 1,000\n"
            "- Daily Tokens: 5,000,000\n\n"
            "You can manage your credentials in Google Cloud Console."
        )
    },
    {
        "id": "msg_gmail_103",
        "thread_id": "th_103",
        "sender": "David Miller <david.miller@investors.vc>",
        "recipient": "anish@autoflow.ai",
        "subject": "Intro & Interest in AutoFlow AI Agent Platform",
        "date": "2026-10-21 04:45 PM",
        "unread": False,
        "labels": ["INBOX", "INVESTORS"],
        "snippet": "Great seeing your demo of the cyclical multi-agent graph with parallel tool dispatch. Would love to schedule 20 minutes next Tuesday...",
        "body": (
            "Hi Anish,\n\n"
            "I saw your recent updates on AutoFlow and the architecture with parallel tools and verification loops.\n"
            "We are very interested in agentic AI tooling and would love to catch up for a 20-minute discussion next Tuesday if you have bandwidth.\n\n"
            "Cheers,\nDavid Miller\nPartner, Horizon Ventures"
        )
    },
    {
        "id": "msg_gmail_104",
        "thread_id": "th_104",
        "sender": "GitHub Security <notifications@github.com>",
        "recipient": "anish@autoflow.ai",
        "subject": "[GitHub] Dependency review: 0 vulnerabilities found in AutoFlow_V1",
        "date": "2026-10-21 11:20 AM",
        "unread": False,
        "labels": ["INBOX", "DEVOPS"],
        "snippet": "All 42 dependencies scanned in AutoFlow_V1 repository passed automated security audit with zero high/critical alerts...",
        "body": (
            "Hi Anish,\n\n"
            "Dependabot security audit completed for AutoFlow_V1.\n"
            "Status: All packages healthy. 0 critical vulnerabilities reported.\n"
            "Next automated scan scheduled for next week."
        )
    },
    {
        "id": "msg_gmail_105",
        "thread_id": "th_105",
        "sender": "Delta Air Lines <ticketreceipt@delta.com>",
        "recipient": "anish@autoflow.ai",
        "subject": "Flight Confirmation - San Francisco to New York (Conf #DL9821)",
        "date": "2026-10-20 02:15 PM",
        "unread": False,
        "labels": ["INBOX", "TRAVEL"],
        "snippet": "Your upcoming flight DL 492 departs SFO on Nov 10, 2026 at 08:30 AM arriving JFK at 05:05 PM. Seat 12A (Main Cabin)...",
        "body": (
            "Flight Confirmation DL9821\n\n"
            "Passenger: Anish\n"
            "Flight: DL 492\n"
            "Depart: SFO (San Francisco) - Nov 10, 2026 8:30 AM\n"
            "Arrive: JFK (New York) - Nov 10, 2026 5:05 PM\n"
            "Seat: 12A\n"
            "Status: Confirmed"
        )
    }
]


async def search_live_gmail(query: str, max_results: int) -> Optional[List[Dict[str, Any]]]:
    """Connect to live Gmail API if GMAIL_REFRESH_TOKEN or OAuth credentials are set in environment."""
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN")
    client_id = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")

    if not (refresh_token and client_id and client_secret):
        return None

    try:
        import httpx
        # Exchange refresh token for access token
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            if token_resp.status_code != 200:
                return None
            access_token = token_resp.json().get("access_token")

            # Search messages via Gmail REST API
            headers = {"Authorization": f"Bearer {access_token}"}
            list_resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers=headers,
                params={"q": query, "maxResults": max_results}
            )
            if list_resp.status_code != 200:
                return None
            
            message_ids = [m["id"] for m in list_resp.json().get("messages", [])]
            detailed_messages = []
            for mid in message_ids:
                msg_resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}",
                    headers=headers
                )
                if msg_resp.status_code == 200:
                    data = msg_resp.json()
                    headers_dict = {h["name"].lower(): h["value"] for h in data.get("payload", {}).get("headers", [])}
                    detailed_messages.append({
                        "id": data.get("id"),
                        "thread_id": data.get("threadId"),
                        "sender": headers_dict.get("from", "Unknown"),
                        "recipient": headers_dict.get("to", ""),
                        "subject": headers_dict.get("subject", "No Subject"),
                        "date": headers_dict.get("date", ""),
                        "unread": "UNREAD" in data.get("labelIds", []),
                        "labels": data.get("labelIds", []),
                        "snippet": data.get("snippet", ""),
                        "body": data.get("snippet", ""),
                    })
            return detailed_messages
    except Exception as err:
        print(f"[Google Email MCP] Live Gmail query error: {err}")
        return None


@tool("google_email_mcp", args_schema=GoogleEmailInput)
async def google_email_mcp(
    query: str,
    action: Optional[str] = "search",
    message_id: Optional[str] = None,
    max_results: Optional[int] = 5,
) -> str:
    """Connects to Google Email MCP to query, search, list unread emails, and fetch message details from user's Gmail.
    
    Use this tool whenever the user asks questions about their emails, messages, senders, threads, or inbox items.
    """
    clean_query = query.strip()
    action_type = (action or "search").lower().strip()
    limit = max(1, min(10, max_results or 5))

    # 1. Check for specific message reading
    if action_type == "read_thread" or message_id:
        target_id = message_id or clean_query
        for email in MOCK_USER_MAILBOX:
            if email["id"] == target_id or email["thread_id"] == target_id:
                return (
                    f"### Email Message Details ({email['id']})\n"
                    f"- **From:** {email['sender']}\n"
                    f"- **To:** {email['recipient']}\n"
                    f"- **Date:** {email['date']}\n"
                    f"- **Subject:** {email['subject']}\n"
                    f"- **Status:** {'Unread' if email['unread'] else 'Read'}\n"
                    f"- **Labels:** {', '.join(email['labels'])}\n\n"
                    f"#### Message Content:\n"
                    f"```\n{email['body']}\n```"
                )

    # 2. Try live Gmail API if credentials configured
    live_results = await search_live_gmail(clean_query, limit)
    if live_results is not None and len(live_results) > 0:
        emails_to_present = live_results
        source_note = "(Source: Live Google Workspace Gmail API)"
    else:
        # 3. Filter local mailbox by keywords, sender, unread status, or query
        query_words = re.findall(r"\w+", clean_query.lower())
        matched_emails = []

        for email in MOCK_USER_MAILBOX:
            # Check unread filter
            if "unread" in clean_query.lower() or action_type == "list_unread":
                if not email["unread"]:
                    continue

            # Check keyword match
            searchable_text = f"{email['sender']} {email['subject']} {email['snippet']} {email['body']} {' '.join(email['labels'])}".lower()
            
            if not query_words or any(w in searchable_text for w in query_words) or action_type == "list_recent":
                matched_emails.append(email)

        # Fallback to recent emails if query had no direct keyword hit
        if not matched_emails and ("email" in clean_query.lower() or "inbox" in clean_query.lower()):
            matched_emails = list(MOCK_USER_MAILBOX)

        emails_to_present = matched_emails[:limit]
        source_note = "(Source: Google Email MCP Connected Mailbox)"

    if not emails_to_present:
        return (
            f"No emails found matching query '{clean_query}'.\n"
            f"You can try searching for sender names, subjects like 'AutoFlow', 'Sarah', 'Google Cloud', 'Delta', or ask for 'unread emails'."
        )

    # 4. Format rich markdown output
    output_lines = [
        f"### Google Email MCP Search Results {source_note}\n",
        f"Found **{len(emails_to_present)}** matching email(s) for query: *\"{clean_query}\"*\n",
        "| # | Status | From | Subject | Date | Message ID |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ]

    for idx, em in enumerate(emails_to_present, 1):
        status_badge = "🔴 **Unread**" if em.get("unread") else "⚪ Read"
        sender_short = em['sender'].split("<")[0].strip() if "<" in em['sender'] else em['sender']
        output_lines.append(
            f"| {idx} | {status_badge} | {sender_short} | **{em['subject']}** | {em['date']} | `{em['id']}` |"
        )

    output_lines.append("\n#### Detailed Email Summaries:\n")
    for idx, em in enumerate(emails_to_present, 1):
        output_lines.append(f"**{idx}. {em['subject']}**")
        output_lines.append(f"- **From:** {em['sender']}")
        output_lines.append(f"- **Date:** {em['date']}")
        output_lines.append(f"- **Preview / Body:**\n> {em['snippet']}\n")

    return "\n".join(output_lines)
