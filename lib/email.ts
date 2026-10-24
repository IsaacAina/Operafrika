import nodemailer, { type Transporter } from 'nodemailer'

const EMAIL_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com'
const EMAIL_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587)
const EMAIL_SECURE = EMAIL_PORT === 465
const EMAIL_USER = process.env.SMTP_USER || process.env.EMAIL_USER
const EMAIL_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS
const EMAIL_FROM =
  process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@operafrika.com'
const EMAIL_REPLY_TO = process.env.SMTP_REPLY_TO || process.env.EMAIL_REPLY_TO

const MAX_SEND_ATTEMPTS = 3

const globalForMail = globalThis as unknown as { __operafrikaMailer?: Transporter }

function createTransporter(): Transporter {
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_SECURE,
    auth:
      EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
    pool: true,
    maxConnections: 1,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  })
}

function getTransporter(): Transporter {
  if (!globalForMail.__operafrikaMailer) {
    globalForMail.__operafrikaMailer = createTransporter()
  }
  return globalForMail.__operafrikaMailer
}

function resetTransporter() {
  try {
    globalForMail.__operafrikaMailer?.close()
  } catch {
    // ignore close errors
  }
  globalForMail.__operafrikaMailer = undefined
}

export async function sendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
}) {
  const { to, subject, text, html, replyTo } = options
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    try {
      await getTransporter().sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
        replyTo: replyTo || EMAIL_REPLY_TO,
      })
      return
    } catch (err) {
      lastError = err
      resetTransporter()
      if (attempt < MAX_SEND_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
  }

  throw lastError
}
