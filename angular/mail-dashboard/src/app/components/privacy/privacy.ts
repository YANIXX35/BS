import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './privacy.html',
  styleUrl: './privacy.scss'
})
export class Privacy {
  lastUpdated = '12 mai 2025';

  sections = [
    {
      icon: 'person',
      title: 'Données collectées',
      items: [
        { label: 'Identité', text: 'Nom, adresse e-mail et mot de passe hashé (bcrypt) lors de l\'inscription.' },
        { label: 'Gmail OAuth', text: 'Tokens d\'accès et de rafraîchissement OAuth2 Google, nécessaires uniquement pour lire tes e-mails entrants.' },
        { label: 'Notifications', text: 'Identifiant Telegram (chat ID) et/ou numéro de téléphone + credentials GreenAPI pour WhatsApp.' },
        { label: 'Préférences', text: 'Thème visuel, photo de profil (stockée en base64), paramètres de notification.' },
        { label: 'Logs techniques', text: 'Adresses IP (rate limiting uniquement, non persistées), timestamps de connexion.' },
      ]
    },
    {
      icon: 'settings',
      title: 'Utilisation des données',
      items: [
        { label: 'Service principal', text: 'Surveiller ta boite Gmail et t\'envoyer une alerte sur Telegram et/ou WhatsApp à chaque nouvel e-mail.' },
        { label: 'IA de tri', text: 'Résumé intelligent de tes e-mails via Gemini AI (Google). Seuls les sujets et aperçus sont transmis — jamais le contenu complet.' },
        { label: 'Statistiques', text: 'Nombre d\'e-mails reçus et de notifications envoyées, affichés dans ton tableau de bord personnel.' },
        { label: 'Amélioration', text: 'Données agrégées et anonymisées pour améliorer la fiabilité du service. Aucune analyse individuelle.' },
      ]
    },
    {
      icon: 'lock',
      title: 'Sécurité',
      items: [
        { label: 'Authentification', text: 'JWT signé (HS256) avec expiration 24h. Tout endpoint sensible est protégé par token.' },
        { label: 'Mots de passe', text: 'Hashés avec bcrypt (coût 12) — le mot de passe en clair n\'est jamais stocké ni transmis.' },
        { label: 'Transport', text: 'Toutes les communications passent par HTTPS/TLS 1.3. Le backend est hébergé sur Render (infrastructure sécurisée).' },
        { label: 'OAuth2', text: 'L\'accès Gmail utilise le protocole OAuth2 officiel de Google. Aucun mot de passe Gmail n\'est collecté.' },
        { label: 'Rate limiting', text: 'Les endpoints sont protégés contre les abus (brute-force, spam) via un système de limitation de débit.' },
      ]
    },
    {
      icon: 'share',
      title: 'Services tiers',
      items: [
        { label: 'Google Gmail API', text: 'Lecture des e-mails entrants. Soumis à la Politique de confidentialité de Google.' },
        { label: 'Telegram Bot API', text: 'Envoi des alertes sur Telegram. Aucune donnée personnelle n\'est partagée avec Telegram au-delà du message d\'alerte.' },
        { label: 'GreenAPI (WhatsApp)', text: 'Envoi des alertes WhatsApp via GreenAPI. Seuls le numéro et le message sont transmis.' },
        { label: 'Gemini AI (Google)', text: 'Analyse IA des e-mails. Les contenus sont traités selon la politique d\'utilisation de l\'API Google Gemini.' },
        { label: 'Render', text: 'Hébergement du backend. Données stockées en Europe/US selon les conditions de Render Inc.' },
      ]
    },
    {
      icon: 'schedule',
      title: 'Conservation des données',
      items: [
        { label: 'Compte actif', text: 'Tes données sont conservées tant que ton compte est actif.' },
        { label: 'Suppression', text: 'Tu peux demander la suppression complète de ton compte et de toutes tes données à tout moment.' },
        { label: 'E-mails', text: 'Les e-mails affichés dans le dashboard sont lus en temps réel depuis Gmail — ils ne sont pas stockés sur nos serveurs.' },
        { label: 'Tokens OAuth', text: 'Révocables à tout moment depuis ton compte Google (myaccount.google.com/permissions).' },
      ]
    },
    {
      icon: 'gavel',
      title: 'Tes droits',
      items: [
        { label: 'Accès', text: 'Tu peux consulter toutes tes données depuis la page Paramètres de ton dashboard.' },
        { label: 'Rectification', text: 'Tu peux modifier tes informations (nom, téléphone, identifiants de notification) à tout moment.' },
        { label: 'Suppression', text: 'Droit à l\'effacement : contacte-nous pour supprimer définitivement ton compte et toutes les données associées.' },
        { label: 'Portabilité', text: 'Tes données te sont transmises sur simple demande dans un format lisible (JSON).' },
        { label: 'Opposition', text: 'Tu peux désactiver les notifications Telegram et/ou WhatsApp à tout moment depuis les paramètres.' },
      ]
    },
  ];

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/'], { replaceUrl: false });
  }
}
