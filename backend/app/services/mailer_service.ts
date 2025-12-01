// import mail from '@adonisjs/mail/services/main' // Temporairement désactivé
import env from '#start/env'

/**
 * Template HTML pour l'email de vérification
 */
function getVerificationEmailHtml(verificationLink: string, appName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérifiez votre adresse e-mail</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h1 style="color: #6c5ce7; margin-top: 0;">Bonjour,</h1>
    
    <p>Merci de créer un compte sur ${appName}. Cliquez sur le bouton ci-dessous pour vérifier votre adresse e-mail et finaliser la création de votre compte.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${verificationLink}" style="background: #6c5ce7; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Vérifier mon e-mail</a>
    </div>
    
    <p>Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :</p>
    <p style="word-break: break-all; color: #6c5ce7;">${verificationLink}</p>
    
    <p>Ce lien expirera dans 24 heures.</p>
    
    <p style="margin-top: 30px; color: #666; font-size: 14px;">— L'équipe ${appName}</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Template HTML pour l'email d'invitation
 */
function getInvitationEmailHtml(invitationLink: string, appName: string, siteName?: string): string {
  const siteInfo = siteName ? `le site <strong>${siteName}</strong> sur ` : ''
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation à rejoindre un site</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
    <h1 style="color: #6c5ce7; margin-top: 0;">Invitation</h1>
    
    <p>Vous avez été invité à rejoindre ${siteInfo}${appName}.</p>
    
    <p>Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${invitationLink}" style="background: #6c5ce7; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Accepter l'invitation</a>
    </div>
    
    <p>Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :</p>
    <p style="word-break: break-all; color: #6c5ce7;">${invitationLink}</p>
    
    <p style="margin-top: 30px; color: #666; font-size: 14px;">— L'équipe ${appName}</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Envoie un email de vérification
 * @param to - Adresse email du destinataire
 * @param verificationLink - Lien de vérification
 */
export async function sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
  // TODO: Réactiver le mail une fois la configuration corrigée
  console.log('📧 Email de vérification (désactivé temporairement):', {
    to,
    verificationLink,
  })
  // const appName = env.get('APP_NAME')
  // const mailFrom = env.get('MAIL_FROM').replace(/^"|"$/g, '')
  // await mail.send((message) => {
  //   message
  //     .from(mailFrom)
  //     .to(to)
  //     .subject('Vérifiez votre adresse e-mail')
  //     .html(getVerificationEmailHtml(verificationLink, appName))
  // })
}

/**
 * Envoie un email d'invitation
 * @param to - Adresse email du destinataire
 * @param invitationLink - Lien d'invitation
 * @param siteName - Nom du site (optionnel)
 */
export async function sendInvitationEmail(
  to: string,
  invitationLink: string,
  siteName?: string
): Promise<void> {
  // TODO: Réactiver le mail une fois la configuration corrigée
  console.log('📧 Email d\'invitation (désactivé temporairement):', {
    to,
    invitationLink,
    siteName,
  })
  // const appName = env.get('APP_NAME')
  // const mailFrom = env.get('MAIL_FROM').replace(/^"|"$/g, '')
  // await mail.send((message) => {
  //   message
  //     .from(mailFrom)
  //     .to(to)
  //     .subject(siteName ? `Invitation pour ${siteName}` : 'Invitation à rejoindre un site')
  //     .html(getInvitationEmailHtml(invitationLink, appName, siteName))
  // })
}

