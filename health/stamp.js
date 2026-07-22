const fs=require("fs"); const projects=require("./projects.js");
const tmpl=fs.readFileSync("./template_health.html","utf8");
const re=/\/\*__PROJECT_CONFIG__\*\/[\s\S]*?\/\*__END__\*\//;
for(const p of projects){
  const cfg=JSON.stringify(p);
  const out=tmpl.replace(re, "/*__PROJECT_CONFIG__*/"+cfg+"/*__END__*/");
  const fn="health_"+p.code.toLowerCase()+".html";
  fs.writeFileSync(fn,out);
  // quick syntax check of the injected config by re-parsing
  JSON.parse(cfg);
}
console.log("stamped", projects.length, "pages:", projects.map(p=>p.code).join(","));
// verify a stamped file still has the marker replaced and parses config
const chk=fs.readFileSync("health_col.html","utf8");
const m=chk.match(/const PROJECT = \/\*__PROJECT_CONFIG__\*\/([\s\S]*?)\/\*__END__\*\//);
console.log("COL config ->", JSON.parse(m[1]).name);
