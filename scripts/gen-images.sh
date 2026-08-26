#!/bin/bash
# BRILLIANT — product & banner image generation
set -u
mkdir -p /home/z/my-project/public/images/products /home/z/my-project/public/images/banners

STYLE="professional luxury cosmetics product photography, on soft cream beige silk backdrop, warm golden studio lighting, elegant gold accents, minimal composition, high-end beauty brand, high quality, detailed"

gen() {
  local file="$1"; local prompt="$2"; local size="${3:-1024x1024}"
  local dir="products"; [[ "$file" == banner* ]] && dir="banners"
  local out="/home/z/my-project/public/images/$dir/$file"
  if [ -s "$out" ]; then
    echo "SKIP $file (exists)"; return 0
  fi
  for i in 1 2 3; do
    if z-ai image -p "$prompt" -o "$out" -s "$size" >/dev/null 2>&1 && [ -s "$out" ]; then
      echo "OK $file"; return 0
    fi
    sleep 2
  done
  echo "FAIL $file"
}

gen "serum.png" "amber glass serum dropper bottle with gold cap, vitamin C skincare serum, $STYLE"
gen "cream.png" "white luxury moisturizer cream jar with gold lid, shea butter, $STYLE"
gen "cleanser.png" "elegant ivory pump bottle facial cleanser with gold details, $STYLE"
gen "claymask.png" "moroccan red clay mask jar with small wooden spoon, $STYLE"
gen "toner.png" "rose water facial toner glass bottle with fresh rose petals beside it, $STYLE"
gen "lipstick.png" "luxury velvet matte lipstick with golden metal casing, deep red shade, standing upright, $STYLE"
gen "lipstick2.png" "three luxury lipsticks with gold casing in red pink and nude shades lying on silk, $STYLE"
gen "foundation.png" "luxury liquid foundation glass bottle with gold pump, beige shades swatch, $STYLE"
gen "palette.png" "open golden eyeshadow palette with warm shimmer shades, brush beside, $STYLE"
gen "mascara.png" "luxury mascara with elegant gold tube and black wand, $STYLE"
gen "blush.png" "open pink blush compact with gold casing and soft brush, $STYLE"
gen "arganoil.png" "golden moroccan argan hair oil in elegant amber glass bottle, $STYLE"
gen "shampoo.png" "premium sulfate free shampoo in cream colored bottle with gold accents, $STYLE"
gen "perfume.png" "luxury golden eau de parfum perfume bottle with crystalline stopper, $STYLE"
gen "bodymist.png" "elegant vanilla body mist spray bottle in soft cream color, $STYLE"
gen "scrub.png" "coffee body scrub in glass jar with natural coffee beans, $STYLE"
gen "lotion.png" "cocoa body lotion pump bottle in warm brown and gold packaging, $STYLE"
gen "giftbox.png" "luxury gold gift box filled with beauty products, ribbon, cream and gold, $STYLE"
gen "banner1.png" "wide luxury beauty hero banner, elegant gold and cream cosmetics arrangement with silk fabric, space for text on right side, warm golden light, $STYLE" "1440x720"
gen "banner2.png" "wide luxury makeup collection banner, lipsticks and gold compact on marble with gold decor, space for text, $STYLE" "1440x720"
gen "banner3.png" "wide skincare banner, glass bottles serum and cream on travertine stone with beige tones and gold accents, space for text, $STYLE" "1440x720"

echo "ALL DONE"
