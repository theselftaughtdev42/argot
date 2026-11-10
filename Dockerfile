# Static site: the final image holds only the built web root under /site.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS deps
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
