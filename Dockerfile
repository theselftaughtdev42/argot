# Static site: the final image holds only the built web root under /site.
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS deps
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
