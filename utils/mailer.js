const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (!SMTP_HOST) {
    throw new Error("Configuration SMTP manquante : définissez SMTP_HOST (et les identifiants associés) dans .env");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
  });

  return transporter;
}

async function sendVerificationEmail(to, verificationLink) {
  const mailTransporter = getTransporter();
  const from = process.env.MAIL_FROM || 'QR Dynamic <no-reply@qr-dynamic.local>';

  const html = `
    <p>Bonjour,</p>
    <p>Merci de créer un compte sur QR Dynamic. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail et finaliser la création de votre compte.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${verificationLink}" style="background:#6c5ce7;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Vérifier mon e-mail</a>
    </p>
    <p>Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :</p>
    <p>${verificationLink}</p>
    <p>Ce lien expirera dans 24 heures.</p>
    <p>— L'équipe QR Dynamic</p>
  `;

  await mailTransporter.sendMail({
    from,
    to,
    subject: 'Vérifiez votre adresse e-mail',
    html
  });
}

module.exports = {
  sendVerificationEmail
};


