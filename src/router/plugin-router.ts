import { Router } from 'express';
import { ozAdminUtilsMapHandler } from '../handler/ozadminutils-map-handler.js';
import { ozAdminUtilsPlayerlistHandler } from '../handler/ozadminutils-playerlist-handler.js';
import { ozAdminUtilsPluginsHandler } from '../handler/ozadminutils-plugins-handler.js';
import { ozAdminUtilsServerConfigHandler } from '../handler/ozadminutils-server-config-handler.js';
import { ozAdminUtilsWorldAreasHandler } from '../handler/ozadminutils-world-areas-handler.js';
import { ozGpsMarkerHandler } from '../handler/ozgps-marker-handler.js';
import { ozLandClaimClaimSalesHandler } from '../handler/ozlandclaim-claim-sales-handler.js';
import { ozLandClaimRenewZonesHandler } from '../handler/ozlandclaim-renew-zones-handler.js';
import { ozMarketplaceOffersHandler } from '../handler/ozmarketplace-offers-handler.js';
import { ozMarketplaceZonesHandler } from '../handler/ozmarketplace-zones-handler.js';
import { ozShopZonesHandler } from '../handler/ozshop-zones-handler.js';

export const pluginRouter = Router();

pluginRouter.get('/ozadminutils/map', ozAdminUtilsMapHandler);
pluginRouter.get('/ozadminutils/plugins', ozAdminUtilsPluginsHandler);
pluginRouter.get('/ozadminutils/playerlist', ozAdminUtilsPlayerlistHandler);
pluginRouter.get('/ozadminutils/server-config', ozAdminUtilsServerConfigHandler);
pluginRouter.get('/ozadminutils/world-areas', ozAdminUtilsWorldAreasHandler);
pluginRouter.get('/ozgps/marker', ozGpsMarkerHandler);
pluginRouter.get('/ozmarketplace/zones', ozMarketplaceZonesHandler);
pluginRouter.get('/ozmarketplace/offers', ozMarketplaceOffersHandler);
pluginRouter.get('/ozshop/zones', ozShopZonesHandler);
pluginRouter.get('/ozlandclaim/claim-sales', ozLandClaimClaimSalesHandler);
pluginRouter.get('/ozlandclaim/renew-zones', ozLandClaimRenewZonesHandler);
