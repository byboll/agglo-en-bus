import { getRtState, subscribeRt, isRtFresh } from '../gtfs/realtime.js';
import { alertEffectLabel, translatedText } from '../gtfs/helpers.js';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function alertsListHtml(alerts) {
  if (!isRtFresh()) {
    return `<p class="text-muted">Le fil d'alertes temps réel n'est pas disponible pour le moment.</p>`;
  }
  if (!alerts.length) {
    return `<p class="text-muted">Aucune perturbation connue actuellement sur le réseau.</p>`;
  }
  return `
    <div class="grid" style="grid-template-columns:1fr;">
      ${alerts.map((a) => {
        const effect = alertEffectLabel(a.effect);
        const header = translatedText(a.headerText);
        const desc = translatedText(a.descriptionText);
        return `
          <div class="card">
            <span class="status-pill status-alert">Perturbation${effect ? ` · ${escapeHtml(effect)}` : ''}</span>
            ${header ? `<p style="margin:var(--sp-3) 0 0;font-weight:600;">${escapeHtml(header)}</p>` : ''}
            ${desc ? `<p style="margin:var(--sp-2) 0 0;">${escapeHtml(desc)}</p>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

export async function render() {
  const html = `
    <div class="container section">
      <span class="eyebrow">Réseau L'Agglo en bus</span>
      <h1 class="mt-0">Infos trafic</h1>

      <div class="alert alert-info">
        <span aria-hidden="true">ℹ️</span>
        <p style="margin:0;">
          Les perturbations ci-dessous sont issues du fil d'alertes temps réel du réseau (GTFS-RT) et
          peuvent différer légèrement de la réalité en cas de mise à jour tardive côté exploitant.
          Pour une information garantie à jour, consultez le
          <a href="https://www.gap-tallard-durance.fr" target="_blank" rel="noopener">site officiel de l'agglomération</a>
          ou contactez le service Transports : 04&nbsp;92&nbsp;53&nbsp;18&nbsp;19 · <a href="mailto:transports@agglo-gap.fr">transports@agglo-gap.fr</a>
          (du lundi au samedi, 8h-11h45 et 13h30-17h).
        </p>
      </div>

      <h2>Perturbations en cours</h2>
      <div id="infos-trafic-alerts">${alertsListHtml(getRtState().alerts)}</div>

      <h2 style="margin-top:var(--sp-7);">Bon à savoir</h2>
      <div class="card">
        <ul style="margin:0;padding-left:1.1em;">
          <li>Le réseau L'Agglo en bus est <strong>100&nbsp;% gratuit</strong>, sur toutes les lignes.</li>
          <li>Aucun service n'est assuré les <strong>dimanches et jours fériés</strong>.</li>
          <li>En dehors des zones desservies par une ligne régulière, le <strong>Taxibus</strong> (transport à la demande) permet de se déplacer pour 1,50&nbsp;€ le trajet, sur réservation jusqu'à 7 jours à l'avance, du lundi au samedi.</li>
        </ul>
      </div>
    </div>
  `;

  return {
    html,
    mount(container) {
      const alertsEl = container.querySelector('#infos-trafic-alerts');
      if (!alertsEl) return;
      const unsubscribe = subscribeRt((state) => {
        alertsEl.innerHTML = alertsListHtml(state.alerts);
      });
      document.addEventListener('route:willchange', unsubscribe, { once: true });
    },
  };
}
