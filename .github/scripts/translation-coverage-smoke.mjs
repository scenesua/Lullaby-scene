import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{throw new Error(message)};

const source=read('web/site-locales-v10.js').replace(/\}\)\(\);\s*$/,`globalThis.__localeAudit={EN,T,TERMS,COMPLETIONS,CATALOG,JOURNEY_TRANSLATIONS,TRAIN_TRANSLATIONS};})();`);
const document={documentElement:{dataset:{},classList:{add(){},remove(){}}},querySelector(){return null},querySelectorAll(){return[]},dispatchEvent(){}};
const context={window:{},document,navigator:{languages:['en'],language:'en'},localStorage:{getItem(){return'en'},setItem(){}},CustomEvent:class{}};
context.window=context;
vm.runInNewContext(source,context,{filename:'site-locales-v10.js'});
const {EN,T,TERMS,CATALOG,JOURNEY_TRANSLATIONS,TRAIN_TRANSLATIONS}=context.__localeAudit;
const languages=['ko','ar','ja','zh-CN','zh-TW','ru','fr','es','pt','th','tl','hi','vi'];
for(const code of languages){
  const missing=Object.keys(EN).filter(key=>!Object.hasOwn(T[code]||{},key));
  if(missing.length)fail(`Web locale ${code} is missing: ${missing.join(', ')}`);
  const missingTerms=Object.keys(TERMS.en).filter(key=>!Object.hasOwn(TERMS[code]||{},key));
  if(missingTerms.length)fail(`Web terms ${code} are missing: ${missingTerms.join(', ')}`);
  for(const type of ['source','preset']){
    const missingCatalog=Object.keys(CATALOG[type].en).filter(key=>!Object.hasOwn(CATALOG[type][code]||{},key));
    if(missingCatalog.length)fail(`Web ${type} catalog ${code} is missing: ${missingCatalog.join(', ')}`);
  }
  if(code!=='ko'){
    const journey=JOURNEY_TRANSLATIONS[code];
    if(!journey||journey.d.length!==5||journey.m.length!==5||journey.m.some(macros=>macros.length!==4))fail(`Journey translations are incomplete for ${code}`);
    if(!TRAIN_TRANSLATIONS[code]||TRAIN_TRANSLATIONS[code].macros.length!==4)fail(`Train translations are incomplete for ${code}`);
  }
}
const htmlKeys=new Set();
for(const entry of fs.readdirSync(path.join(root,'web'),{recursive:true,withFileTypes:true})){
  if(!entry.isFile()||!entry.name.endsWith('.html'))continue;
  const html=fs.readFileSync(path.join(entry.parentPath,entry.name),'utf8');
  for(const match of html.matchAll(/data-i18n="([^"]+)"/g))htmlKeys.add(match[1]);
}
const unknown=[...htmlKeys].filter(key=>!Object.hasOwn(EN,key));
if(unknown.length)fail(`HTML uses unknown translation keys: ${unknown.join(', ')}`);

const names=file=>new Set([...read(file).matchAll(/<string\s+name="([^"]+)"/g)].map(match=>match[1]));
for(const file of fs.readdirSync(path.join(root,'app/src/main/res/values')).filter(name=>name.endsWith('.xml'))){
  const base=`app/src/main/res/values/${file}`;
  if(!read(base).includes('<string '))continue;
  const en=names(base);
  for(const [code,label] of [['ko','Korean'],['ar','Arabic']]){
    const translated=`app/src/main/res/values-${code}/${file}`;
    if(!fs.existsSync(path.join(root,translated)))fail(`Missing ${label} resource file: ${file}`);
    const localized=names(translated),missing=[...en].filter(key=>!localized.has(key));
    if(missing.length)fail(`Android ${file} is missing ${label} strings: ${missing.join(', ')}`);
  }
  const hangul=[...read(base).matchAll(/<string\s+name="([^"]+)"[^>]*>([^<]*[가-힣][^<]*)<\/string>/g)].map(match=>match[1]);
  if(hangul.length)fail(`Android default ${file} contains Korean text: ${hangul.join(', ')}`);
}
console.log(`Translation coverage OK: ${Object.keys(EN).length} web keys, ${languages.length+1} locales, Android EN/KO/AR parity.`);
