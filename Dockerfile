# Static site: the final image holds only the built web root under /site.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS deps
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

FROM deps AS test
RUN pnpm test

FROM deps AS build
RUN pnpm build

FROM scratch
COPY --from=build /src/dist/ /site/
