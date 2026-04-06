// app/api/send-devis/route.js
// Utilise Resend pour envoyer le devis PDF par email
// Inscris-toi sur https://resend.com (gratuit jusqu'à 3000 emails/mois)

// Rate limiting email — max 20 emails par heure par IP
const emailRateLimit = new Map()
function checkEmailLimit(ip) {
  const key = `${ip}-${Math.floor(Date.now() / 3600000)}`
  const count = (emailRateLimit.get(key) || 0) + 1
  emailRateLimit.set(key, count)
  if (emailRateLimit.size > 5000) emailRateLimit.clear()
  return count <= 20
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkEmailLimit(ip)) {
      return Response.json({ error: "Trop de requetes" }, { status: 429 })
    }
    const { clientEmail, artisanEmail, artisanNom, devis, numDevis, pdfBase64, devisId } = await request.json()

    if (!clientEmail || !devis || !pdfBase64) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'Clé Resend non configurée' }, { status: 500 })
    }

    // Email HTML professionnel
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Votre devis Devios</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#28a764;padding:28px 32px;border-radius:12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Devios</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">Votre devis professionnel</div>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.2);padding:8px 16px;border-radius:8px;display:inline-block;">
                      <div style="font-size:11px;color:rgba(255,255,255,0.8);">Réf.</div>
                      <div style="font-size:16px;font-weight:700;color:#ffffff;">${numDevis}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              <p style="font-size:15px;color:#374151;margin:0 0 16px;">Bonjour,</p>
              <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.6;">
                Veuillez trouver ci-joint votre devis <strong>${devis.titre}</strong>.
              </p>

              <!-- Récap devis -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Prestation</td>
                  <td align="right" style="font-size:13px;color:#6b7280;padding-bottom:8px;">Montant</td>
                </tr>
                ${(devis.lignes || []).map(l => `
                <tr>
                  <td style="font-size:14px;color:#111827;padding:4px 0;border-top:1px solid #e5e7eb;">${l.description}</td>
                  <td align="right" style="font-size:14px;color:#111827;padding:4px 0;border-top:1px solid #e5e7eb;">${(l.quantite * l.prixUnitaire).toLocaleString('fr-FR')} €</td>
                </tr>`).join('')}
                <tr>
                  <td colspan="2" style="padding-top:12px;border-top:2px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#6b7280;">Total HT</td>
                        <td align="right" style="font-size:13px;color:#6b7280;">${devis.totalHT?.toLocaleString('fr-FR')} €</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;padding-top:4px;">TVA (20%)</td>
                        <td align="right" style="font-size:13px;color:#6b7280;padding-top:4px;">${devis.tva?.toLocaleString('fr-FR')} €</td>
                      </tr>
                      <tr>
                        <td style="font-size:17px;font-weight:700;color:#111827;padding-top:10px;">Total TTC</td>
                        <td align="right" style="font-size:17px;font-weight:700;color:#28a764;padding-top:10px;">${devis.totalTTC?.toLocaleString('fr-FR')} €</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">
                📎 Le devis complet est disponible en pièce jointe (PDF).
              </p>
              <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
                Ce devis est valable 30 jours à compter de sa date d'émission.
              </p>

              <p style="font-size:14px;color:#374151;margin:0;">
                Pour toute question, n'hésitez pas à nous contacter :<br>
                <a href="mailto:${artisanEmail}" style="color:#28a764;">${artisanEmail}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                Devis généré par <a href="https://devios.fr" style="color:#28a764;">Devios</a> &middot;
              <img src="https://devios.fr/api/track-open?id=${devisId || ''}" width="1" height="1" style="display:none" alt="" />
                ${new Date().toLocaleDateString('fr-FR')}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // Envoi via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: artisanNom ? `${artisanNom} via Devios <devis@devios.fr>` : 'Devios <devis@devios.fr>',
        to: [clientEmail],
        reply_to: artisanEmail,
        subject: `Votre devis ${numDevis} — ${devis.titre}`,
        html: emailHTML,
        attachments: [{
          filename: `devis-${numDevis}.pdf`,
          content: pdfBase64,
        }]
      })
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return Response.json({ error: resendData.message || 'Erreur Resend' }, { status: 500 })
    }

    return Response.json({ success: true, id: resendData.id })

  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
