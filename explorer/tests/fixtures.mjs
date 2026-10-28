import {readFileSync} from 'node:fs';
import {applyWearingGuidance} from '../dist/engine.mjs';
export const read=name=>JSON.parse(readFileSync(new URL('../dist/'+name,import.meta.url)));
export const guidance=read('wearing.json');
export const catalogue=applyWearingGuidance([...read('catalogue.json'),...read('catalogue-extra.json')],guidance);
// Synthetic records for every public catalogue profile; no person's ownership list.
export const seed=catalogue.map(f=>({id:'fixture-'+f.id,name:f.name,brand:f.brand,concentration:f.concentration,catalogueId:f.id,productType:'fragrance',variantStatus:'confirmed',note:''}));
export const reviewedPool=catalogue.filter(f=>guidance[f.id]);
