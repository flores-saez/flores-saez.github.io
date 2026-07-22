const fs=require("fs");
const projects=require("./projects.js");
let tmpl=fs.readFileSync("./template_health.html","utf8");

// 1) swap the Cowork Drive-fetch block for a static fetch of ../data/<CODE>.csv
const staticFetch=`/* ===== data fetch (static: reads ../data/<CODE>.csv from the repo) ===== */
async function fetchCSV(){
  try{
    const res=await fetch("../data/"+PROJECT.code+".csv",{cache:"no-store"});
    if(!res.ok) return null;
    const text=await res.text();
    if(text.indexOf("Time,")===-1) return null;
    return text.slice(text.indexOf("Time,"));
  }catch(e){ console.warn("fetch failed",e); return null; }
}

`;
tmpl=tmpl.replace(/\/\* ===== Drive fetch ===== \*\/[\s\S]*?(?=\/\* ===== rendering ===== \*\/)/, staticFetch);

// 2) main(): use the static fetch (no findExport / file id)
tmpl=tmpl.replace(
  /const file=await findExport\(\);\s*if\(!file\)\{ renderAwait\(\); return; \}\s*const text=await fetchCSV\(file\.id\); const R=analyseAll\(text\); window\.__R=R;/,
  'const text=await fetchCSV();\n    if(text===null){ renderAwait(); return; }\n    const R=analyseAll(text); window.__R=R;'
);
// 3) footer source line
tmpl=tmpl.replace(/Source: <code>\$\{file\.title\}<\/code> in Google Drive · pulled live each time this page opens\./,
  'Source: <code>data/'+'${PROJECT.code}'+'.csv</code> in this repo.');

fs.writeFileSync("./static_template.html",tmpl);

// 4) stamp per-project pages into site/projects/
fs.mkdirSync("site/projects",{recursive:true});
const re=/\/\*__PROJECT_CONFIG__\*\/[\s\S]*?\/\*__END__\*\//;
for(const p of projects){
  const out=tmpl.replace(re,"/*__PROJECT_CONFIG__*/"+JSON.stringify(p)+"/*__END__*/");
  fs.writeFileSync("site/projects/"+p.code.toLowerCase()+".html",out);
}
console.log("stamped static pages:",projects.map(p=>p.code.toLowerCase()+".html").join(", "));
