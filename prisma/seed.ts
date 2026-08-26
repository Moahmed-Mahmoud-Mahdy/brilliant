/**
 * BRILLIANT — Database seed
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

// ─── Same hashing as src/lib/auth.ts ───
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// ─── Inventory helpers mirroring business rules ───
async function receiveStock(skuId: string, qty: number, reason: string) {
  const sku = await db.sku.findUniqueOrThrow({ where: { id: skuId } });
  const before = sku.availableQty;
  await db.sku.update({
    where: { id: skuId },
    data: { availableQty: before + qty },
  });
  await db.inventoryTransaction.create({
    data: {
      skuId,
      type: "RECEIVE",
      quantity: qty,
      balanceBefore: before,
      balanceAfter: before + qty,
      reason,
    },
  });
}

async function reserveStock(skuId: string, qty: number, orderNumber: string, adminName: string) {
  const sku = await db.sku.findUniqueOrThrow({ where: { id: skuId } });
  const before = sku.availableQty;
  await db.sku.update({
    where: { id: skuId },
    data: { availableQty: before - qty, reservedQty: sku.reservedQty + qty },
  });
  await db.inventoryTransaction.create({
    data: {
      skuId,
      type: "RESERVE",
      quantity: -qty,
      balanceBefore: before,
      balanceAfter: before - qty,
      reason: `حجز كمية للطلب ${orderNumber}`,
      orderId: orderNumber,
      adminName,
    },
  });
}

async function releaseStock(skuId: string, qty: number, orderNumber: string, adminName: string) {
  const sku = await db.sku.findUniqueOrThrow({ where: { id: skuId } });
  const before = sku.availableQty;
  await db.sku.update({
    where: { id: skuId },
    data: { availableQty: before + qty, reservedQty: Math.max(0, sku.reservedQty - qty) },
  });
  await db.inventoryTransaction.create({
    data: {
      skuId,
      type: "RELEASE",
      quantity: qty,
      balanceBefore: before,
      balanceAfter: before + qty,
      reason: `تحرير حجز عند إلغاء الطلب ${orderNumber}`,
      orderId: orderNumber,
      adminName,
    },
  });
}

async function saleStock(skuId: string, qty: number, orderNumber: string, adminName: string) {
  const sku = await db.sku.findUniqueOrThrow({ where: { id: skuId } });
  await db.sku.update({
    where: { id: skuId },
    data: { reservedQty: Math.max(0, sku.reservedQty - qty), soldQty: sku.soldQty + qty },
  });
  await db.inventoryTransaction.create({
    data: {
      skuId,
      type: "SALE",
      quantity: -qty,
      balanceBefore: sku.availableQty,
      balanceAfter: sku.availableQty,
      reason: `تثبيت بيع الطلب ${orderNumber} عند التسليم`,
      orderId: orderNumber,
      adminName,
    },
  });
}

function daysAgo(n: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - hours);
  return d;
}

async function main() {
  console.log("🌱 Seeding BRILLIANT database...");

  // Clean slate
  await db.notification.deleteMany();
  await db.activityLog.deleteMany();
  await db.inventoryTransaction.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.sku.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.deliveryZone.deleteMany();
  await db.discountCode.deleteMany();
  await db.banner.deleteMany();
  await db.customer.deleteMany();
  await db.admin.deleteMany();

  // ─── Admins ───
  const admin1 = await db.admin.create({
    data: { username: "admin1", name: "أحمد — مدير المتجر", passwordHash: hashPassword("brilliant2026") },
  });
  const admin2 = await db.admin.create({
    data: { username: "admin2", name: "منى — مديرة العمليات", passwordHash: hashPassword("brilliant2026") },
  });
  console.log("✓ Admins");

  // ─── Categories ───
  const skincare = await db.category.create({
    data: { name: "العناية بالبشرة", description: "سيرومات وكريمات وروتين كامل لبشرة صحية ومشرقة", sortOrder: 1 },
  });
  const makeup = await db.category.create({
    data: { name: "المكياج", description: "أحمر شفاه، كريم أساس، ظلال والمزيد بألوان موسمية", sortOrder: 2 },
  });
  const haircare = await db.category.create({
    data: { name: "العناية بالشعر", description: "زيوت وشامبو لشعر قوي ولامع", sortOrder: 3 },
  });
  const fragrance = await db.category.create({
    data: { name: "العطور", description: "عطور فاخرة ومعطرات جسم بروائح تدوم", sortOrder: 4 },
  });
  const bodycare = await db.category.create({
    data: { name: "العناية بالجسم", description: "مقشرات ولوشن لنعومة تدوم طول اليوم", sortOrder: 5 },
  });
  const gifts = await db.category.create({
    data: { name: "مجموعات الهدايا", description: "صناديق هدايا فاخرة من بريليانت لكل المناسبات", sortOrder: 6 },
  });
  console.log("✓ Categories");

  // ─── SKU code generator ───
  let skuCounter = 100000;
  const nextSkuCode = () => `BR-${++skuCounter}`;

  interface ColorSpec {
    name: string;
    hex: string;
    qty: number;
    threshold?: number;
  }

  async function createProduct(opts: {
    name: string;
    description: string;
    price: number;
    salePrice?: number;
    images: string[];
    categoryId: string;
    attrs?: [string, string][];
    colors?: ColorSpec[];
    baseQty?: number;
    baseThreshold?: number;
  }) {
    const product = await db.product.create({
      data: {
        name: opts.name,
        description: opts.description,
        price: opts.price,
        salePrice: opts.salePrice ?? null,
        images: JSON.stringify(opts.images),
        attributes: JSON.stringify(
          (opts.attrs || []).map(([key, value]) => ({ key, value }))
        ),
        categoryId: opts.categoryId,
        status: "ACTIVE",
      },
    });
    if (opts.colors && opts.colors.length > 0) {
      for (const c of opts.colors) {
        const sku = await db.sku.create({
          data: {
            skuCode: nextSkuCode(),
            productId: product.id,
            colorName: c.name,
            colorHex: c.hex,
            isBase: false,
            availableQty: 0,
            lowStockThreshold: c.threshold ?? 3,
          },
        });
        if (c.qty > 0) await receiveStock(sku.id, c.qty, `مخزون افتتاحي — ${opts.name} (${c.name})`);
      }
    } else {
      const sku = await db.sku.create({
        data: {
          skuCode: nextSkuCode(),
          productId: product.id,
          isBase: true,
          availableQty: 0,
          lowStockThreshold: opts.baseThreshold ?? 3,
        },
      });
      if ((opts.baseQty ?? 0) > 0)
        await receiveStock(sku.id, opts.baseQty!, `مخزون افتتاحي — ${opts.name}`);
    }
    return product;
  }

  const IMG = (name: string) => `/images/products/${name}`;

  // ─── Products ───
  const serum = await createProduct({
    name: "سيروم فيتامين سي المركّز 15%",
    description:
      "سيروم مركّز بفيتامين سي النقي بتركيز 15% لتفتيح البشرة وتوحيد لونها وتحفيز إنتاج الكولاجين. تركيبة خفيفة سريعة الامتصاص مع فيتامين E وحمض الهيالورونيك لترطيب عميق. استخدميه صباحًا قبل واقي الشفة للحصول على أفضل النتائج.",
    price: 850,
    salePrice: 720,
    images: [IMG("serum.png")],
    categoryId: skincare.id,
    attrs: [
      ["الحجم", "30 مل"],
      ["نوع البشرة", "جميع أنواع البشرة"],
      ["المكونات الرئيسية", "فيتامين سي، فيتامين E، حمض الهيالورونيك"],
      ["بلد المنشأ", "فرنسا"],
    ],
    baseQty: 25,
    baseThreshold: 5,
  });

  const cream = await createProduct({
    name: "كريم مرطب بزبدة الشيا",
    description:
      "كريم مرطب غني بزبدة الشيا الخام وزيت الجوجوبا لترطيب عميق يدوم 24 ساعة. يغذي البشرة الجافة ويعيد لها نعومتها ومرونتها دون ملمس دهني. مثالي للاستخدام الليلي أو كأساس لروتين النهار في الأجواء الباردة.",
    price: 620,
    images: [IMG("cream.png")],
    categoryId: skincare.id,
    attrs: [
      ["الحجم", "50 مل"],
      ["نوع البشرة", "البشرة الجافة والعادية"],
      ["بلد المنشأ", "كوريا الجنوبية"],
    ],
    baseQty: 20,
    baseThreshold: 4,
  });

  const cleanser = await createProduct({
    name: "غسول الوجه اللطيف بزيت الجوجوبا",
    description:
      "غسول رغوي لطيف ينظف البشرة بعمق دون أن يجففها. يحتوي على زيت الجوجوبا وخلاصة البابونج لتهدئة البشرة الحساسة وإزالة المكياج والشوائب بلطف. مناسب للاستخدام اليومي صباحًا ومساءً.",
    price: 380,
    images: [IMG("cleanser.png")],
    categoryId: skincare.id,
    attrs: [
      ["الحجم", "200 مل"],
      ["نوع البشرة", "جميع أنواع البشرة بما فيها الحساسة"],
      ["بلد المنشأ", "ألمانيا"],
    ],
    baseQty: 18,
    baseThreshold: 4,
  });

  const clayMask = await createProduct({
    name: "ماسك الطين المغربي المنقي",
    description:
      "ماسك طيني منقي من الطين المغربي البركاني يمتص الزيوت الزائدة وينقي المسام بعمق. غني بالمعادن الطبيعية التي تترك البشرة نظيفة ومنتعشة. استخدميه مرة أو مرتين أسبوعيًا لمدة 10-15 دقيقة.",
    price: 450,
    images: [IMG("claymask.png")],
    categoryId: skincare.id,
    attrs: [
      ["الحجم", "150 جرام"],
      ["نوع البشرة", "البشرة الدهنية والمختلطة"],
      ["بلد المنشأ", "المغرب"],
    ],
    baseQty: 12,
    baseThreshold: 3,
  });

  const toner = await createProduct({
    name: "تونر ماء الورد الطائفي",
    description:
      "تونر منعش بماء الورد الطائفي النقي يوازن حموضة البشرة ويضيّق المسام ويمنحها انتعاشًا فوريًا. خالٍ من الكحول والعطور الصناعية. رشّيه على البشرة بعد الغسول أو استخدميه كقاعدة للترطيب.",
    price: 320,
    images: [IMG("toner.png")],
    categoryId: skincare.id,
    attrs: [
      ["الحجم", "250 مل"],
      ["نوع البشرة", "جميع أنواع البشرة"],
      ["بلد المنشأ", "السعودية"],
    ],
    baseQty: 4,
    baseThreshold: 5,
  });

  const lipstick = await createProduct({
    name: "أحمر شفاه مخملي Velvet Matte",
    description:
      "أحمر شفاه بتركيبة مخملية مطفية تدوم حتى 8 ساعات دون جفاف أو ثقل على الشفاه. غني بزبدة الشيا وفيتامين E لعناية مريحة أثناء ارتدائه. متوفر بألوان موسمية تناسب كل درجات البشرة.",
    price: 480,
    images: [IMG("lipstick.png"), IMG("lipstick2.png")],
    categoryId: makeup.id,
    attrs: [
      ["التغطية", "عالية"],
      ["اللمسة النهائية", "مطفي مخملي"],
      ["الثبات", "حتى 8 ساعات"],
    ],
    colors: [
      { name: "أحمر كلاسيك", hex: "#B0222B", qty: 10 },
      { name: "وردي ناعم", hex: "#E8A0B0", qty: 5 },
      { name: "بني نيود", hex: "#8B5A42", qty: 0 },
      { name: "مرجاني دافئ", hex: "#E06A50", qty: 7 },
    ],
  });

  const foundation = await createProduct({
    name: "كريم أساس عالي التغطية Flawless",
    description:
      "كريم أساس بتغطية عالية قابلة للبناء ولمسة نهائية طبيعية تدوم 16 ساعة. تركيبة مقاومة للعرق والحرارة مناسبة لأجواء مصر. بدرجات دافئة تناسب البشرة المصرية، ومعامل حماية SPF20.",
    price: 750,
    salePrice: 640,
    images: [IMG("foundation.png")],
    categoryId: makeup.id,
    attrs: [
      ["الحجم", "30 مل"],
      ["التغطية", "عالية قابلة للبناء"],
      ["الحماية", "SPF 20"],
      ["الثبات", "حتى 16 ساعة"],
    ],
    colors: [
      { name: "عاجي", hex: "#F5DCC0", qty: 8 },
      { name: "بيج طبيعي", hex: "#E8C39E", qty: 12 },
      { name: "عسلي", hex: "#D9A87A", qty: 6 },
      { name: "كراميل", hex: "#B97F56", qty: 3 },
    ],
  });

  const palette = await createProduct({
    name: "باليت الظلال الذهبية Golden Hour",
    description:
      "باليت 12 ظل بألوان ذهبية وترابية دافئة بين المطفي واللامع. بودرة ناعمة عالية التصبغ قابلة للدمج بسهولة وتدوم طوال اليوم. مثالي لإطلالات النهار والسهرات.",
    price: 990,
    salePrice: 840,
    images: [IMG("palette.png")],
    categoryId: makeup.id,
    attrs: [
      ["عدد الألوان", "12 لون"],
      ["اللمسة النهائية", "مطفي ولامع"],
    ],
    baseQty: 15,
    baseThreshold: 4,
  });

  const mascara = await createProduct({
    name: "ماسكارا تكثيف الرموش Volume",
    description:
      "ماسكارا تكثيف وتطويل بفرشاة مخروطية تصل لأصغر رموش. تركيبة مقاومة للتلطخ والرطوبة تمنح رموشك حجمًا مضاعفًا من أول طبقة. سهلة الإزالة بالماء الفاتر.",
    price: 420,
    images: [IMG("mascara.png")],
    categoryId: makeup.id,
    attrs: [
      ["الفائدة", "تكثيف وتطويل"],
      ["مقاومة", "للرطوبة والتلطخ"],
    ],
    colors: [
      { name: "أسود", hex: "#1A1A1A", qty: 20 },
      { name: "بني داكن", hex: "#4A3226", qty: 8 },
    ],
  });

  const blush = await createProduct({
    name: "أحمر خدود وردي Rosy Glow",
    description:
      "أحمر خدود ببودرة حريرية تمنح وجنتيك لونًا ورديًا طبيعيًا كأنه من داخل البشرة. تركيبة خفيفة قابلة للبناء تدوم طويلًا وتناسب كل درجات البشرة.",
    price: 390,
    images: [IMG("blush.png")],
    categoryId: makeup.id,
    colors: [
      { name: "وردي فاتح", hex: "#F2B8C6", qty: 9 },
      { name: "خوخي", hex: "#E89B7D", qty: 2 },
    ],
  });

  const arganOil = await createProduct({
    name: "زيت الأرجان المغربي النقي 100%",
    description:
      "زيت أرجان مغربي نقي معصور على البارد للشعر والبشرة والأظافر. غني بفيتامين E والأحماض الدهنية التي تغذي بعمق وتعيد اللمعان الطبيعي للشعر التالف. قطرات قليلة تكفي.",
    price: 550,
    images: [IMG("arganoil.png")],
    categoryId: haircare.id,
    attrs: [
      ["الحجم", "100 مل"],
      ["النقاء", "100% زيت أرجان معصور على البارد"],
      ["بلد المنشأ", "المغرب"],
    ],
    baseQty: 30,
    baseThreshold: 6,
  });

  const shampoo = await createProduct({
    name: "شامبو خالٍ من السلفات بزيت الأرجان",
    description:
      "شامبو لطيف خالٍ من السلفات والبارابين ينظف فروة الرأس بعمق دون تجريدها من زيوتها الطبيعية. غني بزيت الأرجان والكيراتين لعلاج التقصف والهيشان. آمن للشعر المصبوغ.",
    price: 480,
    images: [IMG("shampoo.png")],
    categoryId: haircare.id,
    attrs: [
      ["الحجم", "400 مل"],
      ["خالٍ من", "السلفات والبارابين"],
    ],
    baseQty: 16,
    baseThreshold: 4,
  });

  const perfume = await createProduct({
    name: "عطر غولدن أوا Golden Aura EDP",
    description:
      "عطر نسائي فاخر بمقدمة من البرغموت والكشمش، وقلب من الياسمين وزهرة البرتقال، وقاعدة دافئة من الفانيليا والعنبر وخشب الصندل. ثبات يدوم أكثر من 10 ساعات وفوحان أنيق يلفت الأنظار.",
    price: 1450,
    salePrice: 1190,
    images: [IMG("perfume.png")],
    categoryId: fragrance.id,
    attrs: [
      ["الحجم", "100 مل"],
      ["التركيز", "Eau de Parfum"],
      ["المقدمة", "برغموت، كشمش"],
      ["القلب", "ياسمين، زهرة البرتقال"],
      ["القاعدة", "فانيليا، عنبر، خشب الصندل"],
    ],
    baseQty: 7,
    baseThreshold: 3,
  });

  const bodyMist = await createProduct({
    name: "معطر الجسم بالفانيلا والكاكاو",
    description:
      "معطر جسم منعش برائحة الفانيلا الدافئة والكاكاو الغني. رذاذ خفيف يمنح بشرتك عطرًا هادئًا يدوم لساعات مع لمسة ترطيب. مثالي للاستخدام اليومي.",
    price: 390,
    images: [IMG("bodymist.png")],
    categoryId: fragrance.id,
    attrs: [
      ["الحجم", "200 مل"],
      ["العائلة العطرية", "خشبية حلوة"],
    ],
    baseQty: 0,
    baseThreshold: 3,
  });

  const scrub = await createProduct({
    name: "مقشر الجسم بالقهوة العربية",
    description:
      "مقشر جسم طبيعي بحبيبات القهوة العربية العربية وزيت جوز الهند يزيل الجلد الميت ويحفز الدورة الدموية لبشرة أنعم وأكثر إشراقًا. مع كريم مرطب خفيف يترك بشرتك ناعمة فورًا بعد الاستحمام.",
    price: 350,
    images: [IMG("scrub.png")],
    categoryId: bodycare.id,
    attrs: [
      ["الحجم", "250 جرام"],
      ["الاستخدام", "مرتين أسبوعيًا"],
    ],
    baseQty: 22,
    baseThreshold: 5,
  });

  const lotion = await createProduct({
    name: "لوشن الجسم بالكاكاو باتر",
    description:
      "لوشن جسم غني بالكاكاو باتر وزبدة الشيا لترطيب مكثف يدوم 48 ساعة. سريع الامتصاص وغير دهني، يترك بشرتك ناعمة برائحة كاكاو دافئة تدوم طويلًا.",
    price: 420,
    images: [IMG("lotion.png")],
    categoryId: bodycare.id,
    attrs: [
      ["الحجم", "400 مل"],
      ["الترطيب", "يدوم 48 ساعة"],
    ],
    baseQty: 14,
    baseThreshold: 4,
  });

  const giftBox = await createProduct({
    name: "صندوق هدية بريليانت جولد",
    description:
      "صندوق هدية فاخر بتنسيق ذهبي أنيق يضم مختارات بريليانت الأكثر مبيعًا: سيروم فيتامين سي، أحمر شفاه Velvet Matte، وزيت أرجان نقي. يأتي بتغليف هدايا مع بطاقة إهداء مخصصة — الهدية المثالية لكل من تحبين.",
    price: 1800,
    salePrice: 1590,
    images: [IMG("giftbox.png")],
    categoryId: gifts.id,
    attrs: [
      ["محتويات الصندوق", "سيروم + أحمر شفاه + زيت أرجان"],
      ["التغليف", "صندوق ذهبي مع بطاقة إهداء"],
    ],
    baseQty: 5,
    baseThreshold: 2,
  });
  console.log("✓ Products + SKUs");

  // ─── Delivery zones (Cairo & Giza) ───
  const zoneNasr = await db.deliveryZone.create({ data: { name: "مدينة نصر — القاهرة", shippingFee: 35, sortOrder: 1 } });
  const zoneHeliopolis = await db.deliveryZone.create({ data: { name: "مصر الجديدة — القاهرة", shippingFee: 35, sortOrder: 2 } });
  await db.deliveryZone.create({ data: { name: "المعادي — القاهرة", shippingFee: 40, sortOrder: 3 } });
  await db.deliveryZone.create({ data: { name: "وسط البلد — القاهرة", shippingFee: 30, sortOrder: 4 } });
  await db.deliveryZone.create({ data: { name: "التجمع الخامس — القاهرة", shippingFee: 45, sortOrder: 5 } });
  await db.deliveryZone.create({ data: { name: "الدقي — القاهرة", shippingFee: 35, sortOrder: 6 } });
  await db.deliveryZone.create({ data: { name: "المهندسين — الجيزة", shippingFee: 40, sortOrder: 7 } });
  await db.deliveryZone.create({ data: { name: "الهرم — الجيزة", shippingFee: 45, sortOrder: 8 } });
  await db.deliveryZone.create({ data: { name: "6 أكتوبر — الجيزة", shippingFee: 50, sortOrder: 9 } });
  await db.deliveryZone.create({ data: { name: "شبرا — القاهرة", shippingFee: 30, sortOrder: 10 } });
  console.log("✓ Delivery zones");

  // ─── Discount codes ───
  await db.discountCode.create({
    data: { code: "WELCOME10", percentage: 10, isActive: true },
  });
  await db.discountCode.create({
    data: { code: "GOLD20", percentage: 20, expiresAt: new Date("2027-12-31"), isActive: true },
  });
  await db.discountCode.create({
    data: { code: "SUMMER15", percentage: 15, expiresAt: new Date("2025-01-01"), isActive: true },
  });
  console.log("✓ Discount codes");

  // ─── Banners ───
  await db.banner.create({
    data: {
      title: "بريليانت — فخامة تليق بكِ",
      subtitle: "اكتشفي مجموعتنا المختارة من مستحضرات العناية والتجميل الأصلية",
      image: "/images/banners/banner1.png",
      sortOrder: 1,
    },
  });
  await db.banner.create({
    data: {
      title: "مجموعة المكياج الذهبية",
      subtitle: "ألوان موسمية جديدة بخصومات مباشرة تصل إلى 20%",
      image: "/images/banners/banner2.png",
      sortOrder: 2,
    },
  });
  await db.banner.create({
    data: {
      title: "روتين العناية بالبشرة",
      subtitle: "كل ما تحتاجينه لبشرة مشرقة وصحية — من الغسول إلى السيروم",
      image: "/images/banners/banner3.png",
      sortOrder: 3,
    },
  });
  console.log("✓ Banners");

  // ─── Customers ───
  const sara = await db.customer.create({
    data: { name: "سارة محمد", phone: "01000000000", passwordHash: hashPassword("123456") },
  });
  const nour = await db.customer.create({
    data: { name: "نور علي", phone: "01111111111", passwordHash: hashPassword("123456") },
  });
  const mariam = await db.customer.create({
    data: { name: "مريم حسن", phone: "01222222222", passwordHash: hashPassword("123456") },
  });
  console.log("✓ Customers");

  // ─── SKU lookup helpers ───
  async function baseSku(productId: string) {
    return db.sku.findFirstOrThrow({ where: { productId, isBase: true } });
  }
  async function colorSku(productId: string, colorName: string) {
    return db.sku.findFirstOrThrow({ where: { productId, colorName } });
  }

  async function logAction(
    admin: { id: string; name: string },
    action: string,
    entityType: string,
    entityId: string,
    details: string
  ) {
    await db.activityLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.name,
        action,
        entityType,
        entityId,
        details: JSON.stringify({ summary: details }),
      },
    });
  }

  async function notifyCustomer(customerId: string, type: string, title: string, message: string, orderId?: string) {
    await db.notification.create({
      data: { role: "CUSTOMER", customerId, type, title, message, orderId },
    });
  }
  async function notifyAdmins(type: string, title: string, message: string, orderId?: string) {
    for (const admin of [admin1, admin2]) {
      await db.notification.create({
        data: { role: "ADMIN", type, title, message, orderId },
      });
    }
  }

  let orderSeq = 0;
  function orderNumber(daysBack: number): string {
    const d = daysAgo(daysBack);
    const y = String(d.getFullYear()).slice(2);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `BR-${y}${m}${day}-${String(++orderSeq).padStart(4, "0")}`;
  }

  // ─── Orders ───
  // 1) Sara — DELIVERED (3 days ago)
  {
    const num = orderNumber(3);
    const lipRed = await colorSku(lipstick.id, "أحمر كلاسيك");
    const serumBase = await baseSku(serum.id);
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: sara.id,
        status: "DELIVERED",
        name: "سارة محمد",
        phonePrimary: "01000000000",
        phoneSecondary: "01223344556",
        whatsappOn: "primary",
        addressText: "شارع عباس العقاد، أمام كلية التجارة",
        lat: 30.0566,
        lng: 31.3302,
        floor: "3",
        apartment: "12",
        zoneId: zoneNasr.id,
        subtotal: 1200,
        discountAmount: 0,
        shippingFee: 35,
        total: 1235,
        createdAt: daysAgo(3, 2),
        updatedAt: daysAgo(2, 6),
      },
    });
    await db.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          productId: lipstick.id,
          productName: lipstick.name,
          productImage: IMG("lipstick.png"),
          skuId: lipRed.id,
          skuCode: lipRed.skuCode,
          colorName: "أحمر كلاسيك",
          colorHex: "#B0222B",
          unitPrice: 480,
          basePrice: 480,
          quantity: 1,
          lineTotal: 480,
        },
        {
          orderId: order.id,
          productId: serum.id,
          productName: serum.name,
          productImage: IMG("serum.png"),
          skuId: serumBase.id,
          skuCode: serumBase.skuCode,
          unitPrice: 720,
          basePrice: 850,
          quantity: 1,
          lineTotal: 720,
        },
      ],
    });
    await reserveStock(lipRed.id, 1, num, admin1.name);
    await reserveStock(serumBase.id, 1, num, admin1.name);
    await saleStock(lipRed.id, 1, num, admin1.name);
    await saleStock(serumBase.id, 1, num, admin1.name);
    await logAction(admin1, "ORDER_CONFIRM", "Order", order.id, `تأكيد الطلب ${num} وحجز الكمية`);
    await logAction(admin1, "ORDER_STATUS", "Order", order.id, `تحديث الطلب ${num} إلى جاري التوصيل`);
    await logAction(admin1, "ORDER_STATUS", "Order", order.id, `تم تسليم الطلب ${num} بنجاح`);
    await notifyCustomer(sara.id, "ORDER_STATUS", "تم تسليم طلبك", `تم تسليم الطلب ${num} بنجاح. نتمنى أن يعجبك!`, order.id);
  }

  // 2) Sara — OUT_FOR_DELIVERY (yesterday)
  {
    const num = orderNumber(1);
    const fBeige = await colorSku(foundation.id, "بيج طبيعي");
    const scrubBase = await baseSku(scrub.id);
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: sara.id,
        status: "OUT_FOR_DELIVERY",
        name: "سارة محمد",
        phonePrimary: "01000000000",
        phoneSecondary: "01223344556",
        whatsappOn: "both",
        addressText: "شارع عباس العقاد، أمام كلية التجارة",
        lat: 30.0566,
        lng: 31.3302,
        floor: "3",
        apartment: "12",
        zoneId: zoneNasr.id,
        subtotal: 1340,
        discountAmount: 134,
        discountCode: "WELCOME10",
        shippingFee: 35,
        total: 1241,
        createdAt: daysAgo(1, 3),
        updatedAt: daysAgo(0, 4),
      },
    });
    await db.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          productId: foundation.id,
          productName: foundation.name,
          productImage: IMG("foundation.png"),
          skuId: fBeige.id,
          skuCode: fBeige.skuCode,
          colorName: "بيج طبيعي",
          colorHex: "#E8C39E",
          unitPrice: 640,
          basePrice: 750,
          quantity: 1,
          lineTotal: 640,
        },
        {
          orderId: order.id,
          productId: scrub.id,
          productName: scrub.name,
          productImage: IMG("scrub.png"),
          skuId: scrubBase.id,
          skuCode: scrubBase.skuCode,
          unitPrice: 350,
          basePrice: 350,
          quantity: 2,
          lineTotal: 700,
        },
      ],
    });
    await reserveStock(fBeige.id, 1, num, admin2.name);
    await reserveStock(scrubBase.id, 2, num, admin2.name);
    await logAction(admin2, "ORDER_CONFIRM", "Order", order.id, `تأكيد الطلب ${num} وحجز الكمية`);
    await logAction(admin2, "ORDER_STATUS", "Order", order.id, `تحديث الطلب ${num} إلى جاري التوصيل`);
    await notifyCustomer(sara.id, "ORDER_STATUS", "طلبك في الطريق إليك", `الطلب ${num} خرج للتوصيل الآن — جهزي نفسك للاستلام!`, order.id);
  }

  // 3) Nour — CONFIRMED (today)
  {
    const num = orderNumber(0);
    const perfumeBase = await baseSku(perfume.id);
    const lotionBase = await baseSku(lotion.id);
    const zoneMaadi = await db.deliveryZone.findFirstOrThrow({ where: { name: { contains: "المعادي" } } });
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: nour.id,
        status: "CONFIRMED",
        name: "نور علي",
        phonePrimary: "01111111111",
        phoneSecondary: "01098765432",
        whatsappOn: "secondary",
        addressText: "شارع 9، المعادي",
        floor: "1",
        apartment: "4",
        zoneId: zoneMaadi.id,
        subtotal: 1610,
        discountAmount: 0,
        shippingFee: 40,
        total: 1650,
        createdAt: daysAgo(0, 5),
        updatedAt: daysAgo(0, 2),
      },
    });
    await db.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          productId: perfume.id,
          productName: perfume.name,
          productImage: IMG("perfume.png"),
          skuId: perfumeBase.id,
          skuCode: perfumeBase.skuCode,
          unitPrice: 1190,
          basePrice: 1450,
          quantity: 1,
          lineTotal: 1190,
        },
        {
          orderId: order.id,
          productId: lotion.id,
          productName: lotion.name,
          productImage: IMG("lotion.png"),
          skuId: lotionBase.id,
          skuCode: lotionBase.skuCode,
          unitPrice: 420,
          basePrice: 420,
          quantity: 1,
          lineTotal: 420,
        },
      ],
    });
    await reserveStock(perfumeBase.id, 1, num, admin1.name);
    await reserveStock(lotionBase.id, 1, num, admin1.name);
    await logAction(admin1, "ORDER_CONFIRM", "Order", order.id, `تأكيد الطلب ${num} وحجز الكمية`);
    await notifyCustomer(nour.id, "ORDER_STATUS", "تم تأكيد طلبك", `تم تأكيد الطلب ${num} وسيتم التواصل معك لتأكيد تفاصيل التسليم.`, order.id);
  }

  // 4) Mariam — PENDING_REVIEW (today)
  {
    const num = orderNumber(0);
    const mascBlack = await colorSku(mascara.id, "أسود");
    const zoneWista = await db.deliveryZone.findFirstOrThrow({ where: { name: { contains: "وسط البلد" } } });
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: mariam.id,
        status: "PENDING_REVIEW",
        name: "مريم حسن",
        phonePrimary: "01222222222",
        phoneSecondary: "01011223344",
        whatsappOn: "primary",
        addressText: "شارع طلعت حرب، وسط البلد",
        floor: "5",
        apartment: "22",
        zoneId: zoneWista.id,
        subtotal: 840,
        discountAmount: 0,
        shippingFee: 30,
        total: 870,
        createdAt: daysAgo(0, 1),
        updatedAt: daysAgo(0, 1),
      },
    });
    await db.orderItem.create({
      data: {
        orderId: order.id,
        productId: mascara.id,
        productName: mascara.name,
        productImage: IMG("mascara.png"),
        skuId: mascBlack.id,
        skuCode: mascBlack.skuCode,
        colorName: "أسود",
        colorHex: "#1A1A1A",
        unitPrice: 420,
        basePrice: 420,
        quantity: 2,
        lineTotal: 840,
      },
    });
    await notifyAdmins("NEW_ORDER", "طلب جديد بانتظار المراجعة", `الطلب ${num} من مريم حسن بقيمة 870 ج.م`, order.id);
    await notifyCustomer(mariam.id, "ORDER_STATUS", "استلمنا طلبك", `الطلب ${num} قيد المراجعة الآن وسنوافيك بالقرار قريبًا.`, order.id);
  }

  // 5) Nour — REJECTED (2 days ago)
  {
    const num = orderNumber(2);
    const paletteBase = await baseSku(palette.id);
    const zoneOctober = await db.deliveryZone.findFirstOrThrow({ where: { name: { contains: "6 أكتوبر" } } });
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: nour.id,
        status: "REJECTED",
        rejectionReason: "تعذر التواصل مع العميل على الرقمين لتأكيد الطلب",
        name: "نور علي",
        phonePrimary: "01111111111",
        phoneSecondary: "01098765432",
        whatsappOn: "primary",
        addressText: "الحصري، 6 أكتوبر",
        floor: "2",
        apartment: "7",
        zoneId: zoneOctober.id,
        subtotal: 840,
        discountAmount: 0,
        shippingFee: 50,
        total: 890,
        createdAt: daysAgo(2, 1),
        updatedAt: daysAgo(1, 12),
      },
    });
    await db.orderItem.create({
      data: {
        orderId: order.id,
        productId: palette.id,
        productName: palette.name,
        productImage: IMG("palette.png"),
        skuId: paletteBase.id,
        skuCode: paletteBase.skuCode,
        unitPrice: 840,
        basePrice: 990,
        quantity: 1,
        lineTotal: 840,
      },
    });
    await logAction(admin2, "ORDER_REJECT", "Order", order.id, `رفض الطلب ${num} — تعذر التواصل مع العميل`);
    await notifyCustomer(nour.id, "ORDER_STATUS", "تم رفض طلبك", `نعتذر، تم رفض الطلب ${num}. السبب: تعذر التواصل معك على الرقمين لتأكيد الطلب. تواصلي معنا عبر واتساب للمساعدة.`, order.id);
  }

  // 6) Mariam — CANCELLED after confirmation (3 days ago)
  {
    const num = orderNumber(3);
    const arganBase = await baseSku(arganOil.id);
    const tonerBase = await baseSku(toner.id);
    const zoneHaram = await db.deliveryZone.findFirstOrThrow({ where: { name: { contains: "الهرم" } } });
    const order = await db.order.create({
      data: {
        orderNumber: num,
        customerId: mariam.id,
        status: "CANCELLED",
        cancellationReason: "العميلة ألغت الطلب قبل الشحن — تم تحميل تكلفة الشحن وفق السياسة",
        name: "مريم حسن",
        phonePrimary: "01222222222",
        phoneSecondary: "01011223344",
        whatsappOn: "secondary",
        addressText: "شارع الهرم، فيصل",
        floor: "4",
        apartment: "9",
        zoneId: zoneHaram.id,
        subtotal: 870,
        discountAmount: 0,
        shippingFee: 45,
        total: 915,
        createdAt: daysAgo(3, 5),
        updatedAt: daysAgo(2, 10),
      },
    });
    await db.orderItem.createMany({
      data: [
        {
          orderId: order.id,
          productId: arganOil.id,
          productName: arganOil.name,
          productImage: IMG("arganoil.png"),
          skuId: arganBase.id,
          skuCode: arganBase.skuCode,
          unitPrice: 550,
          basePrice: 550,
          quantity: 1,
          lineTotal: 550,
        },
        {
          orderId: order.id,
          productId: toner.id,
          productName: toner.name,
          productImage: IMG("toner.png"),
          skuId: tonerBase.id,
          skuCode: tonerBase.skuCode,
          unitPrice: 320,
          basePrice: 320,
          quantity: 1,
          lineTotal: 320,
        },
      ],
    });
    await reserveStock(arganBase.id, 1, num, admin1.name);
    await reserveStock(tonerBase.id, 1, num, admin1.name);
    await releaseStock(arganBase.id, 1, num, admin1.name);
    await releaseStock(tonerBase.id, 1, num, admin1.name);
    await logAction(admin1, "ORDER_CANCEL", "Order", order.id, `إلغاء الطلب ${num} بعد التأكيد وتحرير الكمية المحجوزة`);
    await notifyCustomer(mariam.id, "ORDER_STATUS", "تم إلغاء طلبك", `تم إلغاء الطلب ${num} كما طلبت.`, order.id);
  }
  console.log("✓ Orders + inventory transactions");

  // ─── Low stock notifications (current state) ───
  const lowSkus = await db.sku.findMany({
    where: { AND: [{ availableQty: { lte: 5 } }, { availableQty: { gt: 0 } }] },
    include: { product: true },
  });
  for (const sku of lowSkus) {
    if (sku.availableQty <= sku.lowStockThreshold) {
      await notifyAdmins(
        "LOW_STOCK",
        "تنبيه مخزون منخفض",
        `${sku.product.name}${sku.colorName ? ` — ${sku.colorName}` : ""} (${sku.skuCode}): متبقي ${sku.availableQty} قطعة فقط`
      );
    }
  }
  const outSkus = await db.sku.findMany({
    where: { availableQty: 0 },
    include: { product: true },
  });
  for (const sku of outSkus) {
    await notifyAdmins(
      "OUT_OF_STOCK",
      "نفاد مخزون SKU",
      `${sku.product.name}${sku.colorName ? ` — ${sku.colorName}` : ""} (${sku.skuCode}) نفد من المخزون`
    );
  }
  console.log("✓ Notifications");

  console.log("🎉 Seed complete!");
  console.log("   Admins: admin1 / admin2 — كلمة المرور: brilliant2026");
  console.log("   عميلة تجريبية: 01000000000 — كلمة المرور: 123456");
  console.log("   أكواد خصم: WELCOME10 (10%) | GOLD20 (20%)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
