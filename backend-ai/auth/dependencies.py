import os
from functools import lru_cache

import httpx
from fastapi import HTTPException, Query, status
from jose import ExpiredSignatureError, JWTError, jwk, jwt
from jose.utils import base64url_decode

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWKS_URL = os.getenv(
    "SUPABASE_JWKS_URL",
    "https://zoiaahtvppzczqinrclw.supabase.co/auth/v1/.well-known/jwks.json",
)

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    """Fetch and cache the Supabase JWKS (cached for process lifetime)."""
    response = httpx.get(SUPABASE_JWKS_URL, timeout=10)
    response.raise_for_status()
    return response.json()


def _get_jwk_for_kid(kid: str) -> dict | None:
    jwks = _fetch_jwks()
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def _decode_token(token: str) -> dict:
    """Try ES256 first (current Supabase), fall back to HS256 (legacy)."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise _credentials_exception

    alg = unverified_header.get("alg", "HS256")

    if alg == "ES256":
        kid = unverified_header.get("kid")
        jwk_data = _get_jwk_for_kid(kid) if kid else None
        if jwk_data is None:
            # JWKS cache may be stale — clear and retry once
            _fetch_jwks.cache_clear()
            jwk_data = _get_jwk_for_kid(kid) if kid else None
        if jwk_data is None:
            raise _credentials_exception
        try:
            public_key = jwk.construct(jwk_data, algorithm="ES256")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
            return payload
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError:
            raise _credentials_exception

    # HS256 fallback
    if not SUPABASE_JWT_SECRET:
        raise _credentials_exception
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise _credentials_exception


def get_current_user(token: str = Query(..., alias="token")) -> str:
    """
    FastAPI dependency for WebSocket routes.
    Reads ?token=<jwt> from the query string (browsers can't send WS headers).
    Returns the Supabase user UUID (sub claim).
    """
    payload = _decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise _credentials_exception
    return user_id


def get_current_user_from_bearer(authorization: str) -> str:
    """
    Validate a raw 'Bearer <token>' header string.
    Used by non-WebSocket routes if needed.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise _credentials_exception
    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode_token(token)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise _credentials_exception
    return user_id
