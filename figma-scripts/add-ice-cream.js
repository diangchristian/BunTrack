// BunTrack: add Ice Cream to the existing POS, Products, Inventory, Dashboard and Reports.
// Also fixes the cramped Expenses / Suppliers / Users tables.
// Run inside the BunTrack Figma file with the "Scripter" plugin (paste, then press Run).
// Safe to run once; the guards skip parts that are already done.

await Promise.all(["Regular","Medium","SemiBold","Bold","ExtraBold"].map(s=>figma.loadFontAsync({family:"Plus Jakarta Sans",style:s})));
const vars = Object.fromEntries((await figma.variables.getLocalVariablesAsync()).map(v=>[v.name,v]));
const P=(n)=>{ const v=vars["color/"+n]; const raw=Object.values(v.valuesByMode)[0]; return figma.variables.setBoundVariableForPaint({type:"SOLID",color:{r:raw.r,g:raw.g,b:raw.b}},"color",v); };
const node=id=>figma.getNodeByIdAsync(id);
const setText=(t,s)=>{ if(t && t.type==="TEXT") t.characters=String(s); };
const texts=n=>n.findAll(x=>x.type==="TEXT");
const pk=(inst,name)=>Object.keys(inst.componentProperties).find(k=>k.split("#")[0]===name);
const recolor=(n,c)=>{ for (const v of n.findAll(x=>"strokes" in x&&x.strokes.length)) v.strokes=[P(c)]; };

// 1. Ice cream icon component (in the Design System section)
const sec=await node("4:49");
let ice=sec.children.find(n=>n.name==="icon/ice-cream");
if(!ice){ const f=figma.createNodeFromSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#1F1A17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7"/><path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/></svg>');
  sec.appendChild(f); ice=figma.createComponentFromNode(f); ice.name="icon/ice-cream"; ice.fills=[]; ice.x=40; ice.y=60+3*48;
  recolor(ice,"text/primary"); }

// 2. POS (main + payment + order-complete states): Desserts -> Ice Cream, 3 new tiles
const newTiles=[["Vanilla Soft Serve Cone","₱35.00"],["Ube Sundae","₱75.00"],["Cookies & Cream Shake","₱99.00"]];
for (const id of ["8:387","8:919","8:1128"]) { const s=await node(id);
  const chips=s.findOne(n=>n.name==="Category Filter");
  setText(texts(chips.findOne(n=>n.name==="Chip/All"))[1],15);
  const des=chips.findOne(n=>n.name==="Chip/Desserts"); if(des){ des.name="Chip/Ice Cream"; setText(texts(des)[0],"Ice Cream"); setText(texts(des)[1],4); }
  const grid=s.findOne(n=>n.name==="Product Grid"); const ch=grid.findOne(n=>n.name==="Tile/Choco Sundae");
  if(ch){ ch.name="Tile/Chocolate Sundae"; ch.setProperties({[pk(ch,"Name")]:"Chocolate Sundae",[pk(ch,"Image Icon")]:ice.id}); recolor(ch.findOne(n=>n.name==="Image"),"brand/orange");
    for (const [n,p] of newTiles){ const t=ch.clone(); grid.appendChild(t); t.name="Tile/"+n; t.setProperties({[pk(t,"Name")]:n,[pk(t,"Price")]:p}); recolor(t.findOne(n=>n.name==="Image"),"brand/orange"); } } }

// 3. Products (list + edit drawer state): 2 ice cream rows, counts
for (const id of ["9:1376","9:2062"]) { const s=await node(id); const tb=s.findOne(n=>n.name==="Products Table");
  if(texts(tb).some(t=>t.characters==="Ube Sundae")) continue;
  const base=tb.children.find(r=>texts(r).some(t=>t.characters==="Iced Tea"));
  for (const [n,d,pr,cost] of [["Vanilla Soft Serve Cone","Soft serve on a crispy cone",35,14.80],["Ube Sundae","Ube soft serve, ube halaya, toppings",75,30.50]]){ const r=base.clone(); tb.appendChild(r); const tx=texts(r);
    setText(tx[0],n); setText(tx[1],d); setText(tx[2],"Ice Cream"); setText(tx[3],"₱"+pr.toFixed(2)); setText(tx[4],"₱"+cost.toFixed(2)); setText(tx[5],"₱"+(pr-cost).toFixed(2)); setText(tx[6],((pr-cost)/pr*100).toFixed(1)+"% margin");
    const th=r.findOne(x=>x.name==="Thumb").children[0]; th.swapComponent(ice); recolor(th,"brand/orange"); }
  setText(texts(s.findOne(n=>n.name==="Pagination"))[0],"Showing 1–12 of 15 products");
  for (const st of s.findAll(n=>n.type==="INSTANCE"&&n.mainComponent?.name==="Stat Card")){ const lbl=st.componentProperties[pk(st,"Label")].value;
    if(lbl==="Menu Items") st.setProperties({[pk(st,"Value")]:"15",[pk(st,"Delta")]:"6 categories incl. Ice Cream"});
    if(lbl==="Available on POS") st.setProperties({[pk(st,"Value")]:"14"}); } }

// 4. Inventory (list + stock-in state): ice cream ingredients
for (const id of ["10:2049","10:2727"]) { const s=await node(id); const tb=s.findOne(n=>n.name==="Inventory Table");
  if(texts(tb).some(t=>t.characters==="Ice Cream Cones")) continue;
  const base=tb.children.find(r=>texts(r).some(t=>t.characters==="Chicken Patties"));
  for (const [n,cat,u,q,m,uc,val] of [["Ice Cream Base (Vanilla)","Frozen","L",6.5,4,"₱120.00","₱780.00"],["Ube Ice Cream Base","Frozen","L",3.0,2,"₱150.00","₱450.00"],["Ice Cream Cones","Bakery","pcs",120,50,"₱4.00","₱480.00"],["Sundae Cups","Packaging","pcs",90,60,"₱3.00","₱270.00"],["Chocolate Syrup","Condiments","L",1.8,1,"₱220.00","₱396.00"]]){
    const r=base.clone(); tb.appendChild(r); const tx=texts(r); setText(tx[0],n); setText(tx[1],cat); setText(tx[2],`${q} ${u}`); setText(tx[3],`${m} ${u}`); setText(tx[4],`${uc} / ${u}`); setText(tx[5],val);
    const f=r.findOne(x=>x.name==="Level").children[0]; f.resize(Math.max(4,150*Math.min(1,q/(m*2))),f.height); }
  for (const st of s.findAll(n=>n.type==="INSTANCE"&&n.mainComponent?.name==="Stat Card")){ const lbl=st.componentProperties[pk(st,"Label")].value;
    if(lbl==="Ingredients") st.setProperties({[pk(st,"Value")]:"16",[pk(st,"Delta")]:"Across 8 categories"});
    if(lbl==="In Stock") st.setProperties({[pk(st,"Value")]:"11"});
    if(lbl==="Stock Value") st.setProperties({[pk(st,"Value")]:"₱10,754"}); } }

// 5. Dashboard + Reports: rename the Desserts sales category
for (const id of ["7:121","11:3175"]) { const s=await node(id);
  for (const t of texts(s)) if(t.characters==="Desserts") t.characters="Ice Cream";
  for (const n of s.findAll(x=>x.name==="Segment/Desserts"||x.name==="Desserts")) n.name=n.name.replace("Desserts","Ice Cream"); }

// 6. Cramped tables: Expenses, Suppliers, Users
const dropCol=(tbl,idx)=>{ for (const r of tbl.children) r.children[idx].remove(); };
for (const id of ["12:3058","12:3655"]) { const s=await node(id); const t=s.findOne(n=>n.name==="Expense Table");
  if(t.children[0].children.length===7){ dropCol(t,3); for (const r of t.children) r.children[1].resize(130,r.children[1].height);
    for (const r of t.children.slice(1)){ const x=r.children[2].findOne(n=>n.type==="TEXT"); if(x){ x.layoutSizingHorizontal="FILL"; x.textAutoResize="HEIGHT"; x.maxLines=1; x.textTruncation="ENDING"; } } }
  const bc=s.findOne(n=>n.name==="By category"); bc.resize(300,bc.height); }
for (const id of ["12:3998","12:4442"]) { const s=await node(id); const t=s.findOne(n=>n.name==="Supplier Table");
  if(t.children[0].children.length===5){ for (const r of t.children.slice(1)){ const phone=r.children[1].findOne(n=>n.type==="TEXT").characters; const cap=texts(r.children[0])[1]; cap.characters=cap.characters+" · "+phone; } dropCol(t,1); } }
{ const s=await node("12:5180"); const pm=s.findOne(n=>n.name==="Permissions"); pm.resize(340,pm.height);
  for (const r of s.findOne(n=>n.name==="Users Table").children) r.children[3].resize(104,r.children[3].height); }
{ const b=(await node("9:2062")).findOne(n=>n.name==="Drawer Body"); b.paddingTop=20; b.paddingBottom=20; }

figma.notify("BunTrack: Ice Cream added ✔");
