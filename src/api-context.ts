/** Recover declared API scope for a quoted RST/Markdown passage. This reads
 * an immutable approved snapshot at retrieval time; it converts/indexes nothing.
 * Ambiguous/mixed owners yield no inferred scope. Declaration-only hits may
 * quote bounded adjacent text in the same API section, with exact offsets.
 */
export type ApiContext = { identifiers: string[]; declarations: { text: string; start: number; end: number }[]; sourceExcerpt?: { start:number; end:number } };
const normalized=(text:string)=>text.replace(/:[a-z]+:`([^`]+)`/g,'$1').replace(/[`*~]/g,'').replace(/\s+/g,' ').trim();
export function declaredApiContext(source:string,passage:string,requestedIdentifiers:string[]=[]):ApiContext|undefined {
 if(source.length>200000)return;
 const fragments=passage.split(/\n\s*\n|\n|(?<=[.!?])\s+/).map(normalized).filter(s=>s.length>=32);
 const declarationOnly=/^\s*\.\.\s+(?:class|method|coroutinemethod|function|attribute)::[^\n]+\s*$/.test(passage);
 if(!fragments.length&&!declarationOnly)return;
 type Declaration={text:string;start:number;end:number};
 const declarations:Declaration[]=[];let module='',owner='',member='';let moduleDecl:Declaration|undefined,ownerDecl:Declaration|undefined,memberDecl:Declaration|undefined;
 let ownerRst=false,ownerIndent=-1,memberIndent=-1;
 const contexts:{owner:string;member:string;module:string;declarations:Declaration[];start:number;end:number}[]=[];
 let offset=0,blockStart=0;
 const flush=(end:number)=>{if(owner&&end>blockStart)contexts.push({owner,member,module,declarations:[moduleDecl,ownerDecl,memberDecl].filter((d):d is Declaration=>!!d),start:blockStart,end});};
 for(const line of source.split(/(?<=\n)/)){
  const directive=line.match(/^(\s*)\.\.\s+(module|currentmodule|class|method|coroutinemethod|function|attribute)::\s*([\w.]+)/);
  const heading=line.match(/^##+\s+`?([\w]+(?:\.[\w]+)+)(?:\(|`|\s|$)/);
  const section=/^[=~-]{3,}\s*$/.test(line)&&!/^\s/.test(line);
  if(directive||heading||section){
   flush(offset);blockStart=offset;
   const d={text:line.trimEnd(),start:offset,end:offset+line.trimEnd().length};
   if(heading){owner=heading[1]!;member='';module='';ownerDecl=d;memberDecl=undefined;moduleDecl=undefined;ownerRst=false;ownerIndent=-1;memberIndent=-1;}
   else if(section){owner='';member='';ownerDecl=undefined;memberDecl=undefined;ownerRst=false;ownerIndent=-1;memberIndent=-1;}
   else if(directive){
    const kind=directive[2]!,name=directive[3]!;
    if(kind==='module'||kind==='currentmodule'){module=name;moduleDecl=d;owner='';ownerDecl=undefined;member='';memberDecl=undefined;ownerRst=false;ownerIndent=-1;memberIndent=-1;}
    else if(kind==='class'){owner=name;ownerDecl=d;member='';memberDecl=undefined;ownerRst=true;ownerIndent=directive[1]!.length;memberIndent=-1;}
    else if(!directive[1]){owner=name;ownerDecl=d;member='';memberDecl=undefined;ownerRst=true;ownerIndent=0;memberIndent=-1;}
    else{member=name.split('.').at(-1)!;memberDecl=d;memberIndent=directive[1]!.length;}
   }
  }else if(ownerRst&&owner&&line.trim()){
   const indent=line.match(/^\s*/)?.[0].length||0;
   if((member&&indent<=memberIndent)||indent<=ownerIndent){
    flush(offset);blockStart=offset;
    member='';memberDecl=undefined;memberIndent=-1;
    if(indent<=ownerIndent){owner='';ownerDecl=undefined;ownerRst=false;ownerIndent=-1;}
   }
  }
  offset+=line.length;
 }
 flush(source.length);
 const whole=normalized(passage);
 const completeMatches=declarationOnly?[]:contexts.filter(context=>normalized(source.slice(context.start,context.end)).includes(whole));
 const key=(context:typeof contexts[number])=>[context.module,context.owner,context.member].filter(Boolean).join('.');
 const declaredIds=(context:typeof contexts[number])=>{
  const qualified=[context.module,context.owner].filter(Boolean).join('.');
  return [qualified,context.module,context.owner,...(context.member?[`${qualified}.${context.member}`,`${context.owner}.${context.member}`]:[])].filter(Boolean);
 };
 let matches=completeMatches;
 if(declarationOnly)matches=contexts.filter(context=>context.declarations.some(d=>d.start===context.start&&d.text.trim()===passage.trim()));
 else if(!matches.length){
  // Intersect corroborated fragments: rendered wording may differ, but a
  // fragment pointing to another API cannot lend that API's declaration.
  const scopes=fragments.map(fragment=>contexts.filter(context=>normalized(source.slice(context.start,context.end)).includes(fragment))).filter(group=>group.length);
  matches=contexts.filter(context=>scopes.length&&scopes.every(group=>group.some(other=>key(other)===key(context))));
 }
 if(declarationOnly&&matches.length>1&&requestedIdentifiers.length){
  // The same declaration spelling can occur on several classes. Resolve it
  // only against a complete identifier proved by this snapshot's declarations.
  matches=matches.filter(context=>declaredIds(context).some(id=>requestedIdentifiers.includes(id)));
 }
 if(!matches.length)return;
 const owners=new Set(matches.map(c=>[c.module,c.owner,c.member].filter(Boolean).join('.')));if(owners.size!==1)return;
 const ids=new Set<string>();
 for(const context of matches){
  const qualified=[context.module,context.owner].filter(Boolean).join('.');for(const identifier of declaredIds(context))ids.add(identifier);
  // A method reference in the owner's documented body may name an inherited
  // method. Require the actual quoted body and retain its exact declaration.
  const body=source.slice(context.start,context.end);
  for(const match of body.matchAll(/:meth:`~?([\w.]+)`/g)){
   const memberName=match[1]!.split('.').at(-1)!;
   const parent=match[1]!.split('.').slice(0,-1).join('.');
   // A cross-reference inside another method is not a declaration of that
   // method on this owner. Only the class's own inherited-API description
   // can bind a referenced parent method, with that parent named explicitly.
   if(!context.member&&parent&&body.includes(`:class:\`${parent}\``)&&fragments.some(fragment=>fragment.includes(match[1]!))){ids.add(`${qualified}.${memberName}`);ids.add(`${context.owner}.${memberName}`);}
  }
  for(const declaration of context.declarations)if(!declarations.some(d=>d.start===declaration.start))declarations.push(declaration);
 }
 let sourceExcerpt:ApiContext['sourceExcerpt'];
 if(declarationOnly&&matches.length===1){const context=matches[0]!;let end=Math.min(context.end,context.start+1600);if(/[\uD800-\uDBFF]/.test(source[end-1]||''))end--;sourceExcerpt={start:context.start,end};}
 return {identifiers:[...ids],declarations,...(sourceExcerpt?{sourceExcerpt}:{})};
}
