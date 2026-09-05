import { getState, subscribe } from '../gtfs/store.js';

export async function render() {
  const html = `
    <style>
      @media (min-width: 700px) {
        #home-tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (min-width: 1000px) {
        #home-tools-grid { grid-template-columns: repeat(4, 1fr) !important; }
      }
      /* Le motif de points est un fond décoratif : le texte a besoin de son propre aplat
         (charte : jamais de texte directement sur la trame de points). */
      .hero-panel {
        background: var(--color-blue);
        border-radius: var(--radius-card);
        padding: var(--sp-5) var(--sp-5);
      }
      @media (min-width: 700px) { .hero-panel { padding: var(--sp-6); } }
      .home-tool-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--color-blue-50); color: var(--color-blue);
        margin-bottom: var(--sp-3);
      }
    </style>
    <section class="dot-field dot-field-fluo-on-blue" style="border-radius:0;padding:var(--sp-6) 0;">
      <div class="container">
        <div class="hero-panel">
          <span class="eyebrow" style="color:var(--color-fluo);">Gap-Tallard-Durance</span>
          <h1 style="color:#fff;max-width:14ch;">Où allez-vous aujourd'hui&nbsp;?</h1>
          <p style="color:#fff;max-width:40ch;opacity:.92;">Calculez votre trajet en bus, consultez les prochains passages et suivez le réseau en temps réel.</p>
          <a href="/itineraire" data-link class="btn btn-accent btn-block" style="max-width:420px;margin-top:var(--sp-4);">
            Calculer un itinéraire
          </a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 class="mt-0">Les outils du réseau</h2>
        <div class="grid" style="grid-template-columns:1fr;" id="home-tools-grid">
          <a href="/itineraire" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="home-tool-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.2 17.6 15 8.5"/><path d="M15 8.5h4.5"/><path d="M15 8.5V13"/></svg>
            </span>
            <span class="eyebrow">Itinéraire</span>
            <h3 style="margin-bottom:var(--sp-2);">Calculer un trajet</h3>
            <p class="text-muted" style="margin:0;">Indiquez un départ et une arrivée, obtenez le meilleur trajet en bus.</p>
          </a>
          <a href="/lignes" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="home-tool-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="m16 8 6 2v5h-6"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </span>
            <span class="eyebrow">Lignes</span>
            <h3 style="margin-bottom:var(--sp-2);">Explorer les lignes</h3>
            <p class="text-muted" style="margin:0;">Parcourez les lignes urbaines, scolaires et saisonnières et leurs arrêts.</p>
          </a>
          <a href="/arrets" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="home-tool-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
            </span>
            <span class="eyebrow">Arrêts</span>
            <h3 style="margin-bottom:var(--sp-2);">Prochains passages</h3>
            <p class="text-muted" style="margin:0;">Consultez les prochains passages à votre arrêt, en direct.</p>
          </a>
          <a href="/carte" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="home-tool-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            </span>
            <span class="eyebrow">Carte</span>
            <h3 style="margin-bottom:var(--sp-2);">Voir le réseau</h3>
            <p class="text-muted" style="margin:0;">Visualisez l'ensemble des lignes et arrêts sur une carte interactive.</p>
          </a>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <h2 class="mt-0">Le réseau en un coup d'œil</h2>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--sp-4);">
          <div class="card text-center">
            <div style="font-family:var(--font-heading);font-weight:800;font-size:1.75rem;color:var(--color-blue);">100 % gratuit</div>
            <p class="text-muted" style="margin:var(--sp-2) 0 0;">Aucun titre de transport à acheter, sur tout le réseau.</p>
          </div>
          <div class="card text-center">
            <div style="font-family:var(--font-heading);font-weight:800;font-size:1.75rem;color:var(--color-blue);" id="home-communes-count">17 communes</div>
            <p class="text-muted" style="margin:var(--sp-2) 0 0;">L'ensemble de l'agglomération Gap-Tallard-Durance est desservi.</p>
          </div>
        </div>
        <p class="sr-note" style="margin-top:var(--sp-4);" id="home-lines-note">
          Pas de service les dimanches et jours fériés.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="flex" style="justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:var(--sp-2);">
          <h2 class="mt-0">Actualités</h2>
          <a href="/actualites" data-link class="btn-ghost btn btn-sm">Tout voir</a>
        </div>
        <div class="grid" style="grid-template-columns:1fr;">
          <a href="/actualites" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="status-pill status-info">Info</span>
            <h3 style="margin:var(--sp-2) 0;">Cartes scolaires 2026/2027 : les inscriptions sont ouvertes</h3>
            <p class="text-muted" style="margin:0;">Pensez à inscrire vos enfants avant la rentrée pour garantir leur place dans le bus.</p>
          </a>
          <a href="/infos-trafic" data-link class="card" style="text-decoration:none;color:inherit;">
            <span class="status-pill status-alert">Perturbation</span>
            <h3 style="margin:var(--sp-2) 0;">Travaux en cours : arrêts déplacés</h3>
            <p class="text-muted" style="margin:0;">Plusieurs arrêts sont temporairement déplacés le temps des travaux. Consultez les infos trafic.</p>
          </a>
        </div>
      </div>
    </section>
  `;

  return {
    html,
    mount() {
      const noteEl = document.getElementById('home-lines-note');
      if (!noteEl) return;
      const applyState = (state) => {
        if (state.status === 'ready' && state.data && Array.isArray(state.data.routes)) {
          noteEl.textContent = `${state.data.routes.length} lignes en circulation aujourd'hui · pas de service les dimanches et jours fériés.`;
        }
      };
      applyState(getState());
      const unsubscribe = subscribe(applyState);
      // Le routeur remplace #outlet à chaque navigation : pas besoin de désabonner
      // explicitement, mais on évite les fuites si la page reste montée longtemps.
      window.setTimeout(() => {
        if (!document.getElementById('home-lines-note')) unsubscribe();
      }, 60000);
    },
  };
}
