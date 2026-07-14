"""
邮箱发送服务

通过 SMTP 发送注册/登录验证码。生产环境请在 CloudBase 或 .env 中配置：
SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, SMTP_TLS, SMTP_SSL
"""

from email.message import EmailMessage
import os
import smtplib
import ssl


class EmailServiceError(RuntimeError):
    """邮箱服务配置或发送失败。"""


def _is_truthy(value: str | None) -> bool:
    return str(value or "").lower() in {"1", "true", "yes", "on"}


def send_verification_email(email: str, code: str, purpose: str) -> None:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_username).strip()
    smtp_tls = _is_truthy(os.getenv("SMTP_TLS", "true"))
    smtp_ssl = _is_truthy(os.getenv("SMTP_SSL", "true" if smtp_port == 465 else "false"))

    if not smtp_host or not smtp_username or not smtp_password or not smtp_from:
        raise EmailServiceError("邮箱验证码服务未配置，请先设置 SMTP 环境变量")

    purpose_label = "注册" if purpose == "register" else "登录"
    message = EmailMessage()
    message["Subject"] = f"MoodWave 灵音{purpose_label}验证码"
    message["From"] = smtp_from
    message["To"] = email
    message.set_content(
        "\n".join(
            [
                f"你的 MoodWave 灵音{purpose_label}验证码是：{code}",
                "",
                "验证码 5 分钟内有效，请不要转发给其他人。",
                "如果这不是你本人操作，可以忽略这封邮件。",
            ]
        )
    )

    try:
        context = ssl.create_default_context()
        smtp_class = smtplib.SMTP_SSL if smtp_ssl else smtplib.SMTP
        with smtp_class(smtp_host, smtp_port, timeout=12, context=context) if smtp_ssl else smtp_class(smtp_host, smtp_port, timeout=12) as server:
            if smtp_tls and not smtp_ssl:
                server.starttls(context=context)
            server.login(smtp_username, smtp_password)
            server.send_message(message)
    except Exception as exc:
        raise EmailServiceError("验证码邮件发送失败，请稍后重试") from exc
