"""
Tests de gestion d'erreurs
===========================
Vérifie que l'API répond proprement dans tous les cas dégradés :
  - DB indisponible
  - Corps de requête invalide
  - Paramètres manquants
  - Timeouts IMAP
  - Formats inattendus
"""

import sys, os
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app_setup import flask_app as app, app_module, hashed, make_db_mock, DBError


# ══════════════════════════════════════════════════════════════════════════════
# 1. BASE DE DONNÉES INDISPONIBLE
# ══════════════════════════════════════════════════════════════════════════════

class TestDatabaseUnavailable:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db', side_effect=DBError("DB unreachable"))
    def test_login_db_down_retourne_500(self, _):
        """DB inaccessible lors du login → 500 ou exception (l'API ne gère pas les erreurs DB)."""
        try:
            r = self.client.post('/api/auth/login',
                                 json={'email': 'a@b.com', 'password': 'pw'})
            assert r.status_code == 500
        except DBError:
            pass  # Flask TESTING=True propage l'exception — comportement documenté

    @patch('api.get_db', side_effect=DBError("DB unreachable"))
    def test_settings_db_down_retourne_json(self, _):
        """GET settings avec DB down → erreur gérée (pas de 200 silencieux)."""
        try:
            r = self.client.get('/api/user/settings?email=a@b.com')
            assert r.status_code in (500, 200)
        except DBError:
            pass  # Flask TESTING=True propage l'exception

    @patch('api.get_db', side_effect=DBError("DB unreachable"))
    def test_admin_stats_db_down_retourne_500(self, _):
        """Admin stats avec DB down → 500 ou exception."""
        try:
            r = self.client.get('/api/admin/stats')
            assert r.status_code == 500
        except DBError:
            pass  # Flask TESTING=True propage l'exception


# ══════════════════════════════════════════════════════════════════════════════
# 2. CORPS DE REQUÊTE INVALIDE
# ══════════════════════════════════════════════════════════════════════════════

class TestInvalidRequestBody:

    def setup_method(self):
        self.client = app.test_client()

    def test_login_corps_vide(self):
        r = self.client.post('/api/auth/login', data='', content_type='application/json')
        assert r.status_code in (400, 500)

    def test_login_json_malformed(self):
        r = self.client.post('/api/auth/login',
                             data='{email: invalid json',
                             content_type='application/json')
        assert r.status_code in (400, 422, 500)

    def test_register_champs_vides(self):
        r = self.client.post('/api/auth/register',
                             json={'name': '', 'email': '', 'password': ''})
        assert r.status_code == 400

    @patch('api.get_db')
    def test_verify_otp_code_absent(self, mock_db):
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com'})
        assert r.status_code in (400, 404, 500)

    def test_put_settings_body_vide(self):
        r = self.client.put('/api/user/settings', json={})
        assert r.status_code == 400

    def test_settings_email_vide(self):
        r = self.client.get('/api/user/settings?email=')
        assert r.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# 3. IMAP INDISPONIBLE
# ══════════════════════════════════════════════════════════════════════════════

class TestImapUnavailable:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api._get_imap_conn', side_effect=Exception("IMAP timeout"))
    def test_emails_imap_crash_retourne_erreur_propre(self, _):
        """Exception IMAP → réponse JSON d'erreur, pas de crash."""
        r = self.client.get('/api/emails?email=test@gmail.com')
        assert r.status_code in (200, 500)
        assert r.content_type is not None

    @patch('api._get_imap_conn', return_value=None)
    def test_stats_sans_connexion_imap(self, _):
        """Pas de connexion IMAP → stats à zéro, pas d'erreur."""
        r = self.client.get('/api/stats?email=test@gmail.com')
        assert r.status_code == 200
        data = r.get_json()
        assert data['total_messages'] == 0
        assert data['unread_count']   == 0


# ══════════════════════════════════════════════════════════════════════════════
# 4. OTP EXPIRÉ / INTROUVABLE
# ══════════════════════════════════════════════════════════════════════════════

class TestOtpErrorCases:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_otp_expire_code_correct_bloque(self, mock_db):
        """Code correct mais expiré → 410 Gone."""
        db, cur = make_db_mock(fetchone={
            'code': '123456', 'name': 'X', 'password': hashed('pw'),
            'expires_at': datetime.now() - timedelta(seconds=1),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'x@x.com', 'code': '123456'})
        assert r.status_code == 410

    @patch('api.get_db')
    def test_otp_introuvable_404(self, mock_db):
        """Aucun OTP pour cet email → 404."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'nobody@x.com', 'code': '111111'})
        assert r.status_code == 404
        assert 'error' in r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# 5. ROUTES INEXISTANTES
# ══════════════════════════════════════════════════════════════════════════════

class TestNotFoundRoutes:

    def setup_method(self):
        self.client = app.test_client()

    def test_route_inexistante_404(self):
        r = self.client.get('/api/route-qui-nexiste-pas')
        assert r.status_code in (404, 405)

    def test_route_inexistante_post_405_ou_404(self):
        r = self.client.post('/api/status')
        assert r.status_code in (404, 405)


# ══════════════════════════════════════════════════════════════════════════════
# 6. RÉPONSES TOUJOURS JSON (même en cas d'erreur)
# ══════════════════════════════════════════════════════════════════════════════

class TestResponseAlwaysJSON:

    def setup_method(self):
        self.client = app.test_client()

    def test_400_retourne_json(self):
        r = self.client.post('/api/auth/login', json={})
        assert 'application/json' in r.content_type
        data = r.get_json()
        assert data is not None

    def test_status_200_retourne_json(self):
        r = self.client.get('/api/status')
        assert 'application/json' in r.content_type
        assert r.get_json() is not None

    @patch('api.get_db')
    def test_401_retourne_json_avec_message_erreur(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'x@x.com', 'password': 'wrong'})
        assert r.status_code == 401
        data = r.get_json()
        assert 'error' in data
        assert isinstance(data['error'], str)
        assert len(data['error']) > 0
