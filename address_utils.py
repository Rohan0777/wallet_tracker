"""
Address Normalization, Strict Checksum Validation, and Cache Key Utilities (v9.0 Final Release)

Updates in v9.0:
- Unified version alignment (`VERSION = "9.0.0"`).
- Added `detect_chain_from_address(address)` to support 1-click related-wallet Pivot Scan routing
  across Solana, EVM (Ethereum/BSC), and Tron.
- Preserved v8.5 `_split_bundle_tokens` delimiter parsing and single-expression EIP-55 `expected_character` verification.
- Preserved strict Tron Base58Check (0x41 prefix, 25 bytes decoded, double-SHA256 checksum).
- Preserved strict Solana exact 32-byte Ed25519 public key decoded length verification.
- Retained pure-Python Keccak-256 (FIPS 202) with zero external C dependencies.
- Enforced canonical bundle ordering, deduplication, and MAX_BUNDLE = 5 limit.
"""

import re
import hashlib
from typing import Optional, Tuple, Set

VERSION = "9.1.0"

EVM_CHAINS = frozenset({"ethereum", "bsc"})
BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
BASE58_INDEX = {c: i for i, c in enumerate(BASE58_ALPHABET)}
HEX_REGEX = re.compile(r"^0x[0-9a-fA-F]{40}$")
MAX_BUNDLE = 5


# ---------------------------------------------------------------------
# Cryptographic Primitives (Pure Python, Zero External Dependencies)
# ---------------------------------------------------------------------

def b58decode(s: str) -> bytes:
    """Decodes a Base58 string into raw bytes with leading-zero preservation."""
    clean = s.strip()
    if not clean:
        return b""
    n = 0
    for c in clean:
        if c not in BASE58_INDEX:
            raise ValueError(f"Invalid Base58 character: '{c}'")
        n = n * 58 + BASE58_INDEX[c]
    body = n.to_bytes((n.bit_length() + 7) // 8, "big") if n > 0 else b""
    pad_len = len(clean) - len(clean.lstrip("1"))
    return b"\x00" * pad_len + body


def keccak_256(data: bytes) -> bytes:
    """
    Pure Python Keccak-256 implementation (FIPS 202 raw Keccak with 0x01 domain pad).
    Used for EIP-55 mixed-case checksum validation without external C-extensions.
    """
    state = [0] * 25
    rate = 136  # 1088 bits = 136 bytes for Keccak-256
    rc = [
        0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
        0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
        0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
        0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
        0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
        0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008
    ]
    r_shifts = [
        [0, 36, 3, 41, 18],
        [1, 44, 10, 45, 2],
        [62, 6, 43, 15, 61],
        [28, 55, 25, 21, 56],
        [27, 20, 39, 8, 14]
    ]

    pad_len = rate - (len(data) % rate)
    pad = b"\x81" if pad_len == 1 else (b"\x01" + b"\x00" * (pad_len - 2) + b"\x80")
    padded = bytearray(data) + pad

    for i in range(0, len(padded), rate):
        block = padded[i:i + rate]
        for j in range(rate // 8):
            state[j] ^= int.from_bytes(block[j * 8:(j + 1) * 8], "little")

        for r_idx in range(24):
            # Theta
            C = [state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20] for x in range(5)]
            D = [C[(x + 4) % 5] ^ (((C[(x + 1) % 5] << 1) & 0xFFFFFFFFFFFFFFFF) | (C[(x + 1) % 5] >> 63)) for x in range(5)]
            for x in range(5):
                for y in range(5):
                    state[x + 5 * y] ^= D[x]

            # Rho and Pi
            B = [0] * 25
            for x in range(5):
                for y in range(5):
                    shift = r_shifts[x][y]
                    val = state[x + 5 * y]
                    B[y + 5 * ((2 * x + 3 * y) % 5)] = ((val << shift) & 0xFFFFFFFFFFFFFFFF) | (val >> (64 - shift) if shift else 0)

            # Chi and Iota
            for y in range(5):
                for x in range(5):
                    state[x + 5 * y] = B[x + 5 * y] ^ ((~B[(x + 1) % 5 + 5 * y]) & B[(x + 2) % 5 + 5 * y])
            state[0] ^= rc[r_idx]

    out = bytearray()
    for j in range(4):
        out.extend(state[j].to_bytes(8, "little"))
    return bytes(out)


# ---------------------------------------------------------------------
# Address Format & Checksum Verification
# ---------------------------------------------------------------------

def is_valid_evm_address(address: str) -> bool:
    """
    Validates EVM address (Ethereum, BSC):
    - Must match 0x[40 hex chars].
    - If all-lowercase or all-uppercase: valid unchecksummed format.
    - If mixed-case: strictly verified against EIP-55 Keccak-256 checksum.
    """
    if not address or not isinstance(address, str):
        return False
    clean = address.strip()
    if not HEX_REGEX.match(clean):
        return False

    hex_part = clean[2:]
    if hex_part.islower() or hex_part.isupper():
        return True

    # Mixed-case: MUST verify EIP-55 checksum
    lower_hex = hex_part.lower()
    hash_hex = keccak_256(lower_hex.encode("ascii")).hex()
    for i, c in enumerate(hex_part):
        hash_nibble = int(hash_hex[i], 16)
        expected_character = (
            lower_hex[i].upper() if hash_nibble >= 8 else lower_hex[i].lower()
        )
        if c != expected_character:
            return False
    return True


def is_valid_solana_address(address: str) -> bool:
    """
    Validates Solana address:
    - Must decode cleanly with Base58.
    - Decoded byte length MUST BE EXACTLY 32 BYTES (Ed25519 Public Key).
    Rejects 25-byte Tron addresses and any malformed Base58 strings.
    """
    if not address or not isinstance(address, str):
        return False
    clean = address.strip()
    if len(clean) < 32 or len(clean) > 44:
        return False
    try:
        raw = b58decode(clean)
    except ValueError:
        return False
    return len(raw) == 32


def is_valid_tron_address(address: str) -> bool:
    """
    Validates Tron address with strict Base58Check:
    - Must start with 'T' and be exactly 34 chars.
    - Decodes to 25 bytes with 0x41 prefix (Tron mainnet).
    - Last 4 bytes must match double-SHA256 checksum of the first 21 bytes.
    """
    if not address or not isinstance(address, str):
        return False
    clean = address.strip()
    if len(clean) != 34 or not clean.startswith("T"):
        return False
    try:
        raw = b58decode(clean)
    except ValueError:
        return False

    if len(raw) != 25 or raw[0] != 0x41:
        return False

    expected_checksum = hashlib.sha256(hashlib.sha256(raw[:21]).digest()).digest()[:4]
    return raw[21:] == expected_checksum


def detect_chain_from_address(address: str) -> Optional[str]:
    """
    Detects the primary address family ('evm', 'tron', 'solana') for a single address.
    Used for auto-routing and 1-click related-wallet Pivot Scans.
    """
    clean = (address or "").strip()
    if not clean:
        return None
    if is_valid_evm_address(clean):
        return "evm"
    if is_valid_tron_address(clean):
        return "tron"
    if is_valid_solana_address(clean):
        return "solana"
    return None


# ---------------------------------------------------------------------
# Normalization & Canonical Bundle Generation
# ---------------------------------------------------------------------

def _split_bundle_tokens(raw: str):
    """Split already prepared bundle text without normalizing address casing."""
    return [token for token in re.split(r"[,;\s]+", raw) if token]


def canonical_bundle(raw: str) -> str:
    """
    Parses, validates count, normalizes casing, deduplicates, and sorts
    multi-address bundle input deterministically.
    Enforces MAX_BUNDLE limit (default 5).
    """
    if not raw or not isinstance(raw, str):
        return ""
    tokens = _split_bundle_tokens(raw.strip())
    if len(tokens) > MAX_BUNDLE:
        raise ValueError(f"한 번에 최대 {MAX_BUNDLE}개 주소까지 분석할 수 있습니다. (입력: {len(tokens)}개)")

    norm_set: Set[str] = set()
    for t in tokens:
        if is_valid_evm_address(t):
            norm_set.add(t.lower())
        else:
            norm_set.add(t)
    return ",".join(sorted(norm_set))


def normalize_address(chain: str, address: str) -> str:
    """
    Normalizes an address according to its blockchain's address rules.
    - EVM: Lowercase (checksum is case-insensitive for identity/caching)
    - Solana/Tron: Preserves exact original casing (Base58 is case-sensitive)
    - Unified bundle: Canonicalized (sorted, lowercased EVM, deduplicated)
    """
    chain_norm = (chain or "").strip().lower()
    addr_norm = (address or "").strip()

    if chain_norm in EVM_CHAINS:
        return addr_norm.lower()

    if chain_norm == "unified":
        try:
            return canonical_bundle(addr_norm)
        except ValueError:
            return addr_norm

    # Solana, Tron retain exact casing
    return addr_norm


def make_cache_key(chain: str, address: str) -> str:
    """
    Constructs a deterministic, collision-safe cache key.
    Format: "{normalized_chain}:{normalized_address}"
    """
    norm_chain = (chain or "").strip().lower()
    norm_address = normalize_address(norm_chain, address)
    return f"{norm_chain}:{norm_address}"


def validate_address_format(chain: str, address: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that the address format and checksum match the expected chain syntax.
    Returns (is_valid, error_message).
    """
    norm_chain = (chain or "").strip().lower()
    clean_addr = (address or "").strip()
    if not clean_addr:
        return False, "주소가 입력되지 않았습니다."

    if norm_chain in EVM_CHAINS:
        if not is_valid_evm_address(clean_addr):
            return False, f"유효하지 않은 {norm_chain.upper()} 주소 형식 또는 EIP-55 체크섬입니다."
    elif norm_chain == "solana":
        if not is_valid_solana_address(clean_addr):
            return False, "유효하지 않은 Solana 주소 형식입니다. (32바이트 Ed25519 공개키 형식 오류)"
    elif norm_chain == "tron":
        if not is_valid_tron_address(clean_addr):
            return False, "유효하지 않은 Tron Base58Check 주소 형식입니다. (체크섬 불일치 또는 34자 형식 오류)"
    elif norm_chain == "unified":
        tokens = _split_bundle_tokens(clean_addr)
        if not tokens:
            return False, "분석할 지갑 주소가 없습니다."
        if len(tokens) > MAX_BUNDLE:
            return False, f"한 번에 최대 {MAX_BUNDLE}개 주소까지 분석할 수 있습니다. (입력: {len(tokens)}개)"
        for t in tokens:
            if not (is_valid_evm_address(t) or is_valid_solana_address(t) or is_valid_tron_address(t)):
                return False, f"인식할 수 없거나 체크섬이 유효하지 않은 주소입니다: '{t}'"

    return True, None
