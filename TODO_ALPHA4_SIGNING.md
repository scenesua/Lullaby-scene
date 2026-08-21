# Alpha 4 signing compatibility gate

`v1.1.0-alpha.3` was published from a release build configured with Gradle's debug signing key. The `v1.1.0-alpha.4` one-shot publisher must not publish an APK unless its certificate SHA-256 digest exactly matches the published alpha.3 APK.

The protected-main publisher now downloads the alpha.3 APK, rebuilds alpha.4 through the legacy debug-signing path, compares both APK signer digests with `apksigner`, and only publishes alpha.4 when they match.

If they do not match, the workflow fails without creating alpha.4. That means the historical debug private key is not reproducible and an explicit one-time signing migration/reinstall is required before future in-place updates can be made reliable.
