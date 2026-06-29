export interface MapGpsMarker {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  icon: string;
  color: string;
  createdAt: string;
}

export interface MapMarketplaceOffer {
  id: number;
  itemName: string;
  itemVariant: number;
  amount: number;
  price: number;
  currency: string;
  sellerName: string;
  createdAt: string;
}

export interface MapMarketplaceZone {
  id: string;
  name: string;
  areaId: number;
  createdAt: string;
}

export interface MapShopZone {
  areaId: number;
  areaName: string;
  createdBy: string;
  createdAt: string;
  systemShop: number;
  systemOffersFile: string;
}

export interface MapClaimSaleListing {
  id: number;
  world: string;
  areaId: number;
  ownerUuid: string;
  ownerDbId: number;
  price: number;
  listedAt: string;
  status: 'ACTIVE';
}
