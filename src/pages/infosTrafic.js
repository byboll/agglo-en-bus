export async function render() {
  return `
    <div class="container section">
      <span class="eyebrow">Réseau L'Agglo en bus</span>
      <h1 class="mt-0">Infos trafic</h1>

      <div class="alert alert-info">
        <span aria-hidden="true">ℹ️</span>
        <p style="margin:0;">
          Ce site s'appuie sur un flux GTFS statique (horaires théoriques), sans fil d'alertes trafic en temps réel.
          Les perturbations ci-dessous sont mises à jour manuellement et peuvent ne pas refléter les tout derniers changements.
          Pour une information garantie à jour, consultez le
          <a href="https://www.gap-tallard-durance.fr" target="_blank" rel="noopener">site officiel de l'agglomération</a>
          ou contactez le service Transports : 04&nbsp;92&nbsp;53&nbsp;18&nbsp;19 · <a href="mailto:transports@agglo-gap.fr">transports@agglo-gap.fr</a>
          (du lundi au samedi, 8h-11h45 et 13h30-17h).
        </p>
      </div>

      <h2>Perturbations en cours</h2>
      <div class="grid" style="grid-template-columns:1fr;">

        <div class="card">
          <span class="status-pill status-alert">Perturbation · Travaux</span>
          <p style="margin:var(--sp-3) 0 0;">
            <strong>31 août – 11 septembre 2026</strong> — l'arrêt « La Clarée » est déplacé vers « La Guisane ».
            Le terminus « Tournefave » est déplacé à l'angle des rues du Guil et de la Clarée, le temps des travaux.
          </p>
        </div>

        <div class="card">
          <span class="status-pill status-alert">Perturbation · Travaux</span>
          <p style="margin:var(--sp-3) 0 0;">
            <strong>Jusqu'au 30 septembre 2026</strong> — dans le sens centre-ville, l'arrêt « Gare SNCF » est avancé de 50 m,
            devant l'immeuble BNP, le temps des travaux.
          </p>
        </div>

      </div>

      <h2 style="margin-top:var(--sp-7);">Bon à savoir</h2>
      <div class="card">
        <ul style="margin:0;padding-left:1.1em;">
          <li>Le réseau L'Agglo en bus est <strong>100&nbsp;% gratuit</strong>, sur toutes les lignes.</li>
          <li>Aucun service n'est assuré les <strong>dimanches et jours fériés</strong>.</li>
          <li>En dehors des zones desservies par une ligne régulière, le <strong>Taxibus</strong> (transport à la demande) permet de se déplacer pour 1,50&nbsp;€ le trajet, sur réservation jusqu'à 7 jours à l'avance, du lundi au samedi.</li>
        </ul>
        <p class="text-muted" style="margin:var(--sp-3) 0 0;">Merci de votre compréhension pendant ces travaux.</p>
      </div>
    </div>
  `;
}
