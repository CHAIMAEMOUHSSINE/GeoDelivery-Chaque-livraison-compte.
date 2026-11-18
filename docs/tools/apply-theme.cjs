// Applique les douze couleurs OOXML : PptxGenJS gere les fontes, pas la palette.
const fs=require('node:fs');
const JSZip=require('jszip');
const slots=['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'];
exports.applyTheme=async function(file,theme){
 for(const slot of slots) if(!/^[\da-f]{6}$/i.test(theme.colors[slot])) throw new Error('Couleur de theme invalide : '+slot);
 const escaped=theme.name.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const zip=await JSZip.loadAsync(fs.readFileSync(file));
 const part='ppt/theme/theme1.xml', original=await zip.file(part).async('string');
 const scheme=`<a:clrScheme name="${escaped}">${slots.map(s=>`<a:${s}><a:srgbClr val="${theme.colors[s]}"/></a:${s}>`).join('')}</a:clrScheme>`;
 zip.file(part,original.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/,scheme)
   .replace(/(<a:(?:theme|fontScheme)\b[^>]*name=")[^"]*"/g,`$1${escaped}"`));
 for(const name of Object.keys(zip.files).filter(n=>n.endsWith('.xml'))){
   const xml=await zip.file(name).async('string');
   if(/<a:srgbClr val="(?![\da-f]{6}")[^"]*"/i.test(xml)) throw new Error('Couleur non hexadecimale dans '+name);
 }
 fs.writeFileSync(file,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
};
