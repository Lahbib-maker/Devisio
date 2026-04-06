// app/api/devis/route.js
// Génération de devis avec IA Claude (Anthropic)
// Fallback sur tarifs fixes si clé non configurée

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Tarifs fixes de secours si l'IA échoue
const TARIFS = {
  'Électricien':[{d:"Main d'œuvre électricien",u:'heure',p:65},{d:'Fournitures et câblage',u:'forfait',p:120},{d:'Déplacement',u:'forfait',p:45}],
  'Plombier':[{d:"Main d'œuvre plombier",u:'heure',p:70},{d:'Fournitures et pièces',u:'forfait',p:100},{d:'Déplacement',u:'forfait',p:45}],
  'Peintre':[{d:'Préparation des surfaces',u:'m²',p:8},{d:'Application peinture 2 couches',u:'m²',p:18},{d:'Fournitures peinture',u:'forfait',p:80}],
  'Maçon':[{d:"Main d'œuvre maçonnerie",u:'heure',p:55},{d:'Matériaux béton/parpaings',u:'forfait',p:150},{d:'Location matériel',u:'forfait',p:80}],
  'Menuisier':[{d:"Main d'œuvre menuiserie",u:'heure',p:60},{d:'Fournitures et bois',u:'forfait',p:100},{d:'Déplacement',u:'forfait',p:45}],
  'Couvreur':[{d:"Main d'œuvre couverture",u:'m²',p:45},{d:'Fournitures tuiles/ardoises',u:'m²',p:35},{d:'Échafaudage',u:'forfait',p:200}],
  'Carreleur':[{d:'Pose carrelage',u:'m²',p:35},{d:'Fourniture carrelage',u:'m²',p:25},{d:'Préparation support',u:'m²',p:12}],
  'Chauffagiste':[{d:"Main d'œuvre chauffagiste",u:'heure',p:75},{d:'Fournitures et pièces',u:'forfait',p:150},{d:'Déplacement',u:'forfait',p:45}],
}

function genererFallback(description, metier, tauxTVA) {
  const tarifs = TARIFS[metier] || TARIFS['Électricien']
  const d = description.toLowerCase()
  const m2 = parseInt(d.match(/(\d+)\s*m/)?.[1] || 20)
  const h = parseInt(d.match(/(\d+)\s*h/)?.[1] || 4)
  const lignes = tarifs.map(t => ({
    description: t.d,
    quantite: t.u === 'm²' ? m2 : t.u === 'heure' ? h : 1,
    unite: t.u,
    prixUnitaire: t.p
  }))
  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const tva = Math.round(totalHT * tauxTVA / 100 * 100) / 100
  return {
    titre: description.slice(0, 60),
    lignes,
    totalHT: Math.round(totalHT * 100) / 100,
    tva,
    totalTTC: Math.round((totalHT + tva) * 100) / 100,
    tauxTVA,
    delai: '3 à 5 jours ouvrés',
    notes: 'Devis établi sur la base des informations fournies.'
  }
}

// Rate limiting simple en mémoire (reset toutes les heures)
const rateLimit = new Map()
function checkRateLimit(ip, max = 30) {
  const now = Date.now()
  const key = `${ip}-${Math.floor(now / 3600000)}`
  const count = (rateLimit.get(key) || 0) + 1
  rateLimit.set(key, count)
  if (rateLimit.size > 10000) rateLimit.clear() // éviter fuite mémoire
  return count <= max
}

function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim().slice(0, 500)
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip, 30)) {
      return Response.json({ error: 'Trop de requêtes - réessayez dans une heure' }, { status: 429 })
    }
    const body = await request.json()
    const description = sanitize(body.description)
    const metier = sanitize(body.metier)
    const tva = body.tva
    const userId = body.userId

    // Vérification limite plan gratuit
    if (userId) {
      try {
        const { data: profil } = await supabase
          .from('profils').select('plan').eq('user_id', userId).single()
        if (!profil?.plan || profil.plan === 'gratuit') {
          const debut = new Date()
          debut.setDate(1); debut.setHours(0, 0, 0, 0)
          const { count } = await supabase
            .from('devis').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).gte('created_at', debut.toISOString())
          if ((count || 0) >= 3) {
            return Response.json({
              error: 'LIMITE_GRATUIT',
              message: 'Limite de 3 devis gratuits atteinte. Passez au plan Solo (19€/mois).'
            }, { status: 403 })
          }
        }
      } catch {}
    }

    if (!description || description.trim().length < 5) {
      return Response.json({ error: 'Description trop courte' }, { status: 400 })
    }

    const tauxTVA = tva || 10
    const metierLabel = metier || 'Artisan'

    // Utiliser l'IA si la clé est disponible
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Tu es expert en devis pour artisans français, métier : ${metierLabel}.
Génère un devis JSON uniquement (sans markdown) pour : "${description}"
TVA : ${tauxTVA}%

Format EXACT :
{"titre":"...","lignes":[{"description":"...","quantite":1,"unite":"forfait","prixUnitaire":0}],"totalHT":0,"tva":0,"totalTTC":0,"tauxTVA":${tauxTVA},"delai":"...","notes":"..."}

Règles :
- Tarifs réalistes France 2024
- Sépare main d'œuvre et fournitures
- Unités adaptées : m², ml, heure, forfait, u
- Calcule TVA à ${tauxTVA}%
- 3 à 6 lignes maximum
- JSON valide uniquement, aucun texte autour`
            }]
          })
        })

        if (res.ok) {
          const data = await res.json()
          const text = data.content?.map(b => b.text || '').join('') || ''
          const clean = text.replace(/```json|```/g, '').trim()
          const devis = JSON.parse(clean)
          return Response.json({ devis, source: 'ia' })
        }
      } catch (e) {
        console.error('IA error, fallback:', e.message)
      }
    }

    // Fallback tarifs fixes
    const devis = genererFallback(description, metierLabel, tauxTVA)
    return Response.json({ devis, source: 'fallback' })

  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
