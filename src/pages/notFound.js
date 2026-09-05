export async function render() {
  return `
    <div class="container section text-center" style="padding-top:var(--sp-8);padding-bottom:var(--sp-8);">
      <span class="eyebrow">Erreur 404</span>
      <h1 class="mt-0">Page introuvable</h1>
      <p class="text-muted" style="max-width:48ch;margin-left:auto;margin-right:auto;">
        La page que vous cherchez n'existe pas ou a changé d'adresse. Vérifiez le lien saisi, ou repartez
        de l'accueil pour retrouver votre chemin.
      </p>
      <a href="/" data-link class="btn btn-primary" style="margin-top:var(--sp-4);">Retour à l'accueil</a>
    </div>
  `;
}
