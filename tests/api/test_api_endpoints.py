"""
Tests API — Validation complète de tous les endpoints
======================================================
Teste : status codes, format JSON, champs requis, méthodes HTTP.
"""

import sys, os
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app_setup import flask_app as app, app_module, hashed, make_db_mock, DBError


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/status
# ══════════════════════════════════════════════════════════════════════════════

class TestStatusEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    def test_get_200(self):
        assert self.client.get('/api/status').status_code == 200

    def test_schema_json(self):
        data = self.client.get('/api/status').get_json()
        assert 'running'  in data
        assert 'telegram' in data
        assert 'whatsapp' in data

    def test_methode_post_non_autorisee(self):
        r = self.client.post('/api/status')
        assert r.status_code == 405

    def test_methode_put_non_autorisee(self):
        r = self.client.put('/api/status')
        assert r.status_code == 405


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/auth/register
# ══════════════════════════════════════════════════════════════════════════════

class TestRegisterEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.send_otp_email')
    @patch('api.get_db')
    def test_200_inscription_valide(self, mock_db, mock_send):
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'email': 'new@test.com', 'password': 'password123'
        })
        assert r.status_code in (200, 201)

    def test_400_sans_nom(self):
        r = self.client.post('/api/auth/register', json={
            'email': 'x@x.com', 'password': 'password123'
        })
        assert r.status_code == 400

    def test_400_sans_email(self):
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'password': 'password123'
        })
        assert r.status_code == 400

    def test_400_sans_password(self):
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'email': 'x@x.com'
        })
        assert r.status_code == 400

    def test_400_password_trop_court(self):
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'email': 'x@x.com', 'password': 'abc'
        })
        assert r.status_code == 400
        assert 'court' in r.get_json().get('error', '').lower()

    @patch('api.get_db')
    def test_409_email_duplique(self, mock_db):
        db, cur = make_db_mock(fetchone={'id': 1})
        mock_db.return_value = db
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'email': 'exist@test.com', 'password': 'password123'
        })
        assert r.status_code == 409

    def test_get_non_autorise(self):
        assert self.client.get('/api/auth/register').status_code == 405


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/auth/login
# ══════════════════════════════════════════════════════════════════════════════

class TestLoginEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_200_login_valide(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Yao', 'email': 'yao@test.com',
            'password': hashed('monpass'), 'role': 'user'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'yao@test.com', 'password': 'monpass'})
        assert r.status_code == 200
        data = r.get_json()
        assert set(data.keys()) >= {'name', 'email', 'role'}

    @patch('api.get_db')
    def test_401_mauvais_password(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'x@x.com', 'password': 'wrong'})
        assert r.status_code == 401
        assert 'error' in r.get_json()

    def test_400_body_vide(self):
        assert self.client.post('/api/auth/login', json={}).status_code == 400

    def test_400_email_manquant(self):
        r = self.client.post('/api/auth/login', json={'password': 'pw'})
        assert r.status_code == 400

    def test_400_password_manquant(self):
        r = self.client.post('/api/auth/login', json={'email': 'a@b.com'})
        assert r.status_code == 400

    def test_schema_reponse_erreur_contient_error_key(self):
        r = self.client.post('/api/auth/login', json={})
        assert 'error' in r.get_json()

    @patch('api.get_db')
    def test_reponse_ne_contient_pas_le_hash(self, mock_db):
        """Le hash du mot de passe ne doit JAMAIS être retourné."""
        db, cur = make_db_mock(fetchone={
            'name': 'Yao', 'email': 'yao@test.com',
            'password': hashed('monpass'), 'role': 'user'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'yao@test.com', 'password': 'monpass'})
        data = r.get_json()
        assert 'password' not in data, "Le hash du mdp NE DOIT PAS être exposé"


# ══════════════════════════════════════════════════════════════════════════════
# POST /api/auth/verify-otp
# ══════════════════════════════════════════════════════════════════════════════

class TestVerifyOtpEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_201_otp_valide(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '123456', 'name': 'Test', 'password': hashed('pw'),
            'expires_at': datetime.now() + timedelta(minutes=5),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com', 'code': '123456'})
        assert r.status_code == 201

    @patch('api.get_db')
    def test_401_mauvais_code(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '999999', 'name': 'Test', 'password': hashed('pw'),
            'expires_at': datetime.now() + timedelta(minutes=5),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com', 'code': '000000'})
        assert r.status_code == 401

    @patch('api.get_db')
    def test_410_otp_expire(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '123456', 'name': 'Test', 'password': hashed('pw'),
            'expires_at': datetime.now() - timedelta(minutes=1),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com', 'code': '123456'})
        assert r.status_code == 410

    @patch('api.get_db')
    def test_404_aucun_otp(self, mock_db):
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'ghost@x.com', 'code': '123456'})
        assert r.status_code == 404


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/user/settings
# ══════════════════════════════════════════════════════════════════════════════

class TestGetSettingsEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_200_avec_email_valide(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Yao', 'email': 'yao@test.com', 'phone': '',
            'gmail_address': '', 'telegram_chat_id': '',
            'green_api_instance': '', 'green_api_token': '',
            'app_password': None, 'avatar': '', 'theme_color': '#1a237e', 'font_family': 'Inter'
        })
        mock_db.return_value = db
        r = self.client.get('/api/user/settings?email=yao@test.com')
        assert r.status_code == 200
        data = r.get_json()
        required_keys = {'name', 'email', 'theme_color', 'font_family', 'app_password_set'}
        assert required_keys.issubset(data.keys())

    def test_400_sans_email(self):
        assert self.client.get('/api/user/settings').status_code == 400

    @patch('api.get_db')
    def test_app_password_non_expose(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Y', 'email': 'y@y.com', 'phone': None,
            'gmail_address': None, 'telegram_chat_id': None,
            'green_api_instance': None, 'green_api_token': None,
            'app_password': 'secret_hash', 'avatar': None,
            'theme_color': None, 'font_family': None
        })
        mock_db.return_value = db
        r = self.client.get('/api/user/settings?email=y@y.com')
        data = r.get_json()
        assert 'app_password' not in data, "app_password NE DOIT PAS être exposé"
        assert data['app_password_set'] is True


# ══════════════════════════════════════════════════════════════════════════════
# PUT /api/user/settings
# ══════════════════════════════════════════════════════════════════════════════

class TestPutSettingsEndpoint:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_200_mise_a_jour_valide(self, mock_db):
        db, cur = make_db_mock()
        mock_db.return_value = db
        r = self.client.put('/api/user/settings', json={
            'email': 'yao@test.com', 'theme_color': '#7c3aed'
        })
        assert r.status_code == 200

    def test_400_sans_email(self):
        r = self.client.put('/api/user/settings', json={'theme_color': '#000'})
        assert r.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/emails  et  GET /api/stats
# ══════════════════════════════════════════════════════════════════════════════

class TestEmailsStatsEndpoints:

    def setup_method(self):
        self.client = app.test_client()

    def test_emails_sans_email_retourne_liste_vide(self):
        r = self.client.get('/api/emails')
        assert r.status_code == 200
        assert r.get_json() == []

    @patch('api._get_imap_conn', return_value=None)
    def test_emails_imap_non_configure(self, _):
        r = self.client.get('/api/emails?email=yao@test.com')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_stats_sans_email_retourne_zeros(self):
        r = self.client.get('/api/stats')
        assert r.status_code == 200
        data = r.get_json()
        assert data['total_messages'] == 0
        assert data['unread_count']   == 0

    @patch('api._get_imap_conn', return_value=None)
    def test_stats_imap_non_configure(self, _):
        r = self.client.get('/api/stats?email=yao@test.com')
        assert r.status_code == 200
        assert r.get_json()['total_messages'] == 0


# ══════════════════════════════════════════════════════════════════════════════
# GET /api/admin/stats  et  GET /api/admin/users
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminEndpoints:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_admin_stats_schema(self, mock_db):
        db = MagicMock()
        cur = MagicMock()
        cur.__enter__ = lambda s: s
        cur.__exit__  = MagicMock(return_value=False)
        cur.fetchone.side_effect = [
            {'total': 5}, {'total': 1}, {'total': 4},
            {'total': 2}, {'total': 3}, {'total': 29.97}
        ]
        db.cursor.return_value = cur
        mock_db.return_value = db
        r = self.client.get('/api/admin/stats')
        assert r.status_code == 200
        data = r.get_json()
        assert 'total_users'   in data
        assert 'total_revenue' in data
        assert isinstance(data['total_revenue'], float)

    @patch('api.get_db')
    def test_admin_users_retourne_liste(self, mock_db):
        db, cur = make_db_mock(fetchall=[{
            'id': 1, 'name': 'Yao', 'email': 'yao@x.com',
            'is_verified': 1, 'role': 'admin', 'plan': 'free',
            'phone': None, 'gmail_address': None, 'telegram_chat_id': None,
            'green_api_instance': None, 'gmail_connected': True,
            'monitor_active': False,
            'created_at': datetime(2025, 1, 15, 9, 30)
        }])
        mock_db.return_value = db
        r = self.client.get('/api/admin/users')
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)
