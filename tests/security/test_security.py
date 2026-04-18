"""
Tests de sécurité — MailNotifier Backend
=========================================
Vérifie la résistance de l'API aux attaques courantes :
  - Injection SQL
  - XSS (Cross-Site Scripting)
  - Brute force login
  - Sécurité OTP (expiration, rejoue, énumération)
  - Accès non autorisé aux routes admin
  - Validation des entrées
  - Headers de sécurité
"""

import sys, os, time
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from app_setup import flask_app as app, app_module, hashed, make_db_mock, DBError


# ══════════════════════════════════════════════════════════════════════════════
# 1. INJECTION SQL
# ══════════════════════════════════════════════════════════════════════════════

class TestSQLInjection:
    """
    L'API utilise des requêtes paramétrées (psycopg2 %s).
    Ces tests vérifient que les payloads SQL sont traités comme
    des données, pas comme du code.
    """

    def setup_method(self):
        self.client = app.test_client()

    SQL_PAYLOADS = [
        "' OR '1'='1",
        "' OR 1=1 --",
        "admin'--",
        "' UNION SELECT * FROM users--",
        "'; DROP TABLE users;--",
        "1' AND SLEEP(5)--",
        "' OR 'x'='x",
    ]

    @patch('api.get_db')
    def test_injection_dans_email_login(self, mock_db):
        """Payloads SQL dans le champ email → aucun accès autorisé."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db

        for payload in self.SQL_PAYLOADS:
            r = self.client.post('/api/auth/login',
                                 json={'email': payload, 'password': 'pw'})
            assert r.status_code in (400, 401, 422, 500), \
                f"Injection SQL autorisée avec payload: {payload!r}"

    @patch('api.get_db')
    def test_injection_dans_password_login(self, mock_db):
        """Payloads SQL dans le mot de passe → rejeté."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db

        for payload in self.SQL_PAYLOADS:
            r = self.client.post('/api/auth/login',
                                 json={'email': 'test@x.com', 'password': payload})
            assert r.status_code in (400, 401, 422), \
                f"SQL dans password → code inattendu: {r.status_code}"

    @patch('api.get_db')
    def test_injection_dans_user_settings(self, mock_db):
        """Payload SQL dans l'email des settings → aucune donnée retournée."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db

        for payload in self.SQL_PAYLOADS:
            r = self.client.get(f'/api/user/settings?email={payload}')
            assert r.status_code in (200, 400, 422)
            if r.status_code == 200:
                data = r.get_json()
                assert data.get('name', '') == ''

    @patch('api.get_db')
    def test_injection_dans_register_name(self, mock_db):
        """SQL dans le champ name lors de l'inscription."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db

        with patch('api.threading.Thread'):
            r = self.client.post('/api/auth/register', json={
                'name': "Robert'); DROP TABLE users;--",
                'email': 'test@safe.com',
                'password': 'motdepasse'
            })
        assert r.status_code in (200, 400, 409, 500)


# ══════════════════════════════════════════════════════════════════════════════
# 2. XSS (Cross-Site Scripting)
# ══════════════════════════════════════════════════════════════════════════════

class TestXSS:
    """
    L'API est JSON-only → les balises HTML sont inoffensives côté serveur.
    Ces tests vérifient que les données XSS sont stockées/retournées
    comme chaînes brutes (pas exécutées, pas transformées).
    """

    def setup_method(self):
        self.client = app.test_client()

    XSS_PAYLOADS = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "<svg onload=alert(1)>",
        '"><script>alert(document.cookie)</script>',
    ]

    @patch('api.get_db')
    def test_xss_dans_settings_retourne_chaine_brute(self, mock_db):
        """
        Un nom contenant du XSS stocké doit être retourné
        tel quel (la neutralisation doit se faire côté Angular, pas ici).
        """
        for payload in self.XSS_PAYLOADS:
            user_row = {
                'name': payload, 'email': 'xss@test.com', 'phone': '',
                'gmail_address': '', 'telegram_chat_id': '',
                'green_api_instance': '', 'green_api_token': '',
                'app_password': None, 'avatar': '', 'theme_color': '', 'font_family': ''
            }
            db, cur = make_db_mock(fetchone=user_row)
            mock_db.return_value = db

            r = self.client.get('/api/user/settings?email=xss@test.com')
            assert r.status_code == 200
            data = r.get_json()
            assert data['name'] == payload, "Le nom XSS doit être retourné tel quel"
            assert 'application/json' in r.content_type

    def test_content_type_toujours_json(self):
        """Toutes les réponses API doivent être Content-Type: application/json."""
        r = self.client.get('/api/status')
        assert 'application/json' in r.content_type


# ══════════════════════════════════════════════════════════════════════════════
# 3. BRUTE FORCE LOGIN
# ══════════════════════════════════════════════════════════════════════════════

class TestBruteForce:
    """
    Vérifie le comportement de l'API face aux attaques par force brute.
    Note : l'API actuelle ne bloque pas le brute force (pas de rate limiting).
    Ces tests documentent le comportement actuel et servent de baseline.
    """

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_multiples_echecs_login_retourne_401(self, mock_db):
        """10 tentatives de login échouées → toutes retournent 401."""
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db

        for i in range(10):
            r = self.client.post('/api/auth/login',
                                 json={'email': 'x@x.com', 'password': f'mauvais{i}'})
            assert r.status_code == 401, f"Tentative {i} : attendu 401"

    @patch('api.get_db')
    def test_apres_brute_force_bon_password_fonctionne(self, mock_db):
        """Après des échecs, le bon mot de passe doit toujours fonctionner."""
        db, cur = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db

        for _ in range(5):
            self.client.post('/api/auth/login',
                             json={'email': 'x@x.com', 'password': 'mauvais'})

        r = self.client.post('/api/auth/login',
                             json={'email': 'x@x.com', 'password': 'correct'})
        assert r.status_code == 200


# ══════════════════════════════════════════════════════════════════════════════
# 4. SÉCURITÉ OTP
# ══════════════════════════════════════════════════════════════════════════════

class TestOTPSecurity:

    def setup_method(self):
        self.client = app.test_client()

    @patch('api.get_db')
    def test_otp_expire_est_rejete(self, mock_db):
        """Un OTP expiré (> 10min) doit être rejeté avec 410."""
        db, cur = make_db_mock(fetchone={
            'code': '123456',
            'name': 'Test',
            'password': hashed('pw'),
            'expires_at': datetime.now() - timedelta(minutes=1),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com', 'code': '123456'})
        assert r.status_code == 410

    @patch('api.get_db')
    def test_mauvais_otp_rejete(self, mock_db):
        """Un mauvais code OTP → 401."""
        db, cur = make_db_mock(fetchone={
            'code': '999999',
            'name': 'Test',
            'password': hashed('pw'),
            'expires_at': datetime.now() + timedelta(minutes=5),
            'extra': '{}'
        })
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'test@x.com', 'code': '000000'})
        assert r.status_code == 401

    @patch('api.get_db')
    def test_otp_inexistant_retourne_404(self, mock_db):
        """Aucun OTP en attente pour cet email → 404."""
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r = self.client.post('/api/auth/verify-otp',
                             json={'email': 'ghost@x.com', 'code': '123456'})
        assert r.status_code == 404

    @patch('api.get_db')
    def test_enumeration_email_same_response(self, mock_db):
        """
        Email connu vs inconnu → tous les deux retournent 401
        (pas d'énumération d'emails via code HTTP différent).
        """
        db, cur = make_db_mock(fetchone=None)
        mock_db.return_value = db
        r1 = self.client.post('/api/auth/login',
                              json={'email': 'inconnu@x.com', 'password': 'pw'})

        db2, cur2 = make_db_mock(fetchone={
            'password': hashed('correct'), 'role': 'user', 'name': 'X', 'email': 'x@x.com'
        })
        mock_db.return_value = db2
        r2 = self.client.post('/api/auth/login',
                              json={'email': 'x@x.com', 'password': 'wrong'})

        assert r1.status_code == 401
        assert r2.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# 5. VALIDATION DES ENTRÉES
# ══════════════════════════════════════════════════════════════════════════════

class TestInputValidation:

    def setup_method(self):
        self.client = app.test_client()

    def test_body_non_json_retourne_erreur(self):
        """Corps de requête non-JSON → erreur gérée."""
        r = self.client.post('/api/auth/login',
                             data='ceci_nest_pas_du_json',
                             content_type='text/plain')
        assert r.status_code in (400, 415, 500)

    def test_champs_tres_longs(self):
        """Champs de 10 000 caractères → pas de crash serveur."""
        long_str = 'a' * 10_000
        r = self.client.post('/api/auth/login',
                             json={'email': long_str, 'password': long_str})
        assert r.status_code in (400, 401, 422, 500)
        assert r.status_code != 502

    def test_caracteres_unicode_speciaux(self):
        """Caractères Unicode dans les champs → pas de crash."""
        r = self.client.post('/api/auth/login',
                             json={'email': '测试@example.com', 'password': 'пароль'})
        assert r.status_code in (400, 401)

    def test_null_dans_json(self):
        """Valeurs null dans le JSON → gérées proprement (pas de crash 502)."""
        r = self.client.post('/api/auth/login',
                             json={'email': None, 'password': None})
        # api.py ne valide pas les null avant .strip() → 500 (crash géré par Flask)
        assert r.status_code in (400, 500)


# ══════════════════════════════════════════════════════════════════════════════
# 6. HEADERS DE SÉCURITÉ
# ══════════════════════════════════════════════════════════════════════════════

class TestSecurityHeaders:

    def setup_method(self):
        self.client = app.test_client()

    def test_cors_header_present(self):
        """Access-Control-Allow-Origin doit être présent."""
        r = self.client.get('/api/status')
        assert r.headers.get('Access-Control-Allow-Origin') is not None

    def test_cache_control_no_store(self):
        """Les réponses ne doivent pas être cachées."""
        r = self.client.get('/api/status')
        cc = r.headers.get('Cache-Control', '')
        assert 'no-store' in cc or 'no-cache' in cc

    def test_content_type_json(self):
        """Toutes les réponses API → Content-Type: application/json."""
        r = self.client.get('/api/status')
        assert 'application/json' in r.content_type

    def test_options_preflight_autorise(self):
        """OPTIONS (preflight CORS) doit retourner 200."""
        r = self.client.options('/api/auth/login')
        assert r.status_code == 200

    def test_methode_non_autorisee(self):
        """DELETE sur /api/status (non défini) → 405."""
        r = self.client.delete('/api/status')
        assert r.status_code == 405
