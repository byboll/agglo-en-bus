export async function render() {
  return `
    <style>
      @media (min-width: 700px) {
        #a11y-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (min-width: 1000px) {
        #a11y-grid { grid-template-columns: repeat(3, 1fr) !important; }
      }
    </style>
    <div class="container section">
      <span class="eyebrow">L'Agglo en bus</span>
      <h1 class="mt-0">Accessibilité</h1>

      <div class="alert alert-info">
        <span aria-hidden="true">ℹ️</span>
        <p style="margin:0;">
          Ce site est un projet personnel indépendant, réalisé à titre de démonstrateur technique.
          Il n'a fait l'objet d'aucun audit RGAA et ne fait pas l'objet d'une déclaration de conformité
          en matière d'accessibilité. Les efforts décrits ci-dessous relèvent d'une démarche volontaire,
          pas d'une certification.
        </p>
      </div>

      <h2>Ce qui a été mis en œuvre</h2>
      <div class="grid" style="grid-template-columns:1fr;" id="a11y-grid">

        <div class="card">
          <h3 style="margin-top:0;">Contrastes de couleur</h3>
          <p class="text-muted" style="margin:0;">
            Les combinaisons de couleurs du système de design ont été choisies pour respecter des ratios
            de contraste conformes (AA au minimum, AAA lorsque possible) entre le texte et son arrière-plan.
          </p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Navigation au clavier</h3>
          <p class="text-muted" style="margin:0;">
            Tous les éléments interactifs (liens, boutons, champs) affichent un contour de focus visible
            et sont accessibles au clavier, dans un ordre de tabulation cohérent.
          </p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Cibles tactiles</h3>
          <p class="text-muted" style="margin:0;">
            Les zones cliquables et tactiles mesurent au minimum 48×48&nbsp;px, avec au moins 8&nbsp;px
            d'écart entre elles, pour limiter les erreurs de manipulation.
          </p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Couleur et information</h3>
          <p class="text-muted" style="margin:0;">
            Aucune information (statut d'une ligne, perturbation, disponibilité...) n'est portée par la
            seule couleur : elle est toujours accompagnée d'un libellé texte et d'une forme distincte
            (pastille, icône).
          </p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Structure sémantique</h3>
          <p class="text-muted" style="margin:0;">
            Les pages utilisent des repères de structure HTML natifs (en-tête, navigation, contenu principal,
            pied de page) et une hiérarchie de titres cohérente, pour faciliter la navigation avec un lecteur d'écran.
          </p>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Textes alternatifs</h3>
          <p class="text-muted" style="margin:0;">
            Les images porteuses de sens (logo, illustrations) sont accompagnées d'un texte alternatif ;
            les éléments purement décoratifs sont masqués aux technologies d'assistance.
          </p>
        </div>

      </div>

      <h2 style="margin-top:var(--sp-7);">Nous signaler un problème</h2>
      <div class="card">
        <p style="margin:0;">
          Si vous rencontrez une difficulté d'accessibilité sur ce site, vos retours sont les bienvenus :
          voir la page <a href="/contact" data-link>Contact</a>. Cela reste un projet personnel, sans obligation
          de résultat ni de délai de correction.
        </p>
      </div>
    </div>
  `;
}
