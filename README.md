# argot
train your fingers to think in vim.

## Releases

Releases are published by pushing a version tag (`git tag v1.2.3 && git push origin v1.2.3`, from a commit on `main`). CI builds the `Dockerfile` and publishes the static site image as `ghcr.io/theselftaughtdev42/argot:<version>` (e.g. `:1.2.3`). The image is `FROM scratch` with the built site under `/site`.
