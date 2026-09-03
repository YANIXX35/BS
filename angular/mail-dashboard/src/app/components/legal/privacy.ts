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
        <p class="updated">Dernière mise à jour : 3 septembre 2026</p>

        <section>
          <h2>1. Présentation du service</h2>
          <p>
            NotifyMails ("le Service") est une plateforme SaaS de surveillance de boîte Gmail
            avec notifications multi-canal (Telegram, WhatsApp, SMS). Elle permet aux utilisateurs
            de recevoir des alertes en temps réel lors de la réception de nouveaux e-mails,
            d'analyser leur boîte mail via intelligence artificielle et de répondre à leurs
            e-mails directement depuis WhatsApp ou Telegram.
          </p>
          <p>
            NotifyMails est édité par Yanisse Kyliane Kouassi Yao, domiciliée en Côte d'Ivoire.
            Contact : <a href="mailto:kyliyanisse@gmail.com">kyliyanisse@gmail.com</a>
          </p>
        </section>

        <section>
          <h2>2. Conformité Google API Services User Data Policy</h2>
          <p>
            L'utilisation par NotifyMails des informations reçues des API Google respecte la
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">
              Politique de données utilisateur des services API Google
            </a>, y compris les exigences d'utilisation limitée (Limited Use).
          </p>
          <p>En particulier, NotifyMails :</p>
          <ul>
            <li>N'utilise les données Gmail que pour fournir ou améliorer les fonctionnalités de notification décrites dans cette politique.</li>
            <li>Ne transfère pas les données Gmail à des tiers sauf pour fournir le service, avec votre consentement explicite, ou tel que requis par la loi.</li>
            <li>N'utilise pas les données Gmail à des fins publicitaires.</li>
            <li>Ne permet pas à des humains de lire vos e-mails, sauf si vous y consentez explicitement, si cela est nécessaire pour la sécurité, ou si requis par la loi.</li>
          </ul>
        </section>

        <section>
          <h2>3. Données collectées</h2>
          <p>Lors de l'utilisation du Service, nous collectons :</p>
          <ul>
            <li><strong>Données de compte :</strong> adresse e-mail, nom d'utilisateur, mot de passe hashé (bcrypt).</li>
            <li><strong>Données Gmail via OAuth 2.0 :</strong> métadonnées des e-mails (objet, expéditeur, résumé) — uniquement pour vous notifier en temps réel. Nous ne stockons pas le corps complet de vos e-mails.</li>
            <li><strong>Tokens OAuth Gmail :</strong> jetons d'accès et de rafraîchissement, chiffrés (Fernet AES-128) en base de données.</li>
            <li><strong>Numéro de téléphone :</strong> utilisé pour l'envoi de notifications WhatsApp/SMS (optionnel).</li>
            <li><strong>Identifiant Telegram :</strong> utilisé pour l'envoi de notifications Telegram (optionnel).</li>
            <li><strong>Données de navigation :</strong> adresse IP (logs serveur), horodatage des connexions.</li>
          </ul>
        </section>

        <section>
          <h2>4. Finalités du traitement</h2>
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul>
            <li>Détecter les nouveaux e-mails entrants dans votre boîte Gmail et vous envoyer une notification (Telegram, WhatsApp ou SMS).</li>
            <li>Analyser et résumer le contenu de votre boîte mail grâce à l'IA (Google Gemini), à votre demande.</li>
            <li>Vous permettre de répondre à vos e-mails depuis WhatsApp ou Telegram.</li>
            <li>Détecter les tentatives de phishing et de spam dans vos e-mails.</li>
            <li>Personnaliser votre expérience (thème, préférences).</li>
            <li>Assurer la sécurité du service (authentification, journaux d'accès).</li>
          </ul>
          <p>
            Nous n'utilisons pas vos données Gmail à des fins publicitaires, de profilage
            commercial ou de revente.
          </p>
        </section>

        <section>
          <h2>5. Partage avec des tiers</h2>
          <p>Certaines fonctionnalités nécessitent le traitement de données par des services tiers :</p>
          <ul>
            <li><strong>Google Gemini API</strong> — Le contenu de vos e-mails est transmis à l'API Gemini de Google uniquement lors des analyses IA demandées par vous. Soumis à la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">politique de confidentialité de Google</a>.</li>
            <li><strong>Telegram Bot API</strong> — Votre identifiant Telegram et le contenu des notifications sont transmis à Telegram (si activé).</li>
            <li><strong>Vonage / Twilio (WhatsApp & SMS)</strong> — Votre numéro de téléphone et les notifications textuelles sont transmis pour l'envoi de messages (si activé).</li>
            <li><strong>Cloudinary</strong> — Vos photos de profil sont hébergées sur Cloudinary.</li>
            <li><strong>Neon / PostgreSQL</strong> — Vos données de compte sont stockées dans une base de données hébergée sur Neon (cloud sécurisé).</li>
          </ul>
          <p>Aucune donnée n'est vendue ni partagée avec des tiers à des fins commerciales.</p>
        </section>

        <section>
          <h2>6. Stockage et sécurité</h2>
          <p>
            Vos données sont stockées dans une base de données PostgreSQL (Neon). Les tokens OAuth
            sont chiffrés avec l'algorithme Fernet (AES-128-CBC + HMAC-SHA256). Les mots de passe
            sont hashés avec bcrypt. Toutes les communications sont chiffrées via HTTPS/TLS.
            Le serveur est hébergé sur Render.com (infrastructure cloud sécurisée).
          </p>
        </section>

        <section>
          <h2>7. Durée de conservation</h2>
          <p>Vos données sont conservées aussi longtemps que votre compte est actif. Vous pouvez à tout moment :</p>
          <ul>
            <li>Déconnecter Gmail depuis les Paramètres (révoque les tokens immédiatement).</li>
            <li>Exporter toutes vos données personnelles depuis les Paramètres → "Exporter mes données".</li>
            <li>Supprimer définitivement votre compte depuis les Paramètres → "Supprimer mon compte".</li>
          </ul>
        </section>

        <section>
          <h2>8. Vos droits (RGPD)</h2>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
          </p>
          <ul>
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
            <li><strong>Droit de rectification :</strong> corriger vos données inexactes.</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données.</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données.</li>
          </ul>
          <p>Pour exercer ces droits : <a href="mailto:kyliyanisse@gmail.com">kyliyanisse@gmail.com</a></p>
        </section>

        <section>
          <h2>9. Cookies</h2>
          <p>
            NotifyMails utilise uniquement des cookies techniques essentiels au fonctionnement
            du service (authentification JWT, préférences de session). Aucun cookie publicitaire
            ou de traçage tiers n'est utilisé.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Pour toute question relative à la confidentialité de vos données :<br>
            <strong>E-mail :</strong> <a href="mailto:kyliyanisse@gmail.com">kyliyanisse@gmail.com</a><br>
            <strong>Site :</strong> <a href="https://notifymails.com" target="_blank">https://notifymails.com</a>
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
