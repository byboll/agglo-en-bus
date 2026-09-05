export async function render() {
  return `
    <div class="container section">
      <span class="eyebrow">L'Agglo en bus</span>
      <h1 class="mt-0">Confidentialité</h1>

      <div class="alert alert-info">
        <span aria-hidden="true">🔒</span>
        <p style="margin:0;">
          Ce site ne collecte aucune donnée personnelle et ne dispose d'aucun serveur applicatif ni base
          de données : tout se passe directement dans votre navigateur.
        </p>
      </div>

      <h2>Données GTFS en mémoire de session</h2>
      <p>
        Pour que les pages s'affichent instantanément sans re-télécharger les horaires à chaque navigation,
        ce site conserve une copie temporaire des données publiques du réseau (lignes, arrêts, horaires —
        au format GTFS) dans le <code class="mono">sessionStorage</code> de votre navigateur. Ces données :
      </p>
      <ul>
        <li>ne contiennent <strong>aucune information personnelle</strong> ;</li>
        <li>ne sont <strong>jamais transmises</strong> à qui que ce soit — elles restent sur votre appareil ;</li>
        <li>sont <strong>automatiquement effacées</strong> à la fermeture de l'onglet ou du navigateur.</li>
      </ul>

      <h2>Géolocalisation (arrêts à proximité)</h2>
      <p>
        La fonction « arrêts près de moi », disponible sur la page Arrêts, peut demander l'accès à votre
        position. Cette demande n'est faite qu'à votre initiative, en cliquant sur le bouton correspondant.
        Votre position est utilisée <strong>uniquement dans votre navigateur</strong>, pour trier les arrêts
        par distance : elle n'est ni transmise, ni stockée, ni conservée au-delà de l'affichage du résultat.
      </p>

      <h2>Pas de suivi, pas de publicité</h2>
      <p>
        Ce site ne dépose aucun cookie de suivi, n'utilise aucun outil d'analyse d'audience (analytics) et
        n'affiche aucune publicité. Aucun profil de navigation n'est constitué.
      </p>

      <p class="text-muted">
        Pour toute question, voir la page <a href="/contact" data-link>Contact</a> ainsi que les
        <a href="/mentions-legales" data-link>mentions légales</a>.
      </p>
    </div>
  `;
}
