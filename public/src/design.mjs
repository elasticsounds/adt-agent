import {defaults,validateTokens,contrastChecks} from './core.mjs?v=0.10.0';
// The PDF palette is visual evidence. Preserve the reader's font and use the
// existing fixed components; adapt the source accent only as needed for contrast.
export function designFromPalette(palette=[]){
 const tokens={...defaults},sourceColor=palette.find(c=>/^#[a-f\d]{6}$/i.test(c));
 if(!sourceColor)return tokens;
 const rgb=sourceColor.slice(1).match(/../g).map(n=>parseInt(n,16));
 const hex=values=>'#'+values.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
 tokens.surface=hex(rgb.map(n=>255*.95+n*.05));
 for(let factor=1;factor>.02;factor*=.9){tokens.accent=hex(rgb.map(n=>n*factor));if(contrastChecks(tokens).every(c=>c.ratio>=4.5))return validateTokens(tokens);}
 return {...defaults};
}
