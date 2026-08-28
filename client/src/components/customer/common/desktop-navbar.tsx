import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@clerk/react";
import {
  Heart,
  LogIn,
  LogOut,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Store,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CustomerMobileNavbar } from "./mobile-navbar";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const collectionsPage: NavItem = {
  label: "Collections",
  href: "/collections",
  icon: ShoppingBag,
};

const shell =
  "mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8";

const headerClass =
  "sticky top-0 z-50 border-b border-border/70 bg-secondary/60 backdrop-blur-xl";

const textLink =
  "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-[15px] font-medium text-foreground/90 transition hover:bg-white/5 hover:text-foreground";

const iconLink =
  "relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground/90 transition hover:bg-white/5 hover:text-foreground";

const brandWrap = "flex shrink-0 items-center gap-3";

const brandTitle =
  "text-[25px] font-semibold tracking-[-0.02em] text-foreground";

const desktopCollectionsWrap = "ml-6 hidden lg:block";

const desktopNav = "ml-auto hidden items-center gap-1 lg:flex";

const dropdownButton =
  "h-10 rounded-xl px-3 text-[15px] font-medium text-foreground/90 hover:bg-white/5 hover:text-foreground";

const dropdownContent =
  "mt-3 rounded-2xl border-border bg-popover/95 p-2 backdrop-blur";

const accountDropdownContent = `${dropdownContent} w-56`;

const dropdownItemLink =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5";

const cartBadge =
  "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold leading-5 text-black";

const wishlistBadge =
  "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold leading-5 text-black";

function NavTextLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link to={href} className={textLink}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export function CustomerNavbar() {
  const { isSignedIn, signOut } = useAuth();

  return (
    <header className={headerClass}>
      <div className={shell}>
        <Link to={"/"} className={brandWrap}>
          <Store className="h-10 w-10" />
          <span className={brandTitle}>E-Shopify</span>
        </Link>
        <div className={desktopCollectionsWrap}>
          <NavTextLink
            href={collectionsPage.href}
            label={collectionsPage.label}
            icon={collectionsPage.icon}
          />
        </div>

        <nav className={desktopNav}>
          <NavTextLink href="/wishlist" label="Wishlist" icon={Heart} />
          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={"ghost"} className={dropdownButton}>
                  <User className="h-4.5 w-4.5" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={accountDropdownContent}
              >
                <DropdownMenuItem asChild>
                  <Link to={"/account"} className={dropdownItemLink}>
                    <User className="h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                </DropdownMenuItem>

                {/* <DropdownMenuItem
                  onClick={() => void openOrders()}
                  className={dropdownItemLink}
                >
                  <ShoppingBasket className="h-4 w-4" />
                  <span>My Orders</span>
                </DropdownMenuItem> */}

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className={dropdownItemLink}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <NavTextLink href="/sign-in" label="Login" icon={LogIn} />
          )}
          <Link to={"/cart"} className={iconLink}>
            <ShoppingCart className="h-4.5 w-4.5" />
            <span className={cartBadge}>{0}</span>
          </Link>
        </nav>
        <CustomerMobileNavbar isSignedIn={isSignedIn} signOut={signOut} />
      </div>
    </header>
  );
}
