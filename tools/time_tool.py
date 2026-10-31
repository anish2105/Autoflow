from datetime import datetime
import zoneinfo
from langchain_core.tools import tool


@tool
def get_current_time(timezone: str = "UTC") -> str:
    """Get the current date and time formatted nicely for a given timezone.
    
    Args:
        timezone: The timezone name (e.g. 'UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London'). Defaults to 'UTC'.
    """
    try:
        tz = zoneinfo.ZoneInfo(timezone)
        now = datetime.now(tz)
        return (
            f"Current time in {timezone}:\n"
            f"- Date: {now.strftime('%A, %B %d, %Y')}\n"
            f"- Time: {now.strftime('%I:%M:%S %p %Z')}\n"
            f"- ISO-8601: {now.isoformat()}"
        )
    except Exception as e:
        # Fallback to local time
        now = datetime.now()
        return (
            f"Invalid timezone '{timezone}'. Current local system time is:\n"
            f"- Date: {now.strftime('%A, %B %d, %Y')}\n"
            f"- Time: {now.strftime('%I:%M:%S %p')}\n"
            f"- Error details: {str(e)}"
        )
