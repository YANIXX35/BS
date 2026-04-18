"""
Configuration centrale pytest — app Flask partagée par tous les tests.
"""
import sys
import os
import hashlib
from unittest.mock import MagicMock, patch

# ── Variables d'env ───────────────────────────────────────────────────────────
os.environ.setdefault('DB_HOST',            'localhost')
os.environ.setdefault('DB_PORT',            '5432')
os.environ.setdefault('DB_USER',            'test')
os.environ.setdefault('DB_PASSWORD',        'test')
os.environ.setdefault('DB_NAME',            'testdb')
os.environ.setdefault('SMTP_EMAIL',         'test@example.com')
os.environ.setdefault('SMTP_PASSWORD',      'smtp_test')
os.environ.setdefault('TELEGRAM_BOT_TOKEN', 'fake_token')
os.environ.setdefault('GMAIL_ADDRESS',      'test@gmail.com')

API_URL      = os.getenv('TEST_API_URL',      'https://backend-mail-1.onrender.com')
FRONTEND_URL = os.getenv('TEST_FRONTEND_URL', 'https://yanixx35.github.io/BS')

# ── Import unique de l'app avec psycopg2 entièrement mocké ───────────────────
_backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend_mail')
if _backend_path not in sys.path:
    sys.path.insert(0, _backend_path)

_psycopg2_mock = MagicMock()
_psycopg2_mock.connect.return_value = MagicMock()
_psycopg2_mock.extras.RealDictCursor = MagicMock()
_psycopg2_mock.OperationalError = Exception  # pour les tests d'erreur

os.environ['TESTING'] = '1'   # prevents _startup() from connecting to real DB or spawning threads

if 'api' not in sys.modules:
    _psycopg2_mock.pool = MagicMock()
    _psycopg2_mock.pool.ThreadedConnectionPool = MagicMock()
    with patch.dict('sys.modules', {
        'psycopg2':        _psycopg2_mock,
        'psycopg2.extras': _psycopg2_mock.extras,
        'psycopg2.pool':   _psycopg2_mock.pool,
    }):
        import api as _app_module
    sys.modules['api'] = _app_module
else:
    _app_module = sys.modules['api']

flask_app = _app_module.flask_app if hasattr(_app_module, 'flask_app') else _app_module.app
flask_app.config['TESTING'] = True
flask_app.config['RATELIMIT_ENABLED'] = False  # disable rate limiting in tests

# ── Helpers partagés ──────────────────────────────────────────────────────────
def hashed(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_db_mock(fetchone=None, fetchall=None):
    """Retourne (db_mock, cursor_mock)."""
    cur = MagicMock()
    cur.fetchone.return_value = fetchone
    cur.fetchall.return_value = fetchall or []
    cur.__enter__ = lambda s: s
    cur.__exit__  = MagicMock(return_value=False)
    db = MagicMock()
    db.cursor.return_value = cur
    return db, cur

# Exporte le module api pour les patches
app_module = _app_module
