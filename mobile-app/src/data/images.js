// Real photography bundled with the app (same files the website uses in assets/products).
// Bundled with require() so they work offline and load instantly.
// African photography lives in assets/africa (see CREDITS.md there).

export const AFRICA_IMAGES = {
  marketDar: require('../../assets/africa/market-dar-es-salaam.jpg'),
  marketSenegal: require('../../assets/africa/market-senegal.jpg'),
  marketCairo: require('../../assets/africa/market-cairo.jpg'),
  mobilePayment: require('../../assets/africa/mobile-payment.jpg'),
  mobileMoney: require('../../assets/africa/mobile-money.jpg'),
  entrepreneur: require('../../assets/africa/entrepreneur.jpg'),
  fashion: require('../../assets/africa/african-print-fashion.jpg'),
  vendor: require('../../assets/africa/vendor-ibadan.jpg'),
};

// Small photos for the Home "What are you looking for?" tiles
export const TILE_IMAGES = {
  phones: require('../../assets/africa/tiles/phones.jpg'),
  beauty: require('../../assets/africa/tiles/beauty.jpg'),
  food: require('../../assets/africa/tiles/food.jpg'),
  hardware: require('../../assets/africa/tiles/hardware.jpg'),
};

export const CATEGORY_IMAGES = {
  phones: require('../../assets/products/phones.jpg'),
  cosmetics: require('../../assets/products/cosmetics.jpg'),
  fashion: AFRICA_IMAGES.fashion,
  food: AFRICA_IMAGES.vendor,
  hardware: require('../../assets/products/hardware.jpg'),
  other: AFRICA_IMAGES.marketCairo,
};


// App logo (rounded navy square with the white bag and V)
export const LOGO = require('../../assets/brand/logo-mark.png');

export const HERO_IMAGE = AFRICA_IMAGES.marketSenegal;

// Business and product photos now come only from the owner (see src/utils/photos.js);
// a business without its own photo shows a plain branded cover, never a stock picture.
