# Face ID / Passkey

The mobile and desktop login buttons use Supabase Auth passkeys. The server creates challenges,
verifies signed credentials, and issues the session. Existing device limits are
checked through restoreSession before opening the app. Local profiles are display
hints only; legacy client-only credentials must be enrolled again.

## Required hosted configuration

In Supabase Dashboard > Authentication > Passkeys, enable Passkey authentication.
Set the relying party name to VinFast Thuận An, RP ID to the production hostname
(without scheme or path), and allowed origins to the exact HTTPS origins used by
this app. Preview domains need their own compatible RP/origin configuration.
See https://supabase.com/docs/guides/auth/passkeys (experimental API).

Users sign in with their password once and choose Kích hoạt ngay. Subsequent
sign-ins use Đăng nhập bằng Face ID. The device chooses Face ID, Touch ID, or its
configured passkey verification method. Clearing browser storage does not revoke
server passkeys and does not prevent discoverable passkey sign-in.

## Verification

- npm run build
- node --test scripts/test-passkey.cjs
- On a real supported phone, over HTTPS: enroll, sign out, sign in with Face ID,
  cancel and retry, then repeat after clearing local browser storage.
- Confirm server rejection and device limits prevent opening the app.

Hardware biometric prompts require a real device; mocked unit checks cannot
verify Face ID sensors or the hosted project's RP/origin configuration.

## Desktop sign-in

Both standard and seasonal desktop login screens offer Passkey sign-in. After
password sign-in, supported browsers can enroll a passkey before entering the app.
Users can skip enrollment. Windows Hello, Touch ID, PINs, security keys and nearby
phones are offered by the browser according to available hardware and settings.
A local platform authenticator is not required for cross-device authentication.

Interactive desktop login holds automatic auth listeners until server/session
verification and optional enrollment finish. This prevents SIGNED_IN events from
opening the app before these checks complete. Password recovery remains separate.

Desktop flow regression checks: node --test scripts/test-desktop-passkey.cjs
