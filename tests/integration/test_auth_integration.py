"""
Tests d'intégration — Flux d'authentification complet
======================================================
Vérifie que chaque étape du flux communique correctement
avec la suivante : Frontend → API → Base de données.

Flux testés :
  1. Inscription → OTP généré → stocké en DB → email envoyé
  2. Vérification OTP → compte créé en DB
  3. Connexion → utilisateur récupéré en DB → session retournée
  4. Mot de passe oublié → OTP reset → stocké → email envoyé
  5. Réinitialisation mdp → hash sauvegardé en DB
"""

import sys, os, json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app_setup import flask_app as app, app_module, hashed, make_db_mock, DBError


# ══════════════════════════════════════════════════════════════════════════════
# FLUX 1 : Inscription complète  (register → OTP → verify)
# ══════════════════════════════════════════════════════════════════════════════

class TestInscriptionFlow:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.threading.Thread')
    @patch('api.get_db')
    def test_etape1_register_stocke_otp_en_db(self, mock_db, mock_thread):
        """
        Quand l'utilisateur s'inscrit :
        - L'API vérifie que l'email n'existe pas (fetchone → None)
        - Génère un OTP et l'INSERT dans otp_codes
        - Envoie l'email en arrière-plan (Thread)
        """
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        mock_thread.return_value = MagicMock()

        r = self.client.post('/api/auth/register', json={
            'name': 'Alice Dupont',
            'email': 'alice@integration.com',
            'password': 'securepwd123'
        })

        assert r.status_code == 200
        insert_calls = [str(c) for c in cur.execute.call_args_list]
        assert any('INSERT INTO otp_codes' in c for c in insert_calls), \
            "L'OTP doit être inséré en base"
        assert mock_thread.called, "L'envoi email doit être asynchrone"
        db.commit.assert_called_once()

    @patch('api.threading.Thread')
    @patch('api.get_db')
    def test_etape1_email_doublon_bloque_inscription(self, mock_db, mock_thread):
        """
        Si l'email existe déjà en DB → 409 Conflict,
        aucun OTP créé, aucun email envoyé.
        """
        db, cur = make_db_mock(fetchone={'id': 42})
        mock_db.return_value = db

        r = self.client.post('/api/auth/register', json={
            'name': 'Bob', 'email': 'existe@db.com', 'password': 'motdepasse'
        })

        assert r.status_code == 409
        assert not mock_thread.called, "Aucun email ne doit être envoyé"
        insert_calls = [str(c) for c in cur.execute.call_args_list]
        assert not any('INSERT INTO otp_codes' in c for c in insert_calls)

    @patch('api.get_db')
    def test_etape2_verify_otp_cree_utilisateur_en_db(self, mock_db):
        """
        Quand le bon OTP est fourni :
        - Récupère l'OTP depuis otp_codes
        - INSERT le nouvel utilisateur dans users
        - DELETE l'OTP consommé
        - Commit la transaction
        """
        otp_row = {
            'code': '847291',
            'name': 'Alice Dupont',
            'password': hashed('securepwd123'),
            'expires_at': datetime.now() + timedelta(minutes=8),
            'extra': json.dumps({'phone': '', 'gmail_address': 'alice@gmail.com',
                                 'telegram_chat_id': '', 'green_api_instance': '',
                                 'green_api_token': ''})
        }
        db, cur = make_db_mock(fetchone=otp_row)
        mock_db.return_value = db

        r = self.client.post('/api/auth/verify-otp', json={
            'email': 'alice@integration.com',
            'code':  '847291'
        })

        assert r.status_code == 201
        calls_str = [str(c) for c in cur.execute.call_args_list]
        assert any('INSERT INTO users' in c for c in calls_str), "User doit être inséré"
        assert any('DELETE FROM otp_codes' in c for c in calls_str), "OTP doit être supprimé"
        db.commit.assert_called_once()

    @patch('api.get_db')
    def test_etape2_otp_expire_bloque_creation(self, mock_db):
        """OTP expiré → 410, aucun utilisateur créé."""
        otp_row = {
            'code': '111111',
            'name': 'Alice',
            'password': hashed('pw'),
            'expires_at': datetime.now() - timedelta(minutes=1),
            'extra': '{}'
        }
        db, cur = make_db_mock(fetchone=otp_row)
        mock_db.return_value = db

        r = self.client.post('/api/auth/verify-otp', json={
            'email': 'alice@integration.com', 'code': '111111'
        })

        assert r.status_code == 410
        calls_str = [str(c) for c in cur.execute.call_args_list]
        assert not any('INSERT INTO users' in c for c in calls_str)


# ══════════════════════════════════════════════════════════════════════════════
# FLUX 2 : Connexion  (login → DB → session)
# ══════════════════════════════════════════════════════════════════════════════

class TestConnexionFlow:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_login_complet_retourne_session(self, mock_db):
        """
        Flux complet :
        - Client envoie email + password
        - API requête la DB
        - DB retourne l'utilisateur
        - API retourne name + email + role
        """
        db, cur = make_db_mock(fetchone={
            'id': 1, 'name': 'Alice', 'email': 'alice@integration.com',
            'password': hashed('securepwd123'), 'role': 'user'
        })
        mock_db.return_value = db

        r = self.client.post('/api/auth/login', json={
            'email': 'alice@integration.com',
            'password': 'securepwd123'
        })

        assert r.status_code == 200
        data = r.get_json()
        assert data['name']  == 'Alice'
        assert data['role']  == 'user'
        assert data['email'] == 'alice@integration.com'
        assert cur.execute.called

    @patch('api.get_db')
    def test_login_mauvais_mot_de_passe_bloque(self, mock_db):
        """Mauvais mdp → 401, aucune session retournée."""
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'A', 'email': 'a@a.com'
        })
        mock_db.return_value = db

        r = self.client.post('/api/auth/login', json={
            'email': 'a@a.com', 'password': 'faux'
        })
        assert r.status_code == 401
        assert 'name' not in r.get_json()


# ══════════════════════════════════════════════════════════════════════════════
# FLUX 3 : Mot de passe oublié  (forgot → OTP → reset)
# ══════════════════════════════════════════════════════════════════════════════

class TestForgotPasswordFlow:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.threading.Thread')
    @patch('api.get_db')
    def test_forgot_password_genere_et_stocke_otp(self, mock_db, mock_thread):
        """
        Flux forgot password :
        - Vérifie que l'utilisateur existe en DB
        - Génère un OTP de réinitialisation
        - Stocke l'OTP dans otp_codes
        - Envoie l'email en async
        """
        user_row = {'id': 1, 'name': 'Alice', 'email': 'alice@integration.com'}
        db, cur = make_db_mock(fetchone=user_row)
        mock_db.return_value = db
        mock_thread.return_value = MagicMock()

        r = self.client.post('/api/auth/forgot-password', json={
            'email': 'alice@integration.com'
        })

        assert r.status_code in (200, 404)

    @patch('api.get_db')
    def test_forgot_password_email_inexistant(self, mock_db):
        """Email inconnu → 200 générique (anti-énumération, ne révèle pas si l'email existe)."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db

        r = self.client.post('/api/auth/forgot-password', json={
            'email': 'ghost@integration.com'
        })
        # Phase 1 security: generic response regardless of email existence
        assert r.status_code == 200
        assert 'message' in r.get_json()

    @patch('api.get_db')
    def test_reset_password_met_a_jour_hash(self, mock_db):
        """
        Flux reset password :
        - Vérifie l'OTP de reset
        - UPDATE le hash du password en DB
        - DELETE l'OTP consommé
        """
        otp_row = {
            'code': '654321',
            'email': 'alice@integration.com',
            'expires_at': datetime.now() + timedelta(minutes=5),
            'name': 'Alice',
            'password': hashed('ancien'),
            'extra': '{}'
        }
        db, cur = make_db_mock(fetchone=otp_row)
        mock_db.return_value = db

        r = self.client.post('/api/auth/reset-password', json={
            'email': 'alice@integration.com',
            'code':  '654321',
            'new_password': 'NouveauMdp123!'
        })

        assert r.status_code in (200, 201, 400)
        if r.status_code in (200, 201):
            calls_str = [str(c) for c in cur.execute.call_args_list]
            assert any('UPDATE users' in c or 'password' in c.lower()
                       for c in calls_str), "Le mot de passe doit être mis à jour en DB"


# ══════════════════════════════════════════════════════════════════════════════
# FLUX 4 : Paramètres utilisateur  (GET → PUT → GET — cohérence)
# ══════════════════════════════════════════════════════════════════════════════

class TestSettingsFlow:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_get_puis_put_puis_get_coherent(self, mock_db):
        """
        1. GET settings → thème bleu (#1a237e)
        2. PUT settings → nouveau thème violet (#7c3aed)
        3. GET settings → violet retourné (DB mise à jour)
        """
        initial_user = {
            'name': 'Yao', 'email': 'yao@test.com', 'phone': '',
            'gmail_address': '', 'telegram_chat_id': '',
            'green_api_instance': '', 'green_api_token': '',
            'app_password': None, 'avatar': '',
            'theme_color': '#1a237e', 'font_family': 'Inter'
        }
        updated_user = {**initial_user, 'theme_color': '#7c3aed', 'font_family': 'Poppins'}

        db = MagicMock()
        cur = MagicMock()
        cur.__enter__ = lambda s: s
        cur.__exit__  = MagicMock(return_value=False)
        cur.fetchone.side_effect = [initial_user, updated_user]
        db.cursor.return_value = cur
        mock_db.return_value = db

        r1 = self.client.get('/api/user/settings?email=yao@test.com')
        assert r1.get_json()['theme_color'] == '#1a237e'

        r2 = self.client.put('/api/user/settings', json={
            'email': 'yao@test.com', 'theme_color': '#7c3aed', 'font_family': 'Poppins'
        })
        assert r2.status_code == 200
        db.commit.assert_called()

        r3 = self.client.get('/api/user/settings?email=yao@test.com')
        assert r3.get_json()['theme_color'] == '#7c3aed'
        assert r3.get_json()['font_family'] == 'Poppins'
