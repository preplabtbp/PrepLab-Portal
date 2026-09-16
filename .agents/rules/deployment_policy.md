# Deployment & Git Push Policy

**CRITICAL RULES:**
1. **Branch Push Restriction:** JANGAN PERNAH menjalankan `git push origin main` atau push ke branch `main` KECUALI pengguna secara spesifik dan eksplisit meminta push ke `main`. Seluruh pengerjaan dan push kode default HANYA dilakukan ke branch `staging` atau branch fitur terkait.
2. **Cloud Deployment:** Do NOT automatically run deployment commands (like `gcloud run deploy`) when making code updates or adding new features.
3. Always make changes locally first.
4. Allow the user to test and verify the changes locally.
5. Wait for an EXPLICIT instruction or confirmation from the user before deploying releases to production/cloud environments.
6. This ensures the published app will not crash due to unverified updates.
