import { Commonloader } from "@/components/common/Loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomerHomeStore } from "@/features/customer/home/store";
import { formatPrice } from "@/lib/utils";
import { ArrowRight, Grid2X2, TicketPercent, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

// Ambient Background & Structure Classes
const pageWrapClass =
  "relative min-h-screen bg-background antialiased selection:bg-primary/20 overflow-hidden";
const ambientGlowClass =
  "absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl pointer-events-none -z-10";
const contentContainerClass =
  "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 relative z-10";
const sectionStackClass = "space-y-24 sm:space-y-32";

// Section Header Styling
const sectionHeadClass = "relative mb-12 space-y-3";
const sectionEyebrowClass =
  "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 px-3 py-1 rounded-full";
const sectionTitleClass =
  "text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl";

// Banner Section Classes
const bannerGridClass = "grid gap-8 lg:grid-cols-[1.6fr_1fr]";
const bannerMainCardClass =
  "group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-2xl transition-all duration-700 hover:shadow-primary/5 hover:border-primary/20";
const bannerMainImageClass =
  "h-[560px] w-full object-cover transition-all duration-1000 ease-out group-hover:scale-105 group-hover:rotate-1";
const bannerOverlayClass =
  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 sm:p-12";
const bannerOverlayTagClass =
  "inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground/90 uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full w-fit mb-4";
const bannerOverlayTitleClass =
  "text-3xl sm:text-4xl font-bold text-white tracking-tight max-w-lg mb-4";
const bannerOverlayButtonClass =
  "flex items-center gap-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors px-6 py-3 rounded-full w-fit shadow-lg shadow-primary/20";

const bannerSideGridClass = "grid gap-6 sm:grid-cols-2 lg:grid-cols-1";
const bannerSideCardClass =
  "group relative overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/20";
const bannerSideImageClass =
  "h-[268px] w-full object-cover transition-all duration-1000 ease-out group-hover:scale-105";

// Category Classes
const categoryGridClass = "grid gap-6 sm:grid-cols-2 xl:grid-cols-4";
const categoryCardClass =
  "group relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-b from-card to-card/50 p-1.5 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5";
const categoryContentClass =
  "relative h-full space-y-6 rounded-[1.6rem] bg-gradient-to-br from-background/40 to-muted/20 p-8 backdrop-blur-md transition-all duration-500 group-hover:bg-background/80";
const categoryIconWrapClass =
  "flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary ring-1 ring-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20";
const categoryIconClass = "h-6 w-6";
const categoryTextWrapClass = "space-y-2";
const categoryTitleClass =
  "text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300";
const categoryLinkClass =
  "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all duration-300 group-hover:text-primary";
const categoryArrowIconClass =
  "h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5";

// Premium Ticket Coupon Classes
const couponGridClass = "grid gap-6 md:grid-cols-2 xl:grid-cols-4";
const couponCardClass =
  "group relative overflow-hidden rounded-[2rem] border border-dashed border-primary/30 bg-primary/[0.01] transition-all duration-500 hover:border-primary/60 hover:bg-primary/[0.03] hover:-translate-y-1";
const couponTicketCutoutLeft =
  "absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-r border-dashed border-primary/30 group-hover:border-primary/60 transition-colors z-20";
const couponTicketCutoutRight =
  "absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-background border-l border-dashed border-primary/30 group-hover:border-primary/60 transition-colors z-20";
const couponContentClass = "space-y-6 p-8 relative";
const couponHeadClass = "flex items-center justify-between gap-4";
const couponIconWrapClass =
  "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-500 group-hover:rotate-12";
const couponIconClass = "h-5 w-5";
const couponCodeClass =
  "text-2xl font-bold tracking-[0.15em] text-foreground font-mono transition-colors group-hover:text-primary";
const couponBadgeClass =
  "border-none bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary rounded-full";
const couponCodeWrapClass =
  "space-y-1 pt-2 border-t border-dashed border-primary/10 mt-4";
const couponCodeLabelClass =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";

// High-End Product Cards
const productGridClass = "grid gap-6 sm:grid-cols-2 xl:grid-cols-4";
const productCardClass =
  "group flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-border/40 bg-card p-2.5 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/[0.03]";
const productContentClass =
  "flex flex-1 flex-col justify-between space-y-4 p-4";
const productImageWrapClass =
  "relative aspect-[4/5] w-full overflow-hidden rounded-[1.8rem] bg-muted/40";
const productImageClass =
  "h-full w-full object-cover transition-all duration-1000 ease-out group-hover:scale-105";
const productBadgeClass =
  "absolute top-4 left-4 z-20 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg shadow-primary/25";
const productInfoWrapClass = "space-y-2";
const productBrandRowClass = "flex items-center justify-between gap-3";
const productBrandClass =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80";
const productTitleClass =
  "line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary";
const productPriceRowClass =
  "flex items-center justify-between gap-3 pt-3 border-t border-border/40";
const productPriceClass = "text-xl font-bold tracking-tight text-foreground";
const productOriginalPriceClass =
  "text-xs font-medium text-muted-foreground/60 line-through decoration-muted-foreground/40 block";
const productViewClass =
  "inline-flex h-9 items-center justify-center rounded-full bg-primary/5 px-5 text-xs font-bold uppercase tracking-wider text-primary opacity-0 translate-y-2 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:opacity-100 group-hover:translate-y-0 group-hover:shadow-lg group-hover:shadow-primary/20";

export function StoreHome() {
  const { data, loading, loadHome } = useCustomerHomeStore((state) => state);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  if (loading) {
    return <Commonloader />;
  }

  const mainBanner = data.banners[0] || null;
  const sideBanners = data.banners.slice(1, 3);

  return (
    <div className={pageWrapClass}>
      {/* Decorative Blur Glows for Modern Aesthetic */}
      <div className={ambientGlowClass} />

      <div className={contentContainerClass}>
        <div className={sectionStackClass}>
          {/* Banner Section */}
          <section>
            <div className={bannerGridClass}>
              {mainBanner && (
                <Card className={bannerMainCardClass}>
                  <img
                    src={mainBanner.imageUrl}
                    alt="Featured Collection"
                    className={bannerMainImageClass}
                  />
                  <div className={bannerOverlayClass}>
                    <span className={bannerOverlayTagClass}>
                      <Sparkles className="h-3 w-3 text-primary" /> New Season
                    </span>
                    <h1 className={bannerOverlayTitleClass}>
                      Elevate Your Lifestyle Essentials
                    </h1>
                    <button className={bannerOverlayButtonClass}>
                      Discover Now <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              )}

              <div className={bannerSideGridClass}>
                {sideBanners.map((item) => (
                  <Card key={item._id} className={bannerSideCardClass}>
                    <img
                      src={item.imageUrl}
                      alt="Featured Collection"
                      className={bannerSideImageClass}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Categories Section */}
          {!!data.categories.length && (
            <section>
              <div className={sectionHeadClass}>
                <span className={sectionEyebrowClass}>Categories</span>
                <h2 className={sectionTitleClass}>Browse by collection</h2>
              </div>

              <div className={categoryGridClass}>
                {data.categories.slice(0, 4).map((categoryItem) => (
                  <Link
                    key={categoryItem._id}
                    to={`/collections?category=${categoryItem._id}`}
                    className="block"
                  >
                    <Card className={categoryCardClass}>
                      <CardContent className={categoryContentClass}>
                        <div className={categoryIconWrapClass}>
                          <Grid2X2 className={categoryIconClass} />
                        </div>
                        <div className={categoryTextWrapClass}>
                          <p className={categoryTitleClass}>
                            {categoryItem.name}
                          </p>
                        </div>

                        <span className={categoryLinkClass}>
                          View Collection
                          <ArrowRight className={categoryArrowIconClass} />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Coupons Section */}
          {!!data.coupons.length && (
            <section>
              <div className={sectionHeadClass}>
                <span className={sectionEyebrowClass}>Offers</span>
                <h2 className={sectionTitleClass}>Unlock Exclusive Deals</h2>
              </div>

              <div className={couponGridClass}>
                {data.coupons.slice(0, 4).map((coupon) => (
                  <Card key={coupon._id} className={couponCardClass}>
                    {/* Simulated Ticket Cutouts */}
                    <div className={couponTicketCutoutLeft} />
                    <div className={couponTicketCutoutRight} />

                    <CardContent className={couponContentClass}>
                      <div className={couponHeadClass}>
                        <div className={couponIconWrapClass}>
                          <TicketPercent className={couponIconClass} />
                        </div>
                        <Badge className={couponBadgeClass}>
                          {coupon.percentage}% OFF
                        </Badge>
                      </div>

                      <div className={couponCodeWrapClass}>
                        <p className={couponCodeLabelClass}>Use Coupon Code</p>
                        <p className={couponCodeClass}>{coupon.code}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Products Section */}
          {!!data.recentProducts.length && (
            <section>
              <div className={sectionHeadClass}>
                <span className={sectionEyebrowClass}>Latest</span>
                <h2 className={sectionTitleClass}>Fresh Arrivals</h2>
              </div>
              <div className={productGridClass}>
                {data.recentProducts.slice(0, 4).map((product) => (
                  <Link
                    to={`/collection/${product._id}`}
                    key={product._id}
                    className="block"
                  >
                    <Card className={productCardClass}>
                      <CardContent className={productContentClass}>
                        <div className={productImageWrapClass}>
                          {product.salePercentage > 0 && (
                            <div className={productBadgeClass}>
                              {product.salePercentage}% OFF
                            </div>
                          )}
                          <img
                            src={product.image}
                            alt={product.title}
                            className={productImageClass}
                          />
                        </div>

                        <div className={productInfoWrapClass}>
                          <div className={productBrandRowClass}>
                            <p className={productBrandClass}>{product.brand}</p>
                          </div>
                          <p className={productTitleClass}>{product.title}</p>
                        </div>

                        <div className={productPriceRowClass}>
                          <div className="space-y-0.5">
                            <p className={productPriceClass}>
                              {formatPrice(product.finalPrice)}
                            </p>
                            {product.salePercentage > 0 && (
                              <p className={productOriginalPriceClass}>
                                {formatPrice(product.price)}
                              </p>
                            )}
                          </div>

                          <span className={productViewClass}>View Detail</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
