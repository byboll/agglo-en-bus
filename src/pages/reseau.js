export async function render() {
  return `
    <style>
      @media (min-width: 700px) {
        #reseau-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (min-width: 1000px) {
        #reseau-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
    </style>
    <div class="container section">
      <span class="eyebrow">Réseau L'Agglo en bus</span>
      <h1 class="mt-0">Le réseau</h1>
      <p class="text-muted" style="max-width:60ch;">
        L'Agglo en bus dessert les 17 communes de la communauté d'agglomération Gap-Tallard-Durance.
        Le réseau est entièrement gratuit, financé en partie par des entreprises du territoire, et ne
        circule pas les dimanches et jours fériés.
      </p>

      <div class="alert alert-info" style="margin-top:var(--sp-5);">
        <span aria-hidden="true">🚌</span>
        <p style="margin:0;">
          Cette page présente les grandes familles de lignes du réseau à titre d'information.
          Pour la liste des lignes à jour, avec horaires et arrêts, direction la page
          <a href="/lignes" data-link>Lignes</a>.
        </p>
      </div>

      <div class="grid" style="grid-template-columns:1fr;margin-top:var(--sp-6);" id="reseau-grid">

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">A B C</span>
          <h3 style="margin:var(--sp-2) 0;">Centro Navettes</h3>
          <p class="text-muted" style="margin:0;">
            Trois microbus gratuits (lignes A, B, C) qui desservent le centre-ville de Gap, du mardi au samedi.
            Idéal pour les petits trajets en hyper-centre.
          </p>
        </div>

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">1 → 9, 20</span>
          <h3 style="margin:var(--sp-2) 0;">Lignes urbaines</h3>
          <p class="text-muted" style="margin:0;">
            Dix lignes régulières qui relient les principaux quartiers de Gap — Serviolan, Molines, Les Prés,
            Tokoro, le campus universitaire et bien d'autres — au centre-ville et entre eux.
          </p>
        </div>

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">NRE</span>
          <h3 style="margin:var(--sp-2) 0;">Navette Relais Express</h3>
          <p class="text-muted" style="margin:0;">
            Une liaison rapide pensée pour les correspondances, avec un nombre d'arrêts réduit sur son parcours.
          </p>
        </div>

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">50 → 74</span>
          <h3 style="margin:var(--sp-2) 0;">Lignes scolaires</h3>
          <p class="text-muted" style="margin:0;">
            Réservées aux élèves munis d'une carte scolaire, elles desservent les établissements du territoire.
            Les lignes 55 à 60 relient notamment les collèges du nord de l'agglomération.
          </p>
        </div>

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">73 · 74 · 75</span>
          <h3 style="margin:var(--sp-2) 0;">Lignes saisonnières de montagne</h3>
          <p class="text-muted" style="margin:0;">
            En été comme en hiver, ces lignes desservent le domaine de Charance, Bayard et la gare de Laye.
            Le transport des vélos est accepté, avec un préavis de 48h auprès du service Transports.
          </p>
        </div>

        <div class="card">
          <span class="line-pill" style="background:var(--color-blue);color:#fff;">Taxibus</span>
          <h3 style="margin:var(--sp-2) 0;">Transport à la demande</h3>
          <p class="text-muted" style="margin:0;">
            Là où aucune ligne régulière ne passe, le Taxibus vous emmène pour 1,50&nbsp;€ le trajet,
            sur réservation jusqu'à 7 jours à l'avance, du lundi au samedi.
          </p>
        </div>

      </div>

      <h2 style="margin-top:var(--sp-7);">Plans du réseau</h2>
      <p>
        Les plans détaillés et téléchargeables (PDF) de l'ensemble du réseau sont publiés sur le site officiel de
        l'agglomération :
        <a href="https://www.gap-tallard-durance.fr/fr/lagglo-au-quotidien/lagglo-en-bus-transport/reseau-lagglo-en-bus/" target="_blank" rel="noopener">
          gap-tallard-durance.fr — Réseau L'Agglo en bus
        </a>.
      </p>

      <h2 style="margin-top:var(--sp-6);">Contact du service Transports</h2>
      <div class="card">
        <p style="margin:0 0 var(--sp-2);"><strong>Service Transports — Gap-Tallard-Durance</strong></p>
        <p style="margin:0 0 var(--sp-1);">04&nbsp;92&nbsp;53&nbsp;18&nbsp;19</p>
        <p style="margin:0 0 var(--sp-1);"><a href="mailto:transports@agglo-gap.fr">transports@agglo-gap.fr</a></p>
        <p class="text-muted" style="margin:0;">Du lundi au samedi, 8h-11h45 et 13h30-17h.</p>
      </div>
    </div>
  `;
}
