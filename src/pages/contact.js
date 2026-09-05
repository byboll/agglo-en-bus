export async function render() {
  return `
    <div class="container section">
      <span class="eyebrow">L'Agglo en bus</span>
      <h1 class="mt-0">Contact</h1>

      <div class="alert alert-info">
        <span aria-hidden="true">ℹ️</span>
        <p style="margin:0;">
          Ce site est un projet personnel indépendant. Pour toute démarche officielle
          (titres de transport, réclamations, transport scolaire, objets trouvés...),
          contactez directement le service Transports de l'agglomération.
        </p>
      </div>

      <div class="card" style="margin-bottom:var(--sp-6);">
        <p style="margin:0 0 var(--sp-2);"><strong>Service Transports — Gap-Tallard-Durance</strong></p>
        <p style="margin:0 0 var(--sp-1);">04&nbsp;92&nbsp;53&nbsp;18&nbsp;19</p>
        <p style="margin:0 0 var(--sp-1);"><a href="mailto:transports@agglo-gap.fr">transports@agglo-gap.fr</a></p>
        <p style="margin:0 0 var(--sp-1);">31 route de la Justice, 05000 Gap</p>
        <p class="text-muted" style="margin:0;">Du lundi au samedi, 8h-11h45 et 13h30-17h.</p>
      </div>

      <h2>À propos de ce site</h2>
      <p>
        Ce site est réalisé et maintenu par un développeur indépendant, à titre de démonstrateur technique,
        sans lien avec l'agglomération.
      </p>
      <p>
        Remarques sur le site, bugs, suggestions : <em>[à compléter par l'auteur — ex. adresse e-mail ou lien GitHub]</em>
      </p>
    </div>
  `;
}
