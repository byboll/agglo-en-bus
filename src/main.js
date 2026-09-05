import './styles/base.css';
import './styles/layout.css';
import 'leaflet/dist/leaflet.css';

import { registerRoute, setNotFound, startRouter } from './router.js';
import { headerHtml, footerHtml, bottomNavHtml, disclaimerBannerHtml, mountLayoutBehavior } from './components/layout.js';
import { initGtfs, subscribe, getState } from './gtfs/store.js';
import { registerServiceWorker, setupInstallPrompt } from './pwa/register.js';
import { mountTripModal } from './components/tripModal.js';

import { render as renderHome } from './pages/home.js';
import { render as renderActualites } from './pages/actualites.js';
import { render as renderInfosTrafic } from './pages/infosTrafic.js';
import { render as renderReseau } from './pages/reseau.js';
import { render as renderAccessibilite } from './pages/accessibilite.js';
import { render as renderContact } from './pages/contact.js';
import { render as renderMentionsLegales } from './pages/mentionsLegales.js';
import { render as renderConfidentialite } from './pages/confidentialite.js';
import { render as renderNotFound } from './pages/notFound.js';

import { render as renderLignes } from './pages/lignes.js';
import { render as renderLigneDetail } from './pages/ligneDetail.js';
import { render as renderArrets } from './pages/arrets.js';
import { render as renderArretDetail } from './pages/arretDetail.js';

import { render as renderCarte } from './pages/carte.js';
import { render as renderItineraire } from './pages/itineraire.js';

/* ------------------------------------------------------------------ */
/* Écran de démarrage — import GTFS                                    */
/* ------------------------------------------------------------------ */
const bootOverlay = document.getElementById('gtfs-boot-overlay');
const bootBar = document.getElementById('boot-bar');
const bootLabel = document.getElementById('boot-label');

function updateBoot(state) {
  if (!bootOverlay || bootOverlay.hidden) return;
  if (state.status === 'loading') {
    bootBar.style.width = (state.progress?.pct || 0) + '%';
    bootLabel.textContent = state.progress?.label || 'Récupération des données du réseau…';
  } else if (state.status === 'ready' || state.status === 'error') {
    bootBar.style.width = '100%';
    hideBoot();
  }
}
let bootHidden = false;
function hideBoot() {
  if (bootHidden || !bootOverlay) return;
  bootHidden = true;
  bootOverlay.style.opacity = '0';
  bootOverlay.style.transition = 'opacity .35s ease';
  setTimeout(() => bootOverlay.setAttribute('hidden', ''), 350);
}
// Sécurité : si le réseau est trop lent, ne pas bloquer l'affichage du site indéfiniment.
const BOOT_TIMEOUT_MS = 8000;
setTimeout(hideBoot, BOOT_TIMEOUT_MS);

subscribe(updateBoot);

/* ------------------------------------------------------------------ */
/* Montage de la coquille d'application (une seule fois)                */
/* ------------------------------------------------------------------ */
const app = document.getElementById('app');
app.innerHTML = `
  ${headerHtml()}
  ${disclaimerBannerHtml()}
  <main id="outlet" tabindex="-1"></main>
  ${bottomNavHtml()}
  ${footerHtml()}
`;
mountLayoutBehavior();
mountTripModal();

/* ------------------------------------------------------------------ */
/* Déclaration des routes                                               */
/* ------------------------------------------------------------------ */
registerRoute('/', renderHome);
registerRoute('/actualites', renderActualites);
registerRoute('/infos-trafic', renderInfosTrafic);
registerRoute('/reseau', renderReseau);
registerRoute('/accessibilite', renderAccessibilite);
registerRoute('/contact', renderContact);
registerRoute('/mentions-legales', renderMentionsLegales);
registerRoute('/confidentialite', renderConfidentialite);

registerRoute('/lignes', renderLignes);
registerRoute('/lignes/:id', renderLigneDetail);
registerRoute('/arrets', renderArrets);
registerRoute('/arrets/:id', renderArretDetail);

registerRoute('/carte', renderCarte);
registerRoute('/itineraire', renderItineraire);

setNotFound(renderNotFound);

const outlet = document.getElementById('outlet');
startRouter(outlet);

/* ------------------------------------------------------------------ */
/* GTFS + PWA                                                           */
/* ------------------------------------------------------------------ */
initGtfs();
registerServiceWorker();
setupInstallPrompt();

// Expose en dev pour débogage rapide dans la console.
if (import.meta.env.DEV) {
  window.__agglo = { getState };
}
