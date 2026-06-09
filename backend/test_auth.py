"""Quick test to verify auth is working"""
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, verify_password

db = SessionLocal()

# Check if any users exist
users = db.query(User).all()
print(f"Total users in database: {len(users)}")

if users:
    print("\nExisting users:")
    for u in users:
        print(f"  - {u.email} (ID: {u.id}, Name: {u.name})")
else:
    print("\nNo users found. Try registering first!")

# Test password hashing
test_pass = "test123"
hashed = hash_password(test_pass)
is_valid = verify_password(test_pass, hashed)
print(f"\nPassword hashing test: {'PASS' if is_valid else 'FAIL'}")

db.close()
