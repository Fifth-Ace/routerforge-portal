// Catalog suggestions only. No network probing, scanning or automatic activation.
import { cleanApp, parseAddress, presetGroup } from './model.js';

export const CATALOG = Object.freeze([
  { id:'routerforge', name:'RouterForge Core', icon:'▣', category:'RouterForge', port:2233, path:'/', description:'Модульная платформа RouterForge' },
  { id:'awg-manager', name:'AWG Manager', icon:'🌐', category:'Сеть и VPN', port:2222, path:'/', description:'AmneziaWG и sing-box; реальный порт может отличаться' },
  { id:'nfqws-web', name:'nfqws-keenetic-web', icon:'🛡', category:'Сеть и VPN', port:90, path:'/', description:'Веб-интерфейс nfqws / nfqws2' },
  { id:'nfqws2-ui', name:'nfqws2-ui', icon:'⚡', category:'Сеть и VPN', port:8090, path:'/', description:'Альтернативная панель nfqws2; takeover меняет порт' },
  { id:'neofit', name:'NeoFit', icon:'🔧', category:'Сеть и VPN', port:92, path:'/', description:'Маршрутизация и прокси в Keenetic' },
  { id:'adguard-home', name:'AdGuard Home', icon:'🛡', category:'DNS и защита', port:3000, path:'/', description:'3000 — первичная настройка; рабочий порт может быть 80' },
  { id:'xkeen-ui', name:'XKeen UI', icon:'⚙', category:'Сеть и VPN', port:8089, path:'/', description:'Веб-панель для xKeen на Entware' }
]);
export const CATALOG_IDS = Object.freeze(CATALOG.map(x=>x.id));
export const catalogById = id => CATALOG.find(x=>x.id===id);
export function validatePort(value) {
  const raw=String(value).trim();
  if (!/^[0-9]{1,5}$/.test(raw)) throw Error('Порт должен быть числом от 1 до 65535.');
  const n=Number(raw);
  if(n<1 || n>65535) throw Error('Порт должен быть от 1 до 65535.');
  return n;
}
export function catalogUrl(router, id, {hostname,port,protocol='http:'}={}) {
  const template=catalogById(id);
  if(!template) throw Error('Неизвестная интеграция.');
  const base=parseAddress(router);
  const host=String(hostname || base.hostname).trim();
  if (!host || /[\\/@?#\s]/.test(host) || host.includes('@')) throw Error('Укажи IP или имя устройства без порта.');
  if (!['http:','https:'].includes(protocol)) throw Error('Недопустимый протокол.');
  let u;try { u=new URL(protocol+'//'+host+':'+validatePort(port ?? template.port)+template.path); }
  catch {throw Error('Неверный адрес устройства.');}
  if (u.username || u.password || !u.hostname || u.hostname !== host.replace(/^\[|\]$/g,'')) {
    // For IPv6, URL.hostname contains the enclosing brackets in current browsers.
    if (u.hostname !== host || u.username || u.password) throw Error('Неверное имя устройства.');
  }
  return u.href;
}
export function makeCatalogApp(router,id,overrides={},enabled=true,old=null) {
  const template=catalogById(id);
  if(!template) throw Error('Неизвестная интеграция.');
  const url=catalogUrl(router,id,overrides);
  return cleanApp({id: old?.id || 'preset_'+id,name:template.name,icon:template.icon,mode:overrides.mode || old?.mode || 'auto',layoutWidth:overrides.layoutWidth || old?.layoutWidth || 'native',nativeWidthPct:overrides.nativeWidthPct ?? old?.nativeWidthPct ?? 85,nativeLeftTrimPx:overrides.nativeLeftTrimPx ?? old?.nativeLeftTrimPx ?? 0,nativeRightTrimPx:overrides.nativeRightTrimPx ?? old?.nativeRightTrimPx ?? 0,manualBounds:overrides.manualBounds ?? old?.manualBounds ?? false,favorite:overrides.favorite ?? old?.favorite ?? false,group:overrides.group ?? old?.group ?? presetGroup(id),url,enabled,presetId:id});
}
