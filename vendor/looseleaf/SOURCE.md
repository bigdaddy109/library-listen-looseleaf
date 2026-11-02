# Looseleaf

Copied from https://github.com/kevintngo/looseleaf

- Commit: `4bdb647940e2fefb3cebb394f3bad25c766a27d2`
- Commit date: 2026-11-01
- Package version at that commit: `0.1.0` (`private: true`, not an npm library)
- License: MIT. The notice is `vendor/looseleaf/LICENSE`. It covers the copied files under:
  - `src/components/ui/`
  - `src/lib/ink/`
  - `src/lib/utils.ts`
  - `src/lib/field-class.ts`
  - `src/styles/looseleaf.css`
  - `src/styles/fonts.css`
  - `src/styles/fonts/*.woff2` (Kevin Sans)

IBM Plex Mono is not copied. It is installed from `@fontsource/ibm-plex-mono` (SIL Open Font License).

Why a copy, not a floating install: Looseleaf was published the day this preview was built. It is a shadcn registry (`npx shadcn add @looseleaf/...`), not a versioned package you can pin with npm. The registry on `main` can change without a release. Copying the components this preview actually renders, at one commit, keeps the notebook look reproducible.
