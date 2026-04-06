// app/api/welcome/route.js
// Envoie l'email de bienvenue après inscription
export async function POST(request) {
  try {
    const { email, prenom } = await request.json()
    if (!email) return Response.json({ error: 'Email requis' }, { status: 400 })

    const nom = prenom || 'cher artisan'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Devios <bonjour@devios.fr>',
        to: [email],
        subject: 'Bienvenue sur Devios - votre premier devis en 30 secondes',
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="560" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#1B2D4F;padding:28px 32px;border-radius:16px 16px 0 0;">
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">📐 Devios</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:4px;">Devis IA pour artisans</div>
      </td></tr>

      <!-- Corps -->
      <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
        <h1 style="font-size:22px;font-weight:800;color:#1B2D4F;margin:0 0 8px;">Bienvenue, ${nom} 👋</h1>
        <p style="font-size:15px;color:#4A5568;line-height:1.7;margin:0 0 24px;">
          Votre compte Devios est prêt. Voici les 3 premières choses à faire pour générer des devis conformes en 30 secondes.
        </p>

        <!-- Étapes -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="background:#F7F4EF;border-radius:12px;padding:16px;margin-bottom:10px;display:block;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="background:#1B2D4F;color:#fff;border-radius:99px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">1</div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#1B2D4F;">Complétez votre profil artisan</div>
                  <div style="font-size:12px;color:#4A5568;margin-top:3px;">SIRET, assurance décennale, adresse - ces infos apparaîtront sur tous vos devis automatiquement.</div>
                </div>
              </div>
            </td>
          </tr>
          <tr><td height="8"></td></tr>
          <tr>
            <td style="background:#F7F4EF;border-radius:12px;padding:16px;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="background:#E8650A;color:#fff;border-radius:99px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">2</div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#1B2D4F;">Générez votre premier devis IA</div>
                  <div style="font-size:12px;color:#4A5568;margin-top:3px;">Décrivez le chantier en quelques mots. L'IA génère toutes les lignes, les quantités et les prix en 30 secondes.</div>
                </div>
              </div>
            </td>
          </tr>
          <tr><td height="8"></td></tr>
          <tr>
            <td style="background:#F7F4EF;border-radius:12px;padding:16px;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="background:#2D7D46;color:#fff;border-radius:99px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">3</div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#1B2D4F;">Envoyez le PDF à votre client</div>
                  <div style="font-size:12px;color:#4A5568;margin-top:3px;">Un clic pour envoyer le PDF par email. Vous saurez quand le client l'aura ouvert.</div>
                </div>
              </div>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:24px;">
          <a href="https://devios.fr" style="display:inline-block;background:#E8650A;color:#fff;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:800;text-decoration:none;box-shadow:0 4px 16px rgba(232,101,10,0.3);">
            🚀 Générer mon premier devis
          </a>
        </div>

        <p style="font-size:13px;color:#9CA3AF;text-align:center;margin:0;">
          Une question ? Répondez directement à cet email.<br>
          Je réponds personnellement sous 24h.
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 0;text-align:center;">
        <p style="font-size:11px;color:#9CA3AF;margin:0;">
          Devios &middot; devios.fr - <a href="https://devios.fr/confidentialite" style="color:#9CA3AF;">Confidentialité</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
      })
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
