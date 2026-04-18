"""
Setup partagé — importé par tous les modules de test.
Crée l'app Flask une seule fois avec psycopg2 entièrement mocké.
"""
import sys, os, hashlib
from unittest.mock import MagicMock, patch

# ── Variables d'env ───────────────────────────────────────────────────────────
for k, v in {
    'DB_HOST': 'localhost', 'DB_PORT': '5432', 'DB_USER': 'test',
    'DB_PASSWORD': 'test',  'DB_NAME': 'testdb',
    'SMTP_EMAIL': 'test@example.com', 'SMTP_PASSWORD': 'smtp_test',
    'TELEGRAM_BOT_TOKEN': 'fake_token', 'GMAIL_ADDRESS': 'test@gmail.com',
}.items():
    os.environ.setdefault(k, v)

# ── Path vers backend_mail ────────────────────────────────────────────────────
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_backend = os.path.join(_root, 'backend_mail')
for p in (_backend, _root):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Mock psycopg2 globalement avant l'import ─────────────────────────────────
import psycopg2 as _real_psycopg2
_psycopg2_mock           = MagicMock()
_psycopg2_mock.connect.return_value = MagicMock()

# On remplace psycopg2.OperationalError par une vraie Exception
# pour que les tests `side_effect=psycopg2.OperationalError` fonctionnent
class _FakeOperationalError(Exception): pass
_psycopg2_mock.OperationalError = _FakeOperationalError

os.environ['TESTING'] = '1'   # prevents _startup() from connecting to real DB or spawning threads

if 'api' not in sys.modules:
    # First import in this process — mock psycopg2 before api loads it
    _psycopg2_mock.pool = MagicMock()
    _psycopg2_mock.pool.ThreadedConnectionPool = MagicMock()
    with patch.dict('sys.modules', {
        'psycopg2':        _psycopg2_mock,
        'psycopg2.extras': _psycopg2_mock,
        'psycopg2.pool':   _psycopg2_mock.pool,
    }):
        import api as app_module
    # Keep api registered so repeated imports (e.g. conftest + app_setup) don't
    # try to re-initialize native extensions like bcrypt a second time.
    sys.modules['api'] = app_module
else:
    # api already imported (e.g. by conftest.py) — reuse it
    app_module = sys.modules['api']

# Expose l'app Flask
flask_app = app_module.app
flask_app.config['TESTING'] = True
flask_app.config['PROPAGATE_EXCEPTIONS'] = False  # return 500 instead of propagating exceptions
flask_app.config['RATELIMIT_ENABLED'] = False      # disable rate limiting in tests

# ── Helpers ───────────────────────────────────────────────────────────────────
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

# Exporte FakeOperationalError pour les tests d'erreurs DB
DBError = _FakeOperationalError
