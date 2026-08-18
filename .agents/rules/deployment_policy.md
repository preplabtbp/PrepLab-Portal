# Deployment Policy

**CRITICAL RULE:** Do NOT automatically run deployment commands (like `gcloud run deploy`) when making code updates or adding new features. 
1. Always make changes locally first.
2. Allow the user to test and verify the changes locally.
3. Wait for an EXPLICIT instruction or confirmation from the user (e.g. "deploy this now") before pushing any releases to the cloud environment.
4. This ensures the published app will not crash due to unverified updates.
