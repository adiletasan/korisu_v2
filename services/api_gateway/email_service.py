import httpx
from config import settings


async def send_verification_email(email: str, name: str, token: str):
    verify_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="margin-bottom: 32px;">
        <span style="font-weight: 800; font-size: 20px; letter-spacing: -0.5px;">KO<span style="color: #00ff88;">RISU</span></span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #0a0a0a;">Verify your email</h1>
      <p style="color: #666; margin-bottom: 32px; line-height: 1.6;">Hi {name}, click the button below to verify your Korisu account.</p>
      <a href="{verify_url}" style="display: inline-block; background: #0a0a0a; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Verify Email</a>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">Link expires in 24 hours. If you didn't sign up, ignore this.</p>
    </div>
    """

    if not settings.SENDGRID_API_KEY:
        # In production without SendGrid: log the URL
        # The user can get the link from Render logs
        print(f"[KORISU] Verification link for {email}: {verify_url}")
        return

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
                json={
                    "personalizations": [{"to": [{"email": email, "name": name}]}],
                    "from": {"email": settings.FROM_EMAIL, "name": "Korisu"},
                    "subject": "Verify your Korisu account",
                    "content": [{"type": "text/html", "value": html}],
                },
            )
            if resp.status_code >= 400:
                print(f"[KORISU] SendGrid error {resp.status_code}: {resp.text}")
                print(f"[KORISU] Fallback verification link for {email}: {verify_url}")
    except Exception as e:
        print(f"[KORISU] Email send failed: {e}")
        print(f"[KORISU] Fallback verification link for {email}: {verify_url}")
