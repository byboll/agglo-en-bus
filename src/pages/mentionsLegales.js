export async function render() {
  return `
    <div class="container section">
      <span class="eyebrow">L'Agglo en bus</span>
      <h1 class="mt-0">Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        Ce site est une initiative <strong>personnelle et indépendante</strong>, réalisée à titre de démonstrateur
        technique. Son auteur n'a aucun lien contractuel, institutionnel ou commercial avec la communauté
        d'agglomération Gap-Tallard-Durance, ni avec l'exploitant du réseau de transport. Ce site
        <strong>n'a aucun caractère officiel</strong>.
      </p>
      <p class="text-muted">
        Éditeur : <em>[Nom / contact de l'auteur — à compléter]</em>
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site statique est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
        (<a href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a>).
      </p>

      <h2>Origine des données</h2>
      <p>
        Les données de lignes, d'arrêts et d'horaires affichées sur ce site proviennent du flux GTFS public
        de la communauté d'agglomération Gap-Tallard-Durance, accessible à l'adresse
        <br><code>https://gtfs-rt.infra-hubup.fr/cagtd/current/gtfs</code>. Ce flux est récupéré automatiquement par le
        navigateur du visiteur, directement depuis cette source publique, à chaque ouverture du site — il n'est
        jamais stocké de façon permanente : seule la session de navigation en cours en garde une copie temporaire,
        effacée à la fermeture de l'onglet ou du navigateur. Ces données restent la propriété de
        leur émetteur. Ce site n'en garantit ni l'exactitude ni la disponibilité en temps réel : les horaires
        affichés sont des <strong>horaires théoriques</strong>, issus des fichiers d'horaires publiés, et non
        d'un suivi en temps réel des véhicules.
      </p>

      <h2>Absence de garantie</h2>
      <p>
        Les informations présentées sur ce site le sont à titre indicatif, sans garantie d'exactitude,
        d'exhaustivité ou de mise à jour. L'auteur ne saurait être tenu responsable d'un désagrément lié à
        une information erronée ou obsolète affichée sur ce site.
      </p>
      <p>
        Pour toute démarche officielle, merci de vous référer au
        <a href="https://www.gap-tallard-durance.fr" target="_blank" rel="noopener">site officiel de l'agglomération</a>
        et au service Transports, dont les coordonnées figurent en page <a href="/contact" data-link>Contact</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom « L'Agglo en bus », son logo et sa charte graphique appartiennent à la communauté
        d'agglomération Gap-Tallard-Durance. Ce site en fait un usage purement illustratif et
        démonstratif, sans intention commerciale ni volonté d'appropriation.
      </p>

      <h2>Pour aller plus loin</h2>
      <p>
        Voir également la page <a href="/confidentialite" data-link>Confidentialité</a> et la page
        <a href="/contact" data-link>Contact</a>.
      </p>
    </div>
  `;
}
