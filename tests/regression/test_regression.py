"""
Tests de régression — Suite critique à exécuter après chaque déploiement
=========================================================================
Ces tests vérifient que les fonctionnalités clés continuent de fonctionner
après chaque modification du code. À intégrer dans le CI/CD.

Convention de nommage : test_REG_XXX_description
  REG_001 → REG_099 : Authentification
  REG_100 → REG_199 : Paramètres utilisateur
  REG_200 → REG_299 : Admin
  REG_300 → REG_399 : Sécurité
  REG_400 → REG_499 : Infrastructure
"""

import sys, os
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app_setup import flask_app as app, app_module, hashed, make_db_mock, DBError


# ══════════════════════════════════════════════════════════════════════════════
# BLOC AUTH (REG_001–REG_009)
# ══════════════════════════════════════════════════════════════════════════════

class TestRegressionAuth:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.threading.Thread')
    @patch('api.get_db')
    def test_REG_001_register_retourne_200(self, mock_db, mock_thread):
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        mock_thread.return_value = MagicMock()
        r = self.client.post('/api/auth/register', json={
            'name': 'REG Test', 'email': 'reg@test.com', 'password': 'password123'
        })
        assert r.status_code == 200, "REG_001 FAIL : register doit retourner 200"

    @patch('api.get_db')
    def test_REG_002_register_email_duplique_409(self, mock_db):
        db, cur = make_db_mock(fetchone={'id': 1})
        mock_db.return_value = db
        r = self.client.post('/api/auth/register', json={
            'name': 'Test', 'email': 'dup@test.com', 'password': 'password123'
        })
        assert r.status_code == 409, "REG_002 FAIL : email dupliqué doit retourner 409"

    @patch('api.get_db')
    def test_REG_003_login_valide_retourne_nom_email_role(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'REG', 'email': 'reg@test.com',
            'password': hashed('pass123'), 'role': 'user'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'reg@test.com', 'password': 'pass123'})
        assert r.status_code == 200, "REG_003 FAIL : login valide doit retourner 200"
        data = r.get_json()
        assert 'name'  in data, "REG_003 FAIL : champ 'name' manquant"
        assert 'email' in data, "REG_003 FAIL : champ 'email' manquant"
        assert 'role'  in data, "REG_003 FAIL : champ 'role' manquant"

    @patch('api.get_db')
    def test_REG_004_login_mauvais_mdp_401(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'x@x.com', 'password': 'wrong'})
        assert r.status_code == 401, "REG_004 FAIL : mauvais mdp doit retourner 401"

    def test_REG_005_login_champs_manquants_400(self):
        assert self.client.post('/api/auth/login', json={}).status_code == 400, \
            "REG_005 FAIL : body vide doit retourner 400"

    def test_REG_006_password_trop_court_400(self):
        r = self.client.post('/api/auth/register', json={
            'name': 'X', 'email': 'x@x.com', 'password': '123'
        })
        assert r.status_code == 400, "REG_006 FAIL : mdp < 8 chars doit retourner 400"

    @patch('api.get_db')
    def test_REG_007_verify_otp_valide_201(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '654321', 'name': 'REG', 'password': hashed('pw'),
            'expires_at': datetime.now() + timedelta(minutes=8),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'reg@test.com', 'code': '654321'})
        assert r.status_code == 201, "REG_007 FAIL : OTP valide doit créer le compte (201)"

    @patch('api.get_db')
    def test_REG_008_verify_otp_expire_410(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '123456', 'name': 'X', 'password': hashed('pw'),
            'expires_at': datetime.now() - timedelta(seconds=1),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'x@x.com', 'code': '123456'})
        assert r.status_code == 410, "REG_008 FAIL : OTP expiré doit retourner 410"

    @patch('api.get_db')
    def test_REG_009_verify_otp_mauvais_code_401(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'code': '999999', 'name': 'X', 'password': hashed('pw'),
            'expires_at': datetime.now() + timedelta(minutes=5),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'x@x.com', 'code': '000000'})
        assert r.status_code == 401, "REG_009 FAIL : mauvais OTP doit retourner 401"


# ══════════════════════════════════════════════════════════════════════════════
# BLOC SETTINGS (REG_100–REG_105)
# ══════════════════════════════════════════════════════════════════════════════

class TestRegressionSettings:

    def setup_method(self):
        self.client = app.test_client()

    def test_REG_100_get_settings_sans_email_400(self):
        r = self.client.get('/api/user/settings')
        assert r.status_code == 400, "REG_100 FAIL : email manquant doit retourner 400"

    @patch('api.get_db')
    def test_REG_101_get_settings_retourne_theme_color(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Yao', 'email': 'yao@test.com', 'phone': '',
            'gmail_address': '', 'telegram_chat_id': '',
            'green_api_instance': '', 'green_api_token': '',
            'app_password': None, 'avatar': '',
            'theme_color': '#4f46e5', 'font_family': 'Poppins'
        })
        mock_db.return_value = db
        r = self.client.get('/api/user/settings?email=yao@test.com')
        assert r.status_code == 200, "REG_101 FAIL : GET settings doit retourner 200"
        data = r.get_json()
        assert data['theme_color'] == '#4f46e5', "REG_101 FAIL : theme_color non retourné"
        assert data['font_family'] == 'Poppins', "REG_101 FAIL : font_family non retourné"

    @patch('api.get_db')
    def test_REG_102_app_password_non_expose(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Y', 'email': 'y@y.com', 'phone': None,
            'gmail_address': None, 'telegram_chat_id': None,
            'green_api_instance': None, 'green_api_token': None,
            'app_password': 'secret', 'avatar': None,
            'theme_color': None, 'font_family': None
        })
        mock_db.return_value = db
        r = self.client.get('/api/user/settings?email=y@y.com')
        assert 'app_password' not in r.get_json(), \
            "REG_102 FAIL : app_password NE DOIT PAS être exposé dans la réponse"

    @patch('api.get_db')
    def test_REG_103_put_settings_retourne_200(self, mock_db):
        db, cur = make_db_mock()
        mock_db.return_value = db
        r = self.client.put('/api/user/settings', json={
            'email': 'yao@test.com', 'theme_color': '#7c3aed', 'font_family': 'Raleway'
        })
        assert r.status_code == 200, "REG_103 FAIL : PUT settings valide doit retourner 200"

    def test_REG_104_put_settings_sans_email_400(self):
        r = self.client.put('/api/user/settings', json={'theme_color': '#fff'})
        assert r.status_code == 400, "REG_104 FAIL : PUT sans email doit retourner 400"

    @patch('api.get_db')
    def test_REG_105_put_settings_commit_effectue(self, mock_db):
        """Vérifie que les données sont bien persistées (commit appelé)."""
        db, cur = make_db_mock()
        mock_db.return_value = db
        self.client.put('/api/user/settings', json={
            'email': 'yao@test.com', 'theme_color': '#059669'
        })
        assert db.commit.called, "REG_105 FAIL : db.commit() doit être appelé lors du PUT"


# ══════════════════════════════════════════════════════════════════════════════
# BLOC ADMIN (REG_200–REG_201)
# ══════════════════════════════════════════════════════════════════════════════

class TestRegressionAdmin:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_REG_200_admin_stats_contient_tous_les_champs(self, mock_db):
        db = MagicMock()
        cur = MagicMock()
        cur.__enter__ = lambda s: s
        cur.__exit__  = MagicMock(return_value=False)
        cur.fetchone.side_effect = [
            {'total': 3}, {'total': 1}, {'total': 2},
            {'total': 1}, {'total': 2}, {'total': 19.98}
        ]
        db.cursor.return_value = cur
        mock_db.return_value = db
        r = self.client.get('/api/admin/stats')
        assert r.status_code == 200, "REG_200 FAIL : /api/admin/stats doit retourner 200"
        data = r.get_json()
        required = {'total_users', 'verified_users', 'premium_users',
                    'total_payments', 'total_revenue'}
        for key in required:
            assert key in data, f"REG_200 FAIL : champ '{key}' manquant dans admin/stats"

    @patch('api.get_db')
    def test_REG_201_admin_users_retourne_liste(self, mock_db):
        db, cur = make_db_mock(fetchall=[])
        mock_db.return_value = db
        r = self.client.get('/api/admin/users')
        assert r.status_code == 200, "REG_201 FAIL : /api/admin/users doit retourner 200"
        assert isinstance(r.get_json(), list), "REG_201 FAIL : doit retourner une liste JSON"


# ══════════════════════════════════════════════════════════════════════════════
# BLOC SÉCURITÉ (REG_300–REG_305)
# ══════════════════════════════════════════════════════════════════════════════

class TestRegressionSecurity:

    def setup_method(self):
        self.client = app.test_client()

    def test_REG_300_cors_header_present(self):
        r = self.client.get('/api/status')
        assert r.headers.get('Access-Control-Allow-Origin') is not None, \
            "REG_300 FAIL : CORS header Access-Control-Allow-Origin manquant"

    def test_REG_301_cache_control_no_store(self):
        r = self.client.get('/api/status')
        cc = r.headers.get('Cache-Control', '')
        assert 'no-store' in cc or 'no-cache' in cc, \
            "REG_301 FAIL : Cache-Control doit contenir no-store ou no-cache"

    def test_REG_302_options_preflight_200(self):
        r = self.client.options('/api/auth/login')
        assert r.status_code == 200, "REG_302 FAIL : OPTIONS preflight doit retourner 200"

    @patch('api.get_db')
    def test_REG_303_password_hash_non_expose(self, mock_db):
        db, cur = make_db_mock(fetchone={
            'name': 'Y', 'email': 'y@y.com',
            'password': hashed('secret'), 'role': 'user'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/login',
                             json={'email': 'y@y.com', 'password': 'secret'})
        assert 'password' not in r.get_json(), \
            "REG_303 FAIL : le hash du mot de passe NE DOIT PAS être dans la réponse"

    def test_REG_304_content_type_json(self):
        r = self.client.get('/api/status')
        assert 'application/json' in r.content_type, \
            "REG_304 FAIL : Content-Type doit être application/json"

    def test_REG_305_sql_injection_login_bloque(self):
        r = self.client.post('/api/auth/login', json={
            'email': "' OR '1'='1", 'password': "' OR '1'='1"
        })
        assert r.status_code in (400, 401), \
            "REG_305 FAIL : injection SQL ne doit pas accorder l'accès"


# ══════════════════════════════════════════════════════════════════════════════
# BLOC INFRASTRUCTURE (REG_400–REG_402)
# ══════════════════════════════════════════════════════════════════════════════

class TestRegressionInfrastructure:

    def setup_method(self):
        self.client = app.test_client()

    def test_REG_400_status_endpoint_accessible(self):
        """Le serveur est up et répond."""
        r = self.client.get('/api/status')
        assert r.status_code == 200, "REG_400 FAIL : /api/status inaccessible"

    def test_REG_401_reponses_sont_du_json(self):
        """Toutes les réponses API doivent être du JSON."""
        endpoints = ['/api/status', '/api/emails', '/api/stats']
        for ep in endpoints:
            r = self.client.get(ep)
            assert 'json' in r.content_type, \
                f"REG_401 FAIL : {ep} ne retourne pas JSON"

    def test_REG_402_erreur_400_contient_message(self):
        """Toute erreur 400 doit avoir un champ 'error' avec un message."""
        r = self.client.post('/api/auth/login', json={})
        assert r.status_code == 400
        data = r.get_json()
        assert 'error' in data and len(data['error']) > 0, \
            "REG_402 FAIL : message d'erreur manquant ou vide"
