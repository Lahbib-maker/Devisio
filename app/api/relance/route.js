// app/api/relance/route.js
// Envoie une relance automatique pour les devis sans réponse depuis N jours
export async function POST(request) {
  try {
    const { devisId, clientEmail, artisanEmail, devisTitre, devisTotal, joursAttente } = await request.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Devios <devis@devios.fr>',
        to: [clientEmail],
        reply_to: artisanEmail,
        subject: `Rappel : votre devis "${devisTitre}" est en attente`,
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="600" style="max-width:600px;width:100%;">
        <tr><td style="background:#1B2D4F;padding:24px 32px;border-radius:12px 12px 0 0;">
          <div style="font-size:20px;font-weight:800;color:#fff;">Devios</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">Rappel de devis</div>
        </td></tr>
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
          <p style="font-size:15px;color:#374151;margin:0 0 16px;">Bonjour,</p>
          <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
            Nous vous rappelons que votre devis <strong>"${devisTitre}"</strong> d'un montant de <strong>${devisTotal}</strong> est en attente de votre réponse depuis ${joursAttente} jour${joursAttente > 1 ? 's' : ''}.
          </p>
          <div style="background:#FFF0E6;border:1px solid #FFDFC7;border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="font-size:13px;color:#92400E;font-weight:700;">Ce devis expire dans ${Math.max(0, 30 - joursAttente)} jours</div>
            <div style="font-size:12px;color:#78350F;margin-top:4px;">Pensez à valider votre devis avant son expiration.</div>
          </div>
          <p style="font-size:14px;color:#374151;margin:0;">
            Pour toute question, contactez-nous directement :<br>
            <a href="mailto:${artisanEmail}" style="color:#E8650A;">${artisanEmail}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 0;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">Devios &middot; devios.fr</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
<img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://devios.fr'}/api/track-open?id=${devisId}" width="1" height="1" style="display:none" alt=""/></body></html>`
      })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message)
    }

    return Response.json({ success: true })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
