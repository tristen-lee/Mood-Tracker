"""
Run this once to generate VAPID keys for push notifications.
Then add both values as environment variables on Render.

Usage:
    python generate_vapid_keys.py
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64

private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

private_int = private_key.private_numbers().private_value
private_b64 = base64.urlsafe_b64encode(private_int.to_bytes(32, 'big')).rstrip(b'=').decode()

public_bytes = private_key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
public_b64 = base64.urlsafe_b64encode(public_bytes).rstrip(b'=').decode()

print("Add these to your Render environment variables:\n")
print(f"VAPID_PRIVATE_KEY={private_b64}")
print(f"VAPID_PUBLIC_KEY={public_b64}")
