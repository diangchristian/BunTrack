// BunTrack: remove Employee Salaries from Expenses (family-run business, no employees).
// Updates both Expenses screens (list + Record Expense state) and recomputes totals:
//   Operating expenses Nov 1–14: ₱38,650 -> ₱20,650
//   Net profit: ₱172,480 - ₱67,610 COGS - ₱20,650 = ₱84,220 (48.8%)
// Run inside the BunTrack Figma file with the "Scripter" plugin. Safe to run more than once.

await Promise.all(["Regular","Medium","SemiBold","Bold","ExtraBold"].map(s=>figma.loadFontAsync({family:"Plus Jakarta Sans",style:s})));
const node=id=>figma.getNodeByIdAsync(id);
const texts=n=>n.findAll(x=>x.type==="TEXT");
const pk=(inst,name)=>Object.keys(inst.componentProperties).find(k=>k.split("#")[0]===name);
const sec=await node("4:49");
const receiptIcon=sec.children.find(n=>n.name==="icon/receipt");

for (const id of ["12:3058","12:3655"]) { const s=await node(id);
  // table row
  const tbl=s.findOne(n=>n.name==="Expense Table");
  const row=tbl.children.find(r=>texts(r).some(t=>t.characters==="Employee Salaries")); if(row) row.remove();
  // category breakdown: drop salaries, rescale bars to the new largest (Rent ₱12,000)
  const bc=s.findOne(n=>n.name==="By category");
  const sal=bc.findOne(n=>n.name==="Employee Salaries"); if(sal) sal.remove();
  for (const it of bc.children.filter(n=>n.type==="FRAME"&&n.findOne(x=>x.name==="Bar"))){
    const amt=texts(it).map(t=>t.characters).find(c=>c.startsWith("₱")); const v=Number(amt.replace(/[₱,]/g,""));
    const b=it.findOne(x=>x.name==="Bar"); const f=b.children[0]; f.resize(Math.max(4,b.width*v/12000),f.height); }
  // summary cards
  for (const st of s.findAll(n=>n.type==="INSTANCE"&&n.mainComponent?.name==="Stat Card")){ const lbl=st.componentProperties[pk(st,"Label")].value;
    if(lbl==="Expenses · Nov 1–14") st.setProperties({[pk(st,"Value")]:"₱20,650"});
    if(lbl==="Largest Category") st.setProperties({[pk(st,"Value")]:"Rent",[pk(st,"Delta")]:"₱12,000 · 58% of expenses",[pk(st,"Icon")]:receiptIcon.id});
    if(lbl==="Net Profit Estimate") st.setProperties({[pk(st,"Value")]:"₱84,220",[pk(st,"Delta")]:"48.8% net margin"}); }
  // net profit formula
  for (const t of texts(s.findOne(n=>n.name==="Formula"))){
    if(t.characters==="₱38,650") t.characters="₱20,650";
    if(t.characters==="₱66,220") t.characters="₱84,220";
    if(t.characters==="38.4% of revenue") t.characters="48.8% of revenue"; } }

figma.notify("BunTrack: salaries removed ✔");
