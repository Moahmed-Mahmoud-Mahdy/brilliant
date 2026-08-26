# BRILLIANT — Worklog

Project: متجر بريليانت — E-commerce for beauty & skincare products (Arabic RTL, luxury gold theme)
BRD: /home/z/my-project/upload/BRILLIANT_BRD_v1.2.docx (v1.2)

## Global Architecture Decisions

- Single user-visible route: `/` (SPA with client-side view switching via Zustand UI store). All backend via Next.js API routes under `/api/*` (same port 3000, no mini-services needed).
- Stack: Next.js 16 App Router, TypeScript, Tailwind 4 + shadcn/ui (already installed), Prisma + SQLite, Zustand (cart + UI), TanStack Query (server state).
- RTL Arabic-first. Fonts: Tajawal (body) + El Messiri (display headings) via next/font/google.
- Theme: Light/Dark via next-themes. Luxury gold palette: #B8863B, #D9AF61, #FAF6EF, #4A3A1F, #EDDFC0.
- Payment: COD only. Delivery: Cairo/Giza zones only. WhatsApp handoff for OOS + out-of-coverage.
- Auth: custom cookie sessions (HMAC-signed token) + scrypt password hashing. Customer = phone+password. Admin = username+password.
- Admin panel accessible from same `/` route via hidden footer link or `#admin` hash (BRD: admin path not publicly visible).
- Order numbers: `BR-{YYMMDD}-{4 digits}`. SKU codes auto-generated: `BR-{6 digits}` sequential.
- Currency: EGP (ج.م). WhatsApp demo number: 201234567890 (constant WHATSAPP_NUMBER).

## Core Business Rules (from BRD)

- Color is the ONLY variant. Each color = independent SKU w/ own stock. Product without colors = one base SKU. Price unified across colors.
- Product states: ACTIVE / OUT_OF_STOCK (visible, WhatsApp CTA) / ARCHIVED.
- Inventory per SKU: availableQty / reservedQty / soldQty. Never negative available.
- Inventory transaction types: RECEIVE, RESERVE, RELEASE, SALE, ADJUSTMENT (each logs balanceBefore/After, reason, orderId, adminId).
- Order lifecycle: PENDING_REVIEW → CONFIRMED → OUT_FOR_DELIVERY → DELIVERED; PENDING_REVIEW → REJECTED (mandatory reason) / CANCELLED; CONFIRMED/OUT_FOR_DELIVERY → CANCELLED (release reserved stock).
- Reservation happens at CONFIRMED (not at order creation). Delivered converts Reserved→Sold. Cancel releases Reserved→Available.
- Discount code = percentage on products subtotal. Sale Price independent. Shipping fee per zone added after zone selection. Order stores price snapshot.
- Low stock alert per SKU threshold (availableQty <= threshold → admin notification; == 0 → OOS).

## Prisma Schema (source of truth: prisma/schema.prisma)

Models: Admin, Customer, Category, Product, Sku, InventoryTransaction, Order, OrderItem, DeliveryZone, DiscountCode, Banner, Notification, ActivityLog.

## API Contract (all under /api, JSON)

### Public / Customer
- POST /api/auth/register {name, phone, password} → {customer}
- POST /api/auth/login {phone, password} → {customer}
- POST /api/auth/logout → {}
- GET /api/auth/me → {customer | null}
- GET /api/categories → {categories: CategoryDTO[]} (active only, with product counts)
- GET /api/products?search=&categoryId=&minPrice=&maxPrice=&availability=(all|in_stock|out_of_stock)&sort=(newest|price_asc|price_desc) → {products: ProductListDTO[]}
- GET /api/products/{id} → {product: ProductDetailDTO}
- GET /api/banners → {banners: BannerDTO[]} (active)
- GET /api/zones → {zones: ZoneDTO[]} (active)
- POST /api/discount-codes/validate {code, subtotal} → {valid: boolean, discountAmount, percentage, code} 
- POST /api/orders {items: [{skuId, quantity}], name, phonePrimary, phoneSecondary, whatsappOn: "primary"|"secondary"|"both", addressText, lat?, lng?, floor, apartment, zoneId, discountCode?} → {order} (requires customer session; validates stock; snapshot prices; status PENDING_REVIEW)
- GET /api/orders → {orders: OrderDTO[]} (my orders)
- GET /api/orders/{id} → {order} (own only)
- POST /api/orders/{id}/reorder → {added: [{skuId, quantity}], unavailable: [{productName, colorName}]}
- GET /api/notifications → {notifications} (mine)
- POST /api/notifications/read {ids?} → {} (mark all/ids read)
- POST /api/upload (multipart form, field "file") → {url} (admin only; saves to public/uploads/)

### Admin (require admin session cookie)
- POST /api/admin/login {username, password} → {admin}
- POST /api/admin/logout → {}
- GET /api/admin/me → {admin | null}
- GET /api/admin/dashboard → {ordersByStatus: {...}, newOrdersCount, lowStockSkus, outOfStockSkus, deliveredSalesTotal, deliveredOrdersCount, totalProducts, totalCustomers, recentOrders}
- GET /api/admin/orders?status=&search= → {orders}
- GET /api/admin/orders/{id} → {order with items + customer history summary}
- PUT /api/admin/orders/{id} {action: "confirm"|"reject"|"out_for_delivery"|"deliver"|"cancel", reason?} → {order} (enforces transitions + inventory ops + notifications)
- GET /api/admin/products?search=&status= → {products with skus}
- POST /api/admin/products {name, description, price, salePrice?, categoryId?, images: string[], colors: [{name, hex, quantity, lowStockThreshold}], baseQuantity?, baseLowStockThreshold?, attributes: [{key, value}]}
- PUT /api/admin/products/{id} {...same + status: "ACTIVE"|"ARCHIVED"}
- DELETE /api/admin/products/{id} → archive
- GET/POST/PUT/DELETE /api/admin/categories[/{id}] {name, description, image?, isActive}
- GET /api/admin/customers?search= → {customers with order stats}
- GET/POST/PUT /api/admin/zones[/{id}] {name, shippingFee, isActive}
- GET/POST/PUT/DELETE /api/admin/discount-codes[/{id}] {code, percentage, expiresAt?, isActive}
- GET/POST/PUT/DELETE /api/admin/banners[/{id}] {title, subtitle, image, isActive, sortOrder}
- GET /api/admin/inventory?lowStock=true → {skus: [{id, skuCode, productName, colorName, colorHex, available, reserved, sold, lowStockThreshold, isLow, isOut}]}
- POST /api/admin/inventory/adjust {skuId, type: "RECEIVE"|"ADJUSTMENT", quantity (signed for adjustment, positive for receive), reason} → {sku}
- GET /api/admin/inventory/transactions?skuId= → {transactions}
- GET /api/admin/activity-log → {logs}
- GET /api/admin/notifications → {notifications} ; POST /api/admin/notifications/read
- PUT /api/admin/profile {name?, password?} → {admin}

### Shared DTOs (src/lib/types.ts)
- ProductListDTO: id, name, price, salePrice, primaryImage, images, categoryName, colors: [{skuId, name, hex, available, isOut}], isOut (fully), hasColors, discountPercent
- ProductDetailDTO: + description, attributes: [{key, value}], category
- OrderDTO: id, orderNumber, status, items: [{productName, colorName, colorHex, quantity, unitPrice, lineTotal}], subtotal, discountAmount, discountCode, shippingFee, total, zoneName, address {text, floor, apartment, lat, lng}, phonePrimary, phoneSecondary, whatsappOn, rejectionReason, cancellationReason, createdAt, customerName
- Status enum strings: PENDING_REVIEW | CONFIRMED | OUT_FOR_DELIVERY | DELIVERED | REJECTED | CANCELLED

## Views (SPA, Zustand useUiStore drives switching)
Store views: home, products, product (id), cart, checkout, auth, orders
Admin views: dashboard, products, categories, orders, order (id), customers, inventory, zones, offers, activity, settings

## Demo Credentials (seeded)
- Admins: admin1 / admin2 — password: brilliant2026
- Customer: 01000000000 — password: 123456
- Discount codes: WELCOME10 (10%), GOLD20 (20%)

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Foundation — schema, db, core libs, theme, images, seed

Work Log:
- Read BRD from upload/BRILLIANT_BRD_v1.2.docx
- Created worklog with architecture decisions, API contract, DTOs
- Wrote full Prisma schema (prisma/schema.prisma): Admin, Customer, Category, Product, Sku, InventoryTransaction, Order, OrderItem, DeliveryZone, DiscountCode, Banner, Notification, ActivityLog. NOTE: OrderItem.skuId is a plain string (no FK) so order history survives SKU deletion.
- Ran `bun run db:push` — DB in sync at db/custom.db
- Created src/lib/types.ts (all shared DTOs)
- Created src/lib/constants.ts (WHATSAPP_NUMBER=201234567890, formatPrice, ORDER_STATUS_LABELS, INVENTORY_TX_LABELS, ACTION_LABELS, whatsappLink(), generateOrderNumber())
- Created src/lib/auth.ts (scrypt hash/verify, HMAC session cookies: brilliant_customer / brilliant_admin, setCustomerSession/clearCustomerSession/getCustomerSession/getCurrentCustomer + admin equivalents)
- Created src/lib/api.ts — typed client for ALL endpoints (this is the exact contract; match it server-side)
- Created src/lib/store.ts — zustand stores: useUiStore (view routing: home/products/product/cart/checkout/auth/orders + adminMode + returnView), useCartStore (persisted items), useAuthStore (customer), useAdminStore (admin), cartTotals()
- Theme: src/app/globals.css (luxury gold light/dark palette, gold-shimmer text, float animations, pattern-lux, scrollbar-thin, print styles). src/app/layout.tsx (lang=ar dir=rtl, Tajawal + El_Messiri fonts, ThemeProvider with class strategy, defaultTheme=light)
- Created src/components/theme-provider.tsx, src/components/floating-icons.tsx (floating beauty icons background)
- SPA shell: src/app/page.tsx → src/components/app-root.tsx (QueryClientProvider, #admin hash detection) → src/components/store/app.tsx (header/footer + view switch)
- Created src/components/store/header.tsx (logo, nav, search, theme toggle, notification bell w/ 30s poll, account menu, cart button) and src/components/store/footer.tsx (sticky footer mt-auto, hidden admin entry via lock icon)
- Created src/components/admin/admin-app.tsx — FULL admin shell: login gate (uses useAdminStore + api.admin.login), desktop sidebar (right, RTL) + mobile sheet, notification bell, theme toggle, "عرض المتجر" exit, 10 view slots. Imports views from ./views/*.tsx
- Created stub view files (placeholders) in src/components/store/views/ (7 files) and src/components/admin/views/ (10 files)
- Wrote prisma/seed.ts and ran it — seeded: 2 admins (admin1/admin2, pass brilliant2026), 6 categories, 17 products w/ SKUs (incl. OOS color بني نيود on lipstick, fully-OOS body mist, low-stock toner), 10 delivery zones (Cairo/Giza w/ fees 30-50), 3 discount codes (WELCOME10, GOLD20, SUMMER15-expired), 3 banners, 3 customers (01000000000/123456 demo), 6 orders across all statuses w/ consistent inventory transactions (RESERVE/RELEASE/SALE), notifications, activity logs
- Images generating to public/images/products/*.png + banners/*.png (script: scripts/gen-images.sh, running in background)
- Verified: GET / returns 200, stubs compile

Stage Summary:
- Foundation complete & compiling. Dev server running on :3000 (do NOT restart it; do NOT run `bun run build`)
- OWNERSHIP for next tasks:
  - Task 2 (backend): src/app/api/** (delete old src/app/api/route.ts), may create src/lib/inventory.ts, src/lib/notify.ts, src/lib/helpers.ts
  - Task 3 (customer FE): src/components/store/views/** ONLY (7 files, replace stubs)
  - Task 4-a (admin core FE): src/components/admin/views/{dashboard,orders,customers}-view.tsx ONLY
  - Task 4-b (admin catalog FE): src/components/admin/views/{products,categories,inventory,zones,offers,activity,settings}-view.tsx ONLY
  - NOBODY touches: page.tsx, layout.tsx, globals.css, app-root.tsx, store/app.tsx, store/header.tsx, store/footer.tsx, admin-app.tsx, lib/*, prisma/*
- Money format: formatPrice() everywhere on FE. API returns plain numbers.
- Toasts: use `useToast` from "@/hooks/use-toast" (Toaster already in layout)
- ESLint is lenient (img tags OK, unused vars OK). Run `bun run lint` to check your files.

---
Task ID: 3
Agent: frontend-styling-expert (customer frontend)
Task: Customer-facing SPA views

Work Log:
- Replaced all 7 stub views + added shared component in src/components/store/views/:
  - product-card.tsx (NEW shared): clickable card → openProduct(id), aspect-square image, gold "-X%" discount badge (top-right), "غير متوفر" OOS overlay, name line-clamp-1, category, price row (sale gold + old strikethrough), first-5 color dots (OOS dots dimmed), framer-motion hover lift + stagger (index prop).
  - home-view.tsx: hero carousel (api.banners, 5s auto-rotate, AnimatePresence fade, RTL gradient overlay from right, dots indicator, CTA → goProducts(), static pattern-lux fallback hero if no banners, onError img fallback), categories horizontal scroll row (cycling Lucide icons Sparkles/Brush/Scissors/Flower2/Droplets/Gift, productCount, click → goProducts({categoryId, categoryName})), "وصل حديثًا" featured grid (sort=newest, first 8) + "عرض كل المنتجات", 4 value props (Truck/Banknote/BadgeCheck/MessageCircle) with whileInView stagger.
  - products-view.tsx: filters Card (search w/ 400ms debounce, category Select w/ counts, availability Select, sort Select, min/max price inputs, reset link). Store filter (useUiStore.filter) is the SINGLE source of truth for search/category/availability (writes via setFilter) — chosen to satisfy react-hooks v7 `set-state-in-effect` rule (no local-state sync effects); sort/price are local-only. Query ["products", params] with keepPreviousData, skeletons, count text, empty state w/ reset CTA. Header search / category clicks flow in through the store naturally.
  - product-view.tsx: breadcrumb (الرئيسية/المنتجات/name), lg:grid-cols-2 (gallery right in RTL = first). Gallery & PurchasePanel are child components keyed by product.id (clean per-product state reset, no effects). Gallery: main aspect-square AnimatePresence on image change + thumbnails ring-primary. Info: category chip, font-display title, price block (sale + strikethrough + discount % badge), "متبقٍ X فقط" amber hint (≤5). PurchasePanel: color swatches h-10 rounded-full w/ ring-primary when selected; OOS color = opacity-50 + cursor-not-allowed + rotated diagonal strike + tooltip "غير متوفر — تواصلي معنا" (still selectable → shows WhatsApp CTA per BRD); quantity stepper (clamped to sku available, toast when max); Add to Cart (gold lg, live total in label) → cartStore.addItem + toast w/ "الانتقال للسلة" action; whole-product/OOS-color → green WhatsApp CTA (whatsappLink with product+color name). Description whitespace-pre-line + attributes zebra table.
  - cart-view.tsx: empty state (ShoppingBag/pattern-lux + CTA), item Cards (img 20x20, color swatch+name, unit price, stepper w/ max-clamp toast, line total + base strikethrough, trash), sticky summary (count, subtotal, وفّرتِ green from cartTotals, COD note, "إتمام الطلب" → returnView flow: !customer → setReturnView("checkout")+setView("auth"), else checkout; "متابعة التسوق" ghost; "تفريغ السلة" w/ AlertDialog confirm). lg:grid-cols-[1fr_360px].
  - checkout-view.tsx: 5-step wizard per BRD §3.4. Guards: empty cart state; !customer (after load) → setReturnView("checkout")+setView("auth"). Stepper: numbered circles on a track (User/Phone/MapPin/Building2/ClipboardCheck), current=gold filled+ring, done=emerald check. Step 1: name (prefilled), phonePrimary (regex ^01[0125][0-9]{8}$, dir=ltr), discount code → api.validateDiscount → applied chip "خصم X% — وفّرتِ Y" w/ remove, inline error otherwise. Step 2: phoneSecondary (regex + ≠primary error) + whatsappOn RadioGroup (primary/secondary/both, WhatsApp icons + live numbers). Step 3: addressText textarea (≥10 chars live counter) + "استخدام موقعي الحالي" geolocation → green chip w/ coords (dir=ltr) + remove, error toast on failure. Step 4: floor/apartment + zones Select ("{name} — شحن {fee} ج.م") + Alert w/ out-of-coverage WhatsApp link. Step 5: review (items rows, address block, totals: subtotal/discount w/ code/shipping/total gold) + submit via api.orders.create → success screen (spring CheckCircle2, orderNumber gold font-display, "بانتظار مراجعة فريقنا", total, طلباتي/متابعة التسوق buttons), clears cart + invalidates orders/notifications; API error → destructive toast, stay on step. Footer: السابق/التالي with per-step validation disabling التالي; step 5 footer button = تأكيد الطلب w/ spinner + live total. Steps slide via AnimatePresence (RTL direction). Discount display recomputed live from percentage (subtotal-proof).
  - auth-view.tsx: centered luxury card (max-w-md, gold-border-card, pattern-lux bg, Gem logo + gold-gradient بريليانت), Tabs login/register. Phone regex validation w/ inline errors, password ≥6, register confirm-match. Mutations → setCustomer + invalidate orders/notifications + navigate: returnView ?? (cartCount>0 ? "checkout" : "orders"). Demo hint chip (01000000000 / 123456). API errors → destructive toasts.
  - orders-view.tsx: !customer (after load) → login prompt w/ returnView("orders"). ["orders"] query, newest first. Order Cards: header (orderNumber mono gold dir=ltr, ar-EG date+time, status Badge w/ custom colors: PENDING_REVIEW amber / CONFIRMED gold / OUT_FOR_DELIVERY orange / DELIVERED emerald / REJECTED red / CANCELLED zinc), 2-item preview + "+N منتجات أخرى", total + Reorder button. Expandable (AnimatePresence height): 4-step status timeline (done=gold check, current=pulsing gold, future=muted; REJECTED/CANCELLED → red X terminal state), full items (swatch+color, unit×qty, lineTotal), address block (name/phones/whatsappOn label/address/floor-apartment/zone/coords), payment summary (subtotal, discount code line, shipping, total), red-tinted reason box (سبب الرفض/الإلغاء). Reorder → api.orders.reorder → addItem per returned cartItems → toast + setView("cart"); unavailable items → inline destructive Alert in expanded card.
- Verified against LIVE backend (Task 2 endpoints came up mid-task): /api/products, /api/products/{id}, /api/categories, /api/banners, /api/zones, /api/auth/login (+me), /api/orders (list/create), /api/orders/{id}/reorder, /api/discount-codes/validate — ALL match src/lib/types.ts shapes I coded against. Created a real test order (BR-260825-3108, WELCOME10 discount, lat/lng) through the exact checkout contract. eslint: 0 errors/0 warnings in my files; tsc: 0 errors in my files; dev server compiles clean (GET / 200).

Stage Summary:
- All 8 customer view files DONE and compiling clean. Design: luxury gold RTL (text-gold-gradient headings, gold-border-card, pattern-lux, framer-motion subtle), mobile-first grids (2/3/4), skeletons + empty states everywhere, formatPrice/ar-EG dates everywhere.
- ⚠️ INTEGRATION NOTE FOR TASK 2 (backend) — CRITICAL for cart: mapProductList() filters skus to `!!s.colorName`, so colorless products (13 of 17 seeded; hasColors=false) return `colors: []` with NO skuId in public DTOs → customer FE cannot Add-to-Cart them (my product-view currently degrades those to the WhatsApp CTA). FIX: include the base SKU in `colors` (e.g. {skuId, name: "" or null, hex: "" or null, available, isOut}). My FE already handles this gracefully TODAY: when hasColors=false it silently uses colors[0] as the selected SKU (passes colorName/colorHex = null to cart), no swatch UI rendered — zero frontend changes needed once fixed.
- ⚠️ NOTE FOR TASK 1 (assets): public/images/banners/ is EMPTY (seed references /images/banners/banner1-3.png → 404). Product images all exist. Hero has an onError fallback (fades image out over pattern-lux bg) so the page still looks intentional; dropping the 3 banner PNGs in fixes it with no code change.
- Toasts use explicit `duration` (2.5–6s) since the shared use-toast hook has a ~16min default remove delay; toasts include action buttons ("الانتقال للسلة").
- Products filter state intentionally lives in useUiStore (single source of truth) — required by react-hooks v7 set-state-in-effect lint rule (repo eslint v7 flags setState-in-effect as ERROR; exhaustive-deps is off).
- Query keys used: ["products", params], ["products","home","newest"], ["product", id], ["banners"], ["categories"], ["zones"], ["orders"], ["notifications"]. Mutations invalidate + toast per spec.

---
Task ID: 4-a
Agent: fullstack-developer (admin core)
Task: Admin dashboard + orders + customers views

Work Log:
- Read worklog, api.ts, types.ts, constants.ts, store.ts, admin-app.tsx, globals.css (print styles), shadcn ui components (dialog/tabs/table/badge/alert), use-toast.
- Replaced stub dashboard-view.tsx: stat cards grid (new orders amber BellRing → orders view; delivered sales emerald BadgeCheck w/ formatPrice + "من X طلب"; low stock orange AlertTriangle → inventory; OOS red PackageX → inventory; second row: products/customers/totalOrders), recharts BarChart of 6 statuses (Arabic labels, gold CSS-var colors, RTL reversed XAxis + right YAxis, ar-EG tooltip), recent orders table (gold mono orderNumber, row click → orders), low stock/OOS SKU list card (color swatch, skuCode, available, منخفض/نفد badges, → inventory), full skeleton loading, framer-motion entrance.
- Replaced stub orders-view.tsx (BRD §8.5): status Tabs (الكل + 6 statuses w/ live counts from ["admin-dashboard"]) + debounced search (order no/name/phone); desktop shadcn Table + mobile card list; refresh button (invalidate orders+dashboard); CSV export of CURRENT filtered orders w/ UTF-8 BOM + Arabic headers [رقم الطلب, التاريخ, العميل, الهاتف, المنطقة, الحالة, الإجمالي الفرعي, الخصم, الشحن, الإجمالي] via blob download.
- Order Details Dialog (max-w-3xl, max-h-[90vh], scrollbar-thin): gold mono orderNumber + status badge + full date; customer card (phones dir=ltr w/ WhatsApp indicator per whatsappOn, address + floor/apartment + zone, google maps link if lat/lng); items table (image thumb, color swatch, skuCode mono, unitPrice/qty/lineTotal); totals block (subtotal, discount w/ code badge, shipping, gold bold total); customer history chips; rejection/cancellation reason destructive Alerts; status-transition action bar (BRD §6.2): PENDING_REVIEW→confirm(gold)/reject(outline)/cancel(ghost), CONFIRMED→out_for_delivery(gold Truck)/cancel, OUT_FOR_DELIVERY→deliver(emerald)/cancel, final states→Lock "حالة نهائية"; reject sub-dialog w/ MANDATORY reason (disabled until non-empty, BR-11), cancel sub-dialog w/ optional reason + reserved-stock release note; all via api.admin.updateOrder + invalidate ["admin-orders"], ["admin-order", id], ["admin-dashboard"] + Arabic toasts (API errors surfaced via destructive toast); print receipt (.print-area hidden print:block, rendered outside Dialog portal, store header/BRILLIANT, order+customer+address, items, totals w/ formatPrice, COD note, thanks footer) via window.print().
- Replaced stub customers-view.tsx: debounced search (name/phone) + result count; table w/ gold initials avatar, mono ltr phone, orders/delivered/cancelled/rejected counts, totalSpent formatPrice, createdAt; mobile cards w/ 4-stat grid; details Dialog: avatar+info, 4 stat cards + gold إجمالي الإنفاق card, BRD §8.6 note (account actions per admin permissions, manual WhatsApp password recovery — NO password UI), wa.me contact button (EG phone 0→20 internationalized); skeletons + empty states.
- Fixed mid-task JSX parse error (duplicate </Dialog>), ESLint react-hooks/set-state-in-effect (moved sub-dialog reset into Dialog onOpenChange), Radix a11y warnings (sr-only DialogTitle in loading/null states).
- NOTE: dev server on :3000 had DIED mid-task (no next process, port closed) — restarted it detached via `nohup bun run dev &` (same script/port, dev.log preserved by tee); backend agent's routes all came online after.
- Verified via curl: POST /api/admin/login 200 (cookie jar), GET dashboard/orders/order/{id}/customers/inventory?lowStock=true all 200 & match api.ts contract exactly; PUT bad transition → 400 "لا يمكن تنفيذ هذا الإجراء في حالة الطلب الحالية"; PUT reject w/o reason → 400 "سبب الرفض إجباري"; PUT confirm 200 {order} (order BR-260825-0004 PENDING_REVIEW→CONFIRMED, used as live test order, later advanced CONFIRMED→OUT_FOR_DELIVERY→DELIVERED via UI).
- Verified in headless browser (agent-browser, isolated session): admin login → dashboard renders (stat cards, gold bar chart, recent orders, low-stock card w/ منخفض/نفد badges); orders view (tabs w/ counts, search "مريم" + CONFIRMED filter → 1 row, table cells); details dialog (address الدور/شقة, totals ٨٤٠+٣٠=٨٧٠ ج.م, history chips, correct action bar per status); LIVE action flow بدء التوصيل → status badge + actions updated in-place via invalidation, then تم التسليم → "حالة نهائية" lock note; CSV export blob intercepted: first bytes EF BB BF (UTF-8 BOM ✓) + Arabic headers + plain-number money columns; customers view (4 rows, phone search "01000000000" → 1 result, details dialog stat cards + totalSpent ٨٧٠ ج.م + BRD §8.6 note + wa.me link). VLM screenshot review: dashboard + order dialog "polished, no glitches, flawless RTL".
- bunx eslint on 3 files: CLEAN (0 problems). bunx tsc --noEmit: 0 errors in my files. dev.log: no compile errors for my files.

Stage Summary:
- DONE: dashboard-view.tsx, orders-view.tsx, customers-view.tsx fully implemented per spec + live-tested end-to-end against the real backend (all queries, status transitions w/ stock side-effects, CSV BOM, print receipt markup).
- Query keys used: ["admin-dashboard"], ["admin-orders", status, search], ["admin-order", id], ["admin-customers", search], ["admin-inventory","low"] — inventory view (4-b) may reuse/invalidate ["admin-dashboard"] after stock ops (already handled by orders mutations).
- Test order BR-260825-0004 (مريم حسن) was advanced PENDING_REVIEW→CONFIRMED→OUT_FOR_DELIVERY→DELIVERED during live verification — demo dataset now has 0 PENDING_REVIEW orders; re-run seed if a pending order is needed for demos.
- Dev server restarted by me mid-task (it had died) — running detached on :3000, do NOT restart/build.
- Money everywhere via formatPrice (CSV uses plain numbers by design for Excel). No blue anywhere; status palette: amber/gold/orange/emerald/red/zinc.

---
Task ID: 4-b
Agent: fullstack-developer (admin catalog)
Task: Admin products/categories/inventory/zones/offers/activity/settings views

Work Log:
- Read worklog + tools (api.ts, types.ts, constants.ts, store.ts, admin-app.tsx, ui/*, use-toast) — coded strictly against api.ts contract
- Replaced 7 stub views (all "use client" + default export, luxury gold RTL design, bg-card rounded-2xl border, formatPrice, ar-EG dates, skeletons, empty states, Arabic toasts on every mutation):
  1) products-view.tsx (BRD §8.3): debounced search + status filter (الكل/مفعّل/مؤرشف) + gold add button; table with thumb, name+category, price/salePrice/discount% badge, SKU summary ("4 ألوان — متاح 21" / "متاح 5"), status badge, edit/archive+restore (AlertDialog → DELETE / PUT status=ACTIVE). Product form dialog (max-w-3xl, max-h-[85vh] scrollable): name/desc/price/salePrice (hint اتركيه فارغًا)/category Select (بدون قسم option); images manager (grid with رئيسية badge on first, remove X, upload via api.admin.upload, add-by-URL); dynamic attributes rows (key/value + hint مثل الحجم/نوع البشرة/بلد المنشأ); colors/SKU section: CREATE = Switch "منتج بألوان متعددة" → color rows (name + type=color hex + qty + threshold) or base qty+threshold; EDIT with colors = existing SKUs table (skuCode mono, editable colorName/colorHex/threshold, read-only available/reserved/sold + note "تعدّل الكميات من صفحة المخزون", delete disabled+tooltip "لا يمكن حذف لون محجوز" when reserved>0 → removedSkuIds) + "إضافة لون جديد" rows (newColors); EDIT single base SKU = read-only stock card + editable threshold. Submit create {…, colors, baseQuantity, baseLowStockThreshold} / update {…scalars, status, skus[{id,name,hex,lowStockThreshold}], newColors, removedSkuIds}
  2) categories-view.tsx: table (name, truncated desc, productCount, inline active Switch → PUT, edit, delete AlertDialog enabled only when productCount===0 else disabled + tooltip "انقلي المنتجات أولًا أو عطّلي القسم"); create/edit dialog (name, description, isActive)
  3) inventory-view.tsx (BRD §7): tabs الكل/مخزون منخفض/نفد (inventory({lowStock}) + client isOut filter); SKUs table (product img+name, color swatch/name or "— أساسي —", skuCode mono, available bold, reserved muted+tooltip "محجوز لطلبات مؤكدة", sold, threshold, status badge طبيعي emerald/منخفض amber/نفد red); "تعديل المخزون" dialog (type Select RECEIVE/ADJUSTMENT ±, qty, reason REQUIRED BR-13 → api.admin.adjustInventory → toast "الرصيد الجديد: N"); "سجل الحركات" filters tx section to skuId (clearable chip); transactions log card (max-h-[500px] scroll, sticky header): date ar-EG, product+color, skuCode, tx-type badge (RECEIVE emerald/RESERVE amber/RELEASE orange/SALE gold/ADJUSTMENT zinc via INVENTORY_TX_LABELS), signed qty (+green/-red), balance before→after, reason, orderNumber gold mono, adminName
  4) zones-view.tsx (BRD §5.1): coverage Alert "التغطية الحالية: القاهرة والجيزة فقط — خارج النطاق يوجَّه العملاء لواتساب"; table (name, fee formatPrice, inline active Switch → toast "تم تعطيل المنطقة — لن تظهر للعملاء", edit, delete AlertDialog); create/edit dialog (name, shippingFee, isActive)
  5) offers-view.tsx (BRD §8.4): Tabs البانرات/أكواد الخصم. Banners: grid cards (img h-40, title, subtitle, ترتيب badge, inline active Switch, edit, delete AlertDialog); dialog with image manager (upload + URL + preview), sortOrder, isActive. Codes: table (code mono dir=ltr gold, %X, expiry date or "بدون انتهاء" + red "منتهية" badge if past, inline Switch, edit/delete); dialog with auto-uppercase code, percentage 1-100, optional date, isActive
  6) activity-view.tsx (BRD §8.7): timeline list (gold-dot spine), ACTION_LABELS badge (fallback raw), summary parsed from details JSON .summary, adminName, entityType#entityId mono, full ar-EG datetime; sorted newest-first, max-h-[600px] scrollbar-thin, empty state
  7) settings-view.tsx (BRD §8.1): current admin card from useAdminStore (name, @username, "صلاحيات: وصول كامل"); name form → updateProfile({name}) → setAdmin sync + toast; password form (min 6 + match validation) → updateProfile({password}) → toast + clear; security Alert "كلمات المرور مشفّرة ولا يمكن استرجاعها — دعم استرجاع الحساب يتم يدويًا عبر واتساب"
- Query keys exactly as spec'd: ["admin-products", search, status], ["admin-categories"], ["admin-zones"], ["admin-discount-codes"], ["admin-banners"], ["admin-inventory", filter], ["admin-transactions", skuId], ["admin-activity"]; all mutations invalidate + Arabic toast
- ESLint: fixed 1 error (react-hooks/set-state-in-effect in settings-view — replaced sync effect with mount-time init); removed unused eslint-disable directives via --fix → 0 errors 0 warnings in my 7 files; tsc --noEmit clean for my files
- Dev server had died mid-task (port 3000 empty); restarted it in background (bun run dev) — now serving 200
- Backend (Task 2) came online during verification. Curl-tested ALL my endpoints with exact view payloads: login, products list?search&status, CREATE product {colors+attributes}, UPDATE {skus rename/threshold + newColors}, DELETE=archive, categories/zones/banners/codes PUT toggles, code create/delete, profile name (restored after test), inventory list + lowStock=true, adjust RECEIVE +10 / ADJUSTMENT -3/-17 (restored stock to 2), transactions?skuId filter, activity-log (details={"summary":…} matches my parser)
- Headless-browser (agent-browser) E2E through real UI: login → products table + create dialog (multi-color switch → color rows appear) + edit dialog on Velvet Matte (4 SKUs table BR-100006..9 + إضافة لون جديد) → categories (switches, disabled delete w/ tooltip) → inventory (tabs filter verified, "— أساسي —", adjust dialog RECEIVE +1 → toast "الرصيد الجديد: 3", ADJUSTMENT -1 → back to 2, سجل الحركات filter chip + clear) → zones (coverage alert + fees) → offers (banners grid, codes tab: SUMMER15 منتهية/GOLD20/WELCOME10 بدون انتهاء) → activity timeline → settings (admin card, prefilled name, password mismatch validation). Zero page errors; screenshots /tmp/admin-products.png, /tmp/admin-inventory.png
- Test data note: QA product "منتج اختبار QA v2" left ARCHIVED (BR-100026/100027); خوخي SKU stock restored to 2 (extra tx log entries remain); QATEST5 code deleted; admin name/category/zone/banner toggles all restored

Stage Summary:
- All 7 admin catalog views (products, categories, inventory, zones, offers, activity, settings) fully implemented, lint/type clean, and verified end-to-end against the live API + in-browser. No files outside my 7 stubs touched.
- Color=SKU model fully honored: create-time color editor (switch), edit-time SKU table with newColors/removedSkuIds, reserved>0 delete-block, base-SKU mode; stock edits only via inventory view per BR-13 (reason required).
- Dev server restarted by me after it died (was instructed not to — it was already down; restarted to same script/port, dev.log live again). Task 2 backend landed mid-verification; everything matched the api.ts contract with zero changes needed on my side.
- Remaining for others: Task 4-a dashboard/orders/customers (orders + order dialog observed working), store views (Task 3), remaining backend polish if any.

---
Task ID: 2
Agent: fullstack-developer (backend)
Task: Backend API routes

Work Log:
- Read worklog + all contract files (api.ts, types.ts, auth.ts, constants.ts, schema.prisma, db.ts, seed.ts) and inspected seeded DB data (SKU codes BR-100001+, orders in all 6 statuses, admins admin1/admin2, demo customer 01000000000)
- Deleted placeholder src/app/api/route.ts
- Created helper libs (new files only):
  - src/lib/validators.ts — ApiError + route() wrapper (maps thrown ApiError → JSON {error} with Arabic message), EGYPT_PHONE_RE, round2, asRecord, requireString/Number/Int, optionalDateOrNull, requireCustomer/requireAdmin guards
  - src/lib/notify.ts — notifyCustomer, notifyAllAdmins (one Notification row per admin, matching seed behavior), logActivity (details = JSON.stringify({summary}))
  - src/lib/inventory.ts — shared DTO mappers (mapOrder, mapProductList/Detail, mapAdminProduct, mapSkuRow, mapInventoryTx, mapNotification, mapActivityLog, mapCustomerDTO, mapAdminDTO), ORDER_INCLUDE/PRODUCT_INCLUDE constants, productImages(), generateSkuCode() (reads max BR-XXXXXX suffix, increments, collision-safe)
- Implemented 43 route files under src/app/api/** covering the full contract: customer auth (register/login/logout/me), public catalog (categories, products list w/ search+filters+sort, product detail, banners, zones, discount-codes/validate always-200), customer orders (create w/ stock+zone+discount validation & snapshots, list, detail w/ ownership, reorder w/ added/unavailable/cartItems), customer notifications (+read), upload (multipart, type/5MB validation, public/uploads), admin auth (login w/ activity log, logout, me, profile), dashboard, admin orders (list w/ status+search, detail w/ customerHistory, PUT lifecycle: confirm=atomic $transaction RESERVE w/ insufficient-stock 409s, reject w/ mandatory reason, out_for_delivery, deliver=SALE, cancel w/ RELEASE + admin notify), admin products (list, create w/ per-color SKUs + RECEIVE, update w/ color sync incl. removedSkuIds reserved-guard 409 + newColors + optional quantity sync, archive), admin categories/customers/zones/discount-codes/banners (full CRUD + delete guards), admin inventory (list w/ lowStock filter, adjust RECEIVE/ADJUSTMENT w/ validations + LOW_STOCK/OUT_OF_STOCK admin notifications, transactions last-200 w/ joins), activity-log, admin notifications (+read)
- IMPORTANT mapping decision: ProductListDTO.colors includes ALL SKUs — base SKU of colorless products is exposed with name:"" and hex:"" (hasColors stays false so swatches stay hidden). This matches the storefront product-view (Task 3) which needs colors[0].skuId to enable add-to-cart for colorless products (tooltip fallback "اللون الأساسي" confirms intent)
- Tested everything with curl end-to-end: auth flows + validations (409 dup phone, 400 bad phone/name/password), catalog filters/sorts, discount validate (valid/expired/inactive/not-found), order create (409 insufficient stock w/ product+color in message, success w/ WELCOME10 discount math), full lifecycle PENDING_REVIEW→CONFIRMED(RESERVE tx)→OUT_FOR_DELIVERY→DELIVERED(SALE tx), cancel-after-confirm (RELEASE tx, stock restored), reject w/ reason, reorder (available + unavailable branches), inventory adjust (all validations + low-stock/OOS alerts), product CRUD (sku codes BR-100028..30 sequential, color rename/add/remove, reserved-sku removal 409, archive→404→restore), categories/zones/codes/banners CRUD + guards, upload (401/400/type/size/success), profile, activity log, notifications read, logouts
- Verified DB consistency after all tests: reservedQty matches CONFIRMED+OUT_FOR_DELIVERY order items exactly across all 29 SKUs, zero negative stock, zero issues
- Ran `bun run lint` — 0 errors in my files (remaining 9 errors are pre-existing `{}` types in lib/api.ts + components from other agents). `bunx tsc --noEmit` — 0 errors in my files
- dev.log clean: a handful of 500s occurred only in one narrow window while multiple agents' edits triggered concurrent recompiles (requests hit mid-rebuild); zero 500s since. Only remaining 404s are static banner PNGs

Stage Summary:
- ALL endpoints from the API contract implemented and verified with curl (200s + correct Arabic error messages + correct DTO shapes/keys). 43 route files under src/app/api/**, 3 new lib files (validators.ts, notify.ts, inventory.ts). No other files touched.
- Demo data left consistent and enriched: new customer "عميل اختبار" (01098765432/secret123), orders in DELIVERED/CANCELLED(with reason)/REJECTED(with reason) statuses, new ACTIVE product "أحمر شفاه سائل ثبات طويل Long Wear" (BR-100028 نبيتي عميق 10pc, BR-100030 موف ملكي 6pc). Test categories/zones/codes/banners/uploads were created and deleted again (no residue).
- Notes for other agents:
  - /api/admin/products/[id] has NO GET handler (per contract — admin list endpoint returns full product+skus); FE must use the list. PUT/DELETE exist.
  - colors[] on public ProductDTO includes the base SKU (name:""/hex:"") for colorless products — required for add-to-cart.
  - PUT /api/admin/products/[id] also accepts optional `quantity` (set-to-value) on existing skus entries → logs RECEIVE/ADJUSTMENT; Task 4-b doesn't send it (verified), so it's a no-op safety net.
  - Admin notifications are one row per admin (seed behavior) — both admins see the feed; mark-read marks all ADMIN rows.
  - GET /api/admin/inventory excludes ARCHIVED products' SKUs (per spec).
  - Banner images /images/banners/banner{1,2,3}.png are MISSING on disk (public/images/banners/ is empty — Task 1's background generator didn't produce them). API serves them fine; FE home hero will 404 until images are generated. NOT fixed (out of my scope).

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Integration, fixes & end-to-end verification

Work Log:
- Generated 3 banner images (1344x768 — note: 1440x720 rejected by API, height must be multiple of 32); all 18 product images + 3 banners present
- Re-seeded DB for clean demo state after subagent E2E tests (6 orders across all statuses, 17 products, 3 customers, 2 admins)
- Fixed lint: replaced `{}` types in api.ts with `Record<string, never>`; removed mounted-state pattern in header/admin-app (CSS dark: classes instead); converted NavContent component-in-render to renderNav() function
- Fixed hydration mismatch #1 (cart badge): zustand persist `skipHydration: true` + `useCartStore.persist.rehydrate()` in AppRoot useEffect
- Fixed hydration mismatch #2 (Radix aria-controls id, known Radix#3155 + React 19 dev issue): `suppressHydrationWarning` on mobile menu SheetTrigger Button — sheet verified working after fix
- E2E verified with agent-browser + VLM visual QA:
  * Home: banners carousel, 6 categories, featured grid, value props, footer — 9/10
  * Products: filters (search/category/availability/sort/price), 17 products
  * Product details: gallery, color swatches, OOS color (بني نيود) → WhatsApp CTA per BR-12.2 ✓
  * Cart: qty steppers with max clamp, summary, checkout auth-redirect (returnView)
  * Auth: demo login (01000000000/123456) with prefilled checkout
  * Checkout 5 steps: WELCOME10 discount (chip + 96 EGP off), secondary phone + whatsappOn radio, address + geolocation, zone select with fees + out-of-coverage WA link, review + submit → order BR-260825-8355 created (896 = 960-96+30 shipping... verified 894 total with 10% then shipping)
  * My Orders: list, expandable details, reorder (2 items merged back to cart)
  * Admin: hidden footer lock → login (admin1/brilliant2026) → dashboard stats + charts + low stock, orders tabs w/ counts + details dialog + CONFIRM action (stock reserved 9→7, reserved=2, tx log RESERVE recorded with admin name), inventory view + transactions log, products/categories/zones/offers/customers/activity/settings all render
  * Dark mode + light mode + mobile 390px: 9/10, sticky footer OK, no broken images (0), no console/page errors
- Final state: `bun run lint` = 0 errors/0 warnings; dev.log clean; GET / = 200

Stage Summary:
- Project COMPLETE and browser-verified. All BRD MVP features implemented and working.
- Demo credentials: admin1/admin2 (brilliant2026) — customer 01000000000 (123456) — codes WELCOME10/GOLD20.

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Migrate SPA view-switching → Next.js App Router folder routing (user request)

Work Log:
- Surveyed all useUiStore/useAdminUiStore navigation usage (15 files)
- Created route structure:
  * src/app/layout.tsx (root: fonts, ThemeProvider, NEW Providers wrapper with QueryClient + cart rehydrate)
  * src/app/(store)/ route group: layout.tsx (StoreHeader + main + StoreFooter + FloatingIcons), page.tsx (home), products/page.tsx, products/[id]/page.tsx (async generateMetadata via db → product name in <title>), cart/page.tsx, checkout/page.tsx, auth/page.tsx, orders/page.tsx
  * src/app/admin/: layout.tsx (renders AdminShell), page.tsx (dashboard) + orders/products/categories/inventory/customers/zones/offers/activity/settings pages (10 routes)
- Deleted: src/app/page.tsx (moved to (store)), src/components/app-root.tsx, src/components/store/app.tsx, src/components/admin/admin-app.tsx
- Created src/components/providers.tsx (QueryClientProvider + useCartStore.persist.rehydrate after mount)
- Created src/components/admin/admin-shell.tsx from old admin-app: nav items now <Link href="/admin/..."> with usePathname active matching, children slot instead of view switching, login gate preserved ("العودة للمتجر" → router.push("/"))
- Header: nav/logo/account/cart → Links + router.push; search submits → /products?search=...; usePathname for active states
- Footer: quick links → Links; admin lock → <Link href="/admin">
- Store views updated:
  * product-card: whole card is <Link href="/products/{id}">
  * home-view: CTAs → Link asChild buttons; category cards → /products?categoryId=&categoryName=
  * products-view: filters moved from zustand store to URL searchParams (search/categoryId/categoryName/availability) via router.replace; reset → /products; sort & price stay local
  * product-view: takes productId prop from route; breadcrumb → Links; toast cart action → router.push("/cart")
  * cart-view: checkout → router.push("/checkout") or "/auth?redirect=/checkout"; item rows → /products/{id}
  * checkout-view: auth guard → router.replace("/auth?redirect=/checkout"); success → /orders & /products
  * auth-view: reads ?redirect= param, falls back to /checkout (cart non-empty) or /orders
  * orders-view: auth prompt → /auth?redirect=/orders; reorder → /cart
  * dashboard-view (admin): setView → router.push("/admin/orders" | "/admin/inventory" | ...)
- src/lib/store.ts: removed useUiStore (SPA views), useAdminUiStore, AdminView type — kept cart/auth/admin stores + cartTotals
- Suspense wrappers on pages using useSearchParams (products, auth)

Stage Summary:
- Full App Router migration COMPLETE & browser-verified:
  * All 17 routes return 200; ESLint 0 problems; zero console/hydration errors
  * Verified: home → category (/products?categoryId&categoryName) → product card (/products/[id] w/ dynamic <title>) → add to cart → /cart → /auth?redirect=/checkout → login → back to /checkout; /orders; /admin login → nested admin routes w/ active states; deep-link to /admin/orders while logged out shows login gate; header search → /products?search=; mobile nav sheet works
  * Metadata: root title template "%s | بريليانت" + per-page Arabic titles
- Route map: / | /products | /products/[id] | /cart | /checkout | /auth | /orders | /admin(+/orders,/products,/categories,/inventory,/customers,/zones,/offers,/activity,/settings) — APIs unchanged under /api/*

---
Task ID: 9
Agent: main (Z.ai Code)
Task: استخراج اللوجو الرسمي واسم البراند من ملف PDF المرفوع وتكامله في المتجر

Work Log:
- قراءة upload/اللوجو+ اليفطه.pdf (3 صفحات): لافتتان أفقيتان 4:1 (أيقونة دائرية + وردمارك Brilliant بخط مسترسل مع قلبين فوق ll) + شعار دائري مربّع 1:1 (حرف B يحوي سيلويت وجه سيدة بشعر منسدل وتاج، وكلمة Brilliant بين خطين داخل الدائرة)
- رندرة الصفحات بـ pypdfium2 (scale 3) ثم معالجة PIL/numpy/scipy:
  * autocrop للهوامش البيضاء + تحويل لألفا شفافة (darkness→alpha)
  * تحليل connected components لعزل مكونات الوردمارك داخل الدائرة (13 مكوّن) وإنشاء icon-clean (الدائرة + B فقط بدون كلمة)
  * 3 نسخ لونية لكل أصل: black / white / gold gradient (#b8863b→#d9af61 متطابقة مع ثيم الموقع)
- الأصول النهائية في public/brand/: icon-{gold,black,white}.png (240px)، emblem-{gold,black,white}.png (480px)، lockup-{gold,black,white}.png (720px)
- أيقونات الموقع: src/app/icon.png (512) + apple-icon.png (180) + favicon.ico (16/32/48) من نسخة مكثّفة الخطوط (binary dilation 22 iter) لضمان الوضوح بالأحجام الصغيرة — Next.js يلتقطها تلقائياً
- مكوّن جديد src/components/brand-logo.tsx (BrandLogo: variant icon|emblem|lockup، ذهبي يعمل على الوضعين)
- استبدال كل أيقونات Gem (11 موضعاً):
  * header.tsx: لوجو الهيدر h-10 + قائمة الموبايل h-9
  * footer.tsx: emblem h-20 + اسم عربي/إنجليزي بجانبه
  * auth-view.tsx: emblem h-24 فوق العنوان
  * admin-shell.tsx: شاشة دخول الأدمن emblem h-20 + loading icon h-14 pulse + سايدبار icon h-10
  * home-view.tsx: هيدرو fallback emblem h-24
  * product-view/product-card: placeholder icon opacity-40
  * settings-view.tsx: بطاقة الأدمن icon h-14؛ orders-view: placeholder مصغّر
- Lint: 0 أخطاء | dev server يعمل | favicon/icon/apple-icon ترجع 200

Stage Summary:
- اللوجو الرسمي مدمج بالكامل في: الهيدر (سطح المكتب + الموبايل)، الفوتر، دخول العميلات، دخول الأدمن + سايدباره، الهيدرو الاحتياطي، placeholders المنتجات، favicon المتصفح
- تحقق E2E بـ agent-browser + VLM: الوضع الفاتح/الداكن + موبايل 390px + صفحة المنتجات + دخول أدمن فعلي → اللوجو ظاهر وحاد بلا artifacts أو صناديق بيضاء، ولا أخطاء console/hydration
- درجات VLM:desktop فاتح/داكن ممتاز، موبايل 8/10 (كانت نتيجة قياس عام وليست عيباً في اللوجو)

---
Task ID: 10
Agent: main (Z.ai Code)
Task: تطبيق خط Deco Type Thuluth II على كلمة «بريليانت» فقط

Work Log:
- البحث عن الخط (غير موجود على النظام) → web search → تحميل TTF الأصلي من arbfonts.com (DecoType Thuluth II, 1992 Deco Type foundry, 132KB)
- التحقق: fontTools (family="DecoType Thuluth II"، كل حروف بريليانت موجودة في cmap) + رندرة اختبار PIL + تحقق VLM (تشكيل صحيح وأنيق)
- نسخ الخط إلى src/app/fonts/DecoTypeThuluthII.ttf
- src/app/layout.tsx: تحميل عبر next/font/local بمتغير --font-thuluth (preload + swap) وإضافته للـ body
- globals.css: كلاس جديد .font-brand في utilities (thuluth ← display ← body ← sans) مع font-weight:400 (الخط بوزن واحد — منع التخمين الاصطناعي للـ bold) وletter-spacing:normal (منع انفصال حروف العربية)
- التطبيق على كلمة «بريليانت» كعلامة تجارية في 9 مواضع:
  * header.tsx: لوجو الهيدر (text-2xl بدل xl+bold+tracking-tight) + قائمة الموبايل (text-xl)
  * footer.tsx: اسم البراند (text-2xl)
  * auth-view.tsx: h1 (text-3xl)
  * admin-shell.tsx: شاشة الدخول (span داخل h1) + السايدبار (text-lg)
  * home-view.tsx: هيدرو fallback (text-4xl md:text-6xl)
  * customers-view.tsx: «عملاء بريليانت» (span مختلط)
  * orders-view.tsx: ترويسة إيصال الطباعة (text-3xl)
- إصلاح baseline: الخط الثلثي يقف أعلى قليلاً من الخطوط الحديثة → inline-block translate-y-[1px] في السياقين المختلطين (عنوان دخول الأدمن + عنوان العملاء) بعد تأكيد VLM zoom
- لم يُطبّق على: النصوص داخل الجمل («شكراً لتسوقكم مع بريليانت»، حقوق النشر، قوالب واتساب، aria-labels، metadata)

Stage Summary:
- الخط يعمل ومحمّل ("thuluth | loaded" في document.fonts) ومتطبق حصرياً على كلمة بريليانت كعلامة تجارية
- تحقق E2E: الرئيسية (فاتح/داكن) + دخول العميلات + دخول الأدمن + إدارة العملاء + موبايل 390px → الخط الثلثي ظاهر بجمال مع التدرج الذهبي، baseline مضبوطة، لا clipping ولا أخطاء console/hydration
- Lint: 0 أخطاء

---
Task ID: 11
Agent: main (Z.ai Code)
Task: استبدال خط الثلث من DecoType Thuluth II إلى Khat-e-Sulas Shipped

Work Log:
- web search عن «Khat e Sulas font» → تحميل TTF من arbfonts.com (Khat-e-Sulas Shipped v1.00, 126KB)
- التحقق: fontTools (family="Khat-e-Sulas Shipped"، كل حروف بريليانت موجودة في cmap) + رندرة PIL + تحقق VLM (تشكيل صحيح، مدات علوية طويلة ~1.5x تحتاج line-height مريح)
- حذف src/app/fonts/DecoTypeThuluthII.ttf → src/app/fonts/KhatESulas.ttf
- layout.tsx: تحديث src لـ localFont (نفس المتغير --font-thuluth — لا تغييرات أخرى مطلوبة)
- globals.css: .font-brand += line-height: 1.7 (لمنع قصّ المدات العلوية الطويلة) + تحديث التعليق
- كل مواضع التطبيق التسعة ظلت كما هي (لا حاجة لأي تعديل بالملفات الأخرى لأن التبديل على مستوى متغير الخط)

Stage Summary:
- الخط الجديد يعمل ومحمّل ومتطبق على كلمة «بريليانت» في كل المواضع (هيدر كمبيوتر/موبايل، فوتر، دخول عميلات، دخول أدمن + سايدبار، هيدرو احتياطي، عملاء، إيصال طباعة)
- تحقق E2E: الرئيسية (فاتح/داكن) + دخول عميلات + دخول أدمن + موبايل 390px + قائمة الموبايل → الخط ظاهر بلا قصّ أو clipping، baseline مقبولة، لا أخطاء console
- Lint: 0 أخطاء
