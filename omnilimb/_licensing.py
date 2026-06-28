"""Open-core licensing gate — real offline Ed25519 verification.

The free tier ships all six execution tools. Pro features (audit log, curated
skill packs, auto-update, priority support) require a signed license token.

Token format (compact, JWT-like, EdDSA / Ed25519):

    EXL1.<base64url(payload_json)>.<base64url(signature)>

`payload_json` is a UTF-8 JSON object, e.g.:

    {"sub": "alice@example.com", "tier": "pro", "exp": 1771000000,
     "iat": 1760000000, "jti": "lic_abc123", "features": ["audit", "packs"]}

The signature covers the ASCII bytes of `"EXL1." + base64url(payload)` (the
header+payload, exactly like JWS). Verification is fully offline against the
embedded public key — no phone-home, works air-gapped. Revoke issued licenses by
shipping their `jti` in `_REVOKED` with a release.

Signing happens vendor-side only (see scripts/issue_license.py). The private seed
never ships and is git-ignored.
"""

from __future__ import annotations

import base64
import json
import os
import time
import urllib.request
from functools import lru_cache

from . import _ed25519

# Vendor Ed25519 public key (hex, 32 bytes). Replace via scripts/gen_keys.py.
_PUBLIC_KEY_HEX = "0ac58e8a93d3b09dfb5425c31e4f855dbba6b347cc1e4d001a40ba4aed288490"

_PRO_TIERS = frozenset({"pro", "team", "enterprise"})
_PREFIX = "EXL1"

# License IDs (jti) revoked after issuance. Ship updates with releases.
_REVOKED: frozenset[str] = frozenset()

# Optional online revocation list (offline-first). Set OMNILIMB_REVOCATION_URL to
# a JSON endpoint returning either ["jti1", ...] or {"revoked": [...]}. Fetched
# with a short timeout and cached; failures fall back to the last known / built-in
# list so air-gapped use never breaks.
_REVOCATION_TTL_S = 300.0
_revocation_cache: dict = {"ts": 0.0, "jti": frozenset()}


def _online_revoked() -> frozenset:
    url = (os.environ.get("OMNILIMB_REVOCATION_URL") or "").strip()
    if not url:
        return frozenset()
    now = time.time()
    if now - _revocation_cache["ts"] < _REVOCATION_TTL_S:
        return _revocation_cache["jti"]
    try:
        with urllib.request.urlopen(url, timeout=3) as r:  # noqa: S310
            data = json.loads(r.read().decode("utf-8"))
        if isinstance(data, dict):
            data = data.get("revoked") or data.get("jti") or []
        jti = frozenset(str(x) for x in data) if isinstance(data, list) else frozenset()
        _revocation_cache["ts"] = now
        _revocation_cache["jti"] = jti
        return jti
    except Exception:
        # Offline / fetch failure: keep last known list (never block air-gapped use).
        return _revocation_cache["jti"]


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _public_key() -> bytes:
    return bytes.fromhex(_PUBLIC_KEY_HEX)


def decode_license(token: str) -> dict | None:
    """Verify signature + structure. Returns the payload dict or None.

    Does NOT check expiry/tier/revocation — see `license_status`.
    """
    if not token or not _PUBLIC_KEY_HEX:
        return None
    parts = token.strip().split(".")
    if len(parts) != 3 or parts[0] != _PREFIX:
        return None
    _, payload_b64, sig_b64 = parts
    try:
        signing_input = f"{_PREFIX}.{payload_b64}".encode("ascii")
        signature = _b64url_decode(sig_b64)
        if not _ed25519.verify(signature, signing_input, _public_key()):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def license_status(token: str | None) -> dict:
    """Full evaluation -> {valid, tier, reason, ...}. Never raises."""
    import os

    token = (token or os.environ.get("OMNILIMB_LICENSE") or "").strip()
    if not token:
        return {"valid": False, "tier": "free", "reason": "no license"}
    payload = decode_license(token)
    if payload is None:
        return {"valid": False, "tier": "free", "reason": "invalid signature"}
    jti = payload.get("jti")
    if jti and (jti in _REVOKED or jti in _online_revoked()):
        return {"valid": False, "tier": "free", "reason": "revoked", "jti": jti}
    exp = payload.get("exp")
    if exp is not None and time.time() > float(exp):
        return {"valid": False, "tier": "free", "reason": "expired", "exp": exp}
    tier = str(payload.get("tier", "")).lower()
    if tier not in _PRO_TIERS:
        return {"valid": False, "tier": tier or "free", "reason": "non-pro tier"}
    return {
        "valid": True,
        "tier": tier,
        "reason": "ok",
        "sub": payload.get("sub"),
        "exp": exp,
        "seats": payload.get("seats"),
        "features": payload.get("features", []),
        "jti": jti,
    }


# ---------------------------------------------------------------------------
# Omnilimb 1.0 — fully open-source: EVERY feature is free.
#
# The licensing machinery below (Ed25519 verification, revocation, feature SKUs)
# is kept intact and reversible. ``_all_features_free()`` is re-evaluated on every
# call (reads the env each time) so a commercial build — or a test — can set
# ``OMNILIMB_ENFORCE_LICENSE=1`` to re-enable real gating at runtime. In 1.0 the
# default (env unset) makes every gate resolve to "unlocked".
# ---------------------------------------------------------------------------
def _all_features_free() -> bool:
    return os.environ.get("OMNILIMB_ENFORCE_LICENSE", "").strip().lower() not in ("1", "true", "yes")


@lru_cache(maxsize=16)
def is_pro(key: str | None = None) -> bool:
    if _all_features_free():
        return True
    return license_status(key)["valid"]


# Capability/tool name -> feature SKU. A Pro token may carry a `features` list to
# scope which SKUs it unlocks; a token WITHOUT `features` unlocks everything
# (backward compatible). NOTE: the audit log is a FREE feature (no gate) and is
# intentionally not listed here.
_FEATURE_SKU = {
    "claw_pack_install": "packs",
    "claw_skill_update": "autoupdate",
    "claw_skill_to_hermes": "convert",
    "ai_convert": "ai_convert",
}

_UPGRADE_URL = "https://omnilimb.com/pro"  # landing page with PayPal + Alipay (Paddle later, once passport KYC is done)


def has_feature(feature: str, key: str | None = None) -> bool:
    """True if the license is valid AND covers *feature* (by SKU)."""
    if _all_features_free():
        return True
    st = license_status(key)
    if not st["valid"]:
        return False
    feats = st.get("features") or []
    if not feats:
        return True  # unscoped Pro/Team/Enterprise unlocks all features
    sku = _FEATURE_SKU.get(feature, feature)
    return sku in feats or feature in feats


def require_pro(feature: str, key: str | None = None) -> dict | None:
    """Return an error dict if the feature needs Pro and the license is invalid
    or does not cover the feature; otherwise None."""
    if _all_features_free():
        return None
    if has_feature(feature, key):
        return None
    st = license_status(key)
    if st["valid"]:
        # Valid Pro, but this feature is not part of the purchased plan.
        return {
            "ok": False,
            "error": f"'{feature}' is not included in your plan (features: {st.get('features')})",
            "upgrade": _UPGRADE_URL,
            "feature": _FEATURE_SKU.get(feature, feature),
        }
    return {
        "ok": False,
        "error": f"'{feature}' requires an Omnilimb Pro license",
        "upgrade": _UPGRADE_URL,
        "feature": _FEATURE_SKU.get(feature, feature),
    }


def describe(key: str | None = None) -> str:
    if _all_features_free():
        return "Open 1.0 (all features free)"
    st = license_status(key)
    if st["valid"]:
        exp = st.get("exp")
        when = time.strftime("%Y-%m-%d", time.gmtime(exp)) if exp else "perpetual"
        seats = st.get("seats")
        seat_str = f", {seats} seats" if seats else ""
        return f"Pro ({st['tier']}{seat_str}, expires {when})"
    if st["reason"] == "no license":
        return "Free"
    return f"Free (license {st['reason']})"
