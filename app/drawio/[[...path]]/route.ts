import type { NextRequest } from "next/server"

const DRAWIO_UPSTREAM_ORIGIN = "https://embed.diagrams.net"

type RouteContext = {
    params: Promise<{
        path?: string[]
    }>
}

function buildUpstreamUrl(path: string[] | undefined, search: string) {
    const pathname = path?.length ? `/${path.join("/")}` : "/"
    const url = new URL(pathname, `${DRAWIO_UPSTREAM_ORIGIN}/`)
    url.search = search
    return url
}

async function proxyDrawio(request: NextRequest, context: RouteContext) {
    const { path } = await context.params
    const upstreamUrl = buildUpstreamUrl(path, request.nextUrl.search)
    const upstreamResponse = await fetch(upstreamUrl, {
        headers: {
            accept: request.headers.get("accept") || "*/*",
            "accept-language": request.headers.get("accept-language") || "*",
            "user-agent": request.headers.get("user-agent") || "Next-AI-Drawio",
        },
        method: request.method,
        redirect: "follow",
    })

    const headers = new Headers(upstreamResponse.headers)
    headers.delete("content-security-policy-report-only")

    return new Response(upstreamResponse.body, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
    })
}

export async function GET(request: NextRequest, context: RouteContext) {
    return proxyDrawio(request, context)
}

export async function HEAD(request: NextRequest, context: RouteContext) {
    return proxyDrawio(request, context)
}
