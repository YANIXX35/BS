import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-container">
        <a routerLink="/" class="back-link">← Retour</a>

        <h1>Conditions d'Utilisation</h1>
        <p class="updated">Dernière mise à jour : 25 mai 2026</p>

        <section>
          <h2>1. Acceptation des conditions</h2>
          <p>
            En accédant à BS Mail Notif et en utilisant ses fonctionnalités, vous acceptez
            les présentes Conditions d'Utilisation. Si vous n'acceptez pas ces conditions,
            veuillez ne pas utiliser le Service.
          </p>
        </section>

        <section>
          <h2>2. Description du service</h2>
          <p>
            BS Mail Notif est une plateforme permettant de recevoir des notifications
            d'e-mails en temps réel, d'analyser sa boîte de réception via intelligence
            artificielle et de gérer ses e-mails depuis une interface unifiée.
          </p>
        </section>

        <section>
          <h2>3. Compte utilisateur</h2>
          <p>
            Pour utiliser le Service, vous devez créer un compte avec une adresse e-mail
            valide. Vous êtes responsable de la confidentialité de vos identifiants et de
            toutes les actions effectuées depuis votre compte.
          </p>
        </section>

        <section>
          <h2>4. Connexion Gmail (OAuth 2.0)</h2>
          <p>
            Le Service utilise le protocole OAuth 2.0 de Google pour accéder à votre boîte
            Gmail. En autorisant la connexion :
          </p>
          <ul>
            <li>Vous accordez au Service l'accès en lecture à vos e-mails (<code>gmail.readonly</code>).</li>
            <li>Vous accordez au Service la capacité d'envoyer des e-mails en votre nom (<code>gmail.send</code>), uniquement à votre demande explicite.</li>
            <li>Vous pouvez révoquer cet accès à tout moment depuis les Paramètres du tableau de bord ou depuis votre compte Google (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>).</li>
          </ul>
        </section>

        <section>
          <h2>5. Utilisation acceptable</h2>
          <p>Vous vous engagez à ne pas utiliser le Service pour :</p>
          <ul>
            <li>Envoyer des spams ou des communications non sollicitées.</li>
            <li>Violer les droits de tiers.</li>
            <li>Tenter d'accéder aux données d'autres utilisateurs.</li>
            <li>Perturber le fonctionnement du Service.</li>
          </ul>
        </section>

        <section>
          <h2>6. Disponibilité du service</h2>
          <p>
            Nous nous efforçons d'assurer la disponibilité du Service, mais ne garantissons
            pas une disponibilité ininterrompue. Le Service peut être suspendu pour
            maintenance ou en cas de circonstances imprévues.
          </p>
        </section>

        <section>
          <h2>7. Limitation de responsabilité</h2>
          <p>
            Le Service est fourni "tel quel". Nous ne sommes pas responsables des pertes
            de données, interruptions de service ou dommages indirects résultant de
            l'utilisation du Service. L'utilisation des fonctionnalités d'envoi d'e-mails
            est sous votre entière responsabilité.
          </p>
        </section>

        <section>
          <h2>8. Modifications</h2>
          <p>
            Nous nous réservons le droit de modifier ces Conditions d'Utilisation à tout
            moment. Les modifications entrent en vigueur dès leur publication. L'utilisation
            continue du Service vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            Pour toute question concernant ces conditions :<br>
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
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    section { border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    section:last-child { border-bottom: none; }
  `]
})
export class Terms {}
