// app/api/feedback/route.js
// Sauvegarde les feedbacks utilisateurs et les envoie par email
export async function POST(request) {
  try {
    const { message, type, userId, userEmail } = await request.json()
    if (!message?.trim()) return Response.json({ error: 'Message vide' }, { status: 400 })

    // Envoie le feedback par email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Devios Feedback <feedback@devios.fr>',
        to: ['contact@devios.fr'],
        subject: `[Feedback ${type || 'général'}] de ${userEmail}`,
        html: `
          <h2>Nouveau feedback Devios</h2>
          <p><strong>Type :</strong> ${type || 'général'}</p>
          <p><strong>Utilisateur :</strong> ${userEmail} (${userId})</p>
          <p><strong>Message :</strong></p>
          <blockquote style="border-left:3px solid #E8650A;padding-left:12px;color:#4A5568;">${message}</blockquote>
          <p><small>Envoyé le ${new Date().toLocaleString('fr-FR')}</small></p>
        `
      })
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
