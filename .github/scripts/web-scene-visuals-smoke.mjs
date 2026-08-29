import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const player=fs.readFileSync(path.join(root,'web/player-v2.js'),'utf8');
const background=fs.readFileSync(path.join(root,'web/journey-background-v1.js'),'utf8');
const css=fs.readFileSync(path.join(root,'web/player-v2.css'),'utf8');
const html=fs.readFileSync(path.join(root,'web/player/index.html'),'utf8');
const bridge=fs.readFileSync(path.join(root,'web/player-runtime-bridge-v12.js'),'utf8');
const interaction=fs.readFileSync(path.join(root,'web/mixer-interaction-v14.js'),'utf8');
const androidDisplay=fs.readFileSync(path.join(root,'app/src/main/java/com/scene/ambience/ui/SceneDisplay.kt'),'utf8');
const presetIds=[...player.matchAll(/\{id:'(preset_[^']+)',name:/g)].map(match=>match[1]);
const mapping=player.match(/const presetVisuals=\{([\s\S]*?)\n\};/)?.[1]||'';

for(const id of presetIds){
  if(!mapping.includes(`${id}:`))throw new Error(`Missing scene visual for ${id}`);
}
for(const match of mapping.matchAll(/:'(\/assets\/(?:simple-scenes|journeys)\/[^']+\.webp)'/g)){
  const file=path.join(root,'web',match[1]);
  if(!fs.existsSync(file))throw new Error(`Missing visual asset ${match[1]}`);
}
for(const marker of ['createAnalyser()','smoothingTimeConstant=.94','lullaby-preset-applied','--scene-exposure','mix-blend-mode:screen']){
  if(!`${player}\n${background}\n${css}`.includes(marker))throw new Error(`Missing audio-reactive marker ${marker}`);
}
for(const marker of ['data-i18n="sleepJourneys"','mobile-scene-display-button','stopJourneyPlayback','stopJourney:stopJourneyPlayback','R.stopJourney?.()','brightness(var(--scene-user-brightness,1))','journey-hood-active','hood-siren-light']){
  if(!`${html}\n${player}\n${background}\n${bridge}\n${interaction}\n${css}`.includes(marker))throw new Error(`Missing mobile playback marker ${marker}`);
}
if(css.includes('brightness(calc(.8 + var(--scene-light)'))throw new Error('Scene base image still animates brightness instead of exposure layers');
for(const marker of ['.journey-visual{--scene-exposure:0','.journey-visual-layer.active{opacity:1;filter:none}','body.journey-display-mode>.journey-visual .journey-visual-shade{background:transparent}'])if(!css.includes(marker))throw new Error(`Scene original-brightness baseline missing: ${marker}`);
if(css.includes('opacity:calc(.035 + var(--scene-exposure)')||css.includes('opacity:calc(.018 + var(--scene-exposure)'))throw new Error('Scene exposure layers still brighten the original-photo baseline');
for(const marker of ['else 0f','alpha = exposure * 0.16f','alpha = exposure * 0.20f'])if(!androidDisplay.includes(marker))throw new Error(`Android original-brightness baseline missing: ${marker}`);
console.log(`scene visuals smoke passed: ${presetIds.length} presets`);
