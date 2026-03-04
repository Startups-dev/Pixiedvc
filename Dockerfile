# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS deps
WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Workspace packages are needed for pnpm workspace resolution (transpilePackages/externalDir)
COPY packages ./packages

RUN pnpm install --frozen-lockfile

FROM node:20-bookworm-slim AS build
WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# App sources + build-time config/content
COPY src ./src
COPY public ./public
COPY content ./content
COPY next.config.ts ./next.config.ts
COPY tsconfig.json ./tsconfig.json
# next-env.d.ts is optional (some repos do not commit it)
COPY postcss.config.mjs ./postcss.config.mjs
COPY middleware.ts ./middleware.ts

# --- build-time env needed for Next.js prerender ---
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/content ./content
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/postcss.config.mjs ./postcss.config.mjs

EXPOSE 8080

CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "8080", "-H", "0.0.0.0"]
