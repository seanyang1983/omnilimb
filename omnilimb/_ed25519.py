"""Minimal, dependency-free Ed25519 (RFC 8032) for offline license verification.

Adapted from the public-domain reference implementation by the Ed25519 authors
(https://ed25519.cr.yp.to/software.html). Modular exponentiation uses Python's
built-in ``pow`` for speed. This is used for one-off, offline signature checks
(license tokens) — it is NOT constant-time and must not be used to sign secrets
on adversarial shared hardware. Signing happens vendor-side; verification ships
to customers with zero third-party dependencies.

Public API:
    public_from_seed(seed32) -> bytes32
    sign(message, seed32, public_key=None) -> bytes64
    verify(signature64, message, public_key32) -> bool
"""

from __future__ import annotations

import hashlib

_b = 256
_q = 2**255 - 19
_l = 2**252 + 27742317777372353535851937790883648493


def _H(m: bytes) -> bytes:
    return hashlib.sha512(m).digest()


def _inv(x: int) -> int:
    return pow(x, _q - 2, _q)


_d = -121665 * _inv(121666) % _q
_I = pow(2, (_q - 1) // 4, _q)


def _xrecover(y: int) -> int:
    xx = (y * y - 1) * _inv(_d * y * y + 1)
    x = pow(xx, (_q + 3) // 8, _q)
    if (x * x - xx) % _q != 0:
        x = (x * _I) % _q
    if x % 2 != 0:
        x = _q - x
    return x


_By = 4 * _inv(5) % _q
_Bx = _xrecover(_By)
_B = [_Bx % _q, _By % _q]


def _edwards(P: list[int], Q: list[int]) -> list[int]:
    x1, y1 = P
    x2, y2 = Q
    x3 = (x1 * y2 + x2 * y1) * _inv(1 + _d * x1 * x2 * y1 * y2)
    y3 = (y1 * y2 + x1 * x2) * _inv(1 - _d * x1 * x2 * y1 * y2)
    return [x3 % _q, y3 % _q]


def _scalarmult(P: list[int], e: int) -> list[int]:
    # Iterative double-and-add (avoids deep recursion).
    result = [0, 1]
    addend = P
    while e > 0:
        if e & 1:
            result = _edwards(result, addend)
        addend = _edwards(addend, addend)
        e >>= 1
    return result


def _bit(h: bytes, i: int) -> int:
    return (h[i // 8] >> (i % 8)) & 1


def _encodeint(y: int) -> bytes:
    return y.to_bytes(_b // 8, "little")


def _encodepoint(P: list[int]) -> bytes:
    x, y = P
    val = (y & ((1 << (_b - 1)) - 1)) | ((x & 1) << (_b - 1))
    return val.to_bytes(_b // 8, "little")


def _decodeint(s: bytes) -> int:
    return int.from_bytes(s, "little")


def _Hint(m: bytes) -> int:
    return _decodeint(_H(m)) % (1 << (2 * _b))


def _secret_scalar(seed: bytes) -> int:
    h = _H(seed)
    return 2 ** (_b - 2) + sum(2**i * _bit(h, i) for i in range(3, _b - 2))


def public_from_seed(seed: bytes) -> bytes:
    if len(seed) != 32:
        raise ValueError("seed must be 32 bytes")
    a = _secret_scalar(seed)
    return _encodepoint(_scalarmult(_B, a))


def sign(message: bytes, seed: bytes, public_key: bytes | None = None) -> bytes:
    if len(seed) != 32:
        raise ValueError("seed must be 32 bytes")
    h = _H(seed)
    a = _secret_scalar(seed)
    pk = public_key if public_key is not None else _encodepoint(_scalarmult(_B, a))
    r = _Hint(h[32:64] + message)
    R = _scalarmult(_B, r)
    S = (r + _Hint(_encodepoint(R) + pk + message) * a) % _l
    return _encodepoint(R) + _encodeint(S)


def _isoncurve(P: list[int]) -> bool:
    x, y = P
    return (-x * x + y * y - 1 - _d * x * x * y * y) % _q == 0


def _decodepoint(s: bytes) -> list[int]:
    y = _decodeint(s) & ((1 << (_b - 1)) - 1)
    x = _xrecover(y)
    if x & 1 != _bit(s, _b - 1):
        x = _q - x
    P = [x, y]
    if not _isoncurve(P):
        raise ValueError("point not on curve")
    return P


def verify(signature: bytes, message: bytes, public_key: bytes) -> bool:
    try:
        if len(signature) != 64 or len(public_key) != 32:
            return False
        R = _decodepoint(signature[:32])
        A = _decodepoint(public_key)
        S = _decodeint(signature[32:64])
        h = _Hint(signature[:32] + public_key + message)
        return _scalarmult(_B, S) == _edwards(R, _scalarmult(A, h))
    except Exception:
        return False
