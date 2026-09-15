import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";

  const isAccountRoute = request.nextUrl.pathname.startsWith("/account");
  const isAccountAuthRoute =
    request.nextUrl.pathname === "/account/login" || request.nextUrl.pathname === "/account/signup";

  // Customer account pages just need any signed-in user — not admin_users
  // membership. Unauthenticated visitors get bounced to /account/login.
  if (isAccountRoute && !isAccountAuthRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (isAccountAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    return NextResponse.redirect(url);
  }

  // Being logged in isn't enough — the account must also have a row in
  // admin_users. This matters if Supabase's public signup is ever left
  // enabled: a random authenticated user still shouldn't reach /admin.
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("admin_users").select("id").eq("id", user.id).single();
    isAdmin = Boolean(data);
  }

  // Not logged in (or logged in but not an admin), hitting a protected
  // admin page -> bounce to login.
  if (isAdminRoute && !isLoginRoute && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Already an admin, hitting the login page -> go straight to dashboard.
  if (isLoginRoute && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
