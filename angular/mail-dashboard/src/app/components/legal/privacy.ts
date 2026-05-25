import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <a routerLink="/" class="back-link">← Retour</a>

        <h1>Politique de Confidentialité</h1>
        <p class="updated">Dernière mise à jour : 25 mai 2026</p>

        <section>
          <h2>1. Présentation du service</h2>
          <p>
            BS Mail Notif ("le Service") est une plateforme de gestion et de notification
            d'e-mails qui permet aux utilisateurs de recevoir des alertes en temps réel,
            d'analyser leur boîte mail via intelligence artificielle et de répondre à leurs
            e-mails directement depuis l'interface.
          </p>
        </section>

        <section>
          <h2>2. Données collectées</h2>
          <p>Lors de l'utilisation du Service, nous collectons :</p>
          <ul>
            <li><strong>Données de compte :</strong> adresse e-mail, nom d'utilisateur.</li>
            <li><strong>Données Gmail via OAuth 2.0 :</strong> contenu et métadonnées des e-mails (objet, expéditeur, corps du message) — uniquement les e-mails auxquels vous nous accordez l'accès.</li>
            <li><strong>Numéro de téléphone :</strong> utilisé pour l'envoi de notifications WhatsApp (optionnel).</li>
            <li><strong>Identifiant Telegram :</strong> utilisé pour l'envoi de notifications Telegram (optionnel).</li>
            <li><strong>Tokens OAuth :</strong> jetons d'accès et de rafraîchissement Gmail, stockés de manière sécurisée.</li>
          </ul>
        </section>

        <section>
          <h2>3. Utilisation des données</h2>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul>
            <li>Vous notifier en temps réel lors de la réception de nouveaux e-mails.</li>
            <li>Analyser et résumer le contenu de votre boîte mail grâce à l'IA (Google Gemini).</li>
            <li>Vous permettre d'envoyer des réponses à vos e-mails depuis l'interface.</li>
            <li>Personnaliser votre expérience (thème, préférences d'affichage).</li>
          </ul>
          <p>
            Nous n'utilisons pas vos données Gmail à des fins publicitaires, de profilage
            commercial ou de revente.
          </p>
        </section>

        <section>
          <h2>4. Partage avec des tiers</h2>
          <p>
            Certaines fonctionnalités nécessitent le traitement de données par des services
            tiers :
          </p>
          <ul>
            <li>
              <strong>Google Gemini API</strong> — Le contenu de vos e-mails est transmis à
              l'API Gemini de Google uniquement lors des analyses IA demandées par vous.
              Ces données sont soumises à la
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
                politique de confidentialité de Google
              </a>.
            </li>
            <li>
              <strong>Green API (WhatsApp)</strong> — Votre numéro de téléphone et les
              notifications textuelles sont transmis pour l'envoi de messages WhatsApp
              (si activé).
            </li>
            <li>
              <strong>Telegram Bot API</strong> — Votre identifiant Telegram est utilisé
              pour l'envoi de notifications (si activé).
            </li>
          </ul>
          <p>
            Aucune donnée n'est vendue ni partagée avec des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2>5. Stockage et sécurité</h2>
          <p>
            Vos données sont stockées dans une base de données PostgreSQL hébergée sur
            Aiven (infrastructure cloud sécurisée). Les tokens OAuth sont chiffrés et
            stockés conformément aux bonnes pratiques de sécurité. Les communications
            entre votre navigateur, notre serveur et les APIs tierces sont chiffrées via
            HTTPS/TLS.
          </p>
        </section>

        <section>
          <h2>6. Durée de conservation</h2>
          <p>
            Vos données sont conservées aussi longtemps que votre compte est actif.
            Vous pouvez à tout moment :
          </p>
          <ul>
            <li>Déconnecter Gmail depuis les Paramètres du tableau de bord (révoque les tokens immédiatement).</li>
            <li>Demander la suppression complète de votre compte en nous contactant.</li>
          </ul>
        </section>

        <section>
          <h2>7. Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez des droits d'accès, de rectification,
            d'effacement, de portabilité et d'opposition concernant vos données personnelles.
            Pour exercer ces droits, contactez-nous à l'adresse ci-dessous.
          </p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>
            Pour toute question relative à la confidentialité de vos données :<br>
            <strong>E-mail :</strong>
            <a href="mailto:kyliyanisse@gmail.com">kyliyanisse@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: #f8fafc;
      padding: 40px 20px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      color: #1e293b;
    }
    .legal-container {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      padding: 48px;
      box-shadow: 0 1px 6px rgba(0,0,0,.08);
    }
    .back-link {
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
      margin-bottom: 32px;
    }
    h1 { font-size: 28px; font-weight: 700; margin: 0 0 6px; }
    .updated { color: #64748b; font-size: 14px; margin-bottom: 36px; }
    h2 { font-size: 17px; font-weight: 600; margin: 28px 0 10px; color: #0f172a; }
    p  { line-height: 1.7; margin: 0 0 12px; font-size: 15px; }
    ul { padding-left: 22px; margin: 0 0 12px; }
    li { line-height: 1.7; font-size: 15px; margin-bottom: 4px; }
    a  { color: #3b82f6; }
    section { border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    section:last-child { border-bottom: none; }
  `]
})
export class Privacy {}
