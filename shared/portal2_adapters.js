// Declarative read-only adapter catalogue. No remotely executed code.
export const API_VERSION=1;
export const ADAPTERS=Object.freeze([
 Object.freeze({id:'3xui',name:'3x-ui',version:1,kind:'api',readOnly:true,requires:'explicit-origin-permission',notes:'GET /panel/api/server/status; monitor token or browser session'}),
 Object.freeze({id:'generic',name:'Generic WebUI',version:1,kind:'head',readOnly:true,requires:'explicit-origin-permission',notes:'HEAD only; iframe policy unknown'})
]);
export function adapter(id){return ADAPTERS.find(x=>x.id===id)||ADAPTERS[1];}
export const TEMPLATES=Object.freeze([
 {id:'3xui',name:'3x-ui',defaultPort:2053,adapter:'3xui'},
 {id:'portainer',name:'Portainer',defaultPort:9443,adapter:'none'},
 {id:'nginx-proxy-manager',name:'Nginx Proxy Manager',defaultPort:81,adapter:'none'},
 {id:'home-assistant',name:'Home Assistant',defaultPort:8123,adapter:'none'},
 {id:'adguard-home',name:'AdGuard Home',defaultPort:3000,adapter:'none'},
 {id:'routerforge',name:'RouterForge Core',defaultPort:2233,adapter:'none'}
]);
