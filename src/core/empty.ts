import type {State} from './types';
/** A new browser starts without business records; accounts/settings are independent. */
export const makeEmpty=():State=>({version:2,inventoryRevision:2,categories:[],inventoryDocuments:[],clients:[],products:[],suppliers:[],warehouses:[],inventory:[],movements:[],quotes:[],orders:[],sales:[],payments:[],returns:[],purchases:[],expenses:[],audit:[]});
