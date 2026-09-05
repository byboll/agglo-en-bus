export async function render() {
  return `
    <div class="container section">
      <span class="eyebrow">Réseau L'Agglo en bus</span>
      <h1 class="mt-0">Actualités</h1>
      <p class="text-muted">Les dernières informations sur le réseau : nouveautés, services et rappels utiles.</p>

      <div class="grid" style="grid-template-columns:1fr;margin-top:var(--sp-5);">

        <article class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap;">
            <span class="status-pill status-info">Info</span>
            <time class="sr-note mono" datetime="2026-09-01">1er septembre 2026</time>
          </div>
          <h2 style="font-size:var(--fs-h3);margin:var(--sp-3) 0 var(--sp-2);">Cartes scolaires 2026/2027 : les inscriptions sont ouvertes</h2>
          <p>Les demandes de carte scolaire pour l'année 2026/2027 sont désormais ouvertes. Cette carte est indispensable pour emprunter les lignes scolaires (numérotées 50 à 74) dès la rentrée. Les familles sont invitées à ne pas attendre les derniers jours pour déposer leur dossier, afin de garantir une place dans le bus dès le premier jour de classe.</p>
          <p class="text-muted" style="margin:0;">Renseignements et dossiers d'inscription auprès du service Transports de l'agglomération (voir page <a href="/contact" data-link>Contact</a>).</p>
        </article>

        <article class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap;">
            <span class="status-pill status-alert">Perturbation</span>
            <time class="sr-note mono" datetime="2026-08-31">31 août 2026</time>
          </div>
          <h2 style="font-size:var(--fs-h3);margin:var(--sp-3) 0 var(--sp-2);">Travaux : plusieurs arrêts temporairement déplacés</h2>
          <p>Des travaux entraînent le déplacement temporaire de l'arrêt « La Clarée » vers « La Guisane », ainsi que du terminus « Tournefave », déplacé à l'angle des rues du Guil et de la Clarée, jusqu'au 11 septembre. L'arrêt Gare SNCF (sens centre-ville) est quant à lui avancé de 50 m, devant l'immeuble BNP, jusqu'au 30 septembre.</p>
          <p style="margin:0;"><a href="/infos-trafic" data-link>Consulter le détail des perturbations en cours →</a></p>
        </article>

        <article class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap;">
            <span class="status-pill status-ok">Service</span>
            <time class="sr-note mono" datetime="2026-08-20">20 août 2026</time>
          </div>
          <h2 style="font-size:var(--fs-h3);margin:var(--sp-3) 0 var(--sp-2);">Taxibus : le transport à la demande, pour seulement 1,50 €</h2>
          <p>Rappel : dans les zones non desservies par une ligne régulière, le Taxibus permet de se déplacer sur réservation pour 1,50 € le trajet. La réservation s'effectue jusqu'à 7 jours à l'avance, du lundi au samedi. Un service pratique pour les trajets du quotidien, à réserver le plus tôt possible pour s'assurer une place.</p>
        </article>

        <article class="card">
          <div class="flex" style="justify-content:space-between;align-items:center;gap:var(--sp-3);flex-wrap:wrap;">
            <span class="status-pill status-ok">Saison</span>
            <time class="sr-note mono" datetime="2026-09-01">1er septembre 2026</time>
          </div>
          <h2 style="font-size:var(--fs-h3);margin:var(--sp-3) 0 var(--sp-2);">Lignes de montagne 73-75 : les vélos toujours acceptés</h2>
          <p>Les lignes saisonnières 73, 74 et 75, qui desservent le domaine de Charance, Bayard et la gare de Laye, continuent d'accueillir les vélos à bord. Un simple préavis de 48h auprès du service Transports suffit pour réserver une place vélo, dans la limite des places disponibles.</p>
        </article>

      </div>
    </div>
  `;
}
